import assert from "node:assert/strict";
import test from "node:test";
import { signCviSourceReceipt, CVI_SIGNED_SOURCE_RECEIPT_VERSION } from "./cvi-signed-source-receipt.js";
import {
  admitCviReceiptNonce, CVI_ATOMIC_RECEIPT_LEDGER_SQL,
  type CviAtomicAcquisitionLedger,
} from "./cvi-receipt-nonce-admission.js";
import type { CviNestedSourceIntegrityResult } from "./cvi-ugp-nested-source-integrity.js";

const fp=(c:string)=>c.repeat(64);
const tenantId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const siteId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const authSessionId="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const connectionId="dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const key=Buffer.alloc(32,91);
const nested:CviNestedSourceIntegrityResult={
  version:"cvi-1c5-nested-source-integrity-v1",status:"INTEGRITY_REVIEW_ONLY",
  reasons:[],ledgerFingerprint:fp("a"),resultFingerprint:fp("b"),
  nestedRecordFingerprintsVerified:true,sourceAuthenticityIndependentlyVerified:false,
  factualAccuracyIndependentlyVerified:false,licensingIndependentlyVerified:false,
  executionAuthorized:false,publicationAuthorized:false,
};
const claims={
  version:CVI_SIGNED_SOURCE_RECEIPT_VERSION,
  tenantId,siteId,authenticatedSubject:"subject-1",authSessionId,
  sourceLedgerFingerprint:fp("a"),nestedIntegrityFingerprint:fp("b"),
  acquisitionId:"acquisition-1",nonce:"nonce-1",
  issuedAt:"2026-10-09T04:00:03.000Z",expiresAt:"2026-10-09T04:03:03.000Z",
};
const receipt=signCviSourceReceipt(claims,key);
const base={
  receipt,serverKey:key,nestedIntegrity:nested,
  expectedTenantId:tenantId,expectedSiteId:siteId,expectedSubject:"subject-1",
  expectedAuthSessionId:authSessionId,expectedAcquisitionId:"acquisition-1",
  expectedNonce:"nonce-1",connectionId,requestedResource:"sc-domain:example.test",
  observationFingerprint:fp("c"),
  requestedAt:"2026-10-09T04:00:00.000Z",
  observedAt:"2026-10-09T04:00:02.000Z",
  evaluatedAt:"2026-10-09T04:00:04.000Z",
};
const ledger=(fn:CviAtomicAcquisitionLedger["recordOnce"]):CviAtomicAcquisitionLedger=>({recordOnce:fn});

test("one admitted signed receipt is still untrusted and incapable of authorizing execution",async()=>{
 let called=0;
 const result=await admitCviReceiptNonce({...base,ledger:ledger(async row=>{
  called++;
  assert.equal(row.requestNonce,"nonce-1");
  assert.equal(row.authSessionId,authSessionId);
  return "RECORDED";
 })});
 assert.equal(called,1);
 assert.equal(result.status,"RECORDED_UNTRUSTED_REVIEW_ONLY");
 assert.equal(result.durableNonceRecorded,true);
 assert.equal(result.providerOriginIndependentlyVerified,false);
 assert.equal(result.evidenceTruthIndependentlyVerified,false);
 assert.equal(result.publicationAuthorized,false);
 assert.equal(result.executionAuthorized,false);
});
test("invalid signature, wrong session and expired receipt never invoke ledger",async()=>{
 let called=0;
 const store=ledger(async()=>{called++;return "RECORDED";});
 for(const bad of [
  {serverKey:Buffer.alloc(32,9)},
  {expectedAuthSessionId:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"},
  {evaluatedAt:"2026-10-09T04:04:00.000Z"},
 ]) {
  const result=await admitCviReceiptNonce({...base,...bad,ledger:store});
  assert.equal(result.status,"DENY");
 }
 assert.equal(called,0);
});
test("duplicate admission, denied trigger and rejected transport errors remain nonauthorizing",async()=>{
 for(const [reply,status] of [
  ["DUPLICATE","REPLAY_OR_COLLISION"],["DENIED","DENY"],
 ] as const){
  const result=await admitCviReceiptNonce({...base,ledger:ledger(async()=>reply)});
  assert.equal(result.status,status);
  assert.equal(result.executionAuthorized,false);
 }
 const failed=await admitCviReceiptNonce({...base,ledger:ledger(async()=>{throw Error("private db details")})});
 assert.equal(failed.status,"DENY");
 assert.deepEqual(failed.reasons,["atomic_ledger_write_failed"]);
});
test("malformed connection and inconsistent observation timeline block without writing",async()=>{
 let called=0;
 const store=ledger(async()=>{called++;return "RECORDED"});
 assert.equal((await admitCviReceiptNonce({...base,connectionId:"not-uuid",ledger:store})).status,"DENY");
 assert.equal((await admitCviReceiptNonce({...base,
  observedAt:"2026-10-09T04:00:05.000Z",ledger:store})).status,"DENY");
 assert.equal(called,0);
});
test("prepared query uses atomic ON CONFLICT and parametrized arguments",()=>{
 assert.match(CVI_ATOMIC_RECEIPT_LEDGER_SQL,/ON CONFLICT DO NOTHING RETURNING acquisition_id/);
 assert.match(CVI_ATOMIC_RECEIPT_LEDGER_SQL,/VALUES \(\$1,\$2::uuid/);
 assert.doesNotMatch(CVI_ATOMIC_RECEIPT_LEDGER_SQL,/\b(UPDATE|DELETE|TRUNCATE)\b/);
});
