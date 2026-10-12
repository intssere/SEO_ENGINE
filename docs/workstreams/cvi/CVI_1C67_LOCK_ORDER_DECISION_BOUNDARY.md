# CVI-1C.67 — Lock-Order Decision Boundary and Integration Admission

## Certified parent
CVI-1C.66 draft PR #1123 at exact HEAD `6ae7e02423059e616d36f8eca08f181340dd04fb`, 36-step CI passed: https://github.com/intssere/SEO_ENGINE/actions/runs/38238462518.

## What disposable tests establish
The CVI-1C.65 synthetic shared-row test verifies that a second PostgreSQL connection waits for the first writer's row lock, then finishes after commit. CVI-1C.66 tests two synthetic rows called “plan” and “grant” locked in identical plan → grant order by competing transactions, with final marker verification. These tests are useful database primitives but **do not prove that plan → grant is the correct application-level lock order**.

## Verified source ordering
- `artifacts/api-server/src/lib/operational-data.ts`: `editProposalDraft` and `decideProposalReview` each lock an `action_plans` row (`FOR UPDATE OF ap`) in `sql.begin`; session/tenant/site mutation grants are not transactionally fenced in these handlers.
- Dormant `lib/db/migrations/0016_cvi_acquisition_revocation_serialization_draft.sql`: acquisition nonce admission locks site → connection → session → membership → read grant using `FOR SHARE`. Its trigger does not authorize draft editing.
- Dormant `0012_cvi_tenant_site_acl_draft.sql`: `review_content` is not an `edit_draft` grant; the latter does not yet exist.

## Decision boundary: pause production implementation
| Decision | Status | Owner required |
|---|---|---|
| Dedicated site-scoped `edit_draft` capability and role mapping | Unapproved | Product + security |
| Existing route behavior when auth enforcement is off | Unapproved | Platform + security |
| Unified ordering across plan, site, session, membership and grant mutations | Unapproved | Database + security |
| Activation/rollout/rollback of dormant ACL schema or reviewed replacement | Unapproved | Database + platform |
| Disposable HTTP integration and concurrent revocation acceptance matrix | Incomplete | QA + security |
| Merge and production release | Not authorized | Accountable release owner |

## Recommended next engineering increment
Prepare a **read-only handler-to-revocation SQL call graph**, with exactly named transaction boundaries, candidate row-lock modes, and no-op dry-run requirements. Run a **separate, non-production, synthetic counterexample test** only if it adds evidence beyond the now-certified CVI-1C.65/66 serialization tests. Do not extend the production edit handler, add grants, activate draft migrations or infer authority from CI.

## No-production-change declaration
This document contains no production database changes, migration activation, provider invocation, website crawl or CMS publication, merge, or deployment. A passing CI result is not an independent security approval.
