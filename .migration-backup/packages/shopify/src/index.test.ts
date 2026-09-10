import assert from "node:assert/strict";
import test from "node:test";

import { assertReadOnlyScopes, normalizeShopDomain } from "./index.js";

test("normalizes a valid myshopify domain", () => {
  assert.equal(
    normalizeShopDomain("https://Diamond-Shelf.myshopify.com/admin"),
    "diamond-shelf.myshopify.com",
  );
});

test("rejects a storefront vanity domain", () => {
  assert.throws(() => normalizeShopDomain("diamondshelf.us"), /myshopify\.com/);
});

test("accepts the required read-only scopes", () => {
  assert.doesNotThrow(() => assertReadOnlyScopes(["read_products", "read_content"]));
});

test("rejects any write scope", () => {
  assert.throws(
    () => assertReadOnlyScopes(["read_products", "read_content", "write_products"]),
    /Remove write scopes: write_products/,
  );
});

test("rejects missing required read scope", () => {
  assert.throws(
    () => assertReadOnlyScopes(["read_products"]),
    /Missing required Shopify read scopes: read_content/,
  );
});
