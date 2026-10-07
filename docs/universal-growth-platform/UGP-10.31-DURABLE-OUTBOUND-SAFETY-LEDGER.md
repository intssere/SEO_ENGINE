# UGP-10.31 — Durable Outbound Safety Ledger and Fail-Closed Eligibility Gate

## Purpose

UGP-10.31 introduces the provider-free durable safety state that must exist before any external outreach execution may be considered.

It converts an integrity-valid approved UGP-10.29 human authorization decision into a deterministic single-send safety intent, then persists only bounded safety state:

- suppression / opt-out state;
- permanent logical-send idempotency;
- one active contact reservation;
- sticky uncertain-attempt fencing;
- per-contact rate state;
- per-recipient-domain rate state;
- immutable reservation safety events.

UGP-10.31 does **not** connect a provider, bind a mailbox, activate credentials, submit a form, construct an outbound provider request, transmit a message, or grant send authorization.

## Versioned contracts

Intent:

`ugp-10-31-outbound-safety-intent-v1`

Reservation:

`ugp-10-31-outbound-safety-reservation-v1`

Suppression:

`ugp-10-31-outbound-suppression-v1`

Safety event:

`ugp-10-31-outbound-safety-event-v1`

## Exact upstream boundary

The safety intent accepts only an integrity-valid UGP-10.29 decision whose exact state is:

`delivery_binding_operational_authorization_eligible`

The decision must be:

`approve_for_separate_delivery_binding_operational_authorization`

UGP-10.31 re-runs the complete UGP-10.29 integrity chain before deriving a reservation identity.

Rejected or deferred UGP-10.29 decisions fail closed.

## Domain semantics

UGP outreach carries two distinct domain concepts:

- **owned site domain** — the site being promoted, inherited from UGP-10 target lineage;
- **recipient domain** — the external authority/contact domain, inherited from the outreach source domain.

UGP-10.31 deliberately applies outbound domain rate limits to the **recipient domain**, not the owned site domain.

This prevents all outreach from being incorrectly collapsed under one owned-site rate bucket.

## Logical send identity

The permanent logical-send key is derived from:

- exact qualified prospect fingerprint;
- exact selected contact-point fingerprint;
- exact reviewed message / send-review fingerprint;
- exact draft-candidate fingerprint;
- exact recipient domain.

The key is durable and unique.

Once a logical send has a reservation row, the same logical send is never silently recreated as a new outbound action.

Exact replay returns the existing state.

## Durable migration

Migration source:

`lib/db/migrations/0009_ugp_10_31_outbound_safety_ledger.sql`

The migration is additive and transactional.

It adds exactly three tables to the UGP-10.3 44-table baseline, producing the recognized 47-table UGP-10.31 schema state.

### 1. `authority_outreach_suppressions`

Stores fingerprint-only monotonic suppression state:

- site identity;
- recipient domain;
- contact-point fingerprint;
- suppression reason;
- suppressing actor;
- suppression timestamp.

Supported suppression reasons:

- `explicit_opt_out`
- `manual_suppression`
- `compliance_hold`
- `reputation_risk`

There is one suppression identity per site + contact-point fingerprint.

Suppression rows are immutable: UPDATE, DELETE, and TRUNCATE fail closed.

UGP-10.31 intentionally provides no unsuppress operation.

### 2. `authority_outreach_send_reservations`

Stores one durable provider-free reservation identity:

- permanent logical-send key;
- UGP-10.29 authorization-decision fingerprint;
- UGP-10.28 review-spec fingerprint;
- qualified prospect and opportunity fingerprints;
- draft candidate fingerprint;
- selected role/contact fingerprints;
- send-review fingerprint;
- quality-gate fingerprint;
- recipient domain;
- reservation status and timestamps.

Statuses:

- `reserved`
- `released`
- `consumed`
- `uncertain`

Reservation rows may transition status through the bounded store API.

Reservation rows cannot be deleted or truncated.

### 3. `authority_outreach_send_safety_events`

Stores an immutable per-reservation event chain.

Events:

- `reserved`
- `released`
- `consumed`
- `marked_uncertain`

Reasons:

- `safety_preflight_passed`
- `operator_release`
- `reservation_expired`
- `single_send_consumed`
- `provider_result_uncertain`

Each event includes sequence and prior-event fingerprint lineage.

Safety-event rows are immutable: UPDATE, DELETE, and TRUNCATE fail closed.

## Rate policy

UGP-10.31 freezes the initial human-reviewed outbound rate policy as:

### Contact

Maximum:

`1 reservation`

Window:

`7 days / 604800 seconds`

### Recipient domain

Maximum:

`5 reservations`

Window:

`24 hours / 86400 seconds`

