# UGP-10.9 — Human Outreach Send-Review Decision Contract

Version: `ugp-10-9-human-send-review-decision-v1`

## Purpose

UGP-10.9 introduces the human decision that follows a passing UGP-10.8 semantic quality gate.

This stage does not send outreach.

A positive decision means only that the exact validated candidate is **eligible for a future delivery-preparation stage**.

It does not authorize:

- recipient selection;
- contact discovery;
- email verification;
- mailbox access;
- provider execution;
- transmission;
- scheduling;
- follow-up.

## Required upstream state

UGP-10.9 accepts only a UGP-10.8 quality gate that:

- passes full integrity reconstruction;
- has `status = pass`;
- has `eligibleForHumanSendReview = true`.

A blocked or tampered quality gate cannot enter human send review.

## Exact lineage

The review decision is bound to the exact:

- UGP-10.8 quality-gate fingerprint;
- UGP-10.6 request fingerprint;
- UGP-10.7 candidate fingerprint.

The resulting review record additionally carries:

- request ID;
- mechanical-validation fingerprint;
- prospect fingerprint;
- opportunity fingerprint;
- original prospect-approval review fingerprint;
- exact owned target URL;
- reviewer identity;
- review timestamp.

A stale gate, request, or candidate fingerprint fails closed.

## Human decisions

Allowed decisions are:

- `approved_for_delivery_preparation`;
- `rejected`;
- `deferred`.

### Approval

Approval requires exactly:

`approved_as_validated`

This means the human reviewer approved the exact candidate that passed UGP-10.7 and UGP-10.8.

Any candidate edit requires re-running the validation and quality-gate chain rather than silently preserving approval.

### Rejection reasons

A rejected review may use:

- `brand_or_reputation_concern`;
- `context_not_appropriate`;
- `relationship_conflict`;
- `duplicate_outreach_risk`;
- `policy_or_claim_concern`.

### Deferral reasons

A deferred review may use:

- `needs_more_context`;
- `timing_not_right`.

Decision/reason mismatches fail closed.

## Explicit confirmation

Each review request requires an exact confirmation token:

`REVIEW_OUTREACH_SEND:<decision>:<candidateFingerprint>:<qualityGateFingerprint>`

The confirmation is evaluated before producing a review record.

Approval cannot be inferred from UI state, prior review state, or a generic confirmation string.

## Reviewer identity

UGP-10.9 validates reviewer identity against the same bounded reviewer-ID character model used by the earlier UGP review stages.

The reviewer ID is part of the deterministic decision-request fingerprint.

## Review record

A successful review produces deterministic:

- `decisionRequestFingerprint`;
- `reviewFingerprint`;
- `reviewId`.

The output state is one of:

- `delivery_preparation_eligible`;
- `send_review_rejected`;
- `send_review_deferred`.

## Meaning of delivery-preparation eligibility

`delivery_preparation_eligible` is not send authorization.

It means only that a future separately authorized stage may prepare delivery prerequisites for the exact validated candidate.

UGP-10.9 explicitly does not:

- discover a recipient;
- bind an email address;
- verify an email address;
- access a mailbox;
- choose a sending provider;
- call a provider;
- construct a send job;
- enqueue a task;
- transmit the message.

## Safety semantics

UGP-10.9 explicitly records:

- deterministic: true;
- human decision: true;
- exact validated candidate required: true;
- quality-gate pass required: true;
- explicit confirmation required: true;
- eligibility only: true;
- delivery preparation executed: false;
- candidate mutation authorized: false;
- recipient selection authorized: false;
- contact discovery authorized/performed: false;
- email verification authorized: false;
- mailbox access authorized: false;
- send authorization granted: false;
- outreach sending authorized/performed: false;
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

The executed static test confirms that UGP-10.9 contains no:

- OpenAI/Anthropic/Gemini invocation primitives;
- `fetch`, Axios, Undici, or Got network transport;
- PostgreSQL/Drizzle/database runtime;
- environment credential resolution;
- timers/cron;
- worker threads;
- child-process execution.

## Explicitly out of scope

UGP-10.9 does not add:

- a database migration;
- persistent send-review storage;
- a send-review mutation API;
- contact discovery;
- recipient selection;
- email verification;
- mailbox integration;
- provider credentials;
- send-provider integration;
- send-job construction;
- transmission;
- follow-up scheduling;
- scheduler/worker activation;
- Railway/staging/production changes.

## Next bounded increment

A later UGP-10 stage may define a **delivery-preparation contract** that consumes only a `delivery_preparation_eligible` UGP-10.9 record.

That future stage must still separate:

1. contact/recipient research;
2. recipient approval;
3. mailbox/provider binding;
4. actual transmission authorization.

None of those capabilities are authorized by UGP-10.9.
