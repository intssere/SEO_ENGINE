# UGP-6.3B — Deterministic Cannibalization Detection Contract

## Status

IMPLEMENTATION CANDIDATE — PURE / READ-ONLY / NETWORK-FREE / PERSISTENCE-FREE

## Purpose

UGP-6.3B combines two already-bounded evidence families:

1. UGP-6.2A deterministic topic clusters;
2. UGP-6.3A site ownership evidence.

Its purpose is to detect reproducible evidence that more than one same-origin page is competing within the same already-established topic cluster.

It does not decide remediation, select a canonical page, deindex content, consolidate URLs, rewrite content, publish changes, or authorize provider/public-site mutations.

## Version

`ugp-6-3b-deterministic-cannibalization-v1`

## Inputs

`detectCannibalization` consumes:

- one integrity-checked `TopicClusteringResult`;
- one integrity-checked `SiteOwnershipEvidence`.

Both inputs must belong to the exact same `SearchMarket`.

The detector never reads raw provider payloads and never performs GSC, DataForSEO, OpenAI, crawl, database, or website operations.

## Evidence matching rule

UGP-6.3B deliberately does not invent fuzzy query-to-cluster assignment.

A site query participates in a cluster only when its normalized query text exactly matches a member keyword already present in that UGP-6.2A cluster.

Normalization is deterministic:

- NFKC;
- trim;
- lowercase using `en-US`.

This keeps topic construction inside UGP-6.2 and prevents UGP-6.3B from silently reopening semantic clustering policy.

## Materiality policy

The v1 policy is:

- minimum distinct competing pages: **2**;
- minimum impressions per query/page row: **10**;
- maximum average position: **20**.

Clicks are preserved as evidence but are not required because a ranking page can compete for a query even when it receives zero clicks.

These thresholds are versioned noise-control guardrails for this contract. They are not universal SEO truths and do not imply that rows outside the threshold are irrelevant to every analysis.

## Detection states

Each topic cluster receives exactly one deterministic state.

### `exact_query_collision_detected`

At least one exact cluster-member query has material ranking evidence for at least two distinct pages.

This is the strongest UGP-6.3B collision signal because the same query is visibly associated with multiple same-origin pages.

### `topic_page_dispersion_detected`

No exact-query collision meets the policy, but material ranking evidence across member queries in one topic cluster spans at least two distinct pages.

This is weaker than an exact-query collision and represents topic-level page dispersion inside a cluster that UGP-6.2A already determined to be closely related.

### `no_material_collision_observed_in_supplied_evidence`

Matching cluster-query evidence exists, but fewer than two distinct pages survive the v1 materiality policy.

This wording is intentional. It does not claim that cannibalization is absent.

### `no_matching_cluster_query_evidence`

Query/page evidence was supplied, but no supplied query exactly matches a member keyword in that topic cluster.

### `query_page_evidence_not_supplied`

The ownership contract contains no query/page performance evidence.

This state cannot be converted into a negative cannibalization conclusion.

## Multi-source ambiguity

UGP-6.3A can preserve independently supplied sources.

UGP-6.3B fails closed if more than one source supplies the same normalized query/page identity in one detection input. The detector does not average, sum, prefer, or silently deduplicate conflicting measurement sources.

A future evidence-reconciliation milestone may define an explicit multi-source policy if required.

## Page evidence rollup

For each material competing page, the detector emits:

- canonical page URL;
- deterministic page ID;
- UGP-6.3A page-evidence fingerprint when available;
- matched cluster-member queries;
- total clicks;
- total impressions;
- best observed position;
- observation count.

Rows are grouped and ordered deterministically.

## Provenance and integrity

UGP-6.3B verifies:

- the UGP-6.2A clustering result fingerprint;
- each consumed cluster fingerprint;
- the UGP-6.3A ownership evidence fingerprint;
- exact market equality;
- unique normalized member keywords;
- unambiguous query/page identities.

It emits deterministic fingerprints for:

- every cluster assessment;
- every positive finding;
- the complete cannibalization result.

Input observation order does not alter output order or fingerprints.

## Missing evidence

UGP-6.3B preserves the UGP-6.3A `missingEvidence` set.

In particular, UGP-6.3A v1 always states:

`whole_site_not_independently_certified`

Therefore a lack of detected collision must never be interpreted as proof that the complete site is free from cannibalization.

## Safety semantics

Every result permanently declares:

- `readOnly = true`;
- `deterministic = true`;
- `grantsAuthorization = false`;
- `grantsProviderWrite = false`;
- `grantsPublicSiteWrite = false`;
- `performsNetworkOperation = false`;
- `performsPersistence = false`;
- `recommendsRemediation = false`.

UGP-6.3B cannot authorize or recommend:

- redirects;
- canonical-tag changes;
- page deletion;
- deindexing;
- content consolidation;
- page creation;
- content rewriting;
- publishing;
- provider mutations;
- database mutations;
- scheduler/worker activation.

## Tests

The synthetic test suite covers:

- exact-query multi-page collision;
- topic-level page dispersion;
- impression and position materiality filtering;
- explicit missing query/page evidence;
- supplied evidence with no matching cluster query;
- exact market mismatch rejection;
- multi-source query/page ambiguity rejection;
- deterministic output under observation reordering;
- topic-clustering lineage tampering;
- output fingerprint tampering;
- permanently closed safety semantics.

## Explicit exclusions

UGP-6.3B does not:

- fetch Search Console data;
- call DataForSEO;
- call OpenAI;
- perform semantic similarity;
- modify UGP-6.2 clustering thresholds;
- infer fuzzy query-to-cluster relationships;
- crawl a site;
- persist findings;
- mutate a database;
- select a winning page;
- produce remediation instructions;
- edit redirects or canonicals;
- create/delete/deindex pages;
- publish;
- deploy;
- change Railway configuration;
- add schedulers or autonomous workers.

## Follow-on boundary

UGP-6.3C may consume UGP-6.2 clusters and UGP-6.3A ownership evidence to classify topic coverage.

A later remediation-planning milestone, if authorized, must remain separate from this detector and must not reinterpret a UGP-6.3B finding as write authority.
