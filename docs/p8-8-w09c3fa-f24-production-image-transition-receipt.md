# P8.8 W09-C3F-A-F24 — Production immutable-image transition receipt and closeout

## Verdict

**F23 LIVE TRANSITION: SUCCESSFULLY CONSUMED AND CLOSED OUT.**

F24 is repository-only. It records the exact successful Production transition and authorizes no new live action.

## Canonical repository state

- repository: `intssere/SEO_ENGINE`
- canonical main at F23 execution: `ba83d67b9679f6b5a3a29438bac1a9645b2e6cc5`

## Railway target

- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- service: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`
- name: `seo-engine-shadow`

## Exact immutable source

`ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22`

The service source is no longer GitHub repo/branch. It is pinned to the exact immutable digest above.

## Deployment receipt

- deployment ID: `18486079-d88f-4376-bc5c-abc14e190b7c`
- snapshot ID: `2d3f0422-9c0d-4507-b1c4-870e56822077`
- created: `2026-10-01T15:24:54.602Z`
- settled: `2026-10-01T15:25:18.214Z`
- terminal status: `SUCCESS`
- deployment attempts: exactly 1
- retries: 0
- replicas: 1/1 running

Railway accepted the exact digest and the configured healthcheck gate passed before the deployment reached SUCCESS.

## Preserved Production configuration

Verified preserved:
- `AUTH_PUBLIC_ORIGIN` remains present;
- domain `seo-engine-shadow-production.up.railway.app`;
- target port `8080`;
- healthcheck `/api/healthz`;
- healthcheck timeout `120` seconds;
- runtime/replica configuration;
- `DATABASE_URL` reference to Postgres service `b69e0633-7ab9-40ab-85f3-c9edd6acb031`;
- Postgres volume `5e7f09d1-c436-4a49-9526-c3150d0e820a`;
- all unrelated variables and safety-state.

No effective staged changes remained after the transition. Railway may surface an internal empty patch with `changes: []`; it represents no effective mutation.

## Provenance outcome

The prior GitHub-source Docker build failed closed with `git_identity_unavailable` because Railway's source archive did not expose the Git identity required by the build-provenance CLI.

F23 did not bypass or weaken that gate.

Instead, Production switched to the already-certified F16 release image, whose exact digest had already been proven deployable and healthy on Railway during F18.

This closes the GitHub-source build blocker by eliminating that build path from Production rather than reducing provenance requirements.

## Safety closeout

F23/F24 performed no:
- additional variable mutation beyond the already-completed F22 `AUTH_PUBLIC_ORIGIN` binding;
- domain mutation;
- Postgres or volume mutation;
- Neon/Production DB operation;
- provider/public-site action;
- scheduler/worker activation;
- automatic retry.

## Next boundary

Production release transport is now on a digest-pinned immutable-image model.

Any future Production release must use a newly certified immutable image and a fresh explicit transition authorization. A normal merge to GitHub `main` no longer changes Production automatically.

Before any future release:
1. build and attest the candidate image;
2. certify its exact digest;
3. verify it in a disposable/non-Production Railway fixture;
4. prepare a fresh single-purpose Production source-transition packet;
5. require explicit authorization before staging/committing the new image.

F24 itself authorizes no deployment, source change, variable/config change, DB/provider action, or runtime activation.
