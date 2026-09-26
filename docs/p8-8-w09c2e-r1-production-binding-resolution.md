# P8.8 W09-C2E-R1 — Deterministic Production binding-resolution mechanism

## Status and trigger
The authorized W09-C2E attempt at canonical `696110830180a0614a4581784ac922c1da47dd1d` failed closed with `invocation_count=0` and `code=current_production_binding_unresolvable_without_forbidden_access`. No binding was accessed, no parser was invoked, and no network/database/session/state mutation occurred. H6 independently certifies serving deployment `fbef9788-c08d-475d-a85d-88ede16e92c7`. The existing pure parser is `p8-8-w09c2d-binding-parser-v1`.

This specification grants no Production authority.

## Objective
Provide one deterministic Production-runtime-local path that establishes that an opaque database binding belongs to the exact serving publication, then hands it exactly once to the existing W09-C2D parser. No second parser, database client, provider lookup, public secret endpoint, or ambient fallback is permitted.

## Inputs and authority
The resolver receives only non-secret expected identity: canonical commit SHA, canonical tree SHA, serving provenance fingerprint, and Replit deployment/publication identifier.

It may consume only:
- the certified `loadServingProvenance()` capability; and
- one exact Production binding supplier callback, `() => string | undefined`.

The resolver itself must not inspect `process.env`, Replit workspace metadata, Railway variables, Git state, historical evidence, filesystem secret files, provider APIs, DNS, or database/catalog state.

## Identity-before-secret ordering
1. Validate the expected deployment/publication identifier.
2. Load certified serving provenance and require `result=pass`.
3. Require exact commit, tree, and provenance-fingerprint equality.
4. Only then increment `binding_resolution_attempt_count` and invoke the Production binding supplier once.
5. Missing/empty/non-string binding fails closed before parser invocation.
6. Pass the opaque binding exactly once to existing `attestDatabaseBinding`.
7. Return only allowlisted sanitized fields.

Any provenance mismatch yields zero supplier calls and zero parser calls.

## Exact Production binding source
The implementation must not discover an environment variable by name. The Production composition root must supply exactly one callback wired to the same already-existing secret binding used by that serving Production runtime. No `process.env.DATABASE_URL ?? ...` chain, alternate variable, workspace default, development binding, Railway staging binding, historical Neon identity, or caller-selected secret name is permitted.

If that source cannot be bound to the same serving runtime generation whose H6 provenance was validated, fail closed with `production_binding_source_unbound` before parser invocation. No public HTTP route may expose this resolver.

## Secret-handling invariant
Raw binding material must never be returned, logged, thrown, persisted, written to artifacts/telemetry/traces/snapshots, or directly hashed by the resolver. Only W09-C2D may derive `binding_fingerprint` from its sanitized identity projection. Its allowlisted output is the only binding-derived material that may leave the resolver.

## Result contract
Return resolver version, expected deployment/publication identity, canonical commit/tree, serving provenance fingerprint, `binding_resolution_attempt_count`, `parser_invocation_count`, and only the W09-C2D allowlist: parser_version, scheme_family, host, port, database_name, provider_hint, endpoint_or_compute_hint, project_hint, branch_hint, timeline_or_equivalent_hint, binding_fingerprint, secret_material_exposed, network_access_performed, database_session_opened, state_mutated, result, and code.

Resolver `pass` requires both counters equal 1, exact provenance match, parser `pass/ok`, and all four safety flags false. Resolver pass is not Gate A PASS; provider-control-plane corroboration remains separate.

## Fail-closed codes
At minimum: `missing_expected_publication_identity`, `serving_provenance_unavailable`, `serving_provenance_mismatch`, `production_binding_source_unbound`, `production_binding_missing`, `parser_fail_closed`, `safety_invariant_violation`. No failure permits fallback or retry inside one invocation.

## Deterministic implementation tests
Implementation certification must prove:
1. exact provenance + synthetic PostgreSQL binding => one supplier call, one parser call, sanitized pass;
2. unavailable/mismatched commit/tree/fingerprint => zero supplier and parser calls;
3. missing/unbound supplier => zero parser calls;
4. missing binding => one supplier call, zero parser calls;
5. parser failure => one supplier call, one parser call, sanitized fail-closed;
6. synthetic credentials/query/fragment never appear in output/errors/diagnostics;
7. static resolver source has no `process.env`, DB driver, SQL, DNS/network client, provider SDK/API, Railway/historical fallback, filesystem secret read, deployment mutation, scheduler/worker activation, or persistence;
8. existing W09-C2D parser is imported, never copied;
9. each invocation enforces maximum one supplier and one parser call.

All tests use synthetic bindings only.

## Exact-head CI gate
A future implementation PR must start from then-current canonical `main`. Scope is limited to the resolver, deterministic tests, minimum Production composition wiring needed to provide the exact supplier without changing secret values, and this spec if necessary.

Before merge: capture exact head; verify exact base/main ancestry and changed-file scope; pass resolver/parser tests and required repository CI/security jobs at exact head; have zero unresolved review threads; and show zero Production secret/binding/provider/DB access in CI. Merge requires separate explicit authorization.

## Production reattempt gate
After implementation is merged and any required sync/build/publication is separately authorized and certified, a new W09-C2E one-shot authorization must bind exact canonical commit/tree, serving provenance fingerprint, successful Replit deployment/publication identity, resolver version, and parser version `p8-8-w09c2d-binding-parser-v1`.

The reattempt permits at most one Production supplier invocation and one parser invocation; zero SQL/catalog/session, network/provider/public-site request, DDL/DML/migration, config/credential mutation, deployment/publication/restart, scheduler/worker activation, Railway action, or UGP action. Timeout, response loss, mismatch, missing binding, parser/safety failure, or ambiguity consumes authorization and fails closed without automatic retry.

## Out of scope
Provider-control-plane corroboration; Production DB/catalog reads; migrations 0005/0006/0007; W09-C Stage 0; Task #51/#53/#54; provider-read addendum; W10; Railway staging mutation; UGP reconciliation/merge.
