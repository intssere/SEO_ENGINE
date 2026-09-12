import test from "node:test";
import assert from "node:assert/strict";
import {
  TASK53_SHOPIFY_WRITE_RETURN_TO,
  TASK53_SHOPIFY_WRITE_SCOPE,
  startTask53ShopifyWriteUrl,
  task53ShopifyWriteExternalAccountId,
} from "./oauth.js";

const env = {
  APP_ORIGIN: process.env.APP_ORIGIN,
  SHOPIFY_OAUTH_CLIENT_ID: process.env.SHOPIFY_OAUTH_CLIENT_ID,
  SHOPIFY_OAUTH_CLIENT_SECRET: process.env.SHOPIFY_OAUTH_CLIENT_SECRET,
};

test.after(() => {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("Task #53 Shopify OAuth profile uses the existing callback but adds write_products and a signed state marker", () => {
  process.env.APP_ORIGIN = "https://dsseoengine.replit.app";
  process.env.SHOPIFY_OAUTH_CLIENT_ID = "client-id";
  process.env.SHOPIFY_OAUTH_CLIENT_SECRET = "client-secret";
  const { state, url } = startTask53ShopifyWriteUrl("vcuxm7-76.myshopify.com");
  const parsed = new URL(url);
  const scopes = (parsed.searchParams.get("scope") ?? "").split(",");
  assert.equal(state.returnTo, TASK53_SHOPIFY_WRITE_RETURN_TO);
  assert.equal(state.shopDomain, "vcuxm7-76.myshopify.com");
  assert.ok(scopes.includes("read_products"));
  assert.ok(scopes.includes(TASK53_SHOPIFY_WRITE_SCOPE));
  assert.equal(parsed.searchParams.get("redirect_uri"), "https://dsseoengine.replit.app/api/connections/shopify/callback");
  assert.equal(task53ShopifyWriteExternalAccountId("vcuxm7-76.myshopify.com"), "vcuxm7-76.myshopify.com#task53-write-products");
});

test("Task #53 write profile rejects non-permanent Shopify domains", () => {
  assert.throws(() => task53ShopifyWriteExternalAccountId("diamondshelf.us"));
});
