import assert from "node:assert/strict";
import test from "node:test";
import {
  runP122L1AE5OneShot,
} from "./p12-2-l1a-e5-one-shot-operator-entrypoint.js";
import {
  p122L1AE2LiveAuthorizationLiteral,
} from "./p12-2-l1a-e2-psql-transport-plan.js";

const DATABASE_URL = "postgresql://user:secret@example.invalid:5432/db";

test("packages preflight, execution and outcome into one bounded receipt", async () => {
  let calls = 0;
  const receipt = await runP122L1AE5OneShot({
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

test("marks one-shot consumed on first executor invocation even if query 1 fails", async () => {
  let calls = 0;
  const receipt = await runP122L1AE5OneShot({
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
