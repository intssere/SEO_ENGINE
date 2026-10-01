# P8.8 W09-C3F-A-F23 — clean-state immutable image transition authorization

## Verdict

**READY FOR SEPARATE EXPLICIT PRODUCTION IMAGE-TRANSITION AUTHORIZATION.**

F23 is repository-only. It performs no Railway mutation.

## Why this is the fix

The F22 redeploy committed `AUTH_PUBLIC_ORIGIN` successfully, but the GitHub-source Docker build failed closed because the Railway source archive has no Git identity available to the build provenance CLI:

`git_identity_unavailable`

The provenance gate is behaving as designed and should not be weakened.

The intended Production path was already established:
- F16 produced a signed, content-addressed GHCR release;
- F18 proved Railway can pull that exact image and that `/api/healthz` reaches successful readiness;
- F19 disabled Production GitHub autodeploy;
- F20 blocked the image transition only because an unrelated staged AUTH_PUBLIC_ORIGIN patch existed;
- F22 resolved that patch.

That blocker is now gone.

## Current Production state

- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- service: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`
- name: `seo-engine-shadow`
- source: GitHub `intssere/SEO_ENGINE` / `main`
- autodeploy: disabled
- `AUTH_PUBLIC_ORIGIN`: effective
- effective staged/pending mutations: none
- service remains online on the prior successful deployment.

Railway may internally surface an empty patch with `changes: []`; this is not an effective mutation and the primary service/environment config reports no staged changes.

## Certified target image

`ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22`

F18 already proved:
- exact digest pullability by Railway;
- one-shot deployment SUCCESS;
- successful `/api/healthz` readiness;
- no retry was needed.

## Permitted future transition

A separately authorized F23 live operation may:
1. replace only the service source from GitHub repo/branch to the exact digest-pinned image;
2. stage only that source change;
3. re-read the environment and refuse to commit if any unrelated effective change appears;
4. commit the exact source transition;
5. permit exactly one resulting `seo-engine-shadow` deployment;
6. observe it to a terminal state;
7. if it succeeds, verify service health and preserved configuration;
8. if it fails, stop without retry or additional mutation.

## Exact authorization literal

`AUTHORIZE W09-C3F-A-F23 PRODUCTION IMMUTABLE IMAGE TRANSITION — on Railway project 52265e29-921b-4652-ac0d-9da4e5e69936 environment 7f8d920f-f6c6-44f0-b9fe-252cb4f32298 service 1e8c1e7d-16f7-4c63-8193-1021bcbe6d90 (seo-engine-shadow), replace only the current GitHub source intssere/SEO_ENGINE main with exact image ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22, stage only that source change, verify no unrelated effective staged changes, then commit exactly that source transition and permit exactly one resulting service deployment; preserve all existing variables including AUTH_PUBLIC_ORIGIN, GitHub autodeploy=false, domain/port, healthcheck, runtime/replica config, Postgres reference, volume state, and all other state; no additional variable/config/domain/database/volume mutation, no Neon/Production DB/provider/public-site action, no scheduler/worker activation, no retry if deployment fails.`

## Hard exclusions

F23 does not authorize:
- execution before the exact live authorization is supplied;
- any rebuild of GitHub source;
- any weakening/bypass of the build provenance gate;
- additional variable or service configuration changes;
- domain/Postgres/volume changes;
- Neon/Production DB action;
- provider/public-site writes;
- scheduler/worker activation;
- automatic retry.

## Post-transition acceptance

A successful live F23 execution requires:
- exactly one source transition;
- exactly one deployment attempt;
- terminal Railway deployment status `SUCCESS`;
- `/api/healthz` readiness through Railway;
- source reports the exact digest-pinned image;
- no effective staged changes remain;
- `AUTH_PUBLIC_ORIGIN` remains defined;
- domain, healthcheck, Postgres reference, volume and safety-state remain unchanged.
