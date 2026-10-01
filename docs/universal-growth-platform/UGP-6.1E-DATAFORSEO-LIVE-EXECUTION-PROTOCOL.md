# UGP-6.1E — DataForSEO One-Shot Live Execution Protocol

## Status

**REPOSITORY-ONLY EXECUTION PROTOCOL — NO LIVE PROVIDER EXECUTION**

## Purpose

UGP-6.1E defines the exact orchestration boundary for the future one-shot DataForSEO certification run.

It does not execute DataForSEO itself, access credentials, add runtime wiring, or activate any provider operation.

## Certification basis

The live certification basis is fixed to:

`9526c9409b9d8ad22dc5759b7e80cc71da6ba718`

This is the initiative merge commit that contains the merged UGP-6.1A normalized adapter, UGP-6.1B controlled transport, UGP-6.1C captured-evidence attestor, and UGP-6.1D one-shot certification gate.

This supersedes the earlier pre-6.1D source-commit example in the UGP-6.1D document for actual execution lineage.

## Exact execution scope

The protocol builds the already-certified one-shot plan:

- keyword: stress relief journal;
- Google;
- location code 2840;
- language en;
- desktop;
- credential profile ID dataforseo-primary;
- datasets: keyword_overview, related_keywords, serp_advanced;
- exactly three calls;
- exactly one task per call;
- sequential execution;
- concurrency 1;
- one attempt per call;
- no automatic retry;
- total provider-reported cost ceiling USD 1.00.

## Explicit execution authorization

The protocol requires an explicit authorization record that binds:

- authorization ID;
- certification-basis commit;
- exact plan fingerprint;
- credential profile ID;
- explicit live-provider execution approval;
- exact-three-call approval;
- provider-cost-ceiling acceptance;
- zero persistence;
- zero scheduling;
- zero publication;
- zero provider writes;
- zero public-site writes.

The authorization record is integrity-fingerprinted and is checked before the injected executor can be invoked.

A generic continue instruction is not sufficient to create or use a live execution authorization.

## Injected executor boundary

The repository protocol does not implement network or credential access.

A future separately authorized live run must supply an executor that receives only:

- dataset;
- exact controlled URL;
- exact deterministic body;
- timeout;
- credential profile ID.

The executor may resolve credentials only for that one authorized run. Credentials and authorization headers must never be returned to the protocol or included in receipts.

## Captured evidence

Each of the three returned provider responses is checked for:

- exact effective URL;
- 2xx HTTP status;
- JSON content type;
- response byte bounds;
- valid JSON object payload.

The three observations are then passed to the merged UGP-6.1C offline attestor and evaluated by the merged UGP-6.1D pass/fail gate.

## Receipt

The final receipt contains:

- certification-basis commit;
- authorization fingerprint;
- plan fingerprint;
- exact dataset set;
- observation fingerprints;
- offline certification;
- pass/fail decision;
- provider-reported total cost;
- deterministic receipt fingerprint;
- explicit zero-write/zero-persistence/zero-scheduling/zero-publication assertions.

It contains no credential material.

## Explicit exclusions

UGP-6.1E does not:

- execute DataForSEO during CI or repository work;
- read credentials or environment variables;
- call global fetch;
- add an API route;
- wire into runtime startup;
- persist raw or normalized provider data;
- add scheduling/workers/autonomy;
- publish content;
- mutate a provider or public site;
- deploy or publish anything.

## Future live command boundary

After this protocol is merged and exact-head CI is green, a real live run still requires a new explicit user authorization naming the one-shot DataForSEO certification run against the certified basis commit.

Only then may an authorized executor be connected for exactly the three bounded provider calls.
