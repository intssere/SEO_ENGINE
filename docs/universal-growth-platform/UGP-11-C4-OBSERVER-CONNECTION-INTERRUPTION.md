# UGP-11.C4 — Disposable Independent Observer Connection Interruption

Baseline: `db3a0a0aa1152d47597dc27fb1c414cc8a426bde`. Post-merge CI workflow `38255507938` completed successfully.

## Narrow experiment
A PostgreSQL test opens a dedicated independent observer transaction, identifies its own backend PID, waits until that exact connection is executing `pg_sleep`, and uses a separate administrative fixture connection to terminate **only that observed PID**. The in-flight observation must reject. The existing pure reconciler must classify unavailable evidence as `manual_intervention_required`, with no automatic retry, provider dispatch, or production authority.

The URL must be PostgreSQL on `127.0.0.1` or `localhost`, port `5432`, database `seo_engine_test`; absent environment skips. This is a disposable CI fixture, not permission to terminate an arbitrary application or Production database backend. The test performs no schema or application-row writes.

## Explicit certification boundary
This proves a real interrupted read fails, and that a separately supplied unavailable evidence tag is rejected by the existing pure policy. It does **not** establish a production PostgreSQL observer implementation, automatic mapping from driver errors to EvidenceSnapshot, caller snapshot authenticity, replica freshness, recovery ordering, or multi-session error handling. Those remain separately scoped future increments.

Never merge without successful exact-head push and PR CI, and explicit exact-head authorization. Require successful post-merge UGP CI before the next increment. No main merge, deploy, Production DB, credential/provider operations, autonomous retries, scheduler, or P9 grant.
