import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {verifyReceiptEnvelope,expectedPinnedUgpReceipts} from "./int-02b-receipt-witness.mjs";
const envelope={schema:"int02b-receipt-envelope-v1",executionEnvironment:"disposable_test",receipts:expectedPinnedUgpReceipts()};
const digest=e=>createHash("sha256").update(JSON.stringify(e)).digest("hex");
const anchor={authority:"independent_disposable_test_witness",expectedDigest:digest(envelope)};
test("even digest-matching UGP receipts do not certify historical main migrations",()=>{
 assert.deepEqual(verifyReceiptEnvelope({envelope,anchor}),{verified:false,reason:"main_installation_provenance_unverified",diagnostic:"combined_candidate"});
});
test("unanchored receipt evidence fails closed",()=>assert.equal(verifyReceiptEnvelope({envelope}).reason,"receipt_or_anchor_missing"));
test("caller-asserted authority fails closed",()=>assert.equal(verifyReceiptEnvelope({envelope,anchor:{...anchor,authority:"caller_asserted"}}).reason,"independent_anchor_missing"));
test("tampered receipt hashes fail despite originally valid anchor",()=>{
 const changed={...envelope,receipts:envelope.receipts.map((r,i)=>i? r:{...r,sha256:"0".repeat(64)})};
 assert.equal(verifyReceiptEnvelope({envelope:changed,anchor}).reason,"receipt_history_inconsistent");
});
test("altered receipt order does not match witness digest",()=>{
 const changed={...envelope,receipts:[...envelope.receipts].reverse()};
 assert.equal(verifyReceiptEnvelope({envelope:changed,anchor}).reason,"receipt_witness_mismatch");
});
test("production and staging receipt envelopes are not accepted",()=>{
 for(const executionEnvironment of ["production","staging"])assert.equal(verifyReceiptEnvelope({envelope:{...envelope,executionEnvironment},anchor}).reason,"unsupported_receipt_environment");
});
