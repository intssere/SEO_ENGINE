import test from "node:test";
import assert from "node:assert/strict";
import { executionStateFingerprint } from "./execution-foundation.js";
import { verifyTask53RollbackPropagation } from "./task53-rollback-propagation.js";
import type { Task53ProviderState, Task53StorefrontVerification } from "./task53-production-pilot.js";

const resource = { kind: "collection" as const, gid: "gid://shopify/Collection/335423963335" };
const expectedFingerprint = executionStateFingerprint("meta_description", null);

function provider(value: string | null, requestId: string): Task53ProviderState {
  return {
    resource,
    field: "meta_description",
    value,
    fingerprint: executionStateFingerprint("meta_description", value),
    seoTitle: null,
    seoDescription: value,
    providerRequestId: requestId,
  };
}

function storefront(value: string | null, ok: boolean): Task53StorefrontVerification {
  return {
    ok,
    statusCode: 200,
    expectedValue: null,
    observedValue: value,
    expectedFingerprint,
    observedFingerprint: executionStateFingerprint("meta_description", value),
    errorCategory: ok ? null : "storefront_state_mismatch",
  };
}

test("rollback propagation verifier retries read-only checks until provider and storefront converge", async () => {
  let attempt = 0;
  const slept: number[] = [];
  const result = await verifyTask53RollbackPropagation({
    expectedProviderFingerprint: expectedFingerprint,
    delaysMs: [0, 10, 20],
    sleep: async (ms) => { slept.push(ms); },
    readProvider: async () => provider(null, `provider-${attempt + 1}`),
    verifyStorefront: async () => {
      attempt += 1;
      return attempt < 3 ? storefront("stale description", false) : storefront(null, true);
    },
  });

  assert.equal(result.verified, true);
  assert.equal(result.providerVerified, true);
  assert.equal(result.storefrontVerified, true);
  assert.equal(result.attemptCount, 3);
  assert.equal(result.totalDelayMs, 30);
  assert.deepEqual(slept, [10, 20]);
  assert.equal(result.attempts[0]?.storefrontVerified, false);
  assert.equal(result.attempts[2]?.storefrontVerified, true);
});

test("rollback propagation verifier fails closed after the bounded schedule without issuing writes", async () => {
  let providerReads = 0;
  let storefrontReads = 0;
  const result = await verifyTask53RollbackPropagation({
    expectedProviderFingerprint: expectedFingerprint,
    delaysMs: [0, 1, 2],
    sleep: async () => undefined,
    readProvider: async () => {
      providerReads += 1;
      return provider(null, `provider-${providerReads}`);
    },
    verifyStorefront: async () => {
      storefrontReads += 1;
      return storefront("still stale", false);
    },
  });

  assert.equal(result.verified, false);
  assert.equal(result.providerVerified, true);
  assert.equal(result.storefrontVerified, false);
  assert.equal(result.attemptCount, 3);
  assert.equal(providerReads, 3);
  assert.equal(storefrontReads, 3);
  assert.equal(result.attempts.every((row) => row.providerVerified), true);
});

test("rollback propagation verifier also tolerates delayed provider visibility", async () => {
  let attempt = 0;
  const result = await verifyTask53RollbackPropagation({
    expectedProviderFingerprint: expectedFingerprint,
    delaysMs: [0, 1],
    sleep: async () => undefined,
    readProvider: async () => {
      attempt += 1;
      return attempt === 1 ? provider("stale provider value", "provider-1") : provider(null, "provider-2");
    },
    verifyStorefront: async () => storefront(null, true),
  });

  assert.equal(result.verified, true);
  assert.equal(result.attemptCount, 2);
  assert.equal(result.providerState?.value, null);
});
