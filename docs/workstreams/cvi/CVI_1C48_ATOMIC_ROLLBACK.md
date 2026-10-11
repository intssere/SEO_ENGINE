# CVI-1C.48 — Atomic Synthetic Mutation Rollback

Stacked on CVI-1C.47 draft PR #1091, parent documentation HEAD `79098a3dfd9ecb059669912fffd1a273d09a4600` (final CI pending).

## Implemented disposable regression
In a local disposable PostgreSQL test session, an eligible admin row is locked with `SELECT ... FOR UPDATE` and a synthetic temporary-table insertion is executed in the same transaction. The callback intentionally throws after the insert; PostgreSQL must roll back and leave zero rows. Following a committed demotion to viewer, a separately attempted authorized transaction must deny the insertion and the temporary-table row count must remain zero.

## Remaining scope
These checks establish test-only rollback and post-demotion denial, not production handler fencing, revocation/contention rollback, tenant/site authorization, or external provider operation safety. No real CMS mutation, no production database, no merge or deployment. Full exact-head CI is pending.
