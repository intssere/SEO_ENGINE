# PILOT-01 RT01-A12.18 — source-only custody cutover blueprint

## Scope and reuse ledger
**No operational authorization.** This is a deliberately disconnected design, not a migration, integration, authentication adapter, worker implementation or SQL execution. All runtime/site/provider/database changes remain prohibited.

| Source already merged | Exact reuse | What A12.18 adds |
| --- | --- | --- |
| A12.1 custody SQL | Protected grants/jobs/admissions/events/outbox candidate, reused unchanged | Integration ordering only |
| A12.7–A12.12 | Trusted membership/issuer/transaction/worker and PG17 isolation contracts | No duplicated resolver, schema, SQL or fixture |
| A12.13 `lib/db/src/pilot-01-rt01a12-13-integration-readiness.ts` | `assessTrustedBoundary`, `assessTransitionPlan`, `REQUIRED_GATES` | New disconnected phase consistency assessment focused on cutover failure modes |
| A12.14 | `tenant_memberships`, `issuer_custody`, `custody_revocation_events` SQL candidate | No new table or operational authority |
| A12.15–A12.17 | Synthetic PG17 tests and A12.16 trigger candidate | No new database execution or copied harness |
| A12.13 source audit | Route-to-queue call graph and role checklist | Focused exact cutover dependency map and block decisions |

## Verified current route -> effects
The current `artifacts/api-server/src/routes/index.ts` installs `requireApiAuthentication` before `pilotRouter`; however `artifacts/api-server/src/middlewares/auth-security.ts` returns `next()` when authentication is disabled by configuration. **This is source behavior, not a claim about live environment settings.**
1. `artifacts/api-server/src/routes/pilot.ts` `GET /pilot/authorization`: same-origin check and 5-minute HMAC cookie; no canonical tenant membership lookup.
2. `POST /pilot/run`: header/cookie equality and HMAC validation, then `enqueueProductionPilot()`; token is not a durable single-use grant. Required future boundary: enforced session with subject, independent site/org scope, active DB-owned membership, server-controlled issuer and revision fence; no legacy path on missing evidence.
3. `artifacts/api-server/src/lib/pilot-orchestration.ts` `requestPilotRun` -> `enqueue`: `public.jobs` transaction, not `pilot01.admissions` and `pilot01.jobs`. Required future boundary: transactionally consume scoped grant and create immutable receipt plus fenced protected job; unknown COMMIT must be reconciled, never blindly retried.
4. `launchQueuedPilot` uses `setImmediate` and `runQueuedPilot` claims `public.jobs`; `resumeQueuedPilots` recovers legacy pending jobs. Required future boundary: dedicated workers with DB-owned lease/generation, fresh custody revocation check before continuation; both queue and resume paths fail closed without secured admission.
5. `artifacts/api-server/src/lib/pilot-runner.ts` reads external providers and persists results. Required future boundary: no provider dispatch or persistence before current fenced admission authority; retain explicit disabled public-site writes and AI generation flags. This blueprint **does not enable provider reads**.

## Migration authority and compatibility blockers
| Source | Compatibility signal | Unverified fact / block |
| --- | --- | --- |
| `lib/db/migrations/0001_core.sql` | Public org/site UUID graph and legacy `public.jobs` | Installed schema, table ownership, target resource, ledger checksum, deployment authority unverified |
| `0002_auth.sql` | `auth_sessions` global role, expiry and revocation | Does not establish tenant membership or issuer provenance |
| Main canonical `0001–0011` | Replays in the *synthetic* A12.17 PostgreSQL 17 CI | Installed-state verification unavailable; do not claim any production migration occurred |
| Historical UGP `0008–0011` vs integration `0012–0015` | Previously reported lineage/numbering collision | Reconcile exact authoritative checksum and target before migration numbering |
| A12.1, A12.14, A12.16 | Source-only additive SQL candidates, synthetic tests | Not installed operationally; no migration apply, SQL, backfill or role grants allowed by A12.18 |
| `lib/db/package.json` push scripts | `drizzle-kit push` and force option exist | Must **not** be used to infer or repair installed migration authority |

## Privilege and authentication gap ledger
- `requireApiAuthentication` is configuration-dependent. Operational settings have not been examined, and A12.18 cannot use runtime evidence.
- A globally authenticated operator/admin role is not sufficient tenant authorization. Need trusted, DB-owned session-to-org membership plus independently verified site mapping.
- Separate NOLOGIN schema ownership and migrator role from scoped API reader, admission writer, worker and auditor. Each must be NOBYPASSRLS and narrowly granted; forbid PUBLIC table/function privileges, pooled owner/superuser SQL and caller-set tenant GUC authority.
- A12.16 functions are SECURITY INVOKER, audit append requires sufficient **scoped** INSERT privilege; an authorized issuance, credential rotation and revocation procedure is not yet available. Synthetic owner/superuser can disable triggers, TRUNCATE and bypass.
- DB-owned issuer provenance and verified human authorization cannot be replaced by HMAC browser nonce, `current_user`, SQL SHA-256 fingerprint or a caller-supplied marker.
- Verify transaction isolation, row locks, generation and revocation serializability, pool reset, deadlock/retry policy and the unknown-COMMIT reconciliation receipt in a separately authorized stage.
- Do not migrate while any historical lineage/installed-ledger or target identity ambiguity remains.

## Fail-closed transition order (design only)
1. **Route authorization**: enforced authenticated session, site/membership/issuer/revision source-of-truth checks must precede admission. Deny on any missing, stale or ambiguous evidence. HMAC nonce alone cannot establish consent.
2. **Custody admission**: consume durable scoped grant and append immutable admission/receipt alongside protected `pilot01.jobs` within one authoritative transaction. Reject unknown/rolled-back COMMIT; reconcile receipts independently before retry.
3. **Queue claim**: only fenced `pilot01.jobs` claim; no `public.jobs` bypass.
4. **Worker continuation**: revalidate lease/generation and revocation after restart, before each protected step, fail closed on conflict.
5. **Provider dispatch**: remains disabled in this blueprint. Later authorization needed even for read-only external access.
6. **Recovery**: no `resumeQueuedPilots` legacy fallback; only verified protected queue and fresh ownership fence.

## Negative certification design and exclusions
The A12.18 TypeScript contract **only composes A12.13's paper-level evidence checks** and rejects legacy queue availability, disabled auth, caller asserted cutover results, unknown COMMIT, missing scoped admission, stale ownership or revocation, improper route admission claims, unsafe recovery and enabled provider/site writes. Passing tests cannot authenticate actors, connect any source, issue an admission or authorize runtime execution.

**Exit gate:** separate future authorizations for operational-resource read-only attestation, policy/privilege review, synthetic integration certification, migration authoring/application, runtime integration, worker activation and external provider reads. Do not silently merge approval for one stage into another.

## PR governance
Draft PR only. Exact HEAD Standard CI SUCCESS and dedicated A12.18 offline CI SUCCESS, Tahseen formal GitHub APPROVED, zero unresolved review threads and separate owner exact-HEAD merge authorization are mandatory before merge.
