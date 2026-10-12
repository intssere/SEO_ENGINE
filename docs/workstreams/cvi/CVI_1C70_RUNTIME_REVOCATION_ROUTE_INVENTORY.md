# CVI-1C.70 — Runtime Revocation Route Inventory and Evidence Limits

## Baseline
Stacked on CVI-1C.69 draft PR #1127 at `3acc8687e138e8f12f7b78f7ffc7177e161f20d1`. Repository tree enumerated at this exact commit (1,904 paths, not truncated); reviewed `artifacts/api-server/src/middlewares/auth-security.ts`, `artifacts/api-server/src/lib/cvi-tenant-site-grant-policy.ts`, and `artifacts/api-server/src/lib/cvi-gsc-private-express-db-composition.ts`. GitHub's default-branch code search returned zero results for selected dormant ACL identifiers, which **does not establish absence on this workstream branch**.

## Observed runtime boundaries
- `auth-security.ts`: `attachAuthSession` returns to the next middleware if `config.enabled` is false or `config.configured` is false; `requireApiAuthentication` likewise allows the request to continue when auth is disabled. Configured-but-missing authentication is denied; misconfigured-and-enabled returns 503. This is **not proof that CVI mutations must allow disabled auth**, and such behavior requires a product/security decision.
- `cvi-tenant-site-grant-policy.ts`: `reviewCviTenantSiteGrant` is explicitly a **pure review of caller-supplied hypothetical snapshots**, `authorizationGranted:false`, `performsPersistence:false`. It is not a live API that updates membership or grant status.
- `cvi-gsc-private-express-db-composition.ts`: `createCviPrivateExpressDbComposition` is a server-private, read-only, unmounted composition. It requires an authenticated request context and a server-owned SQL client, and cannot be used to infer a membership/grant revocation route or proposal mutation authority.
- `0012_cvi_tenant_site_acl_draft.sql` declares membership/site grant revocation states and audit event vocabulary, but neither the enum nor the event names establish a shipped API route.
- `0016_cvi_acquisition_revocation_serialization_draft.sql` protects dormant read acquisition admission with site→connection→session→membership→grant shared locks, not `edit_draft`.

## Route inventory classification
| Candidate | Source-backed classification | Implication |
|---|---|---|
| Session load, rotation and revocation in `auth-foundation.ts` | Live database functions | Session revocation lock path exists independently of proposal transaction |
| API authentication middleware in `auth-security.ts` | Live middleware | No transaction-scoped tenant/site mutation authorization fence |
| Tenant/site grant policy helper | Pure hypothetical evaluator | Not a production revocation route |
| GSC private DB composition | Unmounted, read-only | Not a production ACL writer |
| Draft ACL migration revocation statuses | Dormant schema | No route existence established |
| Membership/site-grant mutation HTTP handlers | **Not established by this selective inspection** | Requires an explicit full source-route and deployment-wiring audit |

## Next verifications
Inspect Express router registration and all route handlers on the **workstream branch**, then grep for write SQL on `cvi_organization_memberships`, `cvi_site_read_grants`, provider connection state and site lifecycle. For each actual writer record HTTP route, permission gate, transaction boundary, row-lock order, audit outcome, tests, and deployment status. This inventory is **not a claim of exhaustive absence**.

## Boundary
Documentation-only. No runtime changes, ACL activation, new grant permissions, production database operations, provider calls, crawling, CMS publishing, merges or deployments. Security and database policy approvals remain pending.
