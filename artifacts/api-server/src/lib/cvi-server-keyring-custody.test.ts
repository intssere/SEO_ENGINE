import assert from "node:assert/strict";
import test from "node:test";
import { CviServerKeyringCustody, CVI_SERVER_KEYRING_CUSTODY_VERSION } from "./cvi-server-keyring-custody.js";
import { CVI_SIGNED_SOURCE_RECEIPT_VERSION } from "./cvi-signed-source-receipt.js";
import type { CviNestedSourceIntegrityResult } from "./cvi-ugp-nested-source-integrity.js";

const fp=(ch:string)=>ch.repeat(64);
const key1=Buffer.alloc(32,11), key2=Buffer.alloc(32,12), key3=Buffer.alloc(32,13);
const nested:CviNestedSourceIntegrityResult={
 version:"cvi-1c5-nested-source-integrity-v1",status:"INTEGRITY_REVIEW_ONLY",
 reasons:[],ledgerFingerprint:fp("a"),resultFingerprint:fp("b"),
 nestedRecordFingerprintsVerified:true,sourceAuthenticityIndependentlyVerified:false,
 factualAccuracyIndependentlyVerified:false,licensingIndependentlyVerified:false,
 executionAuthorized:false,publicationAuthorized:false,
};
const claims={
 version:CVI_SIGNED_SOURCE_RECEIPT_VERSION,tenantId:"tenant-1",siteId:"site-1",
 authenticatedSubject:"subject-1",authSessionId:"session-1",sourceLedgerFingerprint:fp("a"),
 nestedIntegrityFingerprint:fp("b"),acquisitionId:"acquisition-1",nonce:"nonce-1",
 issuedAt:"2026-10-09T04:00:00.000Z",expiresAt:"2026-10-09T04:04:00.000Z",
};
const config=[
 {keyId:"current",secret:key1,state:"issuing" as const},
 {keyId:"previous",secret:key2,state:"verify_only" as const},
 {keyId:"disabled",secret:key3,state:"revoked" as const},
];
const base=(custody:CviServerKeyringCustody,boundReceipt:ReturnType<CviServerKeyringCustody["issue"]>)=>
 custody.verify({
  boundReceipt,nestedIntegrity:nested,expectedTenantId:claims.tenantId,
  expectedSiteId:claims.siteId,expectedSubject:claims.authenticatedSubject,
  expectedAuthSessionId:claims.authSessionId,expectedAcquisitionId:claims.acquisitionId,
  expectedNonce:claims.nonce,evaluatedAt:"2026-10-09T04:01:00.000Z",
 });
test("known issuing server key verifies only possession of secret; never source truth or authorization",()=>{
 const custody=new CviServerKeyringCustody(config);
 const receipt=custody.issue("current",claims);
 assert.equal(receipt.custodyVersion,CVI_SERVER_KEYRING_CUSTODY_VERSION);
 const result=base(custody,receipt);
 assert.equal(result.status,"PENDING_DURABLE_REPLAY_AND_PROVIDER_ORIGIN_CHECK");
 assert.equal(result.signatureVerified,true);
 assert.equal(result.keyNotRevoked,true);
 assert.equal(result.durableReplayIndependentlyChecked,false);
 assert.equal(result.providerOriginIndependentlyVerified,false);
 assert.equal(result.humanApprovalAuthenticated,false);
 assert.equal(result.executionAuthorized,false);
 assert.equal(result.publicationAuthorized,false);
});
test("issuance denies retired, revoked and unknown key IDs",()=>{
 const custody=new CviServerKeyringCustody(config);
 for(const id of ["previous","disabled","unknown"])
  assert.throws(()=>custody.issue(id,claims),/issuance_not_allowed/);
});
test("key-ID substitution, altered signature, wrong tenant and revoked keys fail closed",()=>{
 const custody=new CviServerKeyringCustody(config);
 const receipt=custody.issue("current",claims);
 assert.equal(base(custody,{...receipt,keyId:"previous"}).status,"DENY");
 assert.equal(base(custody,{...receipt,keyBindingMac:fp("f")}).status,"DENY");
 assert.equal(base(custody,{...receipt,receipt:{...receipt.receipt,claims:{...claims,tenantId:"other"}}}).status,"DENY");
 const retiredSigner=new CviServerKeyringCustody([{keyId:"previous",secret:key2,state:"issuing"}]);
 const retiredReceipt=retiredSigner.issue("previous",claims);
 assert.equal(base(custody,retiredReceipt).status,"PENDING_DURABLE_REPLAY_AND_PROVIDER_ORIGIN_CHECK");
 const revokedCustody=new CviServerKeyringCustody([{keyId:"previous",secret:key2,state:"revoked"}]);
 assert.equal(base(revokedCustody,retiredReceipt).status,"DENY");
});
test("configuration rejects duplicate keys, weak keys and duplicate IDs",()=>{
 assert.throws(()=>new CviServerKeyringCustody([]),/invalid_size/);
 assert.throws(()=>new CviServerKeyringCustody([
  {keyId:"one",secret:key1,state:"issuing"},
  {keyId:"two",secret:key1,state:"verify_only"},
 ]),/duplicate_key_material/);
 assert.throws(()=>new CviServerKeyringCustody([
  {keyId:"one",secret:key1,state:"issuing"},
  {keyId:"one",secret:key2,state:"issuing"},
 ]),/invalid_key_config/);
 assert.throws(()=>new CviServerKeyringCustody([
  {keyId:"short",secret:Buffer.alloc(16),state:"issuing"},
 ]),/invalid_key_config/);
});
test("server key bytes are copied at construction and external buffer mutation cannot forge receipt",()=>{
 const raw=Buffer.alloc(32,24);
 const custody=new CviServerKeyringCustody([{keyId:"stable",secret:raw,state:"issuing"}]);
 const receipt=custody.issue("stable",claims);
 raw.fill(77);
 assert.equal(base(custody,receipt).status,"PENDING_DURABLE_REPLAY_AND_PROVIDER_ORIGIN_CHECK");
});
