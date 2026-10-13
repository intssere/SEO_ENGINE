# UGP-11.C4 — Explicit SQL Read-Only Independent Observer

Certified starting commit: `3126fe2340f18138306b44cd4dbbf2d6375894b8` (post-merge workflow #38390119028 successful).

The disposable independent PostgreSQL observer already used a `REPEATABLE READ` transaction and only `SELECT` statements. This increment sets `SET TRANSACTION READ ONLY` immediately after opening that transaction, before non-locking snapshot reads of the fenced job. This enforces the observation-only boundary at PostgreSQL transaction level rather than relying solely on application source inspection. PostgreSQL prohibits `SELECT FOR SHARE` in a read-only transaction, so this observer uses plain scoped `SELECT` under `REPEATABLE READ`. Concurrent writers are not blocked by this adapter; its transaction-consistent evidence can become stale after the observation closes. The separate disposable in-flight lock test certifies a different locking design, not the read-only adapter.

The isolated disposable PostgreSQL regression asserts `transaction_read_only = on` and that even a zero-row `UPDATE` is rejected by PostgreSQL; existing adapter tests continue to exercise the successful exact fenced-evidence path and fail-closed reconciliation.

This is local-fixture certification, **not** a production privilege audit or authorization for retries, dispatch, P9 activation, database changes, or deployment. The adapter remains disposable-only. Never merge into main in this workstream. Exact-head push and PR CI, explicit merge permission and post-merge UGP CI remain mandatory.
