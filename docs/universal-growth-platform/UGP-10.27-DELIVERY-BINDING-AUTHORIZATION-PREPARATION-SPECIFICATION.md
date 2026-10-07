# UGP-10.27 — Delivery-Binding Authorization-Preparation Specification

## Purpose

UGP-10.27 is the bounded, provider-free successor to UGP-10.26.

It consumes only an integrity-valid **approved** UGP-10.26 human delivery-binding evidence decision and produces a deterministic specification describing the classes of authorization material that would be required before any separately governed external binding could occur.

UGP-10.27 does **not** grant binding authorization, activate credentials, bind a provider or mailbox, configure a submission mechanism, submit a form, transmit a message, create a send job, or send outreach.

Version:

`ugp-10-27-delivery-binding-authorization-preparation-specification-v1`

Resulting state:

`delivery_binding_authorization_preparation_spec_ready`

## Upstream boundary

UGP-10.27 accepts only an integrity-valid UGP-10.26 decision whose exact state is:

`delivery_binding_authorization_preparation_eligible`

The decision must also be exactly:

`approve_for_delivery_binding_authorization_preparation`

with reason:

`evidence_sufficient_for_binding_authorization_preparation`

and evidence disposition:

`delivery_binding_evidence_supporting`

The builder rejects rejected or deferred UGP-10.26 decisions.

## Exact lineage

The preparation request must bind exactly to:

- `deliveryBindingEvidenceDecisionFingerprint`
- `deliveryBindingEvidenceReviewSpecFingerprint`
- `deliveryBindingEvidenceFingerprint`
- `deliveryBindingPreparationSpecFingerprint`
- `selectedContactPointFingerprint`
- `selectedRoleCandidateFingerprint`
- `candidateFingerprint`

Any mismatch fails as stale lineage.

## Authorization-material classes

UGP-10.27 freezes **requirement-class names only**. It does not accept or store actual provider, mailbox, credential, account, or submission-mechanism values.

### Common classes

Every channel requires:

- `exact_human_binding_evidence_decision_required`
- `bounded_binding_scope_authorization_required`
- `rollback_unbind_plan_required`
- `post_binding_verification_plan_required`

### Email delivery binding

Email adds:

- `sender_identity_binding_authorization_required`
- `sender_mailbox_binding_authorization_required`
- `email_delivery_provider_binding_authorization_required`
- `provider_credential_activation_authorization_required`

### Web contact-form submission binding

Web contact-form delivery adds:

- `submission_actor_binding_authorization_required`
- `web_contact_form_target_binding_authorization_required`
- `submission_mechanism_binding_authorization_required`
- `web_submission_capability_activation_authorization_required`

UGP-10.27 does not mix email-specific authorization classes into a web-contact-form channel.

## Preparation policy

The specification explicitly requires:

- the exact approved UGP-10.26 human decision
- supporting evidence disposition
- exact channel class
- exact frozen binding requirement set
- channel-specific authorization material

The policy explicitly forbids:

- live provider identifiers
- sender mailbox identifiers
- provider credential values
- provider credential-reference values
- OAuth-token values
- provider-secret values
- submission-mechanism reference values
- authorization grants
- credential activation
- binding execution
- mailbox access
- mailbox probing
- web submission execution
- message transmission
- send-job construction

## Safety semantics

UGP-10.27 certifies:

- deterministic output
- exact UGP-10.26 decision required
- exact UGP-10.25 review specification required
- exact UGP-10.24 evidence required
- exact UGP-10.23 binding-preparation specification required
- exact selected contact point required
- exact channel class required
- exact frozen binding requirement set required
- authorization-preparation specification only
- authorization-preparation specification built
- future authorization-material classes frozen
- UGP-10.26 eligibility consumed as specification input only
- no delivery-binding authorization granted
- no delivery-binding authorization recorded
- no authorization-preparation execution
- no binding execution authorization
- no binding execution
- no live provider identifier
- no sender mailbox identifier
- no provider credential
- no credential-reference value
- no credential activation
- no submission-mechanism reference value
- no provider binding authorization or execution
- no mailbox binding authorization or execution
- no mailbox access or probing
- no web submission authorization or execution
- no message-transmission authorization or execution
- no send-job construction
- no send authorization
- no outreach sending
- no follow-up scheduling
- no model call
- no provider call
- no network operation
- no persistence
- no scheduler
- no worker
- no provider write
- no public-site write
- no link-scheme automation

## Static certification

The static test rejects implementation primitives for:

- model APIs
- HTTP/network clients
- PostgreSQL/Drizzle/SQL execution
- environment-variable access
- timers or cron
- workers or child processes
- DNS/MX resolution
- SMTP and common mail-provider SDKs

It also rejects value slots for:

- API keys
- access tokens
- refresh tokens
- mailbox passwords
- provider secrets
- provider IDs
- sender mailbox values
- credential-reference values
- submission-mechanism reference values

## Functional certification

The full-chain tests reconstruct the governed outreach lineage through UGP-10.26 and certify that:

1. approved email decisions yield only the exact email authorization-material classes;
2. approved web-contact-form decisions yield only the exact web authorization-material classes;
3. rejected UGP-10.26 decisions cannot produce an authorization-preparation specification;
4. deferred UGP-10.26 decisions cannot produce an authorization-preparation specification;
5. exact UGP-10.26 through-draft lineage is required;
6. output is deterministic;
7. tampering is detected by integrity verification.

## Not authorized by UGP-10.27

UGP-10.27 does not authorize or perform:

- provider-account selection
- provider-account connection
- provider credential storage
- credential-reference storage
- credential activation
- sender mailbox selection
- sender mailbox binding
- mailbox access
- mailbox probing
- provider binding
- submission-mechanism binding
- web-form submission
- browser automation
- message transmission
- send-job creation
- send authorization
- outreach sending
- follow-up scheduling
- database writes
- staging changes
- production changes

## Next bounded stage

A future UGP-10.28 may define a **delivery-binding authorization review specification** over an integrity-valid UGP-10.27 preparation specification.

That future review stage should remain non-executing and should freeze the exact authorization-material classes for explicit human review.

A later explicit human authorization decision may determine whether an external binding action is eligible to be separately authorized, but no UGP specification or review stage should silently execute provider/mailbox/submission binding.

Any actual external binding remains a separately governed operational action requiring explicit authorization.
