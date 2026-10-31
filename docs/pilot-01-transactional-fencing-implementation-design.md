# PILOT-01 — Transactional fencing implementation design (non-executable)

**Status:** Source-only proposal; no database execution or runtime authorization.
**Base:** canonical `main` at `5fc34a1fe384ebcf6bf089a234de8b195f65ee94`.
**Parent acceptance contract:** `docs/pilot-01-durable-authorization-fencing-contract.md` (#1256).
**Offline reference:** #1257. Neither the reference model nor this design certifies distributed correctness.

## Transaction boundaries and invariants

All inputs below are synthetic and conceptual. SQL snippets are **review examples only**, not migration instructions. Do not apply them to any database without a separate environment-specific authorization and schema review.

**Job record** (proposed): `job_id`, `tenant_id`, `site_id`, `status`, `generation BIGINT NOT NULL DEFAULT 0`, `owner_id`, `lease_until`, `result_digest`, `idempotency_key`, `updated_at`. Enforce tenant/site foreign keys, unique scoped idempotency keys, checked status enum, and generation >= 0. Database time is authoritative.

**Claim/takeover transaction:** serialize claims for a given job row using `SELECT ... FOR UPDATE`; only pending or expired active rows may be claimed; terminal jobs cannot be reclaimed. Advance `generation = generation + 1`, set owner and lease expiration using the **database clock**, emit an immutable claim event, and commit as one transaction. If the audit insert fails, roll back the claim. A claimant receives `job_id, generation, owner_id, lease_until` from the committed transaction. Generation never decreases or resets on retry.

**Renewal transaction:** a conditional `UPDATE` must match tenant, site, job, active status, owner, generation, and `lease_until > clock_timestamp()`. Renew only within bounded lease policy and append an audit event atomically. The caller-supplied timestamp never decides lease validity.

**Progress/artifact transaction:** require the same owner+generation+unexpired lease match inside the transaction before committing any progress, result digest, or output reference. Store canonical result and audit receipt atomically. A zero-row fenced update is a hard denial. Artifacts in external storage require a staged object plus transactional outbox/commit protocol; do not promote external effects prior to DB authorization.

**Completion transaction:** match active owner+generation+valid lease and require no existing terminal completion; atomically write terminal status and immutable receipt. A late old-generation worker must be unable to overwrite any result from a later generation.

**Revoke/consume transaction:** lock the grant row, verify trusted actor, tenant, site, operation, expiry, exact-diff digest when applicable, state unconsumed/unrevoked and relevant issuer trust. Insert audit receipt in the same transaction and update the grant once. Revocation and consumption lock the same row; transaction commit order determines outcome. Publish grants never arise by converting analysis grants, and every live mutation requires separate exact-action owner permission.

## Candidate PostgreSQL transaction sketch — not executable migration

```sql
-- Illustrative conditional commit; table/column names are conceptual.
BEGIN;
UPDATE pilot_jobs
   SET status = 'completed', result_digest = :digest, updated_at = clock_timestamp()
 WHERE job_id = :job_id AND tenant_id = :tenant_id AND site_id = :site_id
   AND status = 'active' AND owner_id = :owner_id
   AND generation = :generation AND lease_until > clock_timestamp()
RETURNING job_id;
-- Require exactly one returned row; otherwise ROLLBACK, no side effect.
INSERT INTO pilot_audit_events (...) VALUES (...);
-- Audit failure -> ROLLBACK.
COMMIT;
```

The sketch assumes trusted binding of scope and identity; merely matching strings provided by an HTTP client would **not** be secure. It also assumes the transaction rechecks the row state and that the successful update and audit insert occur on one connection/transaction. The illustrative audit SQL uses ellipses and is intentionally non-executable.

## Failure and concurrency evidence

- F01: two independent sessions try to claim the same pending job; exactly one first owner, later takeover increments generation.
- F02/F03/R02: force lease expiry and B takeover while A is paused; A's later progress/completion returns zero rows, B commits once.
- F04/F05: crash/restart before and after commit; no duplicated durable outcome, stable idempotency receipt.
- G01/G02: two sessions consume or revoke the same grant with deliberately interleaved locks; one committed order, no double spend.
- G03/G04/G05: expiration and trusted scope/operation/exact-diff validation at each protected action.
- R01: inject audit failure, connection abort, and serialization retry; no half-committed grant or job.
- Capture real test repetitions, row counts, transaction outcomes, audit sequences, and PostgreSQL server version, rather than solely in-process assertions.

## Required review before schema authoring

1. Map conceptual fields to actual `jobs` and authorization schemas; do not assume `pilot_jobs` exists.
2. Decide whether `READ COMMITTED` plus row locks/conditional updates suffices for each invariant; use SERIALIZABLE + bounded retries if cross-row invariants demand it.
3. Threat-model tenant scope, database role privileges and RLS; prohibit client-controlled identity claims.
4. Specify outbox delivery fencing and receipt uniqueness for any effect outside a single PostgreSQL transaction.
5. Design a migration compatibility/rollback plan, feature flags default-off and a no-activation deployment gate.
6. Independently review with Tahseen; require separate owner approval for disposable DB creation, DDL, tests and every later production step.

**Current restrictions:** No dependencies, DDL, migrations, SQL execution, database access, OAuth, provider operations, live crawling, workers, deployment, AI proposal generation or public site writes are authorized by this document. Keep `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`.
