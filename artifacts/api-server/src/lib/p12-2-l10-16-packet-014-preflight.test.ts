import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_16_EXECUTION_IMAGE,
  P12_2_L10_16_EXECUTION_IMAGE_ATTESTATION_ID,
  P12_2_L10_16_EXECUTION_IMAGE_RELEASE_RUN_ID,
  P12_2_L10_16_EXPECTED_TABLE_COUNT,
  P12_2_L10_16_PACKET_014_FINGERPRINT,
  P12_2_L10_16_PACKET_014_RUN_ID,
  P12_2_L10_16_QUERIES,
  assertP122L1016QueryContract,
  p122L1016AuthorizationFingerprint,
  p122L1016AuthorizationLiteral,
  p122L1016Capability,
  p122L1016QuerySetFingerprint,
} from "./p12-2-l10-16-packet-014-preflight.js";

test("L10.16 binds the exact Packet 014 execution image and identity", () => {
  assert.equal(
    P12_2_L10_16_EXECUTION_IMAGE,
    "ghcr.io/intssere/seo-engine@sha256:afa1e3f7bc2b38b59b0fa36aa9eb4d0ed2a533122439d5d9647ed48ee63ecf93",
  );
  assert.equal(P12_2_L10_16_EXECUTION_IMAGE_RELEASE_RUN_ID, "37503596029");
  assert.equal(P12_2_L10_16_EXECUTION_IMAGE_ATTESTATION_ID, "53272234");
  assert.equal(P12_2_L10_16_PACKET_014_RUN_ID, "p12-2-diamond-shelf-post-0010-full-014");
  assert.equal(
    P12_2_L10_16_PACKET_014_FINGERPRINT,
    "b853dcc4d1cbc383e5f9a1185085b6bc77ac42394a33db9c1380a6e511e7a560",
  );
  assert.equal(P12_2_L10_16_EXPECTED_TABLE_COUNT, 41);
});

test("L10.16 query contract is exactly ten SELECT-only statements", () => {
  assert.doesNotThrow(() => assertP122L1016QueryContract());
  assert.equal(P12_2_L10_16_QUERIES.length, 10);
  for (const query of P12_2_L10_16_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
  assert.match(p122L1016QuerySetFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(p122L1016AuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(
    p122L1016AuthorizationLiteral(),
    /^AUTHORIZE:P12_2_L10_16_PACKET_014_PRE_EXEC_READ_ONLY:[0-9a-f]{64}$/,
  );
});

test("L10.16 proves the post-0010 schema and append-only recovery model", () => {
  const sql = P12_2_L10_16_QUERIES.map((query) => query.sql).join("\n");
  assert.match(sql, /BASE TABLE/);
  assert.match(sql, /first_party_crawl_l2_invocations/);
  assert.match(sql, /bounded_pilot/);
  assert.match(sql, /first_party_crawl_terminal_failure_events/);
  assert.match(sql, /first_party_crawl_accounting_snapshots/);
  assert.match(sql, /first_party_crawl_terminal_failure_recovery_receipts/);
  assert.match(sql, /reject_p12_2_l10_13b_immutable_mutation/);
  assert.match(sql, /trg_first_party_crawl_terminal_failure_events_immutable/);
  assert.match(sql, /trg_first_party_crawl_accounting_snapshots_immutable/);
  assert.match(sql, /trg_first_party_crawl_terminal_failure_recovery_receipts_immutable/);
  assert.match(sql, /policy_mutation_reservations/);
  assert.match(sql, /policy_mutation_dispatch_events/);
});

test("L10.16 preserves packet 013 evidence and fails closed if Packet 014 already exists", () => {
  const packet013 = P12_2_L10_16_QUERIES.find((query) => query.id === "packet_013_checkpoint_guard")!;
  const invocation013 = P12_2_L10_16_QUERIES.find((query) => query.id === "packet_013_invocation_guard")!;
  const packet014 = P12_2_L10_16_QUERIES.find((query) => query.id === "packet_014_absence_guard")!;

  assert.match(packet013.sql, /6c13e3bde165f5349f94f8139c35fd878631dc9e3a21a31c91e0936bd5eb4a99/);
  assert.match(packet013.sql, /terminalFailures/);
  assert.match(invocation013.sql, /4d3b401a688b4928f42cc31fdde4e57bbc9b390745157fa6cc867b21795559ea/);

  assert.match(packet014.sql, /b853dcc4d1cbc383e5f9a1185085b6bc77ac42394a33db9c1380a6e511e7a560/);
  assert.match(packet014.sql, /p12-2-diamond-shelf-post-0010-full-014/);
  assert.match(packet014.sql, /first_party_crawl_l2_invocations/);
  assert.match(packet014.sql, /first_party_crawl_checkpoints/);
  assert.match(packet014.sql, /first_party_crawl_completed_runs/);
  assert.match(packet014.sql, /first_party_crawl_terminal_failure_events/);
  assert.match(packet014.sql, /first_party_crawl_accounting_snapshots/);
  assert.match(packet014.sql, /first_party_crawl_terminal_failure_recovery_receipts/);
});

test("L10.16 grants no crawl, mutation, Railway or autonomous authority", () => {
  const capability = p122L1016Capability();
  assert.equal(capability.queryCount, 10);
  assert.equal(capability.attempts, 1);
  assert.equal(capability.retries, 0);
  assert.equal(capability.fallback, false);
  assert.equal(capability.sessionReadOnly, true);
  assert.equal(capability.liveCrawlAuthorized, false);
  assert.equal(capability.productionMutationAuthorized, false);
  assert.equal(capability.railwayMutationAuthorized, false);
  assert.equal(capability.schedulerWorkerActivationAuthorized, false);
  assert.equal(capability.providerOrPublicSiteWriteAuthorized, false);
});
