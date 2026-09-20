# P10.4 — Experiment/holdout framework where practical

## Scope

P10.4 adds a deterministic, read-only **supplied experiment/holdout design framework** over exact P10.1 chronology, P10.2 action association, and P10.3 window/confounder analysis.

It is deliberately not a causal estimator.

The module is:

`artifacts/api-server/src/lib/experiment-holdout.ts`

## Integrity chain

P10.4 consumes:

- one supplied P10.1 `UnifiedChangeTimelineReport`;
- one supplied P10.2 `ActionAttributionReport`;
- one supplied P10.3 `ActionWindowConfounderInput`;
- its supplied P10.3 `ActionWindowConfounderReport`;
- one caller-supplied experiment-design declaration;
- zero or more caller-supplied holdout units;
- zero or more caller-supplied holdout observations.

Before producing a P10.4 report it:

1. rebuilds P10.2 from the exact supplied P10.1 timeline;
2. requires the supplied P10.2 report to equal the rebuild;
3. requires the P10.3 input to carry that exact same P10.1/P10.2 lineage;
4. rebuilds P10.3 from the supplied P10.3 input;
5. requires the supplied P10.3 report to equal the rebuild;
6. requires P10.3 timeline/attribution identity to bind exactly to the rebuilt P10.2 chain.

Tampered or mismatched lineage fails closed.

## One treatment action

P10.4 v1 is intentionally bounded to one exact treatment action.

That action is the exact action represented by the verified P10.3 report.

The P10.3 treatment analysis must have:

- an available exact `verified_change_retained_live` anchor;
- an available before window;
- an available after window.

P10.4 does not choose or infer another anchor.

## Supplied holdouts

A holdout is an immutable caller-supplied analysis definition with:

- exact `unitId`;
- explicit page/query/category scope;
- optional exact site/domain scope;
- explicit assignment-source identity and SHA-256 fingerprint.

P10.4 does not create the assignment.

A holdout must include at least one page/query/category dimension.

If zero holdouts are supplied, the design state is exactly:

`treatment_only`

P10.4 does not invent a pseudo-control from unrelated observations.

With one or more holdouts, the structural state is:

`holdout_defined`

That label means only that holdout definitions exist.

## Assignment basis

The caller may declare one of:

- `externally_randomized`
- `externally_matched`
- `externally_selected`
- `observational`

This is provenance supplied by the caller.

P10.4 does not independently verify that randomization or matching was implemented correctly. It does not infer balance, comparability, exchangeability, or causal identification from the label.

## Shared window semantics

P10.4 reuses the exact P10.3 treatment before/after windows.

It does not:

- derive new windows;
- shift window bounds;
- re-anchor holdouts;
- infer lag or cooldown;
- align observations by nearby timestamps.

Holdout observations are classified against those exact windows as:

- `before`
- `after`
- `outside`

## Exact holdout observations

Each holdout observation includes:

- exact holdout `unitId`;
- canonical `observedAt`;
- exact source system/version/event ID/fingerprint;
- exact scope.

The observation scope must exactly equal the declared holdout-unit scope.

There is no fuzzy URL matching, semantic query matching, taxonomy expansion, or scope broadening.

Exact replay of one source identity dedupes. Different content under one source identity fails closed.

P10.4 does not require metric values and calculates no metric delta.

## Structural contamination/leakage flags

P10.4 emits descriptive structural evidence only.

### Cross-arm scope overlap

`cross_arm_scope_overlap` is emitted when a holdout shares at least one exact direct P10.2 page ID, URL, query, or category token with the treatment action.

It does not state that the design is statistically invalid.

### Holdout action overlap

`holdout_action_overlap` requires:

1. another exact P10.2 action;
2. exact compatibility with the holdout scope;
3. exact `verified_change_retained_live` evidence;
4. the retained-live event inside the treatment P10.3 before or after window.

This is contamination evidence only.

### Treatment confounder presence

Every exact P10.3 treatment confounder is projected as:

`treatment_confounder_present`

P10.4 preserves the P10.3 flag fingerprint and window.

### Missing observation coverage

For every holdout P10.4 can state:

- `holdout_missing_before_observation`;
- `holdout_missing_after_observation`.

These are supplied-data coverage facts, not power or statistical-validity judgments.

## Determinism

P10.4:

- uses canonical timestamps;
- normalizes exact supplied scope;
- requires explicit SHA-256 source fingerprints;
- dedupes exact source replay;
- fails closed on conflicting replay;
- stably sorts holdouts, observations, and flags;
- produces stable SHA-256 identities;
- is invariant to supplied holdout/observation order.

## Non-causal interpretation guard

P10.4 explicitly records:

- caller-declared randomization is not independently verified;
- caller-declared matching is not independently verified;
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

P10.4 therefore creates **design lineage and structural evidence**, not a causal result.

## Safety boundary

P10.4 authorizes no:

- live experiment assignment;
- Production/live DB read/write;
- SQL or schema mutation;
- provider/network request;
- provider credential use;
- provider/public-site write;
- proposal persistence;
- approval grant;
- execution authorization;
- Task #51/#53/#54 execution;
- autonomous mutation or P9.8 implementation;
- timer/scheduler/worker/retry runtime;
- automatic transition;
- route activation;
- P10.5 implementation;
- deployment;
- publication.

`PUBLIC_SITE_WRITES_ENABLED` and `AI_PROPOSAL_GENERATION_ENABLED` remain untouched.

## Next boundary

P10.5 may later define expected-vs-actual outcome tracking.

P10.4 does not calculate an expected outcome, actual treatment effect, significance, winner, rollout decision, or causal impact.
