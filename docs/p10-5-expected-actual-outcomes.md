# P10.5 — Expected-vs-actual outcome tracking

## Scope

P10.5 adds deterministic, read-only **expected-vs-actual outcome tracking** over the exact certified P10.1–P10.4 lineage chain.

It is descriptive arithmetic only.

The module is:

`artifacts/api-server/src/lib/expected-actual-outcome.ts`

## Integrity boundary

P10.5 consumes:

- one supplied P10.4 `ExperimentHoldoutInput`;
- its supplied P10.4 `ExperimentHoldoutReport`;
- caller-supplied metric definitions;
- caller-supplied expected outcomes;
- caller-supplied actual observations.

Before any P10.5 projection, P10.5 independently rebuilds the P10.4 report from the supplied P10.4 input.

The supplied P10.4 report must equal that deterministic rebuild exactly.

Because the P10.4 builder independently verifies P10.1→P10.2→P10.3 lineage, a valid P10.5 report remains bound to the exact certified chain.

A mismatch fails closed with:

`p10_4_experiment_integrity_mismatch`

## Metric definitions

Each metric is caller-supplied with:

- exact `metricKey`;
- exact `unit`;
- direction metadata:
  - `higher`
  - `lower`
  - `neutral`
- exact source identity/fingerprint.

Direction is metadata only.

P10.5 does not transform direction into:

- good/bad;
- favorable/unfavorable;
- success/failure;
- win/loss;
- retain/replace/rollback;
- rollout advice.

Same metric-key replay must be exact; conflicting metric definitions fail closed.

## Exact decimal contract

Expected and actual values use canonical decimal strings.

Examples accepted:

- `0`
- `10`
- `-3`
- `0.25`
- `10.125`

Examples rejected as non-canonical:

- `+1`
- `01`
- `1.0`
- `1e2`
- `-0`

P10.5 bounds precision and scale and performs subtraction with integer/BigInt decimal alignment.

It does not convert supplied decimals through floating-point arithmetic.

The only numeric derivation is:

`signed difference = actual - expected`

The only comparison relation is:

- `above_expected`
- `equal_expected`
- `below_expected`

These terms describe numeric order only.

## Expected outcome records

Each expected outcome includes:

- exact `expectationId`;
- exact metric key;
- exact target;
- exact scope;
- `window: "after"`;
- `expectedValue` as canonical decimal or `null`;
- exact source identity/fingerprint.

Targets are:

- the exact P10.4 treatment action; or
- one exact P10.4 holdout unit.

Treatment scope must match exact direct P10.2 treatment association.

Holdout scope must exactly equal the declared P10.4 holdout scope.

P10.5 does not infer missing expectations.

A null expected value means:

`expected_unavailable`

## Actual outcome records

Each actual record includes:

- exact expectation ID;
- exact metric key;
- exact target;
- exact scope;
- canonical `observedAt`;
- canonical decimal `actualValue` or `null`;
- exact source identity/fingerprint.

Metric, target and scope must bind exactly to the referenced expectation.

The timestamp must be inside the exact P10.4 treatment after window.

P10.5 does not derive a new outcome window or re-anchor observations.

Multiple actuals for one expectation are retained independently in deterministic timestamp/fingerprint order.

P10.5 does not average, select, aggregate, smooth or infer a trend from them.

## Tracking states

Expectation-level states are:

- `comparison_available`
- `expected_unavailable`
- `actual_unavailable`

Actual-level records use the same bounded state vocabulary.

When expected and actual values are both available, the record contains exact signed difference and numeric relation.

When either side is unavailable, signed difference and relation remain null.

No outcome state means success, failure, target achieved/missed, good/bad, favorable/unfavorable, winner/loser, or action recommendation.

## Upstream context

P10.5 preserves:

- exact P10.4 structural-flag count;
- exact P10.4 structural-flag fingerprints;
- exact P10.3 treatment-confounder count.

These are context only.

P10.5 does not:

- adjust expected/actual arithmetic for structural flags;
- weight or discount outcomes;
- claim a flag caused a difference;
- infer confidence from flag absence.

## Replay and determinism

P10.5:

- uses exact source identities;
- dedupes exact replay;
- fails closed on conflicting replay;
- validates canonical timestamps;
- validates canonical decimal values;
- stably sorts metric definitions, expectations and actuals;
- is invariant to caller input order;
- creates stable SHA-256 identities.

Missing values remain unavailable.

## Non-causal / non-statistical guard

P10.5 explicitly records:

- expected value is caller-supplied and is not a causal counterfactual;
- actual value is caller-supplied and does not prove action impact;
- signed difference is arithmetic only;
- above/equal/below relation is descriptive only;
- percentage change is not calculated;
- treatment-vs-holdout effect is not calculated;
- difference-in-differences is not calculated;
- trend is not inferred from multiple actuals;
- statistical significance is not calculated;
- confidence intervals are not calculated;
- causal attribution is not performed;
- recommendation is not generated;
- rollout decision is not generated.

## Safety boundary

P10.5 authorizes no:

- live outcome loading;
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
- P10.6 implementation;
- deployment;
- publication.

`PUBLIC_SITE_WRITES_ENABLED` and `AI_PROPOSAL_GENERATION_ENABLED` remain untouched.

## Next boundary

P10.6 may later define recommendation calibration/learning signals.

P10.5 does not convert outcome differences into recommendation quality, model reward, policy updates, automatic ranking changes, or autonomous mutation authority.
