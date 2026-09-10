# Task #17 — Experiment Engine v1

## Purpose

Provide deterministic, read-only experiment design and outcome measurement so SEO ENGINE can distinguish observed change from controlled evidence before the Learning Engine consumes results.

## Scope

V1 supports:

- explicit baseline and measurement windows
- deterministic treatment/control assignment using a stable seed
- balanced alternating cohorts after stable hash ordering
- per-page baseline and measurement averages
- difference-in-differences treatment effect: treatment delta minus control delta
- minimum completed-page safeguards per cohort
- neutral/positive/negative/insufficient-data evaluation states
- deterministic evaluation dedupe keys
- persistence mappings for `experiments`, `experiment_cohorts`, and `outcomes`

## Safety and interpretation

This package does not deploy changes, mutate Shopify, or activate experiments. It only defines cohorts and evaluates supplied observations.

`positive` or `negative` means the measured difference-in-differences direction within the supplied experiment data. It is not a guarantee of causality, ranking improvement, or durable search-engine behavior. V1 confidence is a conservative sample-size signal, not a statistical p-value.

Experiments remain `pending` in persistence mappings. Lifecycle activation is owned by orchestration outside this package.

## Determinism

Cohorts are assigned by SHA-256 of a stable seed and page ID, then sorted before alternating treatment/control assignment. Reversing candidate input order therefore does not change cohort membership.

Exact evaluation identity includes site, experiment name, metric, windows, and page outcomes.

## Measurement safeguards

A page contributes only when it has at least one finite observation in both the baseline and measurement windows. A treatment effect is not emitted until both cohorts meet `minPagesPerCohort`.

## V1 boundaries

Not included:

- automatic experiment deployment
- randomization services
- sequential testing
- Bayesian inference
- causal matching across unrelated sites
- automated winner rollout
- search-ranking guarantees

Those capabilities can be added only after production measurement quality is established.

## Public write state

`PUBLIC_SITE_WRITES_ENABLED=false` remains the repository/runtime default. Task #17 adds no write path.
