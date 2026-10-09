# P12.2 L10.35 — exact GHCR Production image provenance read packet

**Scope:** GitHub repository-only specification. **Issue:** #undefined. No external image/registry/attestation lookup was executed.  
**Certified baseline:** GitHub main `680d00fa01f05098a37646e0a3a3ef7ed2fa9568`, post-merge CI `37956991100` SUCCESS.  
**Observed L10.31 target:** `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`. This is a historical authorized Railway observation, not a continuously refreshed source.

## Verified source workflow contract

`.github/workflows/p12-2-l2-production-image-release.yml` contains the **Production application** image build:
- Trigger: manually authorized `workflow_dispatch` on `refs/heads/main`, first attempt only.
- Source: checkout at `github.sha`; confirm both `git rev-parse HEAD` and `HEAD^{tree}`, clean worktree and exact `AUTHORIZE:P12_2_L2_PROD_IMAGE_RELEASE:<sha>:<tree>`.
- Build: `Dockerfile`, `target: runtime`, `linux/amd64`, `docker/build-push-action`, repository `ghcr.io/intssere/seo-engine`; `provenance: mode=max`, `sbom: true`, canonical commit/tree build args and immutable `sha-<commit>` tag.
- Publication: `actions/attest` with `subject-name: ghcr.io/intssere/seo-engine`, `subject-digest: steps.build.outputs.digest`, `push-to-registry: true`.
- Release receipt: registry manifest digest must exactly equal build-push output digest; emitted receipt includes source SHA/tree, exact image@digest, tag, dockerfile, platform, target and attestation marker.

**Separate image namespaces matter.** For example, `p12-2-l10-19-c-packet-014-post-disposition-cert-image-release.yml` publishes `ghcr.io/intssere/seo-engine-p12-2-l10-19-c-packet-014-post-disposition-cert`, which is **not** a valid provenance substitute for the deployed `ghcr.io/intssere/seo-engine` application image.

## Proposed future evidence transaction — requires distinct approval

1. **Exact Production application release run identity.** Use an explicitly named, vetted read-only GitHub Actions API query restricted to `p12-2-l2-production-image-release.yml` and `workflow_dispatch`, with a fixed maximum set of candidate runs. Capture run IDs, attempts, event/ref/commit, completion status and immutable evidence references; no workflow dispatch or rerun. The repository workflow source is a contract, not proof of any run.
2. **Candidate receipt/digest match.** Obtain the bounded `Verify registry digest and emit release receipt` step result for candidate successful release(s), suppressing authorization values and secrets. Accept only a receipt with exact `image=ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`. An equal SHA tag alone is insufficient.
3. **Trusted digest-bound attestation.** Independently retrieve the precise GHCR/OCI attestation for this image **digest**, not a mutable tag. Verify subject name/digest, trusted issuer/workflow identity, signature/certificate validity, builder/source revision, platform/index-vs-manifest semantics, and that the attestation's build run matches the candidate receipt. An `attestation=published` text line is insufficient proof.
4. **Source compatibility.** Resolve the verified source commit/tree within `intssere/SEO_ENGINE`; inspect whether its tree contains the exact L10.26 query builder and relevant migration schema. Never infer availability from today's `main` or later CI.
5. **Terminal decision.** Record `PASS_PROVENANCE` only when every independent equality and trust check passes; otherwise `BLOCKED` or `UNKNOWN`. No automatic image transition, SQL query or crawl follows a PASS.

## Action contract and safe upper bounds

- The GitHub connector can inspect workflow runs/jobs/artifacts and fetch repository files, but access to GHCR attestation/OCI manifest bytes, full verification roots, and a reliable bounded run-specific release receipt must be explicitly verified **before** the future authorization packet is finalized.
- Do not pretend the generic GitHub `fetch` action is a validated authenticated GHCR verifier. If signed attestation retrieval/validation is unavailable, stop at **PROVENANCE_UNKNOWN** and name that blocker.
- A future read-only operation needs exact endpoint/action definitions, approved bounded number of calls and candidate runs, no-secret result projection, short expiry, evidence destination, tamper detection and a zero-retry ceiling. The exact action count cannot responsibly be fixed until the relevant APIs and payload shape have been verified.
- The earlier L10.31 three-read Railway authorization is exhausted. It confers no permission to inspect GHCR, reuse Railway selectors, access Production SQL or expand review scope.

## Evidence receipt fields

`observed_deployment_digest`, `image_subject_name`, `registry_manifest_digest`, `attestation_subject_digest`, `release_workflow_path`, `run_id`, `run_attempt`, `source_sha`, `source_tree`, `build_platform`, `signing_identity`, `signature_verified`, `query_contract_compatibility`, `checked_at_utc`, `operation_count`, `excluded_operation_count=0`, `decision`, `blockers`. Use sanitized values and immutable references only; exclude credentials, raw authorization input, provider payloads and arbitrary logs.

**Result of L10.35: SOURCE CONTRACT IDENTIFIED; DEPLOYED IMAGE PROVENANCE NOT VERIFIED.** This document authorizes nothing outside the repository and does not establish any Production DB, schema, Packet 014 or live-crawl certification.
