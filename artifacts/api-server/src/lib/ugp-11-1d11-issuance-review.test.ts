import assert from "node:assert/strict";
import test from "node:test";
import {reviewP9ControlIssuance,type IssuanceRequest} from "./ugp-11-1d11-issuance-review.js";
const req:IssuanceRequest={
 tenantId:"tenant-a",siteId:"site-a",principalId:"principal-a",action:"resume",
 requestedRevision:2,previousRevision:1,decisionFingerprint:"a".repeat(64),
 assertedRole:"control-operator",assertedAuthenticated:true,
 keyId:"key-a",assertedKeyState:"active",approvalId:"approval-a",assertedApproved:true
};
test("D11 fully asserted credentials cannot self-certify issuance",()=>{
 assert.deepEqual(reviewP9ControlIssuance(req),{
  issuanceAllowed:false,authorityVerified:false,claimAllowed:false,dispatchAllowed:false,
  reason:"independent_policy_and_key_governance_missing"
 });
});
test("D11 rejects revoked keys, untrusted identities and revision forks",()=>{
 assert.equal(reviewP9ControlIssuance({...req,assertedKeyState:"revoked"}).reason,"untrusted_key_state");
 assert.equal(reviewP9ControlIssuance({...req,assertedKeyState:"expired"}).reason,"untrusted_key_state");
 assert.equal(reviewP9ControlIssuance({...req,assertedAuthenticated:false}).reason,"untrusted_operator_identity");
 for(const invalid of [
  {...req,tenantId:"invalid scope"},
  {...req,action:"publish"},
  {...req,requestedRevision:3},
  {...req,decisionFingerprint:"bad"},
  {...req,keyId:""},
  {...req,approvalId:"spaces not valid"}
 ])assert.equal(reviewP9ControlIssuance(invalid as IssuanceRequest).issuanceAllowed,false);
});
test("D11 all control actions remain deny-only",()=>{
 for(const action of ["pause","drain","kill","resume"] as const){
  const review=reviewP9ControlIssuance({...req,action});
  assert.equal(review.issuanceAllowed,false);
  assert.equal(review.claimAllowed,false);
  assert.equal(review.dispatchAllowed,false);
 }
});
