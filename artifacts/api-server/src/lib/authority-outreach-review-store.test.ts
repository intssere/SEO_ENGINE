import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthorityOutreachReviewStoreError,
  parseAuthorityOutreachReviewMutationRequest,
} from "./authority-outreach-review-store.js";

const FP=(c:string)=>c.repeat(64);

function valid(){
  const body={
    workspaceFingerprint:FP("a"),
    workspaceItemId:"uaow-"+"b".repeat(24),
    workspaceItemFingerprint:FP("b"),
    qualificationFingerprint:FP("c"),
    prospectFingerprint:FP("d"),
    expectedLatestReviewFingerprint:null,
    decision:"deferred",
    reasonCode:"needs_more_context",
    confirmation:"",
  };
  body.confirmation=[
    "REVIEW_OUTREACH",
    body.decision,
    body.prospectFingerprint,
    body.workspaceFingerprint,
  ].join(":");
  return body;
}

test("UGP-10.3 review mutation parser accepts only bounded customer decision fields",()=>{
  const parsed=parseAuthorityOutreachReviewMutationRequest(valid());
  assert.equal(parsed.decision,"deferred");
  assert.equal(parsed.reasonCode,"needs_more_context");
  assert.equal(parsed.expectedLatestReviewFingerprint,null);
});

test("UGP-10.3 review mutation parser rejects client-supplied reviewer identity and unknown fields",()=>{
  for(const body of [
    {...valid(),reviewerId:"attacker@example.com"},
    {...valid(),outreachSendingAuthorized:true},
  ]){
    assert.throws(
      ()=>parseAuthorityOutreachReviewMutationRequest(body),
      (error:unknown)=>{
        assert.ok(error instanceof AuthorityOutreachReviewStoreError);
        assert.equal(error.status,400);
        assert.equal(error.category,"invalid_outreach_review_request");
        return true;
      },
    );
  }
});
