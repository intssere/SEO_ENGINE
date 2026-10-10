# P12.2 L10.47 — release input-hardening review gate

**Review only. No release workflow modification or dispatch.**

Baseline main: 5ba84aba9bf613e4d016bd599215373bbc4fa30b; L10.46 post-merge CI 38046679251 SUCCESS.

## Source-reviewed security risks

1. `.github/workflows/p12-2-l2-production-image-release.yml` interpolates the untrusted `inputs.authorization` expression directly into an executable Bash `run:` script before its equality check. This creates a shell command-injection risk. Do not dispatch without a separately reviewed remediation.
2. The same workflow propagates `authorization=$EXPECTED_AUTH` into `$GITHUB_OUTPUT` and prints the full authorization literal in the release log receipt. Remove needless propagation and exposure.
3. L10.40–L10.46 offline sanitized receipt builders, checksum verifier and tests do not independently certify OCI provenance or authenticate past Production images.

## Separately authorized future implementation

- Pass the dispatch input through step `env:` mapping (not direct template interpolation into Bash source) and compare using a quoted shell variable, while preserving the exact authorization match, `main`, and first-attempt gates.
- Remove authorization literal from step outputs, logs, and future artifacts. Preserve SHA/tree match, immutable build identity, attestations, registry digest comparison, and manual-only dispatch.
- Add static regression tests preventing direct interpolation of dispatch inputs inside shell scripts and exposure of authorization literals.
- Only after independently verified registry digest equality, assemble strict allowlisted receipt JSON from trusted step outputs; validate and hash bytes. Future SHA-pinned artifact upload needs its own scope and exact-head approval.
- New artifact presence or checksum alone does not prove signed provenance or deployed-image identity. Production release dispatch, GHCR reads, Railway access, SQL and deployment each require separate bounded authorization.

## Disposition

`L10_46_GITHUB_CERTIFIED`; `L10_47_SECURITY_REVIEW_ONLY`; `WORKFLOW_UNMODIFIED`; `RELEASE_DISPATCH_NOT_AUTHORIZED`; `ARTIFACT_NOT_PUBLISHED`; `DEPLOYED_PROVENANCE_UNKNOWN`.
