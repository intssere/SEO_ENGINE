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
- autodeploy: enabled
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

After this exact toggle is separately authorized and executed, F19 must re-read the live service and prove autodeploy is disabled while all protected state remains unchanged. Only then may PR #710 be reconsidered for a separate merge authorization.
