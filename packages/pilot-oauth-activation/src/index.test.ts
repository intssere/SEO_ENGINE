import assert from "node:assert/strict";
import test from "node:test";
import { assessOAuthActivationReadiness, buildOAuthRegistrationManifest } from "./index.js";

const valid = {
  appOrigin: "https://seo.example.com",
  shopifyClientId: "shopify-client",
  shopifyClientSecret: "shopify-secret",
  googleClientId: "google-client",
  googleClientSecret: "google-secret",
  credentialEncryptionKey: "0123456789abcdef0123456789abcdef",
  publicSiteWritesEnabled: "false",
};

test("builds exact OAuth callback manifest with read-only scopes", () => {
  const manifest = buildOAuthRegistrationManifest("https://seo.example.com/");
  assert.equal(manifest.shopifyRedirectUri, "https://seo.example.com/api/connections/shopify/callback");
  assert.equal(manifest.googleRedirectUri, "https://seo.example.com/api/connections/google/callback");
  assert.ok(manifest.shopifyScopes.every((scope) => scope.startsWith("read_")));
  assert.ok(manifest.googleScopes.every((scope) => scope.endsWith(".readonly")));
});

test("ready state requires platform credentials, encryption and write gate disabled", () => {
  const result = assessOAuthActivationReadiness(valid);
  assert.equal(result.status, "ready");
  assert.equal(result.platformCredentialsConfigured, true);
  assert.equal(result.encryptionConfigured, true);
  assert.equal(result.readOnlyGateLocked, true);
  assert.equal(result.liveConnectionAuthorized, false);
});

test("fails closed when public writes are enabled", () => {
  const result = assessOAuthActivationReadiness({ ...valid, publicSiteWritesEnabled: "true" });
  assert.equal(result.status, "blocked");
  assert.match(result.blockers.join(" "), /PUBLIC_SITE_WRITES_ENABLED/);
});

test("fails closed for missing OAuth app credentials and weak encryption key", () => {
  const result = assessOAuthActivationReadiness({
    ...valid,
    googleClientSecret: "",
    credentialEncryptionKey: "short",
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.platformCredentialsConfigured, false);
  assert.equal(result.encryptionConfigured, false);
});

test("rejects insecure public APP_ORIGIN", () => {
  assert.throws(() => buildOAuthRegistrationManifest("http://seo.example.com"));
});
