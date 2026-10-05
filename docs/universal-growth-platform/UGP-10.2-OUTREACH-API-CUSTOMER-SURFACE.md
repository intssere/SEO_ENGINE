# UGP-10.2 — Authenticated Outreach Workspace API + Customer Review Surface

Version: `ugp-10-2-outreach-workspace-api-v1`

## Purpose

UGP-10.2 exposes the merged UGP-10.1 evidence-bound Outreach Workspace through the authenticated customer product boundary.

It adds:

- authenticated read-only `GET /api/authority/outreach`;
- customer review surface at the existing `/authority/prospects` route;
- exact qualification-to-workspace lineage;
- optional explicit review-history projection;
- truthful available/unavailable states;
- no synthetic outreach workspace fallback;
- hermetic browser interception;
- OpenAPI documentation.

## Why the existing prospects route is reused

The existing `/authority/prospects` page already represents the customer-facing qualified-prospect stage.

UGP-10.2 evolves that surface into the outreach review queue instead of adding another customer route or frontend bundle.

This keeps:

- UGP-9.4 qualification available through `GET /api/authority/qualification`;
- the customer surface focused on the next operational question: what requires human review?;
- the frontend within its certified performance budget.

## Runtime construction

The API never accepts or exposes an opaque precomputed workspace.

It:

1. loads the validated UGP-9.4 qualification response;
2. rejects unavailable qualification rather than inventing prospects;
3. optionally loads explicit review records from a bounded runtime review source;
4. rebuilds the UGP-10.1 workspace;
5. runs `assertAuthorityOutreachWorkspaceIntegrity(...)`;
6. exposes the resulting workspace only after validation.

If no review source is configured, the qualification can still project truthfully into an initial human-review queue with no review history.

If a configured review source fails, the API returns unavailable rather than silently dropping historical review state.

## API

`GET /api/authority/outreach`

The route is mounted after the repository's existing global `requireApiAuthentication` middleware.

Response fields:

- version;
- state;
- reason;
- workspace;
- semantics.

The API semantics explicitly state:

- authenticated read-only: true;
- synthetic fallback: false;
- human review required: true;
- review mutation authorized: false;
- whether a review source is configured;
- contact discovery authorized: false;
- outreach drafting authorized: false;
- outreach sending authorized: false;
- live provider execution authorized: false;
- public-site writes: false.

## Customer surface

`/authority/prospects` now loads:

`/api/authority/outreach`

When the workspace is available, the compact Authority surface shows the evidence-bound workspace items, including:

- source domain;
- current outreach review state;
- qualification score.

Examples of visible states include:

- `awaiting_human_review`;
- `qualification_review_required`;
- `insufficient_evidence`;
- `blocked`;
- `approved_for_draft`;
- `rejected`;
- `deferred`.

When the workspace is unavailable, the customer sees the supplied reason and the explicit no-synthetic-fallback state.

## Review boundary

This increment does **not** add a review mutation endpoint.

A visible state such as `approved_for_draft` can only come from an explicit trusted review source supplied to the workspace loader.

The customer page is therefore a review workspace projection, not a persistence or execution surface.

A later bounded increment may add an authenticated same-origin review-decision mutation with durable audit history. That is a separate authorization boundary.

## Safety boundary

UGP-10.2 does not:

- discover people, email addresses, or contact details;
- draft outreach messages;
- send outreach;
- authorize sending;
- create follow-up schedules;
- persist review decisions;
- add a database migration;
- call DataForSEO or any other provider;
- read provider credentials;
- activate a worker or scheduler;
- perform provider writes;
- mutate a public website;
- authorize paid, reciprocal, or ranking-manipulation link schemes;
- change Railway or production state.

## Browser fixture

The hermetic browser fixture intercepts:

`GET /api/authority/outreach`

and returns a truthful unavailable response when no durable qualification evidence source is configured.

No qualified prospect or reviewed outreach item is fabricated for browser certification.

## Tests

UGP-10.2 verifies that:

1. unavailable qualification produces no synthetic workspace;
2. a validated qualification projects into a read-only human-review queue;
3. explicit review history can project `approved_for_draft` without enabling drafting or sending;
4. review-source failures are sanitized rather than silently ignored;
5. the customer prospects surface binds to the outreach workspace endpoint rather than the raw qualification endpoint.

## Next bounded increment

A later UGP-10 increment may implement durable human review decisions with:

- authenticated same-origin mutation;
- verified reviewer identity;
- exact qualification/prospect fingerprint binding;
- immutable audit history;
- stale-review rejection.

Contact discovery, draft generation, and sending remain separate later boundaries.
