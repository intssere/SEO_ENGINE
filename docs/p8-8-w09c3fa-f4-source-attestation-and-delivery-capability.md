# P8.8 W09-C3F-A-F4 — source attestation verifier and Railway delivery capability

## Result

**PURE VERIFIER IMPLEMENTED / NATIVE EPHEMERAL TREE DELIVERY UNPROVED / FAIL CLOSED FOR LIVE DEPLOYMENT.**

F4 implements the F3 source-control attestation boundary without performing a Railway mutation.

## Pure attestation contract

Schema: `p8-8-w09c3fa-f4-v1`.

Allowlisted fields:

- `schema`
- `repository`
- `commitSha`
- `treeSha`
- `sourceBranch`
- `issuedFrom = github_git_commit_object`

The verifier is pure and performs no network, environment, filesystem, DB, persistence, provider, or platform I/O.

It requires:

1. closed object shape;
2. lowercase 40-hex commit and tree object IDs;
3. syntactically valid repository and branch identities;
4. exact repository equality;
5. exact attested commit == Railway deployment commit;
6. exact attested branch == Railway deployment branch;
7. fixed GitHub commit-object provenance label;
8. no credential-shaped material.

The deterministic attestation ID is SHA-256 over the canonical allowlisted record with prefix `f4-`.

The verifier does not itself claim that arbitrary caller data came from GitHub. Authoritative materialization remains upstream: the record must be created from an exact GitHub Git commit-object observation as defined by F3.

## Trust boundary

The full trust chain is:

`GitHub exact commit object -> sanitized F4 record -> deterministic F4 verifier -> exact Railway deployment commit/branch equality -> C2G complete commit/tree/branch identity`.

F4 deliberately does not query GitHub from inside the verifier and does not read Railway environment variables itself. This keeps evidence acquisition distinct from deterministic verification.

## Railway capability research

Official Railway documentation establishes:

- Railway-provided variables are available to builds and deployments.
- GitHub-triggered deployments expose deployment-scoped Git commit and branch metadata.
- Dockerfile builds receive Railway variables only when the Dockerfile opts into a matching `ARG`.
- Service variables are persistent environment configuration; sealed variables change visibility, not their persistence/availability.
- `railway up` uploads the directory being deployed rather than using the repository source integration.

No reviewed Railway documentation in F4 establishes a native, one-shot, deployment-scoped arbitrary Docker build-argument override that can carry an F4 tree SHA alongside an automatic GitHub-triggered deployment without persisting a service variable.

Therefore F4 does **not** approve an evergreen `EXPECTED_CANONICAL_TREE` service variable and does not claim a native ephemeral input mechanism exists.

## Delivery options

### A — persistent Railway service variable

Technically consumable through Docker `ARG`, but rejected for canonical tree identity because it can outlive the commit it describes and silently drift when `main` advances.

### B — live GitHub lookup inside Docker build

Rejected by F3. It introduces build-time network/auth dependency and merges evidence acquisition with verification.

### C — Railway CLI directory upload

Railway documents that `railway up` uploads the current directory. This can support a separately controlled artifact/deployment workflow, but it changes the source/deployment trust model from the current GitHub-triggered integration and therefore needs its own provenance contract before use.

### D — immutable attestation artifact in the exact Git source

Potentially safe if generated for the exact commit and committed as part of that same commit, but self-reference prevents a file inside commit C from naturally containing C's final commit SHA. A two-commit indirection would no longer attest the deployment commit itself. Rejected for the direct F3 contract.

### E — controlled deployment transaction with temporary variable

Potentially implementable by setting a non-secret tree value immediately before a specifically frozen deployment and removing/restoring it afterward, but this is still persistent platform mutation with race/rollback hazards. It is not "ephemeral" merely because an operator later deletes it. Not approved by F4.

## Selected next direction

Do not mutate Railway yet.

The next gate should determine whether Railway's API/CLI supports a deployment creation call whose input includes a non-persistent build variable/argument or immutable deployment metadata that the Docker builder can consume. This must be established from authoritative schema/documentation before use.

If no such mechanism exists, the preferred fallback is a **controlled source-artifact deployment workflow** whose provenance explicitly binds:

- canonical GitHub repository;
- exact commit;
- exact tree;
- branch;
- artifact/content identity;
- Railway deployment identity.

That workflow would replace reliance on the automatic GitHub source archive for this service and must be separately designed/certified before mutation.

## F4 status

Repository implementation: **PASS**.

Railway ephemeral delivery capability: **UNPROVED**.

Live deployment admission: **FAIL CLOSED** until the delivery mechanism is certified.

## Next milestone — F5

**W09-C3F-A-F5 — Railway deployment-scoped build-input capability certification.**

F5 is initially research/repository-only. It should inspect authoritative Railway API/CLI schema/docs for a deployment-scoped non-persistent build input. No live mutation is necessary to determine capability.

Only after a mechanism is certified should a separate explicit authorization packet permit any Railway variable/config/deployment mutation.

## Hard exclusions

No Railway variable/config value read or write, no deploy/redeploy, no staged-patch mutation, no IaC apply, no shell/Agent, no Neon, no DB/SQL, no provider/public write, no scheduler/worker activation, no Stage 0, and no cutover.
