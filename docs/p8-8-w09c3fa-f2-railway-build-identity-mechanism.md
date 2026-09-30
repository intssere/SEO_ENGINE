# P8.8 W09-C3F-A-F2 — Railway canonical build-identity mechanism certification

## Status

**PARTIAL MECHANISM AVAILABLE / TREE IDENTITY MISSING / FAIL CLOSED.**

This is a repository-only certification. It authorizes no Railway mutation or deployment.

## Frozen source

Canonical source at investigation start:

- repository: `intssere/SEO_ENGINE`
- branch: `main`
- commit: `c58b948bc1cb26b501a72b85bbfd3b0cc05b126d`

PR #671 made the remote Docker provenance seam explicit:

- `EXPECTED_CANONICAL_COMMIT`
- `EXPECTED_CANONICAL_TREE`
- `EXPECTED_SOURCE_BRANCH`

All three remain required as one complete identity when Git metadata is unavailable.

## Official Railway capability

Railway's Variables Reference states that Railway-provided variables are available to all builds and deployments.

For GitHub-triggered deployments Railway documents:

- `RAILWAY_GIT_COMMIT_SHA`: Git SHA of the commit that triggered deployment;
- `RAILWAY_GIT_BRANCH`: branch that triggered deployment;
- repository owner/name and commit metadata.

Railway's Docker build guidance states that variables needed by a Dockerfile build must be opted into with Docker `ARG`.

Therefore Railway has an authoritative non-secret mechanism for two C2G inputs:

| C2G field | Railway source | Result |
|---|---|---|
| canonical commit | `RAILWAY_GIT_COMMIT_SHA` | available for GitHub-triggered deploy |
| source branch | `RAILWAY_GIT_BRANCH` | available for GitHub-triggered deploy |
| canonical tree | no documented Railway Git system variable | unavailable |

## Why commit is not substituted for tree

The existing provenance contract binds both the commit object and its canonical tree object.

A commit SHA and tree SHA are distinct Git object identities. Setting `EXPECTED_CANONICAL_TREE` equal to the commit SHA, omitting the tree, guessing it, deriving it from a credential-bearing source, or relaxing the resolver would violate the fail-closed contract.

The repository therefore must not claim the merged Docker seam is deployment-ready merely because Railway exposes commit and branch.

## Why Docker context alone is insufficient

The Railway remote Docker builder may receive source content without an attached `.git` worktree. The F1 evidence already established that Git fallback is unavailable in that build environment.

The copied source tree does not by itself provide the canonical Git tree object ID. Reconstructing an object ID from arbitrary build-context bytes is not equivalent unless the exact Git index/tree semantics and source boundary are independently reproduced and certified. F2 does not approve such reconstruction.

## Approved architecture

Preserve all three C2G identity fields.

Use Railway system metadata directly for commit and branch when a GitHub-triggered build exposes them.

For tree identity, require a separately authoritative non-secret source tied to the exact commit. Acceptable future mechanisms include:

1. Railway adds/exposes an authoritative Git tree SHA for the deployment;
2. a pre-build trusted source-control attestation supplies the exact `commit -> tree` mapping and the build verifies the commit matches `RAILWAY_GIT_COMMIT_SHA`;
3. a separately certified immutable build artifact/manifest produced from the canonical Git checkout carries commit, tree, and branch and is cryptographically/content-addressably bound to the source deployment.

The mapping must not be a manually copied evergreen variable that can silently become stale across commits.

## Rejected shortcuts

Do not:

- hardcode the current tree SHA in the Dockerfile;
- set a persistent Railway `EXPECTED_CANONICAL_TREE` once and reuse it across automatic main deployments;
- use the commit SHA as the tree SHA;
- weaken C2G to commit-only provenance;
- derive identity from DATABASE_URL, credentials, rendered secrets, logs, or provider hostnames;
- fetch mutable/unpinned third-party data during the Docker build and call it authoritative without a separately certified trust contract;
- enable a deploy merely to test whether an unproven identity mechanism works.

## Smallest repository follow-up

The current Dockerfile names the C2G inputs but does not yet map Railway's system Git variables into them.

A future repository change may safely declare:

`ARG RAILWAY_GIT_COMMIT_SHA`
`ARG RAILWAY_GIT_BRANCH`

and map those values internally to the C2G resolver, **but only after the tree source is defined**, so a partial Railway identity cannot accidentally appear deployment-ready.

No such mapping is implemented in F2 because it would not solve the three-field admission gate.

## Railway mutation gate

No Railway variable/config mutation is justified yet.

In particular, do not set `EXPECTED_CANONICAL_COMMIT` or `EXPECTED_SOURCE_BRANCH` as persistent user variables: Railway already has deployment-scoped system values, and persistent copies create drift risk.

Do not set `EXPECTED_CANONICAL_TREE` until an authoritative per-deployment commit-to-tree mechanism is certified.

## Next milestone — F3

**W09-C3F-A-F3 — authoritative Git commit-to-tree attestation design.**

F3 should evaluate a source-control-side mechanism that starts from the exact Railway-provided `RAILWAY_GIT_COMMIT_SHA` and yields the immutable tree SHA without weakening provenance.

Preferred direction: canonical GitHub commit metadata/attestation produced outside the opaque Railway source archive and bound exactly to repository + commit + tree + branch. The design must decide whether this is materialized before deployment or obtained through an explicitly authenticated/read-only build integration, and must define replay/staleness/network-failure behavior.

F3 remains repository/research work until a live integration or Railway mutation is separately authorized.

## Hard exclusions

F2 performs no Railway variable-value read, `set_variables`, deploy/redeploy, staged-patch mutation, IaC pull/plan/apply, secret/config-value access, Neon, DB/SQL, provider/public write, Stage 0, scheduler/worker activation, or cutover.
