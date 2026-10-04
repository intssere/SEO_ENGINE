# UGP-9.1C — Controlled Backlink Acquisition / Certification Boundary

Version: `ugp-9-1c-dataforseo-backlink-controlled-acquisition-v1`

## Status

IMPLEMENTATION CANDIDATE — CONTROLLED ONE-SHOT ACQUISITION CONTRACT ONLY

## Purpose

UGP-9.1C adds the controlled acquisition and certification boundary for DataForSEO backlink evidence.

UGP-9.1A established the provider-neutral backlink evidence model.

UGP-9.1B established deterministic normalization of captured DataForSEO backlink responses.

UGP-9.1C now defines the exact paid/live call shape, certification plan, explicit authorization contract, one-shot injected execution seam, and immutable receipt required before a future production integration can acquire backlink evidence.

No live provider call is performed by this milestone itself.

## Provider endpoint

The only allowed endpoint is:

`POST https://api.dataforseo.com/v3/backlinks/backlinks/live`

The controlled request contains exactly one provider task.

The certified task is fixed to:

- normalized domain target;
- `mode: "as_is"`;
- `backlinks_status_type: "all"`;
- `include_subdomains: true`;
- `exclude_internal_backlinks: true`;
- `offset: 0`;
- `limit: 100`;
- explicit `rank_scale`:
  - `one_hundred`; or
  - `one_thousand`.

There are no filters, custom grouping, arbitrary offsets, or search-after tokens in the certified one-shot request.

## Why one bounded page

The DataForSEO endpoint supports pagination and can return up to 1000 backlinks per request.

UGP-9.1C deliberately certifies only one bounded page of 100 backlinks.

The purpose is to prove:

- endpoint identity;
- request determinism;
- credential boundary;
- response validation;
- cost fencing;
- evidence normalization;
- provenance;
- explicit authorization mechanics.

It does not certify exhaustive backlink acquisition.

If DataForSEO reports `total_count > items_count`, UGP-9.1B retains the limitation that the captured response is not the full backlink universe.

Automatic pagination is deferred.

## Controlled request identity

Every controlled request has a deterministic fingerprint bound to:

- UGP-9.1C version;
- exact evidence request fingerprint;
- exact provider URL;
- canonical request body.

Equivalent input produces the same request identity.

## Certification plan

A certification plan binds:

- exact source commit SHA;
- exact source fingerprint;
- exact evidence request fingerprint;
- exact market fingerprint;
- exact category fingerprint;
- target domain;
- rank scale;
- exact controlled request;
- credential profile ID `dataforseo-primary`;
- cost ceiling;
- runtime safety policy.

The plan is immutable and fingerprinted.

Any drift in the controlled request or safety limits causes plan integrity validation to fail.

## Runtime limits

The certified runtime policy is:

- max calls: 1;
- max attempts per call: 1;
- automatic retry: false;
- max concurrency: 1;
- timeout: 15 seconds;
- max response size: 5 MB;
- provider-reported cost ceiling: USD 1.00;
- persistence: false;
- scheduling: false;
- autonomous execution: false;
- outreach: false;
- provider writes: false;
- public-site writes: false.

## Explicit authorization contract

Possession of a plan is not execution authority.

A separate immutable authorization object must explicitly affirm:

- live provider execution is authorized;
- exactly one call is authorized;
- provider cost ceiling is accepted;
- zero persistence;
- zero scheduling;
- zero autonomous execution;
- zero outreach;
- zero provider writes;
- zero public-site writes.

The authorization is fingerprint-bound to:

- authorization ID;
- exact source commit;
- exact plan fingerprint;
- exact credential profile.

If the authorization and plan do not match exactly, execution fails before the injected executor is called.

## Injected execution seam

UGP-9.1C does not implement an HTTP client or credential resolver.

Instead it defines an injected executor interface.

A future separately authorized caller may supply an executor that receives only:

- exact allowlisted URL;
- exact serialized request body;
- exact timeout;
- allowlisted credential profile ID.

The executor returns:

- effective URL;
- HTTP status;
- content type;
- response body text;
- explicit observation timestamp.

This keeps credential material out of the UGP-9.1C result and allows provider transport to remain independently controlled.

## Response validation

Before normalization, UGP-9.1C verifies:

- effective URL is exactly the allowlisted endpoint;
- HTTP status is 2xx;
- content type is JSON;
- response size is within bounds;
- response parses as JSON;
- provider cost exists and is non-negative;
- provider cost is within the plan ceiling.

The provider payload is then passed to the merged UGP-9.1B adapter.

UGP-9.1B and UGP-9.1A integrity checks remain mandatory.

## Receipt

A successful one-shot execution creates a deterministic receipt containing:

- source commit SHA;
- plan fingerprint;
- authorization fingerprint;
- controlled request fingerprint;
- exact call count: 1;
- provider-reported cost;
- normalized UGP-9.1B evidence;
- safety assertions;
- receipt fingerprint.

The receipt explicitly records:

- one shot;
- no automatic retry;
- max concurrency 1;
- no persistence;
- no scheduling;
- no autonomous execution;
- no outreach;
- no provider writes;
- no public-site writes;
- credential material not returned.

## Relationship to existing DataForSEO controls

UGP-9.1C follows the safety architecture already established for UGP-6 DataForSEO acquisition:

- deterministic endpoint allowlisting;
- explicit credential profile identity;
- single-attempt paid-call limits;
- cost ceiling;
- effective-URL verification;
- JSON/size validation;
- captured-evidence normalization;
- explicit authorization separate from plan creation.

UGP-9.1C does not modify or weaken the existing UGP-6 transport or certification contracts.

## Test coverage

The bounded tests verify:

1. exact request URL and task body;
2. target-domain canonicalization;
3. exact single-call/no-retry certification policy;
4. plan fingerprint and controlled-request integrity;
5. explicit authorization binding;
6. authorization mismatch blocks before executor invocation;
7. exactly one injected executor call;
8. response normalization through UGP-9.1B and UGP-9.1A;
9. effective URL drift rejection;
10. non-JSON response rejection;
11. provider cost-ceiling rejection;
12. larger provider totals do not trigger automatic pagination;
13. source/request/market/category lineage survives acquisition;
14. no persistence/scheduling/autonomy/outreach authority is granted.

## Explicit non-goals

UGP-9.1C does not:

- perform a real DataForSEO call during implementation or tests;
- read DataForSEO secrets;
- create or rotate credentials;
- enroll or purchase provider access;
- perform automatic pagination;
- use search-after tokens;
- retry paid requests;
- persist backlink evidence;
- create database migrations;
- schedule backlink refresh jobs;
- enable a worker;
- discover authority opportunities;
- score prospects;
- discover contacts;
- draft or send outreach;
- create reciprocal-link networks;
- purchase ranking links;
- write to provider resources;
- write to customer websites;
- mutate Railway or production configuration.

## Next boundary

After UGP-9.1C is merged and certified, the next product milestone is expected to be **UGP-9.2 — Authority Dashboard**, projecting normalized evidence into customer-facing referring-domain, new/lost, linked-page, anchor, competitor-gap, and trend views.

Any actual live provider certification remains a separate explicit authorization event.
