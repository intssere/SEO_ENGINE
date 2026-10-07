import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_19_PREFLIGHT_QUERIES,
  P12_2_L10_19_PREFLIGHT_VERSION,
  assertP122L1019PreflightQueryContract,
  p122L1019PreflightAuthorizationFingerprint,
  p122L1019PreflightAuthorizationLiteral,
  p122L1019PreflightCapability,
  p122L1019PreflightQuerySetFingerprint,
} from "./p12-2-l10-19-packet-014-preflight.js";

test("L10.19 preflight is ten exact SELECT-only queries", () => {
  assert.equal(P12_2_L10_19_PREFLIGHT_QUERIES.length, 10);
  assert.doesNotThrow(() => assertP122L1019PreflightQueryContract());
  assert.match(p122L1019PreflightQuerySetFingerprint(), /^[0-9a-f]{64}$/);
  for (const query of P12_2_L10_19_PREFLIGHT_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("L10.19 preflight authorization is deterministic", () => {
  assert.match(p122L1019PreflightAuthorizationFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L1019PreflightAuthorizationLiteral(),
    "AUTHORIZE:P12_2_L10_19_PACKET_014_PRE_EXEC_READ_ONLY:" +
      p122L1019PreflightAuthorizationFingerprint(),
  );
});

test("L10.19 preflight capability is read-only and absence-specific", () => {
  const capability = p122L1019PreflightCapability();
  assert.equal(capability.version, P12_2_L10_19_PREFLIGHT_VERSION);
  assert.equal(capability.queryCount, 10);
  assert.deepEqual(capability.historicalAbsenceHttpStatuses, [404, 410]);
  assert.equal(capability.sessionReadOnly, true);
  assert.equal(capability.migrationExecution, false);
  assert.equal(capability.liveNetworkReads, false);
  assert.equal(capability.databaseMutation, false);
  assert.equal(capability.crawlExecution, false);
  assert.equal(capability.recoveryExecution, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
});
