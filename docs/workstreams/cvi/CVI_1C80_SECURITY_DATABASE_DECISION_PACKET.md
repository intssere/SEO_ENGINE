# CVI-1C.80 — Security and Database Decision Packet

## Evidence baseline
Stacks on CVI-1C.79 draft PR #1140, exact HEAD `aad9ff700084bb56d1325bee8a08e804f3ffb004`, with 36-step proof CI #38272865134 successful. This packet consolidates source-backed findings from CVI-1C.51–79. Passing CI on a draft branch is **not** a security decision, production deployment, or authorization to merge.

## Confirmed mutation and authorization boundaries
| Surface | Verified source behavior | Review impact |
|---|---|---|
| Proposal draft and review | `artifacts/api-server/src/lib/operational-data.ts` locks site-scoped `action_plans` with `FOR UPDATE OF ap` inside `sql.begin`, and then writes draft/decision records | No persisted session + tenant membership + site edit permission fence inside the same proposal transaction |
| Authentication | `auth-foundation.ts` independently issues, refreshes, rotates and revokes `auth_sessions`; `auth-security.ts` can skip enforcement when the configured feature is disabled | Snapshot in `req.auth` does not prove continued authorization at transaction time |
| Dormant tenant ACL | `0012_cvi_tenant_site_acl_draft.sql` contains membership and read/review/manage grants, not `edit_draft` | Separate product/security authorization design needed before mutation entitlement |
| Dormant acquisition | `0016_cvi_acquisition_revocation_serialization_draft.sql` uses site → connection → session → membership → read-grant `FOR SHARE` locks | Read acquisition admission cannot be promoted to proposal-edit authorization |
| OAuth connection state | `artifacts/api-server/src/lib/oauth.ts` upserts `connections` and updates selected Google connections to connected | Connection-state writers must be reconciled in a reviewed global lock discipline |
| Canonical site lifecycle | `lib/db/src/runtime-bootstrap.ts` explicit bootstrap upserts organization then site, setting `is_active=true` on conflict | Operator bootstrap can conditionally reactivate a disabled site and needs a recovery policy |
| API startup | `artifacts/api-server/src/index.ts` calls read-only `ensureDiamondShelfIdentity`; root Dockerfile runs this API entrypoint | Inspected default serving path does not call the mutating bootstrap CLI |
| Explicit bootstrap command | Root `db:bootstrap` script invokes `@workspace/db bootstrap:runtime` | Must be governed separately from serving startup; actual Railway override/operator history unverified |

## Evidence limits
- Synthetic CVI-1C.65/66 database contention tests establish PostgreSQL row-lock serialization, **not** real handler tenant authorization, universal deadlock freedom, or operation-time grant revocation.
- Mounted Express routers have been inspected for direct ACL-table names, but delegated helper call graphs and a complete branch-wide writer scan are **not** exhaustively certified.
- Production Railway start command, container revision, DB migration inventory and operational bootstrap history are unknown in this packet.
- CVI site grant schema is dormant; no live `edit_draft` policy or production transaction-scoped fence is certified.

## Decision matrix — requires accountable reviewers
| Decision ID | Required approval | Acceptance condition |
|---|---|---|
| CVI-SEC-01 | Product + security | Define `edit_draft` and `decide_review` independently, roles, organization/site scope, revocation and audit semantics |
| CVI-SEC-02 | Platform + security | Fail closed for protected mutations when auth enforcement is disabled/misconfigured and avoid relying on same-origin alone |
| CVI-DB-01 | Database + security | Adopt one documented lock ordering across plan, site, connection, session, membership, grant and relevant bootstrap/recovery writers |
| CVI-DB-02 | Database owner | Approve schema migration order, rollback and compatibility for dormant ACL 0012–0016 or a reviewed replacement |
| CVI-QA-01 | QA + security | Disposable two-connection tests for operation-first, revocation-first, lock-wait expiry, disabled auth, cross-tenant IDOR and rollback, bound to the **actual** edit handler |
| CVI-OPS-01 | Operations + security | Specify allowed bootstrap invokers, disabled-site reactivation controls, Railway command attestation, operational audit trail |
| CVI-REL-01 | Release owner | Require independent review, exact-head test results, stage-only rehearsal, rollback plan and separate production authorization |

## Recommended execution sequence
1. Obtain written policy decisions for edit/decision permissions, disabled-auth behavior and site reactivation.
2. Approve the unified lock order and map actual runtime writers exhaustively.
3. Create only reviewer-approved, additive migrations and handler integration on an independent workstream branch.
4. Execute disposable DB/HTTP concurrency and adversarial IDOR tests; verify fail-closed behavior.
5. Review staging implementation and operations evidence; release only after separate explicit authorization.

## Operational restrictions
**Documentation only.** No production database connections, SQL migrations, credentials, external provider calls, website crawl/publish, runtime authorization changes, merge or deployment. This packet requests decisions; it does not grant them.
