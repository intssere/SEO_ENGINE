# Task #66 — Market-Aware Category Competitor, Trend & Keyword Intelligence Architecture v1

## Purpose

Task #66 defines the migration-free, deterministic control-plane contract that turns the proven one-target competitor pilot foundation into a future market-aware intelligence system.

The central design rule is:

> Competitor relevance, keyword demand, trend state, and SEO/GEO/AIO opportunities are scoped by **market × Diamond Shelf category × keyword/topic intent**, never by one global competitor list.

Task #66 is intentionally pure. It does not collect external data, persist new evidence, register targets, create schedules, call providers, mutate Diamond Shelf, or authorize execution.

## Architecture graph

```text
MarketProfile
   │
   ├── CategoryProfile
   │       │
   │       └── MarketCategoryScope
   │               │
   │               ├── KeywordCluster
   │               │       │
   │               │       └── SignalSnapshot(s)
   │               │             ├── first-party
   │               │             └── approved external
   │               │
   │               ├── CompetitorRelation(s)
   │               │       └── Task #60 candidate fingerprint
   │               │
   │               └── TrendAnalysis
   │
   └──────────────────────────────> KeywordOpportunity
                                      │
                                      └── advisory/planning only
```

Task #60 remains the canonical bounded candidate-normalization/discovery planner. Task #66 does not replace it. Task #66 adds the missing market/category/keyword/trend context around Task #60 candidate fingerprints.

## 1. Market profile

A market is explicit, not inferred from the competitor domain or the operator's location.

A market profile contains:

- ISO-style two-letter country code
- optional region
- language
- search engine
- locale
- optional currency
- device segment (`all`, `desktop`, `mobile`, `tablet`)

Changing any selected-market dimension changes the market fingerprint and `marketId`.

This prevents evidence collected for, for example, U.S. English mobile search from silently blending with U.K. English desktop search.

## 2. Category profile

A category profile represents one Diamond Shelf taxonomy node and contains:

- stable category key
- display name
- canonical collection/path where applicable
- optional parent key
- labels
- intent/topic hints

The **category identity** is derived from the stable key plus canonical path. Descriptive changes such as labels or intent topics change the category fingerprint but do not silently create a different taxonomy identity.

## 3. Market-category scope

`MarketCategoryScope` binds one exact market identity to one exact Diamond Shelf category identity.

It has two deterministic concepts:

- `scopeId` — stable identity from `marketId + categoryId`
- scope fingerprint — also binds the current market/category descriptor fingerprints

This permits descriptive revisions while still detecting that the context used to compute a prior score has changed.

## 4. Keyword clusters

Keyword/query terms are not modeled as isolated strings. They are grouped into deterministic clusters bound to one market and one category.

Each cluster contains:

- cluster name
- normalized/deduplicated terms
- search intent:
  - informational
  - commercial
  - transactional
  - navigational
  - local
  - mixed
- brand scope:
  - brand
  - non-brand
  - mixed

Intent is part of the fingerprint. A commercial cluster and a transactional cluster containing the same terms are intentionally different intelligence objects.

## 5. Competitor relation graph

A competitor is not globally "a competitor." A Task #60 candidate becomes a **relation** to one market/category scope.

Relation identity is bound to:

- Task #60 candidate fingerprint
- market ID
- category ID

The same retailer may therefore rank highly for Arabian Fragrance in the U.S. but poorly for Candles, Makeup, or another market.

### Relevance score

Task #66 v1 scores category/market relevance on a 0–100 scale:

| Dimension | Weight |
|---|---:|
| Category overlap | 25 |
| Keyword/topic overlap | 20 |
| Market fit | 15 |
| Assortment overlap | 15 |
| Page-type fit | 10 |
| Freshness | 5 |
| Evidence coverage | 5 |
| Source confidence | 5 |

A relation may be `recommendedForAdmission` only when:

1. human/manual review decision is explicitly `approved`, and
2. total relevance score is at least 60.

Even then, Task #66 sets `targetRegistrationAuthorized=false`. Recommendation is not registration and does not invoke Task #61 or Task #64.

## 6. Signal provenance

Every signal has an explicit source classification:

### First-party

Examples include approved Diamond Shelf-owned sources such as:

- Google Search Console query/page performance
- Google Analytics where attribution is valid
- Shopify/catalog/taxonomy observations
- internal site-crawl/indexation evidence

First-party does not mean automatically actionable; it means the signal belongs to Diamond Shelf's own evidence domain.

### External

Examples may eventually include approved sources for:

- search/trend demand
- SERP observations
- competitor observations
- AI/GEO citation visibility
- backlink/citation signals

An external source is synthesis-eligible only after explicit source approval in a later source-enrollment task. Task #66 itself enrolls no external provider and changes no credential or OAuth scope.

Unapproved external data is excluded from opportunity synthesis rather than assigned a lower weight.

## 7. Signal snapshots and deterministic lineage

A signal snapshot is bound to:

- source fingerprint
- signal kind
- market ID
- category ID
- optional keyword-cluster ID
- optional competitor fingerprint
- observation timestamp
- freshness window
- normalized numeric metrics

Its fingerprint changes whenever any lineage or metric field changes.

Task #66 stores nothing. The snapshot contract is an in-memory/pure representation for later persistence work.

## 8. Freshness

Every snapshot carries `observedAt` and `validForHours`.

At synthesis time:

- fresh signals are eligible if their source is eligible
- stale signals are excluded
- stale exclusions are surfaced diagnostically
- future timestamps beyond a five-minute clock tolerance fail closed

Freshness windows are source-specific inputs. Task #66 does not claim that one universal TTL fits GSC, trend, competitor, SERP, or AI/GEO evidence.

