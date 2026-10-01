import assert from "node:assert/strict";
import test from "node:test";
import {
  runP122L1AE3OneShot,
  type P122L1AE3ExecInput,
} from "./p12-2-l1a-e3-credential-runner-contract.js";
import {
  buildP122L1AE2Plan,
  p122L1AE2LiveAuthorizationLiteral,
} from "./p12-2-l1a-e2-psql-transport-plan.js";

const DATABASE_URL = "postgresql://user:secret@example.invalid:5432/db";

test("executes exactly seven canonical commands once in order", async () => {
  const seen: P122L1AE3ExecInput[] = [];
  const receipt = await runP122L1AE3OneShot({
    authorizationLiteral: p122L1AE2LiveAuthorizationLiteral(),
    databaseUrl: DATABASE_URL,
    executor: async (input) => {
      seen.push(input);
      return { exitCode: 0, stdout: "ok", stderr: "" };
    },
  });

  const plan = buildP122L1AE2Plan();
  assert.equal(receipt.completed, true);
  assert.equal(receipt.queryReceipts.length, 7);
  assert.equal(seen.length, 7);
  assert.equal(receipt.attempts, 1);
  assert.equal(receipt.retries, 0);
  assert.equal(receipt.fallbackTransportUsed, false);
  seen.forEach((input, index) => {
    assert.equal(input.executable, "psql");
    assert.deepEqual(input.args, plan.commands[index]!.args);
    assert.equal(input.env.DATABASE_URL, DATABASE_URL);
  });
});

test("fails closed on authorization mismatch before executor invocation", async () => {
  let calls = 0;
  await assert.rejects(
    runP122L1AE3OneShot({
      authorizationLiteral: "AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT:wrong",
      databaseUrl: DATABASE_URL,
      executor: async () => {
        calls += 1;
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    }),
    /p12_2_l1a_e3_authorization_mismatch/,
  );
  assert.equal(calls, 0);
});

test("stops on first nonzero result and does not retry", async () => {
  let calls = 0;
  const receipt = await runP122L1AE3OneShot({
    authorizationLiteral: p122L1AE2LiveAuthorizationLiteral(),
    databaseUrl: DATABASE_URL,
    executor: async () => {
      calls += 1;
      return calls === 3
        ? { exitCode: 2, stdout: "", stderr: "failed" }
        : { exitCode: 0, stdout: "ok", stderr: "" };
    },
  });
  assert.equal(receipt.completed, false);
  assert.equal(receipt.stoppedAtOrdinal, 3);
  assert.equal(calls, 3);
  assert.equal(receipt.retries, 0);
});

test("redacts database URL from captured output", async () => {
  const receipt = await runP122L1AE3OneShot({
    authorizationLiteral: p122L1AE2LiveAuthorizationLiteral(),
    databaseUrl: DATABASE_URL,
    executor: async () => ({
      exitCode: 1,
      stdout: `prefix ${DATABASE_URL} suffix`,
      stderr: DATABASE_URL,
    }),
  });
  const serialized = JSON.stringify(receipt);
  assert.equal(serialized.includes(DATABASE_URL), false);
  assert.match(serialized, /REDACTED_DATABASE_URL/);
});

test("rejects missing or non-postgres connection values", async () => {
  for (const databaseUrl of ["", "https://example.invalid"]) {
    await assert.rejects(
      runP122L1AE3OneShot({
        authorizationLiteral: p122L1AE2LiveAuthorizationLiteral(),
        databaseUrl,
        executor: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
      }),
      /p12_2_l1a_e3_database_url_/,
    );
  }
});
