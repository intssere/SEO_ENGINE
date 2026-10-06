# UGP-10.18 — Explicit Human Policy/Consent Decision

Version: `ugp-10-18-human-policy-consent-decision-v1`

## Purpose

UGP-10.18 records an explicit human decision over an integrity-valid UGP-10.17 policy/consent review specification.

A human may:

- approve exactly one frozen public-business contact point for later deliverability-verification preparation eligibility;
- reject the entire contact-point set;
- defer policy/consent review.

This stage does not infer consent, determine or guarantee legal compliance, verify deliverability, call a provider, probe a mailbox, bind a mailbox/provider, authorize a send, transmit outreach, or schedule follow-up.

## Required upstream state

UGP-10.18 accepts only an integrity-valid UGP-10.17 specification whose state is exactly:

`policy_consent_review_ready`

The packet must contain at least one frozen UGP-10.16 contact point and must still record:

- no policy/consent decision;
- no policy/consent approval;
- no deliverability-verification authorization;
- no send authorization.

## Exact lineage

The request must repeat the exact:

- UGP-10.17 policy/consent-review-spec fingerprint;
- selected role-candidate fingerprint;
- UGP-10.7 draft-candidate fingerprint.

The resulting decision record freezes the exact upstream lineage through UGP-10.17.

Stale lineage fails closed.

## Allowed decisions

The human decision must be one already frozen by UGP-10.17:

- `approve_for_deliverability_verification_preparation`;
- `reject_contact_point_set`;
- `defer_policy_consent_review`.

Unknown decisions fail closed.

## Approval and exact contact-point membership

For `approve_for_deliverability_verification_preparation`:

- exactly one contact-point fingerprint is required;
- that fingerprint must exactly match a point in the frozen UGP-10.17 review set;
- the selected contact point is copied unchanged into the decision record;
- reason code must be `policy_and_context_review_sufficient`.

The software does not rank or recommend the point.

The successful state is only:

`deliverability_verification_preparation_eligible`

This means eligibility for a later preparation contract only.

It does not authorize actual deliverability verification.

## Reject and defer behavior

For `reject_contact_point_set` and `defer_policy_consent_review`:

- selected contact-point fingerprint must be null;
- any supplied selected point fails closed.

Rejection may use only:

- `channel_not_appropriate`;
- `prior_opt_out_or_suppression_concern`;
- `relationship_or_purpose_mismatch`;
- `jurisdiction_or_policy_concern`;
- `public_business_basis_insufficient`.

Deferral may use only:

- `needs_more_policy_context`;
- `evidence_needs_refresh`;
- `jurisdiction_needs_review`.

## Explicit confirmation

Every decision requires the exact confirmation form:

`REVIEW_OUTREACH_POLICY_CONSENT:<decision>:<selected-contact-point-fingerprint-or-NONE>:<policy-consent-review-spec-fingerprint>:<selected-role-candidate-fingerprint>:<draft-candidate-fingerprint>`

A mismatch fails closed.

## Reviewer and timestamp

Reviewer identity is bounded to the repository's existing operator-identity character set.

The review timestamp must be canonical ISO-8601 UTC with millisecond precision.

Both participate in the deterministic decision fingerprint.

## Important policy/legal distinction

A UGP-10.18 approval is a human workflow decision that the reviewed public-business purpose/context is sufficient to continue to a later technical preparation stage.

It does not mean:

- consent is inferred;
- consent is legally required or not required;
- legal compliance has been determined;
- legal compliance is guaranteed.

Those claims remain explicitly false in the contract.

## Resulting states

Approval:

`deliverability_verification_preparation_eligible`

Rejection:

`policy_consent_rejected`

Deferral:

`policy_consent_deferred`

Only the approval state carries one exact frozen contact point.

## Safety semantics

UGP-10.18 explicitly records:

- deterministic: true;
- human decision: true;
- exact UGP-10.17 specification required: true;
- exact contact-point membership required: true;
- explicit confirmation required: true;
- eligibility only: true;
- policy/consent decision recorded: true;
- policy/consent approval granted only for the approval decision;
- human contact-point selection performed only for approval;
- automated contact-point selection authorized: false;
- consent inferred: false;
- legal-compliance determination performed: false;
- legal compliance guaranteed: false;
- deliverability-verification-preparation eligibility granted only for approval;
- deliverability-verification preparation executed: false;
- deliverability verification authorized/performed: false;
- verification-provider calls authorized: false;
- mailbox probing authorized/performed: false;
- mailbox access authorized: false;
- provider binding authorized: false;
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
- SMTP/DNS/MX and common mail-provider primitives.

## Persistence

UGP-10.18 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 database migration.

## Production boundary

UGP-10.18 does not modify:

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

A later provider-free increment may convert an exact `deliverability_verification_preparation_eligible` decision into an immutable deliverability-verification preparation specification.

That stage must still remain separate from actual DNS/MX/SMTP checks, provider calls, mailbox probing/binding, send authorization, transmission, and follow-up scheduling.

UGP-10.18 grants none of those capabilities.
