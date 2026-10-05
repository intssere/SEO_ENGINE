# UGP-10.3 — Durable Human Outreach Review + Immutable Audit History

Status: **pre-migration contract / migration authorization required**

Contract version: `ugp-10-3-outreach-review-persistence-contract-v1`

## Purpose

UGP-10.3 makes Outreach Workspace review decisions durable while preserving the strict UGP-10 safety boundary.

The intended customer actions remain:

- `approved_for_draft`;
- `rejected`;
- `deferred`.

A durable review decision is a human governance event. It is **not** authorization to discover contacts, generate outreach, send outreach, schedule follow-ups, purchase links, exchange links, call providers, or modify public websites.

## Repository assessment

The current database does not contain a safe reusable persistence structure for this purpose.

### Why `approvals` cannot be reused

The existing `approvals` table is specifically tied to `action_plan_id` and only permits:

- `approved`;
- `rejected`.

Outreach review instead binds to:

- exact qualification fingerprint;
- exact prospect fingerprint;
- exact workspace item fingerprint;
- exact human review state.

It also requires `deferred`.

Reusing `approvals` would create false action-plan lineage and conflate website-change execution governance with editorial outreach review.

### Why `auth_audit_events` cannot be reused

`auth_audit_events` is authentication/security telemetry.

Its writer intentionally catches and suppresses persistence failures so authentication failures cannot crash the application. That behavior is appropriate for auth telemetry but is incompatible with a durable decision system where persistence failure must fail the review mutation.

It also does not provide the prospect/qualification sequence and fingerprint-chain constraints required by Outreach Workspace.

## Pre-migration contract added in this increment

`authority-outreach-review-persistence-contract.ts` defines deterministic preparation and integrity validation for the future durable write path.

The contract requires every decision to bind to:

- current workspace fingerprint;
- current workspace item ID and fingerprint;
- current qualification fingerprint;
- current prospect fingerprint;
- expected latest review fingerprint;
- explicit decision;
- controlled reason code;
- exact explicit confirmation;
- verified reviewer identity supplied by the authenticated route;
- canonical server review timestamp.

The contract rebuilds the current UGP-10.1 workspace from the exact qualification plus existing review history before accepting a decision.

## Optimistic concurrency

Every mutation must supply the workspace and latest-review state the reviewer actually saw.

The contract rejects:

- stale workspace fingerprint;
- stale qualification fingerprint;
- stale workspace item fingerprint;
- prospect mismatch;
- changed latest-review fingerprint;
- terminal decision reversal.

This prevents a reviewer from approving an item after another reviewer has already changed its state.

## Terminal semantics

For the same qualification/prospect lineage:

- `deferred` may be followed by a later decision;
- `approved_for_draft` is terminal;
- `rejected` is terminal.

A new qualification/prospect fingerprint creates a new review lineage rather than silently rewriting the old decision.

## Explicit confirmation

The required confirmation is:

`REVIEW_OUTREACH:<decision>:<prospectFingerprint>:<workspaceFingerprint>`

The future API must construct/validate this exact confirmation and must not substitute generic approval wording.

## Immutable audit event

Each accepted decision produces a deterministic audit event with:

- sequence;
- previous event fingerprint;
- workspace version;
- workspace fingerprint;
- workspace item ID and fingerprint;
- qualification fingerprint;
- prospect fingerprint;
- opportunity fingerprint;
- target domain;
- source domain;
- target URL;
- qualification status;
- human decision;
- reason code;
- reviewer identity;
- canonical reviewed-at timestamp;
- UGP-10.1 review fingerprint;
- event fingerprint and event ID;
- explicit non-execution semantics.

Each event fingerprint commits to the previous event fingerprint, producing a tamper-evident chain.

## Proposed migration — NOT YET AUTHORIZED

The minimal proposed schema change is a single append-only table:

`authority_outreach_review_events`

No migration file has been created in this pre-migration increment.

The migration should contain fields equivalent to:

