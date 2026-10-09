# P12.2 L10.33 — deployed immutable-image provenance gate

**Tracking:** Issue #966. **Mode:** GitHub repository-only review; not a registry or Production inspection authorization.  
**Certified source baseline:** `ad1a64adc25de8e218d6fbcec50e60a80b581a59`; PR #961 post-merge CI `37912250133` SUCCESS.

## Evidence currently held

- L10.31's *authorized, exhausted* three-read Railway metadata inspection identified the production service's pinned image as:
  `ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2`.
- The service's then-latest successful deployment was `11362736-c4ea-43a0-9e4b-f6627acdee24`, created 2026-10-06T11:13:16.813Z. This identity is **an observation at inspection time**, not a guaranteed unchanging current state.
- Historic F24 documentation contained a *different* image `sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22`; neither this older digest nor the present GitHub `main` commit may be substituted for the inspected deployed digest.
- `.github/workflows/ci.yml` establishes code validation and ephemeral PostgreSQL tests. A successful CI job **alone** does not prove an OCI image's source/build provenance or currently running image contents.
- L10.26 SQL query builder: `artifacts/api-server/src/lib/p12-2-l10-26-packet-014-comparable-preflight.ts`; L10.27 isolated SQL tests provide independent fixture evidence, not evidence that the deployed image includes these files.

## Required digest-to-source verification

A future review must obtain trustworthy metadata or signed attestations **bound to the exact observed OCI digest**:

1. Registry identity: registry/repository, OCI manifest digest, media type and manifest/platform resolution; distinguish a multi-platform index digest from a platform-specific manifest digest. Never substitute an image tag.
2. Provenance: build workflow/run ID, immutable source repository and commit SHA, source tree if recorded, builder identity, build timestamp, exact outputs/subjects and verified signature or trustworthy attestation authority.
3. Correlation: independently compare the attestation subject digest with `45cbaecd…`, then validate the claimed source commit exists in the canonical repository and the build pipeline evidence really produced that digest.
4. Compatibility: compare the attested source tree with L10.26 SQL contract availability and L10.27 migration/schema dependencies. If older, classify `IMAGE_LACKS_READER` or `READER_COMPATIBILITY_UNKNOWN`; do not deploy, backfill or patch on that basis.
5. Trust: reject unsigned/unverifiable provenance, mutable-tag evidence, conflicting workflow metadata, registry digest mismatches, or inconsistent image architecture. Mark `UNVERIFIED` rather than inferring source lineage from deployment dates.

**A build commit is not automatically the deployed commit**, even if GitHub `main` has advanced. GitHub checks and image attestation establish distinct claims.

## Future read-only provenance request (NOT executed)

Before any external registry/build-system lookup, present a *separately approved* packet naming:
- exact pinned image path/digest above, and the exact public/connected metadata APIs and argument selectors to be used;
- bounded operation count, read-only/no-secret guarantees, short expiration, evidence destination and minimum redaction;
- trusted verification roots, attestation format/subject matching and required source tree checks;
- no Railway read re-use, no credential retrieval, no Production database connection/SELECT, no deployment, and no mutation.

Record an immutable evidence receipt with a UTC collection timestamp, query/API identifiers, returned digest and attestation subject, verified source commit/tree, provenance checks, compatibility classification, unresolved gaps and an explicit `PASS_PROVENANCE` or `BLOCKED` decision. **Do not claim PASS_PROVENANCE without a digest-bound trusted source.**

## Outcome of this milestone

**PROVENANCE NOT YET VERIFIED.** This is a readiness specification only. The next live operation, if authorized later, is narrowly scoped to image/attestation metadata verification. Separately authorized Production database identity/schema review and exact one-shot Packet 014 SQL certification remain subsequent gates. P12.3–P12.10 are outstanding.

No Production/Railway/registry metadata calls, SQL, secrets, provider/crawl access, deployment or public-site mutation occurred in L10.33.
