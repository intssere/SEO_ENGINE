# P12.2-L10.13E — Production application image transition packet

## Purpose

L10.13E records the successful L10.13D disposable Railway fixture and prepares a fresh, exact authorization packet for the Production `seo-engine-shadow` application image transition.

This milestone is repository-only. It does not mutate Production.

## Proven candidate image

The candidate application image was released from:

- source SHA: `1ba86a2b9fe18384bb526128db8757c8dd8b680a`
- source tree: `47513f433cf4a077bbf338231935e70a1297aad4`
- release run: `37445409912`
- attestation: `53124772`
- immutable image: `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`

L10.13D independently proved Railway could pull that exact digest and pass `/api/healthz`.

## L10.13D fixture receipt

- fixture service: `a81b0011-5168-41fd-8039-4f38a435554e`
- creation patch: `2770df06-6494-4a5c-bbf8-9c8af9affc4f`
- deployment: `373ff9c3-da61-4575-b830-c06349d4105e`
- deployment snapshot: `2f3e404f-2604-410d-b425-c761cedc6611`
- terminal status: `SUCCESS`
- deployment attempts: 1
- retries: 0
- healthcheck: `/api/healthz`
- teardown patch: `8ebce117-8cf5-4398-b7af-0d3a0d98779f`
- detached volumes: 0
- final fixture service count: 0
- final fixture staged changes: none
- Production mutation during fixture: none

The consumed L10.13D authorization fingerprint was:

`0c1a4cd9ba7f1d39be34b0b8fd0d7156cee433df02aa397777833de8e0f89ee8`

It must never be reused.

## Current Production pre-transition snapshot

- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- service: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90` / `seo-engine-shadow`
- current image: `ghcr.io/intssere/seo-engine@sha256:30632cc85de834c5dfb2ee6e34c55cab3e68d799ae69be8dcd8c0efa6fc3b283`
- current deployment: `2a826409-4ba5-4b49-84a9-991aff4351d6` / SUCCESS
- service state: live / Online
- running replicas: 1 / 1
- region: `europe-west4-drams3a`
- healthcheck: `/api/healthz`
- healthcheck timeout: 120 seconds
- runtime: V2
- builder: Dockerfile / build environment V3
- Dockerfile path: `Dockerfile`
- restart max retries: 3
- Railway domain: `seo-engine-shadow-production.up.railway.app` on port 8080
- custom domains: 0
- attached volumes: 0
- active warnings: 0
- active criticals: 0
- recent failures: 0
- environment staged changes: none
- pending work: none

## Authorized transition semantics

A future exact L10.13E authorization may perform only:

1. re-read the entire certified Production snapshot and fail closed on drift;
2. stage one source-image replacement on `seo-engine-shadow`, from the exact old digest to the exact fixture-proven new digest;
3. inspect the staged patch and require the only effective Production resource change to be that service source image;
4. commit the staged source change once;
5. permit exactly one resulting forward deployment and zero retries;
6. observe that deployment to terminal state;
7. require `SUCCESS`, exact new image source, `/api/healthz` readiness, preserved domain/port, preserved runtime/build/deploy configuration, one healthy replica, and no remaining staged/pending work;
8. re-read Postgres presence and protected Production topology to prove no unrelated resource mutation.

The transition authorization does **not** authorize an automatic rollback. If the forward deployment does not reach `SUCCESS`, execution must stop and any rollback requires a fresh separate authorization.

## Explicitly excluded

L10.13E grants no authority for:

- migration `0010`;
- Production database reads or writes for migration certification;
- database attachment changes;
- variable changes;
- domain changes;
- volume changes;
- scheduler/worker activation;
- crawl/recovery execution;
- provider or public-site writes;
- a second deployment attempt;
- automatic rollback.

## Sequencing after transition

A successful L10.13E transition places a 44/47-compatible application image in Production before migration `0010`.

Only after the transition is independently certified should the L10.13C-A pre-apply read-only migration certification be considered. Migration `0010` remains a separate explicit authorization boundary.