- `event_id text PRIMARY KEY`;
- `event_version text NOT NULL`;
- `event_fingerprint char(64) NOT NULL UNIQUE`;
- `site_id uuid NOT NULL REFERENCES sites(id) ON DELETE RESTRICT`;
- `sequence bigint NOT NULL`;
- `previous_event_fingerprint char(64)`;
- `workspace_version text NOT NULL`;
- `workspace_fingerprint char(64) NOT NULL`;
- `workspace_item_id text NOT NULL`;
- `workspace_item_fingerprint char(64) NOT NULL`;
- `qualification_fingerprint char(64) NOT NULL`;
- `prospect_fingerprint char(64) NOT NULL`;
- `opportunity_fingerprint char(64) NOT NULL`;
- `target_domain text NOT NULL`;
- `source_domain text NOT NULL`;
- `target_url text`;
- `qualification_status text NOT NULL`;
- `decision text NOT NULL`;
- `reason_code text NOT NULL`;
- `reviewer_id text NOT NULL`;
- `reviewed_at timestamptz NOT NULL`;
- `review_fingerprint char(64) NOT NULL UNIQUE`;
- `created_at timestamptz NOT NULL DEFAULT transaction_timestamp()`.

Required constraints should include:

- fixed event version;
- all fingerprints exactly lowercase 64-character SHA-256 values;
- sequence >= 1;
- sequence 1 requires null previous fingerprint;
- later sequences require non-null previous fingerprint;
- qualification status limited to UGP-9.4 statuses;
- decision limited to UGP-10.1 review decisions;
- unique `(site_id, qualification_fingerprint, prospect_fingerprint, sequence)`;
- index for `(site_id, target_domain, reviewed_at DESC)`;
- index for `(site_id, prospect_fingerprint, sequence)`.

## Database-enforced immutability

“Immutable audit history” should be enforced by PostgreSQL, not only application convention.

The proposed migration should add a trigger on `authority_outreach_review_events` that rejects every `UPDATE` and `DELETE`.

Application runtime access should be append/read only.

Corrections must be represented as new review events where policy permits; historical rows must never be rewritten.

## Planned durable transaction

The future store should perform one bounded PostgreSQL transaction:

1. resolve the active site from the validated workspace target domain;
2. lock the site row for the duration of the decision to serialize review writes safely;
3. reload exact qualification evidence;
4. load the complete event chain for the exact qualification/prospect;
5. reconstruct UGP-10.1 review inputs from persisted events;
6. rebuild and integrity-check the current workspace;
7. run `prepareAuthorityOutreachReviewDecision(...)`;
8. insert exactly one new immutable event;
9. read the inserted row back;
10. verify its fingerprint and sequence before returning success.

Any failure must roll back the transaction.

There is no provider call or outreach execution inside this transaction.

## Planned authenticated mutation

After migration authorization, the bounded API is expected to be:

`POST /api/authority/outreach/reviews`

The route must require:

- existing global API authentication;
- minimum `operator` role;
- existing unsafe-method CSRF protection;
- same-origin request verification;
- existing sensitive-mutation rate limiting;
- reviewer identity from `verifiedActorId(req)`, never from request JSON.

Expected status behavior:

- 200: durable review event committed and verified;
- 400: invalid decision/reason/explicit confirmation;
- 401: authentication required;
- 403: role/CSRF/same-origin failure;
- 404: workspace item/site not found;
- 409: stale workspace, stale qualification, concurrent change, terminal decision, unsafe state;
- 503: durable review runtime unavailable.

## Planned read integration

The existing UGP-10.2 `GET /api/authority/outreach` loader should use the new durable store as its review source.

If the review table/runtime is unavailable, the API must report unavailable rather than silently dropping durable history and projecting an apparently clean review queue.

## Safety invariants

UGP-10.3 must continue to guarantee:

- human review required;
- `approved_for_draft` means draft eligibility only;
- contact discovery authorized: false;
- outreach drafting authorized/performed: false;
- outreach sending authorized/performed: false;
- automatic follow-up: false;
- provider network execution: false;
- provider writes: false;
- public-site writes: false;
- scheduler enabled: false;
- worker enabled: false;
- link-scheme automation authorized: false.

## Current authorization boundary

This pre-migration contract intentionally performs **no persistence** and creates **no database migration**.

A separate explicit authorization is required before adding the migration and durable PostgreSQL/API mutation implementation.
