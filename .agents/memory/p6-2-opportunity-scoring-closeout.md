# P6.2 Opportunity Scoring Closeout

## Scope

Roadmap P6.2 implements a deterministic, provider-neutral scoring kernel over exact P6.1 unified opportunity records.

Issue: #246  
Implementation PR: #247  
Base SHA: `70137fa940a9f4a733cfe4506efca351813e47db`  
Base tree: `377a6a5b48ce948baf9516b95c82cc18b7d16fc5`  
Exact tested implementation head: `e2bdcead7aa9603305ade20ed86c62a10afcb2c5`  
Implementation merge: `0bc3745e978fd57b944123283d3f54dd7e1dd3fb`  
Implementation tree: `d20788070aecd9732fe5857e69e8b1baf354b3da`

P6.2 is additive engineering only. It does not alter routes, OpenAPI, database schema, persistence, provider access, schedulers/workers, public-site state, deployment, publication, or the existing legacy opportunity-engine score.

## Scoring contract

Five explicit normalized components are accepted on the closed interval `[0,1]`:

- `impact`: larger evidence-backed upside;
- `confidence`: stronger evidence support;
- `risk`: greater downside/uncertainty and therefore a penalty;
- `effort`: greater implementation cost/complexity and therefore a penalty;
- `freshness`: fresher evidence.

The exact v1 formula is:

`score01 = impact × confidence × freshness × (1 - risk) × (1 - effort)`

`score100 = score01 × 100`

Risk and effort remain visible as raw components and also expose their retention modifiers. The implementation does not relabel high risk or high effort as a positive quantity.

## Null, zero and fail-closed behavior

P6.2 preserves the distinction between zero and absence:

- `0` is a valid normalized component and may yield a real combined score of zero;
- `null` means the component is unavailable/unscorable;
- if any required component is null, the combined score is null;
- no missing component receives a neutral/default substitute.

Every non-null component requires a normalized basis code and at least one bounded evidence fingerprint from the exact P6.1 record. Foreign evidence fails closed. Duplicate basis fingerprints collapse and sort deterministically.

A null component is forbidden from claiming a basis code or evidence references.

## Exact P6.1 binding

Before scoring, P6.2 reconstructs the supplied P6.1 record through the P6.1 canonical normalizer. Its canonical opportunity ID and fingerprint must match the supplied record.

This makes subject/evidence/scope/kind/reference-time/missing-evidence/legacy-mapping tampering fail closed rather than silently producing a new score.

P6.1 semantic guards are carried forward unchanged, including:

- null distinct from zero;
- provider-native keyword difficulty not cross-provider comparable;
- request-frame trend values not absolute demand and not cross-frame comparable;
- backlink authority provider-native and not cross-provider comparable;
- competitor visibility not market share;
- gap evidence not itself a recommendation;
- source telemetry descriptive only and not an execution/refresh controller;
- missing evidence not fabricated.

P6.2 itself does not manufacture normalized components from incompatible provider-native values.

## Separation of P6 responsibilities

P6.2 scores one record at a time only.

It deliberately does not:

- sort/rank/prioritize a collection — P6.3 owns conflict/dedupe/suppression/prioritization;
- generate recommendation/explanation prose — P6.4 owns that layer;
- classify informational/recommend/approval/blocked actionability — P6.5 owns that layer;
- generate current-vs-proposed diffs — P6.6 owns that layer;
- manage opportunity lifecycle/history — P6.7 owns that layer.

The pre-existing legacy opportunity engine keeps its `{ demand, proximity, confidence, evidence }` score and existing semantics unchanged.

## Test/CI history

The first implementation PR head `f5f4267ed330769531a25e0e35b5a2766ae914d9` reached CI #454 / run `35430506731`.

All functional P6.2 tests passed, but a static anti-persistence guard was overly broad: it treated `crypto.createHash(...).update(...)` as though it were a database update primitive. CI failed and no merge occurred.

The guard was narrowed to database-specific mutation primitives only. No scoring/runtime behavior was weakened.

Corrected exact head `e2bdcead7aa9603305ade20ed86c62a10afcb2c5` passed CI #455 / run `35430608270` across:

- legacy PostgreSQL schema validation;
- Task tests;
- P3.6 migration validation;
- all current workspace tests including P6.2;
- P4.10 Playwright Chromium critical paths;
- typecheck;
- build.

PR #247 was merged only with that exact tested head.

Post-merge main `0bc3745e978fd57b944123283d3f54dd7e1dd3fb` passed CI #456 / run `35430704830` across the same full matrix.

## Replit certification

Before synchronization, Replit was:

- branch `main`;
- HEAD/tree `70137fa940a9f4a733cfe4506efca351813e47db` / `377a6a5b48ce948baf9516b95c82cc18b7d16fc5`;
- origin/main at the implementation merge;
- ahead/behind `0/4`;
- clean, zero untracked, no Git operation.

A Git-only fast-forward synchronized Replit to:

- HEAD `0bc3745e978fd57b944123283d3f54dd7e1dd3fb`;
- tree `d20788070aecd9732fe5857e69e8b1baf354b3da`;
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

The build retained the existing non-fatal chunk-size warning only. No dependency install/update, browser install, service operation, database/provider/config/secret/scheduler/worker/deployment/publication action occurred.

## Plausible Analytics review

The user separately asked whether `plausible/analytics` can contribute to SEO ENGINE.

Observed repository licensing at the reviewed master checkpoint:

- the main Plausible Community Edition application uses GNU AGPL-3.0-or-later;
- `tracker/npm_package/LICENSE.md` uses the MIT license.

No Plausible code was copied or imported into P6.2.

Potential future P10 design references include:

- goals/conversions and funnel modeling;
- UTM/referrer/source dimensions;
- filtered breakdowns and time-series reporting;
- lightweight first-party browser event capture;
- privacy-oriented aggregation and reporting concepts.

Direct reuse of AGPL application code is deferred unless the project deliberately evaluates and accepts the applicable licensing obligations. The MIT tracker package is a materially easier future reuse candidate, but any adoption remains a separate P10 architecture/security/privacy/licensing decision.

## Safety state

P6.2 performed no:

- provider enrollment/purchase/credential use/request;
- public-site read/write;
- Task #67 source admission or refresh-plan mutation;
- Task #64/#70 execution;
- observation/evidence/score persistence;
- Production DB read/write/DDL/DML;
- scheduler/worker/retry activation;
- environment/secret/config mutation;
- application deployment or publication.

## Next boundary

The next safe default milestone is **P6.3 — conflict/dedupe/suppression/prioritization**.

P6.3 may operate over certified P6.1 records and P6.2 scores, but it must remain deterministic/default-off and must not:

- turn collection ordering into autonomous execution;
- erase evidence conflicts or missing-data blockers;
- generate recommendation/actionability semantics owned by P6.4/P6.5;
- activate providers, persistence, schedulers/workers or publication;
- change the existing legacy runtime without a separately bounded issue.
