# UGP-6.1C — DataForSEO Live Certification Specification

## Status

**OFFLINE CERTIFICATION CONTRACT ONLY — NO LIVE PROVIDER EXECUTION**

## Purpose

UGP-6.1C defines how one separately authorized bounded DataForSEO live acquisition can later be captured and certified without allowing the live act itself to grant authority or mutate product state.

## Separation of concerns

Live acquisition and certification are separate:

1. A future explicitly authorized live step may execute the already-merged UGP-6.1B controlled transport for one exact keyword/market scope.
2. The three raw provider responses are captured outside the normalized evidence model.
3. This UGP-6.1C attestor validates those captured observations offline.
4. The attestor emits normalized UGP-6.1A evidence plus fingerprints and safety assertions only.

UGP-6.1C itself performs no provider/network operation.

## Exact certification scope

A certification binds:

- exact source commit SHA;
- exact normalized keyword/market request fingerprint;
- exact three-dataset set: keyword_overview, related_keywords, serp_advanced;
- exact effective DataForSEO endpoint for each dataset;
- HTTP status/content type/response byte bounds;
- deterministic raw-observation fingerprints;
- deterministic normalized evidence fingerprint;
- deterministic final certification fingerprint.

## Mandatory live execution limits

A future live execution authorization must preserve the merged UGP-6.1B limits:

- exactly one keyword/market request;
- exactly three provider calls;
- one provider task per request;
- sequential execution;
- maximum concurrency 1;
- one attempt per paid call;
- no automatic retry;
- exact DataForSEO endpoint allowlist;
- explicit cost-boundary acceptance;
- exact credential-profile binding;
- zero provider/public-site writes;
- zero persistence;
- zero scheduling/autonomy;
- zero publication.

## Offline attestation guarantees

The attestation result records:

- offlineOnly = true;
- networkCalls = false;
- credentialsPresent = false;
- providerWrites = false;
- publicSiteWrites = false;
- persistence = false;
- scheduling = false;
- autonomousExecution = false.

Credential material and Authorization headers are not inputs to the attestor and cannot appear in its output.

## Tests

The tests certify:

- deterministic exact three-response attestation;
- exact source-commit binding;
- exact dataset set;
- exact endpoint identity;
- HTTP/content-type/size bounds;
- tamper-sensitive evidence/certification fingerprints;
- absence of network/environment/credential code in the attestation module.

## Explicit exclusions

This slice does not:

- execute DataForSEO;
- read credentials;
- add environment variables or secrets;
- create API routes;
- add DB/schema/persistence;
- add cache or scheduler behavior;
- activate workers/autonomy;
- add UI;
- perform clustering/cannibalization/opportunity scoring;
- generate or publish content;
- deploy or publish anything.

## Future live gate

Actual DataForSEO execution remains blocked until the user gives a separate explicit authorization that names the bounded live certification action. A generic continue instruction does not authorize that provider call.
