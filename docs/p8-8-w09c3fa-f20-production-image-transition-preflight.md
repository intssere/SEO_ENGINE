# P8.8 W09-C3F-A-F20 — Production immutable-image transition preflight

## Verdict

**PRODUCTION IMAGE TRANSITION: BLOCKED / FAIL-CLOSED.**

F18 proved that Railway can pull the exact immutable GHCR release and that `/api/healthz` reaches Railway's successful readiness gate. F19 disabled GitHub autodeploy on the existing Production service.

F20 is repository/read-only preflight only. It performs no Production mutation.

## Canonical baseline

- repository: `intssere/SEO_ENGINE`
- main: `f0c7a1914f7d623112a7f096872935a7a8fc1735`

## Production identity

- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- service: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`
- service name: `seo-engine-shadow`
- current source: GitHub `intssere/SEO_ENGINE` / `main`
- GitHub autodeploy: disabled
- healthcheck: `/api/healthz`
- domain: `seo-engine-shadow-production.up.railway.app`

## Certified target image

`ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22`

F18 certified:
- exact-digest Railway pullability;
- one-shot deployment success;
- `/api/healthz` readiness;
- teardown back to zero disposable services.

## Railway transition capability

A read-only Railway capability check reported that the existing GitHub-backed service can be changed to the exact digest-pinned image through `updateServiceTool`.

The source transition would:
- remove the GitHub repo/branch binding;
- set `source.image` to the exact immutable digest;
- stage the source update only;
- not immediately deploy.

Applying the staged source change later requires committing Railway staged changes.

## Blocking staged patch

Production already has staged environment patch:

`5d9ed802-32c2-4d0a-ac8a-b45a010ca535`

The patch includes:
- a service resource update;
- staged variable `AUTH_PUBLIC_ORIGIN`.

Railway's read-only capability check established that committing staged changes operates at the environment level and applies **all staged changes**, not one selectively chosen patch.

Therefore staging an image-source transition while the existing patch remains staged would create a future commit boundary that could apply both:
1. the image transition;
2. the unrelated `AUTH_PUBLIC_ORIGIN` change.

That violates the required single-purpose Production transition boundary.

## Fail-closed rule

F20 refuses to authorize either image staging or image commit while an unrelated staged environment change exists.

Current deterministic result:

`blocked_unrelated_staged_changes`

Blocker:

`unrelated_staged_environment_patch`

## Required future sequencing

Before any Production image transition can be considered:

1. the existing staged patch must be independently resolved under its own explicit authorization;
2. Railway must then be re-read and prove no unrelated pending/staged changes;
3. Production service/source/domain/database/volume/autodeploy state must be re-certified;
4. exact target image and F18 fixture receipt must be re-bound;
5. only then may a new single-purpose image-transition authorization packet be defined.

F20 does **not** choose whether the existing patch should be applied or discarded. That is a separate operational decision.

## Hard exclusions

F20 authorizes none of:
- source/image mutation;
- staged patch apply/discard;
- deploy/redeploy;
- variable mutation;
- domain mutation;
- Postgres or volume mutation;
- Neon or Production DB access;
- provider/public-site calls or writes;
- scheduler/worker activation;
- Production cutover.

## Next boundary

After F20 is CI-clean and separately merged, the next milestone should resolve the pre-existing staged Production patch as a separately reviewed operation, then re-run an exact Production immutable-image transition preflight from a clean Railway environment state.
