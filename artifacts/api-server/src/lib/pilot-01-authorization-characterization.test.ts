import assert from "node:assert/strict";
import test from "node:test";
import { createPilotAuthorization, verifyPilotAuthorization } from "./pilot-authorization.js";

/**
 * PILOT-01 characterization: existing authorization token is NOT a site- or
 * operation-scoped grant. These passing tests document limitations rather than
 * certifying a secure, single-use unattended pilot authorization model.
 *
 * No network, database, worker, provider, OAuth or public-site interaction.
 */
const secret = "pilot-01-offline-fixture-secret-only";
const at = Date.UTC(2026, 9, 30, 12, 0, 0);

test("PILOT-01 token currently remains valid on repeated verification within expiry", () => {
  const token = createPilotAuthorization(secret, at);
  assert.equal(verifyPilotAuthorization(token, secret, at + 1_000), true);
  assert.equal(verifyPilotAuthorization(token, secret, at + 1_000), true);
  // A cryptographic verifier alone does not implement durable token consumption.
});

test("PILOT-01 token currently contains no site, tenant, actor or operation binding", () => {
  const token = createPilotAuthorization(secret, at);
  const payload = token.split(".")[0];
  assert.ok(payload);
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
  assert.deepEqual(Object.keys(claims).sort(), ["issuedAt", "nonce"]);
  assert.equal(verifyPilotAuthorization(token, secret, at + 1_000), true);
  // The route's separate preflight must not be mistaken for token-scoped authorization.
});

test("PILOT-01 signed token still fails with wrong secret and expired timestamp", () => {
  const token = createPilotAuthorization(secret, at);
  assert.equal(verifyPilotAuthorization(token, "different-offline-fixture-secret", at + 1_000), false);
  assert.equal(verifyPilotAuthorization(token, secret, at + 6 * 60_000), false);
});
