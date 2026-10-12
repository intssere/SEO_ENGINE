# CVI-1C.66 — Disposable Two-Row Synthetic Lock Order

## Objective
Test **consistent synthetic plan → grant row ordering** with two independent PostgreSQL connections inside the existing proof-branch-only disposable authentication-session suite. This tests a particular concurrency primitive, not the actual `action_plans` handler or site-grant authorization contract.

## Implementation
A disposable shared test table contains two rows representing a synthetic plan (id 1) and synthetic grant (id 2). The holder begins a transaction and takes `FOR UPDATE` on plan then grant. The contender starts its transaction, takes plan then grant in the same order, and updates the synthetic grant marker. A synchronization barrier and bounded unsettled assertion verify that the contender cannot finish while the holder owns the locks. The holder commits, the contender completes, and the final marker is verified.

The test uses `lock_timeout='3s'`, connection cleanup in `finally`, and drops the synthetic table. It runs only in the explicit `seo_engine_cvi_disposable` proof-branch fixture.

## Limits
- This does **not** prove freedom from deadlock across the application's real multi-handler call graph.
- The rows do not belong to `action_plans` or `cvi_site_read_grants`; no `edit_draft` permission exists in the dormant ACL.
- No revocation, expiry, IDOR, authorization, or production-readiness claim follows from this test.
- Existing database/security/product sign-off blockers in CVI-1C.59–1C.63 remain unchanged.

No production database access, migration activation, provider/crawler/CMS calls, merge, or deployment is authorized by this increment. Exact-head CI is required.
