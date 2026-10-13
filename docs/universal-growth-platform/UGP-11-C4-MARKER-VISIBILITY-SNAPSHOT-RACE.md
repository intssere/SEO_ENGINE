# UGP-11.C4 — Immutable marker visibility across snapshot boundaries

Certified UGP base `e3eba49407ab54e9f0af7f6aab2d543ff1f8f3ea`, post-merge CI #38400600963 successful.

A disposable-only PostgreSQL experiment first establishes a `REPEATABLE READ`, `READ ONLY` job snapshot. A separate connection commits an immutable attempt marker after that snapshot begins. The old transaction must not observe the later marker, and its zero-marker read is **partial**, not proof of absence or success. Reconciliation must require manual intervention and prohibit automatic retries, provider dispatch and production authority. A fresh transaction subsequently sees the new committed marker.

The test only certifies this bounded two-connection timing on an isolated local fixture. It does not establish production freshness, an authoritative negative read, automatic retry criteria, a mutation gate, replica behavior or provider authorization. The disposable observer adapter and production systems remain otherwise unchanged.

No main merge, production DB, provider writes, credentials, scheduler, P9 activation or deployments. Exact-head push and PR CI, separate merge authorization and post-merge UGP CI required.
