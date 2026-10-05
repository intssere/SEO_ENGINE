import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_13A_DEPLOYMENT_ID,
  P12_2_L10_13A_EXECUTION_INVENTORY_FINGERPRINT,
  P12_2_L10_13A_EXECUTION_PLAN_FINGERPRINT,
  P12_2_L10_13A_OBSERVED_AT,
  P12_2_L10_13A_OPERATOR_FAILURE_CODE,
  P12_2_L10_13A_PACKET_FINGERPRINT,
  P12_2_L10_13A_QUERIES,
  P12_2_L10_13A_RUN_ID,
  P12_2_L10_13A_SOURCE_CHECKPOINT_FINGERPRINT,
  P12_2_L10_13A_SOURCE_CHECKPOINT_REVISION,
  assertP122L1013AQueryContract,
  p122L1013AAuthorizationFingerprint,
  p122L1013AAuthorizationLiteral,
  p122L1013AQuerySetFingerprint,
} from "./p12-2-l10-13a-packet-013-failure-state-certification.js";

test("P12.2-L10.13A is bound to exact packet 013 failure evidence", () => {
  assert.equal(P12_2_L10_13A_PACKET_FINGERPRINT, "4d3b401a688b4928f42cc31fdde4e57bbc9b390745157fa6cc867b21795559ea");
  assert.equal(P12_2_L10_13A_RUN_ID, "p12-2-diamond-shelf-full-interrupt-010");
  assert.equal(P12_2_L10_13A_OBSERVED_AT, "2026-10-05T15:04:49.000Z");
  assert.equal(P12_2_L10_13A_DEPLOYMENT_ID, "87389cf3-5aae-4c29-ab10-2023aa7f5aad");
  assert.equal(P12_2_L10_13A_OPERATOR_FAILURE_CODE, "p12_2_persistence_completed_run_not_certified");
  assert.equal(P12_2_L10_13A_SOURCE_CHECKPOINT_REVISION, 141);
  assert.equal(P12_2_L10_13A_SOURCE_CHECKPOINT_FINGERPRINT, "3ec71dfe067053ec1a8e3d72c93fb998d9f5565ee338741346ca79521759e84b");
  assert.equal(P12_2_L10_13A_EXECUTION_PLAN_FINGERPRINT, "0818612ac8f35d5109cb4901442a0546630b9ca31a7ae6f24f77f8271db650aa");
  assert.equal(P12_2_L10_13A_EXECUTION_INVENTORY_FINGERPRINT, "275af2602679a5f1b3f0d58573d578e3d82d988287cb57933d69586543554545");
});

test("P12.2-L10.13A contains only eight single SELECT statements", () => {
  assert.doesNotThrow(() => assertP122L1013AQueryContract());
  assert.equal(P12_2_L10_13A_QUERIES.length, 8);
  for (const query of P12_2_L10_13A_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("P12.2-L10.13A certifies completed checkpoint plus blocked completed-run persistence", () => {
  const byId = new Map(P12_2_L10_13A_QUERIES.map((query) => [query.id, query.sql]));
  const checkpoint = byId.get("final_checkpoint_state") ?? "";
  const completion = byId.get("checkpoint_completion_guard") ?? "";
  const absence = byId.get("completed_run_absence_guard") ?? "";
  const claimed = byId.get("claimed_consumed_guard") ?? "";
  const durable = byId.get("durable_failure_state_guard") ?? "";

  assert.match(checkpoint, /terminalFailures/);
  assert.match(checkpoint, /completedBatchIds/);
  assert.match(completion, /status'='completed/);
  assert.match(completion, /terminalFailures/);
  assert.match(absence, /first_party_crawl_completed_runs/);
  assert.match(claimed, /status='claimed'/);
  assert.match(durable, /pendingUrls/);
  assert.match(durable, /terminalFailures/);
});

test("P12.2-L10.13A fingerprints and authorization are deterministic", () => {
  assert.match(p122L1013AQuerySetFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(p122L1013AAuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L1013AAuthorizationLiteral(),
    "AUTHORIZE:P12_2_L10_13A_PACKET_013_READ_ONLY:" + p122L1013AAuthorizationFingerprint(),
  );
});
