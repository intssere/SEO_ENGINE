# CVI-1C.53 — Proposal Draft Mutation Permission Contract (Design Only)

## Certified starting point
Parent CVI-1C.52 draft PR #1100, exact HEAD `7396171a38daa8a39592127e4251217d7952e8ca`, passed CI https://github.com/intssere/SEO_ENGINE/actions/runs/38147181797. No schema activation or production authorization is implied.

## Problem
The HTTP policy requires `operator` for `PATCH /approvals/:id/draft` (`artifacts/api-server/src/lib/auth-foundation.ts`), but this global role is distinct from per-site ownership. The dormant `0012_cvi_tenant_site_acl_draft.sql` ACL has `cvi_organization_memberships` with `viewer/editor/owner` and `cvi_site_read_grants` permissions `read_evidence`, `review_content`, `manage_connection`. None is expressly an action-plan mutation permission. Existing `editProposalDraft` in `artifacts/api-server/src/lib/operational-data.ts` updates draft `action_plans.expected_outcome` within `sql.begin`, without an operation-time persisted session+site ACL fence.

## Proposed operation-level contract — NOT AUTHORIZED FOR IMPLEMENTATION
Operation: `proposal_draft.edit` only; excludes approvals, execution, publication, OAuth, outbound sending and provider/crawler operations.

Admission requires ALL of:
1. Authentication enforcement configured and enabled in any deployable environment and a persisted active session whose subject matches the server-derived actor; revoke/absolute/idle expiry assessed with database time.
2. Effective global role `operator` or `admin`, reflecting existing route policy; `viewer` must be denied. No trust in client-supplied role or site.
3. The selected action plan belongs to the resolved active site; derive organization from canonical `sites.organization_id`.
4. Organization membership for the persisted auth subject is active/effective/unexpired and has an independently approved minimum membership role (candidate: `editor` or `owner`). A global operator designation alone does not establish membership.
5. A dedicated active site permission for draft editing (conceptual `edit_draft`), not `review_content`; this **requires approved ACL schema/policy design** before use. Do not add enum values, grants or seed data in this increment.
6. Existing same-origin, CSRF, confirmation, revision-token, fingerprint, eligibility and `dryRun=true`, `executionAuthorized=false`, `publicSiteWrites=false` invariants are preserved.

## Proposed transaction and concurrency semantics
Recheck authorization in the same transaction as draft update, using row locks and a globally reviewed ordering compatible with dormant acquisition fence `site → connection → session → membership → grant`. Draft edit need not lock connection, but session/membership/grant and action-plan locking must not create inversions with concurrent revocation or approval. Authorization-first then mutate; if locks wait, reevaluate effective timestamps using live database time; unauthorized and stale cases leave no update. Do not hold row locks during external requests.

## Implementation admission blockers
- Responsible product/security owner must approve the distinction `review_content` vs `edit_draft` and whether ACL schema extension is allowed.
- Verify full migration/bootstrap/prod rollout policy and site ACL lifecycle; dormant CVI migrations are explicitly excluded from inspected `runtime-bootstrap.ts`.
- Decide fail-closed production behavior when `AUTH_ENFORCEMENT_ENABLED=false`, including migration strategy for existing single-site operators and local tests.
- Independently approve cross-workflow lock order, permission mapping, error statuses and audit semantics.
- Establish a representative disposable PostgreSQL + HTTP regression matrix before code changes.

## Regression acceptance matrix
| Case | Expected result |
|---|---|
| Active global operator + active editor membership + explicit edit grant + correct site | One draft-only update |
| Global viewer or revoked/expired session | Denial; no draft update |
| Active operator without membership or with read-only grant | Denial; no draft update |
| Cross-organization or cross-site plan ID | Denial; no mutation or target leakage |
| Membership/grant revoked before authorization | Denial; no mutation |
| Operation commits before concurrent revocation | Exactly one authorized update; later attempts denied |
| Invalid confirmation, stale revision token, approval already committed | Denial; no mutation |
| Auth disabled in deployable environment | Fail closed per approved policy (currently unresolved) |

## Restrictions
Documentation-only design. This PR does not apply migrations, modify runtime code, seed grants, access production DB, contact providers, publish, merge or deploy. A passed design CI is not authorization to enable editing.
