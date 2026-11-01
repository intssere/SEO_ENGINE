# PILOT-01 — UGP/CVI runtime boundary and certification map

**Status:** source-only integration inventory; NOT runtime certification, migration approval, provider access or live pilot activation.  
**Baseline:** canonical main `f0931da8a7a20e0575399c34a1eadf324128d9b2` after PR #1267.
**Security defaults:** `PUBLIC_SITE_WRITES_ENABLED=false`, `AI_PROPOSAL_GENERATION_ENABLED=false`.

## Evidence already implemented

| Area | Exact repository evidence | What it proves | What it does NOT prove |
| --- | --- | --- | --- |
| Port | `artifacts/api-server/src/lib/pilot-01-durable-fencing-port.ts` | Typed claim, renew, complete, consume, revoke contract and guarded complete/consume behavior | No durable implementation, credential provenance or route wiring |
| SQL | `artifacts/api-server/src/lib/pilot-01-pg-query-candidates.ts` | Conditional mutation predicates for owner/generation/TTL and scoped grant operation | Not a transaction envelope, schema, audit enforcement or deployed adapter |
| Disposable PG | `artifacts/api-server/src/lib/pilot-01-pg-fencing.ephemeral.test.ts`; `.github/workflows/pilot-01-disposable-fencing.yml` | Real temporary PG test sessions: claim/consume races, expired takeover, connection-pool reopening, unique key, audit rollback | Not actual process-crash recovery, production tenancy, outbox execution or live provider safety |
| Safety inventory | `docs/pilot-01-pg-fencing-safety-review-matrix.md` | P01–P10 unresolved implementation proof obligations | Passing synthetic tests does not close unrelated proof obligations |
| Pilot governance | `docs/pilot-01-diamond-shelf-integrated-autonomy-readiness.md` | Staged P0–P5 scope and explicit owner approval rules | No unattended Diamond Shelf crawl, recommendation generation, publication or provider activity authorized |

## Actual boundary mismatch to resolve before integration

1. **Identity:** `FenceScope` and `GrantScope` contain strings; authenticated tenant, site, actor, owner and grant issuer cannot be established by their type alone. The final adapter must take verified server-side context, reject caller-asserted authority and demonstrate cross-tenant denial.
2. **Schema:** the query candidates reference `pilot01_jobs`, `pilot01_grants`, `pilot01_audit`, whereas disposable tests create random-schema test tables `jobs`, `grants`, `audit`. The harness is not evidence of compatibility with an actual UGP/CVI database schema.
3. **Audit:** query candidates perform a conditional UPDATE only; required append-only audit inserts and rollback are a caller-owned, same-transaction obligation. The executable test duplicates a synthetic transaction envelope but does not constitute a reusable audited port.
4. **Effects:** a successful worker completion is not permission to issue a network call, update a remote resource, or publish. A generation-fenced transactional outbox, fresh authorization check at delivery and deduplication proof are prerequisites for effects.
5. **Retries and recovery:** the current recovery rehearsal closes and reopens a connection pool; it does not kill a worker process mid-transaction. Restart/cancellation/replay and delivery deduplication remain open.
6. **Policy:** a successful grant state transition is not proof of an authenticated issuer or an owner-authorized exact site modification. `site_write` must remain independently gated for the precise destination, operation and diff.
7. **Startup:** missing database, invalid grant provenance, unavailable audit, stale worker lease and disabled switches must all fail closed. CVI startup review and Production database access gates are separate workstreams.

## Source-only integration acceptance checklist

| Gate | Required negative/positive evidence before any runtime enablement |
| --- | --- |
| RT01 | Enumerate actual UGP queue, CVI worker, identity/session and authorization call sites at exact immutable source SHA |
| RT02 | Produce an authenticated-context-only adapter API; spoofed tenant/site/actor/owner/issuer input cannot grant access |
| RT03 | Review real table/index/RLS design and migration/rollback plan separately; no live database connections permitted under this document |
| RT04 | Implement atomic fenced claim, renew, progress, complete, consume, revoke, audit and outbox receipts in isolated environment only after separate authorization |
| RT05 | Show two-process lease takeover, deterministic cancellation and late-worker cannot generate an accepted outbox delivery |
| RT06 | Show per-tenant scoped idempotency on request, delivery and receipts; retry does not multiply external effects |
| RT07 | Demonstrate absent DB, expired grant, forged identity, conflicting revoke, audit error and missing secrets all result in deny/unavailable, never fallback success |
| RT08 | Confirm no live provider calls, GSC consent, autonomous jobs, AI proposals or public-site writes until individually approved gates |
| RT09 | Obtain CI evidence and independent formal review at exact PR head before owner-authorized merge |
| RT10 | Separately verify immutable deployment image and environment identity before any eventual live read-only pilot; do not infer deployment from merged source |

## Next permitted activity

Continue source-only interface inventories and mock/disposable tests. Propose a separately reviewed **non-Production** adapter implementation and migration plan without running it against Railway, staging, restored or Production databases. Preserve current disabled switches and require exact-head owner approval for merges and explicit separate owner authority for deployment, OAuth, provider access, live crawl, recurring scheduling or public website mutation.
