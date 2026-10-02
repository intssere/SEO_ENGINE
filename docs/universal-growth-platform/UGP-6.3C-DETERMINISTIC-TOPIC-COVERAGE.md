# UGP-6.3C — Deterministic Topic Coverage Classification

## Status

IMPLEMENTATION CANDIDATE — PURE / READ-ONLY / NETWORK-FREE / PERSISTENCE-FREE

## Purpose

UGP-6.3C combines:

1. UGP-6.2A deterministic topic clusters; and
2. UGP-6.3A site ownership evidence

to classify the degree of **positively observed topic coverage evidence** for each topic cluster.

The contract is deliberately conservative.

It does **not** emit an `uncovered` classification in v1 because UGP-6.3A explicitly does not independently certify whole-site completeness. Absence of matching evidence in the supplied scope is therefore not proof that a topic is absent from the full site.

## Version

`ugp-6-3c-deterministic-topic-coverage-v1`

## Core invariant

UGP-6.3C classifies only what the supplied evidence positively supports.

The result always declares:

`summary.uncoveredClusters = 0`

and:

`semantics.declaresUncovered = false`

This is a safety and evidence-integrity invariant, not merely presentation wording.

## Inputs

`classifyTopicCoverage` consumes:

- one integrity-checked `TopicClusteringResult`;
- one integrity-checked `SiteOwnershipEvidence`.

Both inputs must use the exact same `SearchMarket`.

The classifier performs no provider, network, crawl, database, website, embedding, or LLM operation.

## Topic matching

The classifier does not reopen semantic clustering.

A search query participates in a topic cluster only when its normalized text exactly matches one of the existing UGP-6.2A cluster member keywords.

Normalization is deterministic:

- NFKC;
- trim;
- lowercase with `en-US`.

Page-side metadata signals are also intentionally narrow.

A page receives a topic metadata signal only when a normalized cluster-member keyword exactly equals one of:

- page title;
- H1;
- any supplied heading.

There is no fuzzy substring matching, embedding lookup, semantic inference, or content-text classification in UGP-6.3C v1.

## Material search coverage policy

The versioned v1 materiality policy is:

- minimum impressions: **10**;
- maximum average position: **20**;
- ranking page must be:
  - present in the supplied crawl evidence;
  - `indexable`;
  - `self` canonical.

The first two thresholds match the bounded materiality guard used in UGP-6.3B so the two parts of the 6.3 guard do not create conflicting definitions of material query/page evidence.

These thresholds are deterministic policy choices, not universal SEO claims.

## Classification states

Each topic cluster receives exactly one state.

### `material_search_coverage_observed`

At least one exact cluster-member query has material search-performance evidence and ranks on a page whose supplied technical evidence verifies:

- crawl availability = observed;
- indexability = indexable;
- canonical state = self.

This is the strongest positive coverage state in v1.

### `search_presence_observed_technical_state_unverified`

Material search-performance evidence exists for a cluster-member query, but none of the material ranking pages is verified as observed + indexable + self-canonical.

This preserves the search observation without overstating technical coverage quality.

### `search_presence_observed_below_materiality`

One or more exact cluster-member queries have supplied ranking evidence, but no row meets the v1 materiality thresholds.

This is positive search-presence evidence but weaker than material coverage.

### `page_topic_signal_observed_without_search_evidence`

No matching query/page search evidence is observed, but at least one supplied page contains an exact cluster-member keyword in title, H1, or heading metadata.

This is page-topic evidence only.

It does not prove ranking coverage.

### `no_matching_topic_evidence_in_supplied_scope`

Query/page evidence was supplied, but the classifier finds neither:

- a matching cluster-member query; nor
- an exact page metadata topic signal.

This state explicitly means only that the supplied scope contains no positive match.

It is **not** equivalent to `uncovered`.

### `query_page_evidence_not_supplied`

No query/page search evidence was supplied and no exact metadata topic signal was observed.

This cannot support either a positive search-coverage claim or an uncovered claim.

## Page evidence

For each positively associated page, the classifier emits:

- canonical URL;
- page ID;
- UGP-6.3A page evidence fingerprint;
- crawl availability;
- indexability;
- canonical state;
- matched cluster-member queries;
- exact metadata signal kinds;
- clicks;
- impressions;
- best position;
- whether the page satisfies material search coverage.

## Multi-source ambiguity

As in UGP-6.3B, the classifier fails closed if multiple sources supply the same normalized query/page identity.

UGP-6.3C does not sum, average, prefer, merge, or silently deduplicate conflicting measurement sources.

## Missing evidence propagation

The classifier preserves the complete UGP-6.3A `missingEvidence` set.

Relevant states include:

- `query_page_performance_not_supplied`;
- `crawl_inventory_partial`;
- `whole_site_not_independently_certified`.

Because the last condition is always present in UGP-6.3A v1, UGP-6.3C cannot establish whole-site topic absence.

## Provenance and integrity

UGP-6.3C verifies:

- UGP-6.2A clustering result fingerprint;
- every consumed cluster fingerprint;
- UGP-6.3A site ownership evidence fingerprint;
- exact market equality;
- unique normalized cluster-member keywords;
- unique query/page identities.

It emits deterministic fingerprints for:

- every cluster coverage assessment;
- the complete coverage result.

Input row order cannot change the resulting classification or fingerprints.

## Safety semantics

Every result permanently declares:

- `readOnly = true`;
- `deterministic = true`;
- `grantsAuthorization = false`;
- `grantsProviderWrite = false`;
- `grantsPublicSiteWrite = false`;
- `performsNetworkOperation = false`;
- `performsPersistence = false`;
- `declaresUncovered = false`;
- `recommendsRemediation = false`.

The classifier cannot authorize or recommend:

- creating content;
- deleting pages;
- consolidating pages;
- redirect changes;
- canonical-tag changes;
- deindexing;
- page rewrites;
- publication;
- provider writes;
- database writes;
- scheduler/worker/autonomous activation.

## Tests

The synthetic test suite verifies:

- material search coverage on an observed indexable self-canonical page;
- material search presence with unverified/ineligible technical state;
- below-materiality search presence;
- exact page metadata topic signals without search evidence;
- no matching supplied evidence never becomes `uncovered`;
- explicit query-page-evidence-not-supplied state;
- partial-crawl uncertainty propagation;
- exact market mismatch rejection;
- ambiguous multi-source query/page rejection;
- deterministic output under input reordering;
- topic clustering lineage tamper rejection;
- output fingerprint tamper rejection;
- permanently closed non-authorizing semantics.

## Explicit exclusions

UGP-6.3C does not:

- call Google Search Console;
- call DataForSEO;
- call OpenAI;
- crawl a website;
- perform semantic similarity;
- alter UGP-6.2 clustering;
- perform fuzzy page-topic matching;
- read raw content text;
- certify whole-site completeness;
- declare a topic uncovered;
- calculate content opportunity priority;
- select a page to create, refresh, merge, redirect, or delete;
- persist findings;
- mutate the database;
- deploy;
- change Railway configuration;
- publish;
- activate schedulers, workers, or autonomous execution.

## Relationship to the complete UGP-6.3 guard

With UGP-6.3B and UGP-6.3C together, the evidence layer can now distinguish:

- multiple pages competing within one established topic cluster;
- positive material search coverage;
- weaker search presence;
- page-side topic signals;
- and insufficient supplied evidence.

A later decision/planning layer may consume these evidence contracts, but it must remain separate and must not reinterpret either contract as write authority.
