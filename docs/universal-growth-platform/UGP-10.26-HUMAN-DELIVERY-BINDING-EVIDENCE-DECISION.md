# UGP-10.26 — Human Delivery-Binding Evidence Decision

## Purpose

UGP-10.26 records the explicit human decision over an integrity-valid UGP-10.25 delivery-binding evidence review specification.

This milestone does **not** bind a provider, bind a mailbox, activate credentials, submit a contact form, transmit a message, construct a send job, or send outreach.

An approval is **eligibility-only**. It means only that the exact reviewed lineage may proceed to a later delivery-binding authorization-preparation stage.

Version:

`ugp-10-26-human-delivery-binding-evidence-decision-v1`

## Upstream boundary

UGP-10.26 accepts only an integrity-valid:

`AuthorityOutreachDeliveryBindingEvidenceReviewSpecification`

from UGP-10.25.

The decision builder re-runs UGP-10.25 integrity verification before accepting the review specification.

The upstream review specification must remain:

- `delivery_binding_evidence_review_ready`
- human review required
- no prior binding-evidence decision recorded
- no prior binding-evidence approval granted
- no authorization-preparation eligibility granted
- no delivery-binding execution authorization
- no provider binding authorization
- no mailbox binding authorization
- no web-submission execution authorization
- no credential activation
- no send authorization

Any upstream safety-boundary violation is rejected.

## Decision request

The human decision request binds exactly to:

- `deliveryBindingEvidenceReviewSpecFingerprint`
- `deliveryBindingEvidenceFingerprint`
- `deliveryBindingPreparationSpecFingerprint`
- `selectedContactPointFingerprint`
- `selectedRoleCandidateFingerprint`
- `candidateFingerprint`

It also contains:

- a decision
- a reason code
- an exact explicit-confirmation string

The caller cannot substitute a different review specification, evidence contract, preparation specification, contact point, role candidate, or outreach draft candidate.

## Allowed decisions

The decision must be one of the exact future decisions already frozen by UGP-10.25.

### Approval

`approve_for_delivery_binding_authorization_preparation`

This decision is available only when:

`evidenceDisposition === "delivery_binding_evidence_supporting"`

The only valid approval reason is:

`evidence_sufficient_for_binding_authorization_preparation`

An approved decision produces:

`delivery_binding_authorization_preparation_eligible`

This state is **not** delivery-binding authorization and does not perform a binding.

### Rejection

`reject_delivery_binding_evidence`

The resulting state is:

`delivery_binding_evidence_rejected`

Reason rules are disposition-specific:

- supporting evidence → `binding_context_unclear`
- contradictory evidence → `contradictory_binding_evidence`
- inconclusive evidence → `inconclusive_binding_evidence`

### Deferral

`defer_delivery_binding_evidence_review`

The resulting state is:

`delivery_binding_evidence_deferred`

Allowed defer reasons are:

- `evidence_needs_refresh`
- `needs_more_binding_context`
- `binding_context_unclear`

## Explicit confirmation

The confirmation string is deterministic and must be exactly:

`REVIEW_OUTREACH_DELIVERY_BINDING_EVIDENCE:<decision>:<review-spec-fingerprint>:<binding-evidence-fingerprint>:<binding-preparation-spec-fingerprint>:<selected-contact-point-fingerprint>:<selected-role-candidate-fingerprint>:<candidate-fingerprint>`

A malformed, missing, or stale confirmation fails closed.

## Reviewer identity and timestamp

UGP-10.26 requires:

- a normalized reviewer identifier
- a canonical ISO timestamp with millisecond precision and `Z` suffix

These values are included in the deterministic decision record and its fingerprint.

## Frozen decision record

The resulting immutable decision record freezes:

- exact UGP-10.25 review-spec fingerprint
- exact UGP-10.24 evidence fingerprint
- exact UGP-10.23 preparation-spec fingerprint
- exact full upstream outreach lineage
- exact channel class
- exact frozen binding requirement set
- exact evidence disposition
- exact decision
- exact reason code
- reviewer identity
- review timestamp
- exact resulting state

## Approval semantics

An approved record explicitly certifies:

- human decision recorded
- delivery-binding evidence approval granted
- delivery-binding authorization-preparation eligibility granted
- eligibility only

It simultaneously certifies that the following remain false:

- authorization-preparation execution
- delivery-binding execution authorization
- delivery-binding execution
- provider binding authorization
- provider binding execution
- mailbox binding authorization
- mailbox binding execution
- mailbox access
- mailbox probing
- credential activation
- web-form submission authorization
- web-form submission execution
- message-transmission authorization
- message transmission
- send-job construction
- send authorization
- outreach sending
- follow-up scheduling
- model calls
- provider calls
- network operations
- persistence
- scheduler execution
- worker execution
- provider writes
- public-site writes
- link-scheme automation

## Value-exclusion boundary

UGP-10.26 contains no value slots for:

- live provider identifiers
- sender mailbox identifiers
- API keys
- OAuth access tokens
- refresh tokens
- mailbox passwords
- provider secrets
- provider credential values
- provider credential-reference values
- submission-mechanism reference values

It carries only the immutable reviewed evidence lineage and the human decision.

## Static certification

The static safety test rejects implementation primitives for:

- model APIs
- HTTP/network clients
- PostgreSQL/Drizzle/SQL execution
- environment-variable access
- timers/cron
- workers/child processes
- DNS/MX operations
- SMTP and common email-provider SDKs

It also rejects value slots for provider/mailbox/credential/submission-mechanism values.

## Functional certification

The full-chain tests construct the governed outreach lineage through UGP-10.25 and certify that:

1. supporting email evidence may be approved only for authorization-preparation eligibility;
2. supporting web-contact-form evidence preserves the exact web-submission channel while remaining eligibility-only;
3. contradictory evidence cannot be approved;
4. contradictory evidence can be rejected with its exact reason code;
5. inconclusive evidence can be deferred without granting eligibility;
6. exact explicit confirmation is required;
7. exact UGP-10.25 through-draft lineage is required;
8. decision-specific reason-code rules are enforced;
9. the decision record is deterministic;
10. tampering is detected by integrity verification.

## Not authorized by UGP-10.26

UGP-10.26 does not authorize or perform:

- provider selection or account binding
- sender mailbox selection or binding
- provider credential storage
- credential-reference storage
- credential activation
- mailbox access or probing
- SMTP activity
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

A future UGP-10.27 may build a provider-free **delivery-binding authorization-preparation specification** from an integrity-valid UGP-10.26 approved decision.

That future preparation stage must still remain non-executing. It may freeze the classes of inputs, evidence, and authorization material that would be required for an eventual separately governed binding action, but it must not activate credentials, bind a provider or mailbox, submit a form, or send outreach.

Any real external binding remains a separately authorized operational action.
