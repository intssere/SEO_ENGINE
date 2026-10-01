# P8.8 W09-C3F-A-F18 — disposable project authorization packet

## Status transition

This document supersedes the *current-state* blocker set in the earlier F18 live-preflight document while preserving that earlier document as historical evidence.

An explicitly authorized Railway mutation created exactly one isolated private disposable project:

- project: `ba649d1b-049e-4100-a141-b91f80f2b9cd`
- name: `seo-engine-f18-fixture`
- workspace: `59f3284e-8f24-4948-895a-489377ee95ea`
- default environment: `9874824f-9baf-4ff2-91f4-83f815ab872b`
- environment name: `production`

The environment name is Railway's default name inside the new project. Operationally this is **not the SEO ENGINE Production environment**: it belongs to the newly created disposable project and has no services, deployments, buckets, database, volume, domain, source binding, or variables.

## Verified empty state

Immediately after creation:

- services: `0`
- deployments: `0`
- buckets: `0`
- staged changes: none
- pending effective resource changes: none

A later Railway capability inspection displayed an empty pending patch with `changes=[]`; direct Railway status still reported no staged changes and no resources. This empty patch carries no effective mutation and is not accepted or committed.

## Production isolation verification

The original live SEO ENGINE project remains:

- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- app: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90` / `seo-engine-shadow`
- Postgres: `b69e0633-7ab9-40ab-85f3-c9edd6acb031`
- volume: `5e7f09d1-c436-4a49-9526-c3150d0e820a`
- staged patch: `5d9ed802-32c2-4d0a-ac8a-b45a010ca535`
- staged variable includes `AUTH_PUBLIC_ORIGIN`

The disposable-project creation did not mutate those resources.

## Registry-pullability constraint

Exact image:

`ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22`

Neither the execution environment nor Railway's available read-only tools can probe GHCR anonymously. Therefore:

`registryPullabilityPreverified=false`

F18 does not convert this unknown into a claim.

Because the target project is now empty, isolated, disposable, and has exact service-only teardown available, the bounded one-shot fixture deployment itself is the only available proof path. A pull failure is treated as fixture failure and still requires service deletion.

## Atomic create/deploy capability

Railway's agent reported that `createServiceTool` can atomically create one service with:

- exact `config.source.image`;
- exact `config.deploy.healthcheckPath`.

The same atomic creation triggers exactly one initial deployment.

The required healthcheck is:

`/api/healthz`

No second deployment or automatic retry is permitted.

## Teardown capability

Railway's agent reports:

- `removeServiceTool(serviceId)` is available;
- it removes exactly one service by ID;
- it does not remove the project/environment or unrelated resources.

Therefore the mandatory teardown scope remains:

`service_id_only`

The disposable project itself may remain empty after teardown. Whole-project deletion is not part of this packet.

## Exact live authorization literal

The exact future one-shot execution authorization is:

`AUTHORIZE W09-C3F-A-F18 ONE-SHOT RAILWAY FIXTURE — target disposable project ba649d1b-049e-4100-a141-b91f80f2b9cd environment 9874824f-9baf-4ff2-91f4-83f815ab872b; create exactly one service named seo-engine-f18-fixture-run from ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22 with healthcheck /api/healthz in the atomic create operation; exactly one deployment attempt and no retry; observe the deployment to terminal state; if and only if Railway reports SUCCESS treat exact-digest pullability and HTTP-200 healthcheck as proven; regardless of success or failure delete exactly the created service by returned service ID using removeServiceTool; no variables, database, volume, domain, GitHub source, provider calls, scheduler/worker activation, Production SEO ENGINE mutation, staged AUTH_PUBLIC_ORIGIN mutation, Neon/Production DB access, or Production cutover.`

This literal is not self-authorizing. It must be supplied by the operator in a later message.

## Execution semantics after authorization

The execution must:

1. re-read the disposable project and prove zero services and zero deployments;
2. create exactly one service named `seo-engine-f18-fixture-run` atomically with the exact digest-pinned image and `/api/healthz`;
3. allow exactly the single initial deployment;
4. observe it to terminal state without retry;
5. treat `SUCCESS` as proof that Railway pulled the exact digest and its configured healthcheck returned HTTP 200;
6. treat every other terminal result as failure;
7. in either case, delete exactly that returned service ID using `removeServiceTool`;
8. re-read the project and prove services return to zero;
9. make no Production, database, volume, variable, domain, provider, scheduler/worker, Neon, or cutover mutation.

## Merge boundary

PR #710 remains draft.

The live SEO ENGINE Production app is still connected to GitHub `main`; therefore merging PR #710 would itself trigger another Production deployment attempt. That is separate from the disposable-project fixture and remains unauthorized unless explicitly accepted by the operator.
