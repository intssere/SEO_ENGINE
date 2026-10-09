# UGP-11.1D1 — Disposable PostgreSQL Transport Schema Candidate

**Status:** engineering-only migration fixture, review pending. No production schema migration or runtime activation.  
**Source baseline:** `initiative-universal-growth-platform` at `548059726d6335349f2d26670c8b29325a7d5716`.  
**Companion SQL:** `sql/UGP-11.1D1-DISPOSABLE-TRANSPORT-FIXTURE.sql`.

## Baseline findings

CI uses `postgres:17-alpine` and Node 22; existing P8.8 reservation tests use a strictly named ephemeral database and a distinct environment variable. This CI setup does not prove deployment runtime versions, exact image digest or pg-boss compatibility. The library remains conditional and is **not installed**.

## Why this is not an operational migration

The fixture SQL is outside `lib/db/migrations` and is never consumed by app bootstrap, start hooks, or migration discovery. It requires separately controlled manual application against a dedicated disposable Postgres database and has no scheduler, worker, route, timer, network, or provider path. Do not apply it to a shared fixture or production.

The `ugp11_transport_fixture` namespace owns one candidate `jobs` relation, intentionally distinct from existing P9, P8.8 mutation, UGP-10 outreach, and production job registries. The table enforces identity format, tenant/site/idempotency uniqueness, typed read-only job classes, schedule expiry and control bindings, claim shape, fence/attempt bounds and fixed lifecycle states.

**SQL constraints are necessary but not sufficient**: a future implementation must atomically recheck durable control, site authorization and claim fencing before dispatch. The database schema does not admit jobs. It does not supply row-level isolation policy, transaction locking, a lease-recovery protocol, trustworthy admission signatures, a dispatcher or a PG-boss adapter.

## Required follow-on evidence

1. Verify actual runtime Node and PostgreSQL versions, pg-boss exact package digest and dependency/advisory/license facts, and candidate schema migration scope; do not equate CI images with production.
2. Add a dedicated `UGP_11_EPHEMERAL_DATABASE_URL` test runner with a strong hardcoded allowlist for localhost and a designated disposable DB name. Never fall back to `DATABASE_URL`.
3. Apply the fixture explicitly only inside that test path, enforce expected empty namespace, and test DDL constraints and indexes against disposable PostgreSQL.
4. Design transactional `enqueue` with immutable envelope comparison and exact replay; unique idempotency conflict must fail closed.
5. Design `claim` with `FOR UPDATE SKIP LOCKED`, same-transaction durable P9 control verification, DB-clock window checks, monotonically increased fence and short lease. No provider dispatch from claiming.
6. Require worker- and fence-checked `complete`, `heartbeat`, and `unknown -> manual_intervention` updates with no blind retry.
7. Test two concurrent producers/claimers, stale/forked worker settlement, DB disconnect, lost response, forced lease expiration, control transitions, queue expiry, and uncertain external effects.
8. Until these pass, **UGP-11.1D operational concurrency certification is NOT COMPLETE.**

## Authorization boundary

No dependency installation, production DDL, deployment, worker startup, scheduler, job enqueue, external network access, public-site write, article publication, or outreach send is authorized by this fixture. Production automation admission remains **NOT_GRANTED**.
