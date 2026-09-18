# P5.3 — Keyword Metrics + DataForSEO Adapter Foundation v1

Issue: #224

## Purpose
P5.3 defines provider-neutral keyword measurement semantics and a network-free DataForSEO Keyword Overview supplied-result adapter.

## Canonical semantics
- Search volume: approximate average monthly search demand under explicit market/network scope.
- Organic difficulty: provider-native 0–100 top-10 organic ranking difficulty; method retained; cross-provider equivalence is explicitly false.
- CPC: paid-search monetary signal in source currency/basis; no midpoint fabrication or implicit FX conversion.
- Paid competition: advertiser competition only; never treated as organic difficulty.
- Keyword metric opportunity: SEO ENGINE-derived relative 0–100 score inside a homogeneous cohort only.

Null and zero are distinct. Missing values remain null.

## Opportunity v1
Eligible keyword:
- average monthly search volume present;
- organic difficulty present;
- at least one commercial signal: CPC or paid competition.

Cohort:
- one exact measurement basis;
- at least 10 eligible unique keywords.

Components use deterministic mid-rank percentiles:
- demand = volume percentile;
- attainability = 100 - difficulty percentile;
- commercial = mean of available CPC and paid-competition percentiles.

Score:
`0.45 * demand + 0.35 * attainability + 0.20 * commercial`.

Confidence is not folded into the opportunity score.

## DataForSEO mapping
Provider reference only:
`/v3/dataforseo_labs/google/keyword_overview/live`

This is inert metadata. P5.3 implements no transport and does not authorize the provider's Live API.

Internal request bounds:
- <= 50 unique keywords;
- <= 80 characters and <= 10 words per keyword;
- exact positive location code;
- language code matching market primary language;
- Google/all-device market only;
- clickstream disabled;
- SERP expansion disabled.

Mapping:
- `keyword_info.search_volume` -> average monthly volume;
- `keyword_info.monthly_searches` -> preserved month series;
- `keyword_properties.keyword_difficulty` -> organic difficulty;
- `keyword_info.cpc` -> CPC USD, basis `dataforseo_high_top_page_bid_derived`;
- `keyword_info.competition` -> paid competition ratio;
- explicit competition index retained only if provider supplies it;
- competition level retained categorically;
- low/high top-of-page bids retained as USD bid range;
- provider-omitted requested keyword -> explicit missing-data projection, never zero.

The provider docs reviewed for this milestone describe Keyword Overview as returning CPC, paid competition, search volume/monthly searches and related keyword/SERP data, allow up to 700 keywords, and show organic `keyword_difficulty` in `keyword_properties`. P5.3 deliberately imposes a much smaller internal bound and discards all unrelated raw fields.

## Task #68
The rich P5.3 result keeps per-keyword normalized projections and cohort scores.

Task #68 receives only a bounded aggregate observation:
- requested/returned counts;
- availability counts;
- explicit zero-volume count;
- eligible/scored opportunity counts;
- mean opportunity when available.

This avoids pretending Task #68's stream identity has a per-keyword dimension it does not currently contain.

## Safety
P5.3 introduces no:
- provider enrollment/purchase;
- credentials;
- HTTP/fetch/provider SDK;
- provider request;
- Task #67 admission;
- Task #70 execution;
- observation/evidence persistence;
- DB access/mutation;
- scheduler/worker/polling/retry;
- provider/public-site writes;
- config/secret changes;
- publication.

The provider endpoint string is reference metadata only; `liveEndpointExecutionAuthorized=false`.
