# P8.8 W09-C3F-A-F3 — authoritative Git commit-to-tree attestation design

## Decision

**SOURCE-CONTROL MAPPING AVAILABLE / PRE-DEPLOYMENT MATERIALIZATION REQUIRED / NO RAILWAY MUTATION YET.**

GitHub's canonical Git commit object is an authoritative non-secret mapping from an exact repository commit SHA to its exact root tree SHA. For the frozen F3 source commit `e4795ef9f24039aa38b3262162b346329edebc01`, GitHub's Git commit object reports root tree `09119069e1137d10c7a9c0202b958016c3cf1bb8`.

This establishes feasibility of the missing commit→tree mapping. It does not authorize injecting that value into Railway or deploying it.

## Trust boundary

The accepted mapping is:

`repository identity + exact commit SHA -> GitHub Git commit object -> exact root tree SHA`

The commit lookup must use the exact commit SHA, never a mutable branch name. The returned object must itself report that same commit SHA and a syntactically valid 40-hex root tree SHA.

GitHub branch state is a separate assertion. For a deployment intended to represent canonical `main`, the deployment's Railway-provided branch must equal `main`, and its `RAILWAY_GIT_COMMIT_SHA` must equal the commit used to obtain the tree attestation.

A later movement of `main` does not invalidate an already exact commit→tree mapping; it does mean a new deployment must receive a new attestation for its own exact commit.

## Why the mapping is authoritative

A Git commit object directly contains the root tree object ID. The tree is not inferred from file bytes, logs, credentials, environment values, provider hostnames, or a mutable branch.

The source-control API therefore supplies the exact Git object relationship C2G requires.

## Selected architecture

Do **not** make the Railway Docker build call GitHub over the network to discover its tree.

Instead use a pre-deployment source-control attestation step:

1. Freeze the exact canonical commit intended for deployment.
2. Read the GitHub Git commit object by that exact SHA.
3. Require returned commit SHA == requested commit SHA.
4. Extract the exact root tree SHA.
5. Bind an attestation record to:
   - repository: `intssere/SEO_ENGINE`
   - commit SHA
   - tree SHA
   - expected source branch `main`
   - attestation schema/version
6. At deployment/build admission, require Railway's `RAILWAY_GIT_COMMIT_SHA` and `RAILWAY_GIT_BRANCH` to equal the attested commit and branch.
7. Supply the attested tree only for that exact deployment/source revision.
8. C2G validates the complete commit+tree+branch tuple fail-closed.

This avoids making build success depend on live GitHub network availability and prevents a persistent tree variable from silently carrying across commits.

## Materialization requirements

The attestation must be immutable per commit and non-secret. A valid record contains only allowlisted fields such as:

```text
schema
repository
commitSha
treeSha
sourceBranch
issuedFrom = github_git_commit_object
```

It must not contain tokens, authorization headers, API URLs carrying credentials, cookies, connection strings, environment dumps, or arbitrary GitHub response bodies.

The attestation identity should be deterministic over canonical allowlisted fields so the exact record consumed by deployment can be compared with the reviewed record.

## Replay and staleness

A commit→tree relation is immutable for the identified Git object. Time-based expiry is therefore not required to protect the mapping itself.

Replay is rejected when the Railway deployment commit differs from the attested commit, even if branch remains `main`.

A record for commit A must never be reused to admit commit B.

If Railway does not expose the expected GitHub-triggered commit/branch for a deployment, admission fails closed.

## Network and API failure

GitHub lookup occurs before deployment authorization/materialization.

If exact-commit lookup is unavailable, ambiguous, rate-limited, unauthorized, malformed, or returns a different commit identity, no attestation is produced and no deployment is authorized from that attempt.

There is no fallback to:
- branch-head lookup;
- local source hashing;
- commit-as-tree substitution;
- stale previous attestation;
- manually guessed tree;
- credential-derived evidence.

## Merge commits

Merge commits are valid inputs. The root tree in the exact merge commit object is the canonical tree for that commit. Parent trees are not substituted.

## Build integration

F3 does not yet change the Dockerfile.

The next implementation should introduce a small pure attestation schema/verifier and then map Railway system Git values plus the attested tree into C2G only when all identities agree.

The preferred deployment model is ephemeral/per-deployment materialization, not an evergreen Railway variable.

If the current Railway integration cannot provide an ephemeral non-secret build input tied to the exact deployment, a separately controlled deployment workflow may be required. That is an F4 capability question and must be answered before any Railway mutation.

## F3 PASS criteria

F3 design passes because:

1. exact GitHub commit objects expose the required root tree identity;
2. the mapping is direct Git object metadata, not inferred;
3. exact commit lookup eliminates mutable branch lookup from the mapping;
4. Railway already exposes deployment-scoped commit and branch for GitHub-triggered builds;
5. exact equality can join Railway deployment identity to the source-control attestation;
6. missing/mismatched evidence fails closed;
7. no secret is needed.

This is **design feasibility PASS**, not live deployment certification.

## Next milestone — F4

**W09-C3F-A-F4 — ephemeral attestation materialization + Railway build-input capability contract.**

F4 should:
- implement the pure allowlisted attestation record/verifier;
- define deterministic record identity;
- verify exact commit/tree/branch equality before C2G;
- research whether Railway can consume the per-deployment tree attestation without a persistent drifting variable;
- choose the smallest controlled deployment mechanism if native GitHub-triggered Docker builds cannot consume that ephemeral input.

No Railway mutation is authorized by F3.

## Hard exclusions

No Railway variable/config value reads or writes, deploy/redeploy, staged-patch mutation, IaC pull/plan/apply, shell/Agent, Neon, DB/SQL, provider/public writes, scheduler/worker activation, Stage 0, or cutover.
