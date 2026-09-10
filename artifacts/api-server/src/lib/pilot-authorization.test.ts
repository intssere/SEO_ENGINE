import assert from "node:assert/strict";
import test from "node:test";
import { createPilotAuthorization, isSameOriginRequest, verifyPilotAuthorization } from "./pilot-authorization.js";

const secret = "test-session-secret-with-safe-length";

test("pilot action capability is signed, time-limited, and same-origin", () => {
  const issuedAt = Date.UTC(2026, 8, 11, 12, 0, 0);
  const token = createPilotAuthorization(secret, issuedAt);
  assert.equal(verifyPilotAuthorization(token, secret, issuedAt + 60_000), true);
  assert.equal(verifyPilotAuthorization(`${token}x`, secret, issuedAt + 60_000), false);
  assert.equal(verifyPilotAuthorization(token, secret, issuedAt + 6 * 60_000), false);
  assert.equal(isSameOriginRequest("https://diamondshelf.example", "diamondshelf.example"), true);
  assert.equal(isSameOriginRequest("https://attacker.example", "diamondshelf.example"), false);
});