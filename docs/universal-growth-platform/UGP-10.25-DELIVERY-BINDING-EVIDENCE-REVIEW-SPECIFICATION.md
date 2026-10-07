# UGP-10.25 — Delivery-Binding Evidence Review Specification

## Purpose

UGP-10.25 introduces the bounded human-review preparation stage after UGP-10.24.

UGP-10.24 validates a complete, fingerprint-only evidence set against the exact delivery-binding requirement classes frozen by UGP-10.23. UGP-10.25 does not bind a provider, mailbox, or web-submission mechanism. It freezes the exact UGP-10.24 evidence contract into an immutable human-review specification.

Version:

`ugp-10-25-delivery-binding-evidence-review-specification-v1`

Resulting state:

`delivery_binding_evidence_review_ready`

## Upstream boundary

UGP-10.25 accepts only an integrity-valid:

`AuthorityOutreachDeliveryBindingEvidenceContract`

from UGP-10.24.

The builder re-runs UGP-10.24 integrity verification before accepting the evidence contract.

The upstream contract must remain:

- `delivery_binding_evidence_validated`
- supplied-evidence validation only
- independently unverified by UGP
- provider binding unauthorized and unperformed
- mailbox binding unauthorized and unperformed
- web-submission execution unauthorized and unperformed
- credential activation unauthorized
- send authorization absent

Any upstream safety-boundary violation is rejected.

## Exact lineage

The review request must match exactly:

- `deliveryBindingEvidenceFingerprint`
- `deliveryBindingPreparationSpecFingerprint`
- `selectedContactPointFingerprint`
- `selectedRoleCandidateFingerprint`
- `candidateFingerprint`

Any mismatch fails as stale lineage.

No caller may substitute a different evidence contract, preparation specification, contact point, role candidate, or outreach draft candidate.

## Frozen review material

The review specification freezes:

- exact channel class
- exact UGP-10.23 binding requirement classes
- exact UGP-10.24 evidence disposition
- exact validated evidence observations
- exact observation fingerprints
- exact requirement classes
- exact observation outcomes
- exact observed timestamps
- exact technical-evidence fingerprints
- exact public-business binding-evidence attestations

No evidence payload is fetched or embedded.

## Human-review requirements

The reviewer must consider:

- the exact delivery-binding evidence contract
- the exact frozen requirement set
- the exact evidence disposition
- channel consistency
- requirement/outcome consistency
- evidence freshness
- an explicit human decision

The review specification forbids inferring:

- provider or mailbox binding
- web-form submission execution
- credential activation
- send authorization

## Future decision options

UGP-10.25 records no decision itself. It only constrains the later human-decision stage.

### Supporting evidence

For:

`delivery_binding_evidence_supporting`

the future decision options are:

- `approve_for_delivery_binding_authorization_preparation`
- `defer_delivery_binding_evidence_review`
- `reject_delivery_binding_evidence`

The approval option means only that a later human-decision record may make the lineage eligible for a future authorization-preparation stage. It is not provider/mailbox/form execution authorization.

Allowed reason codes are:

- `evidence_sufficient_for_binding_authorization_preparation`
- `evidence_needs_refresh`
- `needs_more_binding_context`
- `binding_context_unclear`

### Contradictory evidence

For:

`delivery_binding_evidence_contradictory`

the approval option is not available.

Allowed decisions:

- `defer_delivery_binding_evidence_review`
- `reject_delivery_binding_evidence`

Allowed reason codes begin with:

- `contradictory_binding_evidence`

plus the common defer/context reasons.

### Inconclusive evidence

For:

`delivery_binding_evidence_inconclusive`

the approval option is not available.

Allowed decisions:

- `defer_delivery_binding_evidence_review`
- `reject_delivery_binding_evidence`

Allowed reason codes begin with:

- `inconclusive_binding_evidence`

plus the common defer/context reasons.

## Explicit confirmation prefix

A later human decision must use the frozen prefix:

`REVIEW_OUTREACH_DELIVERY_BINDING_EVIDENCE`

UGP-10.25 itself does not create that future decision record.

## Safety semantics

UGP-10.25 explicitly certifies:

- deterministic output
- exact UGP-10.24 evidence required
- exact binding requirement set frozen
- exact evidence disposition frozen
- exact channel class frozen
- human binding-evidence review required
- review preparation only
- no binding-evidence decision recorded
- no binding-evidence approval granted
- no delivery-binding authorization-preparation eligibility granted
- no delivery-binding execution authorization
- no delivery-binding execution
- no independent binding verification
- no technical evidence payload included
- no live provider identifier included
- no sender mailbox identifier included
- no provider credential included
- no credential-reference value included
- no credential activation
- no submission-mechanism reference value included
- no provider binding authorization or execution
- no mailbox binding authorization or execution
- no mailbox access or probing
- no web-form submission authorization or execution
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
- database/SQL execution
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

The full-chain tests build the governed authority-outreach lineage through UGP-10.24 and certify that:

1. supporting email evidence produces a frozen human-review specification only;
2. supporting web-contact-form evidence preserves the exact web channel and does not infer mailbox requirements;
3. contradictory evidence cannot expose the future approval option;
4. inconclusive evidence cannot expose the future approval option;
5. exact UGP-10.24 through-draft lineage is required;
6. the review specification is deterministic;
7. tampering is detected by integrity verification.

## Not authorized by UGP-10.25

UGP-10.25 does not authorize or perform:

- provider selection
- provider connection
- provider credential storage
- credential-reference storage
- credential activation
- sender mailbox selection or binding
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
- staging or production changes

## Next bounded stage

A future UGP-10.26 may record the explicit human decision over an integrity-valid UGP-10.25 review specification.

That decision should remain eligibility-only. Even an approved decision must not itself bind a provider/mailbox/submission mechanism, activate credentials, submit a form, or send outreach.

Actual external binding remains a separately governed operational action requiring its own explicit authorization.
