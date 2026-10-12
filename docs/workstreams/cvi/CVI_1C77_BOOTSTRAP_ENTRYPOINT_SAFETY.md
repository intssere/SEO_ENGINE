# CVI-1C.77 — Bootstrap Invocation and Read-Only Startup Boundary

## Baseline
Stacked on CVI-1C.76 draft PR #1136 at `c7373efabcebbb1f3852995e0ccb947832859c59`. Read-only inspection of `artifacts/api-server/src/index.ts`, `artifacts/api-server/package.json`, `lib/db/package.json`, `lib/db/src/runtime-bootstrap.ts`. No database was connected to during this audit.

## Executable entrypoint separation
| Entrypoint | Code / command | Site-state effect from inspected path |
|---|---|---|
| API server startup | `artifacts/api-server/src/index.ts:20–38` dynamically imports `ensureDiamondShelfIdentity` on a nonempty `DATABASE_URL` | Calls **read-only** verifier, NOT `bootstrapRuntimeDatabase`; blocks startup when identity mismatch |
| API server `start` | `artifacts/api-server/package.json`: `node --enable-source-maps ./dist/index.mjs` | Routes through preceding read-only identity check |
| Explicit DB bootstrap CLI | `lib/db/package.json`: `bootstrap:runtime` runs `tsx src/bootstrap-runtime.ts` | Can invoke the mutating bootstrap after explicit operator execution; not the API startup path evidenced here |
| Bootstrap mutator | `lib/db/src/runtime-bootstrap.ts:281–380` | Advisory lock, possible core/auth DDL, then organization→site upsert; conflict sets `sites.is_active=true` at :271 |
| Startup identity verifier | `lib/db/src/runtime-bootstrap.ts:383–464` | Counts public tables; SELECT joins organization/site requiring canonical origin, platform, and `is_active=true`; no DDL or DML |

## Concrete risk interpretation
CVI-1C.76 identified a **conditional** site reactivation writer in `upsertDiamondShelf`. The default API server startup, as inspected, does **not** call it; startup uses `ensureDiamondShelfIdentity`, a read-only path that **fails startup when an existing canonical site is inactive**, rather than reactivating it. Running the explicit bootstrap CLI against a database may reactivate the site and therefore requires a separate operational authorization/release policy. Source inspection alone does not establish whether an external deployment job invokes this CLI.

`bootstrapRuntimeDatabase` explicitly applies only `0001_core.sql` and `0002_auth.sql` in this implementation; the dormant CVI tenant ACL migrations 0012–0016 are not activated by that function.

## Outstanding evidence
Inspect the actual bootstrap CLI implementation, `Dockerfile` / `railway.json` / CI deploy commands, process managers, and all infrastructure-specific entrypoints for calls to `bootstrap:runtime`. Review who may explicitly invoke bootstrap on a production binding, and whether a site-disabled state is meant to be permanent or requires a controlled recovery process. Do not infer runtime operational practice from package scripts alone.

## Boundaries
Documentation-only audit. No database connection, migration execution, provider access, secret rotation, external publication, merge, or deployment. The dormant `edit_draft` permission and production transaction-scoped ACL policy remain unapproved.
