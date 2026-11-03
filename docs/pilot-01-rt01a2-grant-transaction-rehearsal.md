# RT01-A2 — Single-Use Grant Transaction Rehearsal

**Baseline:** main merge `7e02d8791eba596080596c47df93370dbdf0dc0a` (PR #1288).
**Scope:** isolated source-only mock implementation and test coverage; no PostgreSQL, migration, network, OAuth, production access, route or worker binding.

## What is demonstrated

The `SyntheticAtomicGrantLedger` fixture models server-side registration of a fixed actor/tenant/site/operation/issuer/nonce and one terminal transition, either `consumed` or `revoked`. It rejects missing/mismatched identities, expired grants, unsupported `site_write`, duplicate registration, and replay. Each accepted transition generates exactly one in-memory audit receipt; injected receipt failure returns `unavailable` and leaves grant state unchanged. Same-event-loop competing requests admit at most one transition. It deliberately has no callback for queue, provider, external effects or persistence.

The tests include an explicit **negative durability demonstration**: a fresh instance can accept a grant previously consumed in another instance. This is an expected property of the fixture and a hard blocker for runtime authorization.

## Mandatory durable adapter proof obligations

1. **Source of identity:** `actorId`, `tenantId`, `siteId`, issuing authority and operation must be established through trusted authenticated server context, not body/cookie/query parameters or caller-set boolean trust flags.
2. **Durability:** persist issuer-attested grant, stable unique grant ID/nonce, site/actor/tenant bindings, operation, allowed provider budget, expiration, revocation and single-use state. DB-authoritative time; no JS process-local grant registry as Production authority.
3. **Concurrency:** competing consume/consume and consume/revoke transactions in separate PG sessions must serialize on authoritative grant records; at most one accepted terminal transition.
4. **Audit atomicity:** grant transition plus immutable audit receipt in one database transaction; any error rolls both back. No success on zero-row update; audit chain and visibility rules need schema review.
5. **Retry and recovery:** ambiguous acknowledgment and interrupted commits require transactionally reconciled receipt queries and idempotency, never guessing from an HTTP timeout.
6. **Operational fencing:** grant consumption alone must not launch a worker. Link dispatch to independently approved scope and fresh generation-fenced lease at each provider acquisition boundary. No authorization for public site writes follows from analyzing.
7. **Schema and process proof:** first reconcile UGP/CVI/main schema collision and migration provenance; require separate isolated disposable PostgreSQL approval, negative multi-session tests, independent CI/review, and owner authorization for any runtime integration.

## Safety and known limitations

The fixture uses synchronous single-event-loop state transitions and therefore cannot prove durability, multi-process isolation, SQL rollback, RLS, DB clocks, token authenticity, signer custody, member roles, real provider policy, cancellation, or Production readiness. It models desired outcomes without certifying them. No post-merge automation, worker activation, external reads, credential changes, public website writes or AI generation are authorized.

**Keep `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false` effective.** This PR must remain disconnected from routes, workers, startup and providers.
