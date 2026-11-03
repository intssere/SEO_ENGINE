# PILOT-01 RT01-A — Operational Pilot Authorization and Queue Safety Audit

**Inspection date:** 2026-11-03. **Baseline:** verified main merge commit `4490d25ca2ed4d1d003dde191b3bdf9a72341de0` (PR #1286).
**Classification:** SOURCE-ONLY / NOT LIVE AUTHORIZED / NO RUNTIME CERTIFICATION. This analysis examines source logic; deployed configuration, secrets, user/session state, DB contents, provider effects and environment identity were NOT accessed.

## Verified call chain and entry points
- `artifacts/api-server/src/app.ts` attaches session and mounts `/api`.
- `artifacts/api-server/src/routes/index.ts` mounts auth, health and provenance before `requireApiAuthentication`, followed by the pilot route; unsafe methods receive rate limiting.
- `artifacts/api-server/src/routes/pilot.ts:10-40`: GET `/pilot/authorization` provides an HMAC token and strict-samesite cookie; POST `/pilot/run` checks same-origin, header/cookie equality and signature/age, then calls `enqueueProductionPilot()`.
- `artifacts/api-server/src/lib/pilot-orchestration.ts:36-94`: `requestPilotRun` preflight -> transactional enqueue -> immediate background `runQueuedPilot`, or optional startup `resumeQueuedPilots`.
- `artifacts/api-server/src/lib/pilot-orchestration.ts:59-68`: conditional job claim `pending -> active` then `runProductionPilot(runId)`.
- `artifacts/api-server/src/lib/pilot-runner.ts:226-254`: `executePilot` loads context, makes parallel Shopify/GSC/GA4/crawl reads, persists observations, evaluates recommendations and writes run state.
- `artifacts/api-server/src/lib/pilot-runner.ts:800-819`: DB-selects active Diamond Shelf domain + connected provider credentials and validates HTTPS host, shop and Google resource metadata.

## Findings with source evidence and required remediation

| ID | Severity for future activation | Source | Observed concern / precise limitation | Required safe acceptance evidence |
|---|---|---|---|---|
| A01 | BLOCKER | `lib/pilot-authorization.ts:10-33`; `routes/pilot.ts:26-34` | HMAC token has issue time and random nonce but verification checks only signature and five-minute age. Cookie clearing does not itself establish durable one-time nonce consumption or session/actor/tenant/site binding. | Independently validated authenticated identity; durable single-use run authorization bound to exact tenant/site/action/limits/actor and expiry; race/replay/revoke tests |
| A02 | BLOCKER | `middlewares/auth-security.ts:70-128`; `routes/index.ts` | Authentication middleware skips enforcement if `loadAuthConfig().enabled` is false; `verifiedActorId` can return `auth_enforcement_disabled` in that mode. `pilot.ts` does not explicitly bind authenticated principal and site to the pilot token. This is an environment-dependent conditional, NOT a finding that Production enforcement is disabled. | Document and attest enforced mode in isolated preview; deny `/pilot/run` when auth disabled/misconfigured; positive/negative RBAC and site-scope tests; no fallback synthetic actor for externally consequential action |
| A03 | BLOCKER | `lib/pilot-orchestration.ts:43-68,88-94` | Queue enqueue uses advisory lock and active-job deduplication, but run claim sets `active` without a generation/owner/expiry fence. Stale active records are marked failed after 20 minutes based on `updated_at`, not proved worker termination. Potential old worker continuation requires deterministic two-worker tests; no exploit assertion. | Durable claim/renew/complete+audit transaction; DB-authoritative TTL + owner+generation; cancellation signal to old worker; two-process forced-kill tests and stale-worker rejection |
| A04 | BLOCKER | `lib/pilot-orchestration.ts:59-81`; `lib/pilot-runner.ts:226-255` | Once claimed, `setImmediate` background runner performs external reads. There is no inspected invocation of `Pilot01DurableFencingPort` in this path and no proven fresh authorization immediately before each external request. | Trusted-context preflight and revalidation at dispatch and on retries; keep external work off unless explicit bounded P2/P3 approval; provider read policy and kill-switch evidence |
| A05 | HIGH | `lib/pilot-runner.ts:239-254,935+` | Concurrent provider requests then DB persistence/evaluation may leave partial evidence across stages after interruption; source does not demonstrate a generation-fenced state/evidence transaction for the legacy pilot path. | Isolated fixture crash/retry after provider reads and at transaction commits; site and run lineage; append-only event receipts, no duplicate effect or misleading completion |
| A06 | HIGH | `lib/pilot-runner.ts:800-819` | Source restricts to Diamond Shelf domain and selects connected site credentials. It does not demonstrate request-bound tenant authorization, authenticated grant issuer, explicit provider-read consent, or a current deployed site/credential attestation. | Exact tenant/site/actor and credential identity verified server-side, scoped source+budget+window grants; cross-tenant denial and no silent OAuth refresh |
| A07 | HIGH | `lib/pilot-runner.ts:776-797` | `refreshGoogleIfNeeded` can refresh and persist encrypted OAuth credential material, distinct from a pure read of Search Analytics. Must not be treated as covered by generic read-only authorization. | Separate approved OAuth lifecycle and credential custody, token-refresh permissions and audit; independently scoped GSC/GA4 grants |
| A08 | HIGH | `lib/pilot-runner.ts:332-395`, `PILOT_LIMITS` | Crawler enforces bounded pages/depth/timeouts in source, but real run limits, robots handling, redirect/scope policy, traffic budget and stop behavior lack independent live acceptance. | P2 domain-specific, source-specific explicit authorization plus SSRF/redirect/robots/rate-limit budget/cancel tests; no unsanctioned crawl |
| A09 | BLOCKER | `lib/pilot-01-durable-fencing-port.ts` and `lib/pilot-01-pg-query-candidates.ts` | Synthetic PostgreSQL test models and query candidates are deliberately disconnected from operational pilot route/queue; passing PRs #1276-1284 does not certify the legacy runner. | Independently authorized isolated adapter with trusted context, real schema compatibility, atomic fenced audit/outbox and end-to-end harness; no automatic live wiring |
| A10 | HIGH | `artifacts/api-server/src/index.ts`, `lib/startup-runtime.ts` | Queue resume is gated on `DATABASE_URL` and explicit `PILOT_INGESTION_QUEUE_RESUME_ENABLED=true` in source, but current deployment flag state is unverified. `/pilot/run` may enqueue independently of startup-resume flag. | Distinct launch/queue gate with default-off enforcement for live-acquisition paths, disabled-auth negative tests, verified deployment flags and operator-owned exact run authorization |

## Important confirmed safeguards (do not discard)
- HMAC token verification checks age/signature with constant-time signature comparison and uses a secure/HttpOnly/SameSite cookie in Production.
- `/api` business routes follow authentication middleware, and configured enforcement checks role plus CSRF for unsafe methods.
- Enqueue uses `pg_advisory_xact_lock` and rejects an existing pending/active job for the site.
- Run claim requires `pending` status.
- `executePilot` refuses if the injected `publicWritesEnabled` is true; provider requests use explicit read-only allowlists; bounded crawl limits exist.
- Source validates an active `diamondshelf.us` record and connected credentials; none of this grants current consent or live authority.
These safeguards are partial. Do not infer full lifecycle correctness or deployed state from source checks.

## Prioritized remediation package — not authorized to implement or activate by this audit
1. **RT01-A1 isolated default-deny entrypoint:** require enforced auth, verified principal + bound tenant/site, explicit source approvals and separate run gate; never rely on a cookie+HMAC alone. Add negative route tests without any external I/O.
2. **RT01-A2 immutable one-time grant:** durable nonce/issuer/actor/site/allowed providers/budget/expiry and exact current policy fingerprint, transactionally consumed; support revocation and simultaneous-request tests.
3. **RT01-A3 audited fenced queue:** replace legacy worker authority with reviewed owner+generation lease, atomic audit receipts and cancel/renew/recovery; ensure old workers cannot persist or dispatch after takeover.
4. **RT01-A4 effect/acquisition boundary:** independently authorize each provider source, GSC/GA4 refresh, bounded crawler, secret custody, idempotency and kill switch. No live provider activity under this document.
5. **RT01-A5 source/data integration review:** compare `jobs` schema and current UGP/CVI adapters with proposed durable port, prepare migration/rollback proof and two-process disposable testing plan.
6. **RT01-A6 operator acceptance:** reconcile actual deployed image, startup configuration, authenticated tenant, frontend invocation surface and Customer Home approval UI; CI on main != runtime deployment.

## Explicit certification decision
**FAIL-CLOSED / NOT LIVE PILOT READY.** This source-only inspection does not authorize running `/pilot/run`, enabling queue resume, issuing OAuth consent, reading Shopify/GSC/GA4, crawling DiamondShelf.us, refreshing tokens, connecting to any Production database, changing flags or running migrations. A genuine P2/P3/P4 activation requires separately scoped owner approval, reviewed integration evidence, and deployment/runtime attestation.

**Scope of this PR:** one Markdown file only; no runtime or test-code modifications, no merge without owner exact-HEAD authorization.
