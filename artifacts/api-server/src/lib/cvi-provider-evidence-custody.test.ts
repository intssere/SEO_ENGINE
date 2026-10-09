import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUniversalConnectionIdentity,
  buildUniversalSiteIdentity,
} from "./universal-site-resource-identity.js";
import {
  reviewCviProviderEvidenceCustody,
  type CviProviderCustodyEnvelope,
} from "./cvi-provider-evidence-custody.js";

const site = buildUniversalSiteIdentity({
  siteId: "site-1", canonicalOrigin: "https://example.com",
});
const connection = buildUniversalConnectionIdentity({
  site, connectionId: "connection-1", provider: "google",
  externalAccountId: "google#gsc-read-only-v1",
});
const envelope: CviProviderCustodyEnvelope = {
  tenantId: "tenant-1",
  siteId: site.siteId,
  siteIdentityFingerprint: site.siteIdentityFingerprint,
  connectionId: connection.connectionId,
  connectionIdentityFingerprint: connection.connectionIdentityFingerprint,
  provider: "google",
  principalSubject: "oidc-subject-1",
  authSessionId: "auth-session-1",
  acquisitionId: "acquisition-1",
  requestNonce: "nonce-1",
  requestedAt: "2026-10-09T04:00:00.000Z",
  observedAt: "2026-10-09T04:00:02.000Z",
  requestedResource: "sc-domain:example.com",
  observationFingerprint: "a".repeat(64),
  observationStatus: "accepted",
  transportOrigin: "server",
};
const base = {
  site, connection,
  expectedTenantId: "tenant-1",
  expectedPrincipalSubject: "oidc-subject-1",
  expectedAuthSessionId: "auth-session-1",
  expectedResource: "sc-domain:example.com",
  evaluatedAt: "2026-10-09T04:00:03.000Z",
  maxObservationAgeSeconds: 300,
  maxRequestDurationSeconds: 15,
};
const review = (patch: Partial<CviProviderCustodyEnvelope> = {}) =>
  reviewCviProviderEvidenceCustody({ ...base, envelope: { ...envelope, ...patch } });
test("even fully matching declared custody cannot grant or independently attest", () => {
  const r = review();
  assert.equal(r.outcome, "PENDING_TRUSTED_CUSTODY_AND_REPLAY_CERTIFICATION");
  assert.equal(r.independentlyAuthenticated, false);
  assert.equal(r.replayIndependentlyChecked, false);
  assert.equal(r.authorizationGranted, false);
  assert.equal(r.executionAuthorized, false);
  assert.equal(r.publicationAuthorized, false);
  assert.match(r.envelopeFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(r.envelopeFingerprint, review().envelopeFingerprint);
});
test("wrong tenant, session, user and connection are denied", () => {
  for (const bad of [
    { tenantId: "tenant-2" },
    { principalSubject: "attacker" },
    { authSessionId: "other-session" },
    { connectionId: "other-connection" },
    { connectionIdentityFingerprint: "b".repeat(64) },
    { siteIdentityFingerprint: "b".repeat(64) },
    { provider: "shopify" as const },
  ]) assert.equal(review(bad).outcome, "DENY");
});
test("wrong requested resource, denied observation and forged origin declaration fail", () => {
  for (const bad of [
    { requestedResource: "sc-domain:attacker.test" },
    { observationStatus: "uncertain" as const },
    { observationStatus: "rejected" as const },
    { transportOrigin: "browser" as unknown as "server" },
    { observationFingerprint: "invalid" },
  ]) assert.equal(review(bad).outcome, "DENY");
});
test("future, stale, negative duration and oversized duration fail closed", () => {
  for (const bad of [
    { observedAt: "2026-10-09T04:00:04.000Z" },
    { observedAt: "2026-10-09T03:59:59.000Z" },
    { observedAt: "2026-10-09T04:00:20.000Z" },
  ]) assert.equal(review(bad).outcome, "DENY");
  assert.equal(reviewCviProviderEvidenceCustody({
    ...base, evaluatedAt: "2026-10-09T04:20:00.000Z", envelope,
  }).outcome, "DENY");
});
test("invalid ISO clock and freshness policy reject before any trust outcome", () => {
  assert.throws(() => review({ requestedAt: "2026-10-09" }), /invalid_time/);
  assert.throws(() => reviewCviProviderEvidenceCustody({
    ...base, envelope, maxObservationAgeSeconds: 3601,
  }), /invalid_freshness_policy/);
});
test("changing acquisition nonce or evidence fingerprint changes claimed envelope identity", () => {
  assert.notEqual(review().envelopeFingerprint, review({ requestNonce: "nonce-2" }).envelopeFingerprint);
  assert.notEqual(review().envelopeFingerprint, review({ observationFingerprint: "b".repeat(64) }).envelopeFingerprint);
  assert.equal(review({ requestNonce: "nonce-2" }).replayIndependentlyChecked, false);
});
