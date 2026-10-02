# UGP-7.1 — Research Plan

## Status

IMPLEMENTATION CANDIDATE — PURE / READ-ONLY / NETWORK-FREE / PERSISTENCE-FREE

## Purpose

UGP-7.1 transforms one certified UGP-6.4 content opportunity into a deterministic research plan.

It defines:

- research questions;
- required evidence classes;
- source-discovery channels;
- deterministic stop conditions;
- exact upstream provenance.

It does **not** acquire sources, browse the web, verify claims, generate article prose, persist research, or authorize publication.

## Version

`ugp-7-1-research-plan-v1`

## Input boundary

The builder consumes:

- one integrity-checked `ContentOpportunityModelResult`;
- one exact `opportunityId` contained by that certified model.

This is deliberate.

UGP-7.1 does not accept a free-form topic string because doing so would bypass the UGP-6 evidence chain.

The plan preserves the exact opportunity fingerprint and all relevant upstream fingerprints.

## Research-eligible actions

Only these UGP-6.4 actions can enter UGP-7.1:

- `create_candidate`;
- `refresh_candidate`;
- `consolidate_candidate`.

The builder fails closed for:

- `leave_alone`;
- `defer_insufficient_evidence`.

A leave-alone opportunity should not silently become an article project, and a deferred opportunity must obtain missing evidence before research planning continues.

## Required evidence classes

UGP-7.1 can require these normalized evidence classes:

- `search_intent_context`;
- `existing_site_content`;
- `primary_authoritative_sources`;
- `current_secondary_sources`;
- `first_party_business_evidence`;
- `comparative_evidence`;
- `definitions_and_background`;
- `claim_verification`;
- `freshness_and_date_evidence`;
- `measurement_baseline`.

Every plan includes the evidence classes needed to preserve current search context, existing site coverage, business facts, important factual claims, freshness, and later observational measurement.

Commercial/comparison opportunities add `comparative_evidence`.

Informational, unknown, or mixed-intent opportunities add `definitions_and_background`.

## Research questions

Every plan includes deterministic questions covering:

1. search intent and user need;
2. existing site coverage and differentiation;
3. important claims that require primary-source support;
4. current facts that require recent secondary confirmation;
5. business-specific facts that require first-party evidence;
6. baseline measurements for later observational evaluation.

Additional questions are action-specific.

### Create candidate

Adds a question defining what evidence is needed to create genuinely new coverage without duplicating current site material.

### Refresh candidate

Adds a question identifying which parts of the current coverage are outdated, incomplete, or insufficiently evidenced.

### Consolidate candidate

Adds a question mapping overlap, divergence, and unique supported material across competing pages.

Commercial intent also adds a comparison-dimensions question.

Informational/mixed/unknown intent also adds a definitions-and-background question.

## Discovery channels

UGP-7.1 defines a source-discovery **plan**, not source acquisition.

Supported channels are:

- `certified_upstream_evidence`;
- `site_inventory`;
- `official_primary_sources`;
- `reputable_secondary_sources`;
- `standards_or_regulatory_sources`;
- `current_search_context`;
- `first_party_business_sources`.

Each discovery step includes:

- deterministic order;
- channel;
- purpose code;
- evidence classes it must satisfy;
- explicit stop condition;
- deterministic fingerprint.

The planner never inserts a source URL, citation, quote, extracted claim, or factual assertion.

Those belong to UGP-7.2 source acquisition and evidence ledger.

## Discovery order

The base sequence is:

1. freeze the certified upstream content-intelligence lineage;
2. map existing site content;
3. collect first-party business evidence targets;
4. identify official/primary source targets;
5. identify reputable current secondary source targets;
6. validate current search context.

Commercial opportunities add a comparative-evidence step.

Informational/mixed/unknown opportunities add a standards/regulatory/background step.

The order is deterministic and bounded.

## Stop conditions

Every discovery step has a plain deterministic stopping rule.

Examples include:

- exact UGP-6.4 lineage captured;
- relevant supplied site pages identified;
- every planned business-specific claim has a first-party evidence requirement or is excluded;
- important factual claim areas have primary-source targets where reasonably expected;
- time-sensitive claims have current independent evidence targets.

A stop condition is a planning requirement only.

UGP-7.1 does not evaluate whether it has actually been satisfied because source acquisition has not occurred yet.

## Provenance

Every research plan binds:

- content opportunity model fingerprint;
- content opportunity fingerprint;
- topic clustering fingerprint;
- coverage assessment fingerprint;
- cannibalization assessment fingerprint;
- business relevance evidence fingerprint.

The research plan therefore cannot silently detach from the evidence that caused the opportunity to exist.

## Limits

The v1 policy caps:

- research questions: 12;
- evidence classes: 12;
- discovery steps: 12.

The implementation fails closed if those bounds are exceeded.

## Limitations propagated into the plan

UGP-7.1 preserves all UGP-6.4 opportunity limitations.

It additionally adds:

- `source_acquisition_not_performed`;
- `claim_verification_not_performed`;
- `article_generation_not_performed`.

This prevents downstream users from treating a research plan as completed research.

## Safety semantics

Every research plan permanently declares:

- `readOnly = true`;
- `deterministic = true`;
- `planningOnly = true`;
- `performsNetworkOperation = false`;
- `performsSourceAcquisition = false`;
- `performsPersistence = false`;
- `generatesArticleText = false`;
- `generatesClaims = false`;
- `verifiesClaims = false`;
- `grantsAuthorization = false`;
- `publicationAuthorized = false`;
- `executionAuthorized = false`.

UGP-7.1 cannot:

- browse;
- fetch pages;
- call a search API;
- call an LLM;
- quote sources;
- verify facts;
- create an evidence ledger;
- draft an outline;
- draft an article;
- modify a page;
- publish;
- persist research;
- authorize provider/public-site writes.

## Determinism and integrity

Every question receives:

- question ID;
- question fingerprint.

Every discovery step receives:

- step ID;
- step fingerprint.

The complete plan receives:

- plan ID;
- plan fingerprint.

The integrity assertion verifies:

- version;
- eligible action;
- bounded collection sizes;
- exact discovery-step order;
- required fingerprints;
- complete plan fingerprint;
- deterministic plan ID;
- permanently closed safety semantics.

## Tests

The synthetic suite verifies:

- create-candidate planning;
- refresh-specific research delta;
- consolidation-specific overlap mapping;
- commercial comparison evidence;
- informational background evidence;
- leave-alone rejection;
- insufficient-evidence rejection;
- unknown opportunity-ID rejection;
- deterministic plan reproduction;
- exact upstream lineage preservation;
- plan fingerprint mutation rejection;
- non-authorizing planning-only semantics.

## Explicit exclusions

UGP-7.1 does not:

- acquire sources;
- inspect web pages;
- use OpenAI;
- use DataForSEO;
- use Search Console;
- crawl sites;
- persist evidence;
- store citations;
- verify claims;
- generate a brief;
- generate an outline;
- generate article text;
- publish;
- deploy;
- modify Railway;
- activate schedulers/workers/autonomous execution.

## Follow-on milestone

The next roadmap milestone is **UGP-7.2 — Source Acquisition and Evidence Ledger**.

UGP-7.2 should consume a certified UGP-7.1 plan and normalize actual acquired source identity, publication/update date where available, extracted evidence, claim relevance, source-quality signals, and source fingerprints.

Source acquisition must remain separate from article generation and publication authority.
