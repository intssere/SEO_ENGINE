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

## Membership and schema discovery — evidence limited
The inspected `lib/db/migrations/0002_auth.sql` defines `auth_sessions` with global role, subject, email, lifetime, and revocation fields, plus `auth_audit_events`. Neither table records an explicit site/tenant membership relationship. Code-search checks on default-branch indexed files for `tenant_memberships`, `site_memberships`, `site_users`, `site_grants`, and `workspace_memberships` returned no matches. **This is not proof that no authorization model exists elsewhere in the branch, database, or integrations.** Further migration and service inventory is required before deciding any schema addition.

## Narrow implementation admission policy
For the current single-site operational workflow, explicitly decide whether only globally configured operators/admins may act on the configured site, or whether user-to-site grants are mandatory before this mutation is usable. Record the accountable security/product owner and branch/environment policy. Until that decision, do not silently implement a global-role-only authorization fence as tenant-safe. Also decide fail-closed production behavior if `AUTH_ENFORCEMENT_ENABLED` is false. No migration, policy decision, or runtime behavior change is made in this document.

## Correction: CVI draft ACL schema located in migration inventory
An earlier name-based code search missed the **actual CVI draft authorization schema**. The migration directory contains `0012_cvi_tenant_site_acl_draft.sql`, defining `cvi_organization_memberships` (organization, auth subject, viewer/editor/owner, status and validity), `cvi_site_read_grants` (membership, organization, site, `read_evidence`/`review_content`/`manage_connection`, status and validity), and `cvi_tenant_authorization_audit`. Cross-organization site grants are constrained by composite foreign keys. `0013_cvi_acl_audit_immutability_draft.sql` adds audit mutation rejection triggers; `0015_cvi_acquisition_membership_fence_draft.sql` adds acquisition membership/grant checks; `0016_cvi_acquisition_revocation_serialization_draft.sql` serializes acquisition admission against revocation with lock order site → connection → session → membership → grant.

**Status:** All inspected migration headers expressly identify these as dormant drafts intended only for authorized disposable database proof, not production bootstrap or activation. Their existence corrects the prior suggestion that no such authorization model was found. It does **not** establish a deployed membership service or approved mutation grant.

**CVI-1C.52 design impact:** The `review_content` grant may be relevant to proposal review but is located in a table named `cvi_site_read_grants`; do not silently equate it to permission to UPDATE `action_plans`. Review the ACL contract, operation semantics, organization/site scoping, activation/migration policy, subject identity mapping, and lock order before writing integration code. The existing CVI acquisition lock order must be reconciled with the proposed session-before-action-plan lock order to avoid cross-handler deadlocks. No deployment, schema activation, membership seeding, or new capability is authorized.

## Lock-order reconciliation — admission blocker
The earlier candidate sequence "session before action_plan" must not be treated as a globally approved locking protocol. Dormant migration `0016_cvi_acquisition_revocation_serialization_draft.sql` explicitly uses **site → connection → session → membership → grant** for acquisition admission. The candidate edit handler currently locks `action_plans` within `sql.begin`, after a separate readiness site read; it does not lock the site row. Introducing session locks without tracing concurrent flows could invert ordering against another operation and deadlock.

**Proposed review sequence, not executable authorization:** (1) inventory row-lock acquisition for all code paths that update sessions, memberships, grants, sites, and action plans; (2) define one cross-workflow partial order, noting that proposal-draft editing does not need to lock a provider connection; (3) test same-session edit/revocation, same-site ACL revocation/edit, and approval/edit races using dedicated disposable PostgreSQL connections; (4) ensure database authorization predicates are evaluated after any necessary waits using live database time and fail closed if membership or grant disappears.

## Mutation permission separation
The dormant `cvi_site_read_grants` table permits `review_content`, but its name and migration comments describe read grants. Do **not** infer it authorizes a database UPDATE merely because the user may review content. A reviewed authorization policy must explicitly distinguish `view/review`, `edit_draft`, `approve`, and `publish` operations; this design creates no such grants and authorizes no schema change. No production integration target is implementation-approved.

## Evidence and verification scope
This design is grounded in the inspected ACL SQL drafts and `operational-data.ts`; it does not establish whether site-level ACL migrations are wired into bootstrap, seeded, or deployed. All findings remain design-stage with no production database reads, external provider operations or public writes.

## Runtime bootstrap exclusion — source verified
Read `lib/db/src/runtime-bootstrap.ts` on this workstream. Its `applyMigration` call sites explicitly name only `0001_core.sql` and `0002_auth.sql` (lines 318 and 334). The file recognizes other schema table-count baselines but contains **no invocation of draft CVI ACL migration `0012`**, nor does it apply `0013`–`0016`. Accordingly this inspected runtime-bootstrap implementation does not automatically enable the CVI ACL tables. This is a statement about the inspected bootstrap source, **not** a proof of all deployments, external migration runners, or production database state. Any future integration must certify migration eligibility separately and must not auto-apply dormant draft files.

## Security review sequence
1. Preserve bootstrap exclusion for dormant CVI migrations and evidence-only operation until explicit schema activation approval.
2. Obtain a documented policy decision for `edit_draft` vs `review_content`; specify subject-to-organization-to-site binding.
3. Resolve auth-disabled production fail-closed policy without changing local/disposable behavior silently.
4. Propose a deterministic cross-handler lock order, including site/membership/grant/session/plan, and test concurrent revocations.
5. Only then propose a narrow runtime change behind authorized feature/environment gates, supported by disposable PostgreSQL and HTTP tests and independent review.
