# Task #66 — Market-Aware Category Competitor, Trend & Keyword Intelligence Architecture v1

## Purpose

Task #66 defines the control-plane model for turning SEO ENGINE from a single-target competitor pilot into category-by-category, market-specific SEO/GEO/AIO intelligence.

This task is deliberately **architecture + pure planning/scoring only**. It does not enable recurring collection, persistence, schedulers, workers, target activation, provider writes, public-site writes, or autonomous mutation.

## Core graph

```text
MarketProfile
   │
   ├── CategoryContext
   │      │
   │      ├── CategoryCompetitorRelation(s)
   │      │       └── reviewed competitor target(s)
   │      │
   │      ├── FirstParty SignalSnapshot(s)
   │      │       ├── GSC queries/pages
   │      │       ├── analytics/conversion signals
   │      │       └── Diamond Shelf catalog/category state
   │      │
   │      └── External SignalSnapshot(s)
   │              ├── competitor observations
   │              ├── market/trend signals
   │              ├── SERP/entity signals
   │              ├── GEO/AIO visibility
   │              └── backlink/citation signals from approved sources
   │
   └── Opportunity synthesis
          ├── first-party support
          ├── external corroboration
          ├── competitor gap
          ├── trend velocity
          ├── intent fit
          └── confidence
                 │
                 └── advisory opportunity only
                        └── future Tasks #51–#54 controlled execution path
```

## Market identity

A market is explicit and fingerprinted. It is not inferred from the competitor domain.

Required dimensions:

- country code
- language / locale
- search engine
- search locale when applicable
- currency when applicable
- device segment when applicable

Example:

```text
US / en-US / Google / en-US / USD / all devices
```

Changing any material market dimension creates a different market fingerprint. Evidence from different market fingerprints must never be blended unless a later aggregation contract explicitly defines how and why.

## Category identity

A category has a stable logical key, display name, and optional taxonomy path.

Examples:

- `arabian-fragrance`
- `designer-fragrance`
- `unisex-fragrance`
- `candles`
- future `makeup`

A competitor can therefore be highly relevant for `arabian-fragrance` in the U.S. but weak or irrelevant for another category or market.

## Category-specific competitor relation

Competitor admission is scoped to a category + market pair.

The relevance score uses bounded dimensions:

- category match — 30 points
- keyword/query overlap — 25 points
- page-type match — 15 points
- entity/structured-topic overlap — 10 points
- market match — 10 points
- freshness — 10 points

Admission remains blocked when:

- manual review has not occurred
- market relevance is too low
- category relevance is too low

This scoring is advisory. A high score does not activate a target and does not authorize collection.

## Signal snapshots

Every signal snapshot is bound to:

- source class: `first_party` or `external`
- named source
- signal type
- observation timestamp
- market fingerprint
- category fingerprint
- normalized terms
- numeric metrics
- bounded provenance metadata

Supported architectural signal types include:

- keyword
- trend
- SERP
- entity
- competitor
- analytics
- catalog
- GEO/AIO

Snapshot identity is deterministic and changes when source class, market, category, timestamp, terms, metrics, or provenance changes.

### First-party signals

Examples:

- Google Search Console impressions/clicks/CTR/position
- analytics sessions/conversions/revenue where attribution is valid
- Diamond Shelf product/category/brand availability
- internal search behavior when available and approved

### External signals

Examples:

- reviewed competitor observations
- approved market/search-demand sources
- trend observations
- SERP result/entity observations
- AI answer/citation visibility
- backlinks/citations from approved sources

First-party and external signals are never silently merged into one undifferentiated metric.

## Freshness and provenance

Future persisted signals should retain source lineage and observed timestamps. Recommended freshness is source-specific rather than universal:

- fast-moving trend/SERP signals: short freshness windows
- category/competitor taxonomy observations: moderate freshness windows
- static entity/taxonomy facts: longer windows where appropriate
- first-party performance: bounded reporting windows with explicit start/end dates

Task #66 v1 fingerprints the observed timestamp and provenance but does not persist data or enforce runtime refresh schedules.

## Trend intelligence direction

The trend layer must model **change**, not merely popularity.

Future metrics should support:

- velocity
- acceleration/deceleration
- breakout terms
- seasonality
- rising/declining brands
- rising/declining products/topics
- persistence vs short-lived spikes
- market/category segmentation

A high raw search-volume number by itself is not sufficient evidence for action.

## Keyword intelligence direction

Keyword/query intelligence is category- and market-bound and should preserve intent.

Future clusters may include:

- transactional
- commercial investigation
- informational
- navigational / brand
- product/entity-specific

The system should eventually detect:

- keyword/content gaps
- competitor coverage gaps
- emerging query clusters
- declining terms
- brand vs non-brand mix
- cannibalization risk
- category-page vs product-page intent mismatch
- SERP feature/entity opportunities

## Opportunity synthesis contract

Task #66 v1 exposes a pure synthesis score with these dimensions:

- first-party support — 30
- external support — 15
- competitor gap — 20
- trend velocity — 15
- intent fit — 10
- confidence — 10

A synthesized opportunity is always `advisory` or `blocked`.

It is blocked when, at minimum:

- raw search volume is the only evidence
- evidence support is insufficient
- confidence is too low

Even an advisory opportunity has:

- `automaticTransition=false`
- `executionAuthorized=false`
- `persistenceAuthorized=false`
- `publicSiteWrites=false`
- `providerWrites=false`

Any later site action must pass through the existing proposal, approval, execution, verification, rollback, and measurement controls from Tasks #51–#54.

## Deterministic identity rules

Task #66 v1 defines deterministic SHA-256 fingerprints for:

1. market profile
2. category context
3. signal snapshot
4. synthesized opportunity

IDs use short fingerprint prefixes only as human-readable handles; the full fingerprint remains the integrity identity.

Canonicalization includes normalized casing, sorted list values, sorted metric/provenance keys, and ISO timestamps.

## Continuous-loop target architecture

The long-term loop is:

1. observe selected markets
2. refresh first-party and approved external signals
3. discover/re-score category competitors
4. normalize evidence
5. detect category/keyword/trend/SERP/entity gaps
6. synthesize and rank opportunities
7. generate bounded proposals
8. apply human/policy authorization as required
9. execute through controlled connectors
10. verify and measure
11. retain, adjust, or rollback
12. feed measured outcomes back into future ranking

The observation loop may eventually become autonomous. The mutation loop must remain separately gated and auditable.

## Explicit Task #66 v1 safety boundary

Task #66 does **not** authorize or implement:

- competitor DNS/HTTP/robots/SERP collection
- Task #64 execution
- evidence persistence
- active target configuration
- scheduler/batch/worker/retry-loop activation
- production schema migration/DDL
- provider writes
- Diamond Shelf public-site writes
- automatic approval → execution transition
- secret/config/OAuth changes

The first real Triple Traders pilot remains a completed proof of the bounded transport/execution chain, not standing authorization for recurring collection.
