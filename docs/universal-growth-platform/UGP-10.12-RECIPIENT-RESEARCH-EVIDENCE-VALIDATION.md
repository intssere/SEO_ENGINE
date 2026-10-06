# UGP-10.12 — Provider-Free Recipient Research Evidence Validation

Version: `ugp-10-12-recipient-research-evidence-validation-v1`

## Purpose

UGP-10.12 validates a caller-supplied set of public business/editorial role-candidate observations against an integrity-valid UGP-10.11 recipient-research specification.

This stage does not perform research.

It does not browse a website, query a search engine, call a data provider, discover an email address, collect a phone number, select a recipient, verify contactability, bind a mailbox/provider, authorize a send, transmit outreach, or schedule follow-up.

## Required upstream state

UGP-10.12 accepts only an integrity-valid UGP-10.11 contract whose state is exactly:

`recipient_research_spec_ready`

The UGP-10.12 request must repeat the exact:

- UGP-10.11 research-spec fingerprint;
- UGP-10.7 outreach-draft candidate fingerprint.

Any stale or mismatched lineage fails closed.

## Supplied evidence only

UGP-10.12 accepts observations supplied by the caller.

The implementation itself performs no acquisition or lookup.

A supplied observation may contain only public business-role metadata:

- display name;
- organization name;
- role title;
- one or more UGP-10.11-allowed role criteria;
- one UGP-10.11-allowed evidence-source class;
- public evidence URL;
- evidence observation timestamp;
- evidence fingerprint;
- explicit public-business-identity attestation.

This stage does not establish that the software itself found the person or source.

It validates the supplied structure and lineage only.

## Candidate limit

The candidate set remains bounded by the UGP-10.11 policy:

- maximum role candidates: 5.

More than five observations fail closed.

## Research outcome

The request must declare exactly one outcome:

- `candidate_set`;
- `no_public_role_candidate`.

`candidate_set` requires at least one supplied observation.

`no_public_role_candidate` requires an empty observation set.

This prevents ambiguous empty or contradictory research results.

## Public evidence-source constraints

Every supplied evidence source must:

- use HTTPS;
- contain no URL username/password credentials;
- contain no URL fragment;
- resolve syntactically to the UGP-10.11 source domain or one of its subdomains;
- use an evidence-source class allowed by the exact UGP-10.11 specification.

UGP-10.12 does not fetch the URL.

The URL is treated only as a deterministic public-source reference.

## Role constraints

Every supplied role candidate must match at least one role criterion already allowed by the exact UGP-10.11 specification.

Unknown, duplicate, or out-of-scope role criteria fail closed.

## Contact-data exclusion

Public business-role text is rejected when it contains contact-like data such as:

- an email address marker;
- an embedded HTTP/HTTPS URL;
- a `mailto:` or `tel:` reference;
- a phone-number-like sequence.

Operational contact fields are not part of the contract.

UGP-10.12 contains no:

- recipient email;
- email address;
- phone-number field;
- social handle;
- profile URL field;
- contact record;
- mailbox ID;
- provider ID.

## Canonicalization and duplicates

Candidate display name, organization name, and role title are whitespace-normalized.

Role criteria are sorted deterministically.

Validated candidates are sorted by derived role-candidate fingerprint.

Duplicate public-business identities fail closed.

Duplicate evidence URLs fail closed.

Equivalent candidate sets in different input order therefore produce the same research-evidence fingerprint.

## Resulting state

A valid result produces only:

`recipient_research_evidence_validated`

This means only that supplied public-business role evidence has passed deterministic structural and lineage validation.

It does not mean:

- research was executed by the system;
- the candidate is selected;
- the candidate is approved for outreach;
- an address has been found;
- an address is verified;
- a mailbox/provider has been selected;
- a send job exists;
- sending is authorized.

## Safety semantics

UGP-10.12 explicitly records:

- deterministic: true;
- exact UGP-10.11 specification required: true;
- supplied research-evidence validation only: true;
- external recipient research authorized/performed: false;
- public-business role-candidate records only: true;
- private/brokered personal data allowed: false;
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

It also guards against operational recipient/contact/mailbox/provider identifier fields.

## Persistence

UGP-10.12 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 database migration.

## Production boundary

UGP-10.12 does not modify:

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

A later separately bounded increment may consume validated role candidates for recipient-selection/human-review preparation.

That future work remains separate from:

1. actual external research execution;
2. recipient selection and human approval;
3. contact-address verification;
4. mailbox/provider binding;
5. explicit send authorization;
6. transmission;
7. follow-up scheduling.

UGP-10.12 grants none of those capabilities.
