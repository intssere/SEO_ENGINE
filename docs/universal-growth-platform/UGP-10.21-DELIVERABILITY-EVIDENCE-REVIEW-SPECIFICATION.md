# UGP-10.21 — Provider-Free Deliverability Evidence Human-Review Specification

Version: `ugp-10-21-deliverability-evidence-review-specification-v1`

## Purpose

UGP-10.21 converts an integrity-valid UGP-10.20 deliverability-evidence contract into an immutable human-review specification.

This stage prepares a review packet only.

It does not independently verify technical evidence, perform DNS/MX/SMTP or endpoint checks, call a verification provider, probe or access a mailbox, bind a provider or mailbox, persist contact data, construct a send job, authorize sending, transmit outreach, or schedule follow-up.

## Required upstream state

UGP-10.21 accepts only an integrity-valid UGP-10.20 contract whose state is exactly:

`deliverability_verification_evidence_validated`

The request must repeat the exact:

- UGP-10.20 deliverability-evidence fingerprint;
- selected contact-point fingerprint;
- selected role-candidate fingerprint;
- UGP-10.7 draft-candidate fingerprint.

Any stale or mismatched lineage fails closed.

## Exact evidence freeze

UGP-10.21 copies the exact UGP-10.20 validated observation set unchanged.

It freezes:

- observation IDs;
- observation fingerprints;
- verification method classes;
- observation outcomes;
- canonical timestamps;
- technical-evidence fingerprints;
- public-business technical-evidence attestations;
- aggregate evidence disposition.

It does not add, remove, reorder semantically, reinterpret, or independently verify the evidence.

## Human review requirements

The review packet requires a human to consider:

- the exact technical-evidence set;
- the aggregate evidence disposition;
- method/outcome consistency;
- evidence freshness.

It records:

- explicit human decision required: true;
- supporting evidence required for any approval option: true;
- no independent-verification inference: true;
- no provider/mailbox-binding inference: true;
- no send-authorization inference: true.

## Disposition-aware future decisions

For `deliverability_evidence_supporting`, UGP-10.21 exposes only:

- `approve_for_provider_mailbox_binding_preparation`;
- `defer_deliverability_evidence_review`;
- `reject_deliverability_evidence`.

For `deliverability_evidence_contradictory` or `deliverability_evidence_inconclusive`, UGP-10.21 exposes only:

- `defer_deliverability_evidence_review`;
- `reject_deliverability_evidence`.

Contradictory or inconclusive evidence therefore cannot even advertise an approval path.

UGP-10.21 itself records no decision.

## Future reason codes

Supporting evidence may expose:

- `evidence_sufficient_for_binding_preparation`;
- `evidence_needs_refresh`;
- `technical_method_context_unclear`;
- `needs_more_technical_context`.

Contradictory evidence may expose:

- `contradictory_technical_evidence`;
- `evidence_needs_refresh`;
- `technical_method_context_unclear`;
- `needs_more_technical_context`.

Inconclusive evidence may expose:

- `inconclusive_technical_evidence`;
- `evidence_needs_refresh`;
- `technical_method_context_unclear`;
- `needs_more_technical_context`.

## Future explicit confirmation

A later human decision must use the controlled confirmation namespace:

`REVIEW_OUTREACH_DELIVERABILITY_EVIDENCE`

UGP-10.21 records only this prefix.

It does not create or accept the future decision.

## Resulting state

A valid UGP-10.21 contract produces only:

`deliverability_evidence_review_ready`

This means an immutable human-review packet exists.

It does not mean:

- the evidence was independently verified;
- deliverability is guaranteed;
- a provider or mailbox was selected;
- a provider credential exists;
- a mailbox may be probed or accessed;
- provider/mailbox binding is authorized;
- a send job exists;
- sending is authorized.

## Safety semantics

UGP-10.21 explicitly records:

- deterministic: true;
- exact UGP-10.20 evidence required: true;
- exact technical-evidence set frozen: true;
- exact evidence disposition frozen: true;
- human deliverability-evidence review required: true;
- review preparation only: true;
- deliverability-evidence decision recorded: false;
- deliverability-evidence approval granted: false;
- provider/mailbox-binding preparation eligibility granted: false;
- provider/mailbox-binding preparation executed: false;
- independent technical verification performed: false;
- deliverability verification authorized/performed: false;
- verification-provider calls authorized/performed: false;
- mailbox probing authorized/performed: false;
- mailbox access authorized: false;
- provider binding authorized/performed: false;
- provider credential included: false;
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
- network HTTP clients;
- PostgreSQL/Drizzle;
- environment credential reads;
- timers/cron;
- worker threads;
- child-process execution;
- DNS/MX helpers;
- SMTP and common mail-delivery providers.

## Persistence

UGP-10.21 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 database migration.

## Production boundary

UGP-10.21 does not modify:

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

A later increment may record an explicit human decision against this exact UGP-10.21 review specification.

Only a supporting evidence disposition should be eligible for a future `approve_for_provider_mailbox_binding_preparation` decision.

Even that future approval should grant preparation eligibility only.

Actual provider/mailbox binding, provider credentials, mailbox access, send authorization, transmission, and follow-up scheduling remain separate authorization boundaries.

UGP-10.21 grants none of those capabilities.
