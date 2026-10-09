import assert from "node:assert/strict";
import test from "node:test";
import type { AuthPrincipal } from "./auth-foundation.js";
import {
  checkCviTrustedReadPreflight,
  CVI_TRUSTED_READ_PREFLIGHT_SQL,
  type CviTrustedAccessRecord,
} from "./cvi-trusted-read-preflight.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const siteId = "22222222-2222-4222-8222-222222222222";
const at = "2026-10-09T04:00:00.000Z";
const p: AuthPrincipal = {
  sessionId: "33333333-3333-4333-8333-333333333333",
  subject: "google-subject-1", email: "test@example.com",
  displayName: null, role: "admin", csrfTokenHash: "a".repeat(64),
  issuedAt: "2026-10-09T01:00:00.000Z",
  lastSeenAt: "2026-10-09T03:00:00.000Z",
  expiresAt: "2026-10-09T06:00:00.000Z",
};
const full: CviTrustedAccessRecord = {
  session_ok: true, membership_ok: true, grant_ok: true,
  connection_ok: true, site_ok: true,
};
const run = (rows: readonly CviTrustedAccessRecord[], principal: AuthPrincipal | null = p) =>
  checkCviTrustedReadPreflight({
    principal, tenantId, siteId, evaluatedAt: at,
    read: async args => {
      assert.equal(args.subject, p.subject);
      assert.equal(args.tenantId, tenantId);
      assert.equal(args.siteId, siteId);
      return rows;
    },
  });

test("matching server-side records still never grant access", async () => {
  const result = await run([full]);
  assert.equal(result.outcome, "PENDING_INDEPENDENT_SITE_BINDING");
  assert.equal(result.authorizationGranted, false);
  assert.equal(result.publicationAuthorized, false);
  assert.equal(result.executionAuthorized, false);
});
test("missing or revoked membership, session, site, grant and connection fail closed", async () => {
  for (const field of Object.keys(full) as (keyof CviTrustedAccessRecord)[]) {
    const result = await run([{ ...full, [field]: false }]);
    assert.equal(result.outcome, "DENY", field);
  }
});
test("empty, duplicated and malformed SQL records deny", async () => {
  assert.equal((await run([])).outcome, "DENY");
  assert.equal((await run([full,full])).outcome, "DENY");
  assert.equal((await run([{ ...full, connection_ok: undefined as unknown as boolean }])).outcome, "DENY");
});
test("no principal, expired session or malformed target reaches reader", async () => {
  await assert.rejects(run([full], null), /session_invalid/);
  await assert.rejects(run([full], { ...p, expiresAt: at }), /session_invalid/);
  await assert.rejects(checkCviTrustedReadPreflight({
    principal: p, tenantId: "not-uuid", siteId, evaluatedAt: at,
    read: async () => { throw new Error("must_not_query"); },
  }), /scope_invalid/);
});
test("SQL binds five parameters and demands precise site, session, membership and grant state", () => {
  for (const literal of [
    "auth_sessions", "revoked_at IS NULL", "cvi_organization_memberships",
    "cvi_site_read_grants", "connections", "s.is_active=true",
    "g.permission='read_evidence'", "g.status='active'", "c.status='connected'",
  ]) assert.ok(CVI_TRUSTED_READ_PREFLIGHT_SQL.includes(literal), literal);
  for (const number of [1,2,3,4,5])
    assert.ok(CVI_TRUSTED_READ_PREFLIGHT_SQL.includes(`$${number}`));
  assert.doesNotMatch(CVI_TRUSTED_READ_PREFLIGHT_SQL, /\bUPDATE\b|\bDELETE\b|\bINSERT\b|\bTRUNCATE\b/i);
});
