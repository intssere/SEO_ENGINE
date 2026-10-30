import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { attestUGP47OfflineCommitObject } from "./ugp-4-7-offline-commit-object.js";

const rep=(x:string,n:number)=>x.repeat(n);
function fixture(){
  const repositoryId=1234,baseSha=rep("a",40),treeSha=rep("d",40);
  const raw=Buffer.from("tree "+treeSha+"\nparent "+baseSha+
    "\nauthor Test User <test@example.invalid> 1 +0000"+
    "\ncommitter Test User <test@example.invalid> 1 +0000\n\nfixture\n","utf8");
  const sha=createHash("sha1").update(Buffer.concat([
    Buffer.from("commit "+raw.length+"\0"),raw
  ])).digest("hex");
  const blobSha=rep("b",40),path="content/page.md",headSha=sha;
  const chain={
    target:{host:"github.com",repositoryId,owner:"sample",repo:"website",
      installationId:44,defaultBranch:"main",allowedPath:path},
    read:{repositoryId,baseRef:"main",baseSha,path,mode:"100644",
      blobSha,contentDigest:rep("d",64)},
    patch:{repositoryId,expectedBaseSha:baseSha,path,expectedBlobSha:blobSha,
      beforeDigest:rep("d",64),afterDigest:rep("e",64),patchDigest:rep("f",64),
      workingBranch:"ugp47/commit-object"},
    commit:{repositoryId,branch:"ugp47/commit-object",sha:headSha,parentSha:baseSha,
      treeSha,path,beforeBlobSha:blobSha,afterBlobSha:rep("e",40),afterDigest:rep("e",64)},
    pr:{repositoryId,number:7,baseRef:"main",baseSha,
      headRef:"ugp47/commit-object",headSha,merged:false,autoMergeEnabled:false},
    ci:{repositoryId,headSha,workflowId:15,runId:900,status:"completed",
      conclusion:"success",requiredChecks:[{name:"validate",headSha,conclusion:"success"}]}
  };
  const receipt={repositoryId,commitSha:headSha,rawCommitBase64:raw.toString("base64")};
  return {chain,receipt};
}
const check=(x:ReturnType<typeof fixture>)=>attestUGP47OfflineCommitObject(
  JSON.stringify(x.chain),JSON.stringify(x.receipt));
function denied(x:ReturnType<typeof fixture>){
  const r=check(x);
  assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
  assert.equal(r.gitReadAuthorized,false);assert.equal(r.gitWriteAuthorized,false);
  assert.equal(r.mergeAuthorized,false);assert.equal(r.deploymentAuthorized,false);
  assert.equal(r.independentlyCertified,false);
}
test("synthetic commit bytes link claimed commit, tree and parent but never provider trust",()=>{
  const x=fixture(),a=check(x),b=check(x);
  assert.equal(a.status,"STRUCTURALLY_CONSISTENT_UNVERIFIED");
  assert.deepEqual(a,b);
  assert.equal(a.gitReadAuthorized,false);
  assert.equal(a.gitWriteAuthorized,false);
  assert.equal(a.mergeAuthorized,false);
  assert.equal(a.deploymentAuthorized,false);
  assert.equal(a.independentlyCertified,false);
});
test("reject altered commit preimage, parent, tree or claimed identity",()=>{
  const cases:((x:ReturnType<typeof fixture>)=>void)[]=[
    x=>{x.receipt.repositoryId=9;},
    x=>{x.receipt.commitSha=rep("f",40);},
    x=>{x.chain.commit.sha=rep("f",40);x.chain.pr.headSha=rep("f",40);
      x.chain.ci.headSha=rep("f",40);x.chain.ci.requiredChecks[0]!.headSha=rep("f",40);},
    x=>{x.chain.commit.treeSha=rep("f",40);},
    x=>{x.chain.commit.parentSha=rep("f",40);},
    x=>{x.receipt.rawCommitBase64=Buffer.from("changed").toString("base64");},
    x=>{x.receipt.rawCommitBase64="AB==";},
    x=>{x.receipt.rawCommitBase64="A".repeat(90000);}
  ];
  for(const mutate of cases){const x=fixture();mutate(x);denied(x);}
});
test("reject non-one-parent commits and additional or signed headers",()=>{
  const x=fixture();
  const raw=Buffer.from(x.receipt.rawCommitBase64,"base64").toString("utf8");
  for(const bad of [
    raw.replace("\nauthor ","\nparent "+rep("f",40)+"\nauthor "),
    raw.replace("\nauthor ","\ngpgsig fake\nauthor "),
    raw.replace("\ncommitter ","\ncommitter \ncommitter "),
    raw.replace("\n\nfixture","\nextra header\n\nfixture")
  ]){
    const y=fixture();y.receipt.rawCommitBase64=Buffer.from(bad).toString("base64");
    denied(y);
  }
});
test("reject forged permission keys, duplicate keys, malformed data and hostile objects",()=>{
  const x=fixture(),chain=JSON.stringify(x.chain);
  for(const v of [
    JSON.stringify({...x.receipt,gitWriteAuthorized:true}),
    '{"repositoryId":8,"repositoryId":1234,"commitSha":"'+x.receipt.commitSha+
      '","rawCommitBase64":"'+x.receipt.rawCommitBase64+'"}',
    "{","[]","null","x".repeat(150000)
  ]){
    const r=attestUGP47OfflineCommitObject(chain,v);
    assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
    assert.equal(r.gitWriteAuthorized,false);
  }
  const hostile=new Proxy({}, {get(){throw Error("must not access");}});
  const r=attestUGP47OfflineCommitObject(hostile,hostile);
  assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
});
