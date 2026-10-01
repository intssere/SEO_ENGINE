# UGP-6.2A — Deterministic Topic Clustering Contract

## Status

**IMPLEMENTATION CANDIDATE — PURE / NETWORK-FREE / PERSISTENCE-FREE**

## Acceptance statement

> Given multiple normalized UGP-6.1 keyword/SERP evidence bundles in one explicit search market, a complete integrity-checked semantic-similarity matrix, and optional site/category/entity context, SEO ENGINE can deterministically form explainable topic clusters without provider-native payloads, network calls, persistence, publication authority, or runtime side effects.

## Purpose

UGP-6.2A establishes the provider-neutral clustering boundary for Content Intelligence.

It consumes only normalized UGP-6.1 evidence. It does not consume DataForSEO response envelopes and does not perform live keyword, SERP, embedding, LLM, database, or website operations.

## Inputs

Each clustering candidate contains:

- one `KeywordSerpEvidenceBundle`;
- category context;
- entity context.

All candidates must:

- have distinct evidence fingerprints;
- have distinct case-normalized keywords;
- share one exact search market;
- preserve the permanent UGP-6.1 read-only safety semantics.

The clusterer supports 2–200 candidates per deterministic invocation.

## Semantic similarity boundary

UGP-6.2A does not choose or call an embedding model.

Semantic similarity is supplied as explicit evidence for every candidate pair.

Each pair records:

- left evidence fingerprint;
- right evidence fingerprint;
- similarity in `[0,1]`;
- semantic model identifier;
- deterministic semantic-evidence fingerprint.

The full pair matrix is mandatory. Missing, duplicated, self-referential, unknown-candidate, out-of-range, or fingerprint-corrupted semantic evidence fails closed.

This separation allows a future UGP-6.2B semantic adapter to be reviewed independently.

## Pairwise evidence

Every candidate pair receives four normalized signals:

1. **SERP overlap**
   - top 10 organic results only;
   - query strings and fragments do not affect canonical URL identity;
   - overlap coefficient = common canonical URLs / smaller result-set size.

2. **Semantic similarity**
   - supplied by the integrity-checked semantic evidence matrix.

3. **Intent compatibility**
   - same intent = 1.0;
   - unknown paired with any intent = 0.5;
   - commercial + transactional = 0.75;
   - informational + commercial = 0.25;
   - other cross-intent combinations = 0.

4. **Context similarity**
   - deterministic Jaccard similarity over normalized category and entity sets;
   - category/entity dimensions with no observations are omitted;
   - when neither side has context, the context signal is neutral at 0.5.

## Affinity policy

The versioned policy is:

- SERP overlap weight: 0.45;
- semantic similarity weight: 0.35;
- intent compatibility weight: 0.10;
- context similarity weight: 0.10;
- minimum affinity: 0.60.

Any pair with intent compatibility `0` is hard-blocked regardless of semantic or SERP similarity.

Every pair emits:

- component scores;
- final affinity;
- eligibility;
- explicit rejection reasons;
- deterministic assessment fingerprint.

## Clustering algorithm

UGP-6.2A uses deterministic **complete-link agglomeration**.

Each keyword begins as a singleton cluster.

Two clusters may merge only when **every cross-cluster pair** is eligible under the versioned affinity policy.

When multiple merges are possible:

1. prefer the merge with the highest minimum cross-pair affinity;
2. break equal-score ties lexically by canonical cluster keyword order.

This prevents transitive bridge over-merging where A is close to B and B is close to C but A is not sufficiently close to C.

## Representative topic

The representative keyword for each final cluster is selected deterministically:

1. highest non-null search volume;
2. lexical keyword order as the tie-break.

This is a cluster label only. It is not a content-opportunity score or publishing recommendation.

## Determinism

Output is stable under:

- candidate input reordering;
- semantic-pair input reordering;
- left/right pair orientation;
- duplicate category/entity input values.

The result has a deterministic clustering fingerprint.

## Safety and authority boundary

UGP-6.2A permanently declares:

- `readOnly = true`;
- `deterministic = true`;
- `grantsAuthorization = false`;
- `grantsProviderWrite = false`;
- `grantsPublicSiteWrite = false`;
- `performsNetworkOperation = false`;
- `performsPersistence = false`.

It cannot authorize content generation, publication, provider mutation, public-site mutation, scheduling, or autonomous execution.

## Tests

The test suite verifies:

- deterministic output under reordered candidates and semantic pairs;
- URL canonicalization in SERP overlap;
- related-topic clustering;
- hard intent incompatibility blocking;
- complete-link protection against transitive bridge over-merging;
- mandatory full semantic matrix;
- semantic evidence fingerprint integrity;
- mixed-market rejection;
- permanent read-only/no-network/no-persistence semantics.

## Explicit exclusions

UGP-6.2A does not:

- call an embedding or LLM provider;
- select an embedding model;
- perform DataForSEO calls;
- collect additional SERPs;
- persist clusters;
- query GSC or crawl inventory;
- detect cannibalization;
- decide create vs refresh vs consolidate;
- score business relevance;
- generate content briefs or articles;
- publish content;
- add scheduler/worker/autonomous execution;
- change production configuration;
- deploy anything.

## Follow-on boundary

UGP-6.2B may add a bounded semantic-similarity adapter that produces the integrity-checked pair matrix consumed here.

UGP-6.3 can then combine deterministic topic clusters with crawl/index inventory and GSC page/query relations to classify coverage and cannibalization without reopening the UGP-6.2 clustering policy.
