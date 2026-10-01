# UGP-6.1B — Controlled DataForSEO Transport

## Status

**IMPLEMENTATION CANDIDATE — CONTROLLED TRANSPORT / NO RUNTIME ACTIVATION**

## Purpose

UGP-6.1B places a bounded DataForSEO transport behind the provider-neutral UGP-6.1A evidence adapter.

The transport is implemented and testable with injected fixtures, but this slice does not wire it into the API runtime, environment secrets, scheduler, workers, UI, or autonomous execution.

## Provider contract verified

DataForSEO currently uses HTTP Basic authentication on each API request. The selected endpoints are paid POST endpoints.

Allowlisted endpoints:

- /v3/dataforseo_labs/google/keyword_overview/live
- /v3/dataforseo_labs/google/related_keywords/live
- /v3/serp/google/organic/live/advanced

## Transport policy

The controlled transport enforces:

- HTTPS origin fixed to https://api.dataforseo.com;
- POST only;
- exactly one provider task per request;
- exactly three calls per keyword/SERP acquisition;
- sequential execution with maximum concurrency 1;
- one attempt per paid provider call;
- no automatic retry;
- 15 second per-call timeout contract passed to the injected client;
- JSON response content type;
- bounded response size;
- fail-closed HTTP, transport, JSON, and provider task errors;
- no provider-write or public-site-write authority.

SERP requests use depth 10 to bound the paid result depth.

## Credential boundary

The transport receives only a credential profile identifier at its public acquisition boundary.

Raw DataForSEO login/password material is resolved by an injected credential resolver inside the transport call and is used only to build the Basic authorization header.

Credential material is not included in normalized evidence, provenance, fingerprints, errors, or return values.

This slice adds no environment variables and no repository secrets.

## Adapter compatibility hardening

UGP-6.1B also aligns the merged UGP-6.1A adapter with current provider response shapes:

- task path arrays are normalized into deterministic slash-separated provenance paths;
- Related Keywords metrics are read from the provider's keyword_data nesting;
- existing simplified frozen fixtures remain compatible.

## Authority boundary

The transport policy permanently states:

- grantsAuthorization = false;
- grantsProviderWrite = false;
- grantsPublicSiteWrite = false;
- returnsCredentialMaterial = false.

A transport connection or successful provider response never authorizes content generation, publication, provider mutation, or public-site mutation.

## Runtime isolation

In this slice:

- artifacts/api-server/src/index.ts does not import the controlled transport;
- build/runtime entrypoints do not activate DataForSEO acquisition;
- transport source does not read process.env;
- transport source does not call global fetch directly;
- HTTP and credential mechanisms are injected;
- no scheduler/worker/autonomous path is added.

## Tests

Tests certify:

- exact endpoint allowlist;
- one-task request bodies;
- market/device propagation;
- deterministic gate/request fingerprints;
- sequential three-call acquisition;
- Basic credentials remain internal;
- normalized evidence is the only acquisition return value;
- provider-shaped path and Related Keywords normalization;
- invalid gate fails before credential resolution or HTTP;
- transport failure performs no automatic retry;
- HTTP errors, non-JSON responses, malformed JSON, and oversized bodies fail closed;
- API runtime remains unconnected to the transport.

## Explicit exclusions

UGP-6.1B does not:

- perform a real DataForSEO request;
- add live credentials or secrets;
- add environment variables;
- add database/schema changes;
- persist provider results;
- add caching or refresh scheduling;
- add workers or autonomous jobs;
- add UI;
- perform topic clustering;
- perform cannibalization analysis;
- score content opportunities;
- generate or publish articles;
- change any existing authorization gate;
- deploy or publish anything.

## Live certification gate

A real DataForSEO call requires a separately authorized bounded live certification after this PR is merged and exact-head CI is green.

That live certification must bind:

- exact initiative commit;
- exact endpoint set;
- exact credential profile;
- explicit commercial-use acceptance;
- explicit credential-injection review;
- explicit cost-boundary acceptance;
- provider-write separation certification;
- a bounded keyword/market fixture;
- zero persistence, scheduling, publication, or mutation.

Until that separate authorization, UGP-6.1B remains repository-only engineering.
