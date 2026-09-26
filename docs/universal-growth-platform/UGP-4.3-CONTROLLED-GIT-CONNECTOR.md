# UGP-4.3 — Controlled Git Connector

## Initial certification boundary
UGP-4.3 defines a pure deterministic Git planning contract. It consumes caller-supplied repository/ref/file observations and produces an inert plan; it performs no GitHub, Git, network, shell, filesystem, credential, database, scheduler, deployment, or publication operation.

## Repository and state binding
A plan binds one exact owner/repository identity, exact default branch, immutable observed base commit SHA, exact expected blob SHA for every target file, and SHA-256 proposed-content fingerprints. Repository-relative paths are bounded and reject absolute paths, traversal, empty segments, backslashes, controls, duplicates, and oversized plans.

## Framework/content-source detection
Framework and content-source classifications are caller-supplied observations backed by normalized repository-relative evidence paths. Detection is descriptive evidence only and grants no authority.

## Change workflow
The initial lane requires a working branch distinct from the default branch, deterministic path-sorted patches, and a pull request. Direct default-branch writes are structurally denied. Git branch/commit/PR/status capabilities must already exist in the universal capability registry; capability availability does not grant authorization.

## CI/status observation
The plan binds read-only CI observation to the same repository, planned working ref, and observed base commit. Later transport adapters must preserve exact repository/ref/commit scope and fail closed on drift.

## Dependency evaluation
Octokit and ast-grep remain candidates only. No dependency is adopted in UGP-4.3 initial certification; any adoption requires separate security/license review.

## Explicit exclusions
No live GitHub/Git/provider call, branch creation, commit, PR creation, status fetch, arbitrary command execution, filesystem mutation, credentials/secrets, persistence/schema change, scheduler/worker activation, provider/public-site write, deployment, or publication.
