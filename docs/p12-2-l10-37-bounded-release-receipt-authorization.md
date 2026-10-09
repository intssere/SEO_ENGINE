# P12.2 L10.37 — bounded release-receipt digest-match authorization packet

**Issue:** #undefined. **Repository CI baseline:** `985405d604ff626d3705acf4cb273dfeff526d3b`; push workflow #37963276837 SUCCESS.  
**Execution:** documentation-only; **no job logs or build artifacts were fetched**.

## Intended exact digest match (historical deployment observation)

`ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`

The L10.31 Railway identity read is historical and its three-read permission is exhausted; L10.37 cannot claim this is still deployed now.

## Narrowly identified GitHub Actions release jobs

The L10.36 GitHub-only metadata inventory established that each of these *Production application* release jobs finished successfully, including its image push, attestation-publish and registry-digest receipt steps:

| Workflow run | Job ID | Source SHA | Release receipt step |
|---|---|---|---|
| `37503596029` | `112406525029` | `dedaee261336234b6eb9a8273bb6961667f6d30b` | `Verify registry digest and emit release receipt` |
| `37445409912` | `112208896146` | `1ba86a2b9fe18384bb526128db8757c8dd8b680a` | `Verify registry digest and emit release receipt` |
| `37320063953` | `111796576198` | `9b10a383eb7d765b716bf0f931becda6220cf1b4` | `Verify registry digest and emit release receipt` |

The underlying repository workflow `.github/workflows/p12-2-l2-production-image-release.yml` prints `image=<name>@<digest>` alongside `source_sha`, `source_tree`, `platform`, `dockerfile` and `target`, **but also prints the workflow authorization literal**. The read-only GitHub connector method `fetch_workflow_job_logs` exposes **entire raw logs** rather than a scoped step projection. Accordingly, never forward raw log content or the authorization literal into evidence files, messages or CI output; no guaranteed secret-free server-side filter was identified.

## Proposed exact future consent — NOT GRANTED

A separate authorization must explicitly approve up to **three** `mcp__GitHub__fetch_workflow_job_logs` calls using **only** the job IDs above, in order, no retries. This is a dedicated potentially sensitive log-read permission and is **not** implied by a repository-only `continue`.

For each approved call, perform in-memory extraction limited to the `Verify registry digest and emit release receipt` section. Return a minimal sanitized projection: `run_id`, `job_id`, `source_sha`, `source_tree`, `image@sha256`, `platform`, `target`, `digest_match` and `receipt_present`. Redact the authorization value and any other tokens. Never print raw logs or snippets with credentials. If a reliable section boundary cannot be determined, stop as `RECEIPT_NOT_SAFELY_EXTRACTABLE`; do not retry or use alternative unapproved reads.

Gate comparisons:
1. Require exact `image` repository name `ghcr.io/intssere/seo-engine`, not the many separate Packet-014 certification image repositories.
2. Compare the full 64-hex digest byte-for-byte to the historical L10.31 target; reject substring or tag matches.
3. Require a single unambiguous `source_sha` matching the run's inspected `head_sha`, and full source tree; reject conflicting or multiple receipts.
4. A matching receipt proves only **GitHub release-receipt association**. It does **not** independently validate OCI attestations, signatures, current deployment, platform digest, or the Production database.
5. If these three do not match, record `NO_MATCH_IN_BOUNDED_SET` (not global absence: earlier workflow runs may exist).

## Separate later trust and database gates

Independent GHCR registry digest-bound attestation verification requires a different approval with exact endpoint, trust roots, subject, identity, bounded calls, schema and redaction. Do not assume a successful GitHub Actions `Attest` step verifies that trust. Only after independently establishing source commit/tree and L10.26 query-builder compatibility may a separate Production SQL read packet be proposed.

**L10.37 documentation disposition:** `BOUNDED_RECEIPT_READ_CONTRACT_READY`; `GITHUB_JOB_LOG_READ_NOT_AUTHORIZED`; `DIGEST_MATCH_NOT_CHECKED`; `PROVENANCE_UNKNOWN`. No Production operations, deployments, image transitions, providers or live crawl.
