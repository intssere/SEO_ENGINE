# Task #68 — Source Adapter Contract & Signal Observation Normalization Foundation v1

## Purpose

Task #68 defines the pure boundary between Task #67 refresh planning and any future separately authorized collection implementation.

It answers two questions only:

1. What shape may a source adapter return?
2. How is that bounded result converted into one canonical market/category signal observation?

Task #68 does **not** contact a provider, competitor, search engine, analytics service, or public site. It does not persist observations and does not schedule anything.

## Control-plane position

The current pure chain is:

`Task #66 MarketProfile / CategoryContext / SignalType`

→ `Task #67 SignalSourceDescriptor / refresh plan`

→ `Task #68 SourceAdapterDescriptor / AdapterResultInput / SignalObservationEnvelope`

A future collection layer may eventually sit before `AdapterResultInput`, but that runtime boundary is explicitly outside Task #68.

## Source adapter descriptor

A Task #68 adapter descriptor is deterministic and bound to exactly one Task #67 source identity.

It contains:

- stable adapter key and name
- adapter semantic version string
- Task #67 source ID/fingerprint
- source class and trust class
- supported signal types
- collection-mode descriptor inherited from the source
- hard maximum item count
- whether bounded partial results are representable
- deterministic adapter fingerprint/ID

An adapter cannot claim a signal type not present on its Task #67 source descriptor, and its collection-mode descriptor must match the source descriptor.

This is a **contract descriptor**, not executable provider code.

## Adapter result contract

A supplied adapter result carries:

- adapter fingerprint
- source fingerprint
- caller-supplied correlation ID
- signal type
- market fingerprint
- category fingerprint
- observed-at timestamp
- collected-at timestamp
- complete/partial state
- bounded confidence
- provenance record
- optional bounded diagnostics
- bounded observation items

The result is treated as untrusted structured input and is validated before normalization.

## Canonical observation envelope

A valid result becomes one deterministic `SignalObservationEnvelope` containing:

- observation ID/fingerprint
- adapter/source lineage
- market/category/signal identity
- collection-mode descriptor
- caller correlation identity
- canonical timestamps
- complete/partial state
- source quality and result confidence
- canonical provenance
- sorted diagnostics
- sorted normalized observation items
- immutable safety markers

The envelope is a future persistence **candidate shape only**. Task #68 performs no persistence.

## Unified bounded item shape

All eight Task #66 signal types use the same compact canonical item envelope:

- `key`: stable normalized item identity within the result
- `subject`: optional bounded display/semantic subject
- `terms`: bounded normalized unique terms
- `metrics`: bounded finite numeric metrics
- `attributes`: bounded scalar attributes

Supported signal types are:

- analytics
- catalog
- competitor
- entity
- GEO/AIO
- keyword
- SERP
- trend

Using one canonical item envelope keeps downstream provenance and identity behavior consistent while still allowing signal-specific dimensions to be represented through controlled keys, metrics, terms, and scalar attributes.

Task #68 intentionally does not accept arbitrary provider JSON blobs.

## Deterministic identity

Observation identity includes material normalized evidence:

- adapter/source lineage
- signal/market/category identity
- correlation identity
- observation and collection timestamps
- completeness
- source quality and confidence
- canonical provenance
- diagnostics
- normalized item evidence

Input-order differences do not alter identity because:

- terms are normalized, deduplicated, and sorted
- metric/attribute/provenance keys are sorted
- diagnostics are normalized, deduplicated, and sorted
- items are keyed and sorted

A material metric/value/evidence change does alter the fingerprint.

## Fail-closed validation

Normalization rejects:

- malformed or mismatched adapter fingerprint
- malformed or mismatched source fingerprint
- market fingerprint mismatch
- category fingerprint mismatch
- unsupported adapter signal type
- Task #67 source eligibility failure
- collection-mode mismatch
- invalid timestamps
- observed-at later than collected-at
- collected-at later than supplied normalization time
- invalid completeness state
- unsupported partial results
- partial results without explicit diagnostics
- confidence/source-quality outside `[0,1]`
- missing provenance
- Task #67 sources whose provenance is incomplete
- empty item arrays
- item counts above the adapter budget
- duplicate item keys after normalization
- empty observation items
- non-finite numeric metrics
- oversized metric/attribute/provenance/term/diagnostic sets
- forbidden sensitive/raw fields

## Sensitive/raw-data exclusion

Task #68 rejects common credential/raw-response field names, including authorization/cookie/token/secret/password/API-key/raw HTML/body/header shapes.

The normalized envelope therefore has no place for:

- API keys
- OAuth/access/refresh/ID tokens
- authorization headers
- cookies
- request or response headers
- request bodies
- response bodies
- raw HTML
- unbounded provider response blobs

Future adapters must extract only bounded structured evidence before crossing this contract boundary.

## Partial-result semantics

Partial results are allowed only when the adapter descriptor explicitly supports them.

A partial result must contain at least one diagnostic explaining why it is partial, such as a bounded page/item budget being reached. This prevents an ambiguous incomplete payload from being treated as complete evidence.

## Relationship to Task #67 freshness planning

Task #67 decides which source/signal combinations should be refreshed based on supplied observation ages and bounded budgets.

Task #68 does not modify that policy. It only defines the normalized result that a future collection implementation could produce for a selected refresh item.

The caller correlation ID can carry a future refresh-plan/item identity, but Task #68 does not verify, reserve, execute, or persist a refresh plan.

## Safety invariants

Task #68 capability is contract/normalization only:

- network collection authorized: false
- provider enrollment authorized: false
- credential mutation authorized: false
- observation persistence authorized: false
- evidence persistence authorized: false
- target configuration mutation authorized: false
- scheduler enabled: false
- batch enabled: false
- autonomous worker enabled: false
- retry loop enabled: false
- provider writes: false
- public-site writes: false
- Task #64 execution authorized: false
- automatic transition: false
- schema mutation required: false

## What Task #68 does not add

Task #68 adds no:

- API route
- provider connector
- competitor network call
- search/trend/SERP API request
- API key or OAuth scope
- database table/migration
- observation persistence path
- target registration/configuration
- scheduler
- worker
- batch executor
- retry loop
- Task #64 execution
- Task #53/#54 execution
- public/provider write
- deployment/publication requirement

## Next boundary

After Task #68 is certified, the next safe milestone should remain network-free and define **collection request planning / adapter invocation preparation** before any provider-specific live integration is considered.

A suitable next milestone is:

**Task #69 — Signal Collection Request & Adapter Invocation Planning Foundation v1**

That stage should deterministically bind a Task #67 selected refresh item to an approved Task #68 adapter, establish bounded request parameters/cost/rate-limit policy as data, and produce an invocation plan/fingerprint without actually invoking a network/provider adapter.

Real provider enrollment, credentials, live keyword/trend/SERP calls, recurring collection, observation persistence, or scheduler/worker activation remain separate explicit authorization boundaries.
