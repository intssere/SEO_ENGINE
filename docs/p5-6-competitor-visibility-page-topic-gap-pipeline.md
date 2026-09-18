# P5.6 — Competitor Visibility, Page-Gap + Topic-Gap Operational Pipeline v1

Issue: #234

## Purpose

P5.6 creates the first deterministic operational competitor-intelligence report over already-normalized supplied artifacts.

It composes:

- Task #58 competitor structural page evidence;
- Task #66 market/category identity;
- P5.2 SERP/ranking projections;
- P5.3 keyword metric projections;
- P5.4 request-frame trend projections;
- P5.5 backlink/link-gap bundles.

P5.6 performs no collection, persistence, target registration, source admission, Task #64 execution, Task #70 execution, provider request, scheduler/worker action, database operation, or publication.

The pipeline is descriptive only. It does not rank competitors, score opportunities, recommend actions, or infer causality.

## Canonical implementation

- `artifacts/api-server/src/lib/competitor-visibility-gap-pipeline.ts`
- `artifacts/api-server/src/lib/competitor-visibility-gap-pipeline.test.ts`

Version:

`p5.6-competitor-visibility-gap-pipeline-v1`

## Operational input

The pipeline requires:

- exact Task #66 `MarketProfile`;
- exact Task #66 `CategoryContext`;
- explicit deterministic `referenceTime`;
- owned domain;
- supplied owned semantic signals;
- 1–10 explicit competitor domains with `manuallyReviewed=true`.

Optional supplied normalized artifact families:

- P5.2 `SerpRankingProjection[]`;
- P5.3 `KeywordMetricProjection[]`;
- P5.4 `TrendProjection[]`;
- Task #58 `CompetitorEvidenceEnvelope[]`;
- one P5.5 `BacklinkFixtureBundle`.

No raw provider payload is accepted by the P5.6 contract.

## Reporting identity

### Visibility-domain key

Task #58 and P5.2 already treat a leading `www.` as equivalent for search/competitor identity, while P5.5 deliberately preserves exact hosts.

P5.6 therefore defines a reporting-only target key:

1. canonical P5.5 domain normalization;
2. NFKC/trim/lowercase/IDN-to-ASCII;
3. remove one leading `www.`;
4. preserve every other subdomain.

Examples:

- `www.example.test` -> `example.test`
- `blog.example.test` -> `blog.example.test`

This reporting alias is used only for owned/competitor target joins.

It does not rewrite or merge P5.5 referring-domain identities.

### Visibility-page key

Task #58 page evidence is joined to supplied P5.2 organic results using a reporting page key:

- absolute HTTP(S);
- visibility-domain key;
- scheme ignored;
- query ignored;
- fragment ignored;
- non-root trailing slash ignored;
- path case retained.

This is not a claim about an HTML canonical tag or redirect target.

### Topic key

Topics use exact normalized keyword identity only:

- NFKC;
- trim;
- collapsed whitespace;
- lowercase.

P5.6 performs no stemming, synonym expansion, fuzzy matching, embedding lookup, or semantic inference.

## Reviewed competitor cohort

Competitors are normalized, deduplicated and sorted by reporting-domain key.

The owned target cannot be a competitor.

Every competitor must explicitly carry:

`manuallyReviewed=true`

Task #58 page evidence belonging to a domain outside that reviewed cohort fails closed.

SERP results may contain unrelated domains, but P5.6 reports only:

- the owned target;
- reviewed competitors.

## Lineage constraints

All P5.2/P5.3/P5.4/P5.5 artifacts must match the P5.6 market/category fingerprints.

Every supplied observation timestamp must be at or before `referenceTime`.

P5.6 allows at most:

- one SERP projection per exact topic;
- one keyword-metric projection per exact topic;
- one trend frame containing any given exact topic.

The trend rule is deliberate: P5.4 Explore-style 0–100 values are request-frame-relative and explicitly not cross-frame comparable.

If a P5.5 bundle is supplied:

- market/category must match;
- its reference time must equal the P5.6 reference time;
- its owned target must match;
- its competitor target cohort must exactly match after reporting-domain normalization;
- every P5.5 gap candidate must expose that same competitor cohort.

## Competitor visibility rows

One row is emitted per reviewed competitor, sorted by domain.

Fields include:

- observed SERP topic count;
- visible-topic count;
- top-10 visible-topic count;
- top-20 visible-topic count;
- best observed rank;
- observed-topic visibility ratio;
- competitor-only visible-topic count;
- shared owned+competitor visible-topic count;
- supplied page-evidence count;
- supplied page-evidence rows appearing in SERPs;
- page-evidence rows containing semantic differences;
- P5.5 competitor authority view when available;
- referring-domain gap count;
- referring-domain shared-coverage count.

### Visibility ratio semantics

`observedTopicVisibilityRatio` is:

`reviewed competitor visible supplied SERP topics / total supplied SERP topics`

It is not:

- market share;
- estimated traffic share;
- search-volume-weighted visibility;
- a forecast;
- an overall competitor score.

P5.6 never sorts competitors by this ratio or declares a winner.

## Page semantic-gap rows

Task #58 competitor evidence is first validated and deterministically deduplicated by its existing fingerprint.

Each page row includes:

