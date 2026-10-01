# UGP-6.1A — Keyword/SERP Evidence Adapter Contract

## Status

**IMPLEMENTATION CANDIDATE — FIXTURE-ONLY / NETWORK-FREE**

## Acceptance statement

> Given frozen provider responses, SEO ENGINE can deterministically produce provider-neutral keyword, intent, related-topic, ranking-URL, and SERP-feature evidence with explicit market scope and provenance, while granting no authorization and performing no network or provider operation.

## Purpose

UGP-6.1A establishes the provider-neutral evidence boundary required by UGP-6.1 before any live keyword/SERP provider transport is introduced.

DataForSEO is the initial provider candidate, but no DataForSEO response type is exposed to downstream Content Intelligence modules.

## Boundary

The slice introduces:

- keyword-serp-evidence-contract.ts
  - explicit Google search market scope;
  - normalized keyword metrics;
  - normalized search intent;
  - normalized related-topic evidence;
  - normalized ranking-URL evidence;
  - normalized SERP feature evidence;
  - provider provenance;
  - deterministic request/evidence fingerprints;
  - permanent read-only/non-authorizing semantics.

- dataforseo-keyword-serp-adapter.ts
  - pure transformation of frozen DataForSEO-shaped fixture envelopes;
  - task-level status validation;
  - null-preserving metric normalization;
  - provider intent normalization;
  - SERP result-type preservation;
  - deterministic provider-response fingerprints.

## Explicit market scope

Every request binds:

- search engine;
- location code;
- language code;
- device.

No implicit market default is permitted.

Changing location, language, or device changes the deterministic request fingerprint.

## Normalized evidence

The first contract covers:

- search volume;
- keyword difficulty;
- CPC;
- paid competition;
- competition level;
- monthly searches;
- intent;
- related topics;
- ranking URLs;
- absolute/group rank;
- result type;
- organic/non-organic classification;
- SERP feature types.

Unavailable metrics remain null; they are never converted to zero.

Unknown provider intent becomes unknown; the adapter does not guess.

Unknown/new SERP result types are retained as provider-observed result types rather than silently coerced to organic.

## Provenance

Every normalized provider dataset records bounded provenance:

- provider;
- provider dataset;
- task ID when present;
- provider status code/message;
- provider path;
- provider-reported cost;
- response fingerprint.

Raw credentials, authorization headers, API keys, or provider credential material are not part of the contract.

## Authority and side-effect boundary

UGP-6.1A permanently declares:

- readOnly = true;
- grantsAuthorization = false;
- grantsProviderWrite = false;
- grantsPublicSiteWrite = false;
- performsNetworkOperation = false.

The adapter cannot authorize publishing, provider mutation, public-site mutation, or any other write.

## Error semantics

Provider fixture normalization fails closed when:

- the expected task envelope is missing or malformed;
- the task status code is outside the accepted success range;
- the expected result is missing or malformed.

An HTTP transport does not exist in this slice, so HTTP success cannot be mistaken for evidence success.

## Tests

The contract tests verify:

- explicit market scope;
- market-bound deterministic request fingerprints;
- invalid market rejection;
- permanent non-authorizing semantics.

The DataForSEO adapter tests verify:

- deterministic normalization from frozen fixtures;
- metric fidelity;
- null preservation;
- unknown-intent handling;
- ranking URL/result-type fidelity;
- non-organic results are not fabricated as organic;
- deterministic provenance;
- absence of credential material;
- task-level failure rejection;
- malformed-envelope rejection.

## Explicit exclusions

UGP-6.1A does not:

- make DataForSEO HTTP requests;
- add DataForSEO credentials;
- add environment variables or secrets;
- install a provider SDK;
- add database/schema changes;
- persist keyword/SERP evidence;
- add caching or refresh scheduling;
- add workers or autonomous jobs;
- add UI;
- perform clustering;
- perform cannibalization analysis;
- score content opportunities;
- generate or publish articles;
- change any existing authorization gate;
- deploy or publish anything.

## Follow-on boundary

A future UGP-6.1B may introduce a controlled DataForSEO transport only behind this normalized contract, with separate review for:

- credential lease/injection;
- endpoint allowlist;
- timeout/retry/rate controls;
- request-cost controls;
- bounded live certification.

UGP-6.2 and later Content Intelligence modules must consume normalized evidence rather than DataForSEO-native payloads.
