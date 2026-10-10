import assert from "node:assert/strict";
import test from "node:test";
import {reviewP9IssuanceTrustContracts,type P9OperatorEvidence,type P9KeyEvidence} from "./ugp-11-1d12-trust-contracts.js";
const at="2026-10-09T12:00:00.000Z";
const identity:P9OperatorEvidence={
 principalId:"operator",tenantId:"tenant-a",siteId:"site-a",identityProvider:"oidc",
 subject:"subject-a",sessionId:"session-a",authenticationTime:"2026-10-09T11:00:00.000Z",
 expiresAt:"2026-10-09T13:00:00.000Z",assertedVerified:true,
 permission:"p9.control.issue",policyVersion:"v1"
};
const key:P9KeyEvidence={
 keyId:"key-a",issuerId:"issuer-a",algorithm:"Ed25519",scopeTenantId:"tenant-a",
 scopeSiteId:"site-a",notBefore:"2026-10-09T11:00:00.000Z",
 notAfter:"2026-10-10T12:00:00.000Z",state:"active",rotationEpoch:1,
 assertedSignatureVerified:true,trustAnchorId:"anchor-a"
};
test("D12 valid-looking self attestations are never trusted",()=>{
 const result=reviewP9IssuanceTrustContracts(identity,key,at);
 assert.equal(result.reason,"independent_trust_unavailable");
 assert.deepEqual([result.identityTrusted,result.keyTrusted,result.issuanceAllowed,
  result.authorityVerified,result.claimAllowed,result.dispatchAllowed],
  [false,false,false,false,false,false]);
});
test("D12 scope collision and revoked, expired, malformed evidence fail closed",()=>{
 const check=(i:P9OperatorEvidence,k:P9KeyEvidence,t=at)=>
  reviewP9IssuanceTrustContracts(i,k,t);
 assert.equal(check(identity,{...key,scopeTenantId:"tenant-b"}).reason,"scope_mismatch");
 assert.equal(check(identity,{...key,scopeSiteId:"site-b"}).reason,"scope_mismatch");
 assert.equal(check(identity,{...key,state:"revoked"}).reason,"expired_or_revoked");
 assert.equal(check(identity,{...key,state:"rotating"}).reason,"expired_or_revoked");
 assert.equal(check({...identity,expiresAt:at},key).reason,"expired_or_revoked");
 assert.equal(check(identity,{...key,notBefore:"2026-10-09T13:00:00.000Z"}).reason,"expired_or_revoked");
 assert.equal(check(identity,{...key,algorithm:"none" as "Ed25519"},at).reason,"malformed_evidence");
 assert.equal(check(identity,key,"tomorrow").reason,"malformed_evidence");
 assert.equal(check({...identity,subject:"bad subject"},key).reason,"malformed_evidence");
 assert.equal(check(identity,{...key,rotationEpoch:-1}).reason,"malformed_evidence");
});
test("D12 false identity and key signature assertions cannot grant anything",()=>{
 const result=reviewP9IssuanceTrustContracts({...identity,assertedVerified:false},
 {...key,assertedSignatureVerified:false},at);
 assert.equal(result.issuanceAllowed,false);
 assert.equal(result.claimAllowed,false);
 assert.equal(result.dispatchAllowed,false);
});
