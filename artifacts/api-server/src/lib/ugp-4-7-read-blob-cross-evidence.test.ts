import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { reviewUGP47ReadChainWithBlob } from "./ugp-4-7-read-blob-cross-evidence.js";

const hex = (v: string, length: number) => v.repeat(length);
function fixture() {
  const bytes = Buffer.from("offline fixture content", "utf8");
  const blobSha = createHash("sha1").update(Buffer.concat([
    Buffer.from("blob " + bytes.length + "\0"), bytes
  ])).digest("hex");
  const contentSha256 = createHash("sha256").update(bytes).digest("hex");
  const repoId = 1234, baseSha = hex("a",40), headSha = hex("c",40);
  const path = "content/page.md";
  const blob = {repositoryId:repoId,baseSha,path,mode:"100644",blobSha,contentSha256,
    contentBase64:bytes.toString("base64")};
  const chain = {
    target: {host:"github.com",repositoryId:repoId,owner:"sample",repo:"website",
      installationId:44,defaultBranch:"main",allowedPath:path},
    read: {repositoryId:repoId,baseRef:"main",baseSha,path,mode:"100644",blobSha,
      contentDigest:contentSha256},
    patch: {repositoryId:repoId,expectedBaseSha:baseSha,path,expectedBlobSha:blobSha,
      beforeDigest:contentSha256,afterDigest:hex("e",64),patchDigest:hex("f",64),
      workingBranch:"ugp47/fixture"},
    commit: {repositoryId:repoId,branch:"ugp47/fixture",sha:headSha,
      parentSha:baseSha,treeSha:hex("d",40),path,beforeBlobSha:blobSha,
      afterBlobSha:hex("e",40),afterDigest:hex("e",64)},
    pr: {repositoryId:repoId,number:7,baseRef:"main",baseSha,headRef:"ugp47/fixture",
      headSha,merged:false,autoMergeEnabled:false},
    ci: {repositoryId:repoId,headSha,workflowId:15,runId:900,status:"completed",
      conclusion:"success",requiredChecks:[{name:"validate",headSha,conclusion:"success"}]}
  };
  return {chain,blob};
}
const check = (chain: unknown, blob: unknown) =>
  reviewUGP47ReadChainWithBlob(JSON.stringify(chain),JSON.stringify(blob));
function denied(chain: unknown, blob: unknown) {
  const result = check(chain,blob);
  assert.equal(result.status,"INCOMPLETE_OR_UNSAFE");
  assert.equal(result.gitReadAuthorized,false);
  assert.equal(result.gitWriteAuthorized,false);
  assert.equal(result.mergeAuthorized,false);
  assert.equal(result.deploymentAuthorized,false);
  assert.equal(result.independentlyCertified,false);
}
test("captured bytes and Git chain agree but remain unauthenticated", () => {
  const x=fixture();
  const a=check(x.chain,x.blob),b=check(x.chain,x.blob);
  assert.equal(a.status,"STRUCTURALLY_CONSISTENT_UNVERIFIED");
  assert.deepEqual(a,b);
  assert.equal(a.gitReadAuthorized,false);
  assert.equal(a.gitWriteAuthorized,false);
  assert.equal(a.mergeAuthorized,false);
  assert.equal(a.deploymentAuthorized,false);
  assert.equal(a.independentlyCertified,false);
});
test("reject every read/blob identity mismatch, even when individual inputs are valid", () => {
  const mutations: ((x: ReturnType<typeof fixture>) => void)[] = [
    x=>{x.blob.repositoryId=888;},
    x=>{x.blob.baseSha=hex("b",40);},
    x=>{x.blob.path="content/other.md";},
    x=>{x.chain.read.blobSha=hex("b",40);x.chain.patch.expectedBlobSha=hex("b",40);
      x.chain.commit.beforeBlobSha=hex("b",40);},
    x=>{x.chain.read.contentDigest=hex("b",64);x.chain.patch.beforeDigest=hex("b",64);},
    x=>{x.blob.contentBase64=Buffer.from("different").toString("base64");}
  ];
  for (const change of mutations) {
    const x=fixture();change(x);denied(x.chain,x.blob);
  }
});
test("malformed, oversized and extra evidence never grants authority", () => {
  const x=fixture();
  for (const pair of [
    ["{",JSON.stringify(x.blob)], [JSON.stringify(x.chain),"{"] ,
    [JSON.stringify(x.chain),JSON.stringify({...x.blob,canWrite:true})],
    ["z".repeat(300000),JSON.stringify(x.blob)]
  ]) {
    const result=reviewUGP47ReadChainWithBlob(pair[0],pair[1]);
    assert.equal(result.status,"INCOMPLETE_OR_UNSAFE");
    assert.equal(result.gitWriteAuthorized,false);
    assert.equal(result.independentlyCertified,false);
  }
  denied({...x.chain,ci:{...x.chain.ci,headSha:hex("d",40)}},x.blob);
});
test("caller-supplied objects are never read by cross-check entrypoint", () => {
  const hostile=new Proxy({}, {get() {throw Error("not accessed");}});
  const result=reviewUGP47ReadChainWithBlob(hostile,hostile);
  assert.equal(result.status,"INCOMPLETE_OR_UNSAFE");
  assert.equal(result.gitReadAuthorized,false);
});
