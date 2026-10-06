# UGP-10.14 — Explicit Human Recipient Selection Decision

Version: `ugp-10-14-human-recipient-selection-decision-v1`

## Purpose

UGP-10.14 records an explicit human decision over an integrity-valid UGP-10.13 recipient-selection review specification.

A human may:

- select exactly one reviewed public-business role candidate for later contact-verification eligibility;
- reject the entire candidate set;
- defer the decision.

This stage does not discover, collect, or verify any contact address.

It does not bind a mailbox/provider, create a send job, authorize a send, transmit outreach, or schedule follow-up.

## Required upstream state

UGP-10.14 accepts only an integrity-valid UGP-10.13 specification whose state is exactly:

`recipient_selection_review_ready`

The UGP-10.13 packet must still contain at least one frozen role candidate and must still record:

- recipient-selection authorization: false;
- contact-address verification authorization: false;
- send authorization: false.

## Exact lineage

The UGP-10.14 request must repeat the exact:

- UGP-10.13 selection-review-spec fingerprint;
- UGP-10.7 draft-candidate fingerprint.

The resulting decision record freezes the exact upstream lineage through UGP-10.13.

Stale lineage fails closed.

## Allowed decisions

The decision must be one already frozen by UGP-10.13:

- `select_for_contact_verification`;
- `reject_candidate_set`;
- `defer_selection`.

Unknown decisions fail closed.

## Candidate membership

For `select_for_contact_verification`:

- exactly one role-candidate fingerprint is required;
- that fingerprint must match an exact candidate in the frozen UGP-10.13 review set;
- the candidate is copied unchanged into the decision record.

The software does not rank or recommend the candidate.

For `reject_candidate_set` and `defer_selection`:

- selected-role-candidate fingerprint must be null;
- any supplied candidate fingerprint fails closed.

## Decision/reason compatibility

Selection requires exactly:

`role_and_source_evidence_sufficient`

Rejection may use only:

- `role_fit_not_sufficient`;
- `identity_or_organization_ambiguous`;
- `relationship_or_reputation_concern`.

Deferral may use only:

- `evidence_needs_refresh`;
- `identity_or_organization_ambiguous`;
- `needs_more_context`.

## Explicit confirmation

Every decision requires the exact confirmation form:

`REVIEW_OUTREACH_RECIPIENT_SELECTION:<decision>:<selected-role-candidate-fingerprint-or-NONE>:<selection-review-spec-fingerprint>:<draft-candidate-fingerprint>`

A mismatch fails closed.

## Reviewer and timestamp

Reviewer identity is bounded to the repository's existing operator-identity character set.

The review timestamp must be canonical ISO-8601 UTC with millisecond precision.

Both values participate in the deterministic decision record.

## Resulting states

A successful human selection produces only:

`contact_verification_eligible`

This is eligibility only.

It does not authorize contact-address discovery, address collection, address verification, mailbox/provider binding, or sending.

A rejection produces:

`recipient_selection_rejected`

A deferral produces:

`recipient_selection_deferred`

## Safety semantics

UGP-10.14 explicitly records:

- deterministic: true;
- human decision: true;
- exact UGP-10.13 specification required: true;
- exact candidate membership required: true;
- explicit confirmation required: true;
- eligibility only: true;
- automated recipient selection authorized: false;
- candidate mutation authorized: false;
- contact discovery authorized/performed: false;
- contact address included: false;
- contact-address collection authorized: false;
- contact-address verification authorized/performed: false;
- email verification authorized: false;
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
- child-process execution.

It also guards against operational contact/mailbox/provider identifier fields.

## Persistence

UGP-10.14 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 database migration.

## Production boundary

UGP-10.14 does not modify:

- Railway;
- staging;
- production;
- databases;
- environment variables;
- credentials;
- search/data providers;
- mailboxes;
- public websites;
- schedulers;
- workers.

## Next bounded boundary

A later provider-free increment may prepare a contact-address-verification specification for an exact `contact_verification_eligible` decision.

That future specification must still remain separate from actual contact-address acquisition or verification.

Actual contact lookup, verification-provider calls, mailbox/provider binding, send authorization, transmission, and follow-up scheduling remain separately gated capabilities.

UGP-10.14 grants none of them.
