import assert from "node:assert/strict";
import test from "node:test";
import { signCviSourceReceipt, verifyCviSourceReceipt, CVI_SIGNED_SOURCE_RECEIPT_VERSION } from "./cvi-signed-source-receipt.js";
import type { CviNestedSourceIntegrityResult } from "./cvi-ugp-nested-source-integrity.js";

const key = Buffer.alloc(32, 42);
const alternate = Buffer.alloc(32, 43);
const fp = (c:string)=>c.repeat(64);
const nested: CviNestedSourceIntegrityResult = {
  version:"cvi-1c5-nested-source-integrity-v1",
  status:"INTEGRITY_REVIEW_ONLY",reasons:[],ledgerFingerprint:fp("a"),
  resultFingerprint:fp("b"),nestedRecordFingerprintsVerified:true,
  sourceAuthenticityIndependentlyVerified:false,
  factualAccuracyIndependentlyVerified:false,licensingIndependentlyVerified:false,
  executionAuthorized:false,publicationAuthorized:false,
};
const claims = {
  version:CVI_SIGNED_SOURCE_RECEIPT_VERSION,
  tenantId:"tenant-1",siteId:"site-1",authenticatedSubject:"subject-1",
  authSessionId:"session-1",sourceLedgerFingerprint:nested.ledgerFingerprint,
  nestedIntegrityFingerprint:nested.resultFingerprint,
  acquisitionId:"acquisition-1",nonce:"nonce-1",
  issuedAt:"2026-10-09T04:00:00.000Z",expiresAt:"2026-10-09T04:04:00.000Z",
};
const receipt = signCviSourceReceipt(claims,key);
const verify = (override: Partial<Parameters<typeof verifyCviSourceReceipt>[0]>={}) =>
  verifyCviSourceReceipt({
    receipt,serverKey:key,expectedTenantId:claims.tenantId,expectedSiteId:claims.siteId,
    expectedSubject:claims.authenticatedSubject,expectedAuthSessionId:claims.authSessionId,
    expectedAcquisitionId:claims.acquisitionId,expectedNonce:claims.nonce,
    nestedIntegrity:nested,evaluatedAt:"2026-10-09T04:01:00.000Z",...override,
  });

test("local secret signature verification still never authorizes source, replay, writing or publication",()=>{
  const result=verify();
  assert.equal(result.status,"PENDING_DURABLE_REPLAY_AND_PROVIDER_ORIGIN_CHECK");
  assert.equal(result.signatureVerified,true);
  assert.equal(result.providerOriginIndependentlyVerified,false);
  assert.equal(result.nonceUniquenessIndependentlyVerified,false);
  assert.equal(result.businessTruthIndependentlyVerified,false);
  assert.equal(result.humanApprovalAuthenticated,false);
  assert.equal(result.executionAuthorized,false);
  assert.equal(result.publicationAuthorized,false);
});
test("tampered tenant/source receipt or wrong key fails cryptographic verification",()=>{
  assert.equal(verify({serverKey:alternate}).status,"DENY");
  assert.equal(verify({receipt:{...receipt,claims:{...claims,tenantId:"attacker"}}}).status,"DENY");
  assert.equal(verify({receipt:{...receipt,claims:{...claims,sourceLedgerFingerprint:fp("c")}}}).status,"DENY");
  assert.equal(verify({receipt:{...receipt,signature:fp("f")}}).status,"DENY");
});
test("correctly signed receipt for wrong site, subject, session, acquisition or nonce denies",()=>{
  for(const changed of [
    {expectedSiteId:"other"},{expectedTenantId:"other"},{expectedSubject:"other"},
    {expectedAuthSessionId:"other"},{expectedAcquisitionId:"other"},{expectedNonce:"other"},
  ]) assert.equal(verify(changed).status,"DENY");
});
test("expired and future-dated receipts reject, TTL cap holds",()=>{
  assert.equal(verify({evaluatedAt:claims.expiresAt}).status,"DENY");
  assert.equal(verify({evaluatedAt:"2026-10-09T03:59:59.000Z"}).status,"DENY");
  assert.throws(()=>signCviSourceReceipt({...claims,expiresAt:"2026-10-09T04:06:00.000Z"},key),/receipt_window_invalid/);
});
test("nested source report mismatch, blocked state and unsafe flag deny",()=>{
  assert.equal(verify({nestedIntegrity:{...nested,resultFingerprint:fp("d")}}).status,"DENY");
  assert.equal(verify({nestedIntegrity:{...nested,status:"BLOCKED"}}).status,"DENY");
  assert.equal(verify({nestedIntegrity:{...nested,publicationAuthorized:true as false}}).status,"DENY");
});
test("weak key and invalid claims are not admitted",()=>{
  assert.throws(()=>signCviSourceReceipt(claims,Buffer.alloc(16)),/server_secret_too_short/);
  assert.throws(()=>signCviSourceReceipt({...claims,nonce:""},key),/claims_invalid/);
  assert.equal(verify({receipt:{...receipt,signature:"garbage"}}).status,"DENY");
});
