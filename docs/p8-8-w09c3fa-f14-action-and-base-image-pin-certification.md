# P8.8 W09-C3F-A-F14 — exact action-revision and base-image pin acquisition/certification

## Result

**EXACT RELEASE DEPENDENCY PINS ACQUIRED / BASE IMAGE PINNED / INERT WORKFLOW SOURCE DEFINED / NO LIVE RELEASE EXECUTION AUTHORIZED.**

F14 remains repository/research-only. It does not publish an image, package, or attestation; it does not create or mutate any Railway resource; and it does not touch Neon, Production data, provider writes, schedulers, workers, or autonomous execution.

## Canonical parent lineage

F14 was created from canonical GitHub `main`:

- repository: `intssere/SEO_ENGINE`
- parent commit: `1fd9055d08b2891ffdb3d30b1ad774f4ef1d0e9c`
- parent root tree: `9338242983577e6905275f79b83c7da8e14e40aa`
- pre-F14 Dockerfile Git blob: `123a8629559e61e1d714c19c48bd1674db465bd9`

The F14 branch is `p8-8-w09c3fa-f14-dependency-pins`.

## Exact GitHub Action revisions

The selected revisions are exact 40-hex commits. Each repository was independently read at the selected commit and its `action.yml` blob identity recorded.

| Role | Repository | Release | Exact commit | action.yml blob |
| --- | --- | --- | --- | --- |
| checkout | `actions/checkout` | `v7.0.1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | `5b0524f730db83f9513c18ab31a6c086c7239076` |
| Buildx setup | `docker/setup-buildx-action` | `v4.3.0` | `37fe631027851001ddb9b187196cc803df7f5f0e` | `1ea4b62fdb83f1818d5ba23e69e5b0df7652b606` |
| registry login | `docker/login-action` | `v4.6.0` | `dbcb813823bdd20940b903addbd779551569679f` | `6eadfff765e47ed2882bd843fbe9a0193acc069d` |
| build/push | `docker/build-push-action` | `v7.4.0` | `c3c9e263c25d99ce0380d002d59b67737d91b0dc` | `7a1a94d46f66694384cb558b6f164027cdc3b667` |
| artifact attestation | `actions/attest` | `v4.2.2` | `1e69f48acb82d1966a394da916b4c1698aa569d6` | `f3d593f3020cf14b65d2789e3788d015354475e9` |

Publisher/repository identity is explicit in the action repositories and metadata:
- GitHub-maintained actions: `actions/checkout`, `actions/attest`;
- Docker-maintained actions: `docker/setup-buildx-action`, `docker/login-action`, `docker/build-push-action`.

No mutable major/minor tag is used in the F14 workflow source.

## Base-image acquisition

The canonical Dockerfile used the same mutable tag in both stages:

`node:24.19.0-bookworm-slim`

Docker Hub identifies that tag as a multi-platform Node image. F14 acquired the immutable OCI index digest:

`sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6`

Both build and runtime stages are now pinned as:

`node:24.19.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6`

The human-readable tag remains only as a version label; the digest is the immutable content identity.

Pinned Dockerfile SHA-256:

`406c49b7d8dec8e3c0fb48e0c4b05d4f1f2dce82c1a82535a48a2c2a08f48b40`

## Exact build contract

F14 fixes the future release build contract to:

- platform: `linux/amd64`
- target: `runtime`
- Dockerfile: `Dockerfile`
- provenance: `mode=max`
- SBOM: enabled
- push: required by the future F13 release profile, but **not executed in F14**
- build arguments:
  - `EXPECTED_CANONICAL_COMMIT`
  - `EXPECTED_CANONICAL_TREE`
  - `EXPECTED_SOURCE_BRANCH`
- registry candidate: GHCR
- image repository: `ghcr.io/intssere/seo-engine`
- no `latest` tag

Single-platform semantics are intentionally retained here to avoid introducing an unneeded multi-platform release/index certification surface before the first bounded release.

## Inert workflow source

F14 adds:

`docs/p8-8-w09c3fa-f14-oci-release.inert.yml`

This source is deliberately inert:

- it is outside `.github/workflows`;
- it declares `on: []`;
- its release job has an always-false guard;
- all third-party actions are pinned to the exact commits above;
- it contains the exact F13 permission profile;
- it specifies the exact build platform, target, provenance, SBOM, tag form, digest handoff, and attestation subject.

It is a reviewable source artifact only. Moving it into `.github/workflows`, changing its trigger, or running an equivalent live workflow requires a fresh explicit authorization and a later certified boundary.

## Pure certification contract

F14 adds:

- `artifacts/api-server/src/lib/p8-8-w09c3fa-f14-dependency-pins.ts`
- `artifacts/api-server/src/lib/p8-8-w09c3fa-f14-dependency-pins.test.ts`

The validator fails closed if any of these change:

- canonical parent commit/tree;
- pinned Dockerfile SHA-256;
- workflow location/inert state;
- platform, target, build args, provenance, or SBOM;
- action repository/release/commit/action-metadata blob;
- base-image repository/tag/digest/authority/stage set;
- immutable-dependency assertion;
- live-execution authorization state.

A PASS emits deterministic evidence identity:

`f14-<sha256(normalized evidence JSON)>`

## Security and authorization boundary

F14 authorizes none of the following:

- GHCR authentication execution;
- image build/push;
- package creation;
- OIDC token issuance for release;
- artifact-attestation publication;
- Railway service/source/config/IaC/deployment changes;
- Railway disposable fixture creation;
- staged `AUTH_PUBLIC_ORIGIN` patch accept/discard;
- Neon access;
- Production DB session or SQL;
- migration;
- provider/public-site write;
- Stage 0 execution;
- scheduler/worker/autonomous activation;
- Production cutover.

## F14 verdict

Exact action revisions: **ACQUIRED AND PINNED**.

Action publisher/repository identity: **VERIFIED AT SELECTED COMMITS**.

Current Node base-image identity: **ACQUIRED AND DIGEST-PINNED**.

Build platform/target/args/provenance/SBOM: **EXACTLY DEFINED**.

Fully pinned workflow source: **DEFINED BUT INERT**.

Live OCI publication: **NOT AUTHORIZED / NOT EXECUTED**.

Railway fixture: **NOT AUTHORIZED / NOT EXECUTED**.

Production transition: **NOT AUTHORIZED**.

External Neon structural association: **STILL SEPARATE / UNPROVED**.

## Next boundary

After F14 merges, the next repository-only boundary should be **F15 — inert pinned OCI release preflight verifier / exact release authorization packet**, binding the final merged canonical commit/tree and workflow blob before any one-shot live GHCR authorization is considered.
