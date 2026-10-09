import assert from "node:assert/strict";
import test from "node:test";
import {signP9FixtureDecision,reviewP9FixtureDecision,type P9FixtureDecision} from "./ugp-11-1d8-signed-lineage.js";
const key=Buffer.alloc(32,1),other=Buffer.alloc(32,2);
const genesis="0".repeat(64);
const d:P9FixtureDecision={tenantId:"tenant-a",siteId:"site-a",decisionId:"decision-a",
 principalId:"principal-a",revision:1,priorRevision:0,priorFingerprint:genesis,
 mode:"running",effectiveAt:"2026-10-09T10:00:00.000Z",expiresAt:"2026-10-09T11:00:00.000Z",nonce:"n-1"};
test("D8 a valid fixture signature is never authority to claim or dispatch",()=>{
 const signed=signP9FixtureDecision(d,key);
 assert.deepEqual(reviewP9FixtureDecision(signed,key,null),{
  signatureValid:true,lineageValid:true,authorityGranted:false,claimAllowed:false,
  dispatchAllowed:false,reason:"fixture_signature_not_authoritative"
 });
});
test("D8 rejects tampering, wrong signer, replay and foreign scope predecessor",()=>{
 const signed=signP9FixtureDecision(d,key);
 assert.equal(reviewP9FixtureDecision(signed,other,null).reason,"invalid_signature");
 assert.equal(reviewP9FixtureDecision({...signed,decision:{...signed.decision,siteId:"site-b"}},key,null).reason,"invalid_decision");
 assert.equal(reviewP9FixtureDecision(signed,key,{revision:1,fingerprint:signed.fingerprint,tenantId:"tenant-a",siteId:"site-a"}).reason,"invalid_lineage");
 const next=signP9FixtureDecision({...d,decisionId:"decision-b",nonce:"n-2",
  revision:2,priorRevision:1,priorFingerprint:signed.fingerprint},key);
 assert.equal(reviewP9FixtureDecision(next,key,{revision:1,fingerprint:signed.fingerprint,tenantId:"other",siteId:"site-a"}).reason,"invalid_lineage");
});
test("D8 fails closed for malformed timestamps and missing key strength",()=>{
 assert.throws(()=>signP9FixtureDecision({...d,effectiveAt:"2026-10-09"},key),/noncanonical_time/);
 assert.throws(()=>signP9FixtureDecision(d,Buffer.alloc(8)),/fixture_key_invalid/);
 assert.throws(()=>signP9FixtureDecision({...d,revision:5},key),/invalid_decision_fields/);
});
