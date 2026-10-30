import assert from "node:assert/strict";
import test from "node:test";
import { assessUGP47G0ProposedIntake } from "./ugp-4-7-g0-offline-intake.js";

function fixture() {
  const baseSha = "a".repeat(40);
  return {
    host:"github.com", repositoryId:1234, owner:"demo-owner", repo:"test-repo",
    installationId:456,baseRef:"main",baseSha,
    allowedPaths:["content/demo.md"],
    approvedGetPaths:["/repos/demo-owner/test-repo/git/commits/" + baseSha],
    operator:"operator-one",independentReviewer:"reviewer-two",
    assetClassification:"isolated_nonproduction_test_only",
    credentialScope:"read_only_minimal",
    dataHandlingReview:"review_required",sideEffectReview:"review_required",
    securityReviewReference:"G0-DRAFT-ONLY"
  };
}
const check=(x: unknown)=>assessUGP47G0ProposedIntake(JSON.stringify(x));
function denies(x: unknown) {
  const result=check(x);
  assert.equal(result.status,"INCOMPLETE_OR_UNSAFE");
  assert.equal(result.g0Approved,false);
  assert.equal(result.g1Authorized,false);
  assert.equal(result.gitReadAuthorized,false);
  assert.equal(result.gitWriteAuthorized,false);
  assert.equal(result.mergeAuthorized,false);
  assert.equal(result.deploymentAuthorized,false);
  assert.equal(result.independentlyCertified,false);
}
test("fully specified synthetic proposal remains unapproved and requires independent review",()=>{
  const a=check(fixture()), b=check(fixture());
  assert.equal(a.status,"REVIEW_REQUIRED_UNAUTHORIZED");
  assert.deepEqual(a,b);
  assert.equal(a.g0Approved,false);
  assert.equal(a.g1Authorized,false);
  assert.equal(a.gitReadAuthorized,false);
  assert.equal(a.gitWriteAuthorized,false);
  assert.equal(a.mergeAuthorized,false);
  assert.equal(a.deploymentAuthorized,false);
  assert.equal(a.independentlyCertified,false);
});
test("missing scope, unsafe identities, privilege claims, reviewer collision fail closed",()=>{
  const changes: ((v: ReturnType<typeof fixture>)=>void)[]=[
    v=>{v.repositoryId=0;}, v=>{v.installationId=0;},
    v=>{v.host="github.example";},v=>{v.owner="../private";},
    v=>{v.baseSha="moving";},v=>{v.baseRef="main/../bad";},
    v=>{v.operator=v.independentReviewer;},
    v=>{v.assetClassification="production";},
    v=>{v.credentialScope="repo_write";},
    v=>{v.dataHandlingReview="approved";},
    v=>{v.sideEffectReview="approved";},
    v=>{v.securityReviewReference="";},
    v=>{v.allowedPaths=["../secret"];},
    v=>{v.allowedPaths=[".git/config"];},
    v=>{v.allowedPaths=["content/demo.md","content/demo.md"];},
    v=>{v.approvedGetPaths=["/repos/demo-owner/test-repo/actions/workflows"];},
    v=>{v.approvedGetPaths=["/repos/other/test-repo/git/commits/"+"a".repeat(40)];},
    v=>{v.approvedGetPaths=[];}
  ];
  for (const change of changes) {const x=fixture();change(x);denies(x);}
});
test("malformed, oversized and unexpected permission keys never grant authority",()=>{
  const f=fixture();
  denies({...f, gitReadAuthorized:true});
  for (const raw of [null,42,{},"", "{","[]","null","x".repeat(17000)]) {
    const r=assessUGP47G0ProposedIntake(raw);
    assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
    assert.equal(r.g1Authorized,false);
  }
});
test("rejects untrusted object graphs without inspecting getters",()=>{
  const hostile=new Proxy(fixture(),{get(){throw Error("unexpected access");}});
  const r=assessUGP47G0ProposedIntake(hostile);
  assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
  assert.equal(r.gitReadAuthorized,false);
});

test("duplicate top-level JSON keys, escaped aliases and whitespace ambiguity deny",()=>{
  const valid=JSON.stringify(fixture());
  const duplicate=valid.replace('"host":"github.com"', '"host":"evil.example","host":"github.com"');
  const escapedAlias=valid.replace('"host":"github.com"', '"\\u0068ost":"evil.example","host":"github.com"');
  for(const raw of [duplicate,escapedAlias," "+valid,valid+"\n",valid.replace('"repositoryId":1234','"repositoryId":1.234e3')]) {
    const r=assessUGP47G0ProposedIntake(raw);
    assert.equal(r.status,"INCOMPLETE_OR_UNSAFE");
    assert.equal(r.g0Approved,false);
    assert.equal(r.g1Authorized,false);
  }
});
test("case-fold path collisions and absent exact base commit endpoint deny",()=>{
  const a=fixture();a.allowedPaths=["content/Demo.md","content/demo.md"];denies(a);
  const b=fixture();b.approvedGetPaths=["/repos/demo-owner/test-repo/git/commits/"+"b".repeat(40)];denies(b);
  const c=fixture();c.approvedGetPaths=["/repos/demo-owner/test-repo/git/trees/"+"a".repeat(40)];denies(c);
});
