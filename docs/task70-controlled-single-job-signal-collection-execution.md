# Task #70 — Controlled Single-Job Signal Collection Execution Foundation v1

## Purpose

Task #70 adds the smallest auditable execution bridge after Task #69 while preserving a strict default-off boundary.

The engineering chain becomes:

`Task #67 refresh plan`

→ `Task #68 SourceAdapterRequest + supplied-result normalization`

→ `Task #69 proposed collection-job packet + exact authorization`

→ `Task #70 durable single-use execution envelope`

Task #70 does **not** add a real provider/source runner. The production/default runner capability is intentionally unconfigured, credential-not-ready, and network-not-ready.

## Runtime gate

Task #70 defines:

`SIGNAL_COLLECTION_SINGLE_JOB_EXECUTION_ENABLED`

Only the exact case-insensitive value `true` enables the execution gate.

The gate is checked before:

- Task #69 preflight
- runner capability evaluation
- operational site lookup
- database reservation
- runner invocation

With the gate false, execution returns immediately with no durable or external side effect.

Even with the gate true, Task #70 v1's default runner remains unavailable. Therefore gate enablement by itself is insufficient for a network request.

## Exact authorization

Task #70 accepts only the exact Task #69 authorization already embedded in the supplied packet:

`AUTHORIZE_SIGNAL_COLLECTION_JOB:<jobId>:<jobFingerprint>`

Before durable reservation, Task #70 independently invokes canonical Task #69 preflight over:

- packet
- source descriptor
- Task #67 refresh plan
- Task #68 request
- execution-time timestamp

Tamper, stale lineage, malformed identity, or expiry fails before reservation.

## Runner capability boundary

A future source-specific runner must satisfy the Task #70 runner capability contract for the exact packet:

- `configured=true`
- `credentialReady=true`
- `networkReady=true`
- exact source fingerprint
- exact collection mode
- exact signal type support

Task #70 v1 production defaults are:

- configured: false
- credential ready: false
- network ready: false
- source fingerprint: null
- collection mode: null
- signal types: empty

Tests use injected in-memory fakes only. No real provider, competitor, search, analytics, keyword, trend, or SERP request is part of Task #70 engineering/CI.

## Durable replay lock

Task #70 reuses the existing `jobs` table. It introduces no migration or DDL.

A deterministic UUID row ID is derived from:

- Task #70 version
- Task #69 job ID
- Task #69 job fingerprint
- Task #69 replay fingerprint

Lifecycle:

1. reserve as `pending`
2. claim as `active`
3. finish as `completed` or `failed`

Reservation uses `ON CONFLICT (id) DO NOTHING`, then reads the existing row to distinguish:

- exact previously consumed identity
- identity collision

An exact existing identity is not replayed. It returns `signal_collection_authorization_already_consumed`.

## Scalar execution scope

Each Task #70 execution is exactly:

- one Task #69 job
- one source
- one market
- one category
- one signal type
- one Task #68 request
- at most one runner invocation

There is no scheduler, batch executor, retry loop, or autonomous worker.

## Task #68 normalization handoff

A successful injected runner may return one supplied adapter result plus bounded transport metadata.

Task #70 validates bounded runner metadata and passes the supplied result to canonical Task #68 `normalizeAdapterResult`.

Only after Task #68 normalization succeeds may the durable job move to `completed`.

If the runner fails, runner metadata is invalid, or normalization fails, Task #70 attempts one terminal `failed` transition. It never retries the runner automatically.

## Receipt retention

The durable Task #70 receipt is intentionally bounded. It may contain:

- Task #69 job/replay IDs and fingerprints
- Task #68 request IDs/fingerprints
- source/market/category/signal fingerprints
- actor identity in bounded sanitized form
- start/completion timestamps
- outcome/failure category
- runner invocation count
- bounded response byte count
- optional pre-hashed provider request ID
- normalized observation ID/fingerprint/stream/status
- normalized metric count/confidence/completeness/positive-evidence markers

It does **not** retain:

- raw provider body
- raw HTML
- credentials
- access/refresh tokens
- API keys
- cookies
- request/response headers
- unnormalized provider payloads

Observation and evidence persistence remain false.

## Auth and API surface

Task #70 adds authenticated routes:

- `GET /api/signal-collection-execution/capability`
- `POST /api/signal-collection-execution/run`

All `/signal-collection-execution/*` API paths require `admin` role through the existing authentication middleware.

The POST route also inherits:

- session-bound CSRF enforcement
- existing sensitive mutation rate limiting

No alternate token or auth bypass is added.

## Capability semantics

Task #70 generic capability reports:

- execution gate state
- exact Task #69 authorization required: true
- authorization consumption implemented: true
- durable single-use reservation implemented: true
- deterministic row identity: true
- one-job/source/market/category/signal bounds
- production runtime runner configured: false
- credential ready: false
- network collection ready: false
- network collection authorized: false
- raw payload retention authorized: false
- observation persistence authorized: false
- evidence persistence authorized: false
- target configuration mutation authorized: false
- scheduler/batch/worker/retry loop: false
- provider/public-site writes: false
- automatic transition: false
- execution authorized: false
- schema mutation required: false

`executionAuthorized=false` remains true as a generic capability property because authorization is request-specific and fingerprint-bound, not a global capability.

## Failure semantics

Important fail-closed results include:

- execution gate disabled
- invalid request
- authorization mismatch
- Task #69 preflight failure
- expired Task #69 job
- runner unavailable
- operational site unavailable
- database unavailable
- execution-store failure
- authorization already consumed
- identity collision
- claim failure
- runner failure
- invalid bounded runner output
- Task #68 normalization failure
- manual intervention required when a terminal DB write cannot be confirmed

No failure path automatically retries a runner.

## Explicitly out of scope

Task #70 does not authorize or implement:

- a real signal-source/provider runner
- source/provider enrollment
- API keys or OAuth scope changes
- credential use in production
- real keyword/trend/SERP/analytics/provider/competitor requests
- observation persistence
- evidence persistence
- target activation/configuration
- scheduler or recurring collection
- batch execution
- retry worker
- production DDL
- Task #53/#54 execution
- Task #64 execution
- provider/public-site mutation
- publication/redeployment

A later source-runner milestone must be separately reviewed. Any first real signal-collection run requires separate explicit authorization after the necessary application release is separately published and production-certified.