import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { reviewUGP47AcquisitionClaims } from "./ugp-4-7-acquisition-claims.js";

const h = (x: string, n: number) => x.repeat(n);
function fixture() {
  const bytes = Buffer.from("UGP-4.7 offline captured content");
  const blobSha = createHash("sha1").update(Buffer.concat([
    Buffer.from("blob " + bytes.length + "\0"), bytes
  ])).digest("hex");
  const contentSha256 = createHash("sha256").update(bytes).digest("hex");
  const repositoryId = 2345, baseSha = h("a",40), headSha = h("c",40);
  const path = "content/article.md";
  const blob = {repositoryId,baseSha,path,mode:"100644",blobSha,contentSha256,contentBase64:bytes.toString("base64")};
  const chain = {
    target:{host:"github.com",repositoryId,owner:"example",repo:"demo",installationId:42,defaultBranch:"main",allowedPath:path},
    read:{repositoryId,baseRef:"main",baseSha,path,mode:"100644",blobSha,contentDigest:contentSha256},
    patch:{repositoryId,expectedBaseSha:baseSha,path,expectedBlobSha:blobSha,beforeDigest:contentSha256,
      afterDigest:h("e",64),patchDigest:h("f",64),workingBranch:"ugp47/test"},
    commit:{repositoryId,branch:"ugp47/test",sha:headSha,parentSha:baseSha,treeSha:h("d",40),
      path,beforeBlobSha:blobSha,afterBlobSha:h("e",40),afterDigest:h("e",64)},
    pr:{repositoryId,number:9,baseRef:"main",baseSha,headRef:"ugp47/test",headSha,merged:false,autoMergeEnabled:false},
    ci:{repositoryId,headSha,workflowId:12,runId:15,status:"completed",conclusion:"success",
      requiredChecks:[{name:"validate",headSha,conclusion:"success"}]}
  };
  const acquisition={host:"github.com",repositoryId,owner:"example",repo:"demo",installationId:42,
    baseRef:"main",baseSha,path,requestMethod:"GET",httpStatus:200,redirected:false,
    contentType:"application/vnd.github+json",observedAt:"2026-10-29T10:00:00.000Z",
    sourceKind:"captured_provider_claim"};
  return {blob,chain,acquisition};
}
function check(x: ReturnType<typeof fixture>) {
  return reviewUGP47AcquisitionClaims(JSON.stringify(x.chain),JSON.stringify(x.blob),JSON.stringify(x.acquisition));
}
test("consistent captured claims are never provider-authenticated or authorized",()=>{
  const x=fixture(), a=check(x), b=check(x);
  assert.equal(a.status,"STRUCTURALLY_CONSISTENT_UNVERIFIED");
  assert.deepEqual(a,b);
  assert.equal(a.gitReadAuthorized,false);
  assert.equal(a.gitWriteAuthorized,false);
  assert.equal(a.mergeAuthorized,false);
  assert.equal(a.deploymentAuthorized,false);
  assert.equal(a.independentlyCertified,false);
});
test("identity, acquisition and method mismatches always fail closed",()=>{
  const cases: ((x: ReturnType<typeof fixture>)=>void)[] = [
    x=>{x.acquisition.repositoryId=2;},x=>{x.acquisition.installationId=77;},
    x=>{x.acquisition.owner="other";},x=>{x.acquisition.repo="different";},
    x=>{x.acquisition.baseRef="other";},x=>{x.acquisition.baseSha=h("b",40);},
    x=>{x.acquisition.path="content/other.md";},
    x=>{x.acquisition.requestMethod="POST";},x=>{x.acquisition.httpStatus=302;},
    x=>{x.acquisition.redirected=true;},x=>{x.acquisition.contentType="text/html";},
    x=>{x.acquisition.sourceKind="authenticated";},
    x=>{x.acquisition.observedAt="not-a-date";},
    x=>{x.chain.read.baseSha=h("b",40);}
  ];
  for (const mutate of cases) {
    const x=fixture(); mutate(x);
    const r=check(x);
    assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
    assert.equal(r.gitReadAuthorized,false);
    assert.equal(r.gitWriteAuthorized,false);
    assert.equal(r.independentlyCertified,false);
  }
});
test("malformed, unknown and huge acquisition evidence denies",()=>{
  const x=fixture();
  for (const input of ["{","[]","null","x".repeat(270000),
    JSON.stringify({...x.acquisition,authorizationGranted:true})]) {
    const r=reviewUGP47AcquisitionClaims(JSON.stringify(x.chain),JSON.stringify(x.blob),input);
    assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
    assert.equal(r.mergeAuthorized,false);
    assert.equal(r.deploymentAuthorized,false);
  }
});
test("caller-owned object access cannot grant authority",()=>{
  const hostile=new Proxy({}, {get(){throw Error("must not inspect");}});
  const r=reviewUGP47AcquisitionClaims(hostile,hostile,hostile);
  assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
  assert.equal(r.independentlyCertified,false);
});
