import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_6_OBSERVED_AT,
  P12_2_L10_6_OTHER_POLICY_REASONS,
  P12_2_L10_6_PACKET_FINGERPRINT,
  P12_2_L10_6_PHASE,
  P12_2_L10_6_QUERIES,
  P12_2_L10_6_ROBOTS_REASONS,
  P12_2_L10_6_RUN_ID,
  assertP122L106QueryContract,
  p122L106AuthorizationFingerprint,
  p122L106AuthorizationLiteral,
  p122L106QuerySetFingerprint,
} from "./p12-2-l10-6-packet-008-other-policy-attribution-certification.js";

test("P12.2-L10.6 is bound to packet 008 and bounded_pilot", () => {
  assert.equal(P12_2_L10_6_PACKET_FINGERPRINT, "86531a870b9e0968a26366b56d9cfcc2baf15b3df33dacdfb2e2414b033380a7");
  assert.equal(P12_2_L10_6_RUN_ID, "p12-2-diamond-shelf-bounded-pilot-008");
  assert.equal(P12_2_L10_6_OBSERVED_AT, "2026-10-04T17:52:00.000Z");
  assert.equal(P12_2_L10_6_PHASE, "bounded_pilot");
});

test("P12.2-L10.6 contains only single SELECT statements", () => {
  assert.doesNotThrow(() => assertP122L106QueryContract());
  assert.equal(P12_2_L10_6_QUERIES.length, 10);
  for (const query of P12_2_L10_6_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("P12.2-L10.6 certifies closed robots and other-policy attribution with bounded persistence", () => {
  const byId = new Map(P12_2_L10_6_QUERIES.map((query) => [query.id, query.sql]));
  const state = byId.get("policy_attribution_state") ?? "";
  const reasonGuard = byId.get("robots_reason_guard") ?? "";
  const otherReasonGuard = byId.get("other_policy_reason_guard") ?? "";
  const durableGuard = byId.get("durable_attribution_guard") ?? "";
  const boundedGuard = byId.get("bounded_persistence_guard") ?? "";

  assert.match(state, /robotsPolicyRejections/);
  assert.match(state, /otherPolicyRejections/);
  assert.match(state, /otherPolicyRejectionReasons/);
  assert.match(state, /permanentHttp/);
  assert.match(state, /networkTimeout/);
  assert.match(state, /connectionReset/);
  assert.match(state, /transportUnavailable/);

  for (const reason of P12_2_L10_6_ROBOTS_REASONS) {
    assert.match(reasonGuard, new RegExp(reason));
  }
  assert.match(reasonGuard, /count\(DISTINCT/);
  assert.match(reasonGuard, /jsonb_array_elements/);
  assert.match(reasonGuard, /otherPolicyRejections/);
  for (const reason of P12_2_L10_6_OTHER_POLICY_REASONS) {
    assert.match(otherReasonGuard, new RegExp(reason));
  }
  assert.match(otherReasonGuard, /otherPolicyRejectionReasons/);
  assert.match(otherReasonGuard, /count\(DISTINCT/);
  assert.match(otherReasonGuard, /jsonb_array_elements/);
  assert.match(durableGuard, /terminalFailures/);
  assert.match(durableGuard, /first_party_crawl_completed_runs/);
  assert.match(boundedGuard, /NOT EXISTS/);
});

test("P12.2-L10.6 fingerprints and authorization are deterministic", () => {
  assert.match(p122L106QuerySetFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(p122L106AuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L106AuthorizationLiteral(),
    "AUTHORIZE:P12_2_L10_6_PACKET_007_READ_ONLY:" + p122L106AuthorizationFingerprint(),
  );
});
