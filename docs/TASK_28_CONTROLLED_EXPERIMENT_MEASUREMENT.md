# Task #28 — Controlled Experiment + Measurement v1

## Purpose
Measure the first controlled Diamond Shelf optimization against comparable control pages using persisted observations, without making additional public-site changes during the measurement phase.

## Safety and trust contract

Task #28 is locked to `diamondshelf.us` and requires:

- a completed controlled deployment,
- successful post-deployment verification,
- one explicit treatment page,
- at least one distinct control page,
- non-overlapping baseline and measurement windows,
- metric observations sourced from GSC or GA4,
- public-site writes disabled during measurement.

A failed, regressed, pending, or unverified deployment cannot enter the measurement path.

## Causal-claim gate

The measurement wrapper delegates effect calculation to the existing Experiment Engine. It does not produce outcome persistence rows when the Experiment Engine reports `insufficient_data`.

Therefore:

- `blocked` means prerequisites or safety gates failed;
- `awaiting_data` means the experiment is valid but observations are insufficient;
- `measured` means treatment and control observations satisfy the configured cohort floor and an evaluable treatment effect exists.

`causalClaimAllowed=false` is retained until sufficient treatment/control evidence exists. This flag does not mean the experiment proves a universal SEO rule; it only means the configured controlled comparison is statistically eligible for interpretation under the V1 experiment model.

## Measurement model

For the initial pilot, the selected production-optimized page is explicitly assigned to the treatment cohort. Comparable pages are supplied as controls. The Experiment Engine computes baseline-to-measurement change for both cohorts and then uses difference-in-differences:

`treatment effect = treatment delta - control delta`

This helps separate the optimization effect from broad traffic movement affecting both treatment and control pages.

## Persistence

When measurement is sufficient, Task #28 produces the existing `outcomes` persistence shape with:

- experiment ID,
- page ID,
- metric,
- baseline value,
- measured value,
- delta,
- cohort,
- experiment status,
- treatment effect,
- confidence,
- evaluation dedupe key.

No outcome rows are produced from incomplete evidence.

## Important runtime boundary

Merging Task #28 does **not** mean a real Diamond Shelf experiment has already been measured. Real measurement requires a real Task #27 production action, its successful verification, a completed observation window, and real GSC/GA4 observations.

No production write is performed by this package.

## Exit criteria

- CI passes on the exact PR head.
- No live write is executed.
- Insufficient data cannot be represented as measured impact.
- Failed/regressed deployments cannot be measured as successful experiments.
- Treatment/control provenance is retained.
