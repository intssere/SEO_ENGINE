# P7.5 AI Visibility Scoring/History Closeout

## Scope

Roadmap P7.5 implements deterministic/default-off AI visibility scoring/history over exact P7.4/P7.3/P7.2 lineage.

Issue: #276  
Implementation PR: #277  
Base SHA: `6f8841688b9897fd65daf5a8a7d8c0890ca5503f`  
Base tree: `25c1bf64ca3e2cc3a911bdb7c8d1dbe7cecebf59`  
Initial implementation head: `ed6b803d74b779f53d7f6e78576fadcb88c3e051`  
Exact corrected/tested head: `f25d2d912e86a59998e1e8dd4342cf70c54afeac`  
Implementation merge: `5a378eb72471aa7697011c814a7703213f5ed8ed`  
Implementation tree: `36e878daebc1c687b808b001d22bdf50b284548d`

P7.5 is additive deterministic scoring/history engineering only. It adds no route, OpenAPI change, live AI/provider request, credential use, persistence, database read/write/schema mutation, scheduler/worker, AI/GEO opportunity generation, approval grant, site mutation, deployment or publication.

## Exact lineage

Each scoring snapshot carries:
- exact P7.4 comparison input;
- exact P7.4 comparison report;
- explicit score records.

P7.5 reconstructs P7.4 and requires complete canonical equality.

P7.4 reconstruction transitively revalidates exact P7.3 collection and P7.2 prompt/topic lineage.

A tampered P7.4 report fails closed.

## Explicit score scope

Each score binds to one exact:
- caller-owned score key;
- P7.4 comparison key;
- P7.3 provider;
- P7.3 model;
- P7.3 tracked brand;
- P7.2 prompt set.

The brand must be an explicit member of the selected P7.4 comparison group.

Provider/model/brand/prompt-set identities are validated from certified lineage and their exact fingerprints are preserved.

P7.5 infers no identity from answer text, labels, citation domains or external knowledge.

## Stable comparison frame

P7.4 comparison fingerprints include current evidence and naturally change as observations change.

P7.5 therefore derives a separate comparison-frame fingerprint from only:
- comparison key;
- exact subject brand identity;
- exact competitor brand identities.

This permits history across new evidence while still retaining every exact P7.4 report fingerprint on the score/snapshot.

Changing explicit comparison membership changes the frame and therefore creates a separate history series.

## Explicit weighted components

Every score supplies one or more components.

Each component has:
- normalized unique component code;
- weight in (0,1];
- value in [0,1] or null;
- normalized caller-owned basis code when scored;
- exact P7.3 observation fingerprints as evidence when scored.

Component order canonicalizes by code.

Repeated evidence fingerprints dedupe/sort.

Weights are normalized to six decimals and must sum to 1 under the fixed tolerance.

P7.5 assigns no hidden business semantics to component or basis codes.

## Formula

For a fully scored record:

`score01 = Σ(weight × value)`

`score100 = score01 × 100`

Outputs are rounded to six decimals.

This is the only combined-score formula in P7.5 v1.

## Null versus zero

Zero is a valid supplied normalized value.

Null means the required component value is unavailable.

If any component is null:
- status is `unscorable`;
- score01 is null;
- score100 is null;
- missing component codes are listed.

Null components must have null basis code and no evidence.

Non-null components require a basis code and at least one exact in-scope observation fingerprint.

P7.5 never converts null to zero.

## Evidence scope

Non-null component evidence must identify exact P7.3 observations matching:
- exact provider;
- exact model;
- a prompt inside the exact P7.2 prompt set.

Cross-provider, cross-model and outside-prompt-set evidence fail closed.

Evidence binding remains descriptive lineage.

It does not imply:
- answer correctness;
- citation support for the brand;
- endorsement;
- semantic brand absence when mention evidence is missing.

## No automatic score derivation

P7.5 deliberately does not auto-convert:
- answer counts;
- mention counts;
- citation counts;
- citation-domain counts;
- P7.4 evidence-only difference counts;
- P7.4 citation-domain co-occurrence counts

into score components.

Any normalization of descriptive evidence must be explicitly supplied under a reviewed component/basis contract.

This preserves the P7.3/P7.4 rule that larger counts are not automatically visibility, preference, authority or market share.

## Profile identity

The deterministic score profile contains only:
- component codes;
- component weights.

Values, basis codes and evidence do not alter profile identity.

A formula/profile change therefore splits history rather than silently comparing incompatible scores.

## History model

P7.5 accepts one or more exact snapshots and caller-supplied canonical history reference time.

Rules:
- snapshot collection-reference times must be unique;
- snapshot time must not exceed history reference time;
- all snapshots belong to one exact site;
- snapshot input order is irrelevant.

No wall clock is used.

History is returned in-memory only and is not stored.

## Comparable series

