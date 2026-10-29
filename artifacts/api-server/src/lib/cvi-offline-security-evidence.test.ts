import assert from "node:assert/strict";
import test from "node:test";
import type { CviTenantSiteGrantSnapshot } from "./cvi-tenant-site-grant-policy.js";
import { reviewCviTenantSiteGrant } from "./cvi-tenant-site-grant-policy.js";

const checkedAt = "2026-10-29T10:00:00.000Z";
const base: CviTenantSiteGrantSnapshot = {
  authenticatedSubject: "subject-a",
  requestedTenantId: "tenant-a",
  requestedSiteId: "site-a",
  session: { subject: "subject-a", expiresAt: "2026-10-29T11:00:00.000Z", revoked: false },
  site: { siteId: "site-a", organizationId: "tenant-a", active: true, identityFingerprint: "a".repeat(64) },
  membership: { subject: "subject-a", organizationId: "tenant-a", status: "active", effectiveAt: "2026-10-01T00:00:00.000Z", expiresAt: null },
  siteGrant: { subject: "subject-a", siteId: "site-a", organizationId: "tenant-a", permission: "read_evidence", status: "active", effectiveAt: "2026-10-01T00:00:00.000Z", expiresAt: null },
  connection: { siteId: "site-a", state: "connected", readEvidenceScopePresent: true },
};

type Fixture = Readonly<{ id: string; snapshot: CviTenantSiteGrantSnapshot; expected: "DENY" | "ELIGIBLE_FOR_TRUSTED_RESOLUTION"; reason?: string }>;
const fixtures: readonly Fixture[] = [
  { id: "SEC-02-cross-tenant", snapshot: { ...base, requestedTenantId: "tenant-other" }, expected: "DENY", reason: "site_scope_invalid" },
  { id: "SEC-03-missing-grant", snapshot: { ...base, siteGrant: null }, expected: "DENY", reason: "site_grant_invalid" },
  { id: "SEC-04-revoked-membership", snapshot: { ...base, membership: { ...base.membership!, status: "revoked" } }, expected: "DENY", reason: "membership_invalid" },
  { id: "SEC-04-expired-membership", snapshot: { ...base, membership: { ...base.membership!, expiresAt: checkedAt } }, expected: "DENY", reason: "membership_invalid" },
  { id: "SEC-05-revoked-session", snapshot: { ...base, session: { ...base.session, revoked: true } }, expected: "DENY", reason: "session_invalid" },
  { id: "SEC-05-expired-session", snapshot: { ...base, session: { ...base.session, expiresAt: checkedAt } }, expected: "DENY", reason: "session_invalid" },
  { id: "SEC-06-other-site-connection", snapshot: { ...base, connection: { ...base.connection!, siteId: "site-other" } }, expected: "DENY", reason: "connection_invalid" },
  { id: "SEC-06-revoked-connection", snapshot: { ...base, connection: { ...base.connection!, state: "revoked" } }, expected: "DENY", reason: "connection_invalid" },
  { id: "SEC-12-forged-snapshot-not-authorization", snapshot: base, expected: "ELIGIBLE_FOR_TRUSTED_RESOLUTION" },
];

for (const fixture of fixtures) {
  test(`offline CVI evidence ${fixture.id}: always nonauthorizing`, () => {
    const outcome = reviewCviTenantSiteGrant({ snapshot: fixture.snapshot, checkedAt });
    const evidence = Object.freeze({
      testId: fixture.id,
      environment: "deterministic-in-memory-fixture",
      inputFingerprint: outcome.reportFingerprint,
      expectedStatus: fixture.expected,
      observedStatus: outcome.status,
      reasonCodes: [...outcome.reasonCodes],
      authorizationGranted: outcome.semantics.authorizationGranted,
      executionAuthorized: outcome.semantics.executionAuthorized,
      publicationAuthorized: outcome.semantics.publicationAuthorized,
    });
    assert.equal(evidence.observedStatus, evidence.expectedStatus, JSON.stringify(evidence));
    if (fixture.reason) assert.ok(evidence.reasonCodes.includes(fixture.reason), JSON.stringify(evidence));
    assert.equal(evidence.authorizationGranted, false);
    assert.equal(evidence.executionAuthorized, false);
    assert.equal(evidence.publicationAuthorized, false);
    assert.equal(outcome.semantics.independentlyAuthenticated, false);
    assert.equal(outcome.semantics.dataIsCallerSupplied, true);
    assert.deepEqual(reviewCviTenantSiteGrant({ snapshot: fixture.snapshot, checkedAt }), outcome);
  });
}