## 9. Trend intelligence

Task #66 provides a deterministic trend-series analyzer for one exact:

`market × category × cluster × source × signal-kind × metric`

Mixed scopes fail closed.

A series must have at least three fresh, eligible samples to be classified beyond `insufficient`.

V1 computes:

- current value
- previous value
- baseline average before current
- short-period percentage change
- baseline percentage change
- bounded momentum index

V1 classifications:

- `breakout`: short change >= 50% and baseline change >= 30%
- `rising`: short change >= 10% and baseline change >= 5%
- `declining`: short change <= -10% and baseline change <= -5%
- `stable`: enough samples but no threshold crossed
- `insufficient`: fewer than three usable samples

These thresholds are deterministic planning semantics, not claims about universal consumer-market behavior. Later measurement tasks may calibrate them with production evidence.

Seasonality is a future extension of the same timestamped-series model; Task #66 establishes the lineage needed for seasonal baselines but does not fabricate seasonality from insufficient history.

## 10. Keyword opportunity synthesis

Task #66 defines a bounded advisory opportunity score from normalized 0–100 evidence dimensions.

### V1 dimensions

| Dimension | Weight |
|---|---:|
| First-party performance gap | 30% |
| Demand | 20% |
| Positive trend momentum | 15% |
| Competitor gap | 20% |
| SERP/GEO gap | 10% |
| Strategic category fit | 5% |

Metric contract names used by the pure synthesizer are:

- `performance-gap-index`
- `demand-index`
- `trend-momentum-index`
- `competitor-gap-index`
- `serp-gap-index`
- `geo-gap-index`
- `strategic-fit-index`

These are normalized evidence inputs. Task #66 does not prescribe which external vendor must produce them.

### Evidence classes

- `corroborated` — at least one fresh first-party signal plus at least one fresh approved external signal, with at least two distinct source types
- `first_party_only` — first-party evidence without external corroboration
- `exploratory_external_only` — approved external evidence without first-party support
- `insufficient` — no eligible current evidence

Only `corroborated` becomes `planningReady=true` in Task #66.

Crucially, **planning-ready is not action-ready**.

Every Task #66 opportunity remains:

- advisory only
- `actionEligible=false`
- `automaticTransition=false`
- `publicSiteWrites=false`
- `providerWrites=false`
- `executionAuthorized=false`

The blocker `task66_does_not_authorize_execution` is always retained.

Raw search volume or trend demand by itself can therefore never authorize an SEO change.

## 11. Market isolation rules

The synthesizer fails closed if signals from different markets or categories are mixed into one opportunity.

A signal tied to another keyword cluster also fails closed unless it is intentionally category-level with no cluster binding.

Cross-market reporting may be added later, but it must be an explicit aggregation layer. It must never silently reuse U.S. evidence as evidence for another selected market.

## 12. Relationship to Tasks #51–#65

Task #66 is upstream intelligence only.

The intended eventual flow is:

```text
Task #66 market/category intelligence
        │
        v
future evidence-backed opportunity adapter
        │
        v
existing proposal / quality gates
        │
        v
Task #51 exact internal authorization
        │
        v
Task #52 connector mechanics
        │
        ├── Task #53 reversible pilot
        └── Task #54 verified persistent apply
        │
        v
Task #57 measurement / attribution
```

Task #66 does not weaken or bypass any existing authorization layer.

## 13. Future continuous intelligence loop

The product direction is:

1. observe selected markets
2. refresh first-party and approved external signals
3. discover and re-score competitors per category/market
4. normalize timestamped evidence
5. detect keyword, content, taxonomy, SERP, entity, GEO/AIO, and citation gaps
6. create ranked evidence-backed opportunities
7. generate bounded proposals
8. obtain human/policy authorization where required
9. execute only through controlled connectors
10. measure impact
11. retain, adjust, or rollback as supported by the controlled execution policy
12. re-score the category/market graph

Continuous observation does not imply continuous autonomous mutation.

## 14. Explicit Task #66 non-capabilities

Task #66 v1 implements no:

- HTTP/DNS/robots/SERP competitor acquisition
- recurring competitor crawl
- Google Trends or keyword-provider API call
- source credential enrollment
- database table or migration
- evidence persistence
- competitor target registration
- competitor target activation/config mutation
- Task #64 gate enablement or execution
- scheduler
- batch runner
- retry loop
- autonomous worker
- AI proposal generation enablement
- provider write
- public-site write
- Task #53/#54 execution
- automatic opportunity-to-proposal or approval-to-execution transition

All of those require later dedicated tasks and, where applicable, explicit user authorization.

## 15. Staged path after Task #66

Recommended later stages remain separate so safety can be reviewed at each boundary:

1. **Source-adapter design** — define which first-party/external providers are approved for which market signals; no scheduler.
2. **Persistence design/migration** — schema for market/category/cluster/source/snapshot/relation history; production DDL separately authorized.
3. **Read-only ingestion pilots** — bounded source-specific live reads with provenance and freshness certification.
4. **Category competitor refresh** — bounded discovery/re-scoring, still review-controlled for target admission.
5. **Trend/keyword recurring observation** — scheduler/worker only after cadence, quotas, failure behavior, and cost limits are separately approved.
6. **Opportunity adapter** — map corroborated Task #66 intelligence into the existing opportunity engine without automatic execution.
7. **Measured optimization loop** — controlled proposals/actions through Tasks #51–#54 and Task #57 measurement.

This staged design supports the user's end goal of broad automation while preserving the proven principle that observation, reasoning, authorization, execution, and measurement remain distinct control planes.
