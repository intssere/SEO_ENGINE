# UGP-10.32 — Provider-Neutral Single-Send Execution Boundary

## Purpose

UGP-10.32 adds the runtime boundary for exactly one human-reviewed outbound action after UGP-10.31 durable safety reservation.

It is deliberately **mock-only** in this increment.

UGP-10.32 does not connect a real provider, bind a mailbox, activate credentials, perform SMTP, submit a real web form, or transmit a real message.

## Versions

Execution:

`ugp-10-32-single-send-execution-v1`

Execution event:

`ugp-10-32-single-send-execution-event-v1`

## Exact upstream requirement

UGP-10.32 requires an exact durable UGP-10.31 reservation in state:

`reserved`

The reservation remains bound to:

- exact UGP-10.29 human authorization decision;
- exact qualified prospect;
- exact opportunity;
- exact draft candidate;
- exact selected role candidate;
- exact selected contact point;
- exact human send review;
- exact quality gate;
- exact recipient domain;
- permanent logical-send identity.

UGP-10.32 does not create or bypass UGP-10.31 eligibility.

## Raw payload binding

The executor accepts raw destination/message values only in process memory.

Before an execution claim can exist it recomputes:

1. the UGP-10.16 public contact-point fingerprint from:
   - contact-point type;
   - contact-point value;
   - recipient/source domain;

2. the UGP-10.7 draft-candidate fingerprint from:
   - exact draft request fingerprint;
   - subject;
   - body.

Both recomputed fingerprints must equal the fingerprints frozen in the UGP-10.31 reservation.

Changing the recipient, source domain, request lineage, subject, or body therefore fails before adapter invocation.

## One-recipient / one-message contract

Each execution intent contains exactly:

- one reservation;
- one recipient contact point;
- one reviewed subject;
- one reviewed body;
- one adapter class.

UGP-10.32 exposes no batch input and no list of recipients/messages.

## Durable migration

Migration source:

`lib/db/migrations/0010_ugp_10_32_single_send_execution.sql`

It is additive and transactional.

It extends the UGP-10.31 47-table baseline by exactly two tables, producing the recognized 49-table UGP-10.32 state.

### `authority_outreach_single_send_executions`

One row per UGP-10.31 reservation.

Durable fields include only:

- execution identity/fingerprint;
- reservation identity/fingerprint;
- site identity;
- selected-contact fingerprint;
- candidate fingerprint;
- payload fingerprint;
- adapter class;
- execution state;
- attempt count;
- timestamps;
- adapter-receipt fingerprint;
- terminal reason.

There is a unique constraint on `reservation_id`.

`attempt_count` is fixed to exactly `1`.

Execution states:

- `claimed`
- `accepted`
- `rejected`
- `uncertain`

Execution rows cannot be deleted or truncated.

### `authority_outreach_single_send_execution_events`

Immutable append-only event chain.

Event types:

- `claimed`
- `accepted`
- `rejected`
- `uncertain`

Each event carries:

- sequence;
- previous-event fingerprint;
- execution fingerprint;
- reservation identity;
- site identity;
- reason;
- adapter-receipt fingerprint when terminal;
- actor;
- timestamp.

UPDATE, DELETE, and TRUNCATE fail closed.

## Claim-before-adapter rule

The execution store creates the durable `claimed` row before adapter invocation.

The claim transaction:

1. locks the exact UGP-10.31 reservation;
2. verifies exact reservation/contact/candidate/recipient-domain lineage;
3. locks the owned site row;
4. uses PostgreSQL transaction time;
5. rejects non-`reserved` or expired reservation state;
6. rechecks durable suppression;
7. rechecks contact rate;
8. rechecks recipient-domain rate;
9. rejects a conflicting execution identity;
10. inserts exactly one execution claim;
11. appends the immutable `claimed` event.

Only a newly created exact claim is adapter-invocation eligible.

## Adapter boundary

UGP-10.32 defines a provider-neutral adapter interface.

The only implementation shipped in UGP-10.32 is:

`mock`

The mock adapter:

