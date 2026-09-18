# P5.1 — SERP + Keyword Provider Selection / Cost / Reliability Review

Review date: **2026-09-18**  
Review expiry/re-check boundary: **90 days** (or earlier on material provider pricing/API/terms changes)  
Roadmap: **P5.1**  
Issue: **#218**

## Purpose

P5.1 selects engineering targets for the external SERP/keyword adapter phase without creating any executable provider integration.

This is a dated planning snapshot, not provider enrollment, procurement authorization, source-registry admission, credential authorization, or live-read authorization.

The executable contract is intentionally separate:

- P5.1 reviews candidates and chooses adapter roles.
- P5.2 may build a SERP adapter using fake/supplied transport only unless separately authorized.
- P5.3 may build a keyword adapter using fake/supplied transport only unless separately authorized.
- Task #67 external-source admission remains a separate control.
- Task #68 normalization remains authoritative for future normalized observations.
- Task #69 exact job authorization and Task #70 durable execution/replay controls remain authoritative for any future live collection.
- No provider call is allowed merely because P5.1 selected an engineering target.

## Review dimensions

Every reviewed provider carries explicit, dated evidence for:

1. SERP coverage.
2. Keyword metrics/ideas coverage.
3. Location/language targeting controls.
4. Pricing model and cost snapshot.
5. Throughput/rate-limit information.
6. Reliability/status/SLA evidence quality.
7. Credential/enrollment complexity.
8. Fit with the existing Task #67–#70 control plane.

The code does not use a hidden weighted score. Provider roles use explicit ordered policy plus hard capability/evidence gates.

## Candidate matrix

| Provider | SERP | Keyword metrics / ideas | Pricing snapshot | Reliability evidence | Initial role |
|---|---|---|---|---|---|
| DataForSEO | Yes | Yes | PAYG; reviewed SERP + keyword + Labs pricing | documented operational limits/turnaround | **Initial dual-purpose P5.2/P5.3 engineering target** |
| SerpApi | Yes | Not established as equivalent volume/metrics source in this review | monthly search-credit plans | public status page + advertised SLA up to 99.97% | **Independent SERP benchmark/fallback** |
| Google Ads API Keyword Planning | No general organic SERP surface | Yes | quota/account-governed; no normalized per-result price used by this review | documented Keyword Planning quota/refresh behavior | **Official keyword-reference candidate** |
| Ahrefs API | Yes | Yes | paid plan + API units | reviewed API limit/usage docs; no quantified uptime encoded here | Deferred broad-suite validation |
| Semrush API | Yes | Yes | separately purchased API units | reviewed API access/unit docs; no quantified uptime encoded here | Deferred broad-suite validation |

## Reviewed public facts

### DataForSEO

Reviewed public documentation indicates:

- Google Organic SERP pricing is task/page based, with different queue/live priorities.
- The reviewed cost explainer lists base pricing of **$0.0006 standard**, **$0.0012 priority**, and **$0.002 live** for the default Google Organic SERP page depth.
- Google Ads keyword-data pricing is task based and supports bulk keyword payloads; the reviewed pricing page lists **$0.06 standard** and **$0.09 live** per task for the relevant bulk Google Ads keyword-data service.
- DataForSEO Labs uses task-plus-item pricing and documents high request-rate/concurrency limits.
- DataForSEO documents a sandbox for Labs.

Sources:
- https://dataforseo.com/help-center/serp-api-cost-explained
- https://dataforseo.com/pricing/keywords-data/google-ads
- https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api
- https://docs.dataforseo.com/v3/dataforseo_labs-overview/

P5.1 conclusion: the strongest first **engineering** candidate because one vendor can cover both initial SERP and keyword adapter families with low-friction PAYG/bulk controls.

### SerpApi

Reviewed public documentation indicates:

