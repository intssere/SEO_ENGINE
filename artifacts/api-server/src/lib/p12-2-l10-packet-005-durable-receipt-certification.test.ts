import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_PACKET_FINGERPRINT,
  P12_2_L10_PHASE,
  P12_2_L10_QUERIES,
  P12_2_L10_RUN_ID,
  assertP122L10QueryContract,
  p122L10AuthorizationFingerprint,
  p122L10AuthorizationLiteral,
  p122L10QuerySetFingerprint,
} from "./p12-2-l10-packet-005-durable-receipt-certification.js";

test("P12.2-L10 is bound to packet 005 and bounded_pilot", () => {
  assert.equal(P12_2_L10_PACKET_FINGERPRINT, "669a9120f744e3470d1f106d7a094b414015d25b5da8f37ac2864765f4254f85");
  assert.equal(P12_2_L10_RUN_ID, "p12-2-diamond-shelf-bounded-pilot-005");
  assert.equal(P12_2_L10_PHASE, "bounded_pilot");
});

test("P12.2-L10 contains only single SELECT statements", () => {
  assert.doesNotThrow(() => assertP122L10QueryContract());
  assert.equal(P12_2_L10_QUERIES.length, 7);
  for (const query of P12_2_L10_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("P12.2-L10 binds durable invocation, checkpoint, and no completed whole-site run", () => {
  const byId = new Map(P12_2_L10_QUERIES.map((query) => [query.id, query.sql]));
  assert.match(byId.get("invocation_receipt") ?? "", /first_party_crawl_l2_invocations/);
  assert.match(byId.get("checkpoint_state") ?? "", /first_party_crawl_checkpoints/);
  assert.match(byId.get("completed_run_state") ?? "", /first_party_crawl_completed_runs/);
  assert.match(byId.get("bounded_persistence_guard") ?? "", /NOT EXISTS/);
  assert.match(byId.get("durable_completion_guard") ?? "", /status='completed'/);
});

test("P12.2-L10 fingerprints and authorization are deterministic", () => {
  assert.match(p122L10QuerySetFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(p122L10AuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L10AuthorizationLiteral(),
    "AUTHORIZE:P12_2_L10_PACKET_005_READ_ONLY:" + p122L10AuthorizationFingerprint(),
  );
});
