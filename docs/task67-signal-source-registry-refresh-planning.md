# Task #67 — Market/Category Signal Source Registry & Refresh Planning Foundation v1

## Purpose

Task #67 defines a pure, deterministic registry and refresh-planning layer on top of Task #66. It answers two questions without performing collection:

1. Which reviewed sources are eligible for a given market, category, and signal type?
2. Given supplied observation timestamps and a bounded budget, which eligible signals should be refreshed first?

This task does not contact any provider, competitor, search engine, or external service.

## Source descriptor

Each source descriptor has deterministic identity derived from:

- stable source key and display name
- source class: `first_party` or `external`
- supported Task #66 signal types
- market scope or explicit market wildcard
- category scope or explicit category wildcard
- trust class
- quality score
- provenance completeness
- freshness policy
- descriptive collection mode
- manual review state

The descriptor identity is a SHA-256 fingerprint. The short `src-<24hex>` ID is only a readable handle.

## Scope rules

A source is eligible for a need only when all required conditions hold:

- requested signal type is supported
- requested market is in scope or the source explicitly allows any market
- requested category is in scope or the source explicitly allows any category
- external sources are manually reviewed
- provenance is complete

Eligibility never means collection authorization.

## Source classes

### First-party

Examples of future descriptors:

- Google Search Console query/page evidence
- approved analytics evidence
- Diamond Shelf catalog/category state
- internal search evidence if available and approved

First-party sources may use broad market/category scope where semantically appropriate, but their evidence still becomes market/category-bound when normalized by Task #66.

### External

Examples of future descriptors:

- reviewed competitor observations
- approved keyword/trend provider
- approved SERP source
- GEO/AIO visibility source
- approved backlink/citation source

External source descriptors require manual review in v1.

## Freshness model

Freshness is source-specific. A descriptor defines:

- `freshForMinutes`
- `staleAfterMinutes`
- `criticalAfterMinutes`
- volatility class: `low | medium | high | very_high`

Supplied observation timestamps are classified as:

- `missing`
- `fresh`
- `stale`
- `critical`

Future tasks may refine the exact interpretation of the `freshForMinutes` advisory window, but Task #67 planning uses the stale and critical thresholds as hard refresh-state boundaries.

## Urgency

Refresh urgency is deterministic and based on freshness state plus volatility.

Base urgency:

- fresh: 0
- stale: 40
- critical: 70
- missing: 80

Volatility boost:

- low: +0
- medium: +5
- high: +10
- very high: +15

This makes equally stale fast-moving trend/SERP signals rank above slow-moving structural sources.

Quality and trust are tie-breaking/scoring inputs after urgency. First-party sources receive a small deterministic preference where otherwise comparable.

## Refresh planning

A refresh plan requires:

- Task #66 market identity
- Task #66 category identity
- requested signal types
- registry descriptors
- supplied observation state (optional)
- explicit planning timestamp
- hard budget

The planner:

1. validates and deduplicates descriptors
2. evaluates eligibility for each requested signal type
3. classifies supplied freshness
4. computes deterministic urgency/quality score
5. sorts candidates deterministically
6. selects items while respecting hard budgets
7. defers excess items
8. emits explicit unsupported-coverage blockers
9. fingerprints the complete plan

No job, task, scheduler event, API request, or DB row is created.

## Bounded budgets

Task #67 supports hard planning bounds:

- max sources per plan: 1–50
- max signal types per source: 1–8
- max total refresh items: 1–200

The planner can produce deferred work when candidates exceed those limits. These limits are planning constraints only and do not create a batch executor.

## Fail-closed behavior

The pure planner rejects:

- malformed source keys/scopes
- invalid source quality
- invalid freshness thresholds
- invalid timestamps or future observation timestamps
- duplicate source descriptors
- duplicate observation state for the same source/signal
- invalid planning budgets

Unsupported coverage is represented explicitly as a blocker rather than silently ignored.

## Safety contract

Task #67 capability is permanently inert in v1:

- registry planning only: true
- network collection authorized: false
- provider enrollment authorized: false
- credential mutation authorized: false
- evidence persistence authorized: false
- target configuration mutation authorized: false
- scheduler: false
- batch: false
- autonomous worker: false
- retry loop: false
- provider writes: false
- public-site writes: false
- automatic transition: false
- schema mutation required: false

## Relationship to Task #66

Task #66 defines **what a market/category/signal/opportunity is**.

Task #67 defines **which reviewed sources could satisfy a market/category signal need and when supplied evidence would be due for refresh**.

Neither task performs collection.

## Long-term direction

A later, separately authorized task can use this registry as input to a controlled acquisition layer. Before that happens, we still need explicit decisions for:

- source/provider enrollment
- credentials/OAuth if applicable
- terms/rate limits/cost controls
- persistence schema and retention
- scheduler frequency and concurrency
- collection authorization gates
- failure/backoff behavior
- per-market legal/policy constraints where relevant

Those concerns are intentionally outside Task #67.
