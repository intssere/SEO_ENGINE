# P6.3 Opportunity Prioritization Closeout

## Scope

Roadmap P6.3 implements deterministic collection conflict, exact dedupe, explicit suppression and advisory priority ranking over exact P6.1 opportunity records and exact P6.2 scores.

Issue: #249  
Implementation PR: #250  
Base SHA: `5efea32b93a0e8f2daa6693a6c5d7faefec6e757`  
Base tree: `ee59b670755addad1b1662aed254609764f0a4d6`  
Exact tested implementation head: `20fa4ba5159840d94d36a2900a1d4f687e2cf23e`  
Implementation merge: `06739367624018c501a11459881462e2be480657`  
Implementation tree: `b8f4ff628d55cf94c0664583c4ad83c86f9f5c2e`

P6.3 is additive engineering only. It adds no route, OpenAPI change, database schema/read/write, persistence, provider access, scheduler/worker, public-site mutation, deployment or publication.

## Canonical input integrity

Every collection entry contains one P6.1 opportunity and one P6.2 score.

Before collection policy runs, P6.3:

1. reconstructs the complete canonical P6.1 opportunity and requires the supplied record to match;
2. reconstructs the complete canonical P6.2 score from that opportunity and the supplied score components;
3. requires the supplied P6.2 output to match the reconstructed score.

Tampered opportunity or score output therefore fails closed.

## Homogeneous collection frame

One P6.3 collection must use one exact:

- P6.1 `referenceTime`;
- market fingerprint;
- category fingerprint.

Mixed reference times or scopes fail closed.

This keeps priority comparisons inside a coherent snapshot rather than mixing different observation frames.

## Exact duplicate semantics

P6.3 collapses exact duplicate opportunities only.

A repeated opportunity fingerprint collapses only when these normalized values are also identical:

- P6.2 score fingerprint;
- conflict key;
- explicit suppression codes.

If one opportunity fingerprint appears with conflicting score or policy metadata, the report fails closed.

P6.3 does not infer lifecycle or supersession from a shared subject with changed evidence. P6.7 owns lifecycle/history.

## Explicit suppression

A caller may attach up to eight normalized suppression codes.

Suppressed candidates remain visible with their codes and receive no priority rank. They are not deleted from the report.

A P6.2 `unscorable` candidate is also suppressed from priority. P6.3 does not manufacture a replacement score.

## Explicit conflict semantics

P6.3 never infers mutual exclusion from:

- opportunity family;
- opportunity kind;
- subject key;
- shared evidence;
- lexical similarity.

Mutual exclusion exists only when the caller provides the same normalized conflict key.

Already-suppressed/unscorable rows do not actively compete inside the conflict.

### Unique highest score

If active members have one unique highest canonical P6.2 `score100`:

- that member remains eligible;
- lower active members are suppressed with `conflict_lower_score`.

### Equal highest score

If two or more active members tie at the highest score:

- no fingerprint/insertion-order/family/kind tiebreak is used as a winner;
- top tied members are suppressed with `conflict_top_score_tie`;
- lower active members are suppressed with `conflict_lower_score`;
- the group is reported `unresolved_top_tie`.

This preserves ambiguity instead of disguising deterministic serialization as business preference.

## Dense advisory priority ranking

Remaining eligible opportunities are ordered by canonical P6.2 `score100` descending.

Ranks are dense:

- 80 → rank 1
- 80 → rank 1
- 55 → rank 2
- 20 → rank 3

Equal non-conflicting scores remain co-equal. Fingerprint ordering exists only for deterministic output serialization and is explicitly not a preference.

Priority is advisory. It is not:

- execution order;
- authorization;
- a scheduler instruction;
- recommendation prose;
- actionability classification.

## Test and CI history

The first implementation commit was `f428a9e523ef0203a8fbc63941af567a9396dbbd`.

Before opening the PR, branch review identified a compile-safety edge in the canonical JSON helper: `JSON.stringify(undefined)` may return `undefined`. The helper was made total with an explicit `undefined` representation. This changed no P6.3 collection semantics.

Exact tested PR head `20fa4ba5159840d94d36a2900a1d4f687e2cf23e` passed CI #459 / run `35432176194` across:

- legacy PostgreSQL schema validation;
- Task tests;
- P3.6 migration validation;
- all workspace tests including P6.3;
- P4.10 Playwright Chromium critical paths;
- typecheck;
- build.

PR #250 was merged only from that exact green head.

Post-merge main `06739367624018c501a11459881462e2be480657` passed CI #460 / run `35432288284` across the same full matrix.

## Replit certification

Before sync, Replit was:

- branch `main`;
- HEAD/tree `5efea32b93a0e8f2daa6693a6c5d7faefec6e757` / `ee59b670755addad1b1662aed254609764f0a4d6`;
- origin/main at the implementation merge;
- ahead/behind `0/3`;
- clean, zero untracked, no Git operation.

A Git-only fast-forward synchronized Replit to:

- HEAD `06739367624018c501a11459881462e2be480657`;
- tree `b8f4ff628d55cf94c0664583c4ad83c86f9f5c2e`;
- origin/main identical;
- ahead/behind `0/0`;
- index/worktree clean;
- zero untracked;
- no Replit-only commit;
- no non-Git mutation.

Non-browser validation on that exact checkout passed:

- `pnpm -r --if-present test`;
- `pnpm typecheck`;
- `pnpm build`;
- `git diff --check`.

The build retained the existing non-fatal chunk-size warning only. No dependency install/update, browser install, persistent service, config, database, provider, scheduler, worker, deployment or publication action occurred.

## Safety state

P6.3 performed no:

- provider enrollment/purchase/credential use/request;
- public-site read/write;
- Task #67 source admission or refresh-plan mutation;
- Task #64/#70 execution;
- observation/evidence/score/priority persistence;
- Production DB read/write/DDL/DML;
- scheduler/worker/retry activation;
- environment/secret/config mutation;
- application deployment or publication.

## Next boundary

The next safe default milestone is **P6.4 — explanation/evidence generation**.

P6.4 may project deterministic explanation/evidence structures from certified P6.1 opportunity evidence, P6.2 component diagnostics and P6.3 collection decisions, but it must remain default-off and must not:

- invent missing evidence or causal claims;
- convert explanation text into actionability semantics owned by P6.5;
- generate current-vs-proposed implementation diffs owned by P6.6;
- infer lifecycle/history owned by P6.7;
- activate providers, persistence, schedulers/workers, execution or publication.
