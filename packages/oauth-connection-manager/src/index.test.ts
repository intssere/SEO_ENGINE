import test from "node:test";
import assert from "node:assert/strict";
import {
  SHOPIFY_READ_SCOPES,
  GOOGLE_READ_SCOPES,
  createOAuthState,
  assertOAuthState,
  buildShopifyAuthorizationUrl,
  buildGoogleAuthorizationUrl,
  exchangeShopifyCode,
  exchangeGoogleCode,
  refreshGoogleAccessToken,
  discoverGoogleResources,
  autoMatchDiamondShelf,
  encryptTokenBundle,
  decryptTokenBundle,
  sanitizedConnectionMetadata,
} from "./index.js";

const now = new Date("2026-09-10T14:00:00Z");

test("Shopify authorization is read-only and bound to permanent shop domain", () => {
  const state = createOAuthState("shopify", { shopDomain: "vcuxm7-76.myshopify.com", now });
  const url = new URL(buildShopifyAuthorizationUrl({
    clientId: "shop-client",
    clientSecret: "secret",
    redirectUri: "https://app.example/oauth/shopify/callback",
    shopDomain: "vcuxm7-76.myshopify.com",
  }, state));
  assert.equal(url.hostname, "vcuxm7-76.myshopify.com");
  assert.equal(url.searchParams.get("scope"), SHOPIFY_READ_SCOPES.join(","));
  assert.equal(url.searchParams.get("state"), state.state);
  assert.throws(() => buildShopifyAuthorizationUrl({ clientId: "x", clientSecret: "y", redirectUri: "https://x/cb", shopDomain: "other.myshopify.com" }, state));
});

test("Google authorization requests offline read-only access with PKCE", () => {
  const state = createOAuthState("google", { now });
  const url = new URL(buildGoogleAuthorizationUrl({ clientId: "google-client", clientSecret: "secret", redirectUri: "https://app.example/oauth/google/callback" }, state));
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.deepEqual((url.searchParams.get("scope") ?? "").split(" "), [...GOOGLE_READ_SCOPES]);
  assert.ok(url.searchParams.get("code_challenge"));
});

test("OAuth state expires and rejects provider/state mismatch", () => {
  const state = createOAuthState("google", { now, ttlSeconds: 600 });
  assert.doesNotThrow(() => assertOAuthState(state, state.state, "google", new Date("2026-09-10T14:05:00Z")));
  assert.throws(() => assertOAuthState(state, "wrong", "google", now));
  assert.throws(() => assertOAuthState(state, state.state, "shopify", now));
  assert.throws(() => assertOAuthState(state, state.state, "google", new Date("2026-09-10T14:10:00Z")));
});

test("token exchanges normalize Shopify and Google credentials without logging secrets", async () => {
  const shopFetch = async () => new Response(JSON.stringify({ access_token: "shop-secret", scope: "read_products,read_content" }), { status: 200 });
  const shop = await exchangeShopifyCode({ clientId: "id", clientSecret: "secret", redirectUri: "https://x/cb", shopDomain: "vcuxm7-76.myshopify.com" }, "code", shopFetch as typeof fetch);
  assert.equal(shop.accessToken, "shop-secret");
  assert.deepEqual(shop.scopes, ["read_products", "read_content"]);

  const state = createOAuthState("google", { now });
  const googleFetch = async () => new Response(JSON.stringify({ access_token: "google-secret", refresh_token: "refresh-secret", expires_in: 3600, scope: GOOGLE_READ_SCOPES.join(" "), token_type: "Bearer" }), { status: 200 });
  const google = await exchangeGoogleCode({ clientId: "id", clientSecret: "secret", redirectUri: "https://x/cb" }, "code", state, googleFetch as typeof fetch, now);
  assert.equal(google.refreshToken, "refresh-secret");
  assert.equal(google.expiresAt, "2026-09-10T15:00:00.000Z");
  assert.doesNotMatch(JSON.stringify(sanitizedConnectionMetadata("google", google)), /google-secret|refresh-secret/);
});

test("Google refresh preserves refresh token", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ access_token: "new-access", expires_in: 1800, token_type: "Bearer" }), { status: 200 });
  const refreshed = await refreshGoogleAccessToken({ clientId: "id", clientSecret: "secret", redirectUri: "https://x/cb" }, "refresh-secret", fetchImpl as typeof fetch, now);
  assert.equal(refreshed.refreshToken, "refresh-secret");
  assert.equal(refreshed.expiresAt, "2026-09-10T14:30:00.000Z");
});

test("Google property discovery and Diamond Shelf auto-match are deterministic", async () => {
  const fetchImpl = async (input: URL | Request | string) => {
    const url = String(input);
    if (url.includes("webmasters")) return new Response(JSON.stringify({ siteEntry: [{ siteUrl: "https://diamondshelf.us/", permissionLevel: "siteOwner" }] }), { status: 200 });
    return new Response(JSON.stringify({ accountSummaries: [{ account: "accounts/1", propertySummaries: [{ property: "properties/123456", displayName: "Diamond Shelf" }] }] }), { status: 200 });
  };
  const resources = await discoverGoogleResources("access-token", fetchImpl as typeof fetch);
  const matched = autoMatchDiamondShelf(resources);
  assert.equal(matched.gscSiteUrl, "https://diamondshelf.us/");
  assert.equal(matched.ga4PropertyId, "123456");
  assert.equal(matched.needsConfirmation, false);
});

test("AES-GCM credential envelope round-trips and keeps raw tokens out of metadata", () => {
  const bundle = { accessToken: "access-secret", refreshToken: "refresh-secret", expiresAt: null, scopes: ["scope"], tokenType: "Bearer" };
  const key = Buffer.alloc(32, 7).toString("base64");
  const encrypted = encryptTokenBundle(bundle, key);
  assert.doesNotMatch(JSON.stringify(encrypted), /access-secret|refresh-secret/);
  assert.deepEqual(decryptTokenBundle(encrypted, key), bundle);
  assert.throws(() => decryptTokenBundle(encrypted, Buffer.alloc(32, 8).toString("base64")));
});

test("AES-GCM accepts a strong non-Base64 passphrase", () => {
  const secret = "a-strong-oauth-credential-secret-with-32-plus-characters";
  const bundle = {
    accessToken: "access",
    refreshToken: "refresh",
    expiresAt: null,
    scopes: ["read_products"],
    tokenType: "Bearer",
  };
  const encrypted = encryptTokenBundle(bundle, secret);
  assert.deepEqual(decryptTokenBundle(encrypted, secret), bundle);
});
