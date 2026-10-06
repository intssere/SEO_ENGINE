# UGP-10.17 — Provider-Free Policy/Consent Review Specification

Version: `ugp-10-17-policy-consent-review-specification-v1`

## Purpose

UGP-10.17 converts an integrity-valid UGP-10.16 validated public contact-point set into an immutable human policy/consent review specification.

This stage prepares a review packet only.

It does not infer consent, determine legal compliance, select a contact point, verify deliverability, call a provider, probe or access a mailbox, bind a mailbox/provider, authorize sending, transmit outreach, or schedule follow-up.

## Required upstream state

UGP-10.17 accepts only a UGP-10.16 contract that:

- passes full UGP-10.16 integrity reconstruction;
- has state `contact_point_evidence_validated`;
- has outcome `contact_point_set`;
- contains at least one validated public-business contact point;
- still records deliverability verification authorization as false;
- still records policy/consent review authorization as false;
- still records send authorization as false.

A UGP-10.16 `no_public_contact_point` result fails closed.

## Exact lineage

The UGP-10.17 request must repeat the exact:

- UGP-10.16 contact-point-evidence fingerprint;
- selected role-candidate fingerprint;
- UGP-10.7 draft-candidate fingerprint.

The resulting specification freezes the exact upstream lineage through UGP-10.16.

Any stale or mismatched lineage fails closed.

## Exact contact-point set

UGP-10.17 copies every UGP-10.16 validated contact point unchanged into the review packet.

It does not:

- rank the points;
- recommend a point;
- preselect a point;
- mutate the point value;
- enrich the point;
- verify deliverability.

The exact contact-point set remains fingerprint-bound and tamper-evident.

## Required human review dimensions

The review packet requires a human to consider:

- public-business outreach purpose;
- relationship/context fit;
- channel appropriateness;
- prior opt-out or suppression concerns;
- jurisdiction and policy considerations;
- evidence freshness.

It also records:

- explicit human decision required: true;
- no implicit consent inference: true;
- no automatic legal-compliance determination: true.

These are workflow safeguards, not legal conclusions.

## Controlled future human decisions

UGP-10.17 defines the only future decision vocabulary:

- `approve_for_deliverability_verification_preparation`;
- `reject_contact_point_set`;
- `defer_policy_consent_review`.

UGP-10.17 performs none of those decisions.

An approval label refers only to eligibility for a later provider-free preparation stage.

It does not authorize actual DNS, MX, SMTP, verification-provider, mailbox, or send operations.

## Controlled future reason codes

The future human review may use only:

- `policy_and_context_review_sufficient`;
- `channel_not_appropriate`;
- `prior_opt_out_or_suppression_concern`;
- `relationship_or_purpose_mismatch`;
- `jurisdiction_or_policy_concern`;
- `public_business_basis_insufficient`;
- `needs_more_policy_context`;
- `evidence_needs_refresh`;
- `jurisdiction_needs_review`.

UGP-10.17 does not decide which reason applies.

## Future explicit confirmation

Any later human policy/consent decision must use the controlled confirmation namespace:

`REVIEW_OUTREACH_POLICY_CONSENT`

UGP-10.17 records the prefix only.

It does not create or accept a policy/consent decision.

## Resulting state

A valid UGP-10.17 contract produces only:

`policy_consent_review_ready`

This means an immutable human-review packet exists.

It does not mean:

- consent exists;
- consent was inferred;
- legal compliance was determined;
- legal compliance is guaranteed;
- a contact point was selected;
- deliverability was verified;
- a verification provider may be called;
- a mailbox may be probed or accessed;
- a provider/mailbox may be bound;
- a send job exists;
- sending is authorized.

## Safety semantics

UGP-10.17 explicitly records:

- deterministic: true;
- exact UGP-10.16 evidence required: true;
- exact contact-point set frozen: true;
- human policy/consent review required: true;
- policy/consent review preparation only: true;
- policy/consent decision recorded: false;
- policy/consent approval granted: false;
- contact-point selection authorized/performed: false;
- consent inferred: false;
- legal-compliance determination performed: false;
- legal compliance guaranteed: false;
- deliverability verification authorized/performed: false;
- verification-provider calls authorized: false;
- mailbox probing authorized: false;
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
- SMTP/DNS/MX and common email-delivery provider primitives.

## Persistence

UGP-10.17 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 database migration.

## Production boundary

UGP-10.17 does not modify:

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

A later increment may record an explicit human policy/consent decision against this exact immutable review specification.

A successful decision should only make one exact contact point eligible for a separate deliverability-verification preparation stage.

Actual deliverability checks, provider calls, mailbox probing/binding, send authorization, transmission, and follow-up scheduling remain separate authorization boundaries.

UGP-10.17 grants none of those capabilities.
