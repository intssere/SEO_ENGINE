# P8.8 W09-C3F-A-F10 — Railway upload-artifact receipt capability acquisition/review

## Result

**RAILWAY CODE-SNAPSHOT PHASE CONFIRMED / AUTHORITATIVE UPLOADED-ARTIFACT DIGEST OR MANIFEST NOT FOUND / CAPABILITY CONTRACT IMPLEMENTED / FAIL CLOSED.**

F10 is repository/research-only. No Railway upload, deploy, redeploy, configuration, variable, staged patch, database, Neon, provider, or public-site operation was executed.

## Authoritative findings

Railway's current CLI documentation says `railway up` scans, compresses, and uploads application files. It supports an explicit path, `--path-as-root`, `--no-gitignore`, target selectors, `--verbose`, and machine-readable `--json` output.

Railway's deployment-phase documentation separately states that during **Initialization**, Railway captures a **snapshot of source code** before the build phase.

This strengthens F9 in one narrow respect: a Railway snapshot is source-code related, not merely a generic runtime label.

It does **not** establish exact artifact identity. The documentation reviewed does not define the snapshot ID as a content digest, expose its canonical byte representation, expose a source-file manifest for the snapshot, or provide a cryptographic relation from the snapshot ID to the uploaded archive.

The currently available read-only deployment surface exposes `snapshotId`, but no uploaded archive SHA-256 or source manifest digest.

## Accepted F10 capability classes

F10 defines exactly three classes that could satisfy the missing server-side receipt primitive if they are Railway-authoritative and deployment/snapshot bound:

1. **archive_digest** — Railway returns SHA-256 of the uploaded source archive and documents a reproducible canonicalization.
2. **source_manifest** — Railway returns a cryptographically identified authoritative source manifest with a documented format that can reconcile exactly to F8.
3. **source_artifact_resource** — Railway returns an immutable source-artifact resource ID plus Railway-authoritative SHA-256 for that resource, bound to deployment and snapshot.

The pure evaluator validates only the structural evidence shape. A future adapter must obtain such evidence from an authoritative Railway surface; callers may not manufacture a passing object from local intent.

## Evidence explicitly rejected

The following remain insufficient:

- deployment success;
- build success;
- deployment ID alone;
- snapshot ID alone;
- CLI exit code;
- a locally calculated F7 artifact digest echoed by our runner;
- a locally calculated F8 inventory digest;
- Git commit/tree identity alone;
- build logs that merely show application build steps;
- source similarity or successful runtime behavior;
- secret-derived identifiers.

## Capability acquisition review

Documentation search covered Railway source upload, deployment snapshot, checksum/hash, archive, manifest, CLI JSON, and verbose-output concepts.

The strongest authoritative statement found is that Railway captures a source-code snapshot during initialization. No documentation reviewed exposes a digest/manifest interface for that snapshot.

Therefore F10 cannot promote the F9 deployment/snapshot receipt into exact uploaded-artifact provenance.

## Next acquisition routes

The remaining defensible routes are:

### Route A — Railway authoritative API/CLI surface

Discover a documented/read-only endpoint or CLI field that returns one of the accepted capability classes for a deployment/snapshot. This is preferred because it preserves the existing controlled-upload architecture.

### Route B — Railway vendor clarification

Ask Railway whether `snapshotId` identifies a content-addressed source object and whether an API can return its digest or source manifest. Any answer must identify a stable supported API/field; an informal assertion alone is not sufficient for automated provenance.

### Route C — change transport architecture

If Railway cannot expose a server-side receipt, use a transport whose uploaded artifact is itself content-addressed and independently retrievable/verifiable, then deploy that immutable artifact rather than relying on opaque CLI source upload semantics. This is an architecture change and requires a separate specification.

## F10 verdict

Railway source-code snapshot existence: **CONFIRMED**.

Snapshot content-addressing semantics: **NOT ESTABLISHED**.

Railway authoritative archive SHA-256: **NOT FOUND**.

Railway authoritative source manifest/digest: **NOT FOUND**.

Exact F7/F8 artifact -> Railway snapshot binding: **UNPROVED / FAIL CLOSED**.

Live disposable `railway up`: **NOT JUSTIFIED FOR PROVENANCE CERTIFICATION YET**.

## Next milestone — F11

**W09-C3F-A-F11 — content-addressed Railway deployment transport architecture evaluation.**

F11 should compare the remaining safe paths without live mutation: Railway-supported immutable image deployment, a content-addressed OCI image path, or another Railway-supported source artifact mechanism. The goal is to preserve canonical Git commit/tree + F6/F7 identity while gaining an independently verifiable artifact digest at the deployment boundary.

No transport change should be implemented until the architecture is certified.

## Hard exclusions

No Railway upload/deploy/redeploy/config/variables/staged-patch/IaC mutation; no Neon/DB/SQL; no provider/public writes; no scheduler/worker activation; no Stage 0; no cutover.
