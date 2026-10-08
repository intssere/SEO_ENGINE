# CVI-1B.4D — Dormant tenant/site ACL migration draft handoff
Date: 2026-10-08
State: DRAFT, SQL NEVER EXECUTED, CI PENDING, NO MERGE / DEPLOY

## Exact branch and PR
- Stacked PR #940: https://github.com/intssere/SEO_ENGINE/pull/940
- Code branch: `workstream/cvi-1b4d-tenant-acl-migration-draft-pr939-dependent`
- PR #940 target: `workstream/cvi-1b4c-tenant-grant-policy-pr937-dependent`
- Exact HEAD at handoff: `3c8a5c9e71a059ea5de564ac234bd3fe2756bee7`
- CI proof-only push branch: `ugp-cvi-1b4d-ci-proof-20261008`, same exact head.
- Validation workflow run: 37827063093, QUEUED at last inspection.
- Prerequisite PR #939 CVI-1B.4C exact HEAD `f0d67632dede51372e614d98dfe7cf639de54831`: CI PASS, run 37825546594.
- Other stacked draft PRs in order: #923 > #928 > #931 > #932 > #935 > #937 > #939 > #940. Preserve all as drafts until exact-head merge authorization and dependency plan.

## Files
- `lib/db/migrations/0012_cvi_tenant_site_acl_draft.sql`
- `artifacts/api-server/src/lib/cvi-tenant-acl-migration-draft.test.ts`

## SQL changes proposed (NEVER APPLIED)
1. `cvi_organization_memberships`, identified by (organization_id, auth_subject), with role, effective/expiry interval and explicit revoked/suspended states.
2. `cvi_site_read_grants` with site and membership references bound to a COMMON organization_id through two composite FKs, read_evidence/review_content/manage_connection permissions, validity and revoke states.
3. `cvi_tenant_authorization_audit` records audit metadata, but append-only enforcement is NOT implemented or certified.
4. Add `sites(id, organization_id)` uniqueness to support the composite foreign key.
5. Deny-by-default membership and grant rows (status=revoked, revoked_at defaults to now()). No seed users, grants, credentials or migration execution.

## Known unresolved gaps before any database application
- CI currently enforces hard-coded table counts. Applying the schema in an existing runtime state without a separate migration plan would make bootstrap fail closed. DO NOT add it to bootstrap implicitly.
- No actual PostgreSQL DDL, FK enforcement, index performance, concurrency, revocation or rollback tests have been executed for this draft. Static TypeScript test checks shape, not database behavior.
- Must test migrations on a completely disposable database with negative cross-organization insert attempts and activation/revocation, ensuring no partial changes remain; require separate bounded authorization.
- Auditing is not append-only, grants have no authenticated issuer lifecycle, no independently verified membership onboarding, and no trusted read resolver.
- Need migration policy review for composite constraints on existing sites, schema version/state and rollback/operational safety.
- Current code cannot grant VERIFIED_READ, publishing or execution authorization.

## Required next steps
1. Check latest PR #940 exact HEAD and CI; fix any static/type errors and revalidate.
2. Obtain independent database schema review (especially active grant authorization lifecycle, append-only audit and revocation).
3. Prepare separately authorized disposable PostgreSQL migration test as a new development increment. Do not run on live Railway DB.
4. Plan runtime-bootstrap expected-state support only after migration tests and explicit release governance.
5. Integrate authenticated tenant membership resolver only after verified persistence and audited access-control boundaries.
6. Maintain separation from UGP/P12.2, no merges/deployments, no provider calls, no CMS publication.
