import {test} from "node:test";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {inspectHistoricalReceiptBundle as check} from "./int-02b-historical-receipt-intake.mjs";
const filenames=["0001_core.sql","0002_auth.sql","0003_observation_evidence_schema.sql","0004_first_party_crawl_execution_state.sql","0005_p8_8_policy_mutation_reservations.sql","0006_p8_8_policy_mutation_controls.sql","0007_p8_8_policy_mutation_dispatch.sql","0008_first_party_crawl_l2_invocations.sql","0009_first_party_crawl_l2_bounded_pilot_phase.sql","0010_first_party_crawl_terminal_failure_recovery.sql","0011_first_party_crawl_expected_absence_disposition.sql"];
const receipts=filenames.map(filename=>({filename,sha256:createHash("sha256").update(readFileSync(new URL("../../lib/db/migrations/"+filename,import.meta.url))).digest("hex"),appliedAtUtc:"2026-10-11T10:00:00Z"}));
const bundle={schemaVersion:"int02b-historical-receipts-v1",sourceCommit:"a".repeat(40),target:{projectId:"project-test",environmentId:"ephemeral",serviceId:"pg-test",database:"test"},receipts,witness:{immutableReference:"fixture://witness",attestor:"reviewer"}};
test("apparently complete, self-submitted bundle cannot confer historical authority",()=>assert.deepEqual(check(bundle),{reviewEligible:false,executionAuthorized:false,reason:"independent_witness_not_authenticated"}));
for(const [reason,change] of [
 ["bundle_missing",null],
 ["bundle_schema_unsupported",{...bundle,schemaVersion:"other"}],
 ["receipts_missing",{...bundle,receipts:[]}],
 ["source_commit_missing",{...bundle,sourceCommit:"untrusted"}],
 ["target_identity_incomplete",{...bundle,target:{...bundle.target,serviceId:""}}],
 ["receipt_identity_invalid",{...bundle,receipts:[bundle.receipts[0],bundle.receipts[0],...bundle.receipts.slice(2)]}],
 ["receipt_evidence_incomplete",{...bundle,receipts:[{...bundle.receipts[0],sha256:"wrong"},...bundle.receipts.slice(1)]}],
 ["legacy_ugp_namespace_collision",{...bundle,receipts:[{...bundle.receipts[0],filename:"0008_ugp_10_3_authority_outreach_review_events.sql"},...bundle.receipts.slice(1)]}],
 ["independent_witness_not_supplied",{...bundle,witness:{attestor:"reviewer"}}]
])test("reject "+reason,()=>assert.deepEqual(check(change),{reviewEligible:false,executionAuthorized:false,reason}));

test("reject impossible Gregorian timestamp",()=>assert.equal(check({...bundle,receipts:[{...bundle.receipts[0],appliedAtUtc:"2026-02-30T10:00:00Z"},...bundle.receipts.slice(1)]}).reason,"receipt_evidence_incomplete"));
test("reject duplicate migration ordinal with different filename",()=>assert.equal(check({...bundle,receipts:[bundle.receipts[0],{...bundle.receipts[0],filename:"0001_alternate.sql"},...bundle.receipts.slice(2)]}).reason,"receipt_not_canonical_integration_migration"));
test("reject reversed migration ordinals",()=>assert.equal(check({...bundle,receipts:[bundle.receipts[1],bundle.receipts[0],...bundle.receipts.slice(2)]}).reason,"receipt_sequence_invalid"));

test("reject fabricated migration with an otherwise well-formed name",()=>assert.equal(check({...bundle,receipts:[{...bundle.receipts[0],filename:"0016_fabricated.sql"},...bundle.receipts.slice(1)]}).reason,"receipt_not_canonical_integration_migration"));

test("reject receipt digest that is syntactically valid but does not match canonical SQL",()=>assert.equal(check({...bundle,receipts:[{...bundle.receipts[0],sha256:"b".repeat(64)},...bundle.receipts.slice(1)]}).reason,"receipt_source_sha256_mismatch"));

test("null receipt entry is a controlled denial, not an exception",()=>assert.deepEqual(check({...bundle,receipts:[null,...bundle.receipts.slice(1)]}),{reviewEligible:false,executionAuthorized:false,reason:"receipt_identity_invalid"}));
test("non-object receipt entry is rejected",()=>assert.equal(check({...bundle,receipts:["malformed",...bundle.receipts.slice(1)]}).reason,"receipt_identity_invalid"));

test("reject incomplete otherwise valid main receipts",()=>assert.equal(check({...bundle,receipts:bundle.receipts.slice(0,10)}).reason,"historical_receipt_set_incomplete"));
test("reject canonical but noncontiguous 11-receipt sequence",()=>assert.equal(check({...bundle,receipts:[...bundle.receipts.slice(0,10),{...bundle.receipts[10],filename:"0012_ugp_10_3_authority_outreach_review_events.sql",sha256:createHash("sha256").update(readFileSync(new URL("../../lib/db/migrations/0012_ugp_10_3_authority_outreach_review_events.sql",import.meta.url))).digest("hex")}] }).reason,"historical_receipt_sequence_incomplete"));

test("complete 15-migration integration receipts remain unauthenticated without independent witness verification",()=>{
 const map=JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json",import.meta.url)));
 const all=[...receipts,...map.entries.map(e=>({filename:e.candidate,sha256:createHash("sha256").update(readFileSync(new URL("../../lib/db/migrations/"+e.candidate,import.meta.url))).digest("hex"),appliedAtUtc:"2026-10-11T10:00:00Z"}))];
 assert.deepEqual(check({...bundle,receipts:all}),{reviewEligible:false,executionAuthorized:false,reason:"independent_witness_not_authenticated"});
});
test("complete 15-migration receipts reject missing integration migration",()=>{
 const map=JSON.parse(readFileSync(new URL("./int-02a-ugp-migration-source-map.json",import.meta.url)));
 const all=[...receipts,...map.entries.map(e=>({filename:e.candidate,sha256:createHash("sha256").update(readFileSync(new URL("../../lib/db/migrations/"+e.candidate,import.meta.url))).digest("hex"),appliedAtUtc:"2026-10-11T10:00:00Z"}))];
 assert.equal(check({...bundle,receipts:all.slice(0,14)}).reason,"historical_receipt_set_incomplete");
});
