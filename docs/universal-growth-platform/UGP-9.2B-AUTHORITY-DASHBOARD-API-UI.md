# UGP-9.2B — Authority Dashboard API + Customer UI Binding

Version: `ugp-9-2b-authority-dashboard-api-v1`

## Status

IMPLEMENTATION CANDIDATE — AUTHENTICATED READ-ONLY API + CUSTOMER UI / NO SYNTHETIC DATA

## Purpose

UGP-9.2B binds the merged UGP-9.2A Authority Dashboard projection into the customer product surface.

This increment adds:

- authenticated read endpoint:
  - `GET /api/authority/dashboard`;
- customer-facing `/authority/backlinks` page;
- Authority hub navigation to the new dashboard;
- explicit available / partial / unavailable states;
- honest no-data behavior when no durable backlink evidence source exists.

The reconciled Authority data surface serves `/authority/backlinks` alongside the already-merged `/authority/opportunities` view without overwriting UGP-9.3B.

## Runtime truthfulness

The repository currently has no durable UGP-9.1 backlink persistence source that can safely power a production Authority dashboard.

UGP-9.2B therefore does **not** invent one.

Default runtime behavior is:

- state: `unavailable`;
- projection: `null`;
- evidence readiness: `unavailable`;
- reason explains that no durable authority evidence source is configured;
- no synthetic fixture fallback is used.

This is intentional.

## Projection source seam

`authority-dashboard-data.ts` defines an injectable projection source:

`AuthorityDashboardProjectionSource`

A runtime integrator may supply a source that returns a completed UGP-9.2A projection.

Before any projection is exposed:

- full UGP-9.2A integrity validation runs;
- tampered projections are rejected;
- source exceptions are converted into a generic unavailable response;
- provider/runtime error internals are not leaked to the customer.

The default source remains null.

## API response states

### available

Returned only when:

- current evidence exists;
- prior trend snapshot exists;
- competitor-gap bundle exists.

### partial

Returned when:

- current evidence exists and validates;
- one or more optional comparison views are absent.

For example:

- trend unavailable because no prior snapshot;
- competitor gap unavailable because no compatible P5.5 bundle.

### unavailable

Returned when:

- no source is configured;
- source returns no projection;
- source fails;
- projection integrity fails.

No synthetic data is substituted.

## Readiness

The API exposes:

- evidence;
- trend;
- competitor gap;
- observed timestamp;
- provider key;
- provider dataset.

This lets the UI explain incomplete coverage instead of hiding it.

## Customer UI

`/authority/backlinks` now opens a dedicated Authority dashboard.

When evidence is available it displays a compact customer view of:

- backlink and referring-domain totals;
- referring domains;
- top linked pages;
- anchor distribution;
- descriptive competitor gaps.

Provider-native authority and exact normalized-loss semantics remain in the authenticated projection contract and are not converted into a universal score.

When evidence is unavailable it displays a customer-safe empty state:

`Authority evidence is not available yet`

and explicitly states:

`NO SYNTHETIC FALLBACK`

## New/lost semantics

UGP-9.2B preserves UGP-9.2A semantics.

Provider-reported loss is not presented as equivalent to normalized exact-loss evidence.

The dashboard uses labels:

- `Provider-reported new`;
- `Provider-reported lost`.

It does not relabel those values as exact normalized loss timestamps.

## Provider authority

Authority values are shown as provider-native evidence.

The UI explicitly states that authority values are not cross-provider comparable.

No universal SEO ENGINE domain-authority score is created.

## Competitor gaps

Competitor-gap rows are descriptive only.

The UI states:

`Opportunity scoring starts in UGP-9.3.`

UGP-9.2B does not rank, score, qualify, or recommend outreach prospects.

## Authentication

The new route is mounted after the existing:

`requireApiAuthentication`

middleware in `routes/index.ts`.

No new authentication bypass or public endpoint is introduced.

## OpenAPI

The read endpoint is documented in:

`lib/api-spec/openapi.yaml`

The response contract includes:

- version;
- state;
- reason;
- readiness;
- nullable projection;
- explicit safety semantics.

The UI currently uses the existing authenticated same-origin fetch boundary. No additional transport or credential path is introduced.

## Tests

UGP-9.2B tests verify:

1. default runtime is unavailable, not synthetic;
2. validated projection becomes partial when optional comparison evidence is absent;
3. null projection remains unavailable;
4. source failure is customer-safe and does not leak provider/runtime details;
5. tampered projection fails integrity and is not displayed.

Existing workspace CI additionally covers typecheck, build, and browser critical paths.

## Safety semantics

The API response records:

- authenticated read-only: true;
- synthetic fallback: false;
- persistence required: false;
- live provider execution authorized: false;
- outreach authorized: false;
- public-site writes: false.

UGP-9.2B does not:

- execute DataForSEO;
- read DataForSEO credentials;
- persist backlink evidence;
- add a database migration;
- schedule backlink refresh;
- enable a worker;
- run opportunity scoring;
- qualify prospects;
- draft or send outreach;
- mutate provider resources;
- mutate customer websites;
- change Railway or production deployment state.

## Reconciliation and next milestone

UGP-9.3A and UGP-9.3B are already merged on the initiative branch. This reconciliation preserves their Authority opportunity API/UI while adding the 9.2B dashboard endpoint and `/authority/backlinks` binding.

The next product milestone is **UGP-9.4 — Prospect Qualification**, which may score certified 9.3 discovery candidates without changing the underlying discovery evidence or authorizing outreach.
