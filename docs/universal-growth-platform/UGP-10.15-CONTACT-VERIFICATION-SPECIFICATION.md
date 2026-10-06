# UGP-10.15 — Provider-Free Contact-Address Verification Specification

Version: `ugp-10-15-contact-verification-specification-v1`

## Purpose

UGP-10.15 converts an integrity-valid UGP-10.14 human recipient-selection decision into an immutable specification for a future contact-address verification stage.

This stage does not contain, discover, collect, or verify an actual contact point.

It performs no network or provider operation.

## Required upstream state

UGP-10.15 accepts only an integrity-valid UGP-10.14 decision that:

- has decision `select_for_contact_verification`;
- has state `contact_verification_eligible`;
- contains exactly one selected role candidate from the frozen UGP-10.13 review set;
- still records contact-address collection authorization as false;
- still records contact-address verification authorization as false;
- still records send authorization as false.

Rejected or deferred UGP-10.14 decisions fail closed.

## Exact lineage

The request must repeat the exact:

- UGP-10.14 selection-decision fingerprint;
- selected role-candidate fingerprint;
- UGP-10.7 draft-candidate fingerprint.

The resulting specification freezes the exact upstream lineage through UGP-10.14.

Any stale or mismatched lineage fails closed.

## Selected public-business role candidate

The exact UGP-10.14 selected role candidate is copied unchanged into the specification.

This identity is already constrained to public-business role evidence.

UGP-10.15 does not enrich, rank, replace, or otherwise mutate the candidate.

## Permitted future contact-point types

UGP-10.15 derives future contact-point types only from the delivery channel types already approved in UGP-10.10.

Mapping:

- `email` → `email_address`;
- `web_contact_form` → `web_contact_form`.

The contract contains only these type labels.

It does not contain an email address, form endpoint, phone number, social handle, mailbox identifier, or provider identifier.

## Allowed future evidence-source classes

A later separately bounded verification stage may use only the following evidence-source classes:

- `source_domain_contact_page`;
- `source_domain_staff_or_author_page`;
- `official_organization_profile`.

UGP-10.15 does not fetch any such source.

## Verification policy

The specification records the following bounded future policy:

- maximum contact points to validate: 3;
- public-business contact only: true;
- exact selected role candidate required: true;
- public source reference required: true;
- source-domain relationship required: true;
- observation timestamp required: true;
- contact-point fingerprint required: true;
- private or brokered personal data allowed: false;
- contact-point collection allowed: false;
- verification execution allowed: false;
- provider verification allowed: false;
- mailbox probing allowed: false.

These fields describe constraints for a later stage.

They do not grant execution authority.

## Resulting state

A valid UGP-10.15 contract produces only:

`contact_verification_spec_ready`

This means only that a deterministic future verification specification exists.

It does not mean:

- a contact point has been found;
- an address has been collected;
- an address has been verified;
- a provider has been called;
- a mailbox has been probed or accessed;
- policy/consent review has occurred;
- a send job exists;
- sending is authorized.

## Safety semantics

UGP-10.15 explicitly records:

- deterministic: true;
- exact UGP-10.14 human-selection decision required: true;
- exact selected role candidate required: true;
- contact-verification specification only: true;
- actual contact point included: false;
- contact discovery authorized/performed: false;
- contact address included: false;
- contact-address collection authorized: false;
- contact-address verification authorized/performed: false;
- email verification authorized: false;
- verification-provider call authorized: false;
- mailbox probe authorized: false;
- mailbox access authorized: false;
- provider binding authorized: false;
- policy/consent review authorized: false;
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

The static regression rejects implementation-level execution primitives for:

- OpenAI, Anthropic, or Gemini;
- `fetch`, Axios, Undici, or Got;
- PostgreSQL or Drizzle;
- environment credential reads;
- timers or cron;
- worker threads;
- child-process execution.

It also guards against operational contact/mailbox/provider value fields.

## Persistence

UGP-10.15 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 database migration.

## Production boundary

UGP-10.15 does not modify:

- Railway;
- staging;
- production;
- databases;
- environment variables;
- credentials;
- verification/search/data providers;
- mailboxes;
- public websites;
- schedulers;
- workers.

## Next bounded boundary

A later increment may validate **supplied** public-business contact-point evidence against this exact UGP-10.15 specification without performing lookup or verification-provider calls.

Actual contact discovery, address acquisition, provider verification, mailbox probing/binding, policy and consent review, send authorization, transmission, and follow-up scheduling remain separate authorization boundaries.

UGP-10.15 grants none of those capabilities.
