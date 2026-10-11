# CVI-1C.51 — Initial Route-to-Transaction Traceability Matrix

## Method
Read-only source inspection of route modules and auth middleware at parent CVI-1C.50 HEAD `9c75d4232aa90979abe4ae92dc53e22c34f19b68`. This is a targeted sample, **not a complete write-handler inventory**. All entries are source-observed at route level; underlying service transaction boundaries require further inspection.

| Route and source | Observed guard and operation | Integration risk | Proposed action |
|---|---|---|---|
| `POST /signal-collection-execution/run` — `artifacts/api-server/src/routes/signal-collection-execution.ts` | Local `requireTask70Admin` checks `req.auth.role` snapshot, then passes actor ID to `executeAuthorizedSignalCollectionJob` | Route check not transaction-scoped; job may have independent effects | Inspect service transaction and external execution side effects before any change; **not** selected as first integration target |
| `POST /competitor-acquisition/persist` — `artifacts/api-server/src/routes/competitor-acquisition.ts` | Validates target ID then invokes `runConfiguredCompetitorAcquisition` with `mode: "persist"`; no route-local transaction in inspected file | DB persistence and collection dependencies require tracing; global middleware still relevant | Inspect service writes and disable gates; don't run acquisition |
| `POST /competitor-acquisition/dry-run` — same file | Invokes configured acquisition with `mode: "dry_run"` | Route side-effect profile requires service review; name alone is not proof of read-only behavior | Review only; do not contact targets |
| `POST /connections/shopify/task53-write/start` — `artifacts/api-server/src/routes/task53-write-scope.ts` | Checks same-origin and explicit write-scope authorization, then creates OAuth URL and redirects | External OAuth/write-scope workflow rather than a simple DB mutation | **Exclude** from first transactional integration; preserve disabled public-write gate |
| `POST /connections/google/select` — `artifacts/api-server/src/routes/connections.ts` | Route exists; underlying transaction and privilege rules not established in this audit | Incomplete trace | Defer until downstream source review |
| `POST /auth/logout` — `artifacts/api-server/src/routes/auth.ts` | Checks CSRF against `req.auth`, then invokes session revocation flow | Authentication lifecycle has a separate intended revocation contract | Treat as security-sensitive but distinct from arbitrary business mutations |

## Cross-cutting boundary
`artifacts/api-server/src/middlewares/auth-security.ts` loads the persisted session into `req.auth` at request entry. `requireApiAuthentication` checks that snapshot and continues; it does not by itself surround downstream database mutations with a common transaction. Session role, revocation, expiry, and tenant/site read grants must be rechecked at the selected *operation* transaction boundary.

## Decision
**No production handler selected yet.** Candidate service implementations and idempotency/outbox behavior need verification before a safe integration proposal. Priority is narrow source-backed service inspection, identifying a database-only write with no provider, CMS, OAuth, crawler, or external side effects. This matrix itself changes no runtime code or security controls.

## Restrictions
No production DB access, crawling, providers, Shopify write-scope activation, publishing, merge, or deployment. Parent CVI-1C.50 full CI success and CVI-1C.51 documentation CI must be recorded independently.
