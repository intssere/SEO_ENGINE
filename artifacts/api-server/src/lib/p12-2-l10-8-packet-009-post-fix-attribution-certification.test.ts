import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_8_OBSERVED_AT,
  P12_2_L10_8_OTHER_POLICY_REASONS,
  P12_2_L10_8_PACKET_FINGERPRINT,
  P12_2_L10_8_PHASE,
  P12_2_L10_8_QUERIES,
  P12_2_L10_8_ROBOTS_REASONS,
  P12_2_L10_8_RUN_ID,
  assertP122L108QueryContract,
  p122L108AuthorizationFingerprint,
  p122L108AuthorizationLiteral,
  p122L108QuerySetFingerprint,
} from "./p12-2-l10-8-packet-009-post-fix-attribution-certification.js";

test("P12.2-L10.8 is bound to packet 009 and bounded_pilot", () => {
  assert.equal(P12_2_L10_8_PACKET_FINGERPRINT, "3f8197a30fea0b17e0d5b765cdbed7cd5dec447b00fe01b87c066e7d6303a342");
  assert.equal(P12_2_L10_8_RUN_ID, "p12-2-diamond-shelf-bounded-pilot-009");
  assert.equal(P12_2_L10_8_OBSERVED_AT, "2026-10-05T08:27:00.000Z");
  assert.equal(P12_2_L10_8_PHASE, "bounded_pilot");
});

test("P12.2-L10.8 contains only single SELECT statements", () => {
  assert.doesNotThrow(() => assertP122L108QueryContract());
  assert.equal(P12_2_L10_8_QUERIES.length, 10);
  for (const query of P12_2_L10_8_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("P12.2-L10.8 certifies packet 009 post-fix attribution with bounded persistence", () => {
  const byId = new Map(P12_2_L10_8_QUERIES.map((query) => [query.id, query.sql]));
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

  for (const reason of P12_2_L10_8_ROBOTS_REASONS) {
    assert.match(reasonGuard, new RegExp(reason));
  }
  assert.match(reasonGuard, /count\(DISTINCT/);
  assert.match(reasonGuard, /jsonb_array_elements/);
  assert.match(reasonGuard, /otherPolicyRejections/);
  for (const reason of P12_2_L10_8_OTHER_POLICY_REASONS) {
    assert.match(otherReasonGuard, new RegExp(reason));
  }
  assert.match(otherReasonGuard, /otherPolicyRejectionReasons/);
  assert.match(otherReasonGuard, /count\(DISTINCT/);
  assert.match(otherReasonGuard, /jsonb_array_elements/);
  assert.match(durableGuard, /terminalFailures/);
  assert.match(durableGuard, /first_party_crawl_completed_runs/);
  assert.match(boundedGuard, /NOT EXISTS/);
});

test("P12.2-L10.8 fingerprints and authorization are deterministic", () => {
  assert.match(p122L108QuerySetFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(p122L108AuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L108AuthorizationLiteral(),
    "AUTHORIZE:P12_2_L10_8_PACKET_008_READ_ONLY:" + p122L108AuthorizationFingerprint(),
  );
});
