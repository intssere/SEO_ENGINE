# UGP-10.23 — Provider-Free Delivery-Binding Preparation Specification

Version: `ugp-10-23-delivery-binding-preparation-specification-v1`

## Purpose

UGP-10.23 converts an integrity-valid, explicitly approved UGP-10.22 deliverability-evidence decision into an immutable, provider-free delivery-binding preparation specification.

The stage defines only what a later binding stage would have to supply for the exact frozen delivery channel.

It does not bind a provider or mailbox, choose a live provider, include a provider identifier, include or activate credentials, access or probe a mailbox, submit a web form, construct a send job, authorize sending, transmit outreach, persist data, or schedule follow-up.

## Required upstream state

UGP-10.23 accepts only an integrity-valid UGP-10.22 decision satisfying all of the following:

- decision is exactly `approve_for_provider_mailbox_binding_preparation`;
- resulting state is exactly `provider_mailbox_binding_preparation_eligible`;
- evidence disposition is exactly `deliverability_evidence_supporting`;
- eligibility-only semantics remain true;
- deliverability-evidence approval is granted;
- provider/mailbox-binding preparation eligibility is granted;
- provider/mailbox-binding preparation execution remains false;
- provider binding remains unauthorized;
- mailbox binding remains unauthorized;
- no provider credential is included;
- send authorization remains false.

Rejected or deferred UGP-10.22 decisions fail closed.

## Exact lineage

The preparation request must repeat the exact:

- UGP-10.22 decision fingerprint;
- UGP-10.21 review-spec fingerprint;
- UGP-10.20 deliverability-evidence fingerprint;
- selected contact-point fingerprint;
- selected role-candidate fingerprint;
- UGP-10.7 draft-candidate fingerprint.

Any mismatch fails closed.

The selected contact point itself is recovered from the already integrity-validated upstream lineage. The caller cannot substitute a different contact-point type or value.

## Channel-specific requirements

### Email contact point

For `email_address`, the specification freezes these future requirement classes:

- `sender_identity_required`;
- `sender_mailbox_binding_required`;
- `email_delivery_provider_binding_required`;
- `provider_capability_class_required`;
- `future_provider_credential_reference_required`.

These are requirement classes only. The specification contains no sender mailbox identifier, provider identifier, provider credential reference value, credential value, API key, password, OAuth token, or provider secret.

### Web-contact-form contact point

For `web_contact_form`, the specification freezes these future requirement classes:

- `submission_actor_identity_required`;
- `web_contact_form_target_binding_required`;
- `https_submission_capability_required`;
- `future_submission_mechanism_reference_required`.

A web-contact-form contact point does not create a sender-mailbox requirement and does not create an email-delivery-provider requirement.

## Resulting state

The resulting state is:

`delivery_binding_preparation_spec_ready`

This state means only that a deterministic future binding requirement specification exists.

It is not provider binding, mailbox binding, credential activation, submission authorization, send-job construction, send authorization, or transmission authorization.

## Preparation policy

The contract explicitly requires:

- the exact approved UGP-10.22 decision;
- supporting deliverability evidence;
- the exact frozen public-business contact point;
- channel-specific requirement derivation.

It explicitly disallows:

- live provider identifiers;
- sender mailbox identifiers;
- provider credential values;
- provider credential-reference values;
- OAuth-token values;
- provider-secret values;
- binding execution;
- mailbox access;
- web-form submission execution;
- message transmission.

## Safety semantics

UGP-10.23 explicitly records:

- deterministic: true;
- exact UGP-10.22 human decision required: true;
- exact deliverability evidence required: true;
- exact selected contact point required: true;
- exact evidence disposition required: true;
- preparation specification only: true;
- selected contact point frozen: true;
- channel-specific requirements frozen: true;
- provider/mailbox-binding preparation executed: false;
- provider binding authorized/performed: false;
- mailbox binding authorized/performed: false;
- mailbox access authorized: false;
- mailbox probing authorized/performed: false;
- provider credential included: false;
- provider credential reference included: false;
- provider credential activation authorized: false;
- live provider identifier included: false;
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

The static regression rejects implementation-level primitives for:

- model providers;
- HTTP/network clients;
- PostgreSQL/Drizzle;
- environment credential reads;
- timers/cron;
- worker threads;
- child-process execution;
- DNS/MX helpers;
- SMTP and common mail-delivery providers.

It also checks that the source exposes no fields for actual API keys, access tokens, refresh tokens, mailbox passwords, provider secrets, or provider IDs.

## Persistence

UGP-10.23 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 migration.

## Production boundary

UGP-10.23 does not modify:

- Railway;
- staging;
- production;
- databases;
- environment variables;
- credentials;
- DNS/MX/SMTP configuration;
- verification providers;
- sender mailboxes;
- external recipient systems;
- public websites;
- schedulers;
- workers.

## Next bounded boundary

A later bounded increment may define a supplied provider/mailbox/delivery-binding configuration or evidence contract against this exact immutable specification.

That later stage should still remain provider-free initially where practical, followed by a human review and explicit binding decision.

Actual provider/mailbox binding, credential activation, web-form submission, send-job construction, send authorization, transmission, and follow-up scheduling remain separate authorization boundaries.

UGP-10.23 grants none of those capabilities.
