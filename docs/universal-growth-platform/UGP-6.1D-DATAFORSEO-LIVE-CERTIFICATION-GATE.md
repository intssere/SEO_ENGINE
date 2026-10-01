# UGP-6.1D — One-Shot DataForSEO Live Certification Gate

## Status

**REPOSITORY-ONLY GATE DEFINITION — LIVE EXECUTION STILL DISABLED**

## Purpose

UGP-6.1D closes the ambiguity between the merged controlled transport and a future live provider certification by defining one immutable certification plan and explicit pass/fail rules.

## Exact one-shot scope

The certification is limited to:

- source commit: bf3d7c32c7dcbe6b9c49b8652788a0aab6e058aa;
- keyword: stress relief journal;
- search engine: Google;
- location code: 2840;
- language code: en;
- device: desktop;
- credential profile ID: dataforseo-primary;
- exactly three datasets: keyword_overview, related_keywords, serp_advanced;
- exactly three provider calls;
- exactly one provider task per call;
- maximum concurrency: 1;
- maximum attempts per call: 1;
- automatic retry: disabled;
- total provider-reported cost ceiling: USD 1.00.

The USD 1.00 ceiling is a certification safety bound, not an assertion of current vendor price. DataForSEO endpoint documentation states that these requests are paid and directs users to its pricing calculation; therefore the gate evaluates the provider-reported task costs returned in captured evidence.

## Pass rules

A certification passes only when all of the following are true:

- captured source commit exactly equals the plan source commit;
- normalized request fingerprint exactly equals the plan request fingerprint;
- all three endpoint fingerprints exactly match the controlled requests;
- captured attestation asserts zero credentials, writes, persistence, scheduling, and autonomy;
- exactly three provider provenance records exist;
- every provider-reported task cost is present, finite, and non-negative;
- total provider-reported cost is <= USD 1.00.

Any mismatch produces a failed decision and no accepted certification fingerprint.

## Live execution remains separately authorized

This PR does not execute DataForSEO.

A future live run still requires explicit authorization naming the one-shot DataForSEO certification run. A generic continue instruction does not authorize provider execution or credential use.

## No authority expansion

The plan permanently binds:

- providerWrites = false;
- publicSiteWrites = false;
- persistence = false;
- scheduling = false;
- autonomousExecution = false;
- publication = false.

Passing certification proves only that the bounded read-only evidence acquisition behaved as specified. It does not authorize content generation, publication, site mutation, provider mutation, scheduler activation, or broader DataForSEO usage.
