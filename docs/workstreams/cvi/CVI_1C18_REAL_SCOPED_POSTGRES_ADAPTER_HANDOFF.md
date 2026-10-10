# CVI-1C.18 — Private scoped adapter executed on disposable PostgreSQL

Date: 2026-10-10
Status: Draft; exact-head full CI pending. No production actions.

## Certified predecessors
- CVI-1C.16 PR #1003 exact HEAD 5fbaf3e9d2634b47f7b4501861e88646b7e7bf31: full GitHub CI SUCCESS, run 38035213249.
- CVI-1C.17 PR #1006 exact HEAD cc7e3949c2f603515dd9b087909697b2230b9905: full GitHub CI SUCCESS, run 38035319828.
- All CVI implementation PRs remain open drafts and unmerged.

## New increment
- Draft PR #1007 https://github.com/intssere/SEO_ENGINE/pull/1007
- Head branch workstream/cvi-1c18-disposable-real-adapter-pr1006-dependent
- Base branch workstream/cvi-1c17-scoped-readback-postgres-adapter-pr1003-dependent
- Initial HEAD 03db5283859db4a93514e6988cd68ab90c55a04c
- Revised HEAD d77b469df9723f37fedf725658cd96b2f64e2e76 (CI dependency build repair)
- Exact-head disposable CI proof branch ugp-cvi-1b4e-ci-proof-20261010-v
- Initial workflow run 38035697748 failed disposable test because the API's OAuth package output was not built before the DB test dynamically imported the adapter. No database assertion failed.
- Repair added `pnpm --filter @seo-engine/oauth-connection-manager build` in the gated disposable CI step.
- Replacement exact-head proof branch ugp-cvi-1b4e-ci-proof-20261010-w; workflow run 38035806976. The disposable CVI certification step has passed; full CI pending at checkpoint.

## Tests
- Appends a new integration test to lib/db/src/cvi-1b4o-disposable-acquisition-ledger.test.ts.
- Dynamically loads real private createCviScopedPostgresReadbackStore() adapter from API server, backed by actual postgres.Sql against the isolated localhost seo_engine_cvi_disposable database after the dormant 0014–0016 migrations.
- Reads the existing recorded_untrusted CVI-1C.15 acquisition and verifies field-exact projection.
- Confirms cross-tenant, cross-session and cross-subject substitution and missing IDs produce no records.
- Confirms site-read grant revocation, membership revocation and authenticated session revocation deny reads.
- Restores fixture state; database creation/drop are handled by the existing gated GitHub CI workflow.

## Security boundary
- This tests the SQL driver adapter with a real disposable database; it is not a production route, authenticated HTTP session integration, real GSC provider transport, or trustworthy provider-origin verification.
- The adapter accepts a trusted server-owned postgres.Sql client and a separately server-derived authenticated principal. Passing client-supplied identity into it remains unsafe.
- The result is an immutable historical untrusted nonce record, not permission to contact a provider or publish material.
- No live provider requests, secret access, production migration, deployment, PR merge or CMS publication.

## Next
1. Verify terminal exact-head CI; repair any issues in a new commit and rerun with a fresh proof branch.
2. Define and test a server-derived principal adapter using authenticated session state with database permission fencing; do not expose any public route prematurely.
3. Integrate trusted provider OAuth transport only under explicit bounded operational authorization and independent evidence review.
