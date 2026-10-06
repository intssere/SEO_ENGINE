# P12.2-L10.13D — compatible application image disposable fixture packet

## Purpose

L10.13D binds the newly released 44/47-compatible Production application image to a fresh one-shot Railway fixture proof before any Production source transition.

This milestone is repository-only. It performs no Railway mutation.

## Certified release

- source SHA: `1ba86a2b9fe18384bb526128db8757c8dd8b680a`
- source tree: `47513f433cf4a077bbf338231935e70a1297aad4`
- release workflow run: `37445409912`
- GitHub attestation: `53124772`
- image: `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`
- healthcheck: `/api/healthz`

## Disposable Railway target

The reusable isolated fixture is currently empty:

- project: `ba649d1b-049e-4100-a141-b91f80f2b9cd`
- environment: `9874824f-9baf-4ff2-91f4-83f815ab872b`
- services: 0
- staged changes: none

The future fixture service name is:

`seo-engine-l10-13d-fixture-run`

## Protected Production state

Production remains unchanged:

- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- service: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`
- service name: `seo-engine-shadow`
- current image: `ghcr.io/intssere/seo-engine@sha256:30632cc85de834c5dfb2ee6e34c55cab3e68d799ae69be8dcd8c0efa6fc3b283`
- current deployment: `2a826409-4ba5-4b49-84a9-991aff4351d6` / SUCCESS
- staged changes: none

## Future one-shot fixture semantics

After separate exact authorization, the live operation may:

1. re-read the fixture and Production snapshots and fail closed on any drift;
2. create exactly one fixture service from the exact new digest with healthcheck `/api/healthz`;
3. commit exactly the one fixture-service creation patch;
4. permit exactly one resulting deployment attempt and zero retries;
5. observe it to a terminal Railway state;
6. treat only terminal `SUCCESS` as proof of exact-digest pullability and healthcheck readiness;
7. regardless of success or failure, remove exactly that created fixture service;
8. re-read the fixture and require zero services and no staged changes;
9. verify Production remains unchanged.

No variables, database attachment, persistent volume, custom domain, provider calls, scheduler/worker activation, Production database action, or Production application transition are authorized.

## Authorization boundary

The deterministic authorization literal is generated only from the certified live snapshot:

`AUTHORIZE:P12_2_L10_13D_APP_IMAGE_FIXTURE:<packet-fingerprint>`

That literal authorizes the disposable fixture proof only. It does not authorize the later `seo-engine-shadow` image transition.

## Next boundary

Only after a successful fixture receipt and completed teardown may a fresh Production image-transition packet be prepared. That packet must bind the exact old Production image digest and the exact newly proven compatible image digest, and requires separate explicit authorization.
