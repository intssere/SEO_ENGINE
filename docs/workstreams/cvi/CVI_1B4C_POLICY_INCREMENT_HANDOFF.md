# CVI-1B.4C — isolated authorization policy review handoff
Date: 2026-10-08
Status: DRAFT PR / NO DB MIGRATION / NO AUTHORIZED ACCESS / CI PENDING

## Stack
- PR #923 CVI-1A
- PR #928 CVI-1B.1
- PR #931 CVI-1B.2
- PR #932 CVI-1B.3
- PR #935 CVI-1B.4
- PR #937 CVI-1B.4B, exact head 6b2438a22d030fc5874692b0214970d6e74126e4, validate SUCCESS in run 37822656300
- PR #939 CVI-1B.4C, base workstream/cvi-1b4b-session-context-pr935-dependent, head f0d67632dede51372e614d98dfe7cf639de54831 at creation.
- The exact-head proof-only CI branch ugp-cvi-1b4c-ci-proof-20261008 points to the same commit and triggers repository's ugp-* push workflow.
- All PRs remain draft and unmerged.

## Implementation
- artifacts/api-server/src/lib/cvi-tenant-site-grant-policy.ts
- artifacts/api-server/src/lib/cvi-tenant-site-grant-policy.test.ts
- Consumes hypothetical snapshots of auth subject/session, site->organization, subject->organization membership, site-specific read grant and a connected scoped read-capability.
- Cross-tenant, wrong subject, inactive site, missing or revoked membership, wrong grant/site, revoked connection, absent read permission, expired session all return DENY.
- Fully matching data returns ELIGIBLE_FOR_TRUSTED_RESOLUTION, **not VERIFIED_READ**. The report always declares authorizationGranted=false, independentlyAuthenticated=false, publishingAuthorized=false and executionAuthorized=false.
- Pure in-memory; no SQL, persistence, runtime/API wiring, network, provider, scheduler or public-site mutation.
- Fingerprint includes every source snapshot field to detect status changes even if output status does not change.

## Source-backed prerequisite
- lib/db/migrations/0001_core.sql contains organizations, sites(organization_id), connections(site_id/provider/scopes/status).
- lib/db/migrations/0002_auth.sql contains auth_sessions and auth_audit_events, not principal->organization membership.
- AuthPrincipal holds a global viewer/operator/admin role and session identity but no tenant/site scope.
- Before an authentic resolver can issue VERIFIED_READ, design separately authorized additive membership/site-grant schema and a server-only atomic read path; CI workflow currently hardcodes baseline PostgreSQL table counts and must not be silently changed.
- Existing oauth.ts uses DiamondShelf-specific site resolution, so it cannot be reused for arbitrary tenant access.

## CI and review
1. Check PR #939 exact head and GitHub validate result on ugp-cvi-1b4c-ci-proof-20261008.
2. If failures arise, inspect exact job logs and repair on PR branch; re-run exact updated head.
3. Review negative tests for cross-tenant and revoked cases and check malformed schema expectations.
4. Do not declare this a tenant grant: the whole snapshot is caller supplied and forgeable.
5. Next approved workstream can introduce SQL schema **as a separate draft artifact only** with explicit migration-review gates, then ephemeral Postgres tests. No migrations executed on production.
6. Preserve other UGP/P12.2 work; do not merge or deploy without separate exact-HEAD authorization.
