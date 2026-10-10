# P12.2 L10.41 — controlled image-release receipt integration design

**Issue:** #undefined. **Certified baseline:** GitHub main `1776064b63afddfaf030bcfeefcbf7bb9229a8e0`; post-merge CI `38035554268` SUCCESS.

**Mode:** documentation-only, non-executing. This PR does not change any release workflow, dispatch a build, or access external systems.

## Existing trusted and untrusted boundaries

- The application release workflow is `.github/workflows/p12-2-l2-production-image-release.yml`: manual `workflow_dispatch` gated on `main`, first attempt, exact `AUTHORIZE:P12_2_L2_PROD_IMAGE_RELEASE:<source sha>:<tree>`; Dockerfile runtime build on linux/amd64, pushed to `ghcr.io/intssere/seo-engine` with provenance max and SBOM; attestation subject tied to pushed digest and final registry digest check.
- `artifacts/api-server/src/lib/p12-2-l10-39-synthetic-receipt-parser.ts` deliberately accepts a **synthetic-only** envelope and is not an authenticated GitHub job-log parser or provenance validator.
- `artifacts/api-server/src/lib/p12-2-l10-40-sanitized-receipt-artifact.ts` is a pure offline allowlist projection, requiring precisely `source_sha`, `source_tree`, `image`. It has no network, upload, signing or registry verification capability. Both components have unit tests passing CI.
- The current release workflow prints `authorization` in the full human-readable log receipt. Do **not** put that full log/authorization input into a new artifact, log or annotation.
- L10.37's three authorized job-log reads were exhausted and did not yield a safely extractable historical receipt. Do not retry or infer digest absence.
- Historical Railway deployed image observed under exhausted L10.31 authorization: `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`. This observation is not continuously refreshed or currently attested.

## Proposed future workflow delta (requires separate scope and exact-head approval)

1. Keep existing dispatch verification, exact source/tree check, immutable build and digest verification unchanged. Do not broaden `workflow_dispatch`, packages permissions, deployment targets or provider access.
2. **After** the verified build-push digest equals the independently inspected registry digest, assemble three hardcoded-key input fields from trusted in-run outputs: source SHA, source tree and `ghcr.io/intssere/seo-engine@sha256:<64hex>`. Do not ingest raw logs, arbitrary user text, prior receipts, tags as identity or the authorization literal.
3. Run the L10.40 pure artifact projector (or a directly equivalent audited standalone build-time script) against those three values. Fail closed on any unexpected key, invalid length/namespace, missing digest or conflict. Verify all artifact fields before writing.
4. Write only the allowlisted deterministic fields `schema,source_sha,source_tree,image,platform,target` to a temporary JSON file. Use strict file permissions; refuse pre-existing/symlink paths; no environment dump, secret, authorization token, Docker metadata or full log capture. Validate JSON against exact schema and hash the bytes.
5. Publish **only** this sanitized artifact via a SHA-pinned GitHub Actions artifact uploader in a subsequent separately authorized workflow PR. Name/bind it to exact run ID/attempt/source SHA and content hash. Choose an explicit bounded retention period; confirm repository uploader permissions. Never assume artifact presence equals signature validity.
6. Stop after artifact publication; it grants no automatic merge, deployment, GHCR read, Production query or live crawl. Preserve independent verification of signed OCI attestation, manifest digest and source identity before `PASS_PROVENANCE`.

## Required focused tests and review for future implementation

- Synthetic unit tests for accepted output and rejection of extra authorization/token fields, invalid image namespace, mismatched digest, malformed SHA/tree, duplicate fields, tags, unexpected platform and ambiguous evidence.
- Workflow-static tests to assert its manual-only trigger, first-attempt guard, immutable source binding, expected Dockerfile/runtime/amd64, independent pushed-vs-registry digest equality, correct attestation subject, and no authorization input in artifact content.
- CI verify no automatic execution path; review GitHub Actions pinning and artifact upload scope, plus default branch controls. A unit-tested offline projector is not itself executable provenance certification.
- Release/deployment need **their own future exact authorizations** after integration merges and post-merge GitHub CI. Historical deployed image proof cannot be retroactively manufactured by a new artifact.

## Safety and disposition

**L10.41:** `NONEXECUTING_INTEGRATION_DESIGN_DEFINED`; `WORKFLOW_UNMODIFIED`; `ARTIFACT_NOT_PUBLISHED`; `DEPLOYED_PROVENANCE_UNKNOWN`; `PRODUCTION_SQL_NOT_AUTHORIZED`.

Do not repeat exhausted job-log or Railway reads, query GHCR or Production, modify public/provider state, run a release workflow or deploy from this document.
