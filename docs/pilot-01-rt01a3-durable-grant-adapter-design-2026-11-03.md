# PILOT-01 RT01-A3 — Durable Grant Adapter Schema Reconciliation & Transaction Design

**Date:** 2026-11-03  
**Canonical source baseline:** `09985b25a4761bb2a7f86977bf0fc4aff29a5f7b` (merged PR #1289).  
**Status:** DESIGN ONLY — no SQL execution, new migration, runtime adapter, external read, deployment, or provider authorization.

## 1. Why another test fixture is not the next bottleneck

The existing guarded disposable harness in `artifacts/api-server/src/lib/pilot-01-pg-fencing.ephemeral.test.ts` already rehearses conditional claim, stale-generation rejection, consume/consume and consume/revoke races, transaction rollback on audit failure, and a connection pool close/reopen. The `PILOT01_DISPOSABLE_PG` acknowledgement, local-only URL filter, and dedicated `pilot01_disposable_*` database naming rule guard those rehearsals. These tests prove only their own synthetic fixtures and do not implement a reusable adapter in the operational application.

PR #1289 adds a process-local grant model; its test deliberately demonstrates that restarting the fixture loses consumption history. The next proof requirement is aligning a trustworthy, durable adapter with the **actual** schema and source call-sites, not replicating an already exercised race under a differently named fixture.

## 2. Concrete schema mismatch on main

| Source | Observed schema / interface | Incompatibility with proposed grant model |
| --- | --- | --- |
| `lib/db/migrations/0001_core.sql` (`jobs`) | `id uuid`, nullable `site_id uuid`, `job_type`, `status` pending/active/completed/failed/cancelled, `payload jsonb`, `attempts`, `locked_at`, timestamps | No required tenant identifier, verified worker owner, monotonic generation, DB-authoritative lease expiry, authorization/grant ID, append-only grant receipt, or transactional outbox. Nullable site ID cannot by itself prove tenant scope. |
| `artifacts/api-server/src/lib/pilot-orchestration.ts` | `pg_advisory_xact_lock`, stale active job failure after elapsed `updated_at`, `pending -> active` and `setImmediate` dispatch | Existing job state changes are not bound to `Pilot01DurableFencingPort` or an authoritative grant receipt. The 20-minute stale-job recovery is not a generation-fenced worker cancellation guarantee. |
| `artifacts/api-server/src/lib/pilot-01-pg-query-candidates.ts` | Textual SQL candidates refer to `pilot01_jobs`, `pilot01_grants`, `pilot01_audit` | Conceptual names; none are established as tables in the canonical Production schema by these files. Conditional UPDATE is not an atomic update+audit transaction envelope. |
| `artifacts/api-server/src/lib/pilot-01-durable-fencing-port.ts` | `claim`, `renew`, `complete`, `consumeGrant`, `revokeGrant` typed methods | Interface only. It lacks trusted-principal provenance at the type boundary and cannot certify tenant membership, issuer authenticity, timestamps or durable receipts. |
| `artifacts/api-server/src/lib/pilot-01-atomic-grant-rehearsal.ts` | Process-local grant records and receipts | Not durable across processes; `issuer` is a synthetic string, not independently authenticated issuer evidence. |
| `docs/integration/int-02c-db-authority-source-audit.md` | Production database architecture and historical migration lineage remain unverified | No safe assumption that main/UGP schema history or migration checksums match any runtime target; do not author/apply a production migration based on a synthetic table. |

## 3. Proposed model — conceptual, not deployable DDL

A future independently reviewed **dedicated pilot namespace** should contain these logical records, with SQL types, indexes, RLS, migration, and schema ownership determined only after actual UGP/CVI schema reconciliation.

| Logical record | Required data | Invariants |
| --- | --- | --- |
| `grant` | Immutable grant ID, issuer ID/provenance, tenant, site, subject actor, operation `analyze` or `recommend`, explicit approved data-source set, provider budgets, issued/expires times, unique nonce, policy version/digest, state | Authentic issuer and site membership are verified server-side before insertion; exact immutable scope. Default-deny for absent grants, unsupported operation, expired or revoked state; no `site_write` path in this workstream. |
| `grant_receipt` | Stable immutable receipt ID, grant ID, type (issued/consumed/revoked), actor, tenant, site, DB time, authorization lineage, transaction identity, idempotency key | Successful consumption or revocation and its receipt commit **in one transaction**. Replayed/conflicting receipt is not a new authorization. |
| `pilot_job` | Site+tenant+grant, job ID, owner worker ID, monotonic generation, lease expiry, status, bounded source policy, progress, immutable result digest | Claim, renewal, progress and completion require the matching generation and DB-authoritative unexpired lease; old worker cannot update accepted state. |
| `pilot_job_receipt` | Immutable claim/renew/progress/complete/deny record with exact fence | Same-transaction audit, including failed audit => rollback of job mutation. |
| `pilot_outbox` (future only) | Deterministic effect ID, job generation, grant ID, source policy, delivery status, idempotency key | No network effect from a raw job update; delivery revalidates live scope, permission, lease and source limits. No write-provider outbox in the read-only pilot phase. |

**Schema ownership decision:** reject both (a) silently extending generic `jobs` with unverified semantics and (b) independently creating `pilot01_*` tables on live DB from a test fixture. Require a reviewed migration and compatibility mapping, including foreign keys, RLS and rollback.

## 4. Transaction envelopes that must be proved

**Consume grant:** obtain verified principal/site/issuer context from server authentication (not a POST body), begin DB transaction, lock or conditionally update exactly one active grant using DB time and immutable operation/source policy, insert immutable consumption receipt in the same transaction, commit, and return a stable receipt reference. Zero affected rows => `denied`, audit/storage errors => `unavailable`; neither case can enqueue.

**Revoke:** serialize with consumption on the same authoritative grant row, require revocation authority independent of possession of a nonce, append revocation receipt in the same transaction. Once consumption wins, late revocation cannot retroactively certify cancellation of an already running job: a separate job cancellation/fencing protocol is mandatory.

**Queue claim/renew/complete:** authorize a pre-existing job bound to the consumed grant and exact site; claim updates the monotonic generation and lease under DB time. Persist output and audit only for unexpired matching owner+generation. A reaper or restarted worker must not treat an expired record as proof the previous process stopped. Every externally consequential source read needs fresh approved source checks at dispatch.

**Ambiguous commit acknowledgment:** network timeout after COMMIT is not proof of failure. Retry only via stable idempotency key and authoritative receipt lookup; do not issue a new grant or duplicate a job based solely on a timeout.

**Failure injection:** audit insert fails => grant/job update rolls back; failed grant read, invalid issuer, missing tenant relation, expired grant, stale generation, cancellation, DB outage or mismatched schema => deny/unavailable, never fallback to in-memory success.

## 5. Test acceptance plan after separate owner approval

1. Provision **only** a fresh disposable localhost PostgreSQL database under the existing sentinel, isolate schema and clean up in `finally`. No Railway, restored, staging, Production, Neon, Shopify, Google or internet.
2. Test two independent PostgreSQL sessions consuming one grant, one consumption racing one revocation, and audit failures rolling back both state and receipt.
3. Kill/restart a fixture worker process after grant consumption, during an uncommitted transaction, and after a committed transaction with lost acknowledgement. Reconcile receipts rather than returning grant authority twice.
4. Test tenant/site/actor/issuer mismatch, missing role, malformed/forged grant, over-limit provider budget and absent DB binding. Verify zero downstream queue/dispatch callbacks.
5. Bind an isolated mock queue to a **reviewed** durable grant receipt, then test expired owner takeover and stale worker rejection at persistence/outbox.
6. Certify source SHA, schema/migration checksum, PostgreSQL version, test DB identity, CI logs, negative counts, independent review, cleanup and explicit owner authorization before any runtime integration.

## 6. Exact proposed next engineering slice

**RT01-A3a:** prepare a no-I/O TypeScript adapter contract for `TrustedGrantContext` and `DurableGrantReceipt`, with schema-neutral typed failure results, plus source-only negative tests ensuring absence of client-supplied authority. That step should be isolated and unbound.

**RT01-A3b, separately authorized:** implement a real SQL transaction adapter on an explicitly disposable local database only after UGP/CVI schema reconciliation and dedicated test approvals. Changes to migrations, Production database identity, runtime routes, OAuth, workers or public-site provider calls are out of scope.

## 7. Non-authorizations

This design does not grant a new live pilot, DB access, migration execution, write scopes, token refresh, GSC OAuth, Shopify/GSC/GA4 acquisition, public crawl, autonomous recommendation generation, worker/scheduler startup, deployment, or any DiamondShelf.us mutation. Keep `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`. Main CI passing or this document merging cannot certify current runtime state.
