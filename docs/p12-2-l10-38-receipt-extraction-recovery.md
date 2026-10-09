# P12.2 L10.38 — fail-closed release receipt extraction recovery

**Issue:** #undefined. **Base:** `0c64b6853f7ca86f93c271381d0f5cec5ed00266`, GitHub CI #37966669858 SUCCESS.  
**Execution mode:** repository-only documentation and offline synthetic fixture definitions. **No external evidence reads were performed.**

## Evidence and authorization boundary

L10.37's separately authorized three `fetch_workflow_job_logs` calls were exhausted, targeting exactly:
- run `37503596029`, job `112406525029`
- run `37445409912`, job `112208896146`
- run `37320063953`, job `111796576198`

All three returned content that could not be reliably segmented into the required `Verify registry digest and emit release receipt` step under the approved extraction method. No receipt values were extracted and no digest match or mismatch was established. **Do not repeat reads under the exhausted grant.** The absence of a safely identifiable section is not evidence that the release receipt is absent or that image digests mismatch.

The historical Railway observation remains `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`. That Railway inspection permission is likewise exhausted; actual current deployment may have changed.

## Root-cause hypotheses (NOT verified facts)

Potential causes include a different log envelope/schema (e.g. structured rather than flattened), GitHub log redaction, tool-specific content wrapping, or the anchor string absent from decoded payloads. The previous extraction only established `step_located=false`; it did **not** prove one of these hypotheses or inspect raw logs for troubleshooting.

## Synthetic-only extraction contract

Design a local parser using **synthetic** UTF-8 fixtures with absolutely no real authorization literals or live logs. Accept only a structurally verifiable step envelope for `Verify registry digest and emit release receipt`; never scan or present arbitrary raw logs merely to find desired hashes. Extract exactly and only:
`source_sha`, `source_tree`, `image`, `platform`, `target`, `receipt_present`, `digest_match`.

Validation requirements:
1. Require complete 40-hex commit SHA, 40-hex tree hash, exactly one `image=ghcr.io/intssere/seo-engine@sha256:<64 lowercase hex>`, `platform=linux/amd64`, and `target=runtime`. Require exact image digest comparison rather than substring/tag matching.
2. Require a verified envelope boundary; reject missing, overlapping, duplicated or unterminated sections, partial matches, unexpected repository names, conflicts, ANSI/control-character laundering, truncated content and ambiguous multi-receipts.
3. Never include `authorization`, token-like key/value pairs, secrets, unrelated lines, raw log chunks, stderr or tracebacks in output, tests, evidence receipts or exceptions. Error outputs must use fixed codes; fail closed on undecidable data.
4. Tests should cover a valid synthetic match, valid synthetic mismatch, missing anchor, duplicate receipts, unauthorized namespace, malformed SHA, invalid platform/target, wrapped section boundaries, redacted fields and adversarial noise. Tests must have no network, registry, secrets, DB or provider dependencies.
5. Never treat a parser test PASS as Production provenance evidence.

## Safer evidence alternative and future gating

The release workflow itself should be considered for a future separately approved improvement to emit a sanitized, immutable machine-readable receipt artifact (only source SHA/tree, image name/digest, platform, build workflow identity and run attempt), excluding its authorization literal and any credentials. Such a **workflow change requires its own PR, CI, exact-head merge authorization, subsequent separate image-release authorization and controlled build**; it cannot retroactively prove the historical deployed digest.

A bounded, independent OCI/GHCR attestation retrieval+signature verification remains another option, but needs endpoint/tool capability and trust roots verified and separately approved. Docker build-record artifacts have not been fetched; their contents must not be presumed safe or reliable.

## Decision

`L10_38_OFFLINE_RECOVERY_SPECIFIED` — no current `PASS_PROVENANCE`, no image-to-source association, no Production schema or Packet 014 SQL certification. No Railway, GHCR, job-log, Docker artifact, Production DB, deployment or live-site calls authorized by this document.
