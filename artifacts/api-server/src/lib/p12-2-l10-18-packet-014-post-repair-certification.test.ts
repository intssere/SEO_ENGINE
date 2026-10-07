import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_18_POST_REPAIR_CERT_VERSION,
  P12_2_L10_18_POST_REPAIR_QUERIES,
  assertP122L1018PostRepairQueryContract,
  p122L1018PostRepairAuthorizationFingerprint,
  p122L1018PostRepairAuthorizationLiteral,
  p122L1018PostRepairCapability,
  p122L1018PostRepairQuerySetFingerprint,
} from "./p12-2-l10-18-packet-014-post-repair-certification.js";

test("L10.18 post-repair certification is ten exact SELECT-only queries", () => {
  assert.equal(P12_2_L10_18_POST_REPAIR_QUERIES.length, 10);
  assert.doesNotThrow(() => assertP122L1018PostRepairQueryContract());
  assert.match(p122L1018PostRepairQuerySetFingerprint(), /^[0-9a-f]{64}$/);
  for (const query of P12_2_L10_18_POST_REPAIR_QUERIES) {
    assert.match(query.sql.trim(), /^SELECT\b/i);
    assert.equal(query.sql.includes(";"), false);
  }
});

test("L10.18 post-repair authorization is bound to the exact repair deployment", () => {
  const deployment = "12345678-1234-4abc-8def-1234567890ab";
  const other = "12345678-1234-4abc-8def-1234567890ac";
  assert.match(p122L1018PostRepairAuthorizationFingerprint(deployment), /^[0-9a-f]{64}$/);
  assert.notEqual(
    p122L1018PostRepairAuthorizationFingerprint(deployment),
    p122L1018PostRepairAuthorizationFingerprint(other),
  );
  assert.equal(
    p122L1018PostRepairAuthorizationLiteral(deployment),
    "AUTHORIZE:P12_2_L10_18_PACKET_014_POST_REPAIR_READ_ONLY:" +
      p122L1018PostRepairAuthorizationFingerprint(deployment),
  );
  assert.throws(
    () => p122L1018PostRepairAuthorizationFingerprint("not-a-deployment-id"),
    /p12_2_l10_18_repair_deployment_id_invalid/,
  );
});

test("L10.18 post-repair capability remains read-only and non-executing", () => {
  const capability = p122L1018PostRepairCapability();
  assert.equal(capability.version, P12_2_L10_18_POST_REPAIR_CERT_VERSION);
  assert.equal(capability.queryCount, 10);
  assert.equal(capability.sessionReadOnly, true);
  assert.equal(capability.networkRequests, false);
  assert.equal(capability.crawlExecution, false);
  assert.equal(capability.recoveryExecution, false);
  assert.equal(capability.databaseMutation, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
});
