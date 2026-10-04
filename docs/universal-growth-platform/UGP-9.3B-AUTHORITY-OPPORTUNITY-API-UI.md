# UGP-9.3B — Authority Opportunity API + Customer UI

## Status

Implementation PR candidate for the isolated Universal Growth Platform initiative.

## Purpose

UGP-9.3B exposes the certified UGP-9.3A authority-opportunity discovery model through an authenticated read-only API and a customer-facing Authority workspace.

## Runtime source boundary

The API uses a replaceable runtime projection source.

Default state is deliberately unavailable:

- no durable source configured;
- no synthetic opportunity rows;
- no provider request;
- no persistence;
- no fallback fixture.

A configured source must return a UGP-9.3A discovery object that passes integrity validation before it is exposed.

Source exceptions and invalid objects fail closed into a generic customer-safe unavailable state.

## API

Authenticated endpoint:

`GET /api/authority/opportunities`

It is mounted after the existing global API authentication middleware.

Response states:

- `available`: a validated UGP-9.3A discovery is present;
- `unavailable`: no source, no discovery, source failure, or integrity failure.

The response also states that the endpoint does not authorize:

- provider execution;
- scoring;
- prospect qualification;
- outreach;
- public-site writes.

## Customer UI

Route:

`/authority/opportunities`

The Authority hub exposes the route as an available customer workspace.

The page shows:

- target domain;
- total discovered opportunities;
- opportunity class;
- source domain;
- owned target URL where present;
- competitor domains where present;
- observed timestamp;
- evidence rationale code.

The page does not display a score because UGP-9.3A does not produce one.

It explicitly states that prospect qualification, scoring, and outreach remain separate controls.

When no durable discovery source exists, the page renders an honest unavailable state with `NO SYNTHETIC FALLBACK`.

## OpenAPI

`lib/api-spec/openapi.yaml` documents the authenticated read endpoint and its closed semantics.

The customer view intentionally uses a same-origin authenticated GET directly rather than regenerating the generated client in this bounded increment.

## Tests

The read-model tests cover:

1. default unavailable state with no synthetic fallback;
2. validated discovery exposure;
3. null source result;
4. source failure sanitization.

UGP-9.3A already covers discovery determinism, evidence binding, basis checks, tamper detection, and safety semantics.

## Safety boundary

UGP-9.3B performs no:

- DataForSEO or other provider HTTP;
- credential resolution/use;
- backlink/opportunity persistence;
- schema/database mutation;
- scheduler/worker/autonomy;
- opportunity scoring;
- prospect qualification;
- contact discovery;
- outreach;
- provider writes;
- public-site writes;
- Railway or production mutation.

## Dependency note

PR #839 remains unmerged and is not a dependency of this increment. UGP-9.3B is based solely on the current initiative branch containing certified UGP-9.3A.

## Next milestone

UGP-9.4 can now define transparent prospect qualification and scoring over certified discovery candidates without changing the discovery evidence itself.
