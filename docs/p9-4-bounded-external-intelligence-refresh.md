# P9.4 — Bounded External Intelligence Refresh Architecture v1

## Purpose

P9.4 defines a deterministic/default-off review layer between exact Task #67/Task #68 external-intelligence lineage, P9.1 `signal_refresh` timing, and the existing P5 adapter/telemetry foundations.

It answers:

1. does this exact due P9.1 slot bind to one exact reviewed external Task #67 source/selected refresh item and Task #68 request?
2. does SEO ENGINE have an exact P5 supplied-result adapter foundation for that source/signal contract?
3. what does caller-supplied P5.8 quality/cost/rate-limit telemetry say about review readiness, without turning telemetry into provider execution authority or refresh-plan ranking?

P9.4 does not execute a provider refresh.

It adds no live timer/scheduler, provider enrollment, credential/OAuth use, HTTP/provider SDK call, Task #69 packet, Task #70 execution, durable queue, worker, persistence, Production DB access, provider/public-site mutation, deployment, or publication.

## Position in the read pipeline

The reviewed architecture is:

Task #66 market/category
→ Task #67 reviewed external source + selected refresh plan item
→ Task #68 exact source-adapter request
→ P5.2–P5.5 supplied-result adapter foundation
→ P5.8 supplied telemetry
→ P9.1 signal_refresh schedule / due intent
→ P9.4 external-intelligence refresh review candidate
→ future separately reviewed runtime/materialization boundary

P9.4 deliberately stops before any provider transport or Task #69/#70 boundary.

## Exact Task #66/#67/#68 lineage

P9.4 independently reconstructs and validates:

- Task #66 market identity;
- Task #66 category identity;
- Task #67 source descriptor identity;
- Task #67 refresh-plan ID/fingerprint and closed safety state;
- exactly one selected external source/signal item;
- Task #68 request identity by rebuilding it from source/item/market/category/plan lineage;
- exact market/category/signal scope;
- source class external;
- trust class reviewed_external;
- complete provenance;
- manual review.

Weak, experimental, unreviewed, provenance-incomplete, malformed, or mismatched lineage fails closed.

## Recognized P5 adapter foundations

P9.4 v1 recognizes exactly four external contracts.

### P5.2 SERP

- source key: `dataforseo-google-organic-serp`
- signal: `serp`
- collection mode: `provider_api`
- provider metadata: `dataforseo`
- foundation: deterministic request contract + caller-supplied result normalization

### P5.3 keyword metrics

- source key: `dataforseo-google-keyword-overview`
- signal: `keyword`
- collection mode: `provider_api`
- provider metadata: `dataforseo`
- foundation: deterministic request contract + caller-supplied result normalization

### P5.4 trends

- source key: `dataforseo-google-trends-explore`
- signal: `trend`
- collection mode: `provider_api`
- provider metadata: `dataforseo`
- foundation: deterministic standard-task contract + caller-supplied result normalization

### P5.5 backlinks

- source key: `supplied-backlink-fixture`
- signal: `backlink`
- collection mode: `manual_import`
- provider binding: none
- foundation: deterministic supplied-fixture normalization

Each recognized source key must support exactly its one expected signal in P9.4 v1. This prevents a source-specific adapter key from being silently widened to unrelated signals.

P5.6 competitor-gap synthesis is downstream composition, not a source-specific provider runner, so a generic `competitor` signal is not admitted by P9.4 v1.

## Supplied-result foundation is not live runtime readiness

P5.2–P5.5 are recognized only as supplied-result/request-contract foundations.

P9.4 candidates explicitly report:

- supplied-result foundation: available;
- live runtime: unavailable.

For provider-API channels, live-runtime blockers include:

- provider enrollment not authorized;
- credential use not authorized;
- live network not authorized;
- Task #70-compatible external runner unavailable.

For P5.5 manual import, the candidate remains manual-import only and does not fabricate provider transport readiness.

## P9.1 schedule binding

P9.4 derives a P9.1 `signal_refresh` schedule.

The scope fingerprint binds:

- source ID/fingerprint/key;
- market fingerprint;
- category fingerprint;
- signal type.

The upstream-lineage fingerprint binds:

- Task #67 plan ID/fingerprint;
- Task #68 request ID/fingerprint;
- exact P5 adapter kind/version;
- exact adapter capability fingerprint.

The caller still explicitly supplies:

- schedule key;
- start timestamp;
- cadence minutes;
- due-window minutes;
- paused state.

P9.4 reads no wall clock.

Telemetry is evaluation-time evidence and is not part of the schedule identity. Changing supplied telemetry changes the review projection/candidate, not the underlying source schedule.

## P5.8 telemetry reconstruction

P9.4 accepts caller-supplied telemetry inputs only:

- reference time;
- bounded quality/cost events;
- bounded rate-limit snapshots.

It builds a fresh P5.8 report for exactly one source/signal stream and requires exact stream lineage.

