# PILOT-01 RT01 — Actual Runtime Call-Site Integration Inventory

**Review date:** 2026-11-03. **Source baseline:** canonical GitHub merge commit `afdc6e1ac2677207260f367d934d43282f64f4df` (PR #1285).
**Classification:** SOURCE REVIEW ONLY — neither runtime certification nor authority for live Diamond Shelf operations.
**Inspection:** concrete code paths from `main`; no deployment, environment configuration, database, secrets, external providers or actual browser sessions accessed.

## Actual source call-site graph (observed)

```text
artifacts/api-server/src/index.ts
  -> app.ts
     -> routes/index.ts
        -> /api authentication middleware
        -> routes/dashboard.ts / operational.ts / connections.ts / pilot.ts / execution.ts
        -> competitor/signal routes
  -> loadStartupRuntimeConfig()
     -> gated resumeQueuedPilots() only when DB configured AND PILOT_INGESTION_QUEUE_RESUME_ENABLED=true

artifacts/seo-engine/src/App.tsx
  -> shared Layout (sidebar shell)
  -> / -> dashboard.tsx -> useGetDashboard() -> /api/dashboard contract
  -> /approvals -> approvals.tsx -> generated approval read/edit/decide hooks -> /api/approvals...
  -> /connections -> connections.tsx -> GET /api/connections/status; GET /api/execution
  -> /onboarding -> customer-onboarding.tsx (local React preview; no submit API)
```

All routes under `/api` except health, provenance and auth are mounted after `requireApiAuthentication` in `artifacts/api-server/src/routes/index.ts`; per-mutation rate limiting applies to POST/PUT/PATCH/DELETE. Exact runtime enforcement mode and deployed configuration still need verification.

## Integration evidence / discrepancies

| Boundary | Concrete source | Observed call-site | Status and gap |
| --- | --- | --- | --- |
| Server startup | `artifacts/api-server/src/index.ts`, `lib/startup-runtime.ts` | DB identity check when configured; post-listen queue resume only if `PILOT_INGESTION_QUEUE_RESUME_ENABLED=true` and DATABASE_URL present | **WIRED_LEGACY_RUNTIME**; inspect pre-listen fail-closed conditions, actual deployed environment and queue controls independently |
| API authentication | `artifacts/api-server/src/app.ts`, `routes/index.ts`, `middlewares/auth-security.ts` | cookie session attachment; authentication gate before business routers; mutation rate limiting | **WIRED_SOURCE**; no runtime proof of actor/role/tenant authorization per endpoint; validate enforcement mode |
| Pilot API | `artifacts/api-server/src/routes/pilot.ts` | GET `/pilot/authorization`, GET `/pilot/status`, POST `/pilot/run`; same-origin signed short-lived pilot token and cookie check; enqueueProductionPilot() | **WIRED_LEGACY_RUNTIME**; this is not the new PILOT-01 durable scoped-grant adapter or exact owner approval for external reads |
| Legacy queue | `artifacts/api-server/src/lib/pilot-orchestration.ts` | Postgres `jobs` enqueue; advisory transaction lock; update pending -> active; `setImmediate` launches `runProductionPilot`; resume pending job on opt-in startup flag | **WIRED_LEGACY_RUNTIME**; no verified imported `Pilot01DurableFencingPort`; current synthetic lease/generation model is not shown attached to these operations |
| Pilot data acquisition | `artifacts/api-server/src/lib/pilot-runner.ts` | read-only provider acquisition contracts for Shopify/GSC/GA4/crawl; persistence and opportunity evaluation; defines bounded `PILOT_LIMITS` | **SOURCE_IMPLEMENTED_POTENTIAL_EXTERNAL_EFFECT**; must not invoke without separately authorized bounded P2/P3; no live credentials or runtime/provider claim |
| Durable fencing | `artifacts/api-server/src/lib/pilot-01-durable-fencing-port.ts`, `pilot-01-pg-query-candidates.ts` | interface + query candidates; explicitly zero I/O and no runtime wiring | **DISCONNECTED_REFERENCE**; synthetic PG tests do not bridge actual queue or UGP/CVI persistence |
| GSC isolated OAuth | `artifacts/api-server/src/routes/connections.ts`, `lib/gsc-oauth-profile.ts` | `gscReadonlyLiveTransportBound=false`, isolated GSC start blocks and isolated callback throws; old combined callback permanently throws | **INTENTIONALLY_UNBOUND**; do not mistake legacy combined Google OAuth routes for independently certified isolated GSC-only live flow |
| Connections UI | `artifacts/seo-engine/src/pages/connections.tsx` | GET `/api/connections/status` + execution capability; isolated GSC consent requires both `enabled` and `liveTransportBound` | **WIRED_READ_UI**; source flag prevents isolated readonly GSC runtime consent in current route |
| Approval review | `artifacts/seo-engine/src/pages/approvals.tsx`, `artifacts/api-server/src/routes/operational.ts` | generated `useListApprovals`, `useEditApprovalDraft`, `useDecideApproval` hooks; same-origin checks and verifiedActorId on POST decision / PATCH draft | **WIRED_SOURCE**; backend `operational-data.ts` enforces review domain; exact execution/revocation/worker coupling needs independent audit |
| Governed execution | `artifacts/api-server/src/routes/execution.ts` | authorization-renewal endpoints and separately gated Task #53/#54 preflight/execute/apply handlers | **WIRED_SOURCE_WITH_RISK**; these routes do NOT confer automatic execution; independently assess gates, active runtime switches, authorization lineage |
| Customer Home routing | `artifacts/seo-engine/src/App.tsx`, `components/layout.tsx`, `pages/dashboard.tsx` | root DashboardPage and common Layout with sidebar; dashboard uses generated `useGetDashboard` | **WIRED_OPERATOR_UI**; this source does not prove the user-requested sidebar-free light Customer Home design was deployed |
| Customer onboarding | `artifacts/seo-engine/src/pages/customer-onboarding.tsx` | local React URL/platform step state only; explicitly disclaims site registration, OAuth and analysis scheduling | **PREVIEW_ONLY**; missing verified ownership validation and backend activation is intentional/not complete |
| UGP ↔ CVI | `artifacts/api-server/src/lib/pilot-01-ugp-cvi-mock-rehearsal.test.ts`; `docs/pilot-01-ugp-cvi-isolated-rehearsal-contract.md` | injected mock queue tests expressly state no CVI runtime / real PostgreSQL transport | **MOCK_ONLY**; no certified real UGP queue -> CVI worker -> audit/approval chain shown by this inspection |

## High-priority conclusions
1. **Do not label the PILOT-01 disposable PostgreSQL fencing tests as deployed worker protections.** Legacy `pilot-orchestration.ts` uses its own `jobs` records, a run launcher and stale-run recovery. The separately defined `Pilot01DurableFencingPort` and conceptual `pilot01_jobs/grants/audit` candidates explicitly are not operational adapters.
2. **There are actual potentially externally active code paths** (`pilot.ts` -> `enqueueProductionPilot` -> `runQueuedPilot` -> `runProductionPilot`), subject to route, DB and runtime gates. No execution was attempted during audit. Review exact tenant/site authority, caller scope, bounded provider authorization, environment gates and failure recovery before activating anything.
3. **GSC-02 dedicated isolated read-only transport is unavailable by source design**, despite older Google connection infrastructure. Do not silently revive retired combined callback.
4. **Customer Home and onboarding readiness differ:** Dashboard and main navigation are source-wired; the shared Layout has a sidebar. The onboarding flow is a locally simulated preview. The requested sidebar-free customer landing experience is not certified by source routing.
5. **The approval UI is not an end-to-end autonomous safety guarantee**; it provides API-backed review features, whereas real worker-to-effect authorization and cross-service provenance remain unverified.

## Specific next actions (source-only first)
- **RT01-A:** Trace and document `routes/pilot.ts` authorization principal and site context through `validateProductionPilotPreflight`, `runProductionPilot`, all external provider operations, queue concurrency, and persistence transactions. Add no execution or new default-on flags.
- **RT01-B:** Audit `routes/operational.ts` -> `operational-data.ts` -> `execution-store.ts` -> provider dispatch; verify human approval's exact site/diff/actor, TTL and anti-replay enforcement with negative tests.
- **RT01-C:** Reconcile separate UGP branch, CVI-OPS-02 PR #1234, and Customer Home PR #1150 against current `main` and immutable deployment image. Avoid assuming stale PR status.
- **RT01-D:** Design trusted-context-only durable adapter and an **independently authorized** isolated schema/transaction test plan before any SQL integration or migration.
- **RT01-E:** Build an explicit Customer Home route coverage matrix to compare customer-facing design with operator-only pages and disabled features.
- **RT01-F:** Identify and mitigate any unintended legacy pilot route exposure before any P2 external-read authorization; propose changes in a separate code PR with full CI and owner approval.

## Evidence and limitations
This is a focused source call-site inventory, not a whole-repository dependency graph or a complete security review. A function import means code is wired in source, not that a current live deployment runs it. Runtime flags, actual DB identity, secret custody, external OAuth state, worker activity and production image provenance were **not** inspected. CI for this documentation PR does not elevate any operational gate.

## Governance
No external web requests, Google consent, live crawl, Shopify activity, Railway access, database connection/migration, scheduler or worker activation, AI proposal generation, public-site mutation, deployment, or merge is authorized by this report. `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false` remain the policy posture. Owner approval for an exact public-site change remains mandatory.
