# P8.8 W09-C3F-A-F6 — deterministic source-artifact provenance contract + pure verifier

## Result

**REPOSITORY CONTRACT IMPLEMENTED / CONTROLLED-UPLOAD PROVENANCE FAIL-CLOSED / NO LIVE UPLOAD AUTHORIZED.**

F6 implements the repository-only provenance boundary selected by canonical F5. It does not upload or deploy anything.

## Canonical chain

`GitHub exact commit object -> F4 commit/tree attestation -> exact Git-tree materialization -> canonical F6 manifest -> deterministic artifact -> detached F6 envelope -> controlled Railway upload -> Railway deployment/snapshot receipt -> F6 verifier -> C2G commit/tree/branch identity`

The F4 attestation remains authoritative for Git commit-to-tree identity. F6 does not independently claim that arbitrary bytes are a Git tree; the materializer must produce the manifest from an exact checkout/archive of the attested commit and the eventual execution procedure must independently certify that materialization step.

## Source mode

F6 defines exactly:

`controlled_artifact_upload`

This value is intentionally distinct from GitHub-triggered deployment provenance. Railway Git variables must not be invented for an uploaded artifact.

## Canonical manifest

Each entry is exactly:

- `path`: normalized relative path, no absolute/backslash/dot traversal;
- `mode`: `100644`, `100755`, or `120000`;
- `size`: non-negative safe integer byte size;
- `contentSha256`: lowercase SHA-256 of exact file/symlink payload bytes.

Entries must be strictly ascending by path, unique, and non-empty.

Manifest identity algorithm `sha256-path-mode-content-v1` hashes UTF-8 lines of canonical JSON tuples:

`[path, mode, size, contentSha256]`

with one LF after every tuple. Filesystem timestamps, ownership, local absolute paths, and Git metadata directories are not identity inputs.

## Artifact identity

`artifactSha256` is the lowercase SHA-256 of the exact deterministic upload artifact bytes produced from the certified manifest.

F6 verifies the envelope/receipt artifact hash equality. The future materializer must separately prove that artifact bytes are a deterministic encoding of exactly the manifest entries. That byte-production implementation is intentionally not smuggled into this pure verifier.

## Detached envelope

The F6 envelope is generated outside the attested Git tree after source identity is frozen. It contains only allowlisted non-secret identity fields:

- schema `p8-8-w09c3fa-f6-v1`;
- source mode;
- repository, commit, tree, branch;
- manifest algorithm/hash;
- artifact hash;
- exact nested F4 source attestation.

Because it is detached, the envelope does not create a self-referential commit/tree problem.

## Railway receipt

After a separately authorized controlled upload, evidence must supply exactly:

- Railway project ID;
- environment ID;
- service ID;
- deployment ID;
- snapshot ID;
- source mode;
- artifact SHA-256;
- manifest SHA-256.

The receipt is not permission to deploy. It is post-action evidence consumed by the pure verifier.

The expected project/environment/service are caller-supplied certified context. Deployment and snapshot IDs must be non-empty syntactically bounded identifiers and become part of the deterministic F6 provenance ID.

## Pure verifier

`p8-8-w09c3fa-f6-source-artifact-provenance.ts` performs no network, filesystem, Git, Railway, database, environment, or provider I/O.

It fails closed on:

- unknown/missing fields;
- credential-shaped keys/values;
- malformed commit/tree/hash/path/mode/ID;
- non-canonical/duplicate/unsorted manifest;
- manifest mismatch;
- artifact/receipt mismatch;
- F4 attestation/envelope mismatch;
- expected repository/commit/tree/branch mismatch;
- expected Railway project/environment/service mismatch;
- source-mode confusion.

Only after PASS may its exact commit/tree/branch identity be adapted into the C2G build-provenance boundary for the controlled-upload path.

## Failure and rollback semantics

Before upload, any manifest/materialization/envelope verification failure means **zero upload**.

During a future disposable upload, timeout, ambiguous CLI result, missing deployment ID, missing snapshot ID, receipt mismatch, build failure, or inability to prove exact artifact association is **FAIL CLOSED**. Do not retry automatically.

A failed disposable deployment is evidence only and must never be promoted or treated as Production. Cleanup/cancel/delete is a separate mutation requiring explicit authorization unless included in the original bounded packet.

No failed or ambiguous run may mutate the canonical provenance record into PASS.

## First disposable upload authorization boundary

F6 does **not** grant this authorization.

A future explicit packet must name:

1. exact canonical repository commit and Git root tree;
2. exact F4 attestation ID;
3. exact canonical manifest SHA-256 and artifact SHA-256;
4. exact Railway project/environment/service target;
5. a disposable/non-production target boundary;
6. exactly one controlled source-artifact upload attempt;
7. no persistent variable/config change;
8. no staged-patch acceptance;
9. no database/Neon/provider/public-site access;
10. read-only observation of resulting deployment/snapshot/build status;
11. no automatic retry;
12. cleanup only if explicitly included.

If the target cannot be proven disposable/non-production before mutation, authorization must fail closed.

## F6 verdict

Canonical manifest contract: **PASS**.

Detached provenance envelope: **PASS**.

Pure verifier/tests: **IMPLEMENTED**.

Railway live upload: **NOT AUTHORIZED / NOT EXECUTED**.

Production readiness from F6 alone: **NO**.

## Next milestone — F7

**W09-C3F-A-F7 — deterministic artifact materializer + offline byte-for-byte certification.**

F7 should implement and test the deterministic materializer that converts an exact certified source tree/manifest into the exact upload bytes whose SHA-256 is carried by F6. It must remain offline/repository-only. Only after F7 certification should a disposable Railway upload authorization packet be executable.

## Hard exclusions

No Railway upload/deploy/redeploy/config/variable/staged-patch/IaC mutation; no Neon/DB/SQL; no provider/public writes; no scheduler/worker activation; no Stage 0; no cutover.
