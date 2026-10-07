# UGP-10.24 — Supplied Delivery-Binding Evidence Validation

## Purpose

UGP-10.24 introduces the next bounded authority-outreach stage after UGP-10.23.

UGP-10.23 freezes the delivery-binding requirement classes that would need to be satisfied before any future provider/mailbox/submission binding operation could even be considered. UGP-10.24 does **not** perform those operations. It validates a caller-supplied, fingerprint-only evidence set against the exact UGP-10.23 requirement set and derives an immutable evidence disposition.

Version:

`ugp-10-24-supplied-delivery-binding-evidence-validation-v1`

Resulting state:

`delivery_binding_evidence_validated`

## Upstream boundary

UGP-10.24 accepts only an integrity-valid:

`AuthorityOutreachDeliveryBindingPreparationSpecification`

from UGP-10.23.

The builder re-runs UGP-10.23 integrity verification before accepting the preparation specification.

The input must still be:

- `delivery_binding_preparation_spec_ready`
- specification-only
- provider binding unauthorized and unperformed
- mailbox binding unauthorized and unperformed
- credential-free
- credential-reference-free
- credential activation unauthorized
- send authorization absent
- binding execution disallowed
- message transmission disallowed

Any failure of the upstream safety boundary is rejected.

## Exact frozen lineage

The supplied request must bind exactly to:

- `deliveryBindingPreparationSpecFingerprint`
- `selectedContactPointFingerprint`
- `selectedRoleCandidateFingerprint`
- `candidateFingerprint`

A mismatch is rejected as stale lineage.

No caller may substitute a different contact point, role candidate, draft candidate, or UGP-10.23 preparation specification.

## Supplied evidence observations

The evidence request contains one observation for every requirement class frozen by UGP-10.23.

Each observation contains only:

- the exact `requirementClass`
- an `observationOutcome`
- canonical UTC `observedAt`
- a 64-character SHA-256-shaped `technicalEvidenceFingerprint`
- `publicBusinessBindingEvidenceAttested: true`

The technical evidence payload itself is not stored in this contract.

The observation outcomes are:

- `supports_binding_readiness`
- `contradicts_binding_readiness`
- `inconclusive`

## Exact requirement-set rule

UGP-10.24 requires exactly one observation for every UGP-10.23 frozen binding requirement.

It rejects:

- missing observations
- extra observations
- duplicate requirement classes
- requirement classes not allowed by the UGP-10.23 channel
- duplicate technical-evidence fingerprints
- malformed evidence fingerprints
- malformed timestamps
- missing public-business evidence attestation

The validated observations are emitted in the exact frozen UGP-10.23 requirement order, making the output deterministic even if supplied observations arrive in a different order.

## Channel behavior

### Email delivery binding

UGP-10.23 freezes:

- `sender_identity_required`
- `sender_mailbox_binding_required`
- `email_delivery_provider_binding_required`
- `provider_capability_class_required`
- `future_provider_credential_reference_required`

UGP-10.24 may validate fingerprint-only evidence for these requirement classes.

It does not carry a sender mailbox identifier, provider identifier, credential, credential-reference value, API key, OAuth token, password, secret, or any provider-specific connection value.

### Web contact-form submission binding

UGP-10.23 freezes:

- `submission_actor_identity_required`
- `web_contact_form_target_binding_required`
- `https_submission_capability_required`
- `future_submission_mechanism_reference_required`

UGP-10.24 validates only these web-submission requirement classes for that channel.

It does not invent email-provider or sender-mailbox requirements and does not include or activate a submission-mechanism reference value.

## Evidence disposition

The immutable contract derives one disposition:

### Supporting

`delivery_binding_evidence_supporting`

Every frozen requirement has one observation and every observation reports `supports_binding_readiness`.

### Contradictory

`delivery_binding_evidence_contradictory`

At least one observation reports `contradicts_binding_readiness`.

Contradictory evidence takes precedence over inconclusive evidence.

### Inconclusive

`delivery_binding_evidence_inconclusive`

No observation contradicts readiness, but at least one observation is inconclusive.

## Explicit safety semantics

UGP-10.24 is supplied-evidence validation only.

The contract explicitly certifies:

- deterministic output
- exact UGP-10.23 preparation specification required
- exact selected contact point required
- exact frozen requirement set required
- supplied binding evidence validation only
- no independent binding verification performed
- no technical evidence payload included
- no live provider identifier included
- no sender mailbox identifier included
- no provider credential included
- no provider credential-reference value included
- no credential activation
- no submission-mechanism reference value included
- no provider binding authorization
- no provider binding execution
- no mailbox binding authorization
- no mailbox binding execution
- no mailbox access
- no mailbox probing
- no web-form submission authorization
- no web-form submission execution
- no message-transmission authorization
- no message transmission
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

- OpenAI, Anthropic, or Gemini calls
- `fetch`, Axios, Undici, or Got
- PostgreSQL, Drizzle, or SQL execution
- environment-variable access
- timers or cron
- workers or child processes
- DNS/MX operations
- SMTP or common mail-provider SDKs

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

The full-chain tests construct the same governed authority-outreach lineage used by UGP-10.23 and certify that:

1. email binding evidence validates the exact five frozen email requirement classes without granting execution authority;
2. web-contact-form evidence validates only the exact four web-submission requirement classes;
3. incomplete, duplicate-requirement, and duplicate-evidence sets fail closed;
4. contradictory evidence takes precedence over inconclusive evidence;
5. supporting disposition requires a complete all-supporting set;
6. exact UGP-10.23 through draft lineage is required;
7. output is deterministic;
8. tampering is detected by integrity verification.

## Not authorized by UGP-10.24

UGP-10.24 does not authorize or perform:

- provider account selection
- provider connection
- provider credential storage
- provider credential-reference storage
- provider credential activation
- sender mailbox selection or binding
- sender mailbox access
- mailbox probing
- SMTP activity
- web-form submission
- browser automation
- message transmission
- send-job creation
- send authorization
- outreach sending
- follow-up scheduling
- database writes
- staging or production changes

## Next bounded stage

A future milestone may build a **human review specification** over an integrity-valid UGP-10.24 evidence contract.

That future review stage should remain read-only and should not itself bind a provider, bind a mailbox, activate credentials, submit a form, or send outreach.

Actual provider/mailbox/submission binding remains a separately governed operational action requiring explicit authorization after evidence review and an explicit human decision.
