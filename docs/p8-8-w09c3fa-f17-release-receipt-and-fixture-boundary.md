# P8.8 W09-C3F-A-F17 — GHCR release receipt certification and disposable Railway fixture authorization boundary

## Result

**F16 RELEASE RECEIPT CERTIFIED / DISPOSABLE RAILWAY FIXTURE CONTRACT IMPLEMENTED / FIXTURE EXECUTION STILL CLOSED.**

F17 is repository-only. It certifies the completed one-shot GHCR publication and converts the F13 disposable-fixture rules into an exact fail-closed validator. It does not create, configure, deploy, expose, or delete any Railway resource.

## Canonical F17 parent

- repository: `intssere/SEO_ENGINE`
- canonical `main` commit: `df4e1bcbfc59a113b9e6a86beeee06e557500680`
- canonical root tree: `cb60442c5260f6850d1609bb718951ba88335a86`

## Certified F16 release receipt

F17 binds the successful F16 execution to:

- execution branch commit: `efbbfe3432d98fd79b3f5f856168192cbd79a6e7`
- executable workflow blob: `43ae0e3b4d4794b8a0bc91bf288efbea99f2abbb`
- GitHub Actions run: `36827923903`
- run number: `1`
- run attempt: `1`
- conclusion: `success`
- total authorized branch push runs observed: `1`

Certified application source:

- source commit: `9ba3640d8f50843da8609608124918fa356d552c`
- source tree: `75b750b59f2de907a121c61907c2f1cfe7364c1f`
- source branch identity: `main`

Published tag:

`ghcr.io/intssere/seo-engine:sha-9ba3640d8f50843da8609608124918fa356d552c`

Immutable image identity:

`ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22`

Build/push evidence:

- platform: `linux/amd64`
- target: `runtime`
- provenance: `mode=max`
- SBOM: enabled and published
- pinned Node base OCI index: `sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6`
- pushed manifest/list digest: `sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22`

The build/push path reported the exact GHCR digest after registry upload. F17 certifies that push receipt; it does not claim that Railway has already pulled the image.

## Attestation receipt

The F16 attestation reported:

- attestation type: Build Provenance
- attestation ID: `51725303`
- subject: `ghcr.io/intssere/seo-engine`
- subject digest: `sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22`
- Public Good Sigstore signing: confirmed
- Rekor transparency-log upload: confirmed
- repository attestation upload: confirmed
- registry attestation upload: confirmed
- registry attestation artifact digest: `sha256:0673fc4a0aaa55319887e8c7de814955fa46463bc2e106fd2ac638417c5722ad`

## Railway current-state read

A live read-only Railway MCP call was attempted against the previously certified project/environment/service context. The platform returned:

`You don't have the required role (viewer) on this resource.`

Therefore F17 makes no fresh claim about current Railway topology.

Protected Production identities remain hard-forbidden in the fixture validator:

- project: `02dc27bb-fe66-4ba3-bc36-a251ff562836`
- Production environment: `27eadb42-53cd-4158-a1c1-1142c38bc30e`
- existing Production service: `850c4b59-4f32-4d06-ab46-bcb6f48aaeee`
- existing Production service name: `seo-engine-shadow`

## Disposable fixture authorization contract

A future executable fixture packet must prove all of the following immediately before execution:

- exact Railway project;
- exact non-Production environment ID and name;
- live Railway read-back verified;
- new fixture service name absent from the target environment;
- zero existing-service mutation;
- exact immutable image:
  `ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22`;
- exact digest pullability verified;
- expected canonical source commit/tree;
- exact healthcheck path and expected HTTP `200`;
- maximum deployment count `1`;
- zero variable mutation;
- zero database attachment;
- zero persistent volume;
- zero custom domain;
- zero provider calls;
- zero scheduler/worker activation;
- zero Production cutover;
- mandatory teardown;
- teardown scope exactly `fixture_service_only`;
- separate explicit authorization.

A tag-only image reference is not admissible.

## Current fixture gate

The certified F17 receipt records:

- `railwayLiveReadBackVerified=false`
- `registryPullabilityVerified=false`
- `fixtureExecutionAuthorized=false`

These are deliberate fail-closed values.

Before any future Railway fixture execution:

1. Railway access must independently confirm an exact non-Production environment and the absence of the proposed fixture service name.
2. The exact digest must be confirmed pullable by the path Railway will use.

Until both are true, no fixture authorization packet can pass.

## Repository artifacts

F17 adds:

- `artifacts/api-server/src/lib/p8-8-w09c3fa-f17-release-receipt-fixture-boundary.ts`
- `artifacts/api-server/src/lib/p8-8-w09c3fa-f17-release-receipt-fixture-boundary.test.ts`
- this document.

The certified receipt emits:

`f17-receipt-<sha256(evidence)>`

A future fully authorized fixture packet emits:

`f17-fixture-<sha256(packet)>`

Neither identifier is itself authorization.

## Security boundary

F17 performs and authorizes none of:

- Railway project/environment/service creation;
- Railway source/config changes;
- Railway variable changes;
- Railway deployment;
- Railway domain creation;
- Railway database attachment;
- Railway persistent volume;
- Railway teardown;
- staged `AUTH_PUBLIC_ORIGIN` accept/discard;
- Neon access;
- Production DB SQL/DDL/DML;
- provider/public-site writes;
- scheduler/worker/autonomy activation;
- Production cutover.

## Verdict

F16 one-shot GHCR release: **CERTIFIED**.

Exact image digest: **CERTIFIED**.

Provenance/SBOM receipt: **CERTIFIED**.

GitHub/Sigstore attestation receipt: **CERTIFIED**.

Disposable Railway fixture contract: **IMPLEMENTED**.

Live Railway topology re-read: **BLOCKED BY CURRENT RAILWAY ROLE / NOT CERTIFIED**.

Exact digest pullability from Railway: **NOT YET VERIFIED**.

Railway fixture deployment: **NOT AUTHORIZED / NOT EXECUTED**.

Production transition: **NOT AUTHORIZED**.

## Next boundary

After F17 is CI-clean and separately merged, the next milestone should be **W09-C3F-A-F18 — live Railway non-Production fixture preflight and exact one-shot deployment/teardown authorization packet**.

F18 must remain read-only until it can prove current Railway access, exact non-Production environment identity, fixture-service absence, and exact digest pullability. Only then may it define a separate one-shot deploy-and-teardown authorization literal.
