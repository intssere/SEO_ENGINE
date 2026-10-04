# UGP-9.1B — DataForSEO Backlink Response Adapter

Version: `ugp-9-1b-dataforseo-backlink-response-adapter-v1`

## Status

IMPLEMENTATION CANDIDATE — CAPTURED RESPONSE NORMALIZATION ONLY / NO LIVE TRANSPORT

## Purpose

UGP-9.1B maps captured DataForSEO Backlinks API responses into the provider-neutral UGP-9.1A backlink evidence contract.

The adapter is intentionally one-way:

`captured DataForSEO backlink response → UGP-9.1A normalized evidence`

It does not perform HTTP, resolve credentials, enroll a provider, persist evidence, or schedule collection.

## Provider dataset

The adapter is scoped to the DataForSEO Backlinks endpoint represented as:

`backlinks.backlinks.live`

The current provider response exposes the fields needed by UGP-9.1A, including:

- referring domain;
- referring URL;
- target domain;
- target URL;
- `is_new`;
- `is_lost`;
- backlink rank;
- referring-page rank;
- referring-domain rank;
- backlink spam score;
- first seen;
- last seen;
- link attributes;
- dofollow state;
- anchor text;
- broken-link status;
- target status code;
- target spam score;
- link/group counts;
- indirect-link state.

## Rank scale

DataForSEO permits two rank scales:

- `one_hundred` → 0–100;
- `one_thousand` → 0–1000.

UGP-9.1B requires the rank scale as explicit adapter input.

The UGP-9.1A authority metric is then bound to:

`domain_from_rank`

with the matching provider scale.

`crossProviderComparable` remains exactly `false`.

No DataForSEO rank is converted into a universal SEO ENGINE authority score.

## Core field mapping

### Identity

- `url_from` → source URL;
- `domain_from` → source domain;
- `url_to` → target URL.

UGP-9.1A then independently validates source URL/domain and target URL/domain lineage.

### Anchor

- `anchor` → anchor text;
- null remains null.

### Discovery/freshness timestamps

- `first_seen` → first seen;
- `last_seen` → last seen.

Provider UTC strings are converted into canonical ISO timestamps.

### Follow and rel semantics

- `dofollow: true` → `follow`;
- `dofollow: false` → `nofollow`.

Canonical rel values retained by UGP-9.1A are:

- `nofollow`;
- `sponsored`;
- `ugc`.

Other provider attributes such as `noopener`, `noreferrer`, or `external` are not projected into canonical rel semantics. Their presence adds the limitation:

`dataforseo_noncanonical_rel_attributes_not_projected`

If DataForSEO reports `dofollow: false` without a literal `nofollow` attribute, the adapter adds canonical `nofollow` because the provider's boolean directly states that follow state.

If DataForSEO reports `dofollow: true` while also returning `nofollow`, the adapter fails closed.

## Lost-link limitation

The current `backlinks/backlinks/live` result exposes `is_lost`, `first_seen`, and `last_seen`, but does not expose an exact loss timestamp in the backlink row.

UGP-9.1A deliberately requires a real `lostAt` timestamp before a normalized backlink may claim state `lost`.

UGP-9.1B therefore does **not** invent a loss timestamp from `last_seen`.

For `is_lost: true`:

- normalized state is `unknown`;
- `lostAt` remains null;
- provider `is_lost` is preserved as numeric provider metric;
- limitation is recorded:

`dataforseo_is_lost_has_no_exact_loss_timestamp_in_backlinks_live`

This means UGP-9.1A's normalized `lostBacklinkCount` does not include these provider-loss flags until exact loss-time evidence exists. Later Authority dashboard work must distinguish provider loss flags from normalized exact-loss state.

## Provider metrics preserved

The adapter preserves bounded numeric provider evidence including:

- `backlink_rank`;
- `page_from_rank`;
- `domain_from_rank`;
- `backlink_spam_score`;
- `page_from_status_code`;
- `url_to_status_code`;
- `url_to_spam_score`;
- `links_count`;
- `group_count`;
- `is_new`;
- `is_lost`;
- `is_broken`;
- `original`;
- `is_indirect_link`.

Boolean provider values are encoded as numeric 0/1 metrics with unit `boolean`.

## Pagination / bounded-response semantics

DataForSEO can return a bounded page of backlink rows while reporting a larger `total_count`.

UGP-9.1B never treats one response page as the complete backlink universe.

When:

`total_count > items_count`

the adapter records:

`dataforseo_response_is_bounded_page_not_complete_backlink_universe`

The resulting UGP-9.1A dataset is therefore the exact normalized evidence contained in that response page only.

A later acquisition layer may page deterministically, but that is outside 9.1B.

## Envelope validation

The adapter requires:

- top-level status `20000`;
- zero task errors;
- exactly one provider task;
- task status `20000`;
- exactly one task result;
- bounded `items_count`;
- exact agreement between `items_count` and returned item length;
- `total_count >= items_count`;
- every item type exactly `backlink`.

Malformed or contradictory captured provider responses fail closed.

## Response provenance

The adapter preserves:

- provider status;
- task status;
- provider task ID where supplied;
- provider path where supplied;
- rank scale;
- deterministic response fingerprint;
- exact UGP-9.1A source/request/market/category lineage;
- deterministic adapter fingerprint.

Equivalent object-key ordering produces the same response fingerprint because the adapter uses canonical stable JSON hashing.

## Safety semantics

UGP-9.1B records:

- deterministic: true;
- captured-response normalization only: true;
- provider-specific mapping: true;
- provider authority not universal: true;
- live transport authorized: false;
- provider enrollment authorized: false;
- credential use authorized: false;
- network operation: false;
- persistence: false;
- scheduler enabled: false;
- outreach authorized: false;
- provider writes: false;
- public-site writes: false.

## Test coverage

The bounded tests verify:

1. DataForSEO backlink row mapping into UGP-9.1A;
2. explicit 0–100 / 0–1000 rank-scale enforcement;
3. lost-link evidence retained without invented loss timestamp;
4. bounded pagination limitation;
5. unsupported rel attributes are not promoted into canonical rel semantics;
6. nofollow boolean mapping;
7. envelope/count/provider contradictions fail closed;
8. source and target lineage flows through UGP-9.1A validation;
9. stable response hashing across object-key order;
10. adapter tamper detection and all live/runtime gates remain closed.

## Explicit non-goals

UGP-9.1B does not:

- call DataForSEO;
- construct a live paid request;
- resolve or use DataForSEO credentials;
- enroll or purchase provider access;
- page through the API;
- merge multiple provider pages;
- persist normalized backlinks;
- create database tables or migrations;
- schedule backlink collection;
- calculate competitor link gaps;
- score authority opportunities;
- qualify prospects;
- discover contacts;
- draft or send outreach;
- create reciprocal-link schemes;
- create purchased ranking-link workflows;
- mutate customer sites;
- mutate Railway, deployments, workers, or production runtime.

## Next increment

The next bounded step after merge is expected to be **UGP-9.1C — controlled backlink acquisition/certification boundary**, reusing existing DataForSEO transport safety patterns while keeping any live paid execution behind explicit certification and authorization.
