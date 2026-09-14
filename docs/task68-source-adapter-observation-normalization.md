# Task #68 — Source Adapter Contract & Signal Observation Normalization Foundation v1

## Purpose

Task #68 defines the pure deterministic boundary between Task #67 refresh planning and any future separately authorized source collection layer.

It does **not** contact sources. It does not enroll providers, use credentials, persist observations, activate targets, run schedulers/workers, mutate public/provider state, change schema, or create any automatic observation-to-execution path.

Version:

`task68-source-adapter-observation-normalization-v1`

## Position in the intelligence pipeline

The safe control-plane sequence is now:

`Task #66 market/category identities -> Task #67 source registry + refresh plan -> Task #68 adapter request contract + supplied-result normalization -> future separately authorized collection/persistence layers`

Task #68 deliberately separates **what a future adapter must return** from **how any future adapter would obtain it**.

## Source adapter request contract

A Task #68 request can be created only from:

- a certified Task #67 `SignalSourceDescriptor`
- an exact Task #67 `RefreshPlanItem`
- the Task #66 market profile
- the Task #66 category context
- optional exact Task #67 refresh-plan lineage

The request binds:

- source ID
- source fingerprint
- source class
- descriptive collection mode
- market fingerprint
- category fingerprint
- signal type
- optional refresh plan ID/fingerprint

The request gets a deterministic SHA-256 fingerprint and stable request ID.

No token, secret, credential, URL authorization, HTTP method, provider mutation instruction, or executable transport object is present.

### Request fail-closed rules

Request creation rejects:

- source ID mismatch
- source fingerprint mismatch
- source-class mismatch
- Task #67 source eligibility failure for the supplied market/category/signal
- incomplete plan lineage
- malformed plan identity/fingerprint

## Supplied adapter result contract

Task #68 accepts a supplied structural result only. The normalization function validates exact allowed root fields and rejects unknown fields.

Allowed statuses:

- `success`
- `empty`
- `partial`
- `error`

The result must repeat the exact request/source/market/category/signal lineage so tampering or cross-scope mixing fails closed.

### Raw payload prohibition

Unknown root or metric fields are rejected rather than ignored.

This means fields such as raw provider bodies, competitor copy, arbitrary text blobs, or undocumented provider payloads cannot silently pass through the Task #68 normalization boundary.

`rawPayloadRetentionAuthorized=false`

## Status semantics

### success

- at least one normalized metric is required
- no error code is permitted
- completeness is exactly `1`
- positive evidence may be true

### empty

- zero metrics are required
- no error code is permitted
- completeness is exactly `1`
- this is a successful no-evidence state, not a provider failure
- positive evidence is false

### partial

- at least one normalized metric is required
- at least one sanitized diagnostic code is required
- no error code is permitted
- completeness must be between `0.01` and `0.99`
- confidence is deterministically reduced

### error

- zero metrics are required
- a sanitized error code is required
- completeness is exactly `0`
- confidence is `0`
- positive evidence is false

Invalid status/metric/error/completeness combinations fail closed.

## Metric normalization

Metrics are structural numeric evidence only.

Bounds:

- maximum 64 metrics per observation
- normalized metric keys: lowercase, stable, bounded, machine-safe
- finite numeric values only
- values bounded to ±1e15
- optional bounded unit descriptor
- deterministic lexical metric ordering
- duplicate normalized metric keys rejected
- unknown metric fields rejected

Metric insertion order therefore does not alter observation identity.

## Timestamp rules

`observedAt` and `normalizedAt` must both parse as valid timestamps.

A supplied observation timestamp later than normalization time fails closed.

Both timestamps are normalized to canonical ISO-8601 strings.

## Canonical observation envelope

A normalized observation binds:

- observation ID/fingerprint
- logical stream ID
- request ID/fingerprint
- source ID/fingerprint/class
- trust class
- market fingerprint
- category fingerprint
- signal type
- observed timestamp
- normalized timestamp
- status
- sorted normalized metrics
- sorted sanitized diagnostics
- sanitized error code
- source quality
- completeness
- derived confidence
- positive-evidence marker
- fixed safety capability

### Logical stream identity

A stream is defined by:

`source fingerprint + market fingerprint + category fingerprint + signal type`

This lets repeated observations from the same logical evidence stream be compared over time without mixing unrelated markets/categories/signals.

## Confidence carry-forward

Task #68 does not invent source trust.

- `sourceQuality` comes from the certified Task #67 descriptor
- successful/empty results retain source quality as confidence
- partial results multiply source quality by completeness and a fixed `0.9` partial-result factor
- error results receive confidence `0`

An empty result may be a high-confidence observation that no evidence was returned; it is still **not positive evidence**.

## Deterministic observation identity

The observation fingerprint covers the normalized immutable evidence envelope including:

- logical stream
- exact request fingerprint
- source lineage
- market/category/signal scope
- observed time
- status
- normalized metrics
- diagnostics/error state
- source quality
- completeness/confidence
- positive-evidence marker

Observation IDs are derived from the fingerprint.

## Pure batch/deduplication contract

Task #68 also provides a pure bounded observation batch builder.

Default maximum: 100 observations.
Hard maximum: 500 observations.

Behavior:

- exact duplicate observation fingerprints collapse deterministically
- same stream + same observation timestamp + conflicting observation fingerprint fails closed
- mixed markets fail closed
- mixed categories fail closed
- canonical output order is deterministic
- batch identity is derived from sorted canonical observation fingerprints

The batch is a data object only. `batchExecutorEnabled=false`.

## Safety capability

Task #68 capability is permanently closed for execution in v1:

- contract/normalization only: true
- network collection authorized: false
- transport execution authorized: false
- provider enrollment authorized: false
- credential use authorized: false
- credential mutation authorized: false
- raw payload retention authorized: false
- evidence persistence authorized: false
- target configuration mutation authorized: false
- scheduler enabled: false
- batch executor enabled: false
- autonomous worker enabled: false
- retry loop enabled: false
- provider writes: false
- public-site writes: false
- automatic transition: false
- schema mutation required: false

## Deterministic test coverage

The Task #68 test suite covers:

1. closed capability markers
2. deterministic adapter request identity and Task #67 lineage
3. source/item mismatch and incomplete lineage failure
4. successful observation identity independent of metric order
5. explicit empty semantics
6. explicit partial semantics and confidence reduction
7. explicit error semantics with zero evidence/confidence
8. source/market/category/signal tamper rejection
9. malformed/future timestamp rejection
10. duplicate/malformed/out-of-range metric rejection
11. raw/unknown payload field rejection
12. exact duplicate observation collapse
13. same-stream/same-time conflict rejection
14. deterministic bounded batch identity independent of input order
15. mixed-category batch rejection

## Explicit non-goals

Task #68 does not implement:

- provider adapters that make HTTP/API requests
- competitor collection
- trend/SERP/keyword API calls
- credential lookup or token refresh
- provider enrollment
- database tables or migrations
- persistence
- target activation
- scheduler/batch execution
- retry workers
- Task #64 execution
- Task #53/#54 execution
- provider/public-site writes
- publication/redeploy

Any future live collection layer must be separately authorized and must consume Task #67/#68 contracts without weakening their scope/provenance/safety checks.
