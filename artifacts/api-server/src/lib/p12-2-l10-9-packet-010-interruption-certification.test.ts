import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_9_INTERRUPTION_REVISION,
  P12_2_L10_9_OBSERVED_AT,
  P12_2_L10_9_PACKET_FINGERPRINT,
  P12_2_L10_9_PHASE,
  P12_2_L10_9_QUERIES,
  P12_2_L10_9_RUN_ID,
  assertP122L109QueryContract,
  p122L109AuthorizationFingerprint,
  p122L109AuthorizationLiteral,
  p122L109QuerySetFingerprint,
} from "./p12-2-l10-9-packet-010-interruption-certification.js";

test("P12.2-L10.9 is bound to packet 010 full_interrupt revision 3", () => {
  assert.equal(P12_2_L10_9_PACKET_FINGERPRINT, "a93b76b252ecb9b9ac063675fcc99b5c70ad5af9c40092b5c2d8574476d1f6d6");
  assert.equal(P12_2_L10_9_RUN_ID, "p12-2-diamond-shelf-full-interrupt-010");
  assert.equal(P12_2_L10_9_OBSERVED_AT, "2026-10-05T09:22:00.000Z");
  assert.equal(P12_2_L10_9_PHASE, "full_interrupt");
  assert.equal(P12_2_L10_9_INTERRUPTION_REVISION, 3);
});

test("P12.2-L10.9 contains only eight single SELECT statements", () => {
  assert.doesNotThrow(() => assertP122L109QueryContract());
  assert.equal(P12_2_L10_9_QUERIES.length, 8);
  for (const query of P12_2_L10_9_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("P12.2-L10.9 certifies exact interruption and resume lineage", () => {
  const byId = new Map(P12_2_L10_9_QUERIES.map((query) => [query.id, query.sql]));
  const receipt = byId.get("invocation_receipt") ?? "";
  const checkpoint = byId.get("checkpoint_state") ?? "";
  const binding = byId.get("interruption_binding_guard") ?? "";
  const integrity = byId.get("checkpoint_integrity_guard") ?? "";
  const durable = byId.get("durable_interruption_guard") ?? "";

  assert.match(receipt, /checkpointRevision/);
  assert.match(receipt, /checkpointFingerprint/);
  assert.match(receipt, /executionPlanFingerprint/);
  assert.match(checkpoint, /completedBatchIds/);
  assert.match(checkpoint, /pendingCanonicalUrls/);
  assert.match(checkpoint, /wholeSiteCertified/);
  assert.match(binding, /intentional_interruption/);
  assert.match(binding, /checkpoint_revision=3/);
  assert.match(integrity, /first_party_full_site_crawl_checkpoint_v1/);
  assert.match(integrity, /networkExecutionEnabled/);
  assert.match(integrity, /providerWrites/);
  assert.match(durable, /automaticRetryPerformed/);
  assert.match(durable, /first_party_crawl_completed_runs/);
  assert.match(durable, /first_party_crawl_incremental_receipts/);
});

test("P12.2-L10.9 fingerprints and authorization are deterministic", () => {
  assert.match(p122L109QuerySetFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(p122L109AuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L109AuthorizationLiteral(),
    "AUTHORIZE:P12_2_L10_9_PACKET_010_READ_ONLY:" + p122L109AuthorizationFingerprint(),
  );
});
