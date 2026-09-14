# Task #68 — Source Adapter Contract & Signal Observation Normalization Foundation v1

## Purpose

Task #68 introduces a pure, deterministic boundary between Task #67 refresh planning and any future separately authorized source collection implementation.

It does **not** contact providers or competitors. It does **not** use credentials. It does **not** persist observations. It does **not** schedule work. It defines only:

1. a deterministic source-adapter descriptor bound to a Task #67 source/market/category/signal identity, and
2. a bounded canonical observation envelope for already-supplied adapter results.

The intended future flow is:

`Task #67 refresh item -> approved source adapter -> separately authorized collection -> Task #68 normalization -> future persistence/analysis layer`

Only the normalization contract exists in this task.

## Adapter identity

Each adapter is bound to:

- Task #67 source fingerprint
- Task #66 market fingerprint
- Task #66 category fingerprint
- signal type
- source collection-mode descriptor
- adapter key
- adapter version
- operation class

Supported descriptive operation classes are:

- `read_snapshot`
- `read_timeseries`
- `read_rankings`
- `read_entities`
- `read_catalog`

These values are descriptive. They do not invoke I/O.

The adapter fingerprint is deterministic over normalized adapter identity. Meaningful changes to source, market, category, signal, version, collection mode, or operation class change the adapter fingerprint.

## Source-lineage rules

Adapter creation and observation normalization fail closed unless:

- source fingerprint is structurally valid
- market/category fingerprints are structurally valid
- source supports the signal type
- source supports the selected market/category or explicitly allows the corresponding wildcard
- external source was manually reviewed
- source provenance is complete
- adapter collection mode exactly matches the Task #67 source descriptor

An observation must also match the adapter's exact source, market, category, signal, source class, trust class, quality, and collection-mode lineage.

## Canonical observation envelope

A normalized observation contains:

- observation ID
- observation fingerprint
- content fingerprint
- adapter ID/fingerprint
- source ID/fingerprint
- source class
- trust class
- source quality
- market fingerprint
- category fingerprint
- signal type
- normalized `observedAt`
- normalized `collectedAt`
- bounded dimensions
- bounded metrics
- bounded normalized terms
- bounded entities
- bounded provenance metadata
- bounded diagnostics
- fixed safety capability markers

The raw response/body is deliberately absent.

## Deterministic canonicalization

Task #68 canonicalizes supplied normalized payloads so semantically identical ordering does not change fingerprints.

Rules include:

- record keys are normalized to lowercase canonical keys
- metric/dimension/provenance records are sorted by key
- terms are Unicode-normalized, trimmed, collapsed for whitespace, lowercased, de-duplicated, and sorted
- entities are normalized and sorted by `(type, key)`
- diagnostics are normalized, de-duplicated, and sorted
- timestamps are normalized to ISO-8601 UTC strings
- negative zero is normalized to zero

The content fingerprint covers canonical dimensions, metrics, terms, and entities.

The observation fingerprint additionally covers exact source/adapter/market/category/signal lineage, timestamps, provenance, and diagnostics.

Therefore:

- identical normalized content + lineage + timestamps => identical observation identity
- meaningful content or lineage changes => changed observation identity
- collection-time-only changes preserve content fingerprint but change observation fingerprint

## Hard bounds

Task #68 enforces deterministic upper bounds:

- dimensions: 64
- metrics: 64
- terms: 100
- entities: 100
- provenance fields: 64
- diagnostics: 32
- canonical key length: 64
- ordinary primitive string length: 240
- term length: 160
- entity key length: 160
- entity name length: 200
- diagnostic length: 200
- numeric absolute magnitude: `1e15`

Unsupported object/array value types inside primitive records are rejected.

Duplicate canonical record keys and duplicate canonical entity identities fail closed rather than silently overwriting data.

## Sensitive/raw-data rejection

Normalized observation payloads must not contain transport/raw-secret material.

Task #68 explicitly rejects sensitive field names representing classes such as:

- authorization
- cookies
- credentials
- passwords
- secrets
- API keys
- access/refresh tokens
- bearer material
- raw body/response/HTML
- request/response headers

Unknown payload fields are also rejected. This keeps the observation envelope intentionally narrow and prevents accidental raw-response retention.

## Timestamp rules

`observedAt` and `collectedAt` must both parse as valid timestamps and are normalized to UTC ISO strings.

`observedAt` may not be later than `collectedAt`.

Task #68 does not itself impose provider-specific lag windows; those remain source-policy concerns.

## Relationship to Task #67

Task #67 answers:

> Which approved source/signal should be refreshed next for this market/category, and with what urgency?

Task #68 answers:

> If a future authorized adapter supplies a bounded result for that source/signal, what exact normalized evidence envelope is permitted into the next layer?

Task #68 intentionally does **not** implement the collection step between those questions.

## Safety capability

Task #68 capability is fixed to:

- contract/normalization only: true
- network collection authorized: false
- provider enrollment authorized: false
- credential access authorized: false
- credential mutation authorized: false
- evidence persistence authorized: false
- target configuration mutation authorized: false
- scheduler: false
- batch: false
- autonomous worker: false
- retry loop: false
- provider writes: false
- public-site writes: false
- automatic transition: false
- execution authorized: false
- schema mutation required: false

No observation can create execution authorization.

## Explicitly out of scope

Task #68 does not add:

- provider-specific network adapters
- competitor crawling
- keyword/trend/SERP API calls
- secrets or OAuth configuration
- persistence tables or migrations
- source scheduler
- batch collector
- retry worker
- target activation
- Task #64 execution
- Task #53/#54 execution
- provider/public-site mutation
- publication/redeployment

Any of those requires a later separately reviewed task and, where applicable, explicit authorization.