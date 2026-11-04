# PILOT-01 RT01-A5 — Disconnected authorization-to-queue fencing

## Governance and scope
Owner authorized GitHub source-only, mock-backed engineering with Railway as intended, **not certified**, deployment target; Replit remains legacy fallback. Base `2f9e80bb2f682d20830ba135e3a20a19e361a697`. No database access, migration, API route/worker binding, deployment, provider operation, autonomous execution, or public-site writes. No merge without owner exact-HEAD authorization.

## Implementation
- `pilot-01-offline-queue-admission.ts` models fail-closed preflight with mandatory enforcement/site verification/run gate and default-off public writes/AI proposal generation.
- An injected server-derived context must match requested site before single-use durable grant consumption is rehearsed through `rehearseTrustedGrantConsumption`. Mismatching receipts never reach even the synthetic queue.
- An injected `SyntheticQueueAdmissionPort` returns a mocked, scoped queue acknowledgement bound to consumed receipt ID, grant ID, actor, tenant, site, issuer and operation. All identifiers must match; a malformed/missing/conflicting acknowledgement returns `unavailable`. Queue refusal remains `denied`.
- Exceptions and unavailable results fail closed. There is **no automatic retry** after consumption; a lost acknowledgement is ambiguous and must be reconciled using future durable, idempotent database records before any real transition.
- `queued_for_rehearsal` means only that two test adapters returned mutually matching synthetic objects. It is never a live execution permit, a verified database commit, a worker token, provider authorization, or proof of runtime access controls.

## Test coverage
Tests simulate disabled enforcement, site/actor mismatch, invalid roles/identity, unsupported write operation, malformed grant result, receipt mutation, queue conflict, queue outage, lost acknowledgement, fake single-use replay, and dependency failures. No network/SQL/queue worker is invoked.

## Hard blockers before implementation
1. A real trusted `ServerAuthenticatedContextProvider` is not wired to `AuthPrincipal`, tenant/site membership, and issuer custody. The offline `source` marker is not proof.
2. **Grant consumption and job admission must be in the same durable atomic transaction or equivalent rigorously proven idempotent protocol.** This synthetic sequence deliberately cannot prove atomicity across grant and queue. Without that, grants may be spent without queued jobs.
3. A tested queue acknowledgement is not worker lease fencing, side-effect control, revoke/cancel authority or outbox delivery. A future worker must enforce durable generation/owner/lease and independently authorized read-only effects.
4. The canonical UGP/CVI migration ledger and intended Railway database must be independently certified before any production schema/connection operations.
5. Site membership source, issuer provenance, idempotency keys, unique receipt constraints, recovery after COMMIT acknowledgement loss, and two-process crash concurrency require separate design, disposable tests and security signoff.

Maintain `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`. Do not wire any of this code into operational `routes/pilot.ts`, `pilot-orchestration.ts`, startup, or provider services.
