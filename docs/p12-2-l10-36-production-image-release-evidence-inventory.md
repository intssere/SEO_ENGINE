# P12.2 L10.36 — Production image-release GitHub evidence inventory

**Issue:** #undefined. **Baseline:** GitHub canonical main `de4c6507e7718125ddaa91dcf4339c4bacf6ae4a`; post-merge CI run `37960483851` SUCCESS.

This is a **repository-side metadata inventory**, not OCI registry or deployed image provenance certification. No GHCR manifest/attestation, Railway API, Production database, live crawl, secrets or service changes were accessed.

## Exact image whose source remains unverified

Historical authorized L10.31 Railway observation: `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`. The prior Railway authorization has been exhausted. A later inspection may find a different deployment.

## GitHub Actions discovery contract

A repository-scoped GitHub Actions read enumerated up to 100 `workflow_dispatch` runs, filtered **client-side** by exact workflow path `.github/workflows/p12-2-l2-production-image-release.yml`. An attempted workflow-specific endpoint was rejected by the connector, so do not claim it was used or that the candidate list represents all historical runs. No dispatches, reruns, logs or downloadable artifacts were invoked.

Three successful Production application image-release runs were then inspected for job step status and artifact metadata:

| Run ID | Run source SHA | Conclusion | Release job steps | Docker build artifact ID |
| --- | --- | --- | --- | --- |
| `37503596029` | `dedaee261336234b6eb9a8273bb6961667f6d30b` | SUCCESS | build/push, attest and release receipt each SUCCESS | `11431181276` |
| `37445409912` | `1ba86a2b9fe18384bb526128db8757c8dd8b680a` | SUCCESS | build/push, attest and release receipt each SUCCESS | `11402114912` |
| `37320063953` | `9b10a383eb7d765b716bf0f931becda6220cf1b4` | SUCCESS | build/push, attest and release receipt each SUCCESS | `11349776307` |

Artifact filenames are `intssere~SEO_ENGINE~UHOVJZ.dockerbuild`, `intssere~SEO_ENGINE~O7LX86.dockerbuild`, and `intssere~SEO_ENGINE~UQ2I6T.dockerbuild`, respectively, with `expired=false` at the time of inspection. Their **contents were not retrieved**. A successful `Attest exact pushed digest` step is not proof that a trusted signature was independently verified.

## Gaps and next authorization boundary

1. Determine whether the exact target digest appears in a successful run's release receipt, preserving redaction of any `authorization` value or other secret. Candidate discovery alone must not be treated as digest evidence.
2. Retrieve and cryptographically verify the OCI attestation under a separately approved, explicitly bounded GHCR/OCI evidence-read authorization. Require exact subject name and digest, accepted trust roots, workflow/builder identity, manifest-platform interpretation and attested source commit/tree.
3. Cross-reference verified source tree and L10.26 query/migration compatibility before even **considering** separately authorized Production SQL.
4. If any evidence is unavailable, missing, unsigned, ambiguous or mismatched, return `PROVENANCE_UNKNOWN` or `BLOCKED`; never infer `PASS_PROVENANCE` from this inventory.
5. Do not reuse the exhausted L10.31 Railway authorization or turn a repository-only `continue` into deployment or external data operations.

**L10.36 disposition:** `GITHUB_RELEASE_METADATA_CANDIDATES_FOUND`; `EXACT_DEPLOYED_DIGEST_MATCH_NOT_CHECKED`; `SIGNED_PROVENANCE_NOT_VERIFIED`.
