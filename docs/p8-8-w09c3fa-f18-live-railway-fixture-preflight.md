# P8.8 W09-C3F-A-F18 — live Railway non-Production fixture preflight

## Result

**LIVE RAILWAY READ-BACK PASSED / NON-PRODUCTION FIXTURE TARGET ABSENT / EXACT DIGEST PULLABILITY UNVERIFIED / EXECUTION AUTHORIZATION BLOCKED.**

F18 is a read-only live preflight plus repository certification. It does not create an environment, service, deployment, domain, volume, database attachment, variable, or teardown action.

## Canonical parent

- repository: `intssere/SEO_ENGINE`
- `main`: `e4c696be88d63093c101d0efcb5faabadb4eb5ce`
- root tree: `779812dff9f6454837cab86183446a648e10b712`

## Live Railway topology

The Railway account now has read access to the currently visible SEO ENGINE project:

- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- project name: `SEO ENGINE`
- workspace: `intssere's Projects`

Exactly one environment exists:

- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- name: `production`

There is no eligible non-Production environment.

Current services:

- `seo-engine-shadow`
  - service ID: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`
- `Postgres`
  - service ID: `b69e0633-7ab9-40ab-85f3-c9edd6acb031`
  - persistent volume: `5e7f09d1-c436-4a49-9526-c3150d0e820a`

Production domain:

`seo-engine-shadow-production.up.railway.app`

Current production service healthcheck:

`/api/healthz`

## Protected staged Railway state

The production environment still has staged changes:

- patch ID: `5d9ed802-32c2-4d0a-ac8a-b45a010ca535`
- staged variable: `AUTH_PUBLIC_ORIGIN`

F18 does not accept, discard, edit, or otherwise mutate this patch.

## Automatic Production deployment hazard

The live service source is:

- repository: `intssere/SEO_ENGINE`
- branch: `main`
- check suites: enabled
- builder: Dockerfile

A merge to `main` currently produces Railway Production deployment attempts automatically.

The F17 merge created deployment:

`c4ed6319-8c02-416a-b8bf-4dbb1dd18454`

Observed status during F18 read-back:

`WAITING`

Recent prior main-triggered deployments are recorded as `FAILED`.

Therefore a repository merge is not operationally neutral while this source binding remains active.

F18 itself makes no Railway deployment call.

## Immutable F16 image

The only admissible fixture image remains:

`ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22`

No tag-only image is admissible.

## Registry pullability

F17 required independent proof that the exact digest can be pulled by the path Railway will use.

F18 attempted an anonymous registry HTTP probe from the execution environment, but outbound DNS resolution was unavailable. Therefore:

`registryPullabilityVerified=false`

This is not interpreted as a registry failure. It is an unverified prerequisite.

No registry credentials were introduced or serialized.

## Exact current blockers

The certified F18 live snapshot is intentionally **BLOCKED** with exactly:

1. `no_non_production_environment`
2. `registry_pullability_unverified`
3. `main_merge_triggers_production_deployment`

Because there is no exact non-Production environment ID, F18 does not fabricate an executable deployment authorization literal.

The certified snapshot records:

`executableAuthorizationLiteral=null`

## Future one-shot fixture packet

A future packet may pass only after a separate current-state read proves all of the following:

- project remains exactly `52265e29-921b-4652-ac0d-9da4e5e69936`;
- exact non-Production environment ID and name;
- environment independently read back;
- fixture service name independently proven absent;
- exact immutable image digest;
- registry pullability independently proven;
- healthcheck exactly `/api/healthz`;
- expected HTTP status exactly `200`;
- maximum deployment attempts exactly `1`;
- maximum teardown attempts exactly `1`;
- no variable mutation;
- no database attachment;
- no persistent volume;
- no custom domain;
- no provider calls;
- no scheduler/worker activation;
- no mutation of `seo-engine-shadow`;
- no mutation of staged patch `5d9ed802-32c2-4d0a-ac8a-b45a010ca535`;
- no Production cutover;
- teardown required;
- teardown scope exactly `fixture_service_only`;
- separate exact authorization literal supplied by the operator.

## Repository artifacts

F18 adds:

- `artifacts/api-server/src/lib/p8-8-w09c3fa-f18-live-fixture-preflight.ts`
- `artifacts/api-server/src/lib/p8-8-w09c3fa-f18-live-fixture-preflight.test.ts`
- this document.

The live preflight produces:

`f18-preflight-<sha256(snapshot)>`

A future fully proven packet would produce:

`f18-packet-<sha256(packet)>`

Neither fingerprint authorizes Railway mutation.

## Merge safety

Because `seo-engine-shadow` is connected to `main`, merging this F18 repository-only change may itself cause another Production Railway deployment attempt.

For that reason F18 should remain a **draft PR** until the repository-to-Production auto-deploy behavior is deliberately addressed or the operator explicitly authorizes a merge with awareness of that side effect.

A normal repository-only merge must not be described as side-effect-free while this live source binding remains in place.

## Verdict

Live Railway read-back: **PASS**.

Current Railway project identity: **CERTIFIED**.

Non-Production environment: **ABSENT**.

Production app/Postgres/volume/domain/staged patch: **PROTECTED / NO MUTATION**.

Exact GHCR digest: **BOUND**.

Registry pullability: **UNVERIFIED**.

One-shot fixture deployment authorization literal: **NOT ISSUED**.

Railway fixture: **NOT CREATED / NOT DEPLOYED**.

Production cutover: **NOT AUTHORIZED**.

## Next required boundary

Before a fixture can execute, an explicit infrastructure decision is required.

The safe next step is to establish an isolated non-Production Railway environment or separate disposable Railway project, while preserving Production resources and the staged patch. That creation is a Railway mutation and requires separate explicit authorization.

After the isolated target exists, re-run F18 current-state verification, prove exact digest pullability, certify the service name absence, and only then generate the exact one-shot deploy-and-teardown authorization literal.
