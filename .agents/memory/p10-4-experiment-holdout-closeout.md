# P10.4 — Experiment/holdout framework closeout

## Status

P10.4 is complete as a deterministic/read-only engineering milestone.

It does not activate live experiment assignment, live measurement loading, statistical inference, causal inference, impact measurement, Production persistence, provider access, mutation, automation, deployment or publication.

## Canonical implementation record

- Issue: #328 — `P10.4 — experiment/holdout framework where practical`
- Implementation PR: #329 — `P10.4 — supplied experiment/holdout framework`
- Base SHA/tree: `7ec8706bf7320cff7a41a420f387f43eecbd1b13` / `ad0f09cd5fc7c2e0bf9f60705232e7cfc326ebb9`
- Exact tested PR head/tree: `ce67cbbe5542e45ddd5f76204274555e2c5ea45a` / `d236693f98231e6aa991a3e39feb6a17e802187d`
- Exact-head CI: #571 / run `35510122006` — success
- Implementation merge/tree: `50ef9fda7b9e0bdee2d48e1d2ba1400b8d9a5b7e` / `d236693f98231e6aa991a3e39feb6a17e802187d`
- Post-merge main CI: #572 / run `35510239165` — success

## What P10.4 added

The implementation adds:
- `artifacts/api-server/src/lib/experiment-holdout.ts`
- `artifacts/api-server/src/lib/experiment-holdout.test.ts`
- `artifacts/api-server/src/lib/experiment-holdout-contract.test.ts`
- `docs/p10-4-experiment-holdout.md`

P10.4 consumes exact supplied P10.1/P10.2 lineage plus one supplied P10.3 treatment-analysis input/report pair.

Before any P10.4 projection:
1. P10.2 is rebuilt from the supplied P10.1 timeline.
2. The supplied P10.2 report must exactly match that rebuild.
3. The supplied P10.3 input must bind to that exact P10.1/P10.2 chain.
4. P10.3 is rebuilt from the supplied P10.3 input.
5. The supplied P10.3 report must exactly match that rebuild.
6. P10.3 timeline and attribution identities must bind to the exact rebuilt chain.

Tampered or mismatched lineage fails closed.

## Bounded treatment boundary

P10.4 v1 models exactly one treatment action.

It requires:
- the exact treatment action represented by P10.3;
- an available P10.3 `verified_change_retained_live` anchor;
- an available P10.3 before window;
- an available P10.3 after window.

P10.4 reuses those exact windows and does not infer, shift or re-anchor them.

## Supplied holdouts

Each holdout is a caller-supplied immutable analysis definition with:
- exact `unitId`;
- exact site/page/query/category scope;
- at least one page/query/category dimension;
- explicit assignment-source identity;
- explicit SHA-256 source fingerprint.

P10.4 does not create live assignments.

Zero holdouts remains exactly `treatment_only`; a pseudo-control is never invented.

## Assignment provenance

The caller can declare:
- `externally_randomized`
- `externally_matched`
- `externally_selected`
- `observational`

P10.4 treats these labels as provenance only.

It does not independently verify:
- randomization;
- matching quality;
- balance;
- comparability;
- exchangeability.

## Holdout observations

A supplied holdout observation carries:
- exact holdout unit ID;
- canonical timestamp;
- exact source system/version/event ID/fingerprint;
- scope exactly equal to the declared holdout scope.

Membership is descriptive only:
- `before`
- `after`
- `outside`

The exact P10.3 treatment windows are reused.

No metric values or metric deltas are required/calculated by P10.4.

Exact source replay dedupes. Conflicting replay for one source identity fails closed.

## Structural flags

P10.4 emits only bounded descriptive structural evidence:

- `cross_arm_scope_overlap`
- `holdout_action_overlap`
- `treatment_confounder_present`
- `holdout_missing_before_observation`
- `holdout_missing_after_observation`

Cross-arm overlap is exact direct P10.2 page/query/category token overlap.

Holdout-action overlap requires another exact P10.2 action, exact holdout-scope compatibility, exact `verified_change_retained_live` evidence and event time inside the treatment P10.3 before/after window.

Treatment confounders are projected from exact P10.3 confounder fingerprints/windows.

Missing observation flags are supplied-data coverage facts only.

## Determinism

P10.4:
- validates canonical timestamps;
- normalizes exact supplied scope;
- requires explicit SHA-256 source fingerprints;
- dedupes exact source replay;
- fails closed on conflicting replay;
- stably sorts units, observations and flags;
- produces stable SHA-256 identities;
- is invariant to supplied holdout/observation order.

## Non-causal / non-statistical guard

P10.4 explicitly records:
- declared randomization is not independently verified;
- declared matching is not independently verified;
- holdout presence does not establish comparability;
- scope disjointness does not establish exchangeability;
- before/after timing does not establish causality;
- contamination flags do not perform causal adjustment;
- no treatment effect is calculated;
- no statistical significance is calculated;
- no confidence interval is calculated;
- no causal attribution is performed;
- no rollout recommendation is generated;
- experiment success is not declared.

## Safety capability

P10.4 keeps closed:
- live experiment assignment;
- Production DB reads/writes;
- schema mutation;
- provider network reads;
- provider credentials;
- provider/public-site writes;
- proposal persistence;
- approval grants;
- Task #51/#53/#54 execution;
- autonomous mutation;
- P9.8 implementation;
- P10.5 implementation;
- timers/scheduler/live worker/retry runtime;
- automatic transitions;
- publication.

The static contract test prevents importing current operational DB/live measurement/mutation runtimes or using network/timer/child-process primitives.

## Replit certification

Before PR creation, a detached temporary worktree at the exact tested head/tree passed:
- focused P10.4 unit tests;
- focused P10.4 contract tests;
- API typecheck;
- `git diff --check`.

After GitHub post-merge CI succeeded, Replit was Git-only fast-forwarded to:
- branch: `main`
- HEAD: `50ef9fda7b9e0bdee2d48e1d2ba1400b8d9a5b7e`
- tree: `d236693f98231e6aa991a3e39feb6a17e802187d`
- origin/main: exact same SHA
- ahead/behind: `0/0`
- tracked differences: 0
- untracked files: 0
- diff against origin/main: zero

Validation on that exact Replit tree:
- recursive workspace tests: PASS
- full typecheck: PASS
- full build: PASS
- `git diff --check`: PASS

Validation used existing dependencies only. No dependency/lockfile, config, secret, database, provider, deployment or publication change occurred.

Known non-fatal existing frontend build diagnostics remained limited to tooltip/sheet sourcemap location-resolution messages and the >500 kB minified-chunk warning.

## Publication state

P10.4 is unpublished.

Published production remains the separately certified Task #73 production source. Engineering merge/synchronization does not change that production source.

## Next safe boundary

The next safe engineering boundary is:

**P10.5 — expected-vs-actual outcome tracking**

P10.5 should begin with deterministic supplied expected/outcome definitions and descriptive comparison semantics over exact P10.1–P10.4 lineage.

It must preserve:
- chronology vs direct association vs window/confounder evidence vs experiment/holdout structure vs expected/actual outcome tracking as separate layers;
- explicit metric definition, unit, direction and provenance;
- missing/unknown expected or actual values remain unavailable;
- arithmetic difference is not causal attribution;
- no live provider/outcome loading on generic continuation;
- no P9.8 autonomous-mutation implementation;
- no Task #51/#53/#54 execution;
- no provider/public-site write;
- no Production DB mutation or DDL;
- no deployment/publication on generic continuation.
