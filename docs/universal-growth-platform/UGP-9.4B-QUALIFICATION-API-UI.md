# UGP-9.4B — Authenticated Qualification API + Customer Surface

Version: `ugp-9-4b-prospect-qualification-api-v1`

## Purpose

UGP-9.4B exposes the merged UGP-9.4A prospect-qualification model through the authenticated customer product boundary.

It adds:

- authenticated read-only `GET /api/authority/qualification`;
- customer route `/authority/prospects`;
- explicit available/unavailable API states;
- truthful no-data behavior with no synthetic prospect fallback;
- hermetic browser-test interception;
- OpenAPI documentation.

## Runtime source contract

The runtime source does not provide an opaque pre-scored prospect list.

It supplies a normalized qualification snapshot containing:

- the exact UGP-9.3 authority discovery;
- the exact UGP-9.1 backlink evidence dataset referenced by that discovery;
- optional explicit UGP-9.4 qualification signals.

The API loader recomputes `qualifyAuthorityProspects(...)` from that snapshot and then runs full UGP-9.4A integrity validation before exposing the result.

This keeps qualification bound to the exact discovery, dataset, and explicit signals.

## Default runtime truthfulness

No durable qualification-evidence source is configured by this increment.

Default behavior is therefore:

- state: `unavailable`;
- qualification: `null`;
- reason explains that no durable qualification evidence source is configured;
- synthetic fallback: false.

No browser fixture fabricates a qualified prospect. The browser fixture also returns unavailable.

## Customer surface

`/authority/prospects` reuses the existing compact Authority page to avoid adding another frontend bundle.

When qualification is available, each prospect row shows:

- source domain;
- qualification status;
- transparent qualification score.

Detailed component evidence remains present in the API result.

When qualification is unavailable, the customer sees the source-provided reason and an explicit:

`NO SYNTHETIC FALLBACK`

message.

## Authentication

The qualification route is mounted in the existing Authority router after the global:

`requireApiAuthentication`

middleware.

No public API bypass is introduced.

## Safety boundary

The API response records:

- authenticated read-only: true;
- synthetic fallback: false;
- persistence required: false;
- live provider execution authorized: false;
- contact discovery authorized: false;
- outreach authorized: false;
- public-site writes: false.

UGP-9.4B does not:

- execute DataForSEO or any other provider;
- read provider credentials;
- discover email addresses or contacts;
- draft or send outreach;
- persist prospects;
- add a database migration;
- schedule qualification refresh;
- activate a worker;
- mutate provider resources;
- mutate customer/public websites;
- authorize reciprocal, purchased, or ranking-manipulation link schemes;
- change Railway or production deployment state.

## Tests

The API loader tests verify:

1. default runtime is unavailable, not synthetic;
2. a valid normalized source snapshot returns an evidence-bound qualification result;
3. a null source result remains unavailable;
4. source failures are sanitized;
5. discovery/dataset mismatch is rejected.

Existing workspace CI additionally covers browser critical paths, navigation, typecheck, build, provenance, and performance budgets.

## Next milestone

After UGP-9.4B, the Authority roadmap can move to **UGP-10 — Outreach Workspace**.

That next phase must remain review-driven and must not treat a `qualified_for_review` prospect as authorization to contact, email, publish, buy, exchange, or otherwise manipulate links.
