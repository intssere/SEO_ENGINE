# P10.1 — Unified Change Timeline v1

## Scope

P10.1 adds a deterministic, read-only chronology and lineage model for meaningful SEO ENGINE change events.

It does not add a database table, live read route, provider call, worker, scheduler, mutation, deployment, publication, attribution engine, or causal inference engine.

The module is:

`artifacts/api-server/src/lib/unified-change-timeline.ts`

## Existing source models inspected

P10.1 is grounded in the current certified models rather than creating a parallel persistence layer.

Relevant existing semantics include:

- P6.7 `opportunity-lifecycle.ts`
  - canonical lifecycle event ID/fingerprint;
  - explicit event time;
  - explicit from/to state;
  - observed/active/deferred/dismissed/closed/superseded lifecycle semantics;
  - no automatic transition or implementation inference.
- P9.7 `recommendation-generation-worker.ts`
  - deterministic recommendation ID/fingerprint/idempotency;
  - exact P6 lineage;
  - review-only governance handoff;
  - no ProposalRecord, approval, execution, or public-write authority.
- governed action-plan/approval projections in `operational-data.ts`
  - proposal fingerprint;
  - explicit latest review decision/time;
  - action type/field/before/after values;
  - quality/evidence/risk facts.
- Task #51 `execution-foundation.ts` and `execution-store.ts`
  - exact action-plan, action, authorization, target, before/after and verification identities;
  - internal authorization remains distinct from provider-write authority.
- Task #53/#54 execution foundations
  - deployment reservation;
  - accepted/uncertain provider-write states;
  - independent verification;
  - rollback and rollback verification;
  - manual-intervention state;
  - verified persistent live state.
- `measurement-attribution.ts`
  - eligibility/pending/not-eligible semantics;
  - observational windows only;
  - `causalAttribution=false`.

P10.1 consumes caller-supplied projections of those existing facts. It does not query or mutate Production.

## Timeline taxonomy

Event classes are fixed to:

1. `opportunity`
2. `recommendation`
3. `proposal`
4. `execution`
5. `measurement`

The bounded v1 event kinds are:

### Opportunity

- `opportunity_observed`
- `opportunity_activated`
- `opportunity_deferred`
- `opportunity_dismissed`
- `opportunity_closed`
- `opportunity_superseded`

The exact P6.7 adapter projects only P6.7's explicit lifecycle transitions. It intentionally does not fabricate an initial “observed” transition because P6.7 defines initial observed state as snapshot presence rather than a persisted first-observed event.

### Recommendation

- `recommendation_review_emitted`

This remains review-only. It does not create a ProposalRecord or approval/execution authority.

### Proposal

- `proposal_created`
- `proposal_edited`
- `proposal_approved`
- `proposal_rejected`
- `authorization_created`
- `authorization_renewed`

These are descriptive event records only. P10.1 does not create or renew authorization.

### Execution

- `action_authorized`
- `execution_reserved`
- `provider_write_accepted`
- `provider_write_outcome_uncertain`
- `verification_passed`
- `verification_failed`
- `rollback_started`
- `rollback_verified`
- `rollback_failed`
- `manual_intervention_required`
- `verified_change_retained_live`

An uncertain provider outcome must keep `providerMutationOccurred=null`; it cannot be converted to false merely because the write could not be confirmed.

### Measurement

- `measurement_eligible`
- `measurement_pending`
- `measurement_unavailable`

These markers are descriptive handoff states only. P10.1 does not calculate impact or attribute a metric change to an action.

## Canonical event identity

Every normalized event binds:

- P10.1 version;
- canonical ISO timestamp;
- event class/kind;
- exact source system/version/event ID;
- source fingerprint when available;
- exact site ID/domain when supplied;
- opportunity/recommendation/action-plan/proposal/approval/action/deployment/verification/rollback lineage when supplied;
- target page/URL/resource/field and before/after fingerprints when supplied;
- query/category association only when directly supplied;
- terminal/provider-write/verification/rollback/live/manual-intervention/measurement state only when directly supplied;
- exact supplemental source-lineage references.

Unknown values remain `null`. The timeline never fills them from nearby events.

The P10.1 event fingerprint is a SHA-256 hash of the complete normalized source event plus the P10.1 version. Event IDs are derived from that fingerprint.

## P6.7 exact adapter

`projectP67OpportunityLifecycleTimelineEvents` independently rebuilds the supplied P6.7 lifecycle report using `buildOpportunityLifecycle`.

If the supplied report differs from the rebuilt report, P10.1 fails closed with:

`p67_lifecycle_integrity_mismatch`

Only exact P6.7 event IDs/fingerprints are projected.

## Dedupe and conflict handling

Source identity is:

`source.system + source.version + source.eventId`

For the same source identity:

- exact canonical replay collapses to one event;
- different content is a hard `timeline_source_event_conflict`.

Supplemental lineage references follow the same principle: exact replay collapses; a conflicting fingerprint for the same lineage kind/ID fails closed.

No “latest wins” behavior exists.

## Ordering

Timeline order is deterministic and descriptive:

1. `occurredAt`;
2. fixed event-kind precedence only when timestamps are equal;
3. P10.1 event fingerprint as the final tie breaker.

This order does not create:

- importance;
- score;
- risk;
- recommendation priority;
- execution priority;
- causality.

## Non-causal interpretation guard

P10.1 explicitly records:

- `causalAttributionPerformed=false`;
- `metricMovementAttributedToAction=false`;
- `temporalProximityCreatesLineage=false`;
- `temporalProximityCreatesAttribution=false`;
- `measurementImpactCalculated=false`.

A metric change near a deployment in time is not evidence that the deployment caused that metric change.

## Safety boundary

P10.1 capability remains closed for:

- database reads/writes;
- Production reads/writes/DDL;
- provider network reads;
- provider credentials;
- provider/public-site writes;
- proposal persistence;
- approval grants;
- Task #51/#53/#54 execution;
- autonomous mutation;
- P9.8 implementation;
- scheduler/worker/retry activation;
- automatic transitions;
- publication.

`PUBLIC_SITE_WRITES_ENABLED` and `AI_PROPOSAL_GENERATION_ENABLED` are not read or modified by this module.

## What P10.1 does not solve

P10.1 intentionally does not implement:

- P10.2 action-to-page/query/category attribution;
- P10.3 before/after windows and confounder flags;
- experiments/holdouts;
- expected-vs-actual outcome learning;
- recommendation calibration;
- P9.8 autonomous mutation.

Those remain later roadmap boundaries.
