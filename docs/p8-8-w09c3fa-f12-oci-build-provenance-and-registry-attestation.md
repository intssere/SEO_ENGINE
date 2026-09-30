# P8.8 W09-C3F-A-F12 — deterministic OCI build provenance and registry-attestation contract

## Result

**OCI CONTENT-ADDRESSABLE BUILD CONTRACT IMPLEMENTED / GITHUB ARTIFACT-ATTESTATION PATH SUPPORTED BY AUTHORITATIVE DOCUMENTATION / LIVE IMAGE BUILD OR PUSH NOT AUTHORIZED.**

F12 is repository/offline-only. It creates no package, image, registry object, workflow run with package-write/OIDC permissions, Railway source mutation, or deployment.

## Why F12 exists

F11 selected a digest-pinned OCI image as the candidate transport around the F9/F10 Railway local-upload receipt gap. F12 defines the evidence needed before that image digest can be trusted as representing the exact SEO ENGINE canonical source.

An OCI digest is strong content identity, but a digest alone does not prove source lineage. F12 therefore requires independent binding among:

1. canonical Git repository, commit, and root tree;
2. certified F6/F7 source-artifact identity;
3. exact build definition identity;
4. exact platform set and per-platform manifest identities;
5. immutable base-image identities;
6. build-result image/index digest;
7. registry-authoritative digest observation; and
8. GitHub Actions build-provenance attestation whose subject and source identity match the same artifact.

## Authoritative external findings

The OCI Image Specification defines content-addressable image manifests and, for multi-platform images, an image index that references platform-specific manifests.

GitHub documents artifact attestations as signed provenance claims that bind build artifacts to build metadata including repository and commit SHA. For container images, GitHub's documented flow uses a fully qualified image subject name plus a SHA-256 subject digest. When `docker/build-push-action` is used, its digest output can supply that subject digest.

GitHub documents that container-image attestations can be pushed to the registry and subsequently verified with the GitHub CLI.

Docker documents provenance attestations for `docker/build-push-action`, including default provenance behavior and stronger provenance modes.

These capabilities are sufficient to define the contract. They do not by themselves authorize any workflow or registry write.

## Canonical F12 chain

`GitHub exact commit object -> F4 source attestation -> F6/F7 source artifact -> exact Dockerfile/build definition -> deterministic platform/base-image inputs -> OCI build result digest -> GHCR authoritative digest -> GitHub build-provenance attestation -> F12 verifier -> F11 digest-pinned Railway source`

F12 consumes an expected canonical context rather than trusting self-consistent caller-supplied lineage. Evidence passes only when the observed source lineage and build definition exactly match that expected context.

## Platform semantics

### Single platform

`platformMode=single_platform` requires exactly one sorted platform descriptor.

The top-level registry/build digest represents the image artifact being deployed; the platform descriptor records the platform-specific manifest identity used by the build.

### Multi-platform

`platformMode=multi_platform_index` requires at least two strictly sorted, unique platform descriptors with distinct manifest digests.

The top-level registry/build digest represents the OCI image index. Each platform descriptor identifies a platform-specific child manifest.

A future live materializer must prove the index-to-child-manifest relationship from registry-authoritative evidence. F12's current pure verifier checks the supplied normalized evidence shape and equality only; it does not query a registry.

## Base-image rule

Each base image must be represented as:
- a stable image name; and
- an exact `sha256:<digest>` identity.

Mutable `:latest` references are rejected. A future builder should use digest-pinned `FROM` identities or otherwise prove the exact resolved base digest from builder provenance.

The contract intentionally keeps the base image name and digest separate rather than accepting a mutable tag as identity.

## Registry authority

The initial registry candidate is **GHCR**, matching F11 and the public `intssere/SEO_ENGINE` repository.

A future live evidence adapter must acquire the registry digest from an authoritative registry surface. It must not promote:
- a locally predicted digest;
- a tag;
- a digest copied from untrusted build text;
- Railway deployment success;
- or a caller-constructed object

