# UGP-11.C4 — Read-only observer snapshot during concurrent fence drift

Certified base: `473667eac6da83d9d1105b73e809c14ae725e0a4` (post-merge CI #38395127557 passed).

This disposable-only PostgreSQL test opens a `REPEATABLE READ`, `READ ONLY` independent observer transaction and reads a fenced job. A separate writer commits a fence, attempt count and owner advance before the observer reads again. The observer's non-locking repeatable-read snapshot must remain internally consistent while the writer is not blocked. Its reconciliation can classify the historical commit but must never authorize dispatch, retries, or production actions. After the observer transaction closes, a fresh read sees the advanced fence and must reconcile fail closed.

This certifies a bounded two-connection ordering on disposable PostgreSQL, not freshness after transaction close, production database permissions, a live retry gate, serializable semantics, remote replicas, provider authority or all concurrency interleavings. This deliberately differs from the earlier locking `FOR SHARE` test: the production-unwired disposable observer now uses non-locking reads because PostgreSQL prohibits `FOR SHARE` in a read-only transaction.

No main merges, deployment, Production DB, external providers, P9 activation, scheduler mutation or retry grants. Exact-head push and PR CI, explicit merge authorization, and post-merge CI are required.
