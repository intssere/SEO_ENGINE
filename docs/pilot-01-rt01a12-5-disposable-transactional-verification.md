# PILOT-01 RT01-A12.5 — disposable PostgreSQL 17 transactional adapter verification

## Explicit authorization
Owner approved **only a fresh, empty, localhost/CI-disposable PostgreSQL 17 database with synthetic records**, on a dedicated branch and draft PR. No Railway, staging, restored, Production or customer database, operational migrations, runtime wiring, worker activation, deployment, provider operation, public-site writes or merge.

The proposed adapter `lib/db/src/pilot-01-rt01a12-5-disposable-transactional-adapter.ts` accepts an externally provided SQL client and a required synthetic-only constructor marker. It opens no connection on its own, is not exported by the DB package entrypoint, and is not referenced by any operational route or worker. The workflow creates a fresh PostgreSQL 17 service with synthetic credentials and read-only GitHub permissions. The test requires an explicit environment arming marker, loopback URL, named disposable database and PostgreSQL 17 + empty schema attestation before any DDL.

## Synthetic verification
- The harness creates only minimal synthetic canonical organization/site/session tables, executes the previously reviewed candidate SQL exclusively on the disposable test database, and removes the objects afterward.
- `admitAtomically` uses tenant + idempotency-key advisory transaction locking, DB-time expiration checks, conditional grant consumption, job creation, immutable admission and admission-event inserts in one transaction. Exact replay reads its existing receipt; conflicting grant/fingerprint/tenant/site/actor/session/issuer/operation is rejected.
- `reconcileAdmission` only SELECTs committed durable receipts; it never retries a write.
- A deliberately failing synthetic admission-event trigger forces the enclosing transaction to roll back. The caller sees `commit_unknown`, and a separate read-only reconciliation verifies the absence of a committed receipt.
- Fencing requires exact job, organization, site, owner, generation and an unexpired database-time lease. Transition and event append are one transaction. Stale-owner, wrong-generation, expired-lease and repeat-completion cases must fail.
- Outbox eligibility is hard-denied in this phase; no provider dispatch code exists.

## Critical limitations
- **This implementation is test-only, not authenticated runtime code.** The `server_verified_principal` marker is supplied by synthetic tests and must never be accepted from a browser or client. Session revocation, issuer custody, membership verification, RLS app roles and least-privilege DB ownership remain unresolved.
- No new operational migration is supplied, and the candidate is still outside `lib/db/migrations`.
- PostgreSQL advisory hash collisions serialize unnecessarily (safe but not a formally reviewed global lock strategy). Database uniqueness of `(organization_id,idempotency_key)` is independently required.
- Unknown COMMIT is conservatively `commit_unknown`; testing a true socket-loss-after-commit event and replay across process restart remains future scope. A thrown SQL statement does not prove transport ambiguity.
- This is not general worker scheduling. The test explicitly seeds a claimed lease; future `claim`/`takeover`/renewal CAS and authorization need separate acceptance tests.
- No exactly-once external dispatch semantics are demonstrated. `outbox_eligible` is refused, and public-site writes remain disabled.
- SQL candidate grants default-deny under RLS for normal app roles. Superuser-only test connections cannot certify production role policy.

## Merge gates
The branch must pass both exact-HEAD Standard CI and dedicated disposable PostgreSQL 17 CI, receive Tahseen's formal GitHub `APPROVED` review, and receive separate owner exact-HEAD merge authorization. A successful isolated test never authorizes runtime activation or migration.
