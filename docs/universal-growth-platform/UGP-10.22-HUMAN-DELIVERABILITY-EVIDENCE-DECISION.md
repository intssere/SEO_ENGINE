# UGP-10.22 — Explicit Human Deliverability-Evidence Review Decision

Version: `ugp-10-22-human-deliverability-evidence-decision-v1`

## Purpose

UGP-10.22 records an explicit human decision over an integrity-valid UGP-10.21 deliverability-evidence review specification.

A human may:

- approve a supporting evidence packet for later provider/mailbox-binding preparation eligibility;
- reject the deliverability-evidence packet;
- defer the review.

This stage does not bind a provider or mailbox, access or probe a mailbox, include provider credentials, perform technical verification, construct a send job, authorize sending, transmit outreach, persist contact data, or schedule follow-up.

## Required upstream state

UGP-10.22 accepts only an integrity-valid UGP-10.21 specification whose state is exactly:

`deliverability_evidence_review_ready`

The request must repeat the exact:

- UGP-10.21 review-spec fingerprint;
- UGP-10.20 deliverability-evidence fingerprint;
- selected contact-point fingerprint;
- selected role-candidate fingerprint;
- UGP-10.7 draft-candidate fingerprint.

Any stale or mismatched lineage fails closed.

## Disposition-aware approval boundary

UGP-10.21 already controls which future decisions are allowed.

Therefore UGP-10.22 can approve only when the frozen evidence disposition is:

`deliverability_evidence_supporting`

Contradictory or inconclusive review specifications do not expose the approval decision and fail closed if approval is attempted.

## Allowed decisions

The request decision must already be present in the exact UGP-10.21 `allowedFutureDecisions` set.

Possible decision vocabulary:

- `approve_for_provider_mailbox_binding_preparation`;
- `reject_deliverability_evidence`;
- `defer_deliverability_evidence_review`.

## Reason compatibility

Approval requires exactly:

`evidence_sufficient_for_binding_preparation`

For contradictory evidence, rejection requires:

`contradictory_technical_evidence`

For inconclusive evidence, rejection requires:

`inconclusive_technical_evidence`

For supporting evidence, rejection requires:

`technical_method_context_unclear`

Deferral may use:

- `evidence_needs_refresh`;
- `needs_more_technical_context`;
- `technical_method_context_unclear`.

The reason must also already be included in the exact UGP-10.21 allowed reason-code set.

## Explicit confirmation

Every decision requires this exact confirmation form:

`REVIEW_OUTREACH_DELIVERABILITY_EVIDENCE:<decision>:<review-spec-fingerprint>:<deliverability-evidence-fingerprint>:<selected-contact-point-fingerprint>:<selected-role-candidate-fingerprint>:<draft-candidate-fingerprint>`

A mismatch fails closed.

## Reviewer and timestamp

Reviewer identity is restricted to the existing bounded operator-identity character set.

The review timestamp must be canonical ISO-8601 UTC with millisecond precision.

Reviewer identity and the request participate in the deterministic decision-request fingerprint.

## Resulting states

Approval:

`provider_mailbox_binding_preparation_eligible`

Rejection:

`deliverability_evidence_rejected`

Deferral:

`deliverability_evidence_deferred`

The approval state grants eligibility only for a later provider/mailbox-binding preparation specification.

It does not authorize binding.

## Safety semantics

UGP-10.22 explicitly records:

- deterministic: true;
- human decision: true;
- exact UGP-10.21 specification required: true;
- exact UGP-10.20 evidence required: true;
- exact selected contact point required: true;
- exact evidence disposition required: true;
- explicit confirmation required: true;
- eligibility only: true;
- deliverability-evidence decision recorded: true;
- deliverability-evidence approval granted only for approval;
- provider/mailbox-binding preparation eligibility granted only for approval;
- provider/mailbox-binding preparation executed: false;
- provider binding authorized/performed: false;
- mailbox binding authorized/performed: false;
- mailbox access authorized: false;
- mailbox probing authorized/performed: false;
- provider credential included: false;
- independent technical verification performed: false;
- verification-provider calls authorized/performed: false;
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

- model providers;
- HTTP/network clients;
- PostgreSQL/Drizzle;
- environment credential reads;
- timers/cron;
- worker threads;
- child-process execution;
- DNS/MX helpers;
- SMTP and common mail-delivery provider primitives.

## Persistence

UGP-10.22 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 database migration.

## Production boundary

UGP-10.22 does not modify:

- Railway;
- staging;
- production;
- databases;
- environment variables;
- credentials;
- verification providers;
- mailboxes;
- public websites;
- schedulers;
- workers.

## Next bounded boundary

A later provider-free increment may convert an exact `provider_mailbox_binding_preparation_eligible` decision into an immutable provider/mailbox-binding preparation specification.

That future preparation stage should still contain no real credentials, no provider calls, no mailbox access, no provider/mailbox mutation, and no send authorization.

Actual provider/mailbox binding, credential activation, sending, transmission, and follow-up scheduling remain separate explicit authorization boundaries.

UGP-10.22 grants none of those capabilities.
