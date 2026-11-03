# PILOT-01 RT01-A3c — Mainline schema and runtime authorization boundary review

**Baseline:** `c29cabbe4f4ff4e503571c263d088decf2db55cc` (merged PR #1292). **Scope:** static source inventory and fail-closed integration blockers only. No SQL, migrations, database connections, runtime changes, provider operations, or deployment.

## Source findings

| Area | Verified source location | Review finding and release blocker |
| --- | --- | --- |
| Disposable grant adapter | `artifacts/api-server/src/lib/pilot-01-pg-grant-disposable.ts` | Constructor accepts injected PostgreSQL client and only `pilot01_test_[a-f0-9]{32}` schema names. No live connection factory. Uses transactionally updated grant state plus audit receipt; belongs to synthetic test only, not an operational port. |
| Trusted context contract | `artifacts/api-server/src/lib/pilot-01-trusted-grant-contract.ts` | Context `source: "server_verified_session"` is merely a caller-supplied string. The injected `ServerAuthenticatedContextProvider` has no implementation proving actor, tenant membership, site authorization, issuer provenance, or delegated owner approval. A `consumed` result from a mock must never permit work dispatch. |
| Canonical schema | `lib/db/migrations/0001_core.sql` `jobs` table | Generic `jobs.id` and `site_id` are UUIDs, `site_id` is nullable; state is `pending/active/completed/failed/cancelled`. No tenant ID, grant ID, owner worker ID, generation fence, lease expiry, outbox, or immutable grant receipt. Do not import the disposable adapter against this table. |
| Operational pilot queue | `artifacts/api-server/src/lib/pilot-orchestration.ts` | `enqueue` uses `DATABASE_URL`, advisory lock per site, generic `jobs` with `pilot_ingestion_v1`, 20-minute `updated_at` stale recovery. `launchQueuedPilot` uses `setImmediate` and invokes `runProductionPilot` after a pending→active state update. There is no verified durable grant receipt, generation-fenced lease, or outbox at this call site. |
| API authorization | `artifacts/api-server/src/routes/pilot.ts` | GET `/pilot/authorization` issues a five-minute signed token + cookie; POST `/pilot/run` checks same-origin, header/cookie equality and signature, then calls `enqueueProductionPilot`. The route does **not** call the new durable-grant adapter. A signed token and cleared cookie are not evidence of durable single use across requests/processes; per-request actor/site/tenant binding remains unproven. |
| CI isolation | `.github/workflows/pilot-01-disposable-fencing.yml` | PostgreSQL 17 CI test service and synthetic `pilot01_disposable_ci` database; tests require explicit environment sentinel and local-only URL. Success proves the fixture, not canonical schema, live provider access, or runtime authorization. |

## Critical integration blockers and severity

1. **STOP — unauthenticated grant provenance:** there is no trusted server-only issuance and verification chain binding account, membership, site, issuer and operation to a durable grant. Client-chosen fields or test marker can never confer authority.
2. **STOP — route-to-job authorization gap:** the route's signed short-lived token is not the proposed persistent grant; existing enqueue and worker claim paths do not validate a durable consume receipt. Merely importing a successful adapter into the route would not enforce single-use at queue/worker boundaries.
3. **STOP — incompatible persistence schema:** canonical `jobs` and synthetic `grants/audit` have different identities and state semantics. A migration plan must resolve actual UGP/CVI lineage and tenancy, not assume a fresh disposable test schema represents the installed Production schema.
4. **STOP — stale-worker fencing and effects:** existing 20-minute stale run update is not proof that a prior worker has stopped; no generation-fenced progress/commit or transactional outbox is attached to the pilot runner. A durable grant alone is insufficient.
5. **STOP — cancellation and revocation:** revocation of an unconsumed grant is not an authenticated cancellation of an already consumed/running job; job cancellation and provider read admission require separately enforced checks.
6. **STOP — database authority and rollout:** current database resource identity, migration ledger and runtime environment binding are not certified by source. No Production/staging inspection, DDL, feature switch, or deployment may be inferred from disposable CI.

## Required next proof artifacts (ordered)

**A. Trust mapping (source-only):** enumerate session authenticator, role/membership storage, site ownership and signer custody; define a context factory that does not accept actor/site/tenant/issuer from HTTP input. Review with security owner before binding any route.

**B. Transaction/schema plan (source-only):** schema ownership, separate `pilot01` namespace, grant row/receipt unique constraints, immutable issuance provenance, DB-clock TTL, tenant/site FK + RLS/permissions, migration ledger reconciliation and rollback. No live migration or generic `jobs` mutation in this phase.

**C. Operational admission model (mock-backed):** queue acceptance and worker claim require both verified grant consumption and the exact bounded site/source policy, plus fenced owner/generation and idempotency. Fail closed on lost acknowledgements, DB unavailable, malformed receipt or stale worker. No live dispatch.

**D. Disposable integration certification (requires separate authorization for any additional DB execution):** two independent processes, lost COMMIT acknowledgement/reconciliation, issuer spoofing, tenant cross-scope, audit failure, revoke/consume race, expired grants, and stale worker outbox denial on isolated PostgreSQL. Existing single-machine two-session tests are not process-crash proof.

**E. Future deployment gates:** immutable image/environment certification, least-privilege provider consent, live read-only pilot boundary, independent CI/Tahseen approval, exact owner authority for migrations, runtime wiring, and launch. Site writes and AI proposals remain disabled.

## Authorization statement

This document is analysis only. It does not authorize a DB connection, schema migration, real identity issuance, queue modification, worker activation, Shopify/GSC/GA4 reads, crawling, OAuth, deployment, autonomous operation or public-site writes. Maintain `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`. The applicable `AGENTS.md` governance remains controlling.
