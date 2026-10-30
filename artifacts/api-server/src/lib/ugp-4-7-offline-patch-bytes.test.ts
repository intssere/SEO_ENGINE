import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { reviewUGP47OfflinePatchBytes } from "./ugp-4-7-offline-patch-bytes.js";

const hash=(a:"sha1"|"sha256",v:Buffer|string)=>createHash(a).update(v).digest("hex");
const oid=(bytes:Buffer)=>hash("sha1",Buffer.concat([Buffer.from("blob "+bytes.length+"\0"),bytes]));
const rep=(x:string,n:number)=>x.repeat(n);
function fixture(){
  const before=Buffer.from("hello baseline","utf8"),after=Buffer.from("hello updated","utf8");
  const repositoryId=1234,baseSha=rep("a",40),headSha=rep("c",40);
  const path="content/page.md",blobSha=oid(before),contentDigest=hash("sha256",before);
  const beforeBase64=before.toString("base64"),afterBase64=after.toString("base64");
  const afterDigest=hash("sha256",after),workingBranch="ugp47/patch-proof";
  const fields={repositoryId,baseSha,path,expectedBlobSha:blobSha,
    beforeDigest:contentDigest,afterDigest,workingBranch};
  const patchDigest=hash("sha256",JSON.stringify(fields));
  const chain={
    target:{host:"github.com",repositoryId,owner:"example",repo:"demo",
      installationId:42,defaultBranch:"main",allowedPath:path},
    read:{repositoryId,baseRef:"main",baseSha,path,mode:"100644",blobSha,contentDigest},
    patch:{repositoryId,expectedBaseSha:baseSha,path,expectedBlobSha:blobSha,
      beforeDigest:contentDigest,afterDigest,patchDigest,workingBranch},
    commit:{repositoryId,branch:workingBranch,sha:headSha,parentSha:baseSha,
      treeSha:rep("d",40),path,beforeBlobSha:blobSha,afterBlobSha:oid(after),afterDigest},
    pr:{repositoryId,number:5,baseRef:"main",baseSha,headRef:workingBranch,headSha,
      merged:false,autoMergeEnabled:false},
    ci:{repositoryId,headSha,workflowId:1,runId:2,status:"completed",conclusion:"success",
      requiredChecks:[{name:"validate",headSha,conclusion:"success"}]}
  };
  const blob={repositoryId,baseSha,path,mode:"100644",blobSha,
    contentSha256:contentDigest,contentBase64:beforeBase64};
  const proposal={repositoryId,baseSha,path,workingBranch,beforeBase64,afterBase64};
  return {chain,blob,proposal};
}
const inspect=(x:ReturnType<typeof fixture>)=>reviewUGP47OfflinePatchBytes(
  JSON.stringify(x.chain),JSON.stringify(x.blob),JSON.stringify(x.proposal));
function reject(x:ReturnType<typeof fixture>){
  const r=inspect(x);
  assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
  assert.equal(r.gitReadAuthorized,false);
  assert.equal(r.gitWriteAuthorized,false);
  assert.equal(r.mergeAuthorized,false);
  assert.equal(r.deploymentAuthorized,false);
  assert.equal(r.independentlyCertified,false);
}
test("valid bounded synthetic before/after proves internal digest consistency, not provider trust",()=>{
  const x=fixture(),a=inspect(x),b=inspect(x);
  assert.equal(a.status,"STRUCTURALLY_CONSISTENT_UNVERIFIED");
  assert.deepEqual(a,b);
  assert.equal(a.gitReadAuthorized,false);
  assert.equal(a.gitWriteAuthorized,false);
  assert.equal(a.mergeAuthorized,false);
  assert.equal(a.deploymentAuthorized,false);
  assert.equal(a.independentlyCertified,false);
});
test("baseline, proposed bytes, identity and deterministic digest drift fail closed",()=>{
  const changes:((x:ReturnType<typeof fixture>)=>void)[]=[
    x=>{x.proposal.repositoryId=9;},
    x=>{x.proposal.baseSha=rep("b",40);},
    x=>{x.proposal.path="content/other.md";},
    x=>{x.proposal.workingBranch="ugp47/other";},
    x=>{x.proposal.beforeBase64=Buffer.from("other").toString("base64");},
    x=>{x.proposal.afterBase64=Buffer.from("other").toString("base64");},
    x=>{x.proposal.afterBase64=x.proposal.beforeBase64;},
    x=>{x.chain.patch.patchDigest=rep("f",64);},
    x=>{x.chain.patch.afterDigest=rep("e",64);},
    x=>{x.chain.patch.expectedBlobSha=rep("f",40);},
    x=>{x.blob.contentBase64=Buffer.from("other").toString("base64");}
  ];
  for(const change of changes){const x=fixture();change(x);reject(x);}
});
test("rejects noncanonical encoding, extra fields, invalid serialized payloads",()=>{
  const x=fixture();
  const invalid=[
    "{","null", "[]", "x".repeat(270000),
    JSON.stringify({...x.proposal,gitWriteAuthorized:true}),
    JSON.stringify({...x.proposal,afterBase64:"AB=="}),
    JSON.stringify({...x.proposal,afterBase64:"A".repeat(90000)})
  ];
  for(const p of invalid){
    const r=reviewUGP47OfflinePatchBytes(JSON.stringify(x.chain),JSON.stringify(x.blob),p);
    assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
    assert.equal(r.gitWriteAuthorized,false);
  }
  const valid=JSON.stringify(x.proposal);
  const duplicate=valid.replace('"repositoryId":1234','"repositoryId":7,"repositoryId":1234');
  assert.equal(reviewUGP47OfflinePatchBytes(JSON.stringify(x.chain),JSON.stringify(x.blob),duplicate).status,
    "INCOMPLETE_OR_UNSAFE");
});
test("object graphs and throwing getters never grant permission",()=>{
  const hostile=new Proxy({}, {get(){throw Error("unexpected access");}});
  const r=reviewUGP47OfflinePatchBytes(hostile,hostile,hostile);
  assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
  assert.equal(r.independentlyCertified,false);
});
