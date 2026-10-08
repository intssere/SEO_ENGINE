import assert from "node:assert/strict";
import test from "node:test";
import { reviewCviTenantSiteGrant, type CviTenantSiteGrantSnapshot } from "./cvi-tenant-site-grant-policy.js";

const checkedAt = "2026-10-08T12:00:00.000Z";
const until = "2026-10-09T00:00:00.000Z";
const since = "2026-10-07T00:00:00.000Z";
function snapshot(): CviTenantSiteGrantSnapshot {
  return {
    authenticatedSubject: "subject-1", requestedTenantId: "tenant-1", requestedSiteId: "site-1",
    session: { subject: "subject-1", expiresAt: until, revoked: false },
    site: { siteId: "site-1", organizationId: "tenant-1", active: true, identityFingerprint: "a".repeat(64) },
    membership: {
      subject: "subject-1", organizationId: "tenant-1", status: "active",
      effectiveAt: since, expiresAt: until,
    },
    siteGrant: {
      siteId: "site-1", organizationId: "tenant-1", subject: "subject-1",
      permission: "read_evidence", status: "active", effectiveAt: since, expiresAt: until,
    },
    connection: { siteId: "site-1", state: "connected", readEvidenceScopePresent: true },
  };
}
function inspect(s: CviTenantSiteGrantSnapshot = snapshot()) {
  return reviewCviTenantSiteGrant({ snapshot: s, checkedAt });
}
test("full hypothetical positive snapshot is never independent authorization", () => {
  const x = inspect();
  assert.equal(x.status, "ELIGIBLE_FOR_TRUSTED_RESOLUTION");
  assert.equal(x.semantics.authorizationGranted, false);
  assert.equal(x.semantics.independentlyAuthenticated, false);
  assert.equal(x.semantics.publicationAuthorized, false);
});
test("cross-tenant, wrong site, disabled site deny", () => {
  for (const site of [
    { ...snapshot().site, organizationId: "tenant-2" },
    { ...snapshot().site, siteId: "site-2" },
    { ...snapshot().site, active: false },
  ]) assert.equal(inspect({ ...snapshot(), site }).status, "DENY");
});
test("foreign principal and missing or revoked membership deny", () => {
  for (const membership of [
    null, { ...snapshot().membership!, subject: "attacker" },
    { ...snapshot().membership!, status: "revoked" as const },
    { ...snapshot().membership!, expiresAt: checkedAt },
  ]) assert.ok(inspect({ ...snapshot(), membership }).reasonCodes.includes("membership_invalid"));
});
test("site-grant scope, permission and revocation deny", () => {
  for (const siteGrant of [
    null, { ...snapshot().siteGrant!, organizationId: "tenant-2" },
    { ...snapshot().siteGrant!, permission: "manage_connection" as const },
    { ...snapshot().siteGrant!, status: "revoked" as const },
  ]) assert.ok(inspect({ ...snapshot(), siteGrant }).reasonCodes.includes("site_grant_invalid"));
});
test("connection revoked, other-site, no read-scope all deny", () => {
  for (const connection of [
    null, { ...snapshot().connection!, siteId: "site-2" },
    { ...snapshot().connection!, state: "revoked" as const },
    { ...snapshot().connection!, readEvidenceScopePresent: false },
  ]) assert.ok(inspect({ ...snapshot(), connection }).reasonCodes.includes("connection_invalid"));
});
test("expired or revoked auth session denied", () => {
  for (const session of [
    { ...snapshot().session, expiresAt: checkedAt },
    { ...snapshot().session, revoked: true },
    { ...snapshot().session, subject: "other" },
  ]) assert.ok(inspect({ ...snapshot(), session }).reasonCodes.includes("session_invalid"));
});
test("invalid timestamps and malformed identity reject", () => {
  assert.throws(() => reviewCviTenantSiteGrant({ snapshot: snapshot(), checkedAt: "2026-12-99T12:00:00.000Z" }));
  assert.throws(() => inspect({ ...snapshot(), requestedTenantId: "bad tenant" }));
});
test("identity changes and ordering produce deterministic distinct fingerprints", () => {
  assert.equal(inspect().reportFingerprint, inspect().reportFingerprint);
  assert.notEqual(inspect().reportFingerprint,
    inspect({ ...snapshot(), session: { ...snapshot().session, expiresAt: "2026-10-10T00:00:00.000Z" } }).reportFingerprint);
});
