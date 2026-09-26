# P8.8 W09-C2E-R3 — Production binding reattempt readiness and one-shot gate

## 1. Purpose

W09-C2E-R1 and R2 are canonical at `e97b99fa6e1638b2b8e6df533a1a3e43ef304255`. R2 provides an inert supplier over the database binding already observed once by the serving API composition root. The certified Replit Production publication predates R1/R2, and the previous W09-C2E authorization was consumed without supplier/parser invocation.

This specification defines the only admissible path to a future reattempt. It grants no runtime authority.

## 2. Separation of authorities

Three phases are independent:

- **P1 — canonical freeze/certification:** read-only GitHub evidence.
- **P2 — serving-generation provenance refresh:** H3 source sync, H4 build, H5 publication, H6 read-only provenance attestation. Each Production mutation/action requires explicit authorization.
- **P3 — one-shot binding attestation:** a new explicit authorization after P2 PASS.

P1 does not authorize P2. P2 does not authorize P3. P3 does not authorize SQL, migrations, or W09-C Stage 0.

## 3. P1 — canonical source freeze

Immediately before P2 authorization, independently establish:

1. GitHub `main` equals the exact candidate canonical commit.
2. The exact tree SHA of that commit is resolved and frozen.
3. The candidate contains:
   - `p8-8-w09c2e-r1-binding-resolver-v1`;
   - `p8-8-w09c2e-r2-production-composition-v1`;
   - certified H6 serving-provenance loader;
   - `p8-8-w09c2d-binding-parser-v1`.
4. R1 and W09-C2D remain at their certified implementation blobs unless separately reviewed.
5. Exact-head required CI is successful.
6. There are zero unresolved review threads relevant to the candidate.
7. Any main movement, ancestry ambiguity, missing evidence, or implementation drift fails closed.

## 4. P2 — fresh H3→H6 serving-generation provenance

The R1/R2-bearing canonical generation must become the independently certified serving generation before any binding supplier may be invoked.

### P2-H3 — source synchronization

Requires explicit authorization naming the exact canonical commit/tree.

The authorized action may synchronize/checkpoint the existing Replit Production workspace to that exact source identity while preserving only the previously reviewed Production safety overlay. It must not import UGP, Railway staging, feature branches, historical publication markers as source, or unrelated workspace changes.

### P2-H4 — provenance-bearing build

Requires explicit authorization bound to the exact H3 source identity.

Exactly one authorized Production build must use the exact non-secret inputs:

- `EXPECTED_CANONICAL_COMMIT=<authorized SHA>`
- `EXPECTED_CANONICAL_TREE=<authorized tree>`
- `EXPECTED_SOURCE_BRANCH=main`

The generated build-provenance artifact must validate commit/tree/branch and its deterministic fingerprint. Failure stops before publication.

No Production database binding is accessed by H4.

### P2-H5 — publication

Requires explicit publication authorization after H4 PASS.

Exactly one publication/republication of the existing Replit Production app is permitted. No Railway action is permitted.

Capture the resulting deployment/publication identity.

### P2-H6 — serving provenance attestation

Requires explicit read-only attestation authorization after H5.

Exactly one serving-provenance observation must establish:

- exact canonical application SHA;
- exact canonical tree SHA;
- source branch `main`;
- exact provenance fingerprint;
- exact Replit deployment/publication identity binding.

The observed values must equal P2-H3/H4/H5 evidence. Failure or ambiguity fails closed.

H6 performs no Production binding access.

## 5. P3 — one-shot W09-C2E-R3 binding attestation

P3 is ineligible until P2-H6 passes.

A new explicit authorization must bind the invocation to all of:

- exact canonical commit SHA;
- exact canonical tree SHA;
- exact H6 serving provenance fingerprint;
- exact Replit deployment/publication identity;
- resolver `p8-8-w09c2e-r1-binding-resolver-v1`;
- composition adapter `p8-8-w09c2e-r2-production-composition-v1`;
- parser `p8-8-w09c2d-binding-parser-v1`.

The prior W09-C2E authorization cannot be reused.

### Required execution order

The single resolver operation must:

1. receive only the allowlisted expected non-secret identity;
2. load certified serving provenance;
3. require exact commit/tree/fingerprint equality;
4. only after that validation invoke the already-bound R2 supplier;
5. invoke the supplier at most once;
6. if missing/unbound, fail before parser invocation;
7. pass the opaque binding to W09-C2D at most once;
8. return only the sanitized R1/W09-C2D result.

A provenance mismatch or unavailable provenance requires zero supplier and zero parser invocations.

## 6. Hard limits

The P3 authorization permits:

- at most one resolver operation;
- at most one binding-supplier invocation;
- at most one parser invocation.

It permits zero:

- SQL or database connection/session/catalog access;
- provider/public-site request;
- DNS discovery;
- filesystem secret read;
- additional or alternate environment-variable lookup;
- development/Railway/historical/caller-selected fallback;
- persistence;
- DDL/DML or migrations 0005/0006/0007;
- config, environment, or credential mutation;
- deployment, publication, or restart;
- scheduler/worker/autonomous activation;
- Railway staging mutation;
- UGP reconciliation/merge;
- W09-C Stage 0.

The raw binding, credentials, query, and fragment must never be displayed, logged, returned, persisted, traced, snapshotted, artifacted, or directly hashed.

## 7. Authorization consumption

Once P3 execution is attempted, the authorization is consumed regardless of outcome, including:

- pass;
- fail-closed result;
- timeout;
- transport loss;
- ambiguous completion;
- provenance unavailable/mismatch;
- binding missing/unbound;
- parser failure;
- safety-invariant failure.

No automatic or implicit retry is allowed.

## 8. Sanitized success contract

A P3 PASS may expose only the existing sanitized R1/W09-C2D fields and counters.

PASS proves only that the exact H6-certified serving generation supplied one opaque binding to the certified parser after exact provenance validation.

PASS does **not** by itself:

- establish the final W09-C2 Gate A verdict;
- authorize SQL/catalog reads;
- authorize migrations 0005→0006→0007;
- authorize W09-C Stage 0;
- authorize provider/public-site access.

Those require their own subsequent certification/authorization gates.

## 9. Specification certification

This specification is merge-certifiable only when:

- its branch is based on the exact canonical main at specification creation;
- scope is this single docs file;
- branch ancestry is zero-behind;
- exact-head required CI passes;
- zero unresolved review threads remain;
- no Production/Replit runtime action, binding access, DB/provider action, migration, Railway mutation, or UGP action occurred.

Merge requires separate explicit authorization.