- performs zero network operations;
- has no credentials;
- has no mailbox;
- has no provider account;
- performs no SMTP;
- returns deterministic receipt fingerprints;
- supports test outcomes `accepted`, `rejected`, and `uncertain`.

The executor rejects any adapter whose class is not `mock` or whose declared network capability is not false.

## Exactly one attempt

The executor invokes the adapter at most once for a newly created execution claim.

There is no automatic retry.

Terminal mock outcomes map to UGP-10.31 reservation transitions:

- accepted → `consume`;
- rejected → `release`;
- uncertain → `mark_uncertain`.

The UGP-10.32 execution row then receives the matching terminal state and immutable event.

## Crash/replay safety

If execution is replayed after a terminal execution row already exists:

- the adapter is not called;
- the existing terminal state is returned.

If execution is replayed while the execution row is still only `claimed`:

- the adapter is not called;
- the reservation is marked uncertain when still possible;
- the execution is closed as `uncertain`;
- the result is `recovered_as_uncertain`.

This deliberately prefers ambiguity/manual resolution over an unsafe second outbound attempt.

## Post-adapter persistence uncertainty

If the adapter boundary has already been crossed and later durable state transition fails:

- no adapter retry is attempted;
- the system attempts to fence the UGP-10.31 reservation as uncertain;
- the UGP-10.32 execution is closed uncertain with a deterministic recovery fingerprint.

## Mock runtime endpoint

Endpoint:

`POST /authority/outreach/single-send/mock`

Required controls:

- authenticated session;
- operator role or higher;
- global CSRF validation;
- global sensitive-mutation rate limit;
- explicit same-origin request;
- exact request-field allowlist;
- exact confirmation token;
- `UGP_10_32_MOCK_EXECUTION_ENABLED=true`;
- non-production runtime.

The mock endpoint is forcibly disabled when:

`NODE_ENV=production`

Confirmation format:

`EXECUTE_OUTREACH_SINGLE_SEND_MOCK:<outcome>:<reservation-id>:<reservation-fingerprint>`

## Durable data minimization

The 49-table durable execution schema stores no:

- raw email address;
- raw contact-form URL;
- raw contact value;
- subject text;
- message body;
- provider credential;
- API key;
- access token;
- refresh token;
- password;
- provider secret.

Raw destination/message values exist only in the process-local execution intent.

## CI certification

The dedicated UGP-10.32 CI stage starts from the certified UGP-10.31 47-table localhost PostgreSQL state.

It verifies:

- migration 0010 applies to produce exactly 49 tables;
- execution/event tables contain no raw payload/secret columns;
- execution history cannot be deleted/truncated;
- execution events are immutable;
- runtime bootstrap recognizes 49 tables;
- full governed UGP-10.29 → UGP-10.31 → UGP-10.32 mock acceptance;
- exactly one mock adapter invocation;
- exact replay performs zero new adapter attempts;
- uncertain result remains fenced and replay-safe;
- suppression added after reservation blocks before adapter invocation;
- durable execution/event state is correct;
- no live provider/network primitive exists.

## Operational migration status

Migration 0010 is **not applied to staging or production by UGP-10.32**.

Migration 0009 is likewise not applied to staging or production by this increment.

UGP-10.32 certifies source and localhost ephemeral PostgreSQL behavior only.

Any non-ephemeral migration application requires separate explicit operational authorization.

## Explicit non-capabilities

UGP-10.32 does not authorize or perform:

- real provider connection;
- sender mailbox binding;
- provider credential storage;
- credential activation;
- DNS/MX probing;
- SMTP;
- real email transmission;
- real web-form submission;
- browser automation;
- scheduler-driven send;
- worker-driven send;
- batch sending;
- automatic retry;
- staging DDL;
- production DDL.

## Next frozen increment

UGP-10.33 remains the first real non-production provider/send certification.

It requires separate explicit operational authorization because it may involve:

- applying required migrations in a non-production environment;
- binding one provider/mailbox or supported submission mechanism;
- using credential references;
- external network activity;
- exactly one controlled real message transmission.

A plain `continue` must not execute UGP-10.33 operational actions.
