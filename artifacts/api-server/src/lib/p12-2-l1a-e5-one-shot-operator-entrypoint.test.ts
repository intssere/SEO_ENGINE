import assert from "node:assert/strict";
import test from "node:test";
import {
  runP122L1AE5OneShot,
} from "./p12-2-l1a-e5-one-shot-operator-entrypoint.js";
import {
  p122L1AE2LiveAuthorizationLiteral,
} from "./p12-2-l1a-e2-psql-transport-plan.js";
import {
  P12_2_L1A_E4_BINDING,
} from "./p12-2-l1a-e4-execution-surface-audit-contract.js";

const DATABASE_URL = "postgresql://user:secret@example.invalid:5432/db";
const RUNTIME_BINDING = {
  projectId: P12_2_L1A_E4_BINDING.projectId,
  environmentId: P12_2_L1A_E4_BINDING.environmentId,
  postgresServiceId: P12_2_L1A_E4_BINDING.postgresServiceId,
};

test("packages preflight, execution and outcome into one bounded receipt", async () => {
  let calls = 0;
  const receipt = await runP122L1AE5OneShot({
    ...RUNTIME_BINDING,
    authorizationLiteral: p122L1AE2LiveAuthorizationLiteral(),
    databaseUrl: DATABASE_URL,
    psqlAvailable: true,
    databaseUrlPrinted: false,
    retriesConfigured: 0,
    fallbackTransportConfigured: false,
    executor: async () => {
      calls += 1;
      return { exitCode: 0, stdout: `row-${calls}`, stderr: "" };
    },
  });

  assert.equal(calls, 7);
  assert.equal(receipt.productionSqlAttemptConsumed, true);
  assert.equal(receipt.execution.completed, true);
  assert.equal(receipt.execution.queryReceipts.length, 7);
  assert.equal(receipt.outcome.completed, true);
  assert.equal(receipt.outcome.queryCountObserved, 7);
});

test("fails preflight before any executor invocation", async () => {
  let calls = 0;
  await assert.rejects(
    runP122L1AE5OneShot({
      ...RUNTIME_BINDING,
      authorizationLiteral: p122L1AE2LiveAuthorizationLiteral(),
      databaseUrl: DATABASE_URL,
      psqlAvailable: false,
      databaseUrlPrinted: false,
      retriesConfigured: 0,
      fallbackTransportConfigured: false,
      executor: async () => {
        calls += 1;
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    }),
    /p12_2_l1a_e4_psql_unavailable/,
  );
  assert.equal(calls, 0);
});

test("fails closed on any runtime Railway binding mismatch before executor invocation", async () => {
  const variants = [
    { ...RUNTIME_BINDING, projectId: "wrong-project" },
    { ...RUNTIME_BINDING, environmentId: "wrong-environment" },
    { ...RUNTIME_BINDING, postgresServiceId: "wrong-service" },
  ];

  for (const binding of variants) {
    let calls = 0;
    await assert.rejects(
      runP122L1AE5OneShot({
        ...binding,
        authorizationLiteral: p122L1AE2LiveAuthorizationLiteral(),
        databaseUrl: DATABASE_URL,
        psqlAvailable: true,
        databaseUrlPrinted: false,
        retriesConfigured: 0,
        fallbackTransportConfigured: false,
        executor: async () => {
          calls += 1;
          return { exitCode: 0, stdout: "", stderr: "" };
        },
      }),
      /p12_2_l1a_e4_binding_mismatch/,
    );
    assert.equal(calls, 0);
  }
});

test("marks one-shot consumed on first executor invocation even if query 1 fails", async () => {
  let calls = 0;
  const receipt = await runP122L1AE5OneShot({
    ...RUNTIME_BINDING,
    authorizationLiteral: p122L1AE2LiveAuthorizationLiteral(),
    databaseUrl: DATABASE_URL,
    psqlAvailable: true,
    databaseUrlPrinted: false,
    retriesConfigured: 0,
    fallbackTransportConfigured: false,
    executor: async () => {
      calls += 1;
      return { exitCode: 2, stdout: "", stderr: "failed" };
    },
  });

  assert.equal(calls, 1);
  assert.equal(receipt.productionSqlAttemptConsumed, true);
  assert.equal(receipt.execution.completed, false);
  assert.equal(receipt.execution.stoppedAtOrdinal, 1);
  assert.equal(receipt.outcome.queryCountObserved, 1);
});

test("does not serialize credential material in receipts", async () => {
  const receipt = await runP122L1AE5OneShot({
    ...RUNTIME_BINDING,
    authorizationLiteral: p122L1AE2LiveAuthorizationLiteral(),
    databaseUrl: DATABASE_URL,
    psqlAvailable: true,
    databaseUrlPrinted: false,
    retriesConfigured: 0,
    fallbackTransportConfigured: false,
    executor: async () => ({
      exitCode: 1,
      stdout: DATABASE_URL,
      stderr: DATABASE_URL,
    }),
  });

  const serialized = JSON.stringify(receipt);
  assert.equal(serialized.includes(DATABASE_URL), false);
  assert.match(serialized, /REDACTED_DATABASE_URL/);
});
