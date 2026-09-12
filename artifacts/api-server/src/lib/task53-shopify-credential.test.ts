import test from "node:test";
import assert from "node:assert/strict";
import { encryptTokenBundle } from "@seo-engine/oauth-connection-manager";
import { decodeTask53SecretRef } from "./task53-shopify-credential.js";

function secretRef(key: string) {
  const envelope = encryptTokenBundle({
    accessToken: "task53-secret-token",
    refreshToken: null,
    expiresAt: null,
    scopes: ["read_products", "write_products"],
    tokenType: null,
  }, key);
  return `enc:v1:${Buffer.from(JSON.stringify(envelope)).toString("base64url")}`;
}

test("Task #53 encrypted credential decoding round-trips without exposing token in the stored reference", () => {
  const key = Buffer.alloc(32, 11).toString("base64");
  const ref = secretRef(key);
  assert.doesNotMatch(ref, /task53-secret-token/);
  const bundle = decodeTask53SecretRef(ref, key);
  assert.equal(bundle.accessToken, "task53-secret-token");
  assert.deepEqual(bundle.scopes, ["read_products", "write_products"]);
});

test("Task #53 credential decoder rejects unsupported and corrupt references", () => {
  const key = Buffer.alloc(32, 11).toString("base64");
  assert.throws(() => decodeTask53SecretRef("plain:token", key), /shopify_secret_ref_unsupported/);
  assert.throws(() => decodeTask53SecretRef("enc:v1:not-valid-json", key), /shopify_secret_ref_invalid/);
});
