# PILOT-01 RT01-A9 — Disposable cross-process and crash certification

## Authorization and execution boundary
Owner approved **isolated disposable PostgreSQL crash-recovery and cross-process synthetic tests only**. No Production/staging database, restored instance, existing-environment migrations, merge, deployment, providers, worker execution or public-site writes. GitHub source code and an isolated Actions `postgres:17-alpine` service are the only intended environments. Replit unchanged; Railway unconnected and uncertified.

This PR contains an explicitly guarded ephemeral fixture, and a separate short-lived **synthetic test subprocess**, not a job worker. The subprocess only connects to the disposable loopback PostgreSQL server to contend for one test grant, perform test-only fixture SQL, or withhold an already-committed receipt. It cannot dispatch a real pilot.

## Tested controls
1. Two independent **OS processes** contend for the same grant and idempotency key. One commits, the other returns `already_committed`; job and receipt counts remain one.
2. Separate OS processes contend with **different keys** for one grant. Exactly one commits, the other denies; job and receipt counts remain one.
3. A synthetic subprocess opens a transaction, updates an issued grant and inserts a job, then is forcibly terminated **before COMMIT**. PostgreSQL must roll back both uncommitted changes and release locks. The read-only reconciliation outcome is `unresolved`, not authority to retry. A **separate explicit test action** then demonstrates one valid admission remains possible.
4. A subprocess completes the database transaction but deliberately withholds the receipt from its parent. A fresh primary-database read of the durable admission receipt reconciles it, and a same-key replay returns `already_committed` with no additional job. **This is a client-acknowledgement withholding simulation, not a true transport-level loss of COMMIT acknowledgement.**

## Guardrails
- Both `PILOT01_DISPOSABLE_PG=I_ACKNOWLEDGE_DISPOSABLE_ONLY` and `PILOT01_DISPOSABLE_DATABASE_URL` are required.
- Only loopback, PostgreSQL user `postgres` and `pilot01_disposable_*` databases pass the parent and child guards. The test schema must match `pilot01_test_[0-9a-f]{32}`.
- Each test fixture uses a newly generated unique schema, synthetic identities and synthetic grants; all schema changes occur **only in the disposable CI database** and are dropped on completion.
- No code is wired to the operational `routes/pilot.ts`, scheduler, worker, provider or startup modules.
- This evidence does not authenticate a real user, reconcile the canonical UGP/CVI schema, certify a Production database binding, implement production retry/reconciliation, or prove runtime lease/outbox fencing.

## Remaining gaps
A true loss-of-COMMIT transport fault must be tested at the database-protocol boundary. OS-process termination at additional precisely instrumented commit stages, PG server disruption and network-partition conditions remain unproven. Automated test coverage does not certify actual migration provenance, live session enforcement, site membership, issuer custody or any deployment.

Require **Standard CI SUCCESS**, **RT01-A9 disposable PostgreSQL CI SUCCESS**, formal **Tahseen APPROVED** at exact PR HEAD and separate owner exact-HEAD merge authorization. Keep `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`.