- Plans are sold as monthly search credits.
- The reviewed pricing page lists $25/1,000, $75/5,000, $150/15,000 and higher-volume tiers.
- The provider publishes a public status page.
- The provider advertises uptime SLAs up to 99.97%.
- Search-engine/feature-specific incidents may still occur, so future adapters must model partial provider availability rather than treating vendor availability as binary.

Sources:
- https://serpapi.com/pricing
- https://serpapi.com/
- https://status.serpapi.com/

P5.1 conclusion: retain as an independent SERP benchmark/fallback candidate. P5.1 does not establish it as the primary keyword-volume source.

### Google Ads API Keyword Planning

Reviewed Google documentation indicates:

- Keyword Planning supports keyword ideas, historical metrics and forecasts.
- Historical metrics include average monthly searches, monthly volumes, competition and bid-range metrics.
- Google states historical metrics refresh monthly and recommends caching/storing results rather than repeatedly requesting unchanged data.
- Key Keyword Planning methods are limited to **1 request per second per CID**.
- Future live use requires a separately reviewed Google Ads account/developer-token/OAuth boundary and is unrelated to the already isolated GSC read-only profile.

Sources:
- https://developers.google.com/google-ads/api/docs/keyword-planning/overview
- https://developers.google.com/google-ads/api/docs/keyword-planning/generate-historical-metrics
- https://developers.google.com/google-ads/api/docs/best-practices/quotas

P5.1 conclusion: retain as the official keyword-reference candidate, but do not make it the first dual-purpose adapter because it does not supply the general organic SERP surface needed by P5.2 and has materially higher credential/account complexity.

### Ahrefs

Reviewed public documentation indicates:

- eligible paid plans expose direct API access;
- current plans include API-unit allowances;
- paid API requests use a minimum base cost of 50 units, with additional consumption depending on rows and selected fields;
- the API surface is broad enough for SERP/keyword/backlink work.

Sources:
- https://ahrefs.com/pricing
- https://docs.ahrefs.com/en/api/docs/limits-consumption

P5.1 conclusion: valuable broad-suite candidate, especially for later backlink/competitive validation, but deferred from the first adapter because subscription/unit economics add unnecessary initial cost/complexity.

### Semrush

Reviewed public documentation indicates:

- API access is metered in API units that are purchased according to need;
- example documentation prices live Domain Organic Search Keywords lines at 10 units and historical lines at 50 units;
- broad search/competitive data makes it useful for later comparison/validation.

Sources:
- https://developer.semrush.com/api/v3/get-started/api-access/
- https://developer.semrush.com/api/v3/get-started/api-units-balance/

P5.1 conclusion: deferred broad-suite candidate rather than the initial P5.2/P5.3 adapter target.

## Engineering selections

The deterministic review selects distinct roles:

- **dual-purpose engineering:** dataforseo
- **SERP benchmark/fallback:** serpapi
- **official keyword reference:** google_ads_keyword_planner
- **deferred broad-suite candidates:** ahrefs, semrush

These roles are deliberately not equivalent to "approved live providers."

## Re-review triggers

Re-run P5.1 before provider-specific live authorization if any of the following occurs:

- the 90-day review window expires;
- material pricing changes;
- endpoint/deprecation changes;
- rate-limit/throughput changes;
- major reliability incident or SLA change;
- terms/licensing/resale changes;
- credential/enrollment requirements change;
- P5.2/P5.3 require a capability not represented here;
- the target market/location/language cannot be served as modeled.

## Safety boundary

P5.1 remains pure research/planning.

The implementation hard-codes false authorization for:

- provider enrollment/purchase;
- API key/OAuth/developer-token creation or use;
- Task #67 source-registry admission;
- network collection;
- Task #70 execution;
- observation/evidence persistence;
- DB reads/writes/DDL;
- scheduler/batch/worker/retry execution;
- provider/public-site writes;
- publication.

No provider API, search engine, public competitor site, credential store, environment secret, database client, scheduler, worker, or publication path is imported or invoked by the P5.1 module.