A history series groups scores only when all exact identities remain stable:
- score key;
- site;
- comparison key/frame;
- provider fingerprint;
- model fingerprint;
- brand fingerprint;
- prompt-set fingerprint;
- score-profile fingerprint.

P7.5 does not aggregate providers/models into a cross-provider normalized score.

## Arithmetic deltas

Each history point preserves:
- collection reference time;
- snapshot fingerprint;
- score fingerprint;
- scored/unscorable state;
- score100.

For consecutive points:
- both numeric → later minus earlier;
- positive → increased;
- negative → decreased;
- zero → unchanged;
- either unscorable → null / indeterminate.

These are arithmetic descriptors only.

Increased does not mean improved.

Decreased does not mean regressed.

No quality/business-outcome claim is generated.

## Semantic guardrails

P7.5 explicitly records:
- supplied normalized components only;
- raw P7.3/P7.4 counts are not automatic score inputs;
- null is distinct from zero;
- no cross-provider normalized comparability claim;
- no cross-model normalized comparability claim;
- no aggregate provider winner score;
- score does not imply market share, preference, rank, quality, correctness, recommendation or execution priority;
- history direction does not imply improvement/regression;
- citation co-occurrence does not imply support or endorsement;
- missing mention evidence does not prove brand absence;
- no P7.6 opportunity is generated.

## CI correction history

Initial PR head `ed6b803d74b779f53d7f6e78576fadcb88c3e051` reached CI #496 / run `35451270712`.

CI #496 failed only in two P7.5 workspace-test expectations/fixtures:
1. the implementation correctly rejected a missing brand as outside the selected comparison before the test expected the more specific unknown-brand error;
2. the snapshot-limit test constructed invalid pre-P7.2 collection timestamps while building fixtures, so upstream P7.3 validation fired before P7.5 could test the collection-size guard.

Correction `f25d2d912e86a59998e1e8dd4342cf70c54afeac`:
- validates known brand identity before explicit comparison membership;
- reuses an already-valid snapshot when testing only the snapshot-count guard.

No score formula, evidence boundary, history grouping, safety capability or semantic guard changed.

Exact corrected PR head `f25d2d912e86a59998e1e8dd4342cf70c54afeac` passed CI #497 / run `35451398466` across:
- legacy PostgreSQL schema validation;
- Task tests;
- P3.6 migration validation;
- all workspace tests including P7.5;
- P4.10 Playwright Chromium critical paths;
- typecheck;
- build.

PR #277 was merged only from that exact green head.

Post-merge main `5a378eb72471aa7697011c814a7703213f5ed8ed` passed CI #498 / run `35451526600` across the same full matrix.

## Replit certification

Before implementation sync, Replit was:
- branch `main`;
- HEAD/tree `6f8841688b9897fd65daf5a8a7d8c0890ca5503f` / `25c1bf64ca3e2cc3a911bdb7c8d1dbe7cecebf59`;
- refreshed origin/main at the P7.5 implementation merge;
- ahead/behind `0/3`;
- clean, zero untracked, no Git operation.

A Git-only fast-forward synchronized Replit to:
- HEAD `5a378eb72471aa7697011c814a7703213f5ed8ed`;
- tree `36e878daebc1c687b808b001d22bdf50b284548d`;
- origin/main identical;
- ahead/behind `0/0`;
- clean index/worktree;
- zero untracked;
- no Replit-only commit;
- no non-Git mutation.

Non-browser validation on that exact checkout passed:
- `pnpm -r --if-present test`;
- `pnpm typecheck`;
- `pnpm build`;
- `git diff --check`.

Build output retained only existing non-fatal tooltip/sheet sourcemap messages and the existing minified chunk-size warning.

No dependency install/update, browser install, persistent service, config, database, provider, scheduler, worker, deployment or publication action occurred.

## Safety state

P7.5 performed no:
- live AI/provider request;
- provider credential use;
- source admission;
- score/history persistence;
- Production DB read/write/DDL/DML;
- Task #64/#70 execution;
- scheduler/worker/retry activation;
- AI/GEO opportunity generation;
- approval grant;
- provider/public-site write;
- automatic transition;
- environment/secret/config mutation;
- deployment/publication.

## Next boundary

The next safe default milestone is **P7.6 — AI/GEO opportunity integration**.

P7.6 should remain deterministic/default-off and should map only exact certified P7.3/P7.4/P7.5 evidence into P6-compatible `ai_visibility_gap` and/or `ai_citation_gap` opportunity records.

P7.6 must preserve:
- exact P6.1 family/kind/evidence rules;
- no live provider request;
- no invented missing evidence;
- no cross-provider normalization claim;
- no semantic brand-absence inference from missing mention evidence;
- no citation-support inference from co-occurrence;
- no recommendation/actionability/execution shortcut;
- no persistence;
- no scheduler/worker/publication activation.
