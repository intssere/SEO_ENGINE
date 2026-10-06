# UGP-10.11 — Provider-Free Recipient Research Specification

Version: `ugp-10-11-recipient-research-specification-v1`

## Purpose

UGP-10.11 defines an immutable specification for a possible future recipient-research stage.

It consumes only an integrity-valid UGP-10.10 delivery-preparation contract whose state is exactly:

`delivery_preparation_spec_ready`

UGP-10.11 does **not** perform recipient or contact research.

It does not identify a person, collect an address, query a provider, browse the network, bind a mailbox, construct a send job, authorize outreach, transmit a message, or schedule follow-up.

## Required upstream state

UGP-10.11 reconstructs and verifies the exact UGP-10.10 contract and therefore inherits the complete UGP-10.9 → UGP-10.10 lineage.

The UGP-10.11 request must bind the exact:

- UGP-10.10 preparation fingerprint;
- UGP-10.7 candidate fingerprint.

Any stale or mismatched lineage fails closed.

## Frozen lineage

The resulting specification carries the exact:

- UGP-10.10 preparation ID and preparation fingerprint;
- UGP-10.9 send-review fingerprint;
- UGP-10.8 quality-gate fingerprint;
- UGP-10.6 request ID and request fingerprint;
- UGP-10.7 candidate fingerprint;
- UGP-10.7 mechanical-validation fingerprint;
- prospect fingerprint;
- opportunity fingerprint;
- original outreach approval-review fingerprint;
- source domain and source URL;
- target domain;
- exact validated target URL;
- UGP-10.10 recipient-role criteria;
- UGP-10.10 allowed delivery-channel types.

## Allowed evidence-source classes

UGP-10.11 may define only these future evidence-source classes:

- `source_domain_staff_or_team_page`;
- `source_domain_author_or_editor_page`;
- `source_domain_contact_or_editorial_page`;
- `official_organization_profile`.

These values describe classes of public organizational evidence.

They do not contain URLs, person identities, contact addresses, or provider bindings.

At least one source class is required.

Unknown or duplicate values fail closed.

The list is deterministically sorted before fingerprinting.

## Candidate research policy

The specification fixes the following policy for any later separately authorized research stage:

- maximum role candidates: 5;
- public business identity only;
- exact role evidence required;
- public source reference required;
- evidence observation timestamp required;
- relationship to the source domain required;
- private or brokered personal data prohibited;
- contact-address collection prohibited;
- recipient selection prohibited.

This policy does not itself authorize research.

## Resulting state

A valid UGP-10.11 contract results only in:

`recipient_research_spec_ready`

This means that a deterministic research specification exists.

It does **not** mean:

- recipient research is authorized;
- recipient research has run;
- a person has been identified;
- a person has been selected;
- an email address has been found;
- a phone number has been found;
- a profile URL has been collected;
- a contact record exists;
- contact data has been verified;
- sending is authorized.

## Safety semantics

UGP-10.11 explicitly records:

- deterministic: true;
- exact UGP-10.10 preparation required: true;
- recipient-research specification only: true;
- recipient research authorized: false;
- recipient research executed: false;
- actual recipient included: false;
- recipient identity included: false;
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

The static regression rejects implementation-level execution primitives for:

- OpenAI, Anthropic, or Gemini;
- `fetch`, Axios, Undici, or Got;
- PostgreSQL or Drizzle;
- environment credential reads;
- timers or cron;
- worker threads;
- child-process execution.

It also verifies that operational recipient/contact/provider fields such as recipient name, recipient email, phone number, profile URL, contact record, mailbox ID, and provider ID are absent.

## Persistence

UGP-10.11 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 database migration.

## Production boundary

UGP-10.11 does not modify:

- Railway;
- staging;
- production;
- databases;
- environment variables;
- credentials;
- provider integrations;
- mailboxes;
- public websites;
- schedulers;
- workers.

## Future boundaries

A future increment may define or execute recipient research only under a new bounded authorization and must remain separate from:

1. recipient selection and human approval;
2. contact-address verification;
3. mailbox/provider binding;
4. explicit send authorization;
5. actual transmission;
6. follow-up scheduling.

UGP-10.11 grants none of those capabilities.
