# UGP-6.4 — Content Opportunity Model

## Status

IMPLEMENTATION CANDIDATE — PURE / READ-ONLY / NETWORK-FREE / PERSISTENCE-FREE

## Purpose

UGP-6.4 turns the already-normalized UGP content-intelligence evidence into a bounded content decision record.

It consumes:

1. UGP-6.2A topic clusters;
2. UGP-6.3B cannibalization assessments;
3. UGP-6.3C topic-coverage assessments; and
4. explicit business-relevance evidence supplied by the caller.

The model answers:

> Given the evidence already available for this topic, should SEO ENGINE treat it as a create, refresh, consolidate, leave-alone, or defer candidate?

The result is advisory only. It does not create, edit, merge, redirect, publish, schedule, or persist content.

## Version

`ugp-6-4-content-opportunity-model-v1`

## Business relevance is explicit evidence

UGP-6.4 does not infer business relevance from keyword volume, CPC, semantic similarity, or ranking position.

Each topic cluster must receive exactly one integrity-checked `ContentOpportunityBusinessRelevanceEvidence` record containing:

- cluster fingerprint;
- relevance value in `[0,1]`;
- bounded rationale code;
- source ID;
- source fingerprint;
- deterministic evidence fingerprint.

The v1 action-candidate threshold is:

`business relevance >= 0.50`

Below that threshold, the model emits `leave_alone`.

This threshold is versioned product policy rather than a universal business or SEO rule.

## Decision policy

The v1 decision order is deterministic.

### 1. Low business relevance

If:

`business relevance < 0.50`

then:

`leave_alone`

No content action candidate is generated merely because search demand or topic evidence exists.

### 2. Multi-page competition

If UGP-6.3B reports:

- `exact_query_collision_detected`; or
- `topic_page_dispersion_detected`

then:

`consolidate_candidate`

This is a recommendation for consolidation **review**, not authority to merge, redirect, canonicalize, delete, or deindex pages.

### 3. Material existing coverage

If UGP-6.3C reports:

`material_search_coverage_observed`

then:

`leave_alone`

The default policy protects already-working content instead of reflexively generating or refreshing it.

A future decay/refresh milestone may supply separate evidence that justifies revisiting that default.

### 4. Existing but weak/incomplete coverage

If UGP-6.3C reports any of:

- `search_presence_observed_technical_state_unverified`;
- `search_presence_observed_below_materiality`;
- `page_topic_signal_observed_without_search_evidence`

then:

`refresh_candidate`

Existing topic/page evidence takes precedence over proposing a new page.

### 5. New-page candidate

A `create_candidate` is allowed only when all of the following are true:

- business relevance meets the threshold;
- UGP-6.3B does not show material multi-page competition;
- UGP-6.3C reports `no_matching_topic_evidence_in_supplied_scope`;
- the supplied UGP-6.3A crawl inventory is not partial;
- query/page evidence was supplied.

The model still preserves:

`whole_site_not_independently_certified`

and adds:

`whole_site_absence_not_independently_certified`

to the candidate limitations.

Therefore `create_candidate` means:

> creation is supported inside the complete **observed evidence scope**,

not:

> SEO ENGINE has proved this topic does not exist anywhere on the entire site.

### 6. Insufficient evidence

If the safe create/refresh/consolidate/leave-alone rules cannot be satisfied:

`defer_insufficient_evidence`

This is preferable to inventing an article opportunity from keyword existence alone.

## Recommended content type

UGP-6.4 derives a bounded content-type suggestion from the dominant UGP-6.2 cluster intent:

- informational → `article_or_guide`;
- commercial → `comparison_or_category`;
- transactional → `landing_or_product_support`;
- navigational → `navigation_or_brand_support`;
- tied/unknown intent → `mixed_or_unknown_intent_review`.

This is an advisory content-type classification only.

It does not generate a page, article brief, outline, or draft.

## Existing coverage

Every opportunity record preserves the exact UGP-6.3C coverage state.

The model does not collapse:

- material coverage;
- weak search presence;
- page-side topic signals;
- missing evidence;
- no matching evidence in supplied scope

into a single covered/uncovered boolean.

## Cannibalization

Every opportunity also preserves the exact UGP-6.3B cannibalization state.

