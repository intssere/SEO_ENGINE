# P8.8 W09-C3F-A-F11 — Content-addressed Railway deployment transport architecture

## Result

**RAILWAY DOCKER-IMAGE SOURCE SUPPORTED / CONTENT-ADDRESSED OCI TRANSPORT ARCHITECTURE SELECTED FOR CERTIFICATION / LIVE SOURCE SWITCH NOT AUTHORIZED.**

F11 is architecture/repository research only. It performs no image build or push, no Railway source/configuration change, and no deployment.

## Authoritative Railway findings

Railway documents a service as a deployment target whose runtime is a container deployed from an image. Railway services can use a Docker Image, GitHub repository, or local repository as their source.

Railway documents public image sources from Docker Hub, GitHub Container Registry (GHCR), Quay.io, and GitLab Container Registry. Its IaC reference likewise supports an image source, and the CLI exposes `railway service source connect --image ...`.

Railway also documents that mutable image tags can resolve to newer digests: for an unversioned tag such as `:latest`, a redeploy pulls the latest image digest. Therefore tags are not acceptable provenance identities.

These findings establish a supported transport class that can avoid the opaque F9/F10 local-source-upload receipt boundary: build an OCI image outside Railway, identify it by immutable registry digest, then configure Railway to consume that immutable image identity.

## Selected architecture

The candidate chain is:

`GitHub exact commit object -> F4 source attestation -> F6/F7 exact source artifact identity -> deterministic/provenance-bound OCI build -> registry authoritative OCI digest -> Railway image source pinned to repository@sha256:digest -> Railway deployment identity`.

The registry digest becomes the transport identity. Railway no longer needs to prove the exact bytes of a CLI source archive because Railway consumes an already content-addressed image.

## Required evidence layers

A future certification must independently prove all of the following:

1. **Canonical source lineage** — repository, exact commit SHA, root tree SHA, and branch are authoritative and mutually consistent.
2. **F6/F7 source identity** — exact source artifact SHA-256 is derived under the already-certified contracts.
3. **OCI build provenance** — the produced image digest is cryptographically/provenance-bound to that exact canonical source identity and build definition. Merely building from a checkout is insufficient.
4. **Registry authority** — a supported registry returns the immutable image digest for the pushed artifact.
5. **Railway source association** — Railway's read-only control plane shows the exact service source as `repository@sha256:<digest>`, not a mutable tag.
6. **Deployment association** — the resulting Railway deployment is associated with that service/source revision without contradictory evidence.

## Why this is stronger than F9/F10 local upload

F9/F10 reached a platform boundary: Railway exposes a source-code snapshot but no documented cryptographic digest/manifest for the uploaded source archive.

OCI registries are content-addressed by digest. If the build provenance is independently bound to F4/F6/F7 and Railway is configured to consume the exact digest, the missing local-upload archive receipt is no longer part of the trust chain.

This does **not** solve every remaining Production gate. In particular, the separate C3F/C2Z Railway -> external Neon structural binding requirement remains unchanged.

## Registry choice

**GHCR is the preferred candidate for the next certification phase**, because the canonical source repository is already on GitHub and Railway explicitly supports GHCR image sources. This is an architectural preference only; no package, workflow, credential, or registry resource has been created.

A public image would avoid registry credentials at Railway. A private image may require registry credentials and Railway plan support; any such credential handling requires a separate security/config authorization.

## Immutable reference rule

Only `repository@sha256:<64 lowercase hex>` is accepted by the F11 evaluator.

Rejected:
- `:latest`;
- semantic/version tags alone;
- commit-SHA tags alone;
- a tag plus a locally asserted digest without registry authority;
- Railway deployment success without exact source association;
- locally constructed evidence pretending to be a Railway observation.

The pure F11 evaluator certifies structural equality only. It does not acquire registry or Railway evidence.

## Build provenance requirement

F11 intentionally does not declare a particular builder or signing mechanism yet. The next phase must evaluate a reproducible/provenance-capable build path such as GitHub Actions + OCI registry attestations, while ensuring the resulting digest is bound to:
- exact canonical commit;
- exact canonical root tree;
- exact F6/F7 source artifact;
- exact Dockerfile/build definition;
- build platform/architecture;
- dependency/base-image identities as required by the threat model.

A registry digest alone proves image content identity, not that the image came from the intended source.

## Migration safety

The existing Railway GitHub-source service must not be switched in place during architecture evaluation.

Any future live proof should first use a disposable/non-production service or other isolated fixture. The existing staged `AUTH_PUBLIC_ORIGIN` patch and Railway-managed shadow Postgres must remain untouched.

A Production source-mode transition, if eventually approved, requires its own exact change plan, rollback identity, healthcheck plan, and explicit user authorization.

## F11 verdict

Railway Docker-image source capability: **SUPPORTED**.

Content-addressed registry transport: **ARCHITECTURALLY VIABLE**.

Exact OCI build provenance for SEO ENGINE: **NOT YET CERTIFIED**.

Railway live digest-pinned association: **NOT EXECUTED**.

Production source transition: **NOT AUTHORIZED**.

External Neon structural association: **STILL SEPARATE / UNPROVED**.

## Next milestone — F12

**W09-C3F-A-F12 — deterministic OCI build provenance and registry-attestation contract.**

F12 should remain offline/repository-only initially and define:
- canonical build inputs;
- image/config/manifest/index digest semantics;
- multi-architecture handling;
- base-image pinning;
- GitHub Actions/OIDC provenance options;
- registry-authoritative digest observation;
- exact evidence needed before any image push or Railway fixture.

No image push, package publication, Railway mutation, or deployment is authorized by F11.

## Hard exclusions

No Railway source connect/disconnect, config/IaC apply, upload, deployment/redeploy, variables, staged patch, service mutation, image push, package publication, credentials, Neon/DB/SQL, provider/public writes, Stage 0, or cutover.
