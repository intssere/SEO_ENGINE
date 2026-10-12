# CVI-1C.74 — Concrete Runtime SQL Writer Evidence

## Scope and baseline
Stacked draft on CVI-1C.73 PR #1133 at exact HEAD `2081ef8ae7ea59269dd3ee1d2f98f35fc3c71ce6`. Read-only inspection of four current-branch source files: `artifacts/api-server/src/lib/operational-data.ts`, `auth-foundation.ts`, `oauth.ts`, and `routes/connections.ts`. This is **not** a repository-wide scan and does not establish production deployment.

## Concrete writers
| Code | SQL writer | Transaction/authorization concern |
|---|---|---|
| `operational-data.ts:221–247` | `INSERT INTO approvals`, `UPDATE action_plans` inside `sql.begin` | Locks `action_plans` first; no persisted tenant membership/site grant authorization check in transaction |
| `operational-data.ts:295–342` | `UPDATE action_plans.expected_outcome` inside `sql.begin` | Same plan-first order and no transaction-scoped membership/grant fence |
| `auth-foundation.ts:294,336,366,382,401` | `INSERT/UPDATE auth_sessions`, `INSERT auth_audit_events` | Live session issuance, refresh, rotation, revocation and audit; separate from plan mutation tx |
| `oauth.ts:147–165` | `INSERT INTO connections ... ON CONFLICT ... DO UPDATE` | OAuth save chooses the active `diamondshelf.us` site and upserts connection status, scopes, credentials reference and metadata. No `cvi_organization_memberships` or site grant transaction fence in this function |
| `oauth.ts:197–215` | `UPDATE connections SET status='connected',metadata=...` | Google property selection reads site and connection, checks selected properties, then updates a connection outside an encompassing `sql.begin`; independent from dormant acquisition lock order |
| `routes/connections.ts` | No direct SQL statements identified by the selected SQL-pattern scan | Delegates OAuth connection writes to helpers, demonstrating why router-only searches are insufficient |

## Material conclusion
There **are live code paths that update connection authorization-relevant state**. Thus a database lock-order proposal must reconcile not only the dormant `0016` acquisition trigger's site→connection→session→membership→grant `FOR SHARE` sequence but also the OAuth connection upsert and Google connection selection writers, session revocation, and proposal plan writes. This does not imply these OAuth operations currently participate in CVI mutation authorization; the CVI tenant ACL remains dormant.

## Open items
Perform branch-aware scanning of the remaining runtime files and SQL helpers for writes to `sites`, `connections`, `cvi_organization_memberships`, `cvi_site_read_grants` and `auth_sessions`, including indirectly invoked modules. Identify route gates, role checks, CSRF, database transactions, and row-lock order for each. Do not equate availability of an OAuth route with authorization for CVI edit/publish operations.

## Restrictions
Documentation only. No execution of provider calls, credential operations, production database access, SQL migrations, code mutations to auth/ACL handlers, merge, deployment, or website writes. All production security decisions remain unapproved.
