# UGP-9.2A — Authority Dashboard Projection

Version: `ugp-9-2a-authority-dashboard-projection-v1`

## Status

IMPLEMENTATION CANDIDATE — PURE READ-ONLY PROJECTION / NO PERSISTENCE OR LIVE ACQUISITION

## Purpose

UGP-9.2A converts normalized backlink evidence into the deterministic data model required by the customer-facing Authority dashboard.

It deliberately stops before API persistence or UI binding. The purpose of this increment is to establish one authoritative projection contract for:

- referring domains;
- backlink totals;
- new/lost provider evidence;
- linked pages;
- anchor distribution;
- provider-scoped authority;
- competitor link-gap evidence;
- current-versus-previous trend.

UGP-9.2A consumes UGP-9.1A normalized evidence and may optionally consume a P5.5 competitor-gap bundle where exact measurement basis matches.

## Data source

Required input:

- one current `BacklinkEvidenceDataset`.

Optional inputs:

- one earlier `BacklinkEvidenceDataset` for trend;
- one P5.5 `BacklinkFixtureBundle` for competitor-gap display.

All supplied UGP-9.1A datasets must pass full integrity validation before projection.

## Dashboard summary

The projection exposes:

- backlink count;
- active backlink count;
- normalized exact lost backlink count;
- provider-reported lost backlink count;
- provider-reported new backlink count;
- referring-domain count;
- active referring-domain count;
- linked-page count;
- unique non-null anchor count.

Provider-reported new/lost values are derived only from preserved provider metrics such as `is_new` and `is_lost`.

They are not silently rewritten into UGP-9.1A exact normalized loss state.

## Lost-link semantics

UGP-9.1B intentionally does not infer `lostAt` from `last_seen`.

Therefore the Authority dashboard keeps two separate concepts:

1. `normalizedLostBacklinkCount`
   - requires exact UGP-9.1A normalized lost state;
2. `providerReportedLostBacklinkCount`
   - counts backlinks where provider metric `is_lost=1`.

If provider loss flags exist without exact normalized loss timestamps, the projection records:

`provider_reported_lost_not_equivalent_to_normalized_exact_loss`

The UI must not present those fields as interchangeable.

## Referring domains

Every referring-domain row exposes:

- canonical domain;
- total backlinks;
- active backlinks;
- normalized lost backlinks;
- provider-reported new/lost backlinks;
- linked target URLs;
- anchor texts;
- follow-state evidence;
- rel evidence;
- first/last seen;
- provider authority;
- provider authority metric key/range;
- `authorityCrossProviderComparable=false`;
- deterministic row fingerprint.

Default deterministic ordering:

1. backlink count descending;
2. provider authority descending where available;
3. domain ascending.

## Top linked pages

Backlinks are grouped by canonical target URL.

Each row exposes:

- target URL;
- backlink count;
- referring-domain count;
- active backlink count;
- provider-reported new backlink count;
- provider-reported lost backlink count;
- up to 10 canonical referring-domain labels;
- deterministic page fingerprint.

Default deterministic ordering:

1. backlink count descending;
2. referring-domain count descending;
3. target URL ascending.

UGP-9.2A does not score page value or recommend acquisition.

## Anchor distribution

Non-null anchors are grouped by exact normalized UGP-9.1A anchor text.

Each row exposes:

- anchor text;
- backlink count;
- referring-domain count;
- share of all non-null-anchor backlinks;
- deterministic anchor fingerprint.

Share is rounded deterministically to six decimals.

No anchor-spam score is invented.

## Trend

Trend is optional.

If a prior snapshot is supplied, it must:

- target the exact same canonical domain;
- use the same provider;
- use the same provider dataset;
- use the same source fingerprint;
- use the same market fingerprint;
- use the same category fingerprint;
- use the same authority metric definition;
- have an earlier observation timestamp.

Trend fields:

