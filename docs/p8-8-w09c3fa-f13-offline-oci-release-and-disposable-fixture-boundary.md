# P8.8 W09-C3F-A-F13 — Offline OCI release workflow and disposable-fixture authorization boundary

## Result

**OFFLINE RELEASE WORKFLOW CONTRACT IMPLEMENTED / DISPOSABLE RAILWAY FIXTURE BOUNDARY IMPLEMENTED / NO LIVE RELEASE OR FIXTURE EXECUTION AUTHORIZED.**

F13 converts the F12 provenance model into an exact, reviewable release-workflow specification and a separately bounded future Railway fixture authorization packet.

## Release workflow specification

A future OCI release workflow must be defined at an immutable workflow revision and must consume an exact canonical SEO ENGINE source identity:

- repository;
- exact source commit SHA;
- exact source root tree SHA;
- exact F6/F7 source-artifact SHA-256;
- exact Dockerfile path and SHA-256;
- exact workflow path and workflow commit SHA.

The target registry is GHCR and the image repository must be explicit.

### Action pinning

Every third-party action must be pinned to an exact 40-hex commit SHA.

The contract models these required action roles:
- source checkout;
- Buildx setup;
- registry login;
- Docker build/push;
- artifact attestation.

Mutable action tags such as `@v4`, branches, or floating references are rejected.

F13 intentionally does not hard-code concrete action commit SHAs into the canonical contract. F14 or a live authorization packet must resolve and independently review exact revisions immediately before use.

### Permissions

The workflow permission contract is exact:

- `contents: read`
- `packages: write`
- `id-token: write`
- `attestations: write`

No broader repository permission is permitted by this F13 release profile.

These permissions are modeled because a future GHCR push requires package write access and GitHub artifact attestation may use OIDC-backed provenance and attestation write capability.

F13 does not execute a workflow with these permissions.

### Build requirements

The workflow spec requires:

- `push=true`;
- BuildKit provenance mode `max`;
- SBOM generation enabled;
- explicit sorted platform list;
- explicit sorted non-`latest` tags;
- no `latest` tag;
- exactly one bounded release execution.

Tags remain convenience locators only. The OCI digest is the release identity.

The workflow must capture the build/push digest as the authoritative handoff into the F12 registry/attestation verification stage.

## GHCR receipt expectations

A future authorized run must preserve enough read-only evidence to establish:

1. exact workflow run identity and immutable workflow revision;
2. exact canonical source commit/tree;
3. exact pushed image repository;
4. exact OCI digest returned by the build/push path;
5. registry-authoritative observation of the same digest;
6. GitHub artifact-attestation subject name and digest;
7. attested repository and commit;
8. F12 verifier PASS and deterministic F12 provenance ID.

A tag, successful workflow status, or package existence alone is insufficient.

## Disposable Railway fixture boundary

The future fixture is explicitly **not Production** and may not mutate an existing Railway service.

A valid authorization packet requires:

- exact Railway project ID;
- exact non-Production environment ID;
- a new fixture service name that must not already exist;
- exact immutable `repository@sha256:digest` image reference;
- expected canonical commit/tree;
- expected F12 provenance ID;
- exact healthcheck path and expected HTTP 200;
- maximum one deployment;
- mandatory teardown of only the fixture service.

The following are hard-false in the fixture packet:

- Production environment use;
- existing service mutation;
- variable mutation;
- database attachment;
- persistent volume;
- custom domain;
- provider calls;
- scheduler/worker activation.

The fixture exists only to prove that Railway can consume the exact digest-pinned image and produce a healthy isolated deployment.

## Teardown rule

A future live fixture authorization must include teardown in the same bounded packet.

Teardown scope is exactly:

`fixture_service_only`

It must not touch:
- the existing `seo-engine-shadow` service;
- Railway-managed Postgres;
- its volume;
- the staged `AUTH_PUBLIC_ORIGIN` patch;
- Production or shared variables;
- any domain;
- any Neon resource.

A failed fixture still requires teardown unless the platform cannot safely perform it, in which case the run fails closed and the leftover fixture must be reported for explicit operator cleanup.

## One-shot semantics

Both release and fixture execution are one-shot.

No automatic retry is authorized for:
- image publication;
- attestation publication;
- Railway fixture creation;
- fixture deployment;
- teardown retry.

A subsequent attempt requires a fresh authorization packet with current source and platform identities.

## Security boundary

F13 validators reject credential-shaped material. Authorization packets contain identities and permissions, not secrets.

Any future GHCR authentication must use the platform-native token/OIDC mechanisms defined by the approved workflow and must never serialize credentials into F12/F13 evidence.

Private-registry credential configuration on Railway is outside F13 and would require separate authorization. The preferred fixture path is a public GHCR image specifically to avoid introducing a registry secret at Railway.

## Current state

Implemented now:
- pure workflow-spec validator;
- exact permission contract;
- immutable action-revision rule;
- deterministic platform/tag rules;
- pure disposable-fixture authorization validator;
- immutable image-reference equality;
- explicit one-deployment/teardown boundary;
- credential rejection;
- deterministic evidence IDs.

Not executed:
- no workflow file has been added that can publish images;
- no action revisions have been selected for live use;
- no GHCR package has been created;
- no image has been built or pushed;
- no attestation has been created;
- no Railway fixture has been created;
- no service/source/config has been changed.

## F13 verdict

Offline OCI workflow specification: **IMPLEMENTED**.

Least-privilege release permission contract: **IMPLEMENTED**.

Exact action-SHA requirement: **IMPLEMENTED**.

Disposable Railway fixture authorization boundary: **IMPLEMENTED**.

Live image publication: **NOT AUTHORIZED / NOT EXECUTED**.

Live Railway fixture: **NOT AUTHORIZED / NOT EXECUTED**.

Production source transition: **NOT AUTHORIZED**.

External Neon structural association: **STILL SEPARATE / UNPROVED**.

## Next milestone — F14

**W09-C3F-A-F14 — exact action-revision and base-image pin acquisition/certification.**

F14 should remain repository/research-only and:
- resolve the current exact commit SHA for each required GitHub Action;
- review publisher/repository authenticity;
- resolve exact base-image digest(s);
- define the pinned workflow source without enabling a publish trigger;
- certify that all release dependencies are immutable before any live authorization.

No workflow run, image push, package publication, Railway mutation, or Production cutover is authorized by F13.
