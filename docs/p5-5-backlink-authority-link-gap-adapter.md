# P5.5 — Deterministic Backlink Authority + Link-Gap Supplied-Fixture Adapter v1

Issue: #231  
Source review date: 2026-09-18

## Purpose

P5.5 adds a dedicated `backlink` signal type, deterministic provider-neutral backlink fixture normalization, committed synthetic fixture families, and a Task #68-compatible supplied-fixture/manual-import adapter.

P5.5 v1 is intentionally network-free. It does not enroll a provider, create or use credentials, execute a provider request, admit a Production Task #67 source, execute Task #70, persist observations/evidence, read or mutate Production data, start a scheduler/worker, mutate a provider/public site, or publish the application.

## Reviewed future provider mapping candidate

The public DataForSEO Backlinks API was reviewed only as a future mapping candidate:

- Summary: `/v3/backlinks/summary/live`
- Referring Domains: `/v3/backlinks/referring_domains/live`
- Anchors: `/v3/backlinks/anchors/live`
- Domain Intersection: `/v3/backlinks/domain_intersection/live`

The current public documentation states that:

- Summary provides backlink-profile aggregates including provider-native `rank`, backlinks and referring-domain metrics.
- Referring Domains provides domain-level backlink data including `rank`, backlinks, `first_seen` and `lost_date`.
- Anchors provides aggregate anchor-text backlink data.
- Domain Intersection is designed for link-gap analysis and accepts multiple targets plus excluded targets.
- `rank_scale` may be selected as `one_hundred` or `one_thousand`.
- Summary `referring_domains` counts subdomains separately, while `referring_main_domains` is a separate main/root-domain metric; the Referring Domains result count is main-domain oriented.

Those semantics are recorded so a future provider adapter does not silently equate incompatible counts or scales. All reviewed endpoints are Live/billable; P5.5 v1 contains no transport for them.

## Signal taxonomy

P5.5 introduces the typed signal:

`backlink`

It is added to the Task #66 `SignalType` union and Task #67 registry allowlist.

This does not admit any real source. The P5.5 adapter expects the contract-only source key:

`supplied-backlink-fixture`

with:

- sourceClass: `external`
- collectionMode: `manual_import`
- signalType: `backlink`

## Canonical domain identity

Domain normalization:

1. Unicode NFKC.
2. Trim.
3. Lowercase.
4. If an absolute URL is permitted, parse it and retain only its hostname.
5. Remove one terminal dot.
6. Convert IDN hostname through the standards-compliant ASCII domain conversion used by Node URL handling.
7. Reject localhost, IP literals, malformed labels, whitespace/userinfo/ports/paths in bare-domain-only fields.
8. Require a DNS-style dotted hostname.

P5.5 does **not** collapse:

- `www.example.test` into `example.test`;
- `blog.example.test` into `example.test`.

A registrable-domain/Public-Suffix-List transformation is not silently inferred.

Duplicate canonical referring domains fail closed.

Owned and competitor domains use the same canonicalization. Competitors are sorted, must be unique, and cannot include the owned domain.

## URL canonicalization

Evidence URLs must be absolute HTTP(S).

Canonicalization:

- standard URL parse;
- canonical lowercase/ASCII hostname;
- default-port normalization from the URL parser;
- fragment removal;
- path case preserved;
- trailing-slash semantics preserved;
- HTTP is not changed to HTTPS;
- `www` is not removed;
- all query parameters are retained in v1;
- query entries are sorted by key then value;
- canonical URL arrays are deduplicated and sorted.

P5.5 does not guess a page's HTML canonical URL or strip tracking-like parameters.

## Timestamp contract

Every timestamp is canonicalized to UTC ISO-8601 with milliseconds.

P5.5 has no `Date.now()` dependency.

Required bundle times:

- `observedAt` — the supplied snapshot observation time;
- `referenceTime` — caller-supplied deterministic time used for freshness calculations.

Required ordering:

`observedAt <= referenceTime`

Nullable row times:

- `firstSeenAt`
- `lastSeenAt`
- `lostAt`

Rules:

- no supplied row timestamp may be after `observedAt`;
- if first + last exist, first <= last;
- if first + lost exist, first <= lost;
- missing timestamps remain null;
- `observedAt` is never substituted for missing provider timestamps.

## Freshness

Freshness uses `lastSeenAt` only and the explicit `referenceTime`.

- fresh: 0–30 days
- recent: 31–90 days
- aging: 91–180 days
- stale: >180 days
- unavailable: `lastSeenAt=null`

`ageDays` is floor((referenceTime - lastSeenAt) / 86400000).

A missing `lastSeenAt` remains unavailable rather than becoming fresh.

## Authority semantics

Authority basis is explicit:

- provider key;
- provider method;
- metric name;
- minimum/maximum scale;
- source/market/category fingerprints;
- `crossProviderComparable=false`.

Authority values are either:

- null = unavailable;
- finite numeric value inside the declared provider-native scale.

Zero is not converted to null.

P5.5 never:

- averages referring-domain authority to invent target authority;
- rescales one provider's authority into another provider's metric;
- claims cross-provider authority equivalence.

If the same referring domain appears in multiple profiles under the same exact measurement basis with conflicting non-null authority values, normalization fails rather than inventing an aggregate.

## Referring-domain rows

Each normalized row contains:

- canonical domain;
- provider-native authority or null;
- backlink count;
- boolean evidence flags for dofollow/nofollow/sponsored/UGC presence;
- first/last/lost timestamps;
- explicit 30-day change state;
- deterministic freshness state;
- anchor count basis;
- normalized anchors;
- canonical target URLs.

