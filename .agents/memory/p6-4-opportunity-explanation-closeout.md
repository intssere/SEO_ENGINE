# P6.4 Opportunity Explanation Closeout

## Scope

Roadmap P6.4 implements deterministic explanation/evidence generation over exact P6.1 opportunity records, exact P6.2 scores and exact P6.3 prioritization decisions.

Issue: #252  
Implementation PR: #253  
Base SHA: `72c2daf503cc475ceb4d684b894735453b1b62e6`  
Base tree: `fd802bd4c4b5407fa7a2e7c8f919d00e78e73b46`  
Exact tested implementation head: `1a07f0e9e482e800e17ca308252bff2cdba3a165`  
Implementation merge: `b3b83e36ba6bb0c5461396eb2a2b1aa33e62762f`  
Implementation tree: `6ab4bac7d8613088a01856c061229e17dd938321`

P6.4 is additive deterministic engineering only. It adds no route, OpenAPI change, database schema/read/write, provider or AI request, persistence, scheduler/worker, public-site mutation, deployment or publication.

## Exact lineage

P6.4 accepts the exact P6.3 collection input and the exact P6.3 prioritization report.

Before explanation generation it:

1. re-runs P6.3 on the supplied collection;
2. requires the complete canonical P6.3 report to match;
3. reconstructs each unique P6.1 opportunity;
4. reconstructs each P6.2 score from the exact P6.1 record and declared components;
5. binds each P6.3 decision to the exact opportunity and score IDs/fingerprints.

Tampered P6.1, P6.2 or P6.3 lineage fails closed.

## Deterministic explanation model

Each unique P6.3 decision becomes one P6.4 explanation item containing:

- opportunity family/kind/opaque subject key;
- exact P6.3 status, advisory rank/tie count, conflict key, explicit suppression codes and system suppression reasons;
- exact P6.2 score ID/fingerprint/status/score01/score100/formula/blockers;
- all five P6.2 score components and basis codes;
- P6.1 evidence cards;
- P6.1 missing-evidence codes;
- P6.1 semantic guards;
- deterministic fixed-template explanation statements.

Statements, explanation items and reports all receive deterministic fingerprints.

## Exact component evidence basis

Every non-null P6.2 component statement carries exactly the evidence fingerprints that P6.2 declared for that component.

P6.4 does not add inferred basis fingerprints.

A null component remains unavailable and carries an empty evidence-basis list.

The overall score statement may carry the deterministic union of declared component bases; component-level lineage remains explicit.

## Evidence cards

Every exact P6.1 evidence ref becomes an evidence card preserving:

- kind;
- fingerprint;
- source key;
- observation time;
- market/category scope;
- `usedByScoreDimensions`.

`usedByScoreDimensions` is only a reverse lookup of P6.2's explicit basis lists. It does not infer additional relevance.

## P6.3 decision preservation

P6.4 mirrors P6.3; it does not create a second prioritization policy.

It preserves:

- eligibility and advisory priority rank;
- equal-score tie count;
- explicit suppression;
- unscorable suppression;
- lower-score explicit-conflict suppression;
- unresolved equal-top explicit conflicts.

When P6.3 leaves an equal-top conflict unresolved, P6.4 explicitly says no arbitrary winner was chosen.

Deterministic output ordering never becomes an additional preference.

## Fixed templates; no inference

P6.4 v1 uses fixed deterministic English templates only.

It makes no model/LLM call and generates no:

- causal SEO outcome;
- promise of traffic/revenue/ranking improvement;
- recommendation or prescribed action;
- P6.5 actionability state;
- P6.6 current-vs-proposed diff;
- P6.7 lifecycle/history inference.

The required P6.1 guard phrase that gap evidence is “not a recommendation by itself” is preserved as a negative semantic boundary, not as recommendation generation.

## Missing evidence and semantic guards

P6.1 missing-evidence codes are retained explicitly rather than treated as zero or fabricated.

P6.1 semantic guards are retained and rendered with fixed descriptions, including:

- null distinct from zero;
- keyword difficulty provider-native/non-cross-provider-comparable;
- trends request-frame relative, not absolute demand, and not cross-frame comparable;
- backlink authority provider-native/non-cross-provider-comparable;
- competitor visibility not market share;
- gap evidence not recommendation by itself;
- source telemetry descriptive only and not controlling refresh/execution;
- missing evidence not fabricated.

## Test and CI history

Initial implementation commit: `5aed992ca924e6405a1342be9d26e84783c0b598`.

Before the PR:
- evidence-card tests were aligned with P6.1 canonical evidence ordering rather than fixture insertion order;
- the prescriptive-language test was narrowed so the required negative guard phrase “not a recommendation by itself” did not false-positive;
- a TypeScript test-fixture nullability edge was made explicit.

These corrections changed no P6.4 product semantics.

Exact tested PR head `1a07f0e9e482e800e17ca308252bff2cdba3a165` passed CI #463 / run `35433617406` across:

- legacy PostgreSQL schema validation;
- Task tests;
- P3.6 migration validation;
- all workspace tests including P6.4;
- P4.10 Playwright Chromium critical paths;
- typecheck;
- build.

PR #253 was merged only from that exact green head.

Post-merge main `b3b83e36ba6bb0c5461396eb2a2b1aa33e62762f` passed CI #464 / run `35433777998` across the same full matrix.

## Replit certification

Before implementation sync, Replit was:

- branch `main`;
- HEAD/tree `72c2daf503cc475ceb4d684b894735453b1b62e6` / `fd802bd4c4b5407fa7a2e7c8f919d00e78e73b46`;
- origin/main at the P6.4 implementation merge;
- ahead/behind `0/4`;
- clean, zero untracked, no Git operation.

A Git-only fast-forward synchronized Replit to:

- HEAD `b3b83e36ba6bb0c5461396eb2a2b1aa33e62762f`;
- tree `6ab4bac7d8613088a01856c061229e17dd938321`;
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

P6.4 performed no:

- provider or AI/LLM request;
- credential use;
- public-site read/write;
- Task #67 source admission or refresh-plan mutation;
- Task #64/#70 execution;
- observation/evidence/score/priority/explanation persistence;
- Production DB read/write/DDL/DML;
- scheduler/worker/retry activation;
- environment/secret/config mutation;
- application deployment or publication.

## Next boundary

The next safe default milestone is **P6.5 — actionability classifier: informational / recommend / approval / blocked**.

P6.5 may deterministically classify certified P6.1/P6.2/P6.3/P6.4 records into those actionability states, but it must remain default-off and must not:

- treat `recommend` as execution authorization;
- auto-transition a recommendation into approval/execution;
- generate current-vs-proposed implementation diffs owned by P6.6;
- infer lifecycle/history owned by P6.7;
- activate providers, persistence, schedulers/workers, execution or publication.
