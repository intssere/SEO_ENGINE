# UGP-8.3A — Content Calendar Policy Projection

## Status
IMPLEMENTATION CANDIDATE — DETERMINISTIC PLANNING ONLY / NO SCHEDULER OR PUBLICATION EXECUTION

## Purpose
UGP-8.3A establishes the first deterministic content-calendar contract.

Customer policy controls:
- articles per week;
- allowed content categories;
- blackout dates;
- review-required vs autopilot-policy mode.

Calendar candidates bind exact UGP-6.4 content-opportunity lineage plus an explicit bounded priority score, customer category, and readiness fingerprint.

## Eligible actions
Only:
- `create_candidate`;
- `refresh_candidate`

are eligible for publishing-calendar slots.

Consolidation, leave-alone, and insufficient-evidence opportunities are not silently converted into article publication work.

## Capacity
A projection spans 1–26 seven-day windows from an explicit ISO start date.

`articlesPerWeek` is bounded to 1–7. Within each week, the engine selects the earliest non-blackout dates until weekly capacity is filled.

Candidates are ordered deterministically by:
1. descending priority score;
2. opportunity fingerprint as tie-breaker.

No random ordering or current-clock dependency exists.

## Categories
Categories are customer-supplied normalized policy labels.

A candidate whose category is outside the allowlist is deferred with `category_not_allowed`.

## Blackout dates
Blackout dates remove those dates from usable publishing capacity. If policy capacity cannot be satisfied because every available date is blacked out, lower-priority eligible candidates are deferred with `capacity_exhausted`.

## Review and autopilot
`review_required` marks scheduled items as requiring review.

`autopilot_policy` records that the customer selected an autopilot policy preference, but it **does not grant publication or execution authority**.

Every scheduled item still carries:
- `publicationAuthorized: false`;
- `executionAuthorized: false`.

Actual publication remains governed by the UGP universal connector authorization boundary.

## Explicit exclusions
UGP-8.3A performs no:
- job enqueue/materialization;
- scheduler mutation;
- provider/CMS/Git call;
- publication;
- persistence;
- credential use;
- authorization creation;
- DB/schema/Railway/deployment/worker/autonomy mutation.

## Next step
A later UGP-8.3 increment can bind generated calendar items to article readiness/publication-plan lineage and eventually to the durable scheduler introduced under UGP-11. The scheduler must consume policy; it must not grant authority.
