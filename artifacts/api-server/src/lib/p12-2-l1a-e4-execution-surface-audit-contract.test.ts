import assert from "node:assert/strict";
import test from "node:test";
import {
  buildP122L1AE4OutcomeReceipt,
  certifyP122L1AE4Preflight,
  P12_2_L1A_E4_BINDING,
} from "./p12-2-l1a-e4-execution-surface-audit-contract.js";
import { p122L1AE2LiveAuthorizationLiteral } from "./p12-2-l1a-e2-psql-transport-plan.js";

const valid = {
  ...P12_2_L1A_E4_BINDING,
  psqlAvailable: true,
  databaseUrlInjected: true,
  databaseUrlPrinted: false,
  retriesConfigured: 0,
  fallbackTransportConfigured: false,
  authorizationLiteral: p122L1AE2LiveAuthorizationLiteral(),
};

test("certifies only the exact execution surface", () => {
  const receipt = certifyP122L1AE4Preflight(valid);
  assert.equal(receipt.eligible, true);
  assert.equal(receipt.oneAttemptOnly, true);
  assert.equal(receipt.retries, 0);
  assert.equal(receipt.fallbackTransportAllowed, false);
  assert.equal(receipt.credentialMaterialRecorded, false);
  assert.match(receipt.fingerprint, /^[0-9a-f]{64}$/);
});

test("fails closed on binding, credential, retry or fallback drift", () => {
  const variants = [
    { ...valid, projectId: "wrong" },
    { ...valid, environmentId: "wrong" },
    { ...valid, postgresServiceId: "wrong" },
    { ...valid, psqlAvailable: false },
    { ...valid, databaseUrlInjected: false },
    { ...valid, databaseUrlPrinted: true },
    { ...valid, retriesConfigured: 1 },
    { ...valid, fallbackTransportConfigured: true },
    { ...valid, authorizationLiteral: "wrong" },
  ];
  for (const variant of variants) {
    assert.throws(() => certifyP122L1AE4Preflight(variant as typeof valid));
  }
});

test("builds deterministic sanitized outcome receipt", () => {
  const preflight = certifyP122L1AE4Preflight(valid);
  const e3 = {
    version: "p12-2-l1a-e3-credential-runner-contract-v1" as const,
    querySetFingerprint: "6104ada21e043706664ca76b139d08338f637db98becbf66ca34113ce4f64d79",
    authorizationLiteral: p122L1AE2LiveAuthorizationLiteral(),
    completed: true,
    stoppedAtOrdinal: null,
    queryReceipts: Array.from({ length: 7 }, (_, i) => ({
      ordinal: i + 1,
      queryId: `q${i + 1}`,
      exitCode: 0,
      stdout: "sanitized",
      stderr: "",
    })),
    attempts: 1 as const,
    retries: 0 as const,
    fallbackTransportUsed: false as const,
    credentialMaterialReturned: false as const,
  };

  const a = buildP122L1AE4OutcomeReceipt(preflight, e3);
  const b = buildP122L1AE4OutcomeReceipt(preflight, e3);
  assert.deepEqual(a, b);
  assert.equal(a.queryCountObserved, 7);
  assert.equal(a.credentialMaterialRecorded, false);
  assert.match(a.outcomeFingerprint, /^[0-9a-f]{64}$/);
});
