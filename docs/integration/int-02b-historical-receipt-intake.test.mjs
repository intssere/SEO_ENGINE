import {test} from "node:test";
import assert from "node:assert/strict";
import {inspectHistoricalReceiptBundle as check} from "./int-02b-historical-receipt-intake.mjs";
const bundle={schemaVersion:"int02b-historical-receipts-v1",sourceCommit:"a".repeat(40),target:{projectId:"project-test",environmentId:"ephemeral",serviceId:"pg-test",database:"test"},receipts:[{filename:"0001_core.sql",sha256:"b".repeat(64),appliedAtUtc:"2026-10-11T10:00:00Z"}],witness:{immutableReference:"fixture://witness",attestor:"reviewer"}};
test("apparently complete, self-submitted bundle cannot confer historical authority",()=>assert.deepEqual(check(bundle),{reviewEligible:false,executionAuthorized:false,reason:"independent_witness_not_authenticated"}));
for(const [reason,change] of [
 ["bundle_missing",null],
 ["bundle_schema_unsupported",{...bundle,schemaVersion:"other"}],
 ["receipts_missing",{...bundle,receipts:[]}],
 ["source_commit_missing",{...bundle,sourceCommit:"untrusted"}],
 ["target_identity_incomplete",{...bundle,target:{...bundle.target,serviceId:""}}],
 ["receipt_identity_invalid",{...bundle,receipts:[bundle.receipts[0],bundle.receipts[0]]}],
 ["receipt_evidence_incomplete",{...bundle,receipts:[{...bundle.receipts[0],sha256:"wrong"}]}],
 ["legacy_ugp_namespace_collision",{...bundle,receipts:[{...bundle.receipts[0],filename:"0008_ugp_10_3_authority_outreach_review_events.sql"}]}],
 ["independent_witness_not_supplied",{...bundle,witness:{attestor:"reviewer"}}]
])test("reject "+reason,()=>assert.deepEqual(check(change),{reviewEligible:false,executionAuthorized:false,reason}));
