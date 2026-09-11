# Task #10 — Opportunity Engine v1

## Purpose

Convert deterministic technical findings and Ranking Accelerator signals into one prioritized opportunity queue for downstream planning.

This task remains analytical only. It does not create action plans, request approvals, deploy changes, or mutate any customer website.

## Inputs

- Technical SEO findings from Task #8
- Ranking Accelerator opportunities from Task #9
- Optional page-level business context

## Scoring

V1 uses bounded deterministic scoring. Technical findings start from severity. Ranking opportunities start from the Ranking Accelerator score and confidence. Optional commercial value, conversion value, and estimated implementation cost can adjust prioritization.

The output is a prioritization signal, not a prediction or ranking guarantee.

## Output invariants

Each opportunity contains:
- site/page identity
- source and type
- priority
- bounded score and confidence
- title and rationale
- source dedupe key
- deterministic opportunity dedupe key

Identical source opportunities are deduplicated and output ordering is deterministic.

## Safety

- No CMS or storefront writes
- No content changes
- No action planning
- No autonomous execution
- No ranking guarantees
- `PUBLIC_SITE_WRITES_ENABLED=false` remains required

## Future work

Task #11 will add internal-link intelligence. Task #14 will later introduce Action Planner + Safety Engine, which is the first place opportunities may be translated into proposed actions.
