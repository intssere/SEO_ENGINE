# P8.8 W09-C2E-R2 — Production composition binding-supplier wiring gate

## Status
R1 is canonical at `3dc0ced8892453a460306708c906a79dfebadbd8`. Its resolver accepts an injected binding supplier only after exact serving-provenance validation. Current `artifacts/api-server/src/index.ts` already observes `process.env.DATABASE_URL` as part of normal application startup.

R2 grants no Production invocation or runtime authority.

## Objective
Create the smallest composition bridge that makes the same already-observed serving-runtime database binding available as the R1 supplier. R2 must not discover another secret, create another binding source, expose the raw binding, or invoke R1 automatically.

## Approved implementation scope
The implementation PR is limited to:
- `artifacts/api-server/src/lib/p8-8-w09c2e-r2-production-composition.ts`;
- `artifacts/api-server/src/lib/p8-8-w09c2e-r2-production-composition.test.ts`; and
- `artifacts/api-server/src/index.ts`, only for the minimum handoff of the value already observed there.

R1 resolver `p8-8-w09c2e-r1-binding-resolution.ts` and W09-C2D parser remain byte-unchanged. A fourth changed file requires explicit scope review before implementation proceeds.

## Composition contract
The R2 adapter accepts the binding as an opaque argument from the composition root and produces only a supplier callback compatible with R1.

The adapter must not:
- read `process.env` or any named secret;
- inspect Replit/workspace metadata, Git state, Railway variables, historical Neon evidence, files, DNS, provider APIs, or database/catalog state;
- parse, validate, transform, log, persist, serialize, directly hash, trace, or return the raw binding;
- open a database connection or execute SQL;
- expose an HTTP route;
- register scheduler/worker/autonomous execution;
- trigger R1 itself.

The composition root must not perform a second `DATABASE_URL` read for R2. It may hand the exact value from its existing startup observation into the adapter. There is no alternate variable, fallback chain, development source, Railway source, historical source, or caller-selected secret name.

## Invocation ordering
R2 creates only the supplier capability. R1 remains authoritative for ordering:
1. validate expected deployment/publication identity;
2. validate exact serving provenance;
3. only then invoke the supplied callback;
4. invoke the existing W09-C2D parser at most once.

Therefore provenance mismatch/unavailability must still produce zero raw-binding supplier access.

## Secret invariant
The raw binding may exist only at the existing composition observation and inside the opaque supplier handoff requested by R1. R2 output, exceptions, logs, telemetry, snapshots, diagnostics, and artifacts must not contain credentials, query parameters, fragments, or the complete raw binding.

## Deterministic tests
All bindings are synthetic. Tests must prove:
1. adapter supplier returns the exact opaque value without transformation;
2. adapter itself has no ambient secret lookup;
3. R1 exact-provenance path calls supplier once and parser once;
4. R1 provenance mismatch/unavailability calls supplier zero times;
5. missing/unbound binding fails closed;
6. synthetic credentials/query/fragment do not escape in output/errors/diagnostics;
7. static adapter source has no `process.env`, DB driver/SQL, filesystem secret read, DNS/network/provider client, Railway/historical fallback, persistence, deployment, scheduler, or worker authority;
8. `src/index.ts` contains no new/second Production binding lookup or fallback introduced by R2;
9. no public route is introduced.

## Exact-head implementation gate
Implementation begins from then-current canonical `main`. Before merge:
- exact head/base and merge-base ancestry are recorded;
- branch is zero commits behind canonical main;
- changed files are only the three approved files;
- R1 resolver and W09-C2D parser are unchanged;
- deterministic R2/R1 tests pass;
- required repository CI, typecheck, build, and browser critical-path checks pass at exact head;
- no Production secret/binding/provider/database access occurs in CI;
- zero unresolved review threads;
- merge requires separate explicit authorization.

R2 certification means only that the composition wiring is code-certified. It is not Gate A PASS.

## Post-merge reattempt prerequisite
Before a one-shot Production W09-C2E reattempt, any required Replit source synchronization, provenance build, or publication must be separately authorized and certified. The eventual one-shot authorization must bind the exact canonical commit/tree, serving-provenance fingerprint, successful deployment/publication identity, R2 composition version, R1 resolver version, and W09-C2D parser version.

That one-shot permits at most one supplier invocation and one parser invocation. Timeout, response loss, provenance mismatch, missing binding, parser failure, safety failure, or ambiguity consumes the authorization and permits no automatic retry.

## Out of scope
Production binding access; Replit sync/build/publication; secret/config/env mutation; SQL or database/catalog sessions; provider/public-site network access; migrations 0005/0006/0007; DDL/DML; scheduler/worker/runtime activation; W09-C Stage 0; Railway mutation; UGP work.
