# CVI-1B.4I — actual parameterized ACL preflight SQL certification

Date: 2026-10-09. STATUS: DRAFT, CI pending; no merges or deployment.

## Verified predecessor
- PR #950 exact HEAD `615cb80ffdb46fa6213ed597acf816a0ce0b983d` passed GitHub validate run 37902827015.
- New stacked draft PR #951: https://github.com/intssere/SEO_ENGINE/pull/951.
- Branch `workstream/cvi-1b4i-disposable-preflight-sql-pr950-dependent` based on `workstream/cvi-1b4h-trusted-read-preflight-pr949-dependent`.
- HEAD at creation `67250311d121510397b87426c72b1105f4544c42`.
- Proof branch `ugp-cvi-1b4e-ci-proof-20261009-i` at exact same SHA triggers isolated database test.

## Code change
Extended `lib/db/src/cvi-1b4e-disposable-acl-migration.test.ts` to install existing `0002_auth.sql` in the isolated database after `0001_core.sql` and before dormant `0012_cvi_tenant_site_acl_draft.sql`. Table count in disposable proof becomes 34 (29 core + 2 auth + 3 CVI).
New test imports the literal `CVI_TRUSTED_READ_PREFLIGHT_SQL` from `artifacts/api-server/src/lib/cvi-trusted-read-preflight.ts` and executes it through bound PostgreSQL parameters against seeded session, org/site, membership, site grant and connected provider records.
Tests success-of-necessary-conditions and negative cases for wrong principal, cross-tenant site, empty connection scopes, revoked site grant, revoked membership, inactive site and revoked auth session. Positive SQL result is **not** independently verified property ownership or access authorization.

## Important limitations
- The SQL considers any connected non-empty provider scope adequate for `connection_ok`. This is not a verified resource identity, certified read scope or ownership receipt. It must not issue an authorization capability.
- SQL separately evaluates EXISTS predicates; this is insufficient for long-lived authorization or race-free provider execution.
- The injectable preflight reader must be constructed only in trusted server code. No public API route or production backend connector has been added.
- The disposable database test is CI-gated to `ugp-cvi-1b4e-ci-proof-*`, uses localhost database `seo_engine_cvi_disposable` and drops it after testing.
- No application bootstrap changes and no production schema migration, provider request, CMS publish, merge or deploy.

## Next tasks
1. Verify PR #951 exact-head CI and dedicated PostgreSQL test. Repair any TypeScript/Postgres error and rerun exact-head proof.
2. Design correct provider-specific read scope requirements and independently authenticated site/property binding.
3. Implement trusted internal server reader only after a separately governed runtime schema release, with revocation-aware authorization and real authenticated request-source provenance.
4. Continue CVI evidence-truth and editorial integration into UGP separately from access-control hardening.
