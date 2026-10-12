# CVI-1C.75 — Site and Connection SQL Writer Boundary

## Verified parent
CVI-1C.74 draft PR #1134 HEAD `99c56dea8577fb8315aaf5043c437b3ca18517a0`; proof CI #38254644038 passed all 36 steps.

## Direct source evidence
- `artifacts/api-server/src/lib/operational-data.ts:39` resolves the active `diamondshelf.us` site using a SELECT from `sites`; it does not mutate site status in that statement. Proposal writes later lock `action_plans` as already documented in CVI-1C.68–74.
- `artifacts/api-server/src/lib/oauth.ts:156,201` looks up the active site by hard-coded domain. At :161 it upserts a `connections` record using `INSERT ... ON CONFLICT DO UPDATE`, including scopes, credentials reference, status, and metadata. At :209 it updates a Google connection to `connected` with property-selection metadata. These writes are live code paths and do not contain a transaction-scoped CVI site membership/read grant fence.
- `artifacts/api-server/src/routes/execution.ts` contains execution and approval route handlers but no directly matched SQL UPDATE/DELETE/INSERT against `sites`, `connections`, `cvi_organization_memberships`, or `cvi_site_read_grants` in the inspected source. Delegated helpers have not all been inspected.
- A guessed `artifacts/api-server/src/lib/runtime-readiness.ts` path does not exist. No claims are based on that nonexistent file.

## Security impact
Connection upsert and Google selection writes have to be included in future cross-handler lock-order analysis. The absence of a direct `sites` status writer in this *small inspected file set* does **not** mean no writer exists elsewhere. A true branch-wide runtime SQL writer search remains pending, including packages outside `artifacts/api-server`.

## Gate
The dormant CVI ACL's `read_evidence` grant does not confer `edit_draft`; the auth middleware's session snapshot is not sufficient authorization inside proposal mutation transactions. Require a separately approved product/security/database design before runtime modification.

## Boundaries
Documentation only. No production database read/write, migration activation, credential changes, real provider calls, crawling or publishing, merge or deployment. CI green certifies this branch's tested checks only.
