import assert from "node:assert/strict";
import test from "node:test";
import {
  assertP122L1AE2Plan,
  buildP122L1AE2Plan,
  P12_2_L1A_E11_AUTHORIZATION_GENERATION,
  p122L1AE2LiveAuthorizationFingerprint,
  p122L1AE2LiveAuthorizationLiteral,
} from "./p12-2-l1a-e2-psql-transport-plan.js";
import {
  P12_2_L1A_E1_QUERIES,
  P12_2_L1A_E1_SITE_ID,
  p122L1AE1QuerySetFingerprint,
} from "./p12-2-l1a-e1-readonly-query-contract.js";

test("builds exactly seven non-executing psql command descriptors", () => {
  const plan = buildP122L1AE2Plan();
  assert.doesNotThrow(() => assertP122L1AE2Plan(plan));
  assert.equal(plan.commands.length, 7);
  assert.equal(plan.commandCount, 7);
  assert.equal(plan.oneAttemptOnly, true);
  assert.equal(plan.retries, 0);
  assert.equal(plan.fallbackTransportAllowed, false);
  assert.equal(plan.readsCredentials, false);
  assert.equal(plan.executesProcesses, false);
});

test("preserves E1 query order and content", () => {
  const plan = buildP122L1AE2Plan();
  plan.commands.forEach((command, index) => {
    const source = P12_2_L1A_E1_QUERIES[index]!;
    assert.equal(command.ordinal, index + 1);
    assert.equal(command.queryId, source.id);
    assert.equal(command.executable, "psql");
    assert.deepEqual(command.args.slice(0, 6), [
      "--no-psqlrc",
      "--set",
      "ON_ERROR_STOP=1",
      "--tuples-only",
      "--csv",
      "--command",
    ]);
  });
});

test("renders only the approved site parameter into the final SELECT", () => {
  const plan = buildP122L1AE2Plan();
  const final = plan.commands[6]!.args[6]!;
  assert.equal(
    final,
    `SELECT id::text AS id, canonical_origin FROM public.sites WHERE id = '${P12_2_L1A_E1_SITE_ID}'::uuid`,
  );
  assert.equal(final.includes("$1"), false);
});

test("contains no connection value or credential material", () => {
  const serialized = JSON.stringify(buildP122L1AE2Plan());
  assert.equal(serialized.includes("postgres://"), false);
  assert.equal(serialized.includes("postgresql://"), false);
  assert.equal(serialized.includes("password"), false);
});

test("live authorization literal binds the certified E1 fingerprint and fresh E11 generation", () => {
  assert.equal(
    P12_2_L1A_E11_AUTHORIZATION_GENERATION,
    "attempt-2-after-e9-transport-repair",
  );
  assert.equal(
    p122L1AE2LiveAuthorizationFingerprint(),
    "744498635c3a55b0accf4eaefe25d81a43e14b501b6e4eb0045abf6f69a3509f",
  );
  assert.equal(
    p122L1AE2LiveAuthorizationLiteral(),
    "AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT_V2:744498635c3a55b0accf4eaefe25d81a43e14b501b6e4eb0045abf6f69a3509f",
  );
  assert.notEqual(
    p122L1AE2LiveAuthorizationLiteral(),
    `AUTHORIZE:P12_2_L1A_PSQL_ONE_SHOT:${p122L1AE1QuerySetFingerprint()}`,
  );
});
