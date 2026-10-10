# P12.2 L10.48 — implementation authorization and verification specification

**State:** PREIMPLEMENTATION / NONEXECUTING. This packet does not change the production image-release workflow.

## Exact target and baseline

- Canonical baseline: `125b4bdb14de7809b4905caa5392f6ff6310d13e`, with L10.47 post-merge CI `38047737344` SUCCESS.
- Only potential workflow-change target: `.github/workflows/p12-2-l2-production-image-release.yml`.
- Preserve manual `workflow_dispatch`, `refs/heads/main`, first-attempt requirement, exact source SHA/tree comparison, immutable runtime linux/amd64 build, provenance/SBOM, attestation and independent registry digest equality.

## Required remediation under separate explicit workflow-edit authorization

1. Introduce step-scoped environment variable `AUTHORIZATION_INPUT` populated from the dispatch input using GitHub Actions `env` expression. Refer only to quoted `$AUTHORIZATION_INPUT` inside Bash source. Reject mismatch without ever printing supplied or expected literal.
2. Remove the `authorization=$EXPECTED_AUTH` line from `$GITHUB_OUTPUT` and remove the `authorization=...` log receipt line. No other steps should consume an authorization output.
3. Add focused static regression tests to ensure no raw workflow input expression appears within `run:` script bodies, and no authorization literal appears in any emitted receipt.
4. Avoid any new triggers, broader permissions, deployment steps, image changes, workflow invocation or additional external reads. Compare exact workflow diff against these constraints.
5. Run complete PR CI, request exact-head merge approval, then verify post-merge CI. A successful test does not authorize dispatch or establish deployed-image provenance.

## Explicit safety distinction

This is a security-fix authorization and validation packet only. Future sanitized receipt publication must be separately reviewed and authorized. The historical deployed image and signed provenance remain UNKNOWN; exhausted historical log and Railway authorizations are not renewed.

## Disposition

`L10_47_GITHUB_CERTIFIED`; `L10_48_WORKFLOW_EDIT_NOT_AUTHORIZED`; `PRODUCTION_WORKFLOW_UNMODIFIED`; `RELEASE_DISPATCH_NOT_AUTHORIZED`; `ARTIFACT_NOT_PUBLISHED`; `DEPLOYED_PROVENANCE_UNKNOWN`.
