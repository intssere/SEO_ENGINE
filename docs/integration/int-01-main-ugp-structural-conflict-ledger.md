# INT-01 — Main + UGP isolated integration conflict ledger (2026-10-11)

**Status:** Source-tree analysis AND actual isolated GitHub Actions `git merge-tree` simulation complete. Six textual conflicts confirmed; combined tests **not executed**. NO integration certification or merge admission.

## Frozen refs
- Canonical main: `a19cd21da5d60dbb1862867ce0cdade4746791be`.
- UGP: `a6e492f1b9f0332fda2d518cfb4ad51c61b56460`.
- Merge base: `1f03834d976b73b64c9d7eede79b9535cfb32e68`.
- Isolated work branch: `integration/int-01-main-ugp-offline-simulation` (created at main; UGP branch and main remain untouched).

## Method and limitations

Obtained the **uncapped, non-truncated recursive blob trees** of the three commit refs from GitHub's Git Trees API. Compared each path's blob SHA to the merge-base blob SHA, including additions/deletions. GitHub compare's 300-file cap was **not** used as a complete path inventory. The execution environment could not resolve github.com for a local `git fetch/clone`, therefore **no true git merge-tree/merge-index run, no conflict markers, no combined checkout, no pnpm/CI/DB fixtures** were executed. The counts below are structural overlap, **not confirmed Git text conflicts**.

- `main` blob paths: **1,553**; UGP: **1,712**; merge-base: **1,216**.
- Different final blob content on either side: **861** paths.
- Both branches changed the same path relative to base and final blobs differ: **8** paths (below).
- Only main changed (vs base) among differing paths: **337**.
- Only UGP changed (vs base) among differing paths: **516**.

The 8 overlapping paths requiring 3-way content reconciliation:
1. `.github/workflows/ci.yml` — main P12.2 CI contracts versus UGP CI coverage; merge triggers and checks.
2. `Dockerfile` — main digest-pinned base/runtime images versus UGP unpinned images and migration COPY; retain supply-chain pinning and evaluate UGP migration loading.
3. `artifacts/api-server/build.mjs` — main adds numerous P12.2 executable entry points; UGP adds `ugp-10-33-*` binaries. Require merged entry-point union and build tests.
4. `artifacts/api-server/package.json` — scripts/dependencies need lockfile/production build verification.
5. `artifacts/api-server/src/lib/railway-deployment-adapter.test.ts` — provenance/deployment regression assertions differ.
6. `lib/db/package.json` — migration/bootstrap command and dependency conflicts.
7. `lib/db/src/runtime-bootstrap.test.ts` — both schema families have expectations and fail-closed cases.
8. `lib/db/src/runtime-bootstrap.ts` — main contains P12.2 schema states through expected-absence 43-table Production; UGP introduces UGP-10 outreach table states. Must preserve both, never treat one schema state as another based solely on count.

## Actual Git merge-tree result (subsequent certification)

- Isolated GitHub Actions workflow: `.github/workflows/int-01-merge-tree.yml`; run **38119787505**, job **114411962240**, GitHub Actions conclusion SUCCESS **for diagnostic execution**.
- Pinned exact heads and merge base passed merge-base equality check.
- Executed `git merge-tree --write-tree --messages MAIN UGP`; exact tool exit code **1** (conflicts), not zero. The diagnostic job intentionally reports success for executing the simulation; it is **not** a merge-ready PASS.
- **Six confirmed textual conflicts**: `.github/workflows/ci.yml`, `artifacts/api-server/build.mjs`, `artifacts/api-server/package.json`, `lib/db/package.json`, `lib/db/src/runtime-bootstrap.test.ts`, `lib/db/src/runtime-bootstrap.ts`.
- Git auto-merged `Dockerfile` and `artifacts/api-server/src/lib/railway-deployment-adapter.test.ts`; both remain required semantic review.
- Migration namespace collisions **0008–0011** remain independent P0 semantic conflicts, even without Git conflict markers.
- The merge operation did not commit, push, update `main` or UGP or alter Production.
- Full combined tree build/typecheck/tests are still **NOT RUN**. Do not interpret GitHub Actions green status as integration approval.

## P0 semantic collision — migrations

Both branches independently assign migration numbers 0008 through 0011 to **different** schema families:
- MAIN: 0008 first-party crawl L2 invocations; 0009 bounded pilot phase; 0010 terminal-failure recovery; 0011 expected-absence disposition.
- UGP: 0008 authority outreach review; 0009 outbound safety ledger; 0010 single-send execution; 0011 controlled HTTPS certification.

Distinct filenames can be auto-unioned by Git while still producing an invalid **migration identity/ordering/ledger conflict**. INT-02 must establish canonical, noncolliding names, installed-migration tracking semantics, dependencies, schema recognition, and verified negative tests on disposable PostgreSQL **before** any DDL. Do not rename an already-applied Production migration in place without explicit lineage remediation design.

## Additional high-risk boundaries

- Main's newer P12.2 crawlers, run receipts, image workflow and effective baseline must not be overwritten by UGP files.
- UGP supplied-evidence analysis must not synthesize absent per-URL Packet 014 fields or claim raw crawl certification.
- Authentication/RBAC/session behavior, CI, lockfile, runtime bootstrap, exact Production image provenance, default-off writes, provider secrets, schedulers and tenant isolation need cross-branch regression checks.
- GitHub merge `ahead/behind` does not prove functional conflict quantity.
- A combined CI success would still not certify a live Diamond Shelf run or Production database authority.

## Suggested gate order

**INT-01 actual simulation**: Completed on GitHub Actions at pinned refs; six confirmed content conflicts. Next, resolve these conflicts only inside the isolated integration workstream, with explicit migration namespace/schema review before combined builds. No promotion to either canonical branch.

**INT-02**: Independently design and test migration re-index/namespace and durable migration ledger; never use a casual rename.

**INT-03**: Resolve the eight overlapping paths with main's P12.2 semantics as minimum preservation requirements.

**INT-04**: Build/typecheck/test full combined source, focused crawl and UGP fixtures, isolated PostgreSQL 17 AND parity checks against 18 as warranted, auth/tenant boundaries and browser critical paths; report outcomes, do not infer PASS.

**INT-05–08**: Reuse existing `crawl-history-effective-baseline.ts` and UGP `universal-read-only-site-analysis.ts`, validate actual persisted field mapping, and run isolated read-only UI demonstration before separately authorized Production evidence access.

## Disposition

`STRUCTURAL_THREE_WAY_INVENTORY_COMPLETE`; `ACTUAL_GIT_MERGE_TREE_CONFLICTS_CONFIRMED_6`; `EIGHT_SHARED_DIVERGENT_PATHS_REQUIRE_RECONCILIATION`; `MIGRATION_NAMESPACE_P0`; `COMBINED_TESTS_NOT_RUN`; `PRODUCTION_UNCHANGED`.
