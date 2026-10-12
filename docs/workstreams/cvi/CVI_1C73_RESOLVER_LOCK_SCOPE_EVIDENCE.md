# CVI-1C.73 — Dormant Resolver SQL-Lock Scope and Route Completeness

## Source baseline
Stacked on CVI-1C.72 PR #1132 at `b6d6bb93cccbf75d06a589811169c674623e441f`. Inspected the remaining `routes/health.ts` and `routes/provenance.ts` and the private `cvi-gsc-server-scope-resolver.ts` and `cvi-gsc-scoped-readback-postgres-adapter.ts`.

## Specific findings
- `routes/health.ts:6` exposes `GET /healthz`; `routes/provenance.ts:6` exposes `GET /provenance`. Neither directly refers to dormant membership/grant revocation.
- `cvi-gsc-server-scope-resolver.ts:17–39` constructs a parameterized join from a recorded acquisition to site, connection, session, organization membership and `read_evidence` grant, including a single SQL `LIMIT 2 FOR SHARE OF s,c,se,m,g` clause. This is a scoped **read-only** historical candidate check. Source comments explicitly state that migrations 0012–0016 are required and it is **not mounted in live runtime**.
- That resolver does not contain an `UPDATE`, `DELETE`, or `INSERT` for `cvi_organization_memberships` or `cvi_site_read_grants`. `FOR SHARE` protects against concurrent writes *during the statement/transaction only*. Calling this resolver using an ordinary standalone SQL statement does not create a cross-handler authorization fence for a subsequent proposal mutation transaction.
- `cvi-gsc-scoped-readback-postgres-adapter.ts` delegates to a scoped SELECT SQL string and has no HTTP route, live provider call, or revocation writer. The adapter documents that the SQL client and identity must be server-supplied.

## Coverage accounting
The `routes/index.ts` import list contains 14 router modules: `health`, `provenance`, `auth`, `dashboard`, `authority`, `operational`, `competitor-acquisition`, `competitor-pilot-execution`, `signal-collection-execution`, `task53-write-scope`, `connections`, `pilot`, `execution`, and `authority-opportunities`. Source inspection in CVI-1C.71–73 covers each of these route modules for **direct** dormant ACL table/revocation identifiers, but NOT the complete downstream execution/provider/database writer call graph. Absence of a route with a matching name is not proof that no delegated writer exists.

## Next evidence requirement
Perform branch-aware full source inspection of runtime data-access modules and SQL files, classify occurrences of `cvi_organization_memberships`, `cvi_site_read_grants`, `UPDATE sites`, `UPDATE connections`, and direct `auth_sessions` writes into production runtime, dormant-only code, migrations, and disposable tests. Then identify every mutation handler's gates and lock ordering. No assertion of global absence or production safety is warranted yet.

## Restrictions
Read-only investigation and documentation only. No production database access, handler modifications, ACL activation, new edit grants, real provider calls, crawl or CMS changes, merge or deployment.
