import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L1A_E6_ENV,
  runP122L1AE6DisposableRunner,
} from "./p12-2-l1a-e6-disposable-railway-runner.js";
import {
  P12_2_L1A_E4_BINDING,
} from "./p12-2-l1a-e4-execution-surface-audit-contract.js";
import {
  p122L1AE2LiveAuthorizationLiteral,
} from "./p12-2-l1a-e2-psql-transport-plan.js";

const DATABASE_URL = "postgresql://user:secret@example.invalid:5432/db";

function validEnv(): Record<string, string> {
  return {
    [P12_2_L1A_E6_ENV.projectId]: P12_2_L1A_E4_BINDING.projectId,
    [P12_2_L1A_E6_ENV.environmentId]: P12_2_L1A_E4_BINDING.environmentId,
    [P12_2_L1A_E6_ENV.postgresServiceId]: P12_2_L1A_E4_BINDING.postgresServiceId,
    [P12_2_L1A_E6_ENV.databaseUrl]: DATABASE_URL,
    [P12_2_L1A_E6_ENV.authorizationLiteral]: p122L1AE2LiveAuthorizationLiteral(),
  };
}

test("runs the canonical seven-query E5 flow from Railway runtime identity", async () => {
  let calls = 0;
  const receipt = await runP122L1AE6DisposableRunner({
    env: validEnv(),
    psqlAvailable: true,
    executor: async (input) => {
      calls += 1;
      assert.equal(input.executable, "psql");
      assert.equal(input.env.DATABASE_URL, DATABASE_URL);
      assert.equal(input.args.includes(DATABASE_URL), false);
      return { exitCode: 0, stdout: `row-${calls}`, stderr: "" };
    },
  });

  assert.equal(calls, 7);
  assert.equal(receipt.e5.execution.completed, true);
  assert.equal(receipt.e5.productionSqlAttemptConsumed, true);
});

test("missing Railway runtime identity fails before executor invocation", async () => {
  for (const key of [
    P12_2_L1A_E6_ENV.projectId,
    P12_2_L1A_E6_ENV.environmentId,
    P12_2_L1A_E6_ENV.postgresServiceId,
  ]) {
    const env = validEnv();
    delete env[key];
    let calls = 0;
    await assert.rejects(
      runP122L1AE6DisposableRunner({
        env,
        psqlAvailable: true,
        executor: async () => {
          calls += 1;
          return { exitCode: 0, stdout: "", stderr: "" };
        },
      }),
      /p12_2_l1a_e6_missing_env_/,
    );
    assert.equal(calls, 0);
  }
});

test("wrong Postgres runtime reference fails before executor invocation", async () => {
  const env = validEnv();
  env[P12_2_L1A_E6_ENV.postgresServiceId] = "wrong-postgres-service";
  let calls = 0;

  await assert.rejects(
    runP122L1AE6DisposableRunner({
      env,
      psqlAvailable: true,
      executor: async () => {
        calls += 1;
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    }),
    /p12_2_l1a_e4_binding_mismatch/,
  );

  assert.equal(calls, 0);
});

test("DATABASE_URL never appears in serialized runner receipt", async () => {
  const receipt = await runP122L1AE6DisposableRunner({
    env: validEnv(),
    psqlAvailable: true,
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
