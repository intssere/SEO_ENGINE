# UGP-10.20 — Provider-Free Supplied Deliverability Evidence Validation

Version: `ugp-10-20-supplied-deliverability-evidence-validation-v1`

## Purpose

UGP-10.20 validates caller-supplied technical evidence against an integrity-valid UGP-10.19 deliverability-verification preparation specification.

This stage validates structure, lineage, completeness, timestamps, fingerprints, and evidence dispositions only.

It does not perform DNS resolution, mail-exchange lookup, endpoint reachability checks, deliverability-provider calls, SMTP probing, mailbox access, persistence, sending, or follow-up scheduling.

## Required upstream state

UGP-10.20 accepts only an integrity-valid UGP-10.19 contract whose state is exactly:

`deliverability_verification_preparation_spec_ready`

The request must repeat the exact:

- UGP-10.19 deliverability-preparation fingerprint;
- selected contact-point fingerprint;
- selected role-candidate fingerprint;
- UGP-10.7 draft-candidate fingerprint.

Any stale or mismatched lineage fails closed.

## Complete method-set requirement

UGP-10.20 requires one supplied observation for every method class frozen by UGP-10.19.

For an email contact point, the exact required set is:

- `email_domain_mail_exchange_presence`;
- `email_external_deliverability_assessment`.

For a web-contact-form point, the exact required set is:

- `web_form_https_reachability`;
- `web_form_presence_assessment`.

A missing method, duplicate method, or method outside the exact UGP-10.19 set fails closed.

## Supplied observation fields

Each caller-supplied observation must contain:

- exact allowed method class;
- observation outcome;
- canonical observation timestamp;
- technical-evidence fingerprint;
- explicit public-business technical-evidence attestation.

No raw provider response or technical evidence payload is accepted or stored by this contract.

## Allowed observation outcomes

Each method observation must use exactly one of:

- `supports_reachability`;
- `contradicts_reachability`;
- `inconclusive`.

These values describe the supplied evidence only.

They do not assert that UGP-10.20 independently performed the technical check.

## Technical-evidence fingerprints

Each supplied technical-evidence fingerprint must be a canonical 64-character lowercase hexadecimal fingerprint.

A single technical-evidence fingerprint cannot satisfy more than one required method class.

The contract binds each supplied fingerprint together with:

- exact UGP-10.19 preparation fingerprint;
- exact selected contact-point fingerprint;
- method class;
- observation outcome;
- canonical timestamp;
- public-business evidence attestation.

The resulting observation is tamper-evident.

## Aggregate evidence disposition

UGP-10.20 deterministically computes one disposition.

If any required observation is `contradicts_reachability`:

`deliverability_evidence_contradictory`

If every required observation is `supports_reachability`:

`deliverability_evidence_supporting`

Otherwise:

`deliverability_evidence_inconclusive`

These are evidence dispositions only.

`deliverability_evidence_supporting` is not a send authorization and is not an assertion that this software independently verified the contact point.

## Resulting state

Every structurally valid UGP-10.20 contract produces only:

`deliverability_verification_evidence_validated`

This means the supplied evidence passed deterministic validation.

It does not mean:

- DNS resolution was performed;
- MX records were queried;
- an HTTP endpoint was reached;
- SMTP probing occurred;
- deliverability was independently verified;
- a verification provider was called;
- a mailbox was accessed;
- a provider or mailbox was bound;
- a send job exists;
- sending is authorized.

## Safety semantics

UGP-10.20 explicitly records:

- deterministic: true;
- exact UGP-10.19 preparation required: true;
- exact selected contact point required: true;
- exact verification-method set required: true;
- supplied technical-evidence validation only: true;
- independent technical verification performed: false;
- technical evidence payload included: false;
- domain resolution authorized/performed: false;
- mail-exchange lookup authorized/performed: false;
- endpoint-reachability check authorized/performed: false;
- verification-provider calls authorized/performed: false;
- mailbox probing authorized/performed: false;
- mailbox access authorized: false;
- provider binding authorized: false;
- provider credential included: false;
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
- child-process execution;
- DNS/MX helpers;
- SMTP and common mail-delivery providers.

It also rejects operational provider/mailbox credential or identifier fields while allowing explicit safety-policy field names.

## Persistence

UGP-10.20 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 database migration.

## Production boundary

UGP-10.20 does not modify:

- Railway;
- staging;
- production;
- databases;
- environment variables;
- credentials;
- DNS or verification providers;
- mailboxes;
- public websites;
- schedulers;
- workers.

## Next bounded boundary

A later increment may prepare an immutable human review specification over an exact UGP-10.20 evidence contract.

That future review should determine whether the supplied evidence disposition is sufficient to continue toward provider/mailbox-binding preparation.

Actual external verification execution, mailbox/provider binding, send authorization, transmission, and follow-up scheduling remain separate authorization boundaries.

UGP-10.20 grants none of those capabilities.
