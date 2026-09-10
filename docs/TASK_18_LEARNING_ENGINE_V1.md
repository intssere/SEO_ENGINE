# Task #18 — Learning Engine v1

## Purpose
Convert verified deployment outcomes and controlled experiment results into bounded learning signals that may influence future prioritization confidence. This task does not execute changes, rewrite search policies, or enable public-site writes.

## Inputs
- Experiment outcomes from Task #17: status, treatment effect, relative effect, confidence, deterministic evaluation key.
- Verification outcomes from Task #16: verified, failed, or regressed state with deterministic verification key.

## Core rules
1. Learning changes weights, not authoritative search rules.
2. Official policy authority remains owned by Search Intelligence and cannot be overridden by experiment outcomes.
3. `insufficient_data` experiment results produce zero-confidence learning and are excluded from aggregation.
4. Effects are bounded to [-1, 1].
5. Learned prioritization multipliers are bounded to [0.8, 1.2].
6. One observation never changes a downstream score; at least two observations and minimum aggregate confidence are required.
7. Repeated consistent evidence increases confidence gradually using conservative shrinkage.
8. Positive/negative contradictions reduce aggregate confidence.
9. Verification regressions produce stronger negative reliability evidence than ordinary failures.
10. Exact source signals are deduplicated deterministically.

## Persistence
`toLearningSignalInsert()` maps signals into the existing `learning_signals` table using:
- `site_id`
- optional `experiment_id`
- `signal_type`
- `metric`
- bounded `value`
- bounded `confidence`
- traceable JSON context
- `observed_at`

## Safety boundary
- No Shopify/CMS mutations.
- No deployment execution.
- No automatic policy-pack edits.
- No automatic promotion of observations into ranking-factor claims.
- No autonomous winner rollout.
- `PUBLIC_SITE_WRITES_ENABLED=false` remains unchanged.

## V1 limitations
The confidence calculation is a conservative operational signal, not a statistical p-value or causal proof. More advanced hierarchical/Bayesian learning and cross-site anonymized cohort models are deferred until sufficient production data exists.