Backlink counts are positive integers.

Dofollow/nofollow/sponsored/UGC evidence is not treated as mutually exclusive because a domain can have multiple backlink relationships.

## Anchor normalization

Anchor display text:

- NFKC;
- trim;
- collapsed whitespace.

Anchor identity is the normalized display text lowercased.

Allowed classifications:

- brand
- exact
- partial
- url
- generic
- other
- unclassified

Counts are positive integers.

Duplicate rows with the same anchor identity and same classification are merged deterministically by summed count.

The same anchor identity with conflicting classifications fails closed.

For `anchorCountBasis=backlink_count`, summed anchor counts must equal the row backlink count.

For `provider_aggregate` or `unknown`, P5.5 does not invent that equality.

P5.5 creates no anchor-spam score.

## Summary-total consistency

P5.5 complete supplied fixtures are reconciled after row normalization.

Exact derived totals:

- referringDomains = normalized referring-domain row count;
- backlinks = sum(row.backlinks);
- dofollowReferringDomains = rows with dofollow evidence;
- nofollowReferringDomains = rows with nofollow evidence;
- sponsoredReferringDomains = rows with sponsored evidence;
- ugcReferringDomains = rows with UGC evidence.

Contradictory supplied totals fail closed. They are not automatically corrected.

### New/lost 30-day totals

A provider's historical/new/lost definition must not be inferred from timestamps.

Rows therefore carry explicit:

- new
- lost
- unchanged
- unknown

If every row has explicit non-unknown change evidence, supplied new/lost totals are required and must match the row counts.

If any row is `unknown`, both summary new/lost totals must remain null.

## Deterministic synthetic fixture families

Committed fixture file:

`artifacts/api-server/src/lib/backlink-fixtures.ts`

It contains:

1. baseline owned backlink profile;
2. null-authority and explicit-zero-authority boundaries;
3. anchor distribution and anchor merge examples;
4. fresh/recent/aging/stale + explicit new/lost churn profile;
5. owned + three competitor profiles for link-gap classification.

All fixture internet identities use reserved `.test` / `.example` namespaces.

## Link-gap semantics

A bundle contains:

- exactly one owned profile;
- 1–10 competitor profiles;
- one exact common measurement basis;
- one observation/reference-time frame.

The candidate universe is the canonical union of referring domains seen in those profiles.

For each candidate P5.5 derives:

- owned presence;
- sorted competitor presence vector;
- competitor presence count;
- competitor coverage ratio;
- exact authority evidence when consistent;
- latest available last-seen timestamp;
- freshness state;
- descriptive gap classification.

Classes:

- `owned_exclusive`
- `shared_coverage`
- `unlinked_observed_domain`
- `single_competitor_gap`
- `shared_competitor_gap`
- `universal_competitor_gap`

P5.5 does not calculate a backlink opportunity score. Cross-signal prioritization belongs to P6.

## Task #68 adapter

Adapter version:

`p5.5-supplied-backlink-adapter-v1`

The request contract binds:

- exact Task #67/#68 source/request lineage;
- market fingerprint;
- category fingerprint;
- owned domain;
- sorted competitor domains;
- authority provider/method/metric/scale.

The supplied fixture basis must exactly match that contract.

Rich backlink profiles/gap candidates stay outside the Task #68 stream.

Task #68 receives bounded aggregate numeric metrics only, including:

- owned authority when available;
- owned referring-domain count;
- owned backlink count;
- owned freshness bucket counts;
- unique observed referring-domain count;
- gap count;
- single/shared/universal gap counts;
- shared-coverage and owned-exclusive counts;
- average gap competitor coverage ratio;
- selected owned anchor-class ratios.

Missing optional authority/freshness produces diagnostics but does not fabricate values.

## Deterministic identity

Arrays without semantic input order are canonicalized before hashing:

- referring domains by canonical domain;
- competitors by canonical domain;
- target URLs lexically after canonicalization;
- anchors by lowercase identity then classification.

The normalized profile/bundle fingerprints therefore do not depend on raw fixture insertion order.

## Fail-closed behavior

Representative errors include:

- `invalid_domain`
- `duplicate_referring_domain`
- `owned_domain_in_competitor_set`
- `duplicate_competitor_domain`
- `invalid_url`
- `invalid_timestamp`
- `first_seen_after_last_seen`
- `first_seen_after_lost`
- `provider_timestamp_after_observation`
- `invalid_authority`
- `invalid_link_count`
- `invalid_link_type`
- `invalid_anchor_count`
- `anchor_classification_conflict`
- `anchor_backlink_total_mismatch`
- `referring_domain_total_mismatch`
- `backlink_total_mismatch`
- relation-domain total mismatches;
- `new_referring_domain_total_mismatch`
- `lost_referring_domain_total_mismatch`
- `new_lost_totals_require_complete_change_evidence`
- `conflicting_referring_domain_authority`
- `fixture_basis_lineage_mismatch`
- target/competitor lineage mismatches.

## Safety

P5.5 hard-codes false authorization for:

- live provider transport;
- provider enrollment/purchase;
- credential creation/use;
- provider SDK/network requests;
- Task #67 Production source admission;
- Task #70 execution;
- observation/evidence persistence;
- database reads/writes/schema mutation;
- scheduler/batch/worker/retry execution;
- provider/public-site writes;
- publication;
- automatic transition.

The P5.5 implementation contains no HTTP client, provider SDK, environment-secret binding, database client, worker/scheduler loop, source-registry admission call, or Task #70 execution call.