- backlinks;
- referring domains;
- active backlinks;
- provider-reported new backlinks;
- provider-reported lost backlinks.

Each trend metric exposes:

- current;
- previous;
- delta;
- direction:
  - up;
  - down;
  - flat;
  - unavailable.

When no prior snapshot is supplied, the projection records:

`authority_trend_previous_snapshot_not_supplied`

UGP-9.2A never compares snapshots taken under different measurement bases.

## Competitor gap

Competitor-gap display is optional and descriptive only.

A supplied P5.5 bundle must match the current UGP-9.1A evidence on:

- owned target domain;
- provider key;
- source fingerprint;
- market fingerprint;
- category fingerprint;
- authority metric name;
- authority metric range;
- `crossProviderComparable=false`.

Only actual competitor gaps are projected:

- owned domain absent;
- one or more competitors present.

Each projected gap exposes:

- referring domain;
- P5.5 descriptive classification;
- competitor presence count;
- competitor coverage ratio;
- provider authority;
- latest last-seen timestamp;
- freshness state;
- competitor domains;
- deterministic gap fingerprint.

No opportunity score is produced.

Prospect qualification remains UGP-9.4.

If no competitor bundle is supplied, the projection records:

`authority_competitor_gap_bundle_not_supplied`

## Provider authority

The dashboard explicitly surfaces the provider metric identity and range.

Provider authority is:

- provider-scoped;
- descriptive;
- never converted to a universal SEO ENGINE score;
- never compared across different providers.

Whenever an authority metric exists, the projection records:

`provider_authority_metric_not_cross_provider_comparable`

## Determinism and integrity

The full projection has a deterministic fingerprint over:

- exact input lineage;
- summary;
- trend;
- referring-domain rows;
- linked pages;
- anchors;
- competitor gaps;
- limitations;
- safety semantics.

`assertAuthorityDashboardProjectionIntegrity` rejects any post-build tampering.

## Safety semantics

UGP-9.2A records:

- deterministic: true;
- read-only projection: true;
- provider authority not universal: true;
- cross-provider authority comparison: false;
- current/previous snapshots must share exact measurement basis: true;
- competitor gap descriptive only: true;
- opportunity scoring performed: false;
- prospect qualification performed: false;
- outreach authorized: false;
- live acquisition authorized: false;
- network operation: false;
- persistence: false;
- scheduler enabled: false;
- provider writes: false;
- public-site writes: false.

## Relationship to subsequent milestones

UGP-9.2A is the data-model foundation for the Authority dashboard.

The intended next bounded increment is:

**UGP-9.2B — Authority Dashboard API + customer UI binding**

That increment can:

- expose this projection through an authenticated read endpoint;
- bind `/authority/backlinks` to a real Authority dashboard page;
- display unavailable/partial states without fabricated data;
- preserve progressive disclosure for evidence and provider details.

It must not invent persistence if no durable backlink evidence source exists yet.

UGP-9.3 remains responsible for authority opportunity discovery.

## Test coverage

The bounded tests verify:

1. summary projection;
2. referring-domain projection;
3. linked-page aggregation;
4. anchor distribution;
5. provider new/lost separation from normalized exact loss;
6. same-basis prior-snapshot trend;
7. trend rejection for basis drift;
8. competitor-gap descriptive projection;
9. competitor target/basis mismatch rejection;
10. deterministic projection identity;
11. tamper detection;
12. all execution, persistence, scheduler, and outreach gates remain closed.

## Explicit non-goals

UGP-9.2A does not:

- perform DataForSEO acquisition;
- read credentials;
- persist backlink datasets;
- introduce database tables or migrations;
- expose a new API route;
- replace `/authority/backlinks` UI yet;
- calculate authority opportunity scores;
- qualify prospects;
- discover contacts;
- draft or send outreach;
- schedule backlink refresh;
- mutate provider resources;
- mutate customer websites;
- deploy or mutate Railway/production runtime.
