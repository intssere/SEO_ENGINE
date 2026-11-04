# PILOT-01 RT01-A7 — Disposable PostgreSQL atomic admission certification

## Scope and limits

Authorized: implementation and synthetic concurrency tests against a **newly created, isolated disposable PostgreSQL instance only**. GitHub source work, draft PR, CI. Absolutely no staging/Production access, existing database migration, deployment, merge, provider operation, or public-site write. Railway remains an intended, uncertified deployment target; Replit unchanged.

The RT01-A7 adapter is **test-only** and explicitly disconnected from runtime routes, OAuth/session wiring, startup, workers, provider APIs and persistent migrations. Its constructor accepts an injected SQL client and a strict generated schema name; it creates no connection. The test suite is skipped unless **both** `PILOT01_DISPOSABLE_PG=I_ACKNOWLEDGE_DISPOSABLE_ONLY` and `PILOT01_DISPOSABLE_DATABASE_URL` are supplied. The URL guard requires loopback, postgres user and `pilot01_disposable_*` database naming; the CI workflow provisions an isolated postgres:17-alpine service and synthetic data.

## Transactional behavior tested

One PostgreSQL transaction locks the scoped grant, checks tenant/actor/site/issuer/operation and DB-clock expiry, performs conditional consume, inserts a single `pending` job, and inserts the receipt/audit row. Unique constraints protect grant-to-job, grant-to-admission and idempotency-to-admission association. Repeated requests for the same key/grant/scope return the same persisted receipt, while mismatching scope or keys deny. Exceptions roll back all changes and return unavailable.

Disposable tests cover independent connection pool concurrency with equal and conflicting keys; SQL-injected failure immediately after grant consume, job insert and receipt insert; malformed/expired/cross-scope grants; and receipt table constraint failure. No worker is launched.

## Remaining certification gaps

- This uses newly created **fixture-only tables**, not certified UGP/CVI schema or migration lineage. No production migration is included.
- A source `server_verified_session` marker **does not prove** live authentication, session enforcement, tenant membership or durable issuer custody.
- Lost COMMIT acknowledgement and interrupted TCP sessions require separate deterministic reconciliation and process-crash tests. The adapter returns unavailable on errors; same-key recovery is *modeled by successful replay*, not fully proven during transport loss.
- Concurrency coverage uses independent database pools within a single test process. A two-process/crash matrix and worker lease/outbox fencing remain outstanding.
- Atomic admission receipts are not execution authorization; runtime integration and operational authorization are separate gates.
- GitHub CI and formal Tahseen approval must succeed before the owner may issue a separate exact-HEAD merge authorization.

Keep `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`; do not wire this fixture to `routes/pilot.ts`, `pilot-orchestration.ts`, worker or provider code.
