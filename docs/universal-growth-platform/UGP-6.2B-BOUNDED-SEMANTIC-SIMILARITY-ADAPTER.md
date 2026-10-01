# UGP-6.2B — Bounded Semantic-Similarity Adapter

## Status

**IMPLEMENTATION CANDIDATE — PROVIDER-NEUTRAL / INJECTED ENCODER / NO DIRECT NETWORK**

## Acceptance statement

> Given normalized UGP-6.2 clustering candidates and one explicitly identified embedding model, SEO ENGINE can create deterministic semantic documents, obtain exactly one bounded embedding batch through an injected encoder seam, validate the returned vectors, compute pairwise cosine similarity locally, and emit the complete integrity-checked semantic matrix required by UGP-6.2A without changing clustering policy or acquiring publication authority.

## Purpose

UGP-6.2A deliberately requires semantic evidence but does not perform semantic encoding.

UGP-6.2B fills that boundary while keeping provider transport separate. The adapter itself does not import an embedding SDK, read credentials, call `fetch`, persist vectors, or select a provider.

## Deterministic semantic documents

Each candidate is converted into a deterministic text document containing:

- keyword;
- known search intent;
- normalized category context;
- normalized entity context.

Context values are lower-cased, de-duplicated and sorted.

Documents are ordered by keyword and evidence fingerprint, so input ordering does not affect the generated batch.

Each document includes a deterministic fingerprint bound to:

- adapter version;
- evidence fingerprint;
- keyword;
- exact generated text.

Maximum document length is 2,048 characters.

## Bounded encoder seam

The injected encoder receives exactly:

- one explicit `modelId`;
- the complete deterministic document batch.

The adapter invokes that encoder **exactly once**.

Policy:

- maximum candidates/documents: 200;
- maximum encoder calls: 1;
- concurrency: 1;
- automatic retry: false.

The adapter does not expose arbitrary provider URL, headers, credentials, temperature, dimensions, or provider-specific request options.

A later provider-specific transport may implement the encoder seam under a separate authorization/certification boundary.

## Response validation

The returned batch must:

- report the exact requested model ID;
- contain exactly one vector per document;
- preserve vector order;
- use one consistent dimensionality;
- have between 8 and 8,192 dimensions;
- contain only finite numeric components;
- contain no zero-norm vector.

Any violation fails closed before semantic evidence is emitted.

## Similarity normalization

UGP-6.2B computes cosine similarity locally.

Cosine values are bounded to `[-1,1]`, then mapped deterministically to UGP-6.2A's required `[0,1]` range:

`normalized = (cosine + 1) / 2`

The normalized value is rounded to six decimal places.

Every unordered candidate pair is converted using UGP-6.2A's canonical `buildSemanticSimilarityEvidence`, so the resulting evidence fingerprints are directly compatible with the 6.2A matrix-integrity checks.

## Output

The result contains:

- adapter version;
- model ID;
- deterministic semantic documents;
- complete pairwise `SemanticSimilarityEvidence` matrix;
- bounded execution assertions;
- deterministic matrix fingerprint.

No raw provider response, request header, credential, authorization material, or provider-native payload is part of the result.

## Safety boundary

The adapter declares:

- read-only semantics;
- deterministic local post-processing;
- no authorization grant;
- no provider-write authority;
- no public-site-write authority;
- no persistence;
- one encoder call;
- concurrency one;
- no retry.

The injected encoder may eventually perform an external read-only provider call, but that transport is **not implemented or authorized by UGP-6.2B**.

## Tests

The 6.2B tests verify:

- one encoder call for the full batch;
- complete matrix generation;
- direct compatibility with UGP-6.2A clustering;
- deterministic document generation under reordered inputs/context;
- cosine normalization;
- model drift rejection;
- vector count mismatch rejection;
- vector dimension drift rejection;
- non-finite and zero-vector rejection;
- no retry on encoder failure;
- absence of credential/provider-control material from output.

## Explicit exclusions

UGP-6.2B does not:

- bind OpenAI, Cohere, Google, Voyage, or another embedding provider;
- install or call a provider SDK;
- make direct HTTP/network calls;
- add credentials or environment variables;
- store raw embeddings;
- persist similarity matrices;
- change UGP-6.2A weights, thresholds, intent rules, or clustering algorithm;
- call DataForSEO;
- query GSC/crawl/index inventory;
- classify cannibalization;
- generate or publish content;
- add runtime routes, workers, schedulers, or autonomous execution;
- deploy or mutate Production.

## Follow-on boundary

A future UGP-6.2C may evaluate and bind a specific embedding transport to the injected encoder seam with:

- exact provider/model allowlist;
- credential profile;
- batch/token/cost limits;
- timeout/retry controls;
- sanitized receipts;
- bounded live certification.

UGP-6.3 remains responsible for coverage and cannibalization analysis after the semantic clustering path is certified.
