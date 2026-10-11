# UGP-11.C4 — Strict Lease Expiration Boundary (Disposable PostgreSQL)

Baseline: `initiative-universal-growth-platform` at `f0ac68d6551b8fb7ac1e038c00e8d4470c144d42` (post-merge CI successful). UGP transport issue #1061; P9 independent governance issue #1054 open.

The new isolated PostgreSQL fixture test verifies the lease takeover SQL predicate uses **strict inequality**. In each independent SQL transaction, `transaction_timestamp()` is captured once, then a fixture lease is assigned to precisely one second in the future, the same timestamp, or one second in the past. A conditional synthetic takeover inside that same transaction must change owner/fence/attempts only for the past timestamp. Expected fence 7→8 and attempts 1→2 for expired case; equality and future expiration must retain owner A, fence 7 and attempts 1.

This is synthetic fixture state only, not a P9-certified claim, worker, scheduler, or provider execution. The test uses an explicitly allowlisted loopback `/seo_engine_test` URL and existing `ugp11_transport_fixture` objects; fixtures cleaned after test. No production database DDL, migration or deployment.

Not covered: distributed clock skew, transaction commit uncertainty, genuine connection drop during COMMIT, reconciliation against an independent committed ledger, governance approval, positive-authority issuance, or actual dispatch. No conclusion about operational transport readiness is justified.
