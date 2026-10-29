import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AuthPrincipal } from "./auth-foundation.js";
import { deriveUnresolvedCviAccessContext } from "./cvi-session-context-adapter.js";

const at = "2026-10-08T12:00:00.000Z";
const fingerprint = "a".repeat(64);
function principal(role: AuthPrincipal["role"] = "admin"): AuthPrincipal {
  return {
    sessionId: "session-1",
    subject: "subject-1",
    email: "authenticated@example.org",
    displayName: "Example",
    role,
    csrfTokenHash: "b".repeat(64),
    issuedAt: "2026-10-08T10:00:00.000Z",
    lastSeenAt: "2026-10-08T11:30:00.000Z",
    expiresAt: "2026-10-08T13:00:00.000Z",
  };
}
function derive(auth: AuthPrincipal | null = principal()) {
  return deriveUnresolvedCviAccessContext({
    principal: auth,
    target: { tenantId: "tenant-1", siteId: "site-1", siteBindingFingerprint: fingerprint },
    evaluatedAt: at,
  });
}
test("all roles remain unresolved, regardless of admin privilege", () => {
  for (const role of ["admin", "operator", "viewer"] as const) {
    const result = derive(principal(role));
    assert.equal(result.principalSubject, "subject-1");
    assert.equal(result.access, "NOT_RESOLVED");
    assert.equal(result.connectionAccess, "NOT_RESOLVED");
    assert.equal(result.tenantMembershipSource, "unresolved");
    assert.equal(result.accessSource, "unresolved");
  }
});
test("rejects absent, expired or future session", () => {
  assert.throws(() => derive(null), /principal_not_authenticated/);
  assert.throws(() => derive({ ...principal(), expiresAt: at }), /session_not_current/);
  assert.throws(() => derive({ ...principal(), lastSeenAt: "2026-10-09T00:00:00.000Z" }), /session_not_current/);
});
test("rejects invalid site binding and malformed tenant/site identity", () => {
  const base = { principal: principal(), evaluatedAt: at };
  for (const target of [
    { tenantId: "tenant with whitespace", siteId: "site-1", siteBindingFingerprint: fingerprint },
    { tenantId: "tenant-1", siteId: "", siteBindingFingerprint: fingerprint },
    { tenantId: "tenant-1", siteId: "site-1", siteBindingFingerprint: "forged" },
  ]) {
    assert.throws(() => deriveUnresolvedCviAccessContext({ ...base, target }));
  }
});
test("rejects malformed clock or principal role", () => {
  assert.throws(() => deriveUnresolvedCviAccessContext({
    principal: principal(),
    target: { tenantId: "tenant-1", siteId: "site-1", siteBindingFingerprint: fingerprint },
    evaluatedAt: "invalid",
  }));
  assert.throws(() => derive({ ...principal(), role: "superuser" as AuthPrincipal["role"] }));
});
test("pure implementation neither resolves nor contacts an external authority", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(here, "cvi-session-context-adapter.ts"), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(source, /setTimeout|setInterval|queueMicrotask|Date\.now|Math\.random/);
});
