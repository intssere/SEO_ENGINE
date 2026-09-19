# P6.6 Opportunity Preview/Diff Closeout

## Scope

Roadmap P6.6 implements deterministic/default-off current-vs-proposed preview/diff generation over exact P6.5 actionability lineage.

Issue: #258  
Implementation PR: #259  
Base SHA: `c05d7eeb986eaf9fe38669a337f76e9b31b803cb`  
Base tree: `ba1a88da701d1b2860264157c81385505a0413d7`  
Corrected exact tested implementation head: `c5ae9c78044970c911379f411482901a6a29fdb5`  
Implementation merge: `6f650c985dfd7e8097d2f030704c1841126b587a`  
Implementation tree: `25f971bae389a6896a8ee6f0a7df78c37a362974`

P6.6 is additive deterministic preview engineering only. It adds no route, OpenAPI change, provider/AI request, current-site fetch, database read/write/schema mutation, persistence, approval grant, scheduler/worker, public-site mutation, apply primitive, deployment or publication.

## Exact lineage

P6.6 accepts the exact P6.5 input and exact P6.5 report.

Before preview generation it rebuilds P6.5 and requires canonical equality. P6.5 reconstruction transitively revalidates P6.4/P6.3/P6.2/P6.1 lineage.

Every preview binds to exact opportunity and actionability fingerprints. Unknown or mismatched lineage fails closed.

## Caller-supplied state only

P6.6 does not discover current state and does not generate proposed state.

Only explicitly supplied previews are emitted. Preview coverage is optional; an empty preview collection is valid and deterministic.

Each preview contains normalized opaque preview/field keys plus exact caller-supplied `currentValue` and `proposedValue` strings or null.

Values are not trimmed, lower-cased, NFKC-normalized or semantically interpreted.

## Exact diff states

Per field:
- `unchanged`: exact values equal;
- `added`: current is null, proposed is non-null;
- `removed`: current is non-null, proposed is null;
- `modified`: both non-null and exact strings differ.

Null remains distinct from empty string.

No fuzzy/semantic/HTML/DOM/token diffing occurs.

## Determinism and duplicate handling

Preview/field keys are NFKC-normalized, trimmed and lower-cased for identity only.

Duplicate normalized preview keys for the same opportunity fail closed. Duplicate normalized field keys inside one preview fail closed.

Fields are sorted by normalized field key. Previews follow canonical P6.5 decision serialization then preview key. This ordering is serialization only, not preference or execution order.

P6.6 produces deterministic preview and report fingerprints plus exact field/state counts.

## Actionability preservation

P6.6 preserves the exact P6.5 classification and governance flags.

Informational, recommend, approval and blocked previews may all be inspected.

Inspection never changes actionability. Every preview explicitly reports `applyAuthorized=false`.

The existence of a proposed value does not mean it is:
- applied;
- approved;
- recommended merely by being supplied;
- better;
- safe;
- valid;
- compliant;
- executable.

No JSON Patch, SQL, shell, provider or site-mutation instruction is generated.

## Bounds

P6.6 v1 bounds:
- 256 previews;
- 64 fields per preview;
- 8,192 characters per current/proposed value;
- canonical normalized keys up to 96 characters.

Bounds fail closed.

## CI history

Initial implementation commit: `af8c8850ea4f168c063032db3f4b2b678eb2de3b`.

A serialization-hygiene change produced head `07dfa68650902aec525609018d7cf15050940c5e`.

PR CI #471 / run `35438506383` failed exactly one new P6.6 test. The implementation output correctly followed canonical P6.5 decision order; the test incorrectly expected a particular subject to appear first. No merge occurred.

The test assertion was corrected without changing implementation semantics, producing exact tested head `c5ae9c78044970c911379f411482901a6a29fdb5`.

Corrected PR CI #472 / run `35438598540` passed:
- legacy PostgreSQL schema validation;
- Task tests;
- P3.6 migration validation;
- all workspace tests including P6.6;
- P4.10 Playwright Chromium critical paths;
- typecheck;
- build.

PR #259 was merged only from that exact green head.

Post-merge main `6f650c985dfd7e8097d2f030704c1841126b587a` passed CI #473 / run `35438728623` across the same full matrix.

## Replit certification

Before implementation sync, Replit was:
- branch `main`;
- HEAD/tree `c05d7eeb986eaf9fe38669a337f76e9b31b803cb` / `ba1a88da701d1b2860264157c81385505a0413d7`;
- origin/main at the P6.6 implementation merge;
- ahead/behind `0/4`;
- clean, zero untracked, no Git operation.

A Git-only fast-forward synchronized Replit to:
- HEAD `6f650c985dfd7e8097d2f030704c1841126b587a`;
- tree `25f971bae389a6896a8ee6f0a7df78c37a362974`;
- origin/main identical;
- ahead/behind `0/0`;
- index/worktree clean;
- zero untracked;
- no Replit-only commit;
- no non-Git mutation.

Non-browser validation passed:
- `pnpm -r --if-present test`;
- `pnpm typecheck`;
- `pnpm build`;
- `git diff --check`.

Existing non-fatal tooltip/sheet sourcemap messages and minified chunk-size warning remained. No dependencies, browser install, persistent service, config, database, provider, scheduler, worker, deployment or publication state changed.

## Safety state

P6.6 performed no provider/AI request, credential use, current-site fetch, public-site read/write, source admission/refresh-plan mutation, Task #64/#70 execution, approval grant, observation/evidence/score/priority/explanation/actionability/preview persistence, Production DB read/write/DDL/DML, scheduler/worker/retry activation, automatic apply/transition, environment/secret/config mutation or publication.

## Next boundary

The next safe default milestone is **P6.7 — opportunity lifecycle/history**.

P6.7 should remain deterministic/default-off. It may model explicit caller-supplied lifecycle events and history only when bound to certified P6.1–P6.6 lineage. It must not infer historical events that were not supplied, execute actions, activate persistence, mutate providers/sites, grant approval, or automatically transition live state.
