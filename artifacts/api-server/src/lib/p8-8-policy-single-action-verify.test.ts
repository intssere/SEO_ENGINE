import assert from "node:assert/strict";
import test from "node:test";
import {
  verifyP88W07IndependentState,
} from "./p8-8-policy-single-action-verify.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

test("W07 independent verification requires exact provider and storefront after-state", async () => {
  const f = buildP88W07TestFixture();
  const expected = f.lineage.w02Materialization.after.value;
  const result = await verifyP88W07IndependentState({
    purpose: "after",
    target: f.lineage.w02Materialization.target,
    expectedValue: expected,
    expectedFingerprint: f.lineage.w02Materialization.after.fingerprint,
    dependencies: {
      readProvider: async () => ({
        status: "observed",
        resourceGid: f.lineage.w02Materialization.target.resourceGid,
        field: "meta_description",
        rawValue: expected,
        requestId: "provider-1",
        errorCategory: null,
      }),
      readStorefront: async () => ({
        status: "observed",
        targetUrl: f.lineage.w02Materialization.target.targetUrl,
        field: "meta_description",
        rawValue: expected,
        statusCode: 200,
        errorCategory: null,
      }),
    },
  });
  assert.equal(result.status, "verified");
  assert.equal(result.providerVerified, true);
  assert.equal(result.storefrontVerified, true);
  assert.equal(result.provider.exactFingerprintMatch, true);
  assert.equal(result.providerWritePerformed, false);
  assert.equal(result.databaseMutationPerformed, false);
});

test("W07 provider byte drift fails even when visible text is nearly equivalent", async () => {
  const f = buildP88W07TestFixture();
  const expected = f.lineage.w02Materialization.after.value;
  const drift = (expected ?? "").replace("  ", " ");
  const result = await verifyP88W07IndependentState({
    purpose: "after",
    target: f.lineage.w02Materialization.target,
    expectedValue: expected,
    expectedFingerprint: f.lineage.w02Materialization.after.fingerprint,
    dependencies: {
      readProvider: async () => ({
        status: "observed",
        resourceGid: f.lineage.w02Materialization.target.resourceGid,
        field: "meta_description",
        rawValue: drift,
        requestId: "provider-2",
        errorCategory: null,
      }),
      readStorefront: async () => ({
        status: "observed",
        targetUrl: f.lineage.w02Materialization.target.targetUrl,
        field: "meta_description",
        rawValue: expected,
        statusCode: 200,
        errorCategory: null,
      }),
    },
  });
  assert.equal(result.status, "failed");
  assert.ok(result.failureCategories.includes("provider_exact_value_mismatch"));
  assert.ok(result.failureCategories.includes("provider_w02_fingerprint_mismatch"));
});

test("W07 storefront mismatch prevents success even when provider is exact", async () => {
  const f = buildP88W07TestFixture();
  const expected = f.lineage.w02Materialization.after.value;
  const result = await verifyP88W07IndependentState({
    purpose: "after",
    target: f.lineage.w02Materialization.target,
    expectedValue: expected,
    expectedFingerprint: f.lineage.w02Materialization.after.fingerprint,
    dependencies: {
      readProvider: async () => ({
        status: "observed",
        resourceGid: f.lineage.w02Materialization.target.resourceGid,
        field: "meta_description",
        rawValue: expected,
        requestId: "provider-3",
        errorCategory: null,
      }),
      readStorefront: async () => ({
        status: "observed",
        targetUrl: f.lineage.w02Materialization.target.targetUrl,
        field: "meta_description",
        rawValue: "stale storefront",
        statusCode: 200,
        errorCategory: null,
      }),
    },
  });
  assert.equal(result.status, "failed");
  assert.equal(result.providerVerified, true);
  assert.equal(result.storefrontVerified, false);
  assert.ok(result.failureCategories.includes("storefront_exact_value_mismatch"));
});

test("W07 unavailable verification never becomes success", async () => {
  const f = buildP88W07TestFixture();
  const result = await verifyP88W07IndependentState({
    purpose: "before",
    target: f.lineage.w02Materialization.target,
    expectedValue: f.lineage.w02Materialization.before.value,
    expectedFingerprint: f.lineage.w02Materialization.before.fingerprint,
    dependencies: {
      readProvider: async () => ({
        status: "unavailable",
        resourceGid: f.lineage.w02Materialization.target.resourceGid,
        field: "meta_description",
        rawValue: null,
        requestId: null,
        errorCategory: "provider_network_unavailable",
      }),
      readStorefront: async () => ({
        status: "observed",
        targetUrl: f.lineage.w02Materialization.target.targetUrl,
        field: "meta_description",
        rawValue: f.lineage.w02Materialization.before.value,
        statusCode: 200,
        errorCategory: null,
      }),
    },
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.providerVerified, false);
});
