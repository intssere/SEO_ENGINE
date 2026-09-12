import test from "node:test";
import assert from "node:assert/strict";
import { TASK53_WRITE_SCOPE_CONFIRMATION, validateTask53WriteScopeAuthorization } from "./task53-write-scope-authorization.js";

test("Task #53 write-scope authorization requires the exact explicit confirmation", () => {
  const missing = validateTask53WriteScopeAuthorization({
    shop: "vcuxm7-76.myshopify.com",
    confirmation: "continue",
    publicWriteGateEnabled: false,
  });
  assert.deepEqual(missing, { ok: false, category: "explicit_write_scope_confirmation_required" });

  const exact = validateTask53WriteScopeAuthorization({
    shop: "vcuxm7-76.myshopify.com",
    confirmation: TASK53_WRITE_SCOPE_CONFIRMATION,
    publicWriteGateEnabled: false,
  });
  assert.equal(exact.ok, true);
  if (exact.ok) {
    assert.equal(exact.shop, "vcuxm7-76.myshopify.com");
    assert.equal(exact.confirmation, "AUTHORIZE_SHOPIFY_WRITE_SCOPE:write_products");
  }
});

test("Task #53 write-scope authorization fails closed if public writes are enabled", () => {
  const result = validateTask53WriteScopeAuthorization({
    shop: "vcuxm7-76.myshopify.com",
    confirmation: TASK53_WRITE_SCOPE_CONFIRMATION,
    publicWriteGateEnabled: true,
  });
  assert.deepEqual(result, { ok: false, category: "public_write_gate_must_remain_disabled" });
});

test("Task #53 write-scope authorization accepts only permanent Shopify domains", () => {
  const result = validateTask53WriteScopeAuthorization({
    shop: "diamondshelf.us",
    confirmation: TASK53_WRITE_SCOPE_CONFIRMATION,
    publicWriteGateEnabled: false,
  });
  assert.deepEqual(result, { ok: false, category: "shop_domain_invalid" });
});
