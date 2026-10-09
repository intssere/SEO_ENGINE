# P12.2 L10.34 — immutable-image provenance evidence authorization review

**Issue:** #971. **Mode:** repository-only read of tool contracts and previously certified evidence; **not a registry verification or live certification**.  
**Certified baseline:** GitHub main `09c532233b6b20d49dc7a664346c49dd88a698dc`, push CI #37913857189 SUCCESS.

## Provenance target and present evidence

The historical L10.31 approved Railway metadata inspection (three reads, now exhausted) observed:
- image: `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`
- service `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90` in Production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
- deployment `11362736-c4ea-43a0-9e4b-f6627acdee24`, status SUCCESS at inspection time.

The registry manifest's source commit, signed provenance, builder identity and link to L10.26 code remain **UNVERIFIED**. Treat the source tree's current `main` as different from the deployed image until digest-bound proof establishes a relationship. L10.33 describes mandatory source/subject matching.

## Connector capability survey (metadata only, NO calls)

Available GitHub connector actions include `fetch_workflow_run_artifacts`, `fetch_workflow_run_jobs`, `fetch_commit` and `fetch` for documented API reads. No dedicated GHCR package-attestation or OCI-manifest verification action was exposed by the available GitHub tool names. An API `fetch` operation would require an independently established, explicitly permitted endpoint and scoped authorization; capability is not authorization. A GitHub artifact with a plausible name alone does not authenticate its digest or prove deployment provenance.

## Proposed staged evidence acquisition — not executed

**Stage A — repo-only local definition:** Read checked-in immutable-image release and attestation workflows, identify the expected provenance artifact name, format, build-run identity and trusted verification mechanism. Never invent workflow IDs or fingerprints. Determine whether verification requires GHCR registry access and whether the available tools can retrieve a signature/attestation without credentials or private payloads.

**Stage B — future separately approved read-only external evidence:** Bound exactly named registry/GitHub API read endpoints or connector actions, immutable target digest, max calls, time window, evidence destination, response size and no-secrets rule. Capture relevant manifest subject, signed/SLSA or in-toto attestation, trusted issuer and workflow identity, source commit/tree and builder evidence.

**Stage C — offline cross-check:** Require cryptographically or otherwise trustworthily verified attestation subject digest equality; resolve source commit/tree within canonical GitHub; verify exact build-run linkage to the attested output; compare the attested tree with L10.26 query-builder existence and required schema. Record `PASS_PROVENANCE`, `BLOCKED`, or `UNKNOWN` with explicit basis. Treat missing signatures, mismatched subject, untrusted issuer, mutable tags and wrong platform manifests as BLOCKED.

Only after Stage C succeeds may an independent Production DB/schema read-only authorization be considered. Do not invoke Production queries, refresh a crawl, or deploy as a side effect.

## Exact future approval checklist

The operator must provide: immutable OCI digest; approved source/registry endpoint and action argument shapes; attestation source and verification roots; maximum calls and explicit expiration; allowed non-secret output fields; deduplicated immutable evidence destination; fail-closed behavior; no provider/site/DB reads or writes; no deployment/config/credential changes; and no retries outside the approved budget.

**Disposition:** `READINESS_DEFINED; PROVENANCE_NOT_VERIFIED`. L10.34 itself neither acquires GHCR evidence nor establishes a source SHA. Separate exact authorization remains necessary for any external attestation/registry lookup.
