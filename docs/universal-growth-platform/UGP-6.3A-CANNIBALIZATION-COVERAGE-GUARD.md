# UGP-6.3A — Deterministic Cannibalization and Coverage Guard

## Status

**IMPLEMENTATION CANDIDATE — READ-ONLY / NETWORK-FREE / NON-AUTHORIZING**

## Purpose

UGP-6.3A turns UGP-6.2 topic clusters plus normalized page-topic evidence into a deterministic guard result.

The guard answers four bounded questions for every topic cluster:

- is there not enough evidence to judge ownership?
- is there a measured coverage gap?
- is there one clear owning page?
- are multiple pages materially competing for ownership?

It does **not** decide what should be rewritten, redirected, deleted, consolidated, canonicalized, or published.

## Inputs

### Topic clustering

The first input is the merged UGP-6.2A `TopicClusteringResult`.

UGP-6.3A requires its safety semantics to remain:

- read-only;
- deterministic;
- no provider write authority;
- no public-site write authority;
- no network operation;
- no persistence.

### Topic-page observations

The second input is normalized `TopicPageObservation` evidence.

Each observation binds one canonical page URL to one UGP-6.2 cluster and may include:

- whether the URL is present in site inventory;
- bounded content/topic relevance in `[0,1]`;
- exact cluster keywords matched by that page;
- optional GSC-derived impressions, clicks, and weighted position.

The observation receives a deterministic evidence fingerprint. Integrity drift fails closed.

UGP-6.3A does not itself crawl a site or call GSC. A later adapter can transform the existing sitemap/crawl and GSC read-only evidence into these observations.

## Policy

Versioned policy:

- maximum clusters: 200;
- maximum page observations: 20,000;
- qualifying content relevance: at least 0.60;
- qualifying GSC impressions: at least 10;
- minimum ownership score: 0.35;
- secondary score for cannibalization consideration: at least 0.35;
- maximum top-two ownership score gap for cannibalization: 0.25.

Ownership score uses only observed dimensions:

- content relevance: weight 0.45;
- GSC visibility share within the topic: weight 0.35;
- matched-keyword breadth within the cluster: weight 0.20.

Missing content or GSC dimensions are excluded from the denominator rather than treated as negative evidence.

## Classification

### `insufficient_evidence`

Returned when:

- the topic has no page observations; or
- observations exist but contain no measured content/GSC topic signal.

This state must not be interpreted as a coverage gap.

### `coverage_gap`

Returned when measured page evidence exists, but no page clears the ownership thresholds.

### `single_owner`

Returned when:

- exactly one page qualifies; or
- multiple pages qualify but the strongest secondary page is materially weaker than the primary.

### `cannibalization_risk`

Returned when:

- at least two pages qualify as topic owners;
- the second page ownership score is at least 0.35; and
- the score gap between the strongest two pages is no more than 0.25.

This is a risk classification, not a remediation authorization.

## Determinism and provenance

The contract emits deterministic fingerprints for:

- each page observation;
- each page assessment;
- each topic assessment;
- the complete guard result.

Input order does not change the result.

## Relationship to existing repository evidence

The repository already contains:

- first-party sitemap inventory with canonical URLs and completeness state;
- first-party crawl evidence;
- a read-only GSC Search Analytics runner with query/page dimensions.

UGP-6.3A intentionally does not import those runtime/acquisition contracts directly.

The follow-on UGP-6.3B adapter should map their certified evidence into `TopicPageObservation` objects while preserving source fingerprints and completeness constraints.

## Safety semantics

Every guard result asserts:

- `readOnly: true`;
- `deterministic: true`;
- `grantsAuthorization: false`;
- `grantsProviderWrite: false`;
- `grantsPublicSiteWrite: false`;
- `performsNetworkOperation: false`;
- `performsPersistence: false`;
- `proposesRemediation: false`.

## Explicit exclusions

UGP-6.3A does not:

- make a GSC request;
- crawl a site;
- read Production DB;
- persist evidence;
- write metadata/content;
- generate redirects or canonicals;
- choose pages to delete;
- generate content;
- schedule work;
- authorize provider/public-site mutations;
- deploy anything.

## Next slice

UGP-6.3B should implement the bounded site-ownership evidence adapter that converts existing crawl/sitemap and GSC query/page evidence into UGP-6.3A observations with exact source lineage and completeness handling.
