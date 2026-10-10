import assert from "node:assert/strict";
import test from "node:test";
import {reviewDeniedControlIssuer,type ControlIssuerIntent} from "./ugp-11-c2-denied-control-issuer.js";
import type {P9OperatorEvidence,P9KeyEvidence} from "./ugp-11-1d12-trust-contracts.js";
const at="2026-10-10T12:00:00.000Z";
const identity:P9OperatorEvidence={principalId:"principal-c2",tenantId:"tenant-c2",siteId:"site-c2",
 identityProvider:"example-idp",subject:"subject-c2",sessionId:"session-c2",
 authenticationTime:"2026-10-10T11:00:00.000Z",expiresAt:"2026-10-10T13:00:00.000Z",
 assertedVerified:true,permission:"p9.control",policyVersion:"policy-c2"};
const key:P9KeyEvidence={keyId:"key-c2",issuerId:"issuer-c2",algorithm:"ES256",
 scopeTenantId:"tenant-c2",scopeSiteId:"site-c2",notBefore:"2026-10-10T11:00:00.000Z",
 notAfter:"2026-10-10T13:00:00.000Z",state:"active",rotationEpoch:1,
 assertedSignatureVerified:true,trustAnchorId:"anchor-c2"};
const intent:ControlIssuerIntent={tenantId:"tenant-c2",siteId:"site-c2",principalId:"principal-c2",
 action:"pause",decisionId:"decision-c2",nonce:"nonce-c2",priorRevision:1,
 priorFingerprint:"a".repeat(64),policyVersion:"policy-c2",
 effectiveAt:"2026-10-10T11:30:00.000Z",expiresAt:"2026-10-10T12:30:00.000Z"};
const allDenied=(r:ReturnType<typeof reviewDeniedControlIssuer>)=>
 assert.deepEqual([r.identityTrusted,r.grantTrusted,r.signerTrusted,r.issuanceAllowed,r.claimAllowed,r.dispatchAllowed],
 [false,false,false,false,false,false]);
test("C2 even self-attested identity/key/grant with valid scoped intent denies issuance",()=>{
 const r=reviewDeniedControlIssuer(intent,identity,key,at);
 assert.equal(r.kind,"unverified_identity_or_key");allDenied(r);
});
test("C2 refuses cross-site, cross-principal and policy-version drift",()=>{
 for(const item of [{...intent,siteId:"other-site"},{...intent,principalId:"other"},
 {...intent,policyVersion:"other"}]){
 const r=reviewDeniedControlIssuer(item,identity,key,at);
 assert.equal(r.kind,"scope_mismatch");allDenied(r);
 }
});
test("C2 refuses expired, future and malformed intent",()=>{
 for(const item of [{...intent,expiresAt:"2026-10-10T11:59:59.000Z"},
 {...intent,effectiveAt:"2026-10-10T12:00:01.000Z"}]){
 const r=reviewDeniedControlIssuer(item,identity,key,at);
 assert.equal(r.kind,"expired_intent");allDenied(r);
 }
 const malformed=reviewDeniedControlIssuer({...intent,priorFingerprint:"bad"},identity,key,at);
 assert.equal(malformed.kind,"invalid_intent");allDenied(malformed);
});
test("C2 revoked key, false assertions and stale IDP session cannot enable authority",()=>{
 for(const candidate of [{...key,state:"revoked" as const},{...key,assertedSignatureVerified:false}]){
 allDenied(reviewDeniedControlIssuer(intent,identity,candidate,at));
 }
 allDenied(reviewDeniedControlIssuer(intent,{...identity,assertedVerified:false},key,at));
 allDenied(reviewDeniedControlIssuer(intent,{...identity,expiresAt:"2026-10-10T11:59:00.000Z"},key,at));
});
