# PILOT-01 RT01-A12.20 — isolated atomic custody serialization

## Authorization and exact execution boundary
Only fresh empty `pilot01_disposable_rt01a12_20_ci` PostgreSQL 17 created by a dedicated GitHub Actions service with synthetic password, exact sentinel, loopback-only URL, postgres user/5432, and pre-DDL attestation of empty tables/other schemas/roles/extensions. No use of existing, customer, Railway, staging, restored or production databases. No runtime imports, public-site writes, operational SQL/migrations, provider operations, worker activation or deployment. Draft PR is unmerged.

## Reuse ledger: no duplicate schema or integration
- Canonical `0001–0011` and A12.1, A12.14, A12.16 SQL candidates are replayed unmodified **only within CI disposable PG**.
- A12.8 `TransactionCustodyPort`, `TransactionRequest`, `validTransactionRequest`, `evidenceMatches`, and `DisconnectedTransactionContract` are reused.
- A12.4 `AdmissionReceipt` is reused for existing grant/job/admission/event schemas.
- A12.5's earlier disposable adapter remains unchanged; A12.19 identified its preflight/transaction TOCTOU. A12.20 introduces one isolated transaction-bound adapter instead of duplicating schema, roles, or operational route wiring. Only the minimum insert/update SQL required to perform atomic custody admission is local to this adapter.
- A12.7/A12.13/A12.18/A12.19 remain unchanged; existing fixture validation and unsupported runtime paths are preserved.

## Transactional lock and validation order
1. Validate strict request shape; open one PostgreSQL transaction.
2. Deterministic, sequential `FOR UPDATE` row locks on `public.auth_sessions` (session ID), `public.sites` (site ID), `pilot01.tenant_memberships` (organization/subject), `pilot01.issuer_custody` (issuer ID), and `pilot01.grants` (grant ID + full scope). Locks remain held through COMMIT or ROLLBACK.
3. After acquiring row locks, obtain `clock_timestamp()`; check session active/unrevoked/operator+, site/organization identity/active, membership role/active/revision/expiry, issuer actor/site/org/operation/provenance/active/revision/expiry, and grant exact tenant/scope/provenance/state/expiration.
4. Serialize scoped idempotency key with transaction-level advisory lock; check for existing receipt. Conflicting fingerprint/tenant/scope returns conflict, matching replay returns existing receipt.
5. Consume grant, create `pilot01.jobs`, immutable `pilot01.admissions` receipt, and `pilot01.job_events` atomically in the same transaction. A failed event insert rolls back all writes.
6. Return `commit_unknown` on exceptions/transport ambiguity. Read-only reconciliation refuses to claim original revision evidence when it is absent from the persisted receipt.

**Ordering and race model:** a regular membership, issuer, site or session UPDATE must obtain the same PostgreSQL row lock and therefore cannot commit between custody validation and admission COMMIT. If UPDATE acquires the lock first, admission waits and then observes revocation/revision change and denies. If admission acquires first, revocation waits and may commit only after admission COMMIT. This is a transaction-order guarantee, **not** ongoing worker authorization after admission.

## Synthetic tests and limitations
- Committed grant/job/receipt/event exactly once, same key replay and mismatched conflicting key.
- Cross-tenant, wrong site, wrong issuer, operation mismatch and stale membership/issuer revision denial.
- Session revoked/expired denial.
- Injected event insert failure and atomic rollback of grant, job and admission.
- Both membership race orders: admission-first blocks revocation until COMMIT; revocation-first blocks admission until revocation COMMIT.
- Issuer-first revocation race denial.
- No provider dispatch, no worker actions, no public-site writes.
- Tests run under synthetic PostgreSQL superuser and **do not** certify operational RLS policy/roles, malicious privileged bypass, DDL/TRUNCATE, issuer provenance authenticity, actual human authorization, secure token issuer, historical migration authority, deadlock behavior across other unknown code paths, or pooled production isolation.
- This adapter is not exported by `@workspace/db` and must never be wired into operational API/runtime or existing databases under this authorization.
- Authenticity and operational security require separately reviewed least privilege, tenant RLS, trusted session/issuer roles, target-bound migration receipts, hardening of revocation update writers, secure queue/worker fencing and dedicated cutover authorization.

## Governance
Exact-HEAD Standard CI SUCCESS + dedicated PG17 CI SUCCESS + Tahseen formal GitHub APPROVED + zero unresolved threads + separate owner exact-HEAD merge authorization are required for merge. No operational rights follow from merging source-only code.
