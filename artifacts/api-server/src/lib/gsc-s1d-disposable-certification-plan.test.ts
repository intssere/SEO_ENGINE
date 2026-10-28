import assert from "node:assert/strict";
import test from "node:test";
import {
  GSC_S1D_BASE_SHA, GSC_S1D_VERSION, GSC_S1D_TEST_CASES,
  assessGscS1dPacket, type GscS1dAssessment, type GscS1dCandidatePacket,
} from "./gsc-s1d-disposable-certification-plan.js";

function packet(): GscS1dCandidatePacket {
  return {
    version: GSC_S1D_VERSION,
    sourceCommit: GSC_S1D_BASE_SHA,
    targetClass: "new_disposable_local_postgres_only",
    hostClass: "loopback_only",
    databaseLabel: "gsc_s1d_disposable_only",
    dataClass: "synthetic_only",
    intendedStage: "offline_preparation_only",
    prohibitedProductionReferences: true,
    includesConnectionString: false,
    proposedCases: [...GSC_S1D_TEST_CASES],
  };
}
function assertNoAuthority(result: GscS1dAssessment) {
  assert.equal(result.kind, "untrusted_disposable_readiness_review_only");
  assert.deepEqual([
    result.realDatabaseIdentityVerified, result.postgresAtomicityVerified,
    result.databaseCreationAuthorized, result.databaseConnectionAuthorized,
    result.sqlExecutionAuthorized, result.productionDatabaseAuthorized,
    result.oauthConsentAuthorized, result.tokenExchangeAuthorized,
    result.credentialWriteAuthorized, result.providerReadAuthorized,
    result.deploymentAuthorized,
  ], Array.from({ length: 11 }, () => false));
}
function reject(input: unknown, finding?: string) {
  const result = assessGscS1dPacket(input);
  assert.equal(result.packetConformant, false);
  assertNoAuthority(result);
  if (finding) assert.ok(result.findings.includes(finding), JSON.stringify(result.findings));
}
test("syntactically complete plan remains completely nonauthorizing", () => {
  const result = assessGscS1dPacket(packet());
  assert.equal(result.packetConformant, true);
  assert.deepEqual(result.findings, []);
  assertNoAuthority(result);
});
test("missing source SHA or mismatched version fail closed", () => {
  reject({ ...packet(), sourceCommit: "0".repeat(40) }, "version_or_source_baseline_mismatch");
  reject({ ...packet(), version: "gsc_s1d_v2" }, "version_or_source_baseline_mismatch");
  const { sourceCommit: _drop, ...missing } = packet();
  reject(missing, "invalid_or_extra_packet_fields");
});
test("any Production, remote or ambiguous target class is rejected", () => {
  for (const patch of [
    { targetClass: "railway_production_postgres" }, { hostClass: "public_tcp_proxy" },
    { hostClass: "railway_private" }, { databaseLabel: "postgres" },
    { databaseLabel: "gsc_s1d_disposable_only_restore" },
  ]) reject({ ...packet(), ...patch }, "disposable_target_isolation_not_described");
});
test("any live intent, customer data or credential inclusion is rejected", () => {
  for (const patch of [
    { dataClass: "customer_data" }, { intendedStage: "run_sql" },
    { prohibitedProductionReferences: false }, { includesConnectionString: true },
  ]) reject({ ...packet(), ...patch }, "prohibited_data_or_live_execution_intent");
});
test("network URLs, raw SQL, secrets, flags and approval claims are extra fields", () => {
  for (const extra of [
    { DATABASE_URL: "postgres://hidden" }, { databaseUrl: "postgres://hidden" },
    { oauthConsentAuthorized: true }, { operatorApproved: true },
    { sql: "DROP TABLE important" }, { clientSecret: "secret" },
  ]) reject({ ...packet(), ...extra }, "invalid_or_extra_packet_fields");
});
test("exact twelve-case set is required independent of ordering", () => {
  assert.equal(GSC_S1D_TEST_CASES.length, 12);
  const reversed = { ...packet(), proposedCases: [...GSC_S1D_TEST_CASES].reverse() };
  assert.equal(assessGscS1dPacket(reversed).packetConformant, true);
  reject({ ...packet(), proposedCases: GSC_S1D_TEST_CASES.slice(1) }, "incomplete_or_untrusted_test_matrix");
  reject({ ...packet(), proposedCases: [...GSC_S1D_TEST_CASES.slice(0, -1), GSC_S1D_TEST_CASES[0]] }, "incomplete_or_untrusted_test_matrix");
  reject({ ...packet(), proposedCases: [...GSC_S1D_TEST_CASES.slice(0, -1), "live_token_exchange"] }, "incomplete_or_untrusted_test_matrix");
});
test("array extra symbol, hidden property or accessor is rejected", () => {
  const symbol = [...GSC_S1D_TEST_CASES];
  Object.defineProperty(symbol, Symbol("elevated"), { value: true });
  reject({ ...packet(), proposedCases: symbol }, "incomplete_or_untrusted_test_matrix");
  const hidden = [...GSC_S1D_TEST_CASES];
  Object.defineProperty(hidden, "secret", { value: "hidden", enumerable: false });
  reject({ ...packet(), proposedCases: hidden }, "incomplete_or_untrusted_test_matrix");
  const getter = [...GSC_S1D_TEST_CASES];
  let called = 0;
  Object.defineProperty(getter, "0", { enumerable: true, configurable: true,
    get() { called++; throw Error("untrusted callback"); },
  });
  reject({ ...packet(), proposedCases: getter }, "incomplete_or_untrusted_test_matrix");
  assert.equal(called, 0);
});
test("untrusted top-level accessor does not execute", () => {
  const value = { ...packet() };
  let calls = 0;
  Object.defineProperty(value, "sourceCommit", { enumerable: true, configurable: true,
    get() { calls++; throw Error("must not run"); },
  });
  reject(value, "invalid_or_extra_packet_fields");
  assert.equal(calls, 0);
});
test("own symbol, hidden field and inherited properties are denied", () => {
  reject({ ...packet(), [Symbol("grant")]: true }, "invalid_or_extra_packet_fields");
  const hidden = { ...packet() };
  Object.defineProperty(hidden, "approval", { value: true });
  reject(hidden, "invalid_or_extra_packet_fields");
  reject(Object.assign(Object.create({ elevated: true }), packet()), "invalid_or_extra_packet_fields");
  reject(new Date(), "invalid_or_extra_packet_fields");
});
test("revoked Proxies and nonobjects fail safely", () => {
  const v = Proxy.revocable(packet(), {});
  v.revoke();
  reject(v.proxy, "invalid_or_extra_packet_fields");
  for (const x of [null, undefined, "demo", [], 1, false]) reject(x);
});
test("hostile Proxy get accessors are not consulted for ordinary snapshot data", () => {
  let gets = 0;
  const p = new Proxy(packet(), {
    get() { gets++; throw new Error("forbidden direct property read"); },
  });
  assert.equal(assessGscS1dPacket(p).packetConformant, true);
  assert.equal(gets, 0);
  assertNoAuthority(assessGscS1dPacket(p));
});
test("all twelve scenario labels cover real database proof obligations, without asserting they passed", () => {
  const s = GSC_S1D_TEST_CASES.join(",");
  for (const term of [
    "two_connection", "row_lock_wait", "post_restart",
    "rollback", "duplicate_issue", "wrong_org_site", "privilege",
  ]) assert.ok(s.includes(term), term);
  assertNoAuthority(assessGscS1dPacket(packet()));
});
