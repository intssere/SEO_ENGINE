# CVI-1C.61 — Proposal-Edit Lock-Order Evidence Audit (Design Only)

## Parent
CVI-1C.60 draft PR #1115 at `d90eaaa0e003ba51891616d79b2402c1fd9d76e7`. Its CI https://github.com/intssere/SEO_ENGINE/actions/runs/38233185927 was in progress when this audit was prepared. No approval is inferred.

## Source observations
- `artifacts/api-server/src/lib/operational-data.ts`: `decideProposalReview` (approximately line 211) locks `action_plans ap` with `FOR UPDATE OF ap` (line 231). `editProposalDraft` (approximately line 286) likewise uses `FOR UPDATE OF ap` (line 308) within an existing transaction.
- `artifacts/api-server/src/lib/auth-foundation.ts`: `loadAuthConfig` reads `AUTH_ENFORCEMENT_ENABLED` (line 64). Route-role selection is centralized in `requiredRoleForApiRequest` (approximately line 108); global role is not a tenant-scoped mutation grant.
- The dormant `0016_cvi_acquisition_revocation_serialization_draft.sql` read-acquisition path uses site → connection → session → membership → grant lock ordering. That path is neither a proposal-edit handler nor evidence that an action-plan lock can safely be inserted anywhere in the sequence.

## Concurrency risk to resolve before runtime changes
Proposal edit/decision currently locks `action_plans` inside `sql.begin`. A proposed transaction-scoped ACL fence would add site/session/membership/grant locks. If one path locks plan first and another locks ACL rows first before subsequently acquiring the plan, opposing lock acquisition orders could deadlock. Conversely, checking permission outside the transaction or solely in middleware admits a time-of-check/time-of-use race with revocation. Both concerns require a designed global lock order, dedicated lock-timeout/deadlock tests, and review of all mutation/revocation paths.

## Required pre-implementation evidence
1. Enumerate exact database statements and lock acquisition order for proposal edit, proposal decision, session revoke/rotation, membership revoke and grant revoke.
2. Confirm whether plan selection can identify site/organization without allowing cross-tenant existence disclosure; do not trust caller-supplied site.
3. Specify row-lock mode and operation-time reevaluation after blocked lock acquisition using database time.
4. Show operation-first and revocation-first two-connection disposable PostgreSQL proofs, plus deliberate lock-order inversion detection.
5. Confirm no external provider/CMS calls occur while transaction locks are held.
6. Obtain an independent database/security approval; do not change production handler or bootstrap on the basis of this document.

## Decision state
**Unresolved:** universal lock order, activation policy, dedicated `edit_draft` permission, fail-closed deployable auth. This audit makes no production-safety certification or deployment claim.

## Restrictions
Documentation-only. No runtime code, migration, production database, provider call, crawling, publishing, merge or deployment.
