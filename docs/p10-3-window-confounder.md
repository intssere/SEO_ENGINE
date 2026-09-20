# P10.3 — Before/after windows and confounder flags

## Scope

P10.3 adds deterministic, read-only **window membership** and **descriptive confounder flags** over exact P10.1 chronology and exact P10.2 action association.

It does not perform causal impact attribution.

The module is:

`artifacts/api-server/src/lib/action-window-confounder.ts`

## Integrity boundary

P10.3 consumes:

- one supplied P10.1 `UnifiedChangeTimelineReport`;
- one supplied P10.2 `ActionAttributionReport`;
- one exact P10.2 `actionId`;
- an optional exact retained-live anchor event fingerprint;
- optional explicit before/after window bounds;
- caller-supplied observations;
- caller-supplied external confounder facts.

Before any P10.3 projection, the supplied P10.2 report is independently rebuilt from the supplied P10.1 timeline with the certified P10.2 builder.

A mismatch fails closed with:

`p10_2_attribution_integrity_mismatch`

The rebuilt P10.2 timeline identity/fingerprint must also bind exactly to the supplied P10.1 report.

## Anchor semantics

A measurement anchor is available only when the caller supplies an exact P10.1 event fingerprint that:

- belongs to the exact P10.2 action ID; and
- has event kind `verified_change_retained_live`.

P10.3 does not infer an anchor from:

- authorization time;
- reservation time;
- provider-write acceptance;
- verification time alone;
- deployment lineage;
- timestamp proximity;
- event ordering.

If no anchor is supplied, the anchor and windows remain unavailable. Supplied windows without an anchor fail closed.

## Window semantics

Before/after window bounds are caller-supplied canonical UTC timestamps.

For an available anchor:

- before start must be <= before end;
- before end must be strictly earlier than the anchor;
- after start must be <= after end;
- after start must be strictly later than the anchor;
- window endpoints are inclusive within their own window;
- the anchor instant is in neither window.

P10.3 does not choose a preferred duration, cooldown, lag, significance threshold, or experimental frame.

Window membership is chronology only.

## Observation association

Each supplied observation carries:

- canonical `observedAt`;
- explicit source system/version/event identity/fingerprint;
- explicit scope.

An observation must carry at least one page/query/category dimension.

Every non-null supplied scope dimension must exactly match the P10.2 direct association for the subject action:

- page ID/URL must match one direct P10.2 page association;
- query must equal one direct P10.2 query;
- category must equal one direct P10.2 category;
- optional site ID/domain must equal exact P10.2 site lineage.

P10.3 does not use fuzzy URL matching, path matching, semantic query expansion, category taxonomy, opportunity/action-plan proximity, or time proximity to create association.

Membership states are:

- `before`;
- `after`;
- `outside`;
- `unassociated`;
- `window_unavailable`.

No metric delta, confidence, score, or impact is calculated.

## Confounder flags

P10.3 emits bounded descriptive flags from direct evidence only.

### Same-action flags

Within an available before/after window:

- `same_action_uncertain_write` from exact `provider_write_outcome_uncertain`;
- `same_action_rollback` from exact rollback events;
- `same_action_manual_intervention` from exact `manual_intervention_required`.

### Overlapping direct action

`overlapping_direct_action` is emitted only when another exact P10.2 action:

1. has an exact `verified_change_retained_live` event inside the subject window; and
2. shares at least one exact direct P10.2 page ID, URL, query, or category association with the subject action.

This is an overlap flag, not a causal finding.

### External supplied confounders

A caller may supply a bounded external fact with:

- explicit bounded kind;
- canonical start/end interval;
- exact source identity;
- explicit site/page/query/category scope.

The fact flags only when:

- its explicit scope matches the exact P10.2 action lineage/association; and
- its interval overlaps a supplied before/after window.

P10.3 does not independently verify whether the external event changed SEO performance.

## Replay and determinism

Supplied observations and external facts are keyed by exact source system/version/event ID.

- exact replay dedupes;
- different content for the same source identity fails closed;
- input ordering does not affect output identity;
- outputs are stably sorted and SHA-256 fingerprinted.

## Non-causal interpretation guard

P10.3 explicitly records:

- chronology does not create association;
- P10.2 association does not create causality;
- window membership does not create causality;
- confounder overlap does not perform causal adjustment;
- temporal proximity does not create causality;
- no metric delta is calculated;
- no confidence is calculated;
- no recommendation is generated;
- no causal attribution is performed;
- no impact is calculated.

The older live measurement runtime remains separate and unchanged.

## Safety boundary

P10.3 authorizes no:

- Production/live DB read/write;
- SQL or schema mutation;
- provider/network request;
- provider credential use;
- provider/public-site write;
- proposal persistence;
- approval grant;
- execution authorization;
- Task #51/#53/#54 execution;
- autonomous mutation or P9.8 implementation;
- timer/scheduler/worker/retry runtime;
- automatic transition;
- route activation;
- P10.4 implementation;
- deployment;
- publication.

`PUBLIC_SITE_WRITES_ENABLED` and `AI_PROPOSAL_GENERATION_ENABLED` remain untouched.

## Next boundary

P10.4 may later define an experiment/holdout framework where practical.

P10.3 does not create or imply experiment assignment, causal effect, statistical significance, or execution authority.