For provider-API streams the P5.8 provider binding must be DataForSEO.

For P5.5 manual import the provider binding is null.

P9.4 preserves P5.8 semantics:

- quality is descriptive;
- cost is descriptive;
- no proprietary provider score is created;
- quality/cost do not reorder Task #67;
- rate-limit telemetry is not execution authorization.

## Review disposition

Only the review disposition is affected by bounded operational facts.

### Provider-API streams

P9.4 evaluates the canonical P5.1 provider review at the caller-supplied evaluation time.

Provider review stale:
- disposition: `deferred_review`
- blocker: `provider_review_stale`

Rate-limit snapshot unavailable:
- disposition: `deferred_review`
- blocker: `rate_limit_unavailable`

Rate-limit evidence stale/critical under the exact Task #67 source freshness policy:
- disposition: `deferred_review`
- blocker records the freshness state.

Rate-limit state constrained or exhausted:
- disposition: `deferred_review`

Rate-limit state elevated:
- disposition: `supplied_review_caution`
- diagnostic: `rate_limit_elevated`

Fresh/available rate-limit evidence with a fresh provider review:
- disposition: `supplied_review_ready`

This is review gating only. No disposition authorizes provider execution.

### Manual-import backlink stream

Rate-limit/provider-review readiness is not applicable.

The review can be `supplied_review_ready` while live runtime remains unavailable/manual-import-only.

## Due-state semantics

P9.4 delegates schedule timing to P9.1.

Only P9.1 state `due` emits one P9.4 `proposed_review` candidate.

These states emit no candidate:

- `not_started`
- `paused`
- `missed`
- `already_materialized`

There is no catch-up/backfill.

## Candidate semantics

A due candidate binds:

- exact P9.1 schedule/intent IDs and fingerprints;
- exact slot/expiry;
- exact source/market/category/signal scope;
- exact Task #67 plan;
- exact Task #68 request;
- exact P5 adapter kind/version/capability fingerprint;
- supplied-result foundation status;
- live-runtime unavailability and blockers;
- review disposition/blockers/diagnostics;
- exact P5.8 report/stream fingerprints;
- bounded quality/cost/rate-limit facts;
- closed P9.4 safety state.

A candidate is not:

- provider enrollment;
- a credential request;
- a provider HTTP request;
- a Task #69 packet;
- a Task #70 job;
- a durable queue row/reservation;
- a worker dispatch;
- persisted evidence;
- publication authorization.

## Safety capability

P9.4 marks only architecture/review semantics true:

- `architectureOnly`
- `deterministicProjectionOnly`
- `externalReadReviewOnly`
- `suppliedInputsOnly`
- `telemetryReviewOnly`

It explicitly records that:

- source refresh-plan reordering is disabled;
- quality telemetry does not change refresh order;
- cost telemetry does not change refresh order;
- rate-limit telemetry is not execution authorization;
- supplied adapter foundation is not a live runner;
- ordering does not imply priority.

P9.4 keeps false:

- wall-clock access;
- timer/scheduler activation;
- durable enqueue/reservation;
- worker/batch/retry;
- Task #69 packet materialization;
- Task #70 execution;
- provider enrollment/purchase;
- credential creation/use;
- OAuth use;
- provider network reads;
- live endpoint execution;
- polling;
- observation/evidence persistence;
- Production DB reads/writes;
- provider/public-site writes;
- Task #53/#54 execution;
- automatic transition;
- publication.

## Tests

The deterministic suite covers:

- exact schedule identity and adapter lineage binding;
- P5.2 SERP recognition;
- P5.3 keyword recognition;
- P5.4 trend recognition;
- P5.5 manual-import backlink semantics;
- available/elevated/constrained/exhausted/unavailable rate-limit states;
- stale/critical rate-limit evidence;
- stale P5.1 review;
- non-due P9.1 states;
- schedule/source/request/telemetry tamper failure;
- unsupported source contract rejection;
- experimental/weak source rejection;
- multi-signal source-key widening rejection;
- static absence of timer/network/DB/environment/Task #69/#70/runtime execution primitives;
- exact default-off safety capability.

## Publication/runtime boundary

P9.4 is engineering architecture only.

Generic continuation does not authorize:

- provider enrollment/purchase;
- credentials/OAuth;
- live provider/network requests;
- Task #69 packet construction;
- Task #70 execution;
- durable queue materialization;
- workers/retries;
- persistence;
- Production DB access;
- provider/public-site mutation;
- deployment/publication.

The separately certified production application remains Task #73 unless a later publication is explicitly authorized.

## Next boundary

After P9.4 certification, the next safe roadmap item is **P9.5 — failure/retry/dead-letter/idempotency controls**.

P9.5 must remain architecture-only/default-off on generic continuation and must not activate a worker/retry loop, durable queue, provider request, persistence, mutation, or publication merely because P9.4 can describe external refresh review state.
