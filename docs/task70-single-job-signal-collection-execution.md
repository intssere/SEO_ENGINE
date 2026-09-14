# Task #70 — Controlled Single-Job Signal Collection Execution Foundation v1

## Purpose

Task #70 is the smallest auditable execution bridge between the Task #69 authorization packet and a future source-specific read adapter.

It is deliberately **default-off** and **production-runner-unconfigured**. Engineering and CI perform zero live source requests. Merging this task does not authorize a provider call, credential use, persistence, scheduling, or public/provider mutation.

Control chain:

`Task #66 market/category identity`

→ `Task #67 source registry + refresh plan`

→ `Task #68 adapter request + supplied-result normalization`

→ `Task #69 exact expiring collection-job packet + authorization text`

→ `Task #70 default-off durable single-job execution bridge`

## Runtime gate

Task #70 introduces one dedicated gate:

`SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED`

Default/effective false means execution returns before:

- Task #69 preflight work beyond basic request validation
- runner capability/readiness evaluation
- operational site lookup
- database reservation
- runner invocation
- any possible network/source behavior

The gate alone is never authorization. Every execution still requires one exact unexpired Task #69 packet and exact authorization:

`AUTHORIZE_SIGNAL_COLLECTION_JOB:<jobId>:<jobFingerprint>`

## Exact scalar scope

Each execution is exactly:

- one Task #69 job packet
- one source
- one market
- one category
- one signal type
- one Task #68 request
- one runner invocation
- one deterministic durable execution-job identity

No batch executor, scheduler, worker, or retry loop is created.

## Production runner boundary

Task #70 defines a source-runner interface with explicit readiness capability:

- configured
- credentialReady
- networkReady
- sourceReadOnly
- providerWrites=false
- publicSiteWrites=false

The production/default runner is intentionally:

- configured=false
- credentialReady=false
- networkReady=false

Its `run` method cannot perform I/O and fails closed if somehow invoked.

Tests inject an in-memory fake runner only. No source-specific provider adapter or credential binding is implemented in Task #70.

## Authorization and preflight order

Execution order is fail-closed:

1. Task #70 gate must be enabled.
2. Supplied packet/source/plan/request must be structurally present.
3. Supplied authorization must exactly equal the Task #69 packet authorization.
4. Task #69 preflight independently re-validates packet/source/plan/request lineage and expiry.
5. Runner capability must be configured + credential-ready + network-ready + read-only.
6. Operational site context must be available.
7. Durable execution store must be available.
8. Deterministic execution row is reserved.
9. Reserved row is claimed exactly once.
10. Runner is invoked exactly once.
11. Supplied runner result is normalized through Task #68.
12. Job becomes terminal completed or failed.

No automatic transition to persistence or mutation exists.

## Durable replay lock

Task #70 reuses the existing `jobs` table and requires no migration/DDL.

Job type:

`signal_collection_single_job_v1`

The deterministic UUID is derived from:

- Task #70 version
- Task #69 job ID
- Task #69 job fingerprint
- Task #69 replay fingerprint

Lifecycle:

- `pending` on reservation
- `active` on claim
- terminal `completed` or `failed`

`ON CONFLICT (id) DO NOTHING` never silently replays. An existing exact identity returns already-consumed; a mismatched row under the same UUID is an identity collision and fails closed.

Uncertain reservation state and terminal-write failure return a manual-intervention state rather than authorizing an automatic retry.

## Task #68 normalization handoff

A successful injected runner returns one bounded adapter result. Task #70 passes it to canonical Task #68 `normalizeAdapterResult`.

A completed receipt stores only bounded normalized metadata:

- observation ID/fingerprint
- stream ID
- status
- observedAt
- metric count
- diagnostic count
- completeness
- confidence
- positive-evidence flag

The durable receipt does **not** retain:

- raw provider body/payload
- headers
- cookies
- tokens
- API keys
- OAuth credentials
- arbitrary runner error text

Runner exceptions are reduced to the fixed failure category `runner_failed`. Task #68 rejection is reduced to `normalization_failed`.

## Persistence boundary

Task #70 never writes normalized observations or competitor evidence to an observation/evidence table.

Every successful execution explicitly reports:

- observation persistence attempted=false
- evidence persistence attempted=false
- raw payload retained=false

Future persistence requires a separate task and separate authorization boundary.

## API surface

Authenticated API routes:

- `GET /api/signal-collection-execution/capability`
- `POST /api/signal-collection-execution/run`

Both additionally require `admin` role in the Task #70 router.

The POST remains protected by the existing global unsafe-method controls:

- authenticated session
- session-bound CSRF token
- mutation rate limiter

If authentication enforcement were disabled globally, Task #70 still fails closed because the route requires an attached authenticated admin principal.

## Capability safety

Generic capability always keeps these authorization markers false:

- network collection authorized
- observation persistence authorized
- evidence persistence authorized
- raw payload retention authorized
- target configuration mutation authorized
- Task #64 execution authorized
- provider writes
- public-site writes
- execution authorized
- automatic transition
- schema mutation required

Scheduler, batch executor, autonomous worker, and retry loop also remain disabled.

A configured feature gate does not change those generic authorization markers; exact packet authorization is evaluated per request.

## Engineering/CI boundary

Task #70 engineering tests are deterministic and network-free. They use only injected in-memory stores and fake runners.

Engineering/CI must not:

- enable the production Task #70 gate
- configure a real runner
- use provider credentials
- make DNS/HTTP/API/source requests
- persist observations/evidence
- mutate target configuration
- run Task #53/#54/#64
- perform production DDL
- publish/redeploy

## First real run boundary

A first real signal-source run is **not authorized by Task #70 engineering**.

Before any real run, the system still needs, at minimum:

1. Task #70 separately published and production-certified with its gate false.
2. One source-specific runner implementation reviewed for read-only behavior.
3. Source-specific credential/provider capability reviewed separately.
4. A fresh Task #67 refresh plan.
5. A fresh Task #68 adapter request.
6. A fresh Task #69 packet.
7. Exact explicit authorization for that Task #69 job.
8. Separate explicit authorization for any temporary Task #70 gate enablement/deployment needed in production.

Observation/evidence persistence remains a separate authorization boundary even after a successful real read.
