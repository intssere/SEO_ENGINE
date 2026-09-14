# Task #69 — Engineering Closeout

Task #69 — **Signal Collection Job Planning & Authorization Foundation v1** — is implemented, merged, CI-certified, and synchronized to the Replit workspace without publication.

## Canonical engineering release

- Issue: #109
- PR: #110
- exact tested PR head: `63995d86e2a8c2a03b7b574fe924c02be7f39e8f`
- PR CI #207: success
- merged GitHub main: `e1b6264c4d14376bbe65a568b5483f6d752fcb56`
- merged tree: `3f391a4de591181d1e9c72b9396a5d88019e2edd`
- post-merge main CI #208: success
- Replit workspace after engineering sync: exact same SHA/tree
- Replit ahead/behind: `0/0`
- Replit tracked/untracked: `0/0`
- Replit working tree: clean
- publication/redeploy: **not performed**

## Files added

Task #69 added exactly three files:

1. `artifacts/api-server/src/lib/signal-collection-job-planning.ts`
2. `artifacts/api-server/src/lib/signal-collection-job-planning.test.ts`
3. `docs/task69-signal-collection-job-planning-authorization.md`

No existing route, provider connector, schema, migration, environment/configuration, target configuration, scheduler, worker, execution path, or production persistence path was modified.

## Control-plane role

Task #69 composes the existing pure chain:

`Task #66 market/category/signal identity`

→ `Task #67 source registry + selected refresh-plan lineage`

→ `Task #68 SourceAdapterRequest identity`

→ `Task #69 proposed collection-job packet + exact future authorization/preflight`

Task #69 stops before collection execution.

## Collection-job packet

A Task #69 packet contains one scalar scope only:

- one source
- one market
- one category
- one signal type
- exact Task #67 plan ID/fingerprint
- exact Task #68 request ID/fingerprint
- created-at / expires-at
- bounded TTL
- deterministic job ID/fingerprint
- deterministic replay ID/fingerprint
- lifecycle `proposed`
- exact future authorization text
- closed safety markers

Job IDs use prefix `scj-` and replay identities use prefix `scr-`.

## TTL

- default TTL: 30 minutes
- minimum: 1 minute
- maximum: 60 minutes
- expiry is included in deterministic identity
- preflight at or after expiry returns `expired` and `authorizationEligible=false`
- preflight before packet creation fails closed

## Exact authorization contract

Task #69 defines:

`AUTHORIZE_SIGNAL_COLLECTION_JOB:<jobId>:<jobFingerprint>`

Task #69 only **generates and validates** this string.

`authorization_ready` means only that the packet is internally consistent and unexpired. It does **not** mean authorization was consumed and it does not permit credentials, transport, network collection, persistence, durable job reservation, scheduler activity, or route execution.

## Independent lineage verification

Task #69 preflight independently verifies:

- Task #67 source identity by rebuilding the source through the canonical normalizer
- Task #67 refresh-plan ID/fingerprint and closed safety markers
- exactly one selected refresh item matching source + signal
- Task #68 request ID/fingerprint and closed safety markers
- exact source/market/category/signal/plan/request lineage
- packet lifecycle and TTL arithmetic
- packet safety markers
- replay identity
- job identity
- exact authorization text
- expiry

Task #68 requests without exact non-null Task #67 plan lineage cannot become Task #69 jobs.

## Replay semantics

Task #69 creates a deterministic replay identity, but this is descriptive only.

It does **not** create:

- a durable database reservation
- a replay-lock row
- a consumed authorization record
- an execution job row

A future live execution foundation must add durable single-use reservation/claim semantics before any real source request is allowed.

## Safety certification

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

Sanitized Replit verification after the Task #69 engineering sync confirmed:

- Task #64 one-target dry-run execution gate: false
- configured competitor targets: 0
- Task #59 collection gate: false
- Task #59 evidence-persistence gate: false
- public-site write gate: false
- no publish/redeploy during verification
- no state modification during verification

## Runtime distinction

The currently published production application remains the certified Task #65 application bundle. Tasks #66-#69 are newer GitHub/Replit engineering foundations and have not been separately published.

## Next engineering boundary

Recommended next milestone:

**Task #70 — Controlled Single-Job Signal Collection Execution Foundation v1**

The safe generic-`continue` portion of Task #70 should be limited to engineering a default-off execution foundation and deterministic/network-free tests, such as:

- a dedicated default-off execution capability gate
- durable single-use job reservation/claim/terminal state design
- exact Task #69 authorization-consumption contract
- provider/credential capability policy as descriptors/checks only
- bounded single-job execution interface
- strict zero-automatic-persistence default
- normalized Task #68 result handoff contract
- audit/receipt shapes
- fail-closed replay/stale/tamper behavior

Generic `continue` must **not** enable the gate, enroll a provider, add/change credentials or OAuth scopes, perform a real keyword/trend/SERP/provider/competitor request, persist observations/evidence, activate a scheduler/worker/batch/retry loop, perform production DB DDL, publish/redeploy, or make provider/public-site writes.

Any first real signal-collection run must require separate explicit authorization after the execution foundation is implemented, published, and production-certified.