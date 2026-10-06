# UGP-10.13 — Provider-Free Recipient Selection Review Specification

Version: `ugp-10-13-recipient-selection-review-specification-v1`

## Purpose

UGP-10.13 converts an integrity-valid UGP-10.12 validated public-business role-candidate set into an immutable human recipient-selection review specification.

It prepares a review packet only.

It does not select a recipient, authorize contact verification, discover contact data, verify an email address, bind a mailbox or provider, authorize outreach, transmit a message, or schedule follow-up.

## Required upstream state

UGP-10.13 accepts only a UGP-10.12 contract that:

- passes full UGP-10.12 integrity reconstruction;
- has state `recipient_research_evidence_validated`;
- has research outcome `candidate_set`;
- contains at least one validated role candidate;
- still records recipient selection, contact discovery, and send authorization as false.

A UGP-10.12 `no_public_role_candidate` result fails closed.

## Exact lineage

The UGP-10.13 request must repeat the exact:

- UGP-10.12 research-evidence fingerprint;
- UGP-10.7 draft-candidate fingerprint.

The resulting review specification freezes the exact:

- UGP-10.12 research-evidence ID/fingerprint;
- UGP-10.11 research-spec fingerprint;
- UGP-10.10 delivery-preparation fingerprint;
- UGP-10.9 send-review fingerprint;
- UGP-10.8 quality-gate fingerprint;
- UGP-10.6 request ID/fingerprint;
- UGP-10.7 candidate/mechanical-validation fingerprints;
- prospect fingerprint;
- opportunity fingerprint;
- original outreach approval-review fingerprint;
- source domain/source URL;
- target domain/target URL;
- exact validated UGP-10.12 candidate set.

Any stale or mismatched lineage fails closed.

## Candidate set

UGP-10.13 copies the exact UGP-10.12 validated role candidates without ranking, mutation, recommendation, or preselection.

Each candidate retains only the already-validated public-business role evidence:

- role-candidate ID/fingerprint;
- display name;
- organization name;
- role title;
- matched role criteria;
- evidence-source class;
- public evidence URL;
- observation timestamp;
- evidence fingerprint;
- public-business-identity attestation.

UGP-10.13 does not enrich these candidates.

## Controlled future human decisions

The review specification defines the only allowed future decision vocabulary:

- `select_for_contact_verification`;
- `reject_candidate_set`;
- `defer_selection`.

These are future human-review decisions.

UGP-10.13 performs none of them.

## Controlled future reason codes

The future review boundary may use only:

- `role_and_source_evidence_sufficient`;
- `role_fit_not_sufficient`;
- `identity_or_organization_ambiguous`;
- `evidence_needs_refresh`;
- `relationship_or_reputation_concern`;
- `needs_more_context`.

UGP-10.13 does not decide which reason applies.

## Future explicit confirmation

Any later human-selection decision must use the controlled confirmation namespace:

`REVIEW_OUTREACH_RECIPIENT_SELECTION`

UGP-10.13 records the prefix only.

It does not create or accept a selection decision.

## Resulting state

A valid UGP-10.13 contract produces only:

`recipient_selection_review_ready`

This means an immutable human-review packet exists.

It does not mean:

- a recipient is selected;
- selection is authorized;
- contact verification is authorized;
- an email address or phone number exists;
- an address is verified;
- a mailbox/provider is bound;
- a send job exists;
- sending is authorized.

## Safety semantics

UGP-10.13 explicitly records:

- deterministic: true;
- exact UGP-10.12 research evidence required: true;
- candidate set required: true;
- exact candidate set frozen: true;
- human recipient selection required: true;
- human selection review preparation only: true;
- recipient selection authorized/performed: false;
- selected recipient included: false;
- contact discovery authorized/performed: false;
- contact address included: false;
- contact-address verification authorized: false;
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

UGP-10.13 performs no persistence and adds no database migration.

It does not apply the already-merged UGP-10.3 database migration.

## Production boundary

UGP-10.13 does not modify:

- Railway;
- staging;
- production;
- databases;
- environment variables;
- credentials;
- provider integrations;
- mailboxes;
- public websites;
- schedulers;
- workers.

## Next bounded boundary

A later increment may implement the explicit human recipient-selection decision over this exact immutable review specification.

Even that later approval should only make one role candidate eligible for a separate contact-address verification stage.

It must remain separate from:

1. contact-address discovery or acquisition;
2. contact-address verification;
3. mailbox/provider binding;
4. explicit send authorization;
5. actual transmission;
6. follow-up scheduling.

UGP-10.13 grants none of those capabilities.
