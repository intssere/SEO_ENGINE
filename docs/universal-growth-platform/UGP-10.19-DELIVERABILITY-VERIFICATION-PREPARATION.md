# UGP-10.19 — Provider-Free Deliverability Verification Preparation

Version: `ugp-10-19-deliverability-verification-preparation-v1`

## Purpose

UGP-10.19 converts an integrity-valid UGP-10.18 approval into an immutable deliverability-verification preparation specification.

This stage prepares a technical verification contract only.

It does not resolve domains, query mail-exchange records, call a verification provider, test endpoint reachability, probe a mailbox, send a message, persist contact data, bind a provider, authorize sending, or schedule follow-up.

## Required upstream state

UGP-10.19 accepts only an integrity-valid UGP-10.18 decision that:

- has decision `approve_for_deliverability_verification_preparation`;
- has state `deliverability_verification_preparation_eligible`;
- contains exactly one selected frozen contact point;
- records policy/consent approval for workflow continuation;
- still records deliverability-verification preparation execution as false;
- still records deliverability verification authorization as false;
- still records verification-provider authorization as false;
- still records send authorization as false.

Rejected or deferred UGP-10.18 decisions fail closed.

## Exact lineage

The request must repeat the exact:

- UGP-10.18 policy/consent-decision fingerprint;
- selected contact-point fingerprint;
- selected role-candidate fingerprint;
- UGP-10.7 draft-candidate fingerprint.

The resulting specification freezes the exact upstream lineage through UGP-10.18.

Any stale or mismatched lineage fails closed.

## Exact selected contact point

UGP-10.19 copies the exact UGP-10.18 selected public-business contact point unchanged.

It does not:

- replace the point;
- mutate the point;
- enrich the point;
- discover another point;
- infer another point;
- verify the point.

## Future verification-method classes

UGP-10.19 derives method-class labels only from the frozen contact-point type.

For an `email_address`:

- `email_domain_mail_exchange_presence`;
- `email_external_deliverability_assessment`.

For a `web_contact_form`:

- `web_form_https_reachability`;
- `web_form_presence_assessment`.

These labels describe possible future technical evidence classes.

They are not executable instructions and grant no authority to perform the checks.

## Preparation policy

The preparation specification records:

- exact selected contact point required: true;
- public-business contact only: true;
- maximum verification-method classes: 2;
- technical-evidence fingerprint required: true;
- verification observation timestamp required: true;
- deterministic result required: true;
- provider credential reference allowed: false;
- mailbox identifier allowed: false;
- verification execution allowed: false;
- verification-provider call allowed: false;
- mailbox probe allowed: false;
- message transmission allowed: false.

## Resulting state

A valid UGP-10.19 contract produces only:

`deliverability_verification_preparation_spec_ready`

This means a deterministic technical-preparation specification exists.

It does not mean:

- domain resolution occurred;
- mail-exchange lookup occurred;
- an endpoint was reached;
- deliverability was assessed;
- a verification provider was called;
- a mailbox was probed or accessed;
- a provider/mailbox was bound;
- a send job exists;
- sending is authorized.

## Safety semantics

UGP-10.19 explicitly records:

- deterministic: true;
- exact UGP-10.18 human decision required: true;
- exact selected contact point required: true;
- deliverability-verification preparation specification only: true;
- selected contact point frozen: true;
- actual verification result included: false;
- deliverability verification authorized/performed: false;
- domain resolution authorized: false;
- mail-exchange lookup authorized: false;
- endpoint-reachability check authorized: false;
- verification-provider call authorized/performed: false;
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
- DNS resolution helpers;
- SMTP and common mail-delivery provider primitives.

It also guards against provider/mailbox credential and identifier fields.

## Persistence

UGP-10.19 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 database migration.

## Production boundary

UGP-10.19 does not modify:

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

A later increment may validate **supplied** deliverability-verification evidence against this exact UGP-10.19 specification.

That future supplied-evidence stage should remain provider-free and should not itself perform DNS, mail-exchange, endpoint, mailbox, or verification-provider operations.

Actual external verification execution, mailbox/provider binding, send authorization, transmission, and follow-up scheduling remain separate authorization boundaries.

UGP-10.19 grants none of those capabilities.
