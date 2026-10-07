import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_17_EXECUTION_DEPLOYMENT_ID,
  P12_2_L10_17_EXECUTION_IMAGE,
  P12_2_L10_17_PACKET_FINGERPRINT,
  P12_2_L10_17_QUERIES,
  P12_2_L10_17_RUN_ID,
  assertP122L1017QueryContract,
  p122L1017AuthorizationFingerprint,
  p122L1017AuthorizationLiteral,
  p122L1017Capability,
  p122L1017QuerySetFingerprint,
} from "./p12-2-l10-17-packet-014-post-run-certification.js";

test("L10.17 binds exact Packet 014 execution identity", () => {
  assert.equal(
    P12_2_L10_17_PACKET_FINGERPRINT,
    "b853dcc4d1cbc383e5f9a1185085b6bc77ac42394a33db9c1380a6e511e7a560",
  );
  assert.equal(P12_2_L10_17_RUN_ID, "p12-2-diamond-shelf-post-0010-full-014");
  assert.equal(
    P12_2_L10_17_EXECUTION_IMAGE,
    "ghcr.io/intssere/seo-engine@sha256:afa1e3f7bc2b38b59b0fa36aa9eb4d0ed2a533122439d5d9647ed48ee63ecf93",
  );
  assert.equal(
    P12_2_L10_17_EXECUTION_DEPLOYMENT_ID,
    "30e3ab20-20ce-4d22-acd6-39d7a3575597",
  );
});

test("L10.17 is exactly ten SELECT-only queries", () => {
  assert.doesNotThrow(() => assertP122L1017QueryContract());
  assert.equal(P12_2_L10_17_QUERIES.length, 10);
  for (const query of P12_2_L10_17_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
  assert.match(p122L1017QuerySetFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(p122L1017AuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(
    p122L1017AuthorizationLiteral(),
    /^AUTHORIZE:P12_2_L10_17_PACKET_014_POST_RUN_READ_ONLY:[0-9a-f]{64}$/,
  );
});

test("L10.17 exposes exact post-0010 failure evidence and accounting state", () => {
  const all = P12_2_L10_17_QUERIES.map((query) => query.sql).join("\n");
  assert.match(all, /accounting_complete_uncertified/);
  assert.match(all, /clean_certified/);
  assert.match(all, /first_party_crawl_terminal_failure_events/);
  assert.match(all, /first_party_crawl_accounting_snapshots/);
  assert.match(all, /first_party_crawl_terminal_failure_recovery_receipts/);
  assert.match(all, /canonical_url/);
  assert.match(all, /terminal_failure_count/);
  assert.match(all, /wholeSiteCertified/);
  assert.match(all, /certified_complete_accounting/);
});

test("L10.17 requires terminal completion and forbids recovery evidence before recovery authorization", () => {
  const guard = P12_2_L10_17_QUERIES.find((query) => query.id === "terminal_outcome_guard")!;
  assert.match(guard.sql, /status='completed'/);
  assert.match(guard.sql, /invocationAttempt/);
  assert.match(guard.sql, /automaticRetryPerformed/);
  assert.match(guard.sql, /pendingUrls/);
  assert.match(guard.sql, /terminalFailures/);
  assert.match(guard.sql, /first_party_crawl_completed_runs/);
  assert.match(guard.sql, /first_party_crawl_terminal_failure_recovery_receipts/);
});

test("L10.17 grants no crawl, recovery, Railway, scheduler, provider or public-site authority", () => {
  const capability = p122L1017Capability();
  assert.equal(capability.queryCount, 10);
  assert.deepEqual(capability.allowedTerminalOutcomes, [
    "clean_certified",
    "accounting_complete_uncertified",
  ]);
  assert.equal(capability.attempts, 1);
  assert.equal(capability.retries, 0);
  assert.equal(capability.fallback, false);
  assert.equal(capability.sessionReadOnly, true);
  assert.equal(capability.crawlExecutionPossible, false);
  assert.equal(capability.recoveryExecutionPossible, false);
  assert.equal(capability.railwayMutationAuthorized, false);
  assert.equal(capability.providerOrPublicSiteWriteAuthorized, false);
  assert.equal(capability.schedulerWorkerActivationAuthorized, false);
});
