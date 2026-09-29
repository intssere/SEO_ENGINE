# UGP-4.7 — Git-backed custom-site certification contract

Issue: #653

This phase adds a provider-free captured-evidence attestation boundary around the existing UGP-4.3 controlled Git plan.

The receipt binds one exact repository, default branch, immutable base commit, file path/blob SHA, deterministic proposed-content fingerprint, non-default working branch, resulting commit, pull request number/head, and successful CI observation at the same resulting head.

The attestation itself is inert: captured evidence only, no network calls, no credential material, no force push, no default-branch write, no merge, no deployment/publication, and no grant of authorization.

A later bounded live certification may supply the observations required by this contract only after separate explicit authorization. Live certification must use a disposable non-default branch and must not merge the PR.

Fail-closed conditions include repository/base drift, expected blob drift, working-branch/default-branch collision, proposed-content drift, PR-head drift, and CI-head/non-success drift.

This implementation does not adopt Octokit or ast-grep and does not add runtime GitHub execution.
