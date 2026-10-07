# UGP-10.28 — Delivery-Binding Authorization Review Specification

## Purpose

UGP-10.28 is the bounded human-review preparation stage after UGP-10.27.

It consumes only an integrity-valid UGP-10.27 delivery-binding authorization-preparation specification and freezes the exact channel, binding requirements, and future authorization-material classes for explicit human review.

UGP-10.28 does **not** grant operational authorization, bind a provider or mailbox, activate credentials, configure a submission mechanism, submit a form, transmit a message, create a send job, or send outreach.

Version:

`ugp-10-28-delivery-binding-authorization-review-specification-v1`

Resulting state:

`delivery_binding_authorization_review_ready`

## Upstream boundary

UGP-10.28 accepts only an integrity-valid:

`AuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification`

from UGP-10.27.

The builder re-runs UGP-10.27 integrity verification before accepting the specification.

The upstream specification must remain:

- `delivery_binding_authorization_preparation_spec_ready`
- authorization-preparation specification only
- authorization-material classes frozen
- no delivery-binding authorization granted
- no delivery-binding authorization recorded
- no binding execution authorization
- no binding execution
- no credential activation
- no provider binding authorization
- no mailbox binding authorization
- no web-submission execution authorization
- no send authorization

Any upstream safety-boundary violation fails closed.

## Exact lineage

The review request must bind exactly to:

- `deliveryBindingAuthorizationPreparationSpecFingerprint`
- `deliveryBindingEvidenceDecisionFingerprint`
- `selectedContactPointFingerprint`
- `selectedRoleCandidateFingerprint`
- `candidateFingerprint`

A stale or substituted preparation specification, evidence decision, contact point, role candidate, or draft candidate is rejected.

## Frozen review material

UGP-10.28 freezes:

- exact UGP-10.27 preparation-spec fingerprint
- exact UGP-10.26 human evidence-decision fingerprint
- exact full upstream outreach lineage
- exact channel class
- exact frozen UGP-10.23 binding requirement set
- exact UGP-10.27 authorization-material class set
- exact authorization-material count
- supporting evidence disposition
- the approved UGP-10.26 evidence decision

No provider account, mailbox, credential, token, secret, or submission-mechanism value is included.

## Human-review requirements

The reviewer must consider:

- the exact authorization-preparation specification
- the exact approved evidence decision
- the exact channel
- the exact binding requirement set
- the exact authorization-material class set
- bounded binding scope
- rollback/unbind requirements
- post-binding verification requirements
- channel-specific authorization requirements
- an explicit human decision

The review specification forbids inferring:

- operational authorization
- credential activation
- binding execution
- send authorization

## Future human-decision options

UGP-10.28 records no decision itself.

A later bounded human-decision stage may choose one of:

- `approve_for_separate_delivery_binding_operational_authorization`
- `defer_delivery_binding_authorization_review`
- `reject_delivery_binding_authorization_preparation`

The approval option means only that the exact reviewed lineage may become eligible for a **separate operational authorization action**.

It is not itself provider binding, mailbox binding, submission binding, credential activation, web submission, or send authorization.

Allowed future reason codes are:

- `authorization_preparation_sufficient_for_separate_operational_authorization`
- `authorization_scope_unclear`
- `rollback_or_verification_requirements_unclear`
- `needs_more_authorization_context`
- `authorization_preparation_rejected`

## Explicit confirmation prefix

A later human decision must use the frozen prefix:

`REVIEW_OUTREACH_DELIVERY_BINDING_AUTHORIZATION`

UGP-10.28 itself does not create or record that future decision.

## Safety semantics

UGP-10.28 explicitly certifies:

- deterministic output
- exact UGP-10.27 preparation specification required
- exact UGP-10.26 evidence decision required
- exact channel frozen
- exact binding requirement set frozen
- exact authorization-material class set frozen
- human authorization review required
- review preparation only
- no authorization decision recorded
- no authorization approval granted
- no separate operational-authorization eligibility granted
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

The static safety test rejects implementation primitives for:

- model APIs
- HTTP/network clients
- PostgreSQL/Drizzle/SQL execution
- environment-variable access
- timers or cron
- workers or child processes
- DNS/MX resolution
- SMTP and common email-provider SDKs

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

The full-chain tests reconstruct the governed outreach lineage through UGP-10.27 and certify that:

1. email authorization preparation freezes the exact email authorization-material classes for human review only;
2. web-contact-form preparation preserves only the exact web authorization-material classes;
3. exact UGP-10.27 through-draft lineage is required;
4. UGP-10.27 integrity is re-run before a review specification can be built;
5. output is deterministic;
6. tampering is detected by integrity verification.

## Not authorized by UGP-10.28

UGP-10.28 does not authorize or perform:

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

A future UGP-10.29 may record the explicit human decision over an integrity-valid UGP-10.28 review specification.

That decision must remain eligibility-only: even an approved decision may at most make the exact lineage eligible for a **separately authorized operational binding action**.

Any actual provider/mailbox/submission binding, credential activation, web submission, or message transmission remains outside this specification chain and requires separate explicit operational authorization.
