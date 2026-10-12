# CVI-1C.59 — Draft Edit Authorization Decision and Security Review Packet

## Starting evidence
Stacked on CVI-1C.58 draft PR #1112 at exact HEAD `af8b6f54530a3a3495d8132b06da4b134dd4634f` (proof CI https://github.com/intssere/SEO_ENGINE/actions/runs/38230370374 passed all 36 steps). This packet is documentation-only and is **not approval** to implement, activate or deploy.

## What is actually demonstrated
- CVI-1C.55 tests an *in-memory synthetic* operator/editor plus site permission predicate, not schema authorization.
- CVI-1C.56 exercises a *disposable session-scoped* synthetic write transaction and post-revocation denial, not live site membership.
- CVI-1C.58 demonstrates that a dormant `review_content` read grant cannot substitute for `read_evidence` acquisition permission in existing private historical readback.
- The private composition in `artifacts/api-server/src/lib/cvi-gsc-private-express-db-composition.ts` explicitly returns `tenantAuthorizationForFutureOperations:false`, `executionAuthorized:false`, and `publicationAuthorized:false`; it cannot authorize a draft mutation.
- The existing API `PATCH /approvals/:id/draft` uses global operator role and modifies `action_plans.expected_outcome` in `sql.begin`. Draft ACL tables and operation-level edit grant are not active in inspected runtime bootstrap.

## Unresolved policy decisions requiring named accountable owners
| Decision | Proposed position, not yet authorized | Required sign-off |
|---|---|---|
| Mutation capability | Add a distinct per-site `edit_draft` capability; never treat `review_content` as edit permission | Product owner + security |
| Role mapping | Require both global operator/admin and effective org editor/owner plus active explicit site edit grant | Product owner + security |
| Session gate | Persisted active session checked inside update transaction; no sole reliance on middleware snapshot | Security + database owner |
| Auth-disabled environments | Fail closed in deployable environments; retain explicitly isolated local test behavior | Platform/security |
| Lock ordering | Independently establish common site/session/membership/grant/plan order against acquisition and approval/revocation paths | Database owner |
| Audit and errors | Denial reason visibility, append-only audit, generic cross-tenant response and nonleakage | Security/compliance |
| Migration rollout | New reviewed non-draft migration and explicit deployment gate, rather than automatic application of `0012`–`0016` | Platform/database owner |

## Required pre-implementation checklist
1. Resolve role/grant policy and choose a schema with explicit `edit_draft` permission; write migration/backfill and rollback strategy separately.
2. Verify PostgreSQL row-lock order under parallel revocation, draft edit, approval decision, and acquisition flows, including fresh `clock_timestamp()` checks after waits.
3. Prove transactional authorization-to-mutation with disposable PostgreSQL and HTTP requests, including IDOR/cross-site, stale revision, expired session, concurrent revocation and denial-with-zero-mutation cases.
4. Independently review migration activation, security behavior when auth is disabled, and protected site selection.
5. Only after approvals, propose a separately authorized runtime feature-gated implementation and production rollout plan.

## Restrictions
Draft design packet only. It does not alter handlers, activate migrations, seed permissions, access production databases, call providers, crawl or publish websites, merge or deploy. A green CI outcome is engineering hygiene, **not** business/security acceptance.
