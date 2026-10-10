# CVI-1C.29 — Concurrent Authorization Revocation Certification

Predecessor: CVI-1C.28 PR #1035, exact HEAD 41121aeab64bf4ce875ec36ecf5a2752fe35f679, successful workflow 38047480943.

## Design
Extend the existing real disposable PostgreSQL private-composition test with two separate database connections. Hold an authorization revocation transaction open for site read grant, organization membership, Google connection, and site activation. Confirm a concurrent private composition read cannot complete while that row is locked; commit the revocation and require DENY. Restore each synthetic grant afterward and reconfirm the historical review-only result. Test completes with original session revocation denial.

The test is runnable only with explicitly allowlisted localhost seo_engine_cvi_disposable and the existing proof-only CI step; no real provider calls, production database use, public route, publishing, merge or deployment.

## Limitations
The certification targets revocation before the scope resolver's SQL read. It does not prove atomicity of the two separate statements or eliminate the window between an initial eligible read and a later revocation. The second scoped read independently rechecks authorization. All successful outcomes remain UNTRUSTED_HISTORICAL_REVIEW_ONLY and not provider-verified.

Status: implementation committed, exact-head CI pending.