- competitor domain;
- source URL;
- reporting page key;
- page type;
- observation time;
- confidence;
- Task #58 evidence fingerprint;
- semantic differences;
- total semantic-difference count;
- supplied SERP topic appearances;
- best observed organic rank.

Semantic difference dimensions exactly mirror Task #58:

- keyword themes;
- taxonomy labels;
- schema types;
- entity types;
- internal-link patterns.

The comparison is set difference:

`competitor structural term - supplied owned structural term`

A difference is descriptive evidence only. It does not establish:

- a missing owned page;
- superior competitor content;
- a requirement to copy a competitor;
- an SEO recommendation.

## Topic-gap rows

The deterministic topic universe is the union of:

- P5.2 SERP keywords;
- P5.3 keyword metric keywords;
- P5.4 trend summary keywords;
- Task #58 competitor page keyword themes;
- supplied owned keyword themes.

Per topic, P5.6 derives:

- owned semantic presence;
- reviewed competitor semantic-presence domains;
- SERP measurement availability;
- owned SERP presence and best rank;
- reviewed competitor SERP presence and best rank;
- keyword metric context when available;
- request-frame trend context when available.

### SERP states

- `owned_only`
- `shared`
- `competitor_only`
- `neither`
- `unmeasured`

### Semantic states

- `owned_only`
- `shared`
- `competitor_only`
- `neither`

`topicGapObserved=true` only when the exact supplied evidence shows either:

- SERP state = `competitor_only`; or
- semantic state = `competitor_only`.

That flag remains descriptive and does not become a P6 opportunity score.

## Keyword context

When an exact P5.3 projection exists, P5.6 carries forward:

- average monthly search volume;
- organic difficulty;
- CPC amount/currency/basis;
- paid competition ratio/index/level;
- projection fingerprint.

Organic difficulty retains:

`crossProviderComparable=false`

P5.6 does not use the P5.3 cohort opportunity score.

## Trend context

When an exact P5.4 topic summary exists, P5.6 carries forward:

- projection fingerprint;
- frame fingerprint;
- latest relative index;
- signed velocity;
- coverage ratio;
- direction.

The report explicitly retains:

- `crossFrameComparable=false`;
- `absoluteSearchVolume=false`;
- `zeroMeansInsufficientData=true`.

P5.6 never merges or compares the numeric relative index across different trend frames.

## Backlink context

When a P5.5 bundle exists, P5.6 only re-projects already-normalized P5.5 state.

Per competitor authority retains:

- provider key;
- provider method;
- metric name;
- metric min/max;
- value or null;
- `crossProviderComparable=false`.

Link rows retain the P5.5:

- referring-domain identity;
- owned presence;
- competitor presence vector;
- coverage ratio;
- authority;
- freshness;
- classification.

P5.6 does not:

- recompute authority;
- average provider-native authority;
- merge referring domains;
- change link-gap class;
- infer link quality;
- infer outreach suitability.

## Missing-data honesty

Artifact families are optional because P5.6 must support partial operational views without inventing evidence.

Diagnostics include:

- `serp_visibility_unavailable`;
- `keyword_metrics_unavailable`;
- `trend_context_unavailable`;
- `competitor_page_evidence_unavailable`;
- `backlink_context_unavailable`;
- `owned_keyword_themes_unavailable`.

A missing artifact remains unavailable; it is not converted into positive or negative evidence.

## Determinism

The report fingerprint is invariant to irrelevant input ordering.

The pipeline canonicalizes:

- reviewed competitors;
- supplied semantic arrays;
- SERP topic map;
- keyword metric topic map;
- trend topic map;
- Task #58 deduplicated page evidence;
- page rows;
- topic rows;
- P5.5 link rows;
- lineage fingerprint arrays;
- diagnostics.

The report ID is derived from the report fingerprint.

## Bounded input

Hard limits:

- reviewed competitors: 10;
- SERP projections: 500;
- keyword projections: 500;
- trend frames: 100;
- competitor page evidence rows: 1,000;
- topic universe: 2,000.

Inputs outside these bounds fail closed.

## Safety

`competitorVisibilityGapPipelineCapability()` hard-codes:

- pure composition only;
- supplied normalized artifacts only;
- manual review required;
- exact keyword joins only;
- descriptive only;
- opportunity scoring absent;
- competitor ranking absent;
- live collection false;
- provider enrollment/purchase false;
- credential creation/use false;
- Task #67 source admission false;
- target registration/config mutation false;
- Task #64 execution false;
- Task #70 execution false;
- observation/evidence persistence false;
- DB reads/writes/schema mutation false;
- scheduler/batch/worker/retry false;
- provider/public-site writes false;
- publication false;
- automatic transition false.

The P5.6 implementation contains no:

- HTTP client;
- provider SDK;
- environment-secret access;
- PostgreSQL/database client;
- Task #64 executor;
- Task #70 executor;
- source registry admission call;
- scheduler/worker loop.

## Relationship to later phases

P5.6 supplies an operationally useful, deterministic descriptive report suitable for P5.7 visualization.

P5.7 may build the category/market competitor intelligence UI over this report.

P6 remains the owner of:

- unified opportunity types;
- impact/confidence/risk/effort/freshness scoring;
- prioritization;
- recommendations;
- actionability state;
- lifecycle/history.

No P5.6 field should be treated as a P6 recommendation by itself.
