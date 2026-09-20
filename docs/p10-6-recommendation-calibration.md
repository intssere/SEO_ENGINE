# P10.6 — Recommendation calibration / learning signals

## Scope

P10.6 adds deterministic, read-only **recommendation calibration and learning-signal projection** over exact certified P10.1–P10.5 lineage.

It does not learn or mutate a model.

The module is:

`artifacts/api-server/src/lib/recommendation-calibration.ts`

## Integrity boundary

P10.6 consumes:

- one supplied P10.5 `ExpectedActualOutcomeInput`;
- its supplied P10.5 `ExpectedActualOutcomeReport`;
- caller-supplied calibration definitions.

Before producing any P10.6 output it rebuilds P10.5 from the exact supplied P10.5 input.

The supplied P10.5 report must equal the deterministic rebuild exactly.

Because P10.5 rebuilds P10.4 and P10.4 verifies the earlier P10.1→P10.3 chain, P10.6 remains bound to the exact certified lineage.

A mismatch fails closed.

## Exact recommendation subject

P10.6 is bounded to the recommendation associated with the exact P10.5 treatment action.

Recommendation identity is taken only from P10.1 timeline events where:

`event.lineage.actionId === treatmentActionId`

For every same-action event, recommendation lineage must carry:

- non-null recommendation ID;
- non-null SHA-256 recommendation fingerprint.

All same-action recommendation identities must agree exactly.

P10.6 fails closed on:

- missing same-action events;
- incomplete recommendation lineage;
- conflicting recommendation IDs;
- conflicting recommendation fingerprints.

It does not infer recommendation identity from:

- opportunity identity;
- action plan;
- proposal;
- page;
- URL;
- query;
- category;
- timestamp proximity;
- timeline ordering.

## Supplied calibration definitions

Each definition includes:

- exact `calibrationKey`;
- exact recommendation ID;
- exact recommendation fingerprint;
- exact P10.5 expectation ID;
- role:
  - `primary`
  - `secondary`
  - `diagnostic`
- exact source identity/fingerprint.

The definition's recommendation must equal the exact treatment recommendation lineage.

The referenced expectation must:

- exist in the exact P10.5 report;
- target `treatment`;
- carry the exact P10.5 treatment action ID.

P10.6 v1 does not use holdout expectations as direct recommendation-calibration subjects.

A role is descriptive provenance only.

It does not create:

- weight;
- importance score;
- ranking;
- confidence;
- execution authority.

One expectation cannot be duplicated under conflicting calibration definitions.

Exact replay dedupes. Conflicting calibration-key/source/expectation replay fails closed.

## Directional learning signals

P10.6 creates one signal for each actual observation already retained by P10.5 under the referenced treatment expectation.

The bounded signal vocabulary is:

### same_as_declared_direction

Produced only when:

- metric direction is `higher` and P10.5 relation is `above_expected`; or
- metric direction is `lower` and P10.5 relation is `below_expected`.

### opposite_declared_direction

Produced only when:

- metric direction is `higher` and relation is `below_expected`; or
- metric direction is `lower` and relation is `above_expected`.

### equal_expected

Produced for a comparison-available non-neutral metric whose exact P10.5 relation is `equal_expected`.

### neutral_direction

Produced when the metric direction is `neutral` and P10.5 has an available comparison.

### unavailable

Produced when the P10.5 comparison for that actual is unavailable.

If the P10.5 expectation contains zero actual records, P10.6 produces zero synthetic signals and keeps the definition in:

`signal_unavailable`

## Definition state

A definition is:

- `signal_available` when at least one actual signal is not `unavailable`;
- `signal_unavailable` otherwise.

These are data-availability states only.

They do not mean recommendation success or failure.

## Multiple observations

Multiple P10.5 actuals remain independent P10.6 signal records.

P10.6 does not:

- select latest;
- select best/worst;
- average;
- sum;
- majority-vote;
- infer trend;
- infer confidence;
- create a win rate;
- aggregate across metrics into an overall recommendation grade.

The report may count only:

- total definitions;
- definitions with any available signal;
- definitions without an available signal;
- total per-actual signals;
- available/unavailable per-actual signals.

It does not publish directional scorecards.

## Interpretation guard

A P10.6 directional signal describes only the relationship between:

1. caller-declared metric direction; and
2. exact P10.5 actual-vs-expected arithmetic.

It does not establish that the recommendation was:

- good or bad;
- correct or incorrect;
- effective or ineffective;
- successful or unsuccessful.

It is also not:

- causal impact;
- reward;
- penalty;
- recommendation score;
- ranking weight;
- policy weight;
- training label;
- rollout advice.

## Upstream context

P10.6 preserves the exact structural context already carried by P10.5:

- P10.4 structural-flag count;
- P10.4 structural-flag fingerprints;
- P10.3 treatment-confounder count.

These values remain provenance only.

They do not weight, discount, suppress or promote directional signals.

Absence of a structural flag does not create confidence.

Presence of a structural flag does not prove a cause.

## Determinism

P10.6:

- rebuilds exact P10.5 first;
- binds exact same-action recommendation lineage;
- validates source identities and SHA-256 fingerprints;
- dedupes exact definition replay;
- fails closed on conflicting replay;
- stably sorts definitions and actual-derived signals;
- is invariant to caller definition order;
- creates stable SHA-256 report, definition and signal identities;
- preserves unavailable evidence as unavailable.

## Non-learning-update guard

P10.6 explicitly records:

- expected value is not a causal counterfactual;
- actual value does not prove recommendation impact;
- directional signal is not recommendation quality;
- directional signal is not reward or penalty;
- no reward score is calculated;
- no recommendation score is calculated;
- no recommendation rank is recalculated;
- no model parameters are updated;
- no model weights are updated;
- no policy is updated;
- no prompt/template is updated;
- no trend/confidence is inferred;
- no causal attribution is performed;
- no rollout recommendation is generated;
- no autonomous transition is generated.

## Safety boundary

P10.6 authorizes no:

- live outcome loading;
- Production/live DB read/write;
- SQL or schema mutation;
- provider/network request;
- provider credential use;
- provider/public-site write;
- recommendation persistence/update;
- model training;
- model fine-tuning;
- model weight update;
- recommendation ranking mutation;
- policy mutation;
- prompt/template mutation;
- proposal persistence;
- approval grant;
- execution authorization;
- Task #51/#53/#54 execution;
- autonomous mutation or P9.8 implementation;
- timer/scheduler/worker/retry runtime;
- automatic transition;
- route activation;
- P10.7 implementation;
- deployment;
- publication.

`PUBLIC_SITE_WRITES_ENABLED` and `AI_PROPOSAL_GENERATION_ENABLED` remain untouched.

## Next boundary

P10.7 may later define Impact workspace v2.

P10.6 does not create a UI, ranking engine, model-training loop, policy-learning loop, automatic recommendation update, or autonomous execution path.
