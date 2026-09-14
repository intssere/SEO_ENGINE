# Task #69 — Signal Collection Job Planning & Authorization Foundation v1

## Purpose

Task #69 adds the final pure planning layer before any future source collection runtime.

It composes:

`Task #67 selected refresh plan lineage`

with:

`Task #68 SourceAdapterRequest identity`

into:

`Task #69 SignalCollectionJobPacket + deterministic authorization preflight`

Task #69 does not collect anything. It does not use credentials, call a transport, persist a job, persist evidence, activate a scheduler, or expose an execution route.

## Control-plane position

The safe observation control plane is now:

`Task #66 MarketProfile / CategoryContext / SignalType`

→ `Task #67 SignalSourceDescriptor / RefreshPlan`

→ `Task #68 SourceAdapterRequest / supplied-result normalization`

→ `Task #69 future collection-job packet / exact authorization contract`

→ **future separately authorized execution foundation**

The last arrow does not exist in Task #69.

## Exact lineage requirement

A Task #69 job can be built only when all of the following align exactly:

- canonical Task #67 source identity
- canonical Task #67 refresh-plan identity
- exactly one selected refresh-plan item matching that source and signal type
- canonical Task #68 request identity
- Task #68 request source ID/fingerprint/class
- collection-mode descriptor
- market fingerprint
- category fingerprint
- signal type
- refresh-plan ID/fingerprint

Unlike Task #68, where refresh-plan lineage can be omitted for general normalization use, Task #69 requires non-null Task #67 plan lineage because a future collection job must have a traceable planning origin.

## Source identity verification

Task #69 reconstructs the Task #67 source descriptor through the canonical Task #67 normalizer and requires the resulting source ID/fingerprint to match the supplied descriptor.

This prevents a caller from changing source quality, provenance, coverage, collection mode, trust class, or other material source metadata while retaining an old source fingerprint.

## Refresh-plan identity verification

Task #69 independently recomputes the canonical Task #67 refresh-plan fingerprint from:

- generated time
- market/category scope
- requested signal types
- bounded budget
- selected minimized refresh items
- deferred minimized refresh items
- blockers

The recomputed fingerprint and derived `srp-...` plan ID must match the supplied Task #67 plan.

Task #67 safety markers are also checked exactly and must remain closed.

## Task #68 request identity verification

Task #69 independently recomputes the Task #68 request fingerprint using the same identity fields:

- source ID/fingerprint/class
- descriptive collection mode
- market fingerprint
- category fingerprint
- signal type
- plan ID/fingerprint

The recomputed fingerprint and derived `sar-...` request ID must match the supplied request. Task #68 safety markers must also match the canonical closed capability object exactly.

## Collection-job packet

A valid packet contains scalar one-scope fields only:

- version
- job ID/fingerprint
- replay ID/fingerprint
- created-at
- expires-at
- TTL minutes
- lifecycle `proposed`
- source ID/fingerprint/class
- descriptive collection mode
- market fingerprint
- category fingerprint
- signal type
- Task #67 plan ID/fingerprint
- Task #68 request ID/fingerprint
- exact future authorization string
- immutable closed safety markers

There is no target list, source list, signal list, credential payload, provider request, or transport object in the packet.

## TTL and expiry

Task #69 uses a bounded authorization-preparation window:

- default TTL: 30 minutes
- hard maximum TTL: 60 minutes
- minimum TTL: 1 minute

`createdAt`, `expiresAt`, and TTL are all covered by deterministic identity.

Preflight at or after `expiresAt` returns `expired` and `authorizationEligible=false`.

A preflight timestamp before packet creation fails closed.

## Replay identity

Task #69 creates a deterministic replay identity from:

- source fingerprint
- Task #67 plan fingerprint
- Task #68 request fingerprint
- market/category/signal scope
- created-at
- expires-at

The replay identity is descriptive only. Task #69 does not reserve a durable job, write a replay lock, consume authorization, or touch the database.

A future execution foundation must add its own durable single-use reservation before any live request is permitted.

## Exact future authorization

The authorization family is:

`AUTHORIZE_SIGNAL_COLLECTION_JOB:<jobId>:<jobFingerprint>`

The string is derived from the deterministic packet identity and independently verified during preflight.

Task #69 may report `authorization_ready`, but that means only that the packet is internally consistent and unexpired.

It does **not** mean:

- authorization was consumed
- credentials may be used
- transport may run
- network collection is authorized
- evidence may be persisted
- a job may be durably reserved
- any route may execute

## Preflight behavior

Preflight independently validates:

1. packet version / ID shapes
2. packet lifecycle
3. TTL arithmetic
4. Task #67 source identity
5. Task #67 plan identity and closed safety markers
6. Task #68 request identity and closed safety markers
7. exact source/plan/request/scope lineage
8. packet closed safety markers
9. replay fingerprint / ID
10. job fingerprint / ID
11. exact authorization text
12. current-time relation to created-at / expiry

Any material tamper fails closed before authorization readiness.

## Safety invariants

Task #69 capability remains planning/authorization-contract only:

- credential use authorized: false
- credential mutation authorized: false
- transport execution authorized: false
- network collection authorized: false
- provider enrollment authorized: false
- observation persistence authorized: false
- evidence persistence authorized: false
- durable job reservation authorized: false
- target configuration mutation authorized: false
- scheduler enabled: false
- batch executor enabled: false
- autonomous worker enabled: false
- retry loop enabled: false
- Task #64 execution authorized: false
- provider writes: false
- public-site writes: false
- authorization consumed: false
- execution route invoked: false
- automatic transition: false
- schema mutation required: false

## No runtime side effects

Task #69 adds no:

- API route
- DNS/HTTP/API call
- provider connector
- API key or OAuth scope
- database table or migration
- durable job row
- evidence/observation persistence
- target registration/configuration
- scheduler
- batch executor
- worker
- retry loop
- Task #64 execution
- Task #53/#54 execution
- provider/public-site write
- publication requirement

## Next boundary

After Task #69 is certified, the next milestone should still avoid general autonomous collection. A suitable next step is a **controlled single-job collection execution foundation** with a default-off gate, durable replay lock, strict credential/provider policy, bounded transport, and zero automatic persistence unless separately authorized.

That future task would require a new explicit architecture and authorization boundary before any real keyword/trend/SERP/provider request occurs.