Positive multi-page competition takes precedence over create or refresh recommendations because the roadmap requires existing ranking content to be protected from naive cannibalization.

## Expected measurement

UGP-6.4 emits an expected measurement method.

For create/refresh/consolidate candidates:

`gsc_query_page_before_after_observational`

For leave-alone:

`ongoing_search_observation`

For deferred candidates:

`not_planned_until_evidence_complete`

All measurement semantics explicitly state:

`causalAttribution = false`

A before/after movement is observational and must not be represented as proof that the content action caused the change.

## Cross-contract lineage

The model fails closed unless:

- clustering, cannibalization, and coverage use the same exact search market;
- UGP-6.3B points to the exact supplied clustering fingerprint;
- UGP-6.3C points to the exact supplied clustering fingerprint;
- UGP-6.3B and UGP-6.3C point to the same UGP-6.3A ownership evidence fingerprint;
- every cluster has exactly one coverage assessment;
- every cluster has exactly one cannibalization assessment;
- every cluster has exactly one business-relevance evidence record.

This prevents cross-site, cross-market, or stale-evidence opportunity synthesis.

## Deterministic output

Each opportunity contains:

- opportunity ID;
- opportunity fingerprint;
- cluster fingerprint;
- representative keyword / target topic;
- dominant search intent;
- recommended content type;
- recommended action;
- exact existing coverage state;
- exact cannibalization state;
- business relevance and its evidence fingerprint;
- upstream assessment fingerprints;
- expected measurement method;
- limitations;
- deterministic rationale codes.

The complete result has a deterministic model fingerprint.

## Safety semantics

Every result permanently declares:

- `readOnly = true`;
- `deterministic = true`;
- `evidenceBacked = true`;
- `grantsAuthorization = false`;
- `grantsProviderWrite = false`;
- `grantsPublicSiteWrite = false`;
- `performsNetworkOperation = false`;
- `performsPersistence = false`;
- `publicationAuthorized = false`;
- `executionAuthorized = false`;
- `causalAttribution = false`.

UGP-6.4 cannot authorize:

- article generation;
- page creation;
- page rewrite;
- redirects;
- canonical changes;
- page deletion;
- deindexing;
- publication;
- provider writes;
- database writes;
- scheduler/worker/autonomous execution.

## Relationship to existing P6 opportunity infrastructure

The repository already contains broader normalized opportunity, scoring, prioritization, actionability, and lifecycle contracts.

UGP-6.4 does not modify or bypass those existing contracts.

This milestone establishes the **UGP content-intelligence decision boundary** first.

A later integration package can map certified UGP-6.4 records into the general opportunity framework without weakening either contract family.

## Tests

The synthetic suite verifies:

- material existing coverage defaults to leave-alone;
- exact-query collision becomes consolidate candidate;
- weak search presence becomes refresh candidate;
- page metadata topic evidence becomes refresh candidate;
- create candidate requires complete observed inventory plus query evidence;
- partial inventory blocks create;
- missing query/page evidence blocks create;
- business relevance explicitly gates action candidacy;
- recommended content type is deterministic from cluster intent;
- incomplete business relevance evidence fails closed;
- cross-contract lineage mismatch fails closed;
- deterministic output;
- non-authorizing semantics;
- output fingerprint tamper rejection.

## Explicit exclusions

UGP-6.4 does not:

- call DataForSEO;
- call Google Search Console;
- call OpenAI;
- crawl a website;
- persist an opportunity;
- modify current P6 opportunity records;
- calculate a cross-opportunity priority;
- claim causal SEO impact;
- research sources;
- generate a brief;
- generate an article;
- publish;
- mutate public sites or providers;
- deploy;
- change Railway;
- activate schedulers/workers/autonomous execution.

## UGP-6 exit boundary

UGP-6.1 through UGP-6.4 together now provide the intended Content Intelligence chain:

`keyword/SERP evidence`
→ `topic clusters`
→ `site ownership evidence`
→ `cannibalization + coverage guard`
→ `evidence-backed content opportunity decision`

The next roadmap milestone after UGP-6.4 is **UGP-7.1 — Research Plan**.

UGP-7.1 should consume a certified UGP-6.4 content opportunity and transform it into explicit research questions, required evidence classes, and a source-discovery plan without yet generating an article.
