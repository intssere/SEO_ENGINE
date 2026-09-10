import test from "node:test";
import assert from "node:assert/strict";
import { readOnlyConfigurationReady, validateDiamondShelfReadOnlyConnections } from "./index.js";

test("valid Diamond Shelf read-only configuration is ready for live probes", () => {
  const checks = validateDiamondShelfReadOnlyConnections({
    shopDomain: "vcuxm7-76.myshopify.com",
    shopAccessToken: "runtime-secret",
    gscSiteUrl: "https://diamondshelf.us/",
    ga4PropertyId: "123456789",
    googleAccessToken: "runtime-google-token",
    seoProviderConfigured: true,
    publicSiteWritesEnabled: "false",
  });

  assert.equal(readOnlyConfigurationReady(checks), true);
  assert.equal(checks.length, 5);
});

test("write gate fails closed when enabled during read-only certification", () => {
  const checks = validateDiamondShelfReadOnlyConnections({
    shopDomain: "vcuxm7-76.myshopify.com",
    shopAccessToken: "runtime-secret",
    gscSiteUrl: "https://diamondshelf.us/",
    ga4PropertyId: "123",
    googleAccessToken: "runtime-google-token",
    seoProviderConfigured: true,
    publicSiteWritesEnabled: "true",
  });

  assert.equal(readOnlyConfigurationReady(checks), false);
  assert.equal(checks.find((check) => check.id === "write_gate")?.state, "invalid");
});

test("vanity Shopify domain and wrong GSC property are rejected", () => {
  const checks = validateDiamondShelfReadOnlyConnections({
    shopDomain: "diamondshelf.us",
    shopAccessToken: "runtime-secret",
    gscSiteUrl: "https://example.com/",
    ga4PropertyId: "123",
    googleAccessToken: "runtime-google-token",
    seoProviderConfigured: true,
    publicSiteWritesEnabled: "false",
  });

  assert.equal(checks.find((check) => check.id === "shopify")?.state, "invalid");
  assert.equal(checks.find((check) => check.id === "gsc")?.state, "invalid");
});

test("missing credentials stay missing rather than being assumed connected", () => {
  const checks = validateDiamondShelfReadOnlyConnections({ publicSiteWritesEnabled: "false" });
  assert.equal(readOnlyConfigurationReady(checks), false);
  assert.equal(checks.find((check) => check.id === "shopify")?.state, "missing");
  assert.equal(checks.find((check) => check.id === "gsc")?.state, "missing");
  assert.equal(checks.find((check) => check.id === "ga4")?.state, "missing");
});
