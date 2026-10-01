# P8.8 W09-C3F-A-F19 — Production GitHub autodeploy disable safeguard

## Purpose

F18 is functionally complete and CI-clean, but PR #710 remains draft because the live Railway service `seo-engine-shadow` is connected to GitHub `main` with autodeploy enabled.

Railway documentation states that disabling GitHub autodeploy stops deployments on new commits while preserving the repository connection and allowing manual deployment of the latest commit.

## Certified live state

- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- service: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`
- service name: `seo-engine-shadow`
- GitHub repo: `intssere/SEO_ENGINE`
- branch: `main`
- autodeploy: disabled
- staged patch: `5d9ed802-32c2-4d0a-ac8a-b45a010ca535`
- staged variable includes `AUTH_PUBLIC_ORIGIN`

Railway's read-only capability check reported exact control:

`serviceAutoDeployTool(serviceId, enabled=false)`

and confirmed this preserves source, branch, config, variables, domain, Postgres reference, volume state, and manual deployment capability.

## Exact authorization literal

`AUTHORIZE W09-C3F-A-F19 DISABLE PRODUCTION GITHUB AUTODEPLOY — on Railway project 52265e29-921b-4652-ac0d-9da4e5e69936 environment 7f8d920f-f6c6-44f0-b9fe-252cb4f32298 service 1e8c1e7d-16f7-4c63-8193-1021bcbe6d90 (seo-engine-shadow), set GitHub autodeploy enabled=false only; preserve repo intssere/SEO_ENGINE, branch main, service source/config, variables, domain, Postgres reference, volume state, staged patch 5d9ed802-32c2-4d0a-ac8a-b45a010ca535 including AUTH_PUBLIC_ORIGIN, and all other state; no deploy/redeploy, no repo disconnect, no branch change, no source mutation, no variable/domain/database/volume mutation, no Neon/provider/Production DB action, no Production cutover.`

## Hard exclusions

F19 does not authorize:

- any deploy or redeploy;
- repository disconnect;
- branch change;
- source change;
- variable mutation;
- staged patch accept/discard;
- domain mutation;
- Postgres or volume mutation;
- Neon/Production DB/provider action;
- Production cutover;
- F18 merge.

The operator disabled GitHub autodeploy manually in Railway, and a subsequent read-only verification proved:
- autodeploy `enabled=false`;
- GitHub repo remains `intssere/SEO_ENGINE`;
- branch remains `main`;
- service configuration remains unchanged;
- Railway domain remains `seo-engine-shadow-production.up.railway.app`;
- managed Postgres and its volume remain unchanged;
- staged patch `5d9ed802-32c2-4d0a-ac8a-b45a010ca535` remains staged;
- staged `AUTH_PUBLIC_ORIGIN` remains untouched;
- latest Production deployment remains `c4ed6319-8c02-416a-b8bf-4dbb1dd18454` / `FAILED`;
- no deploy or redeploy was triggered by disabling autodeploy.

F19 live safeguard is therefore complete. PR #710 may now be considered for a separate merge authorization because merging `main` should no longer auto-trigger Railway Production deployment attempts. PR #712 itself also requires its own separate merge authorization.
