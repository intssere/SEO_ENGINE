import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_4_OBSERVED_AT,
  P12_2_L10_4_PACKET_FINGERPRINT,
  P12_2_L10_4_PHASE,
  P12_2_L10_4_QUERIES,
  P12_2_L10_4_ROBOTS_REASONS,
  P12_2_L10_4_RUN_ID,
  assertP122L104QueryContract,
  p122L104AuthorizationFingerprint,
  p122L104AuthorizationLiteral,
  p122L104QuerySetFingerprint,
} from "./p12-2-l10-4-packet-007-robots-attribution-certification.js";

test("P12.2-L10.4 is bound to packet 007 and bounded_pilot", () => {
  assert.equal(P12_2_L10_4_PACKET_FINGERPRINT, "dffb4db56c41d024f97fef80fd37e2f93adeb260136cbcd9554fefe6c43706a1");
  assert.equal(P12_2_L10_4_RUN_ID, "p12-2-diamond-shelf-bounded-pilot-007");
  assert.equal(P12_2_L10_4_OBSERVED_AT, "2026-10-04T15:39:52.448Z");
  assert.equal(P12_2_L10_4_PHASE, "bounded_pilot");
});

test("P12.2-L10.4 contains only single SELECT statements", () => {
  assert.doesNotThrow(() => assertP122L104QueryContract());
  assert.equal(P12_2_L10_4_QUERIES.length, 9);
  for (const query of P12_2_L10_4_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("P12.2-L10.4 certifies closed robots attribution and bounded persistence", () => {
  const byId = new Map(P12_2_L10_4_QUERIES.map((query) => [query.id, query.sql]));
  const state = byId.get("robots_attribution_state") ?? "";
  const reasonGuard = byId.get("robots_reason_guard") ?? "";
  const durableGuard = byId.get("durable_attribution_guard") ?? "";
  const boundedGuard = byId.get("bounded_persistence_guard") ?? "";

  assert.match(state, /robotsPolicyRejections/);
  assert.match(state, /otherPolicyRejections/);
  assert.match(state, /permanentHttp/);
  assert.match(state, /networkTimeout/);
  assert.match(state, /connectionReset/);
  assert.match(state, /transportUnavailable/);

  for (const reason of P12_2_L10_4_ROBOTS_REASONS) {
    assert.match(reasonGuard, new RegExp(reason));
  }
  assert.match(reasonGuard, /count\(DISTINCT/);
  assert.match(reasonGuard, /jsonb_array_elements/);
  assert.match(reasonGuard, /otherPolicyRejections/);
  assert.match(durableGuard, /terminalFailures/);
  assert.match(durableGuard, /first_party_crawl_completed_runs/);
  assert.match(boundedGuard, /NOT EXISTS/);
});

test("P12.2-L10.4 fingerprints and authorization are deterministic", () => {
  assert.match(p122L104QuerySetFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(p122L104AuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L104AuthorizationLiteral(),
    "AUTHORIZE:P12_2_L10_4_PACKET_007_READ_ONLY:" + p122L104AuthorizationFingerprint(),
  );
});
