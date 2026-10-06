# UGP-10.10 — Provider-Free Delivery Preparation Contract

Version: `ugp-10-10-delivery-preparation-contract-v1`

## Purpose

UGP-10.10 defines the immutable delivery-preparation specification that may follow an integrity-valid UGP-10.9 human send-review decision whose resulting state is exactly:

`delivery_preparation_eligible`

This stage does not discover a contact, select a recipient, verify an address, bind a mailbox or provider, construct a send job, authorize sending, transmit outreach, or schedule follow-up.

## Required upstream state

UGP-10.10 accepts only a UGP-10.9 record that:

- passes full UGP-10.9 integrity reconstruction;
- has decision `approved_for_delivery_preparation`;
- has resulting state `delivery_preparation_eligible`;
- remains eligibility-only;
- still records `sendAuthorizationGranted = false`.

Rejected or deferred UGP-10.9 records fail closed.

## Exact lineage

The preparation contract freezes the exact:

- UGP-10.9 review ID and review fingerprint;
- UGP-10.9 decision-request fingerprint;
- UGP-10.8 quality-gate fingerprint;
- UGP-10.6 request ID and request fingerprint;
- UGP-10.7 candidate fingerprint;
- UGP-10.7 mechanical-validation fingerprint;
- prospect fingerprint;
- opportunity fingerprint;
- original outreach approval-review fingerprint;
- source domain and source URL;
- target domain;
- exact validated owned target URL.

The preparation request must repeat the exact UGP-10.9 review fingerprint and exact candidate fingerprint.

Any stale or mismatched lineage fails closed.

## Recipient-role criteria only

UGP-10.10 may carry only controlled recipient-role criteria:

- `editorial_responsibility`;
- `resource_ownership_responsibility`;
- `partnerships_responsibility`.

These are role criteria, not people.

UGP-10.10 does not include:

- recipient name;
- recipient identity;
- email address;
- phone number;
- social profile;
- mailbox;
- contact record.

At least one criterion is required. Unknown or duplicate criteria fail closed.

## Allowed delivery channel types only

UGP-10.10 may declare future channel types:

- `email`;
- `web_contact_form`.

A channel type is not a provider binding or operational send route.

At least one channel type is required. Unknown or duplicate channel types fail closed.

## Canonicalization

Recipient-role criteria and allowed channel types are normalized into deterministic sorted sets.

Equivalent input sets therefore produce the same preparation fingerprint regardless of input ordering.

## Required future gates

Every preparation contract explicitly requires these later independent gates:

1. `recipient_research`;
2. `recipient_selection`;
3. `contact_address_verification`;
4. `policy_and_consent_review`;
5. `recipient_human_approval`;
6. `mailbox_or_provider_binding`;
7. `send_authorization`;
8. `transmission`;
9. `follow_up_scheduling`.

UGP-10.10 satisfies none of these gates.

They remain separate future boundaries.

## Resulting state

A valid contract results only in:

`delivery_preparation_spec_ready`

This means the immutable preparation specification exists.

It does not mean:

- a recipient exists;
- a recipient has been selected;
- an address has been found or verified;
- a mailbox or provider has been selected;
- a send job exists;
- sending is authorized;
- outreach has been transmitted.

## Safety semantics

UGP-10.10 explicitly records:

- deterministic: true;
- exact human send review required: true;
- exact validated candidate required: true;
- delivery preparation specification only: true;
- recipient role criteria only: true;
- delivery channel types only: true;
- actual recipient included: false;
- recipient selection authorized/performed: false;
- contact discovery authorized/performed: false;
- contact address included: false;
- email verification authorized: false;
- mailbox access authorized: false;
- provider binding authorized: false;
- send-job construction authorized: false;
- send authorization granted: false;
- outreach sending authorized/performed: false;
- follow-up scheduling authorized: false;
- model calls: false;
- provider calls: false;
- network operations: false;
- persistence: false;
- scheduler enabled: false;
- worker enabled: false;
- provider writes: false;
- public-site writes: false;
- link-scheme automation authorized: false.

## Static capability certification

The static regression requires that the implementation contain no:

- OpenAI, Anthropic, or Gemini execution primitive;
- `fetch`, Axios, Undici, or Got network transport;
- PostgreSQL or Drizzle runtime;
- environment credential reads;
- timers or cron;
- worker threads;
- child-process execution.

It also verifies that no operational recipient/address/mailbox/provider identifier field is introduced.

## Persistence

UGP-10.10 performs no persistence.

It adds no database migration and does not apply the already-merged UGP-10.3 migration.

## Production boundary

UGP-10.10 does not modify:

- Railway;
- staging;
- production;
- production databases;
- environment variables;
- credentials;
- provider integrations;
- public websites;
- schedulers;
- workers;
- mailboxes.

## Next bounded increments

Future work should preserve separate boundaries for:

1. provider-free recipient/contact research specification;
2. recipient selection and human approval;
3. contact-address verification;
4. mailbox/provider binding;
5. explicit send authorization;
6. actual transmission;
7. follow-up scheduling.

Those capabilities are not authorized by UGP-10.10.
