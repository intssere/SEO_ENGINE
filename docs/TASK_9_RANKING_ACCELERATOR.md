# Task #9 — Ranking Accelerator v1

## Purpose
Convert read-only search-performance metrics into prioritized ranking opportunities without making ranking guarantees or writing to customer sites.

## V1 opportunity classes
- `striking_distance`: queries currently ranking from positions 4–20.
- `ctr_underperformance`: impression-bearing queries whose observed CTR materially trails a conservative position-based reference curve.
- `ranking_decay`: query/page pairs whose recent weighted average position deteriorates versus the earlier half of the observed period.
- `protect_winner`: high-impression query/page pairs ranking in positions 1–5.

## Scoring
V1 uses deterministic heuristics based on impression scale, ranking proximity, CTR deficit, and observed position change. Scores prioritize review; they are not predicted ranking lifts.

## Safety boundary
This package is analytical only. It does not edit content, metadata, links, URLs, schema, redirects, Shopify resources, or any public website. `PUBLIC_SITE_WRITES_ENABLED=false` remains the project-wide gate.

## Future extensions
Commercial value, GA4 conversion/revenue weighting, technical-health penalties, internal authority gaps, content/entity gaps, SERP competitor deltas, cannibalization and experiment-derived priors belong in later tasks.
