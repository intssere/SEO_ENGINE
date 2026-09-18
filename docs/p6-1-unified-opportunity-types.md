# P6.1 — Unified Opportunity Types v1

## Purpose

P6.1 introduces the first provider-neutral, cross-signal opportunity classification boundary for SEO ENGINE. It does **not** replace the existing opportunity engine, does not score or rank opportunities, and does not authorize any runtime action.

The canonical families are:

- `technical`
- `content`
- `query`
- `competitor`
- `link`
- `ai`

Each concrete opportunity kind maps to exactly one family. The current legacy opportunity types remain valid and are mapped without changing their existing behavior:

| Legacy type | P6.1 family | P6.1 kind |
|---|---|---|
| `organic_ctr` | query | `organic_ctr` |
| `striking_distance` | query | `striking_distance` |
| `technical_remediation` | technical | `technical_remediation` |
| `internal_link` | link | `internal_link` |
| `content_alignment` | content | `content_alignment` |

No OpenAPI enum, persisted row, legacy score, confidence value, risk classification, reconciliation rule, or UI behavior is changed by P6.1.

## Record identity

A normalized record contains:

- version;
- deterministic opportunity ID/fingerprint;
- family and kind;
- caller-supplied opaque subject key;
- explicit reference time;
- market/category scope where supported by evidence;
- bounded normalized evidence references;
- explicit missing-evidence codes;
- semantic guard codes;
- optional exact legacy-type compatibility marker;
- immutable classification and safety semantics.

The subject key is intentionally opaque. P6.1 does not reinterpret URL, hostname, query, page, or provider identities owned by earlier modules.

## Evidence references

P6.1 can reference evidence from:

- crawl/page evidence;
- GSC query evidence;
- technical issue evidence;
- P5.2 SERP/ranking projections;
- P5.3 keyword metrics;
- P5.4 trend context;
- P5.5 backlink/link-gap bundles;
- P5.6 competitor gap/visibility reports;
- P5.8 source telemetry;
- future AI visibility evidence.

Evidence references preserve their existing fingerprints and optional source/time/scope lineage. P6.1 never copies provider payloads or invents missing observations.

Exact duplicate evidence collapses deterministically. Reusing one evidence fingerprint with conflicting metadata fails closed.

## Scope integrity

P6.1 does not aggregate across markets or categories.

If supplied evidence contains more than one non-null market fingerprint or more than one non-null category fingerprint, normalization fails closed. Explicit opportunity scope must agree with supplied evidence scope.

Null scope is not converted into a guessed market or category.

## Preserved semantic guards

P6.1 derives explicit guard codes from evidence kinds so later P6 work cannot silently reinterpret P5 data:

- provider-native organic difficulty is not cross-provider comparable;
- trend values are request-frame relative;
- trend frames are not cross-frame comparable;
- trend values are not absolute search demand;
- backlink authority is provider-native and not cross-provider comparable;
- observed competitor visibility is not market share;
- topic/page/link gap evidence is not a recommendation by itself;
- P5.8 source telemetry is descriptive only and does not control Task #67 refresh ordering or Task #70 execution;
- null remains distinct from zero;
- missing evidence is never fabricated.

## Scoring boundary

P6.1 is classification/provenance only.

It intentionally contains no:

- impact score;
- confidence score;
- risk score;
- effort score;
- freshness score;
- combined opportunity score;
- priority/ranking;
- recommendation generation.

P6.2 owns the future `impact × confidence × risk × effort × freshness` scoring model. That model must consume the P6.1 record without changing the underlying evidence semantics.

## Runtime and safety boundary

P6.1 has no route, database, persistence, provider, credential, environment, scheduler, worker, retry, execution, mutation, or publication behavior.

It does not:

- admit Task #67 sources;
- reorder Task #67 refresh plans;
- invoke Task #64 or Task #70;
- read or write Production data;
- persist observations/evidence;
- contact providers or public sites;
- change OpenAPI;
- alter the legacy opportunity engine;
- publish or deploy anything.

Generic continuation remains engineering-only and default-off.
