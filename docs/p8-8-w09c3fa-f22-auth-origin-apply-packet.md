# P8.8 W09-C3F-A-F22 — operator-verified AUTH_PUBLIC_ORIGIN apply packet

## Verdict

**READY FOR SEPARATE EXPLICIT APPLY AUTHORIZATION.**

F22 is repository-only. It does not apply the Railway patch.

## Canonical baseline

- repository: `intssere/SEO_ENGINE`
- main: `ac5334d3a9ba20ec08ab38388135cb0ced0336cf`

## Operator-visible Railway evidence

The Railway dashboard change-review panel shows:
- `1 change to apply`;
- service `seo-engine-shadow`;
- `1 Variable`;
- variable `AUTH_PUBLIC_ORIGIN`;
- current value is empty/absent;
- new value is exactly:
  `https://seo-engine-shadow-production.up.railway.app`;
- Railway states `seo-engine-shadow will redeploy`;
- no separate service resource field diff is shown in the dashboard review.

This resolves the API/MCP visibility gap recorded by F21.

## Exact existing staged patch

`5d9ed802-32c2-4d0a-ac8a-b45a010ca535`

Target:
- project `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- service `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`
- service name `seo-engine-shadow`

## Permitted future live action

A separately authorized F22 live operation may:
1. commit the already-staged patch;
2. apply exactly one variable addition:
   `AUTH_PUBLIC_ORIGIN=https://seo-engine-shadow-production.up.railway.app`;
3. permit the single resulting `seo-engine-shadow` redeploy;
4. observe that deployment to a terminal state;
5. verify post-deploy that the staged patch is gone and the expected variable name is effective.

No additional staged or direct mutation is authorized.

## Exact authorization literal

`AUTHORIZE W09-C3F-A-F22 APPLY AUTH_PUBLIC_ORIGIN PATCH — commit only Railway staged patch 5d9ed802-32c2-4d0a-ac8a-b45a010ca535 in environment 7f8d920f-f6c6-44f0-b9fe-252cb4f32298 for service 1e8c1e7d-16f7-4c63-8193-1021bcbe6d90 (seo-engine-shadow), applying exactly one staged variable addition AUTH_PUBLIC_ORIGIN=https://seo-engine-shadow-production.up.railway.app and permitting only the resulting single service redeploy; preserve GitHub autodeploy=false, current GitHub source intssere/SEO_ENGINE main, all unrelated variables/config, domain, Postgres reference, volume state, and all other state; no source/image transition, no additional variable mutation, no domain/database/volume mutation, no Neon/Production DB/provider/public-site action, no scheduler/worker activation, no Production image cutover.`

## Hard exclusions

F22 does not authorize:
- execution before the exact literal above is supplied;
- source/image transition;
- additional variable mutation;
- custom/service domain mutation;
- Postgres/volume mutation;
- Neon/Production DB action;
- provider/public-site action;
- scheduler/worker activation;
- Production image cutover.

## Post-apply verification requirement

If separately authorized and applied:
- wait for the resulting service deployment to reach a terminal state;
- do not claim success until Railway reports `SUCCESS`;
- verify autodeploy remains disabled;
- verify pending/staged changes are empty;
- verify source remains GitHub `intssere/SEO_ENGINE` / `main`;
- verify domain/Postgres/volume state is unchanged;
- if deployment fails, stop and report exact failure without retry or additional mutation.
