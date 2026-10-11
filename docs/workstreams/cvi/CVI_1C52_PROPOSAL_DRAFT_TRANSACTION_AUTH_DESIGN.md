# CVI-1C.52 — Proposal Draft Mutation Authorization Integration Design

## Certified base
CVI-1C.51 draft PR #1097, head `1ae226ef22e421e2a2e692b790d07372629f274d`, exact-head full CI https://github.com/intssere/SEO_ENGINE/actions/runs/38144961242 SUCCESS.

## Selected representative *candidate* (not implementation approval)
- Route `PATCH /approvals/:id/draft` in `artifacts/api-server/src/routes/operational.ts`, calls `editProposalDraft` with `verifiedActorId(req)` after same-origin and schema validation.
- `artifacts/api-server/src/lib/operational-data.ts`, `editProposalDraft` lines 286–342: opens `sql.begin`, reads and row-locks `action_plans` scoped to readiness site, checks draft eligibility and fingerprint, updates `action_plans.expected_outcome`. Existing constraints include dry-run and `publicSiteWrites: false`; this does **not** authorize CMS publication.
- Global `attachAuthSession` and `requireApiAuthentication` in `artifacts/api-server/src/middlewares/auth-security.ts` authenticate and authorize at request entry using `req.auth`. That snapshot alone does not recheck in-flight session demotion or revocation.

## Candidate authorization contract and review gates
1. Carry a verified session ID to the service without trusting client-submitted role, identity, tenant, or site. Existing `actorId` is an audit identifier and must not substitute for session authorization.
2. Inside the *same* `sql.begin` transaction as `action_plans` update, read the persisted session with `FOR UPDATE`, assert not revoked, unexpired absolute and idle bounds using PostgreSQL time, and minimum role appropriate for the draft edit route. **Determine required role from existing policy before modifying code.**
3. Establish lock order **session before action_plan** for this handler. Check interaction with global session rotation, concurrent draft edits, approval decisions, and any tenant membership/site grant rows. Do not introduce a cross-service global lock or hold locks during external operations.
4. Preserve readiness-site filtering, proposal fingerprint/confirmation, blocked risk, lifecycle and no-public-write invariants; deny before mutation for stale or unauthorized requests. Decide whether a member role requires separate tenant/site authorization; do not infer grants from `readiness.siteId` alone.
5. Separate disposable PostgreSQL and HTTP tests: active editor success; demotion-first denies with no update; edit-first lock then demotion waits; revocation-first denial; expiry/idle boundary; rollback on validation failure; stale fingerprint; simultaneous approval and draft edit; token rotation.
6. Audit return status/error mapping, lock timeout and deadlock retry policy. Confirm no CMS/provider/network side effects in the chosen path from full dependency scan; preserve historical-review-only CVI and existing feature gates.
7. Require independent security/DB review and exact-head full CI before introducing an implementation PR. Do not alter production route behavior in this design increment.

## Alternatives considered
- `decideProposalReview` also has `sql.begin` with `action_plans FOR UPDATE`, but approval lifecycle transitions are more consequential. Evaluate after lower-risk draft edit.
- `commitAuthorityOutreachReviewDecision` operates in a transaction but has qualification-loader and review-event integrity complexity. Defer pending further inspection.
- Competitor acquisition and signal collection have external effects and multi-step jobs. Exclude as initial candidates.

## Status
Source-backed design candidate only. No runtime changes, providers, production DB, publishing, merge, or deployment. This design **does not claim** production transactional authorization is implemented.

## Source policy confirmation — scoped design correction
- `artifacts/api-server/src/lib/auth-foundation.ts` lines 103–114: `requiredRoleForApiRequest` explicitly requires **operator** for `/approvals/:id/draft` and `/approvals/:id/decision`, with `roleAllows` ranking viewer < operator < admin. The transaction check must use **operator-or-admin**, not admin-only.
- `artifacts/api-server/src/routes/index.ts` installs `requireApiAuthentication` before `operationalRouter`; the synchronous middleware check is at request entry, not mutation commit.
- `artifacts/api-server/src/lib/auth-foundation.ts` session load updates `last_seen_at` using `clock_timestamp()` after verifying nonrevocation and absolute/idle expiry. The proposed transaction fence should read the current persisted role/expiry without inadvertently extending session lifetime or bypassing the entry CSRF check.
- `artifacts/api-server/src/lib/operational-data.ts` `getRuntimeReadiness` selects an active site by fixed domain `diamondshelf.us`; this is an operational site selector, **not** proof of membership or tenant ownership. A separate membership/site-grant policy decision is still required before production integration.
- The existing `editProposalDraft` transaction locks `action_plans` after the readiness check. Adding a session row lock must establish session-before-plan lock order, account for concurrent token rotation and logout, and avoid reusing the request snapshot as a fresh authorization source.

## Implementation admission decision
**Design-only / not authorized to alter runtime.** The candidate is lower-risk than external execution routes, but the missing tenant/site authorization contract and compatibility with auth-disabled operational modes require explicit resolution and review. Preserve the existing operator role, dry-run invariants, feature gates and no-public-write semantics; do not assume role-checking alone authorizes access to any site's proposals.

## Authentication-disabled compatibility — verified source decision gate
`loadAuthConfig` makes enforcement conditional on `AUTH_ENFORCEMENT_ENABLED` (`artifacts/api-server/src/lib/auth-foundation.ts`, line 64). `attachAuthSession` and `requireApiAuthentication` both bypass authentication when disabled (`artifacts/api-server/src/middlewares/auth-security.ts`, lines 56 and 72). Therefore a mandatory transaction-level session check would change auth-disabled semantics and can break existing operational flows; a conditional check would perpetuate the intentional non-enforcing mode. **Do not make either behavior change without an explicit environment/migration decision.** Review whether disabling authentication is permitted beyond disposable or local contexts, and require fail-closed rules for production.

## Scope ownership — unresolved
The inspected `getRuntimeReadiness()` obtains an active site record based on domain. That establishes a site target but not a user-to-tenant or session-to-site membership grant. No independent site membership authorization contract was established in this audit. A real integration must identify the canonical membership/grant tables and an authoritative role-to-site rule; if unavailable, remain blocked rather than treat operator role as sufficient.

## Exact-head CI notes
Initial design commit `9745fa8dbca476564b6e239ce295fc75f2f86084` passed full CI https://github.com/intssere/SEO_ENGINE/actions/runs/38145717260 (job `114488510782`). The subsequent design commit `6d22519ab559e206b5339c75bcf2e427e6e4e0ad` is being validated at https://github.com/intssere/SEO_ENGINE/actions/runs/38145954091. This addition requires a new exact-head CI receipt. No runtime code changed.
