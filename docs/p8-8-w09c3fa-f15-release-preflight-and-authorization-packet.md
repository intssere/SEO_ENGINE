# P8.8 W09-C3F-A-F15 — inert pinned OCI release preflight / exact authorization packet

## Result

**MERGED F14 SOURCE BOUND / INERT PREFLIGHT DEFINED / EXACT FUTURE AUTHORIZATION PACKET DEFINED / NO LIVE RELEASE AUTHORIZED.**

F15 is repository-only. It creates no executable workflow, registry package, image, attestation, Railway resource, database session, provider write, scheduler, worker, or deployment.

## Canonical lineage

F15 is based on canonical GitHub `main` after PR #704:

- repository: `intssere/SEO_ENGINE`
- canonical merge commit: `9ba3640d8f50843da8609608124918fa356d552c`
- canonical merged root tree: `75b750b59f2de907a121c61907c2f1cfe7364c1f`
- source branch: `main`

The root tree was observed in the successful PR #704 merge-ref CI for the exact certified base/head pair; the authorized merge used that unchanged pair, so F15 binds the actual canonical merge commit to that merged content tree.

## Bound F14 artifacts

- inert workflow source:
  - path: `docs/p8-8-w09c3fa-f14-oci-release.inert.yml`
  - Git blob: `8dc243e0f0eed1c79c43c331918b63e7e4ba8571`
- F14 dependency-pin validator:
  - path: `artifacts/api-server/src/lib/p8-8-w09c3fa-f14-dependency-pins.ts`
  - Git blob: `ebe98055d0c1dbe79e96d7188040b5cea560aaf3`
- digest-pinned Dockerfile:
  - path: `Dockerfile`
  - Git blob: `00ecc5a869065183dd6092e2aa88b3a7e6d26c28`

Any drift in these identities requires re-certification.

## Exact future OCI release contract

The only release shape represented by this packet is:

- registry: `ghcr.io`
- repository: `ghcr.io/intssere/seo-engine`
- tag: `sha-9ba3640d8f50843da8609608124918fa356d552c`
- source: `main@9ba3640d8f50843da8609608124918fa356d552c`
- tree: `75b750b59f2de907a121c61907c2f1cfe7364c1f`
- platform: `linux/amd64`
- target: `runtime`
- provenance: `mode=max`
- SBOM: enabled
- `latest`: prohibited
- automatic retry: prohibited
- parallel release: prohibited
- release attempts: exactly one if separately authorized

The exact F14 action pins and permission profile are retained without widening.

## Exact authorization boundary

F15 does **not** grant release authorization. It only defines the literal that a later explicit authorization must match:

```text
AUTHORIZE W09-C3F-A-F16 ONE-SHOT GHCR RELEASE — source main@9ba3640d8f50843da8609608124918fa356d552c tree 75b750b59f2de907a121c61907c2f1cfe7364c1f; publish exactly ghcr.io/intssere/seo-engine:sha-9ba3640d8f50843da8609608124918fa356d552c with the F14 pinned workflow/dependencies, linux/amd64 runtime target, provenance=max and SBOM; exactly one release attempt, no automatic retry, no latest tag, no Railway/Neon/Production/provider mutation.
```

Until that later authorization is explicitly supplied and revalidated against current canonical state, `authorization.granted` remains `false`.

## Fail-closed preflight

F15 adds:

- `artifacts/api-server/src/lib/p8-8-w09c3fa-f15-release-preflight.ts`
- `artifacts/api-server/src/lib/p8-8-w09c3fa-f15-release-preflight.test.ts`

The validator fails closed on:

- canonical commit/tree drift;
- F14 workflow/dependency-pin/Dockerfile blob drift;
- moving the inert workflow under `.github/workflows`;
- enabling a publish trigger;
- permission widening;
- mutable or changed action references;
- platform/target/build-argument/provenance/SBOM drift;
- registry/repository/tag drift;
- `latest` enablement;
- retries, parallel releases, or non-one-shot semantics;
- self-granted authorization;
- any live execution request.

A PASS emits both:

- `f15-<sha256(evidence)>`
- `f15-auth-<sha256(bound authorization packet)>`

These identifiers are evidence fingerprints only. They do not authorize execution.

## Security boundary

F15 authorizes none of:

- GHCR authentication;
- OCI build or push;
- package creation;
- OIDC token issuance;
- attestation publication;
- workflow installation under `.github/workflows`;
- Railway fixture/service/source/config/deployment mutation;
- staged `AUTH_PUBLIC_ORIGIN` accept/discard;
- Railway Postgres or volume changes;
- Neon access;
- Production DB SQL/DDL/DML;
- provider/public-site writes;
- scheduler/worker/autonomy activation;
- Production cutover.

## Verdict

Canonical merged F14 source: **BOUND**.

F14 workflow/dependency/Dockerfile identities: **BOUND BY GIT BLOB**.

Future GHCR release shape: **EXACTLY DEFINED**.

One-shot/no-retry/no-latest semantics: **EXACTLY DEFINED**.

Release authorization: **NOT GRANTED**.

Live OCI release: **NOT EXECUTED**.

Production/Railway/Neon/provider mutation: **NOT AUTHORIZED / NOT EXECUTED**.

## Next boundary

After F15 is reviewed, CI-clean, and separately merged, the next boundary may be **W09-C3F-A-F16 — one-shot GHCR OCI release execution**. F16 must re-read canonical `main`, revalidate this packet, and stop if source, tree, blobs, permissions, dependency pins, or authorization literal have drifted. F16 must still exclude Railway/Neon/Production/provider mutation.
