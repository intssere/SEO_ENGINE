# UGP-10.29 — Human Delivery-Binding Authorization Decision

## Purpose

UGP-10.29 records the explicit human decision over an integrity-valid UGP-10.28 delivery-binding authorization review specification.

This is the terminal stage of the current provider-free specification/governance chain. It does **not** itself grant or execute provider binding, mailbox binding, credential activation, submission binding, web-form submission, message transmission, send-job construction, or outreach sending.

Version:

`ugp-10-29-human-delivery-binding-authorization-decision-v1`

## Upstream boundary

UGP-10.29 accepts only an integrity-valid:

`AuthorityOutreachDeliveryBindingAuthorizationReviewSpecification`

from UGP-10.28.

The decision builder re-runs UGP-10.28 integrity verification before accepting the review specification.

The upstream review specification must remain:

- `delivery_binding_authorization_review_ready`
- human authorization review required
- no prior authorization decision recorded
- no prior authorization approval granted
- no separate operational-authorization eligibility granted
- no delivery-binding authorization grant or record
- no binding execution authorization
- no credential activation
- no provider or mailbox binding authorization
- no web-submission execution authorization
- no send authorization

Any upstream safety-boundary violation fails closed.

## Exact lineage

The decision request binds exactly to:

- `deliveryBindingAuthorizationReviewSpecFingerprint`
- `deliveryBindingAuthorizationPreparationSpecFingerprint`
- `deliveryBindingEvidenceDecisionFingerprint`
- `selectedContactPointFingerprint`
- `selectedRoleCandidateFingerprint`
- `candidateFingerprint`

A stale or substituted review specification, preparation specification, evidence decision, contact point, role candidate, or draft candidate is rejected.

## Decisions

### Approve

`approve_for_separate_delivery_binding_operational_authorization`

Required reason:

`authorization_preparation_sufficient_for_separate_operational_authorization`

Resulting state:

`delivery_binding_operational_authorization_eligible`

This state means only that the exact reviewed lineage is eligible for a **separate explicit operational authorization action**.

It is not a delivery-binding authorization grant and does not execute any external action.

### Reject

`reject_delivery_binding_authorization_preparation`

Required reason:

`authorization_preparation_rejected`

Resulting state:

`delivery_binding_authorization_preparation_rejected`

### Defer

`defer_delivery_binding_authorization_review`

Allowed reasons:

- `authorization_scope_unclear`
- `rollback_or_verification_requirements_unclear`
- `needs_more_authorization_context`

Resulting state:

`delivery_binding_authorization_review_deferred`

## Explicit confirmation

The exact confirmation string is:

`REVIEW_OUTREACH_DELIVERY_BINDING_AUTHORIZATION:<decision>:<review-spec-fingerprint>:<authorization-preparation-spec-fingerprint>:<evidence-decision-fingerprint>:<selected-contact-point-fingerprint>:<selected-role-candidate-fingerprint>:<candidate-fingerprint>`

Malformed, missing, or stale confirmation fails closed.

## Reviewer identity and time

UGP-10.29 requires:

- normalized reviewer identifier
- canonical ISO timestamp with millisecond precision and `Z`

The decision record is deterministic over the frozen lineage, decision, reason, reviewer, and timestamp.

## Approval semantics

An approved UGP-10.29 record explicitly certifies:

- human decision recorded
- authorization review approved
- separate operational-authorization eligibility granted
- eligibility only

It simultaneously certifies the following remain false:

- separate operational authorization execution
- delivery-binding authorization granted
- delivery-binding authorization recorded
- authorization-preparation execution
- binding execution authorization
- binding execution
- provider binding authorization or execution
- mailbox binding authorization or execution
- mailbox access or probing
- credential activation
- web-submission authorization or execution
- message-transmission authorization or execution
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

UGP-10.29 contains no value slots for:

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

It carries only the frozen governed lineage and the human decision.

## Functional certification

The full-chain tests reconstruct the governed outreach lineage through UGP-10.28 and certify that:

1. approved email review records only separate-operational-authorization eligibility;
2. approved web-contact-form review preserves exact channel-specific authorization classes;
3. reject and defer decisions do not grant eligibility;
4. exact explicit confirmation is required;
5. exact UGP-10.28 through-draft lineage is required;
6. decision-specific reason-code rules are enforced;
7. output is deterministic;
8. tampering is detected.

## Not authorized by UGP-10.29

UGP-10.29 does not authorize or perform:

- provider-account connection
- provider credential storage
- credential-reference storage
- credential activation
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

## UGP-10 closure boundary

UGP-10.29 completes the current provider-free specification/governance chain.

Before declaring all of UGP-10 complete, a dedicated closure audit must compare the implemented system against the canonical UGP-10 roadmap exit criteria:

- no uncontrolled bulk mail path;
- every send binds a real qualified prospect;
- duplicate/suppressed contacts fail closed;
- initial sending integration is human-reviewed.

That closure audit should freeze the exact remaining runtime/certification work rather than extending the sequence speculatively.

Any real provider/mailbox/submission binding or message transmission requires separate explicit operational authorization.
