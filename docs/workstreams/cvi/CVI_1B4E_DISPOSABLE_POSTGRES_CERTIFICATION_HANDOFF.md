# CVI-1B.4E — Disposable PostgreSQL certification handoff
Date: 2026-10-08
Status: DRAFT STACKED PR; exact-head CI pending; NO PRODUCTION DB migration

## Verified baselines
- PR #939 CVI-1B.4C, head f0d67632dede51372e614d98dfe7cf639de54831, GitHub validate SUCCESS run 37825546594.
- PR #940 CVI-1B.4D, head 3c8a5c9e71a059ea5de564ac234bd3fe2756bee7, GitHub validate SUCCESS run 37827063093.
- PR #943 CVI-1B.4E, head 34256b6496a568c0a207a235d57df1f59cac9e6e, target workstream/cvi-1b4d-tenant-acl-migration-draft-pr939-dependent, created DRAFT.
- Validation-only branch ugp-cvi-1b4e-ci-proof-20261008 points to the same commit. CI run 37828846897 initially QUEUED.
- All earlier stacked CVI draft PRs #923, #928, #931, #932, #935, #937, #939 and #940 remain unmerged.

## Artifacts
- lib/db/src/cvi-1b4e-disposable-acl-migration.test.ts
- lib/db/package.json adds script test:cvi-1b4e
- .github/workflows/ci.yml adds conditional proof-branch-only certification step

## Disposable database discipline
- Only GitHub ephemeral localhost PostgreSQL named seo_engine_cvi_disposable can be used.
- Step creates a dedicated database, uses shell trap to drop at exit, then runs test:cvi-1b4e.
- Test rejects all external hosts, all other database names, and absent explicit test URL (skip).
- Test verifies an empty database before migration; installs existing 0001_core.sql and dormant 0012_cvi_tenant_site_acl_draft.sql.
- Validates 29 -> 32 table count, revoked-by-default membership/site read-grant, rejection of cross-org membership/site reference, activation, session-independent grant-revocation behavior, invalid revocation transition.
- CI normal schema bootstrap and hard-coded table expectations are unchanged; no new runtime bootstrapping for 0012.
- This does not certify production readiness, authenticated grant issuance or append-only audit guarantees.

## Review gates / actions
1. Await exact-head GitHub CI outcome, inspect DB step and typecheck/test failures; repair on PR branch and rerun new exact-head proof.
2. Preserve evidence of disposable database creation/drop and failures. If drop fails, treat as cleanup blocker.
3. Add concurrency, rollback, audit immutability, site-transfer and revised connection-scope tests separately.
4. Confirm security review of migration before any other database application. No tenant bootstrap or grant backfill has been authorized.
5. Only after schema certification, separately govern migration deployment and trusted server-side authorization resolver design.
6. No PR merges or production DB migrations without explicit exact HEAD approval.

## Remaining limitations
The proposed schema's audit table is not append-only by trigger. Active memberships must be created by an authenticated issuer workflow not present in the application. A matching snapshot in existing CVI policies cannot prove user rights; tenant site authorization is not live.
