# P8.8 W09-C2H — Controlled Production provenance-bearing build/publication preflight

## Objective
Freeze the fail-closed preflight and authorization boundary for the first Replit Production publication carrying certified W09-C2F/W09-C2G provenance.

Canonical source commit at specification start: `17286ce08e478fd35e58cb555e18c317792c5399`.

The exact canonical tree MUST be resolved independently from that commit immediately before any authorized Production synchronization/build and supplied explicitly as `EXPECTED_CANONICAL_TREE`. No tree value is frozen here because the current GitHub connector response does not expose the commit tree object.

Current Replit Production publication remains the pre-C2G deployment and MUST NOT be treated as provenance-bearing until a separately authorized publication succeeds and its artifact is attested.

## Gate H1 — canonical GitHub source
Immediately before any Production action:
1. require GitHub `main` to equal the explicitly authorized canonical commit;
2. resolve its exact tree SHA;
3. require W09-C2G files/build integration to be present;
4. require successful exact-head canonical CI;
5. abort on any source movement or ambiguity.

## Gate H2 — Replit workspace topology
Read-only preflight must establish:
- current local branch/HEAD;
- origin/main identity if locally available;
- clean/dirty tracked and untracked state;
- the reviewed `.replit` production-safety overlay and whether it is the only permitted tracked divergence;
- any local zero-file publication marker and its canonical parent;
- no unrelated local source divergence.

No source synchronization is authorized by this issue/spec alone.

## Gate H3 — controlled source synchronization
Requires separate explicit authorization. When authorized:
- synchronize Replit Production workspace source to the exact canonical GitHub commit/tree;
- preserve only the separately reviewed production `.replit` safety overlay if still required;
- do not incorporate UGP, Railway staging, feature branches, historical publication markers as source, or unreviewed workspace changes;
- checkpoint/source state must remain provably tied to canonical commit/tree.

## Gate H4 — provenance-bearing build
The authorized build must receive exactly:
- `EXPECTED_CANONICAL_COMMIT=<authorized canonical SHA>`
- `EXPECTED_CANONICAL_TREE=<tree of that exact SHA>`
- `EXPECTED_SOURCE_BRANCH=main`

These are non-secret build inputs. Do not derive them from DATABASE_URL, deployment metadata, historical identifiers, or provider state.

The build must:
1. bundle;
2. generate `dist/build-provenance.json` via certified W09-C2F/W09-C2G code;
3. verify exact commit/tree/branch and fingerprint;
4. fail closed before publication if generation or verification fails.

## Gate H5 — publication authorization
A successful local/prepublication build DOES NOT authorize publication.
Replit Production publication/republication requires a separate explicit user authorization naming this gate and the exact canonical commit.

Only the existing Replit Production app may be republished. No Railway staging action is permitted.

## Gate H6 — post-publication provenance attestation
After a separately authorized successful publication:
- capture Replit publication/deployment identity;
- inspect only the non-secret provenance artifact/source-binding mechanism available to the running build;
- require artifact commit/tree/branch to equal the exact authorized canonical identity;
- require fingerprint validation;
- fail closed if current deployment cannot be authoritatively bound to that artifact.

Do not access the Production DB binding under C2H.

## Relationship to W09-C2E
C2H proves deployment/source provenance only.
It does not invoke or consume the W09-C2E one-shot binding parser.
Only after C2H establishes authoritative current-build provenance may a separately authorized W09-C2E binding attestation be reconsidered. The previous W09-C2E parser invocation count remains 0.

## Absolute prohibitions under this specification alone
No Replit source mutation/sync/checkpoint, build, deployment, publication/republication/restart; no Production DB binding access; no SQL/catalog session; no migration 0005/0006/0007; no provider/public-site request; no credential/secret inspection or mutation; no scheduler/worker activation; no Task #51/#53/#54 execution; no W09-C Stage 0; no W10; no Railway staging mutation; no UGP reconciliation or merge.

## Certification result
This issue becomes merge-certifiable when the specification is committed from exact canonical main, CI passes at exact PR head, scope is specification-only, and no prohibited runtime action occurred.