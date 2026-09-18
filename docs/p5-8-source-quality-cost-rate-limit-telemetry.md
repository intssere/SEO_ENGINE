# P5.8 — Source Quality / Cost / Rate-Limit Telemetry v1

Issue: #240

## Purpose

P5.8 adds a pure deterministic telemetry layer for reviewed signal sources.

It answers three operational questions from supplied data only:

1. What descriptive quality outcomes have been observed for this source/signal stream?
2. What cost or billing-unit data was explicitly supplied for those observations?
3. What is the latest supplied rate-limit capacity state?

P5.8 does **not** call any provider, read an account balance, inspect live response headers, admit a Task #67 source, change Task #67 refresh ordering, execute Task #64/#70, persist observations/evidence, or enforce throttling.

## Canonical module

- `artifacts/api-server/src/lib/source-telemetry.ts`
- `artifacts/api-server/src/lib/source-telemetry.test.ts`

Version:

`p5.8-source-telemetry-v1`

## Inputs

The report builder accepts:

- 1–50 existing Task #67 `SignalSourceDescriptor` objects;
- 1–200 source/signal stream bindings;
- 0–5,000 deterministic supplied telemetry events;
- 0–2,000 deterministic supplied rate-limit snapshots;
- one explicit report reference time.

Per-stream hard bounds:

- maximum 500 telemetry events;
- maximum 200 rate-limit snapshots.

No environment, network, database, credential store, scheduler or worker is consulted.

## Source identity

Every supplied Task #67 source descriptor is reconstructed with
`normalizeSignalSourceDescriptor()`.

The rebuilt source ID and fingerprint must exactly match the supplied descriptor.

This prevents telemetry from silently attaching to a descriptor whose key, scope, trust, quality, freshness or collection semantics were modified without producing the corresponding Task #67 identity change.

## Stream identity

A P5.8 telemetry stream is exactly:

- Task #67 source fingerprint;
- signal type;
- optional P5.1 provider key.

Only one binding is allowed for a source/signal pair in one report.

The provider key is descriptive lineage only. It is not Task #67 Production admission and does not authorize credentials or provider traffic.

## Quality telemetry

Each supplied event includes:

- stable event ID;
- source fingerprint;
- signal type;
- observed timestamp;
- Task #68-compatible status;
- completeness;
- optional supplied cost/billing record.

P5.8 preserves Task #68 outcome semantics:

| Status | Completeness |
|---|---:|
| success | exactly 1 |
| empty | exactly 1 |
| partial | 0.01–0.99 |
| error | exactly 0 |

Confidence is derived using the existing Task #68 semantics:

- success / empty: configured Task #67 source quality;
- partial: `source quality × completeness × 0.9`;
- error: 0.

Positive evidence is true only for success/partial.

Per stream P5.8 reports:

- total events;
- success count/rate;
- partial count;
- empty count;
- error count/rate;
- usable rate = success + partial;
- mean completeness;
- mean confidence;
- positive-evidence count/rate;
- configured Task #67 source quality as a separate field.

P5.8 deliberately does **not** collapse these values into a proprietary source rank, winner, recommendation score or P6 opportunity score.

## Cost telemetry

P5.8 never derives numeric spend from P5.1 prose pricing summaries.

Numeric cost exists only when explicitly supplied on an event.

A supplied cost record may contain either or both:

- monetary amount + ISO-style three-letter currency;
- billing-unit amount + bounded unit label.

Rules:

- null remains different from zero;
- amount/currency must be both present or both absent;
- billingUnits/billingUnit must be both present or both absent;
- an otherwise empty cost record is rejected;
- negative values are rejected;
- multiple currencies in one stream are rejected;
- multiple billing-unit identities in one stream are rejected;
- no FX conversion is performed.

Per stream the report exposes:

- events with any cost record;
- cost coverage ratio;
- events with monetary amount;
- monetary coverage ratio;
- total supplied monetary amount;
- currency;
- events with billing units;
- billing-unit coverage ratio;
- total supplied billing units;
- billing-unit label;
- monetary cost per usable observation only when **every** event has monetary cost coverage.

A zero supplied cost remains a real zero and is not converted to unavailable.

## P5.1 provider metadata

For provider-bound streams, P5.8 joins only the existing canonical P5.1 review.

It exposes:

- provider key/name;
- pricing model;
- relative cost class;
- reliability evidence class;
- reviewed-at date;
- re-review-after date;
- fresh/stale review state;
- exact P5.1 review fingerprint.

The P5.1 review remains a dated planning snapshot.

P5.8 does not update that review, scrape provider pricing, convert review prose into spend, or imply that a reviewed provider is admitted for Production collection.

## Rate-limit snapshots

A supplied rate-limit snapshot includes:

- stable snapshot ID;
- source/signal identity;
- capture timestamp;
- bounded descriptive scope;
- limit;
- remaining;
- window seconds;
- optional reset timestamp.

Capacity fields are either all present or all absent.

When capacity is present:

`utilization = (limit - remaining) / limit`

Derived descriptive state:

| State | Rule |
|---|---|
| unavailable | capacity not supplied |
| available | utilization < 0.50 |
| elevated | 0.50 ≤ utilization < 0.85 |
| constrained | utilization ≥ 0.85 and remaining > 0 |
| exhausted | remaining = 0 |

The latest snapshot is selected deterministically by:

1. newest `capturedAt`;
2. snapshot fingerprint as tie-breaker.

These states are **telemetry only**.

P5.8 does not:

- throttle requests;
- delay jobs;
- schedule retries;
- reorder Task #67 refresh candidates;
- dispatch Task #70 work;
- alter provider concurrency.

Those runtime controls require later explicitly reviewed engineering.

## Diagnostics

Each stream emits sorted descriptive diagnostics:

- `no_events`
- `cost_unavailable`
- `cost_partial_coverage`
- `rate_limit_unavailable`
- `provider_review_stale`

Diagnostics do not trigger execution.

## Determinism and lineage

Events and snapshots are normalized and fingerprinted.

P5.8 rejects:

- duplicate source descriptors;
- duplicate stream bindings;
- duplicate event IDs;
- duplicate event fingerprints;
- duplicate rate-limit snapshot IDs;
- duplicate rate-limit snapshot fingerprints;
- source/signal rows without a declared stream binding;
- source identity mismatch;
- future event/snapshot timestamps;
- contradictory Task #68 completeness;
- incomplete rate-limit capacity;
- reset timestamps before capture;
- mixed currencies;
- mixed billing-unit identities;
- configured hard-bound overflow.

The final report fingerprint binds:

- report reference time;
- exact P5.1 review fingerprint/state;
- Task #67 source fingerprints;
- deterministic stream fingerprints;
- quality summaries;
- cost summaries;
- latest rate-limit state;
- provider metadata;
- diagnostics.

Reordering otherwise identical input arrays cannot change the report identity.

## Synthetic test coverage

The P5.8 test suite includes deterministic reserved synthetic cases for:

- complete-cost DataForSEO-bound SERP-like stream;
- partial-cost SerpApi-bound stream;
- explicit zero cost vs null cost;
- available / elevated / constrained / exhausted / unavailable rate-limit states;
- newest-snapshot selection;
- future stale P5.1 review state;
- provider-unbound manual-import stream;
- no-event stream;
- input-order invariance;
- fail-closed source identity, completeness, currency, binding and rate-capacity contradictions;
- hard runtime/persistence safety gates;
- static rejection of network/environment/database/execution/scheduler primitives.

No provider request is made by these tests.

## Safety capability

P5.8 hard-codes:

- deterministic reporting only: true;
- supplied telemetry only: true;
- P5.1 provider-review join only: true;
- live provider reads: false;
- provider credential use/mutation: false;
- Task #67 source admission: false;
- Task #67 refresh-plan reordering: false;
- rate-limit enforcement: false;
- Task #64 execution: false;
- Task #70 execution: false;
- observation/evidence persistence: false;
- DB reads/writes/schema mutation: false;
- scheduler/batch/worker/retry: false;
- provider/public-site writes: false;
- publication: false;
- automatic transition: false.

## Relationship to P6

P5.8 completes the planned P5 external-intelligence engineering foundation by making source quality/cost/rate-limit evidence explicit and deterministic.

P6 may consume this telemetry later as evidence for confidence, effort, freshness or operational constraints only after dedicated P6 semantics are designed.

P5.8 itself does not prioritize opportunities or providers.

## Publication state

P5.8 engineering does not publish the application.

The separately certified Task #73 application remains the production release unless a later explicit publication authorization changes that state.