to registry authority.

The F12 pure verifier accepts normalized `registryAuthority=ghcr_registry` evidence only after an external adapter has actually established that authority.

## GitHub artifact attestation contract

The normalized evidence requires:
- authority: `github_actions_artifact_attestation`;
- kind: `build_provenance`;
- exact subject name equal to the image repository;
- exact subject digest equal to the registry digest;
- attested repository equal to canonical repository;
- attested commit equal to canonical commit;
- immutable workflow reference in `path@40-hex-commit` form.

This reflects the provenance dimensions GitHub documents, while remaining stricter about the local normalized evidence used by SEO ENGINE.

A future implementation may use GitHub's `actions/attest` container-image flow with `subject-name`, `subject-digest`, and registry publication, but F12 does not add or run such a workflow.

## Deterministic evidence identity

On PASS, the verifier emits:

`f12-<sha256(canonical normalized evidence JSON)>`

This identifies the normalized evidence set. It is not a substitute for the OCI digest, registry authority, or GitHub signature.

## Fail-closed rules

F12 fails closed on:
- unknown fields;
- malformed commit/tree/source/build identities;
- source lineage mismatch;
- build-definition mismatch;
- unsorted/duplicate/invalid platform evidence;
- mutable or nondeterministically ordered base-image evidence;
- build-result versus registry digest mismatch;
- attestation subject versus registry digest mismatch;
- attestation repository/commit mismatch;
- credential-shaped material.

No retry or live fallback is implied.

## Reproducibility boundary

F12 does **not** claim that Docker/BuildKit builds are byte-for-byte reproducible merely because inputs are pinned.

A future build certification must control or explicitly attest all build inputs that can affect the resulting digest, including at minimum:
- source artifact;
- Dockerfile/build definition;
- build context;
- build args;
- target;
- platform;
- base-image digests;
- builder/frontend identity where material;
- network dependency behavior where material;
- generated timestamps or other nondeterministic metadata where material.

The authoritative artifact identity remains the resulting OCI digest plus provenance, not an unsupported assertion of reproducibility.

## Future live gate prerequisites

Before any image push or disposable Railway fixture, require a separate explicit authorization packet covering only the bounded action. At minimum it must specify:
- exact canonical commit/tree;
- exact F6/F7 source-artifact digest;
- exact build-definition digest;
- exact workflow revision;
- target image repository;
- permitted registry write scope;
- expected platform set;
- permitted attestation write;
- zero Production Railway source changes;
- no Neon/DB/provider operations;
- one-shot/no-retry behavior unless separately approved.

## F12 verdict

OCI source/build provenance contract: **IMPLEMENTED**.

OCI content-addressable digest semantics: **SUPPORTED BY OCI SPECIFICATION**.

GitHub Actions container-image artifact attestation mechanism: **SUPPORTED**.

GHCR preferred registry path: **ARCHITECTURALLY COMPATIBLE**.

SEO ENGINE image built/pushed: **NO**.

Registry-authoritative SEO ENGINE digest observed: **NO**.

GitHub attestation generated/verified for SEO ENGINE image: **NO**.

Railway digest-pinned fixture: **NO**.

Production source transition: **NOT AUTHORIZED**.

External Neon structural association: **STILL SEPARATE / UNPROVED**.

## Next milestone — F13

**W09-C3F-A-F13 — offline OCI release workflow specification and disposable-fixture authorization boundary.**

F13 should define, without executing:
- a pinned GitHub Actions build/push/attestation workflow;
- exact action revisions;
- least-privilege permissions;
- immutable base images;
- one-shot GHCR package naming/tagging conventions;
- registry digest capture and attestation verification receipts;
- disposable Railway fixture inputs and teardown boundary.

No workflow execution, image push, package publication, Railway mutation, or Production cutover is authorized by F12.
