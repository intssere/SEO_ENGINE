# PILOT-01 RT01-A8 — Source-only uncertain COMMIT reconciliation

## Exact scope
This is a disconnected, mock-backed **read-only** recovery contract. No disposable PostgreSQL test is executed by this PR. No staging or Production database access, migrations, worker dispatch, provider operation, autonomous execution, or deployment. Branch based on RT01-A7 merge `6b1e931ae3dcdf221884a6e256e078594dec4551`.

## Problem
PostgreSQL may commit a transaction and lose its network acknowledgement, leaving the caller uncertain. Blindly retrying a new admission could create duplicate jobs, while treating a missing response as a rollback can corrupt grant state. The RT01-A7 adapter returns `unavailable` on exceptions; this contract does not claim to prove whether that transaction committed.

## Source-only solution
`rehearseUncertainCommitReconciliation` accepts verified *synthetic* context and a single injected **read-only** `findCommitted` port keyed by stable idempotency key. It checks all original authentication/site/run/write-deny gates and compares any returned committed receipt to the exact grant, idempotency key, actor, tenant, site, issuer, operation and transaction identifiers.

- Matching `found`: `confirmed_for_rehearsal`. A caller-provided mock receipt is not proof of a real DB transaction, does not authorize job dispatch, and cannot be used to infer a successful Production write.
- `not_found`: `unresolved`, **not** `denied`, **not** `ready_to_retry`. No automatic admission retry or second grant consumption.
- Conflicting receipts: `conflict`, never confirmation.
- Connection failure, exceptions, unexpected or malformed status: `unavailable`.
- Context, session, write safety, or policy mismatch: `denied`, before lookup.

## Required future certification
1. Establish an authoritative PostgreSQL read from a primary, with transaction visibility and commit-outcome rules. A replica or transient missing row is insufficient to declare rollback.
2. Ensure durable keys with uniqueness, retention, immutable receipts and exact identity/scope membership checks. Verify the caller's right to query the receipt; never disclose cross-tenant job or actor information.
3. Test actual lost COMMIT acknowledgement using disposable PostgreSQL with an injected transport close/fault. Correlate DB state after an uncertain client result.
4. Test independent OS processes, termination before and after COMMIT, network interruptions, simultaneous requests and exact-key recovery. Never treat a synthetic `not_found` as a safe permission to submit another attempt.
5. Resolve canonical UGP/CVI migration lineage, live auth and issuer evidence, job fencing/lease and outbox guarantees separately. No Production/staging operations are authorized here.

Standard CI and formal Tahseen APPROVED at the exact PR HEAD, followed by separate owner merge authorization, are mandatory. Keep `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`.
