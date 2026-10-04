import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_2_PACKET_FINGERPRINT,
  P12_2_L10_2_PHASE,
  P12_2_L10_2_QUERIES,
  P12_2_L10_2_RUN_ID,
  assertP122L102QueryContract,
  p122L102AuthorizationFingerprint,
  p122L102AuthorizationLiteral,
  p122L102QuerySetFingerprint,
} from "./p12-2-l10-2-packet-006-durable-attribution-certification.js";

test("P12.2-L10.2 is bound to packet 006 and bounded_pilot", () => {
  assert.equal(P12_2_L10_2_PACKET_FINGERPRINT, "f258a3b850c9c62437ba420838cbc49d325e684f9db13a3d76e09df9b6501947");
  assert.equal(P12_2_L10_2_RUN_ID, "p12-2-diamond-shelf-bounded-pilot-006");
  assert.equal(P12_2_L10_2_PHASE, "bounded_pilot");
});

test("P12.2-L10.2 contains only single SELECT statements", () => {
  assert.doesNotThrow(() => assertP122L102QueryContract());
  assert.equal(P12_2_L10_2_QUERIES.length, 8);
  for (const query of P12_2_L10_2_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("P12.2-L10.2 certifies durable failure attribution", () => {
  const byId = new Map(P12_2_L10_2_QUERIES.map((query) => [query.id, query.sql]));
  assert.match(byId.get("failure_attribution_state") ?? "", /boundedPilotFailureAttribution/);
  assert.match(byId.get("failure_attribution_state") ?? "", /permanentHttp/);
  assert.match(byId.get("failure_attribution_state") ?? "", /networkTimeout/);
  assert.match(byId.get("failure_attribution_state") ?? "", /connectionReset/);
  assert.match(byId.get("failure_attribution_state") ?? "", /transportUnavailable/);
  assert.match(byId.get("durable_attribution_guard") ?? "", /jsonb_array_elements/);
  assert.match(byId.get("durable_attribution_guard") ?? "", /terminalFailures/);
  assert.match(byId.get("bounded_persistence_guard") ?? "", /NOT EXISTS/);
});

test("P12.2-L10.2 fingerprints and authorization are deterministic", () => {
  assert.match(p122L102QuerySetFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(p122L102AuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L102AuthorizationLiteral(),
    "AUTHORIZE:P12_2_L10_2_PACKET_006_READ_ONLY:" + p122L102AuthorizationFingerprint(),
  );
});
