import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT,
  P12_2_L10_12_OBSERVED_AT,
  P12_2_L10_12_PACKET_FINGERPRINT,
  P12_2_L10_12_PHASE,
  P12_2_L10_12_QUERIES,
  P12_2_L10_12_RUN_ID,
  P12_2_L10_12_SOURCE_CHECKPOINT_FINGERPRINT,
  P12_2_L10_12_SOURCE_CHECKPOINT_REVISION,
  P12_2_L10_12_SOURCE_PACKET_FINGERPRINT,
  assertP122L1012QueryContract,
  p122L1012AuthorizationFingerprint,
  p122L1012AuthorizationLiteral,
  p122L1012QuerySetFingerprint,
} from "./p12-2-l10-12-packet-012-completion-certification.js";

test("P12.2-L10.12 is bound to packet 012 and certified packet-010 resume lineage", () => {
  assert.equal(P12_2_L10_12_PACKET_FINGERPRINT, "a0df337a34e9b24d7120d6c3f71b59cfe39b3b69d61de33b59b4c6743fad67e2");
  assert.equal(P12_2_L10_12_RUN_ID, "p12-2-diamond-shelf-full-interrupt-010");
  assert.equal(P12_2_L10_12_OBSERVED_AT, "2026-10-05T13:56:42.000Z");
  assert.equal(P12_2_L10_12_PHASE, "full_resume");
  assert.equal(P12_2_L10_12_SOURCE_PACKET_FINGERPRINT, "a93b76b252ecb9b9ac063675fcc99b5c70ad5af9c40092b5c2d8574476d1f6d6");
  assert.equal(P12_2_L10_12_SOURCE_CHECKPOINT_REVISION, 3);
  assert.equal(P12_2_L10_12_SOURCE_CHECKPOINT_FINGERPRINT, "8ad8c571cc79492dbbbb2617f894addc2b7ccfa522c870dab189771b5e335a98");
  assert.equal(P12_2_L10_12_EXECUTION_PLAN_FINGERPRINT, "0818612ac8f35d5109cb4901442a0546630b9ca31a7ae6f24f77f8271db650aa");
});

test("P12.2-L10.12 contains only ten single SELECT statements", () => {
  assert.doesNotThrow(() => assertP122L1012QueryContract());
  assert.equal(P12_2_L10_12_QUERIES.length, 10);
  for (const query of P12_2_L10_12_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("P12.2-L10.12 proves durable resume completion and L10.11 dual lineage", () => {
  const byId = new Map(P12_2_L10_12_QUERIES.map((query) => [query.id, query.sql]));
  const source = byId.get("source_interruption_receipt") ?? "";
  const resume = byId.get("resume_completion_guard") ?? "";
  const lineage = byId.get("dual_lineage_guard") ?? "";
  const durable = byId.get("durable_completion_guard") ?? "";

  assert.match(source, /checkpointRevision/);
  assert.match(source, /checkpointFingerprint/);
  assert.match(source, /executionPlanFingerprint/);
  assert.match(resume, /receiptFingerprint/);
  assert.match(resume, /snapshot_fingerprint/);
  assert.match(resume, /wholeSiteCertified/);
  assert.match(lineage, /executionInventoryFingerprint/);
  assert.match(lineage, /inventoryFingerprint/);
  assert.match(lineage, /certified_complete_accounting/);
  assert.match(durable, /automaticRetryPerformed/);
  assert.match(durable, /first_party_crawl_completed_runs/);
  assert.match(durable, /first_party_crawl_incremental_receipts/);
});

test("P12.2-L10.12 fingerprints and authorization are deterministic", () => {
  assert.match(p122L1012QuerySetFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(p122L1012AuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L1012AuthorizationLiteral(),
    "AUTHORIZE:P12_2_L10_12_PACKET_012_READ_ONLY:" + p122L1012AuthorizationFingerprint(),
  );
});
