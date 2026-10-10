# CVI-1C.22 — Disposable PostgreSQL server scope resolver proof

Date: 2026-10-10. Status: stacked draft / terminal CI pending.

## CVI-1C.21 predecessor repair
- PR #1013 initial HEAD 0276800174c0a71bd9577792832de1d5677fd7c3 had full CI failure at API workspace tests 806 and 808. The resolver's timestamp expression erroneously omitted the seconds field (expected :ss.fffZ); input validation returned null before DB mock calls.
- Corrected the ISO-8601 clock check to seconds and milliseconds with canonical Date.toISOString confirmation.
- New PR #1013 head a63c58bb1b31ef994bdb04fd74a738b66cdf7f49; fresh proof-only branch ugp-cvi-1c21-ci-proof-20261010-r2; run 38038604335 in progress at checkpoint.
- All CVI implementation PRs remain draft and unmerged.

## New increment
- Draft PR #1017 https://github.com/intssere/SEO_ENGINE/pull/1017
- Head workstream/cvi-1c22-disposable-server-scope-pr1013-dependent
- Base workstream/cvi-1c21-db-scoped-context-resolver-pr1012-dependent
- Initial exact HEAD 02f8f2887708d24fbba6a7be7a051524573fec90
- Disposable proof-only branch ugp-cvi-1b4e-ci-proof-20261010-y
- Run 38038662350 in progress at checkpoint.

## What it executes
- Adds CVI-1C.22 test to lib/db/src/cvi-1b4o-disposable-acquisition-ledger.test.ts.
- Dynamically imports the actual CVI-1C.21 server-scope resolver from the API-server at test runtime to avoid cross-project TypeScript rootDir pollution.
- Executes the actual parameterized SQL against localhost disposable seo_engine_cvi_disposable with a historical nonce acquisition after dormant CVI 0012–0016 migrations.
- Ensures valid synthetic principal subject/session locates exactly tenant, site and Google read-only connection from DB.
- Denies invalid acquisition, mismatched subject/session, revoked site read grant, revoked organization membership, revoked session, revoked provider connection.
- Test restores each row after revocation and leaves database creation/drop to existing guarded CI script.

## Trust boundaries
- AuthPrincipal is synthetic test data, not a production user authorization.
- Database lookup grants no standing access capability. CVI-1C.16 independently checks current permissions again when historical readback occurs.
- No provider-origin authenticity, Google token verification, independently verified facts/licensing or publication rights are established.
- No live Google call, production migration, connection secret read, Express route, CMS publication, PR merge or deployment.

## Next
1. Verify exact-head terminal full CI for #1013 and #1017 and repair any failure.
2. Continue only after asserting the resolver can be wired to real authenticated session and requested acquisition without cross-tenant leakage or optional-auth bypass.
3. Preserve draft-only stack and fail-closed publication gates.

## Recovery checkpoint (2026-10-10)
- First PR #1013 proof (run 38038394937) failed two workspace unit tests because the ISO regex lacked the seconds component. The first repair added canonical parsing but unintentionally kept the malformed regex; run 38038604335 also failed.
- Corrected PR #1013 exact HEAD **6125e44de444224e79db0c5df71225b9507a3086** with `HH:MM:SS.mmmZ` canonical validation; fresh proof branch `ugp-cvi-1c21-ci-proof-20261010-r3`, run **38038832103**, full CI in progress at checkpoint.
- PR #1017 first proof run 38038662350 returned null at the valid fixture due to inherited malformed timestamp validation. An intermediate diagnostic run 38038765361 was created. Corrected PR #1017 exact HEAD **f565433baa29676a5f15580362371449e4944425**; proof branch `ugp-cvi-1b4e-ci-proof-20261010-aa`, run **38038837286**.
- **Actual disposable CVI PostgreSQL proof step for corrected #1017: SUCCESS**. Full CI still in progress at checkpoint. No production operations.
