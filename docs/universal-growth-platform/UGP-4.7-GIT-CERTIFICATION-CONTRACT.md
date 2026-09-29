# UGP-4.7 — Git-backed custom-site certification contract

Issue: #653

This phase adds a provider-free captured-evidence attestation boundary around the existing UGP-4.3 controlled Git plan.

The receipt binds one exact repository, default branch, immutable base commit, an immutable repository-read path/blob, deterministic proposed-content fingerprint, exact change path, non-default working branch, resulting commit, pull request number/head, and successful CI observation at the same resulting head.

For update patches, the repository-read path is the changed path and the expected blob must match exactly.

For create-file patches, UGP-4.7 v2 keeps the immutable repository read and the created path distinct. The controlled Git plan represents creation with `expectedBlobSha=null`; captured evidence must additionally bind the exact resulting blob SHA. This prevents a certification receipt from falsely claiming that an observed source file was modified when the bounded lifecycle actually created a separate fixture file.

The attestation itself is inert: captured evidence only, no network calls, no credential material, no force push, no default-branch write, no merge, no deployment/publication, and no grant of authorization.

A later bounded live certification may supply the observations required by this contract only after separate explicit authorization. Live certification must use a disposable non-default branch and must not merge the PR.

Fail-closed conditions include repository/base drift, observed source blob drift, update expected-blob drift, invalid create-file evidence, working-branch/default-branch collision, proposed-content drift, PR-head drift, and CI-head/non-success drift.

The v2 correction exists because the authorized UGP-4.7 live lifecycle read `docs/universal-growth-platform/UGP-4.7-GIT-CERTIFICATION-CONTRACT.md` at an immutable blob and then created `docs/universal-growth-platform/fixtures/UGP-4.7-LIVE-GIT-CERTIFICATION-FIXTURE.md`. Durable certification must model that observed lifecycle exactly rather than collapse those two paths.

This implementation does not adopt Octokit or ast-grep and does not add runtime GitHub execution.
