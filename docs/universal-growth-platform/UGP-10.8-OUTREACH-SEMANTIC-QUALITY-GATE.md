# UGP-10.8 — Outreach Semantic Quality Gate

Version: `ugp-10-8-outreach-semantic-quality-gate-v1`

## Purpose

UGP-10.8 is the semantic quality gate that follows UGP-10.7 mechanical draft validation.

It does not generate text, call a model, discover contacts, or send outreach.

Its job is to decide whether one mechanically valid outreach candidate is **eligible for human send review** based on a complete set of externally supplied, fingerprinted semantic assessments.

A UGP-10.8 pass is not send authorization.

## Why UGP-10.8 is separate from UGP-10.7

UGP-10.7 can prove deterministic mechanical properties such as:

- exact request lineage;
- subject/body bounds;
- plain-text shape;
- absence of mechanically detectable contact-address data;
- exact-target URL integrity.

Those checks cannot reliably prove nuanced semantic properties such as:

- whether every factual statement is truly supported;
- whether relationship history was invented;
- whether wording implies a paid or reciprocal link exchange;
- whether an unsupported ranking outcome is promised;
- whether tone is spammy, manipulative, misleading, or reputation-damaging;
- whether the message is contextually appropriate.

UGP-10.8 therefore requires explicit semantic assessment inputs rather than treating mechanical validation or model confidence as a semantic quality result.

## Required semantic assessments

Exactly one assessment is required for each:

1. `factual_claim_support`;
2. `relationship_history_integrity`;
3. `link_scheme_policy`;
4. `ranking_outcome_claims`;
5. `tone_reputation_safety`;
6. `contextual_fit`.

Each assessment contains:

- check ID;
- `pass` or `blocked`;
- summary;
- one or more evidence references;
- deterministic assessment fingerprint.

Missing, duplicate, malformed, or tampered assessments fail closed.

## Assessment provenance

UGP-10.8 does not create semantic assessments itself.

Assessment production is intentionally external to the gate.

That permits future separately authorized evaluators while preserving the rule that:

**model confidence is not the quality gate.**

The gate only accepts a complete, fingerprint-valid assessment set.

## Mechanical precondition

UGP-10.8 accepts only a UGP-10.7 result where:

- status is `candidate_valid`;
- `mechanicalValidationPassed = true`;
- the UGP-10.7 result passes full integrity reconstruction against the exact request and candidate.

A mechanically blocked candidate cannot be rescued by semantic assessments.

## Exact lineage

The quality gate binds:

- UGP-10.6 request ID/fingerprint;
- UGP-10.7 candidate fingerprint;
- UGP-10.7 validation fingerprint;
- prospect fingerprint;
- opportunity fingerprint;
- approval-review fingerprint;
- exact owned target URL.

The gate does not accept a detached semantic assessment set.

## Gate checks

The final gate contains:

- one `mechanical_validation` pass record;
- six semantic check records.

Each check receives a deterministic check fingerprint.

Blocking reasons are deterministic and sorted.

## Gate result

Possible gate status values:

- `pass`;
- `blocked`.

A pass sets:

`eligibleForHumanSendReview = true`

A blocked gate sets:

`eligibleForHumanSendReview = false`

The gate receives deterministic:

- `gateFingerprint`;
- `gateId`.

## Meaning of “eligible for human send review”

This is a deliberately narrow state.

It means the candidate:

- passed UGP-10.7 mechanical validation;
- received complete passing semantic assessments;
- may be presented to a future human send-review stage.

It does **not** mean:

- contact information may be discovered;
- a recipient has been selected;
- the message is approved for transmission;
- a mailbox may be used;
- a send API may be called;
- a scheduler/worker may deliver it.

## Safety semantics

UGP-10.8 explicitly records:

- deterministic: true;
- fail closed: true;
- separate from generation: true;
- external semantic assessment required: true;
- model confidence is not quality gate: true;
- mechanically valid candidate required: true;
- eligible for human send review only: true;
- human send review required: true;
- send authorization granted: false;
- contact discovery authorized/performed: false;
- model execution authorized: false;
- model calls: false;
- provider calls: false;
- network operations: false;
- persistence: false;
- outreach sending authorized/performed: false;
- scheduler enabled: false;
- worker enabled: false;
- provider writes: false;
- public-site writes: false;
- link-scheme automation authorized: false.

## Static capability certification

The executed static test confirms that UGP-10.8 contains no:

- OpenAI/Anthropic/Gemini invocation primitives;
- `fetch`, Axios, Undici, or Got network transport;
- PostgreSQL/Drizzle/database runtime;
- environment credential resolution;
- timers/cron;
- worker threads;
- child-process execution.

## Explicitly out of scope

UGP-10.8 does not add:

- model/provider invocation;
- a semantic-evaluator adapter;
- provider credentials;
- contact discovery;
- recipient selection;
- email verification;
- persistent draft storage;
- a quality-gate mutation API;
- a customer send-review UI;
- send authorization;
- sending;
- follow-up scheduling;
- scheduler/worker activation;
- provider writes;
- public-site writes;
- Railway/staging/production changes.

## Next bounded increment

A later UGP-10 stage may define the **human send-review decision contract**.

That future stage should consume only a UGP-10.8 pass and should still stop short of live transmission.

Actual sending must remain a separate explicit authorization boundary.
