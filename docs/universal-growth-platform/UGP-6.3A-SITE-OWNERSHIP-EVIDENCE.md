# UGP-6.3A — Site Ownership Evidence Contract

## Status

IMPLEMENTATION CANDIDATE — REPOSITORY-ONLY / NO LIVE PROVIDER EXECUTION

## Purpose

UGP-6.3A creates the normalized read-only evidence boundary required by the later cannibalization and coverage guard.

The contract answers a narrower question than UGP-6.3B/C:

> What site pages exist in the supplied canonical crawl analysis, and what bounded query-to-page search-performance evidence is available for those pages in one exact search market?

It does not decide whether cannibalization exists and does not classify topic coverage.

## Discovery result

Repository inspection found two important existing boundaries.

### Canonical page-side evidence already exists

UGP-3.3 `UniversalReadOnlySiteAnalysis` already models, per page:

- canonical URL identity;
- crawl outcome;
- robots/crawlability state;
- indexability;
- canonical target/state;
- title;
- H1 and headings;
- content text/fingerprint;
- internal-link graph evidence;
- source and page fingerprints.

UGP-6.3A reuses this model. It does not create a competing crawl/page schema.

### Existing GSC runner is intentionally aggregate-only downstream

Task #71 can request Search Console dimensions `query` and `page`, but the existing runner deliberately discards dimension strings before the Task #68 normalized result. Only aggregate numeric metrics cross that boundary.

That behavior is preserved.

UGP-6.3A therefore introduces a small provider-neutral supplied evidence type for already-acquired/captured query-to-page rows. It does not alter Task #71, add a Google transport, authorize a provider read, or retain raw provider payloads.

## Version

`ugp-6-3a-site-ownership-evidence-v1`

## Inputs

`buildSiteOwnershipEvidence` consumes:

1. one integrity-checked `UniversalReadOnlySiteAnalysis`;
2. one exact UGP `SearchMarket`;
3. zero or more bounded `SiteOwnershipQueryPageObservation` records.

Each supplied query/page observation contains only:

- normalized query text;
- same-origin canonical page URL;
- exact market;
- clicks;
- impressions;
- CTR;
- position;
- source ID;
- source fingerprint.

There is no arbitrary provider payload, credential material, request header, OAuth token, API URL, or network client.

## Site and URL identity

The contract requires one HTTPS canonical origin.

Query/page evidence is restricted to same-origin URLs with:

- no user info;
- no query string;
- no fragment;
- deterministic path normalization.

A query/page row may refer to a same-origin page that was not observed in the supplied UGP-3.3 crawl analysis. Such a page is retained with:

`crawlEvidence.availability = "not_observed"`

and all unsupported technical facts remain `null`.

The contract does not invent crawl/index/canonical evidence.

## Market identity

Every query/page row carries an exact UGP `SearchMarket`.

All rows must match the contract-level market exactly across:

- search engine;
- location code;
- language code;
- device.

Mixed-market evidence fails closed.

## Missing evidence

Missing evidence is explicit.

Possible v1 reasons are:

- `query_page_performance_not_supplied`;
- `crawl_inventory_partial`;
- `whole_site_not_independently_certified`.

UGP-3.3 explicitly does not independently certify whole-site completeness, so the last reason is always present in v1.

This prevents later coverage logic from treating absence of evidence as evidence of absence.

## Determinism and integrity

The contract:

- normalizes query text with NFKC + trim + lowercase;
- canonicalizes page URL representation;
- sorts query/page rows deterministically;
- rejects duplicate query/page/source evidence;
- sorts page output deterministically;
- fingerprints each query/page row;
- fingerprints per-page query performance;
- fingerprints each page evidence record;
- fingerprints the complete evidence bundle.

Input ordering does not affect output ordering or fingerprints.

## Safety semantics

Every result states:

- `readOnly: true`;
- `deterministic: true`;
- `grantsAuthorization: false`;
- `grantsProviderWrite: false`;
- `grantsPublicSiteWrite: false`;
- `performsNetworkOperation: false`;
- `performsPersistence: false`.

UGP-6.3A cannot authorize:

- redirect changes;
- canonical changes;
- deindexing;
- deletion;
- page creation;
- content rewriting;
- publication;
- provider writes;
- database writes;
- crawl execution.

## Relationship to UGP-6.3B and UGP-6.3C

UGP-6.3B should consume this contract together with UGP-6.2 topic clusters to detect deterministic cannibalization evidence.

UGP-6.3C should consume the same ownership evidence to classify coverage without collapsing missing evidence into an unsupported `uncovered` conclusion.

Neither downstream milestone should bypass this ownership boundary by reading raw provider payloads.

## Explicit non-goals

UGP-6.3A does not:

- call Google Search Console;
- change the Task #71 GSC runner;
- change OAuth scopes or credentials;
- persist query/page rows;
- add database schema;
- change crawl execution;
- create a scheduler/worker;
- call DataForSEO;
- call OpenAI;
- run Railway;
- deploy;
- publish;
- detect cannibalization;
- classify coverage;
- recommend or execute remediation.