### Reservation TTL

`15 minutes / 900 seconds`

These are outbound safety limits, not API-abuse limits.

A reservation consumes rate history even if it is later released, which prevents reserve/release cycling from bypassing throttling.

## Reservation transaction

The durable store:

1. re-runs exact UGP-10.31 intent integrity;
2. locks the owned-site row with PostgreSQL `FOR UPDATE`;
3. uses PostgreSQL transaction time as the authoritative clock;
4. reconciles expired `reserved` rows to `released`;
5. appends immutable expiry events;
6. checks durable suppression;
7. checks permanent logical-send identity;
8. checks active or uncertain contact reservation;
9. checks contact rate;
10. checks recipient-domain rate;
11. inserts exactly one `reserved` row;
12. appends exactly one immutable `reserved` safety event.

No provider is called during this transaction.

## Fail-closed outcomes

Reservation is blocked for:

- `suppressed_contact`
- `duplicate_logical_send_conflict`
- `contact_reservation_conflict`
- `uncertain_previous_attempt`
- `contact_rate_limited`
- `domain_rate_limited`
- `reservation_state_uncertain`

Exact replay of the same logical send does not create a second row.

## Uncertain-result fencing

`uncertain` is intentionally sticky.

A reservation marked uncertain:

- remains in permanent logical-send history;
- remains part of the active-contact uniqueness fence;
- cannot be auto-expired;
- cannot be released or consumed through a conflicting later transition;
- causes replay to fail closed as `uncertain_previous_attempt`.

This is the safety behavior required for a future provider timeout or ambiguous external result.

## Monotonic suppression

Suppression is checked **before** logical-send replay.

If a contact becomes suppressed after a reservation was previously created, a later reservation request fails as suppressed rather than treating the old reservation as permission to proceed.

Repeated suppression requests for the same site/contact return the original durable suppression identity.

## Bounded transitions

UGP-10.31 supports provider-free reservation state transitions for later UGP-10.32 integration:

- `release`
- `consume`
- `mark_uncertain`

They are durable state/audit operations only.

They do not transmit anything.

Every successful first transition appends an immutable safety event.

Exact repeated transition to the same state is idempotent.

A conflicting terminal transition fails closed.

## Stored-data minimization

The UGP-10.31 safety schema stores no:

- raw email address;
- raw contact value;
- message body;
- email body;
- provider ID;
- API key;
- access token;
- refresh token;
- mailbox password;
- provider secret;
- credential value.

Recipient identity is represented by the already-governed contact-point fingerprint.

## PostgreSQL certification

A dedicated CI stage applies migration 0009 only after the certified UGP-10.3 44-table localhost baseline.

It verifies:

- exactly 47 public tables after migration;
- migration source contains no DML;
- expected indexes and triggers exist;
- suppression and safety-event ledgers are immutable;
- reservation DELETE/TRUNCATE are blocked;
- reservation status transition remains possible;
- runtime bootstrap recognizes the 47-table state;
- the schema contains no raw recipient/message/secret columns.

The API-store PostgreSQL certification verifies:

- simultaneous exact duplicate reservation produces one durable row;
- exact replay returns the existing reservation;
- uncertain state is sticky and blocks replay;
- expired reservations are durably reconciled with event history;
- contact-rate exhaustion fails closed;
- recipient-domain-rate exhaustion fails closed;
- monotonic suppression overrides later eligibility;
- no provider or message transmission is performed.

## Operational migration status

Migration 0009 is **not applied to staging or production by this increment**.

UGP-10.31 certifies only:

- migration source;
- deterministic contracts;
- dedicated localhost ephemeral PostgreSQL behavior;
- provider-free persistence semantics.

Any application of migration 0009 to a non-ephemeral environment requires separate explicit operational authorization.

The earlier UGP-10.3 migration 0008 likewise remains subject to its existing deployment authorization boundary.

## Explicit non-capabilities

UGP-10.31 does not authorize or perform:

- provider-account connection;
- sender mailbox binding;
- credential storage or activation;
- DNS/MX probing;
- SMTP activity;
- provider API calls;
- web-form submission;
- browser automation;
- message transmission;
- send-job construction;
- send authorization;
- outreach sending;
- autonomous scheduling;
- worker activation;
- production DDL;
- staging DDL.

## Next frozen increment

UGP-10.32 is the next frozen UGP-10 stage:

**Provider-neutral single-send execution boundary**

It may consume an exact UGP-10.31 durable reservation and define one authenticated, one-message, one-recipient execution path.

Initial UGP-10.32 certification must use a fake/mock provider only.

UGP-10.32 must not perform a real external send.

The first real non-production provider/send action remains UGP-10.33 and requires separate explicit operational authorization.
