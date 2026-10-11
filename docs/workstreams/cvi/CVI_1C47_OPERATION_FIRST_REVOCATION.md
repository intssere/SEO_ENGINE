# CVI-1C.47 — Operation-First Revocation Ordering

Parent draft PR #1090 CVI-1C.46 implementation repair SHA `d6e511cf781dd37b898b7927e5d53fdacb5376a4`, full exact-head CI pending at https://github.com/intssere/SEO_ENGINE/actions/runs/38134471492.

## Bounded regression
An eligible synthetic admin session is locked via `SELECT ... FOR UPDATE` in a disposable PostgreSQL operation transaction. A second connection starts a revocation update and waits for the row lock; `pg_stat_activity` confirms the lock wait. The earlier operation transaction commits, revocation completes, and a subsequent privileged HTTP request with the revoked session returns 401. No actual business write is performed.

## Limitations
Test only: no production mutation handler changed. The revocation-first ordering belongs to CVI-1C.46. The combination models both authorization/revocation lock orderings, but does not certify the integration of a real write transaction, rollback, tenant/site authorization or provider behavior. Full exact-head CI required. No production DB, external providers, CMS publication, merge or deployment.
