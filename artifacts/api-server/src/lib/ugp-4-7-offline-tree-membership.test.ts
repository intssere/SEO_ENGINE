import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { attestUGP47OfflineTreeMembership } from "./ugp-4-7-offline-tree-membership.js";

const hash=(alg:"sha1"|"sha256",b:Buffer|string)=>createHash(alg).update(b).digest("hex");
const git=(kind:"blob"|"tree"|"commit",b:Buffer)=>hash("sha1",Buffer.concat([
  Buffer.from(kind+" "+b.length+"\0"),b]));
const rep=(c:string,n:number)=>c.repeat(n);
const entry=(mode:string,name:string,oid:string)=>Buffer.concat([
  Buffer.from(mode+" "+name+"\0"),Buffer.from(oid,"hex")
]);
function fixture(){
  const repositoryId=123,baseSha=rep("a",40),path="content/page.md";
  const before=Buffer.from("old file"),after=Buffer.from("new file");
  const beforeSha=git("blob",before),afterSha=git("blob",after);
  const beforeDigest=hash("sha256",before),afterDigest=hash("sha256",after);
  const branch="ugp47/tree-check";
  const patchDigest=hash("sha256",JSON.stringify({
    repositoryId,baseSha,path,expectedBlobSha:beforeSha,
    beforeDigest,afterDigest,workingBranch:branch
  }));
  const leaf=entry("100644","page.md",afterSha);
  const leafSha=git("tree",leaf);
  const root=entry("40000","content",leafSha);
  const rootSha=git("tree",root);
  const rawCommit=Buffer.from("tree "+rootSha+"\nparent "+baseSha+
    "\nauthor Test <test@example.invalid> 1 +0000"+
    "\ncommitter Test <test@example.invalid> 1 +0000\n\nfixture\n");
  const commitSha=git("commit",rawCommit);
  const chain={
    target:{host:"github.com",repositoryId,owner:"sample",repo:"site",installationId:7,
      defaultBranch:"main",allowedPath:path},
    read:{repositoryId,baseRef:"main",baseSha,path,mode:"100644",
      blobSha:beforeSha,contentDigest:beforeDigest},
    patch:{repositoryId,expectedBaseSha:baseSha,path,expectedBlobSha:beforeSha,
      beforeDigest,afterDigest,patchDigest,workingBranch:branch},
    commit:{repositoryId,branch,sha:commitSha,parentSha:baseSha,treeSha:rootSha,path,
      beforeBlobSha:beforeSha,afterBlobSha:afterSha,afterDigest},
    pr:{repositoryId,number:8,baseRef:"main",baseSha,headRef:branch,
      headSha:commitSha,merged:false,autoMergeEnabled:false},
    ci:{repositoryId,headSha:commitSha,workflowId:3,runId:4,status:"completed",
      conclusion:"success",requiredChecks:[{name:"validate",headSha:commitSha,conclusion:"success"}]}
  };
  return {chain,
    blob:{repositoryId,baseSha,path,mode:"100644",blobSha:beforeSha,
      contentSha256:beforeDigest,contentBase64:before.toString("base64")},
    patch:{repositoryId,baseSha,path,workingBranch:branch,
      beforeBase64:before.toString("base64"),afterBase64:after.toString("base64")},
    commit:{repositoryId,commitSha,rawCommitBase64:rawCommit.toString("base64")},
    tree:{repositoryId,path,trees:[
      {oid:rootSha,contentBase64:root.toString("base64")},
      {oid:leafSha,contentBase64:leaf.toString("base64")}
    ]}
  };
}
const check=(f:ReturnType<typeof fixture>)=>attestUGP47OfflineTreeMembership(
  JSON.stringify(f.chain),JSON.stringify(f.blob),JSON.stringify(f.patch),
  JSON.stringify(f.commit),JSON.stringify(f.tree));
function denied(f:ReturnType<typeof fixture>){
  const r=check(f);
  assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
  assert.equal(r.gitReadAuthorized,false);
  assert.equal(r.gitWriteAuthorized,false);
  assert.equal(r.mergeAuthorized,false);
  assert.equal(r.deploymentAuthorized,false);
  assert.equal(r.independentlyCertified,false);
}
test("full synthetic commit/tree/path/after-blob linkage is internally consistent, never certified",()=>{
  const f=fixture(),r=check(f);
  assert.equal(r.status,"STRUCTURALLY_CONSISTENT_UNVERIFIED");
  assert.equal(r.treeDepth,2);
  assert.equal(r.afterBlobSha,f.chain.commit.afterBlobSha);
  assert.equal(r.gitReadAuthorized,false);
  assert.equal(r.gitWriteAuthorized,false);
  assert.equal(r.mergeAuthorized,false);
  assert.equal(r.deploymentAuthorized,false);
  assert.equal(r.independentlyCertified,false);
});
test("drift, omitted path, forged OID or unexpected tree data fail closed",()=>{
  const cases:((f:ReturnType<typeof fixture>)=>void)[]=[
    f=>{f.tree.repositoryId=999;},
    f=>{f.tree.path="wrong/path";},
    f=>{f.tree.trees=f.tree.trees.slice(0,1);},
    f=>{f.tree.trees[0]!.oid=rep("f",40);},
    f=>{f.tree.trees[1]!.oid=rep("f",40);},
    f=>{f.tree.trees[1]!.contentBase64=Buffer.from("fake").toString("base64");},
    f=>{f.tree.trees[0]!.contentBase64=Buffer.from("40000 wrong\0","utf8").toString("base64");},
    f=>{f.chain.commit.afterBlobSha=rep("f",40);},
    f=>{f.patch.afterBase64=Buffer.from("different").toString("base64");},
    f=>{f.commit.rawCommitBase64=Buffer.from("not a commit").toString("base64");}
  ];
  for(const mutate of cases){const f=fixture();mutate(f);denied(f);}
});
test("duplicate entries and invalid tree modes are rejected even with recomputed OIDs",()=>{
  for(const treeEntries of [
    Buffer.concat([entry("100644","page.md",rep("e",40)),
      entry("100644","page.md",rep("e",40))]),
    entry("120000","page.md",rep("e",40)),
    entry("40000","page.md",rep("e",40))
  ]){
    const f=fixture();
    f.tree.trees[1]={oid:git("tree",treeEntries),contentBase64:treeEntries.toString("base64")};
    denied(f);
  }
});
test("malformed, duplicate-key, oversized and caller object receipts never authorize actions",()=>{
  const f=fixture(),args=[JSON.stringify(f.chain),JSON.stringify(f.blob),
    JSON.stringify(f.patch),JSON.stringify(f.commit)];
  for(const payload of ["null","[]","{","x".repeat(270000),
    JSON.stringify({...f.tree,gitWriteAuthorized:true}),
    JSON.stringify(f.tree).replace('"repositoryId":123','"repositoryId":1,"repositoryId":123')
  ]){
    const r=attestUGP47OfflineTreeMembership(args[0]!,args[1]!,args[2]!,args[3]!,payload);
    assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
    assert.equal(r.gitWriteAuthorized,false);
  }
  const hostile=new Proxy({}, {get(){throw Error("unsafe");}});
  assert.equal(attestUGP47OfflineTreeMembership(hostile,hostile,hostile,hostile,hostile).status,
    "INCOMPLETE_OR_UNSAFE");
});
