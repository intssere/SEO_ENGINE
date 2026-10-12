# CVI-1C.78 — Container Entrypoint and Bootstrap Execution Boundary

## Parent evidence
CVI-1C.77 draft PR #1138, HEAD `321c55cfe9bbb5dd378c4a7af84dce6811ce6257`. This is an offline read-only examination of repository deployment files and CLI source, not a verification of actual Railway deployment configuration or live running images.

## Verified code paths
- Root `Dockerfile` builds the API server and frontend in the build stage. The runtime stage copies API bundles, migration SQL files, and frontend static files, runs as non-root `node`, and sets `CMD ["node","--enable-source-maps","artifacts/api-server/dist/index.mjs"]`. No `bootstrap:runtime` or schema migration command appears in its Docker build or runtime instructions.
- `artifacts/api-server/src/index.ts:20–38` invokes `ensureDiamondShelfIdentity` when `DATABASE_URL` is present, refusing startup if the database identity is not ready. This inspected startup entrypoint is read-only, unlike the explicit bootstrap CLI.
- `lib/db/src/bootstrap-runtime.ts` explicitly imports and invokes `bootstrapRuntimeDatabase()` and returns a nonzero exit code when blocked. `lib/db/package.json` exposes it as `pnpm --filter @workspace/db bootstrap:runtime`. It must not be run against production without separate authorization.
- `.railway/railway.c3c-scaffold.ts` explicitly declares itself an **offline, non-applicable scaffold**, not deployable Railway Infrastructure-as-Code. It cannot establish actual environment/command state.

## Security implications
The examined root Dockerfile's default startup does **not** invoke the site reactivation writer. That limits the CVI-1C.76 risk for this particular startup path; it does not prove that Railway or another deployment manager has no command override, one-off migration job, operator task, or historical invocation. The mutating CLI remains capable of the bootstrap organization→site upsert, including `sites.is_active=true` on conflict.

## Required evidence before any production claim
Obtain separately authorized *read-only* production service command/configuration, image digest or deploy artifact provenance, and migration history. Compare the actual command and automation jobs against the inspected Docker CMD and explicit bootstrap CLI. Treat absent deployment evidence as unknown. Do not access production DB or secrets in this workstream.

## Restrictions
Documentation-only, isolated draft PR. No external provider calls, Railway mutation, production database access, migration execution, authorization handler modification, merge, publishing or deployment.
