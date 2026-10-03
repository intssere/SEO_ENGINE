# UGP-8.4B — Decay / Refresh Evidence Adapter Integration

Version: `ugp-8-4b-decay-evidence-adapter-v1`

## Purpose

UGP-8.4B translates already-acquired SEO ENGINE evidence into the provider-neutral UGP-8.4A content decay / refresh assessment contract.

This increment is deterministic and read-only. It does not acquire provider data, persist evidence, schedule work, authorize execution, publish content, or mutate customer sites.

## Supported evidence adapters

### Google Search Console page performance

The adapter consumes:

- an existing `GscSearchAnalyticsBinding`
- its corresponding existing `NormalizedSignalObservation`

The pair is accepted only when:

- the normalized observation passes deterministic fingerprint and lineage integrity checks
- source class is `first_party`
- trust class is `first_party_authoritative`
- signal type is `keyword`
- status is exact `success`
- completeness is exactly `1`
- no error or partial diagnostics exist
- the binding source and request fingerprints match the observation
- the binding has no dimensions
- the binding has exactly one filter
- that filter is `page equals <assessed page URL>`

This prevents site-wide, query-filtered, or top-row partial GSC evidence from being misrepresented as exact page performance.

The adapter emits the UGP-8.4A before/after window fields:

- start date
- end date
- clicks
- impressions
- CTR
- average position
- deterministic evidence fingerprint

UGP-8.4A remains the authority for decay thresholds and classification.

## DataForSEO SERP / ranking evidence

The adapter consumes before/after existing `SerpRankingProjection` values from the bounded DataForSEO SERP adapter.

Before mapping, it verifies the ranking projection fingerprint, ID, safety capability, and exact cross-window scope:

- same keyword
- same tracked domain
- same market
- same category
- same source
- strictly ordered observation timestamps

### Exact page ranking

An exact page rank is emitted only when the assessed URL is explicitly present in both before and after bounded SERP projections.

A page that disappears outside the requested SERP depth is **not** translated to `rank = null`.

Instead the adapter omits ranking evidence and records:

`bounded_serp_cannot_prove_page_unranked`

This avoids falsely claiming global unranking from a bounded observation depth.

### SERP material change

The adapter derives a deterministic bounded organic-SERP change signal from the top 10 organic results.

A material SERP change is recorded when either:

- at least two top-10 URL membership changes are observed, or
- a URL present in both top-10 windows moves by at least three absolute positions

The resulting change evidence is fingerprinted and passed to UGP-8.4A as corroborating `serp_change` evidence.

This remains observational and does not claim that SERP change caused traffic or ranking deterioration.

## Deliberately unavailable adapters

This increment does not manufacture evidence for contracts the repository does not currently prove exactly.

It records adapter limitations for:

- `freshness_evidence_adapter_not_available`
- `per_url_content_change_evidence_adapter_not_available`

The existing aggregate crawl-history comparison remains excluded from per-URL content-change proof.

A sitemap `lastmod` change or aggregate crawl-history delta must not be translated into `contentMateriallyChanged = true`.

## Safety semantics

UGP-8.4B is:

- deterministic
- read-only
- evidence-translation-only
- provider-acquisition disabled
- network-operation disabled
- persistence disabled
- authorization-grant disabled
- publication disabled
- execution disabled
- provider writes disabled
- public-site writes disabled

## Classification authority

UGP-8.4B does not introduce a competing decay policy.

It maps existing evidence into `ContentDecayRefreshInput` and then calls the merged UGP-8.4A:

`buildContentDecayRefreshAssessment(...)`

Therefore UGP-8.4A remains authoritative for:

- baseline impression threshold
- GSC decline thresholds
- ranking decline threshold
- stale-content threshold
- minimum evidence classes
- `refresh_candidate`
- `watch`
- `stable`
- `defer_insufficient_evidence`

## Test coverage

The bounded tests verify:

1. exact page-level GSC plus bounded DataForSEO evidence maps into a `refresh_candidate`
2. a page missing from bounded SERP depth is not falsely labeled unranked
3. GSC evidence with additional query filtering is rejected
4. tampered normalized-observation fingerprints are rejected
5. adapter output is deterministic and its final fingerprint detects tampering

## Explicit non-goals

UGP-8.4B does not:

- call Google Search Console
- call DataForSEO
- perform SERP acquisition
- perform crawl/page fetch
- persist observations or assessments
- read/write production databases
- modify schemas
- create jobs
- activate schedulers or workers
- create publication plans
- authorize publication
- execute provider writes
- execute public-site writes
- perform Railway or deployment mutations
