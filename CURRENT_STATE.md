# SEO ENGINE — Current State Checkpoint

This file is the authoritative **mutable checkpoint** for resuming work. If it conflicts with older mutable release wording in `PROJECT_HANDOFF.md`, use this file for the current release position and `PROJECT_HANDOFF.md` for historical/architectural context.

## Current production application release

The currently published production application remains the certified Task #65 application bundle:

- Task #65: **One-Target Pilot Preparation & Authorization Packet Foundation v1**
- Issue: #93
- PR: #94
- exact tested PR head: `e90295abf49003deae7801081da0bbbb548991bc`
- certified application source: `1f2a2a9cefd07676b0569b93401bd116ff995fa4`
- certified application tree: `33b049d3bc35acaaef508db3432aabd8b2522de8`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- production URL: `https://dsseoengine.replit.app`

GitHub `main` and the Replit workspace contain newer engineering/docs commits. Do **not** treat those newer Git SHAs as newer published runtime bundles unless a later explicit publication is separately certified.

## First real competitor pilot — completed and restored

The first real one-target competitor dry-run completed successfully against Triple Traders:

- target: `https://tripletraders.com/collections/fragrance`
- category: fragrance / Arabian fragrance
- intended market: United States / English
- pilot ID: `cpr-073e715d5661b885292142cf`
- pilot fingerprint: `073e715d5661b885292142cf49de5a9fb6b37caad906c4a31315e1be7279bad8`
- deterministic Task #64 job ID: `799e8813-6769-5a62-b64f-aec0e03762ff`

Certified result:

- exactly 1 production Task #64 job
- completed/terminal/replay-locked
- attempts: 1
- exact target receipts: 1
- redirects: 0
- raw competitor body retained: false
- competitor evidence persisted: 0
- configured competitor targets: 0
- target configuration mutation: false
- provider/public-site writes: none
- no automatic transition
- no second Task #64 job or second Triple Traders request observed
- temporary Task #64 execution gate restored to false after the pilot

Detailed closeout: `.agents/memory/first-live-competitor-pilot-closeout.md`.

## Competitor-intelligence control chain through Task #65

Tasks #58-#65 plus the first live pilot form a proven bounded chain:

- Task #58: normalized competitor evidence contract/read projection
- Task #59: bounded acquisition/persistence foundation, default-off
- Task #60: competitor discovery/planning foundation
- Task #61: controlled target-registration/preflight foundation
- Task #62: hardened outbound transport with DNS-rebinding/SSRF protections
- Task #63: one-target pilot readiness + exact authorization contract
- Task #64: durable single-use one-target dry-run execution foundation
- Task #65: one-target pilot preparation + dual authorization packet
- first live pilot: exactly one real external request, zero persistence/mutation, replay lock proven, gate restored

## Market/category intelligence engineering chain

The newer **unpublished** engineering chain is now:

`Task #66 market/category identities + opportunity synthesis`

→ `Task #67 source registry + refresh planning`

→ `Task #68 adapter request + supplied-result normalization`

→ `Task #69 collection-job planning + exact future authorization`

No Task #66-#69 work has been separately published.

### Task #66 — engineering complete

**Market-Aware Category Competitor, Trend & Keyword Intelligence Architecture v1**

- Issue #96
- PR #99
- exact tested head: `01a00a6757a6c5355824e39b8b4d0730c4712557`
- merge: `47105c6a2667edc37aece69307c001d535ea5c4a`
- tree: `0521dff83b1805782a541af646421e23eb76a504`
- PR CI #191: success
- post-merge CI #193: success
- no publication

Task #66 established deterministic market/category identity, first-party vs external signal separation, category-specific competitor relevance, and advisory trend/keyword opportunity synthesis.

Detailed closeout: `.agents/memory/task66-engineering-closeout.md`.

### Task #67 — engineering complete

**Market/Category Signal Source Registry & Refresh Planning Foundation v1**

- Issue #101
- PR #102
- exact tested head: `d5207bbe17f3c9b277addc3d524dcd38256da5fc`
- merge: `444b22747ea537735e4778f6fd63bb39919f6a67`
- tree: `09cf5eaa76a2ea422600c904ee2f0a85c54754df`
- corrected PR CI #197: success
- post-merge CI #198: success
- no publication

Task #67 established reviewed source descriptors, market/category/signal coverage, freshness state, volatility-aware urgency, bounded refresh budgets, selected/deferred items, and deterministic refresh-plan identity. It performs zero collection.

Detailed closeout: `.agents/memory/task67-engineering-closeout.md`.

### Task #68 — engineering complete

**Source Adapter Contract & Signal Observation Normalization Foundation v1**

Canonical implementation:

- Issue #104
- PR #105
- exact tested head: `73de8511cc86c421108d587171a8fba5d1e608f7`
- merge: `0f1371e0cfdd1678bb9ff78bc0bc54abec49caec`
- tree: `43b1b1a1948212ddd9d319e3e465698e06e1d124`
- corrected PR CI #202: success
- post-merge CI #203: success
- no publication

Task #68 established deterministic Task #67 refresh-item adapter requests, strict supplied-result normalization, `success|empty|partial|error` semantics, bounded metrics, raw/unknown payload rejection, observation identities, duplicate/conflict handling, and bounded observation batches.

Duplicate Task #68 work created from stale checkpoints was closed without merge, including PR #107 and issue #111 / PR #112. Canonical Task #68 remains issue #104 / PR #105 only.

Detailed closeout: `.agents/memory/task68-engineering-closeout.md`.

### Task #69 — engineering complete

**Signal Collection Job Planning & Authorization Foundation v1**

Canonical engineering release:

- Issue: #109
- PR: #110
- exact tested PR head: `63995d86e2a8c2a03b7b574fe924c02be7f39e8f`
- PR CI #207: success
- merged GitHub main: `e1b6264c4d14376bbe65a568b5483f6d752fcb56`
- merged tree: `3f391a4de591181d1e9c72b9396a5d88019e2edd`
- post-merge main CI #208: success
- Replit engineering sync: exact same SHA/tree
- Replit ahead/behind: `0/0`
- Replit tracked/untracked: `0/0`
- Replit working tree: clean
- publication/redeploy: **not performed**

Task #69 added exactly three files:

1. `artifacts/api-server/src/lib/signal-collection-job-planning.ts`
2. `artifacts/api-server/src/lib/signal-collection-job-planning.test.ts`
3. `docs/task69-signal-collection-job-planning-authorization.md`

No existing route, provider connector, schema, migration, environment/configuration, target configuration, scheduler, worker, execution path, or production persistence path was modified.

Task #69 composes exact Task #67 refresh-plan lineage and Task #68 `SourceAdapterRequest` identity into one scalar proposed collection-job packet:

- one source
- one market
- one category
- one signal type
- exact Task #67 plan ID/fingerprint
- exact Task #68 request ID/fingerprint
- deterministic job ID/fingerprint
- deterministic replay ID/fingerprint
- created-at / expires-at
- TTL default 30 minutes, bounded 1-60 minutes
- lifecycle `proposed`
- closed safety markers

Exact future authorization family:

`AUTHORIZE_SIGNAL_COLLECTION_JOB:<jobId>:<jobFingerprint>`

Task #69 only generates and validates this text. `authorization_ready` does **not** mean authorization was consumed and does not permit credentials, transport, network collection, persistence, durable reservation, scheduler activity, or route execution.

Task #69 independently validates source identity, refresh-plan identity/safety, exactly one matching selected refresh item, Task #68 request identity/safety, exact market/category/signal lineage, TTL/expiry, replay identity, job identity, and authorization text. Tamper/stale/expired inputs fail closed.

Detailed closeout: `.agents/memory/task69-engineering-closeout.md`.

## Product direction

The final product requirement remains:

SEO ENGINE must discover, maintain, and re-score relevant competitors **separately for each Diamond Shelf category and selected market**, monitor keyword/query demand and trend velocity, compare SERP/entity/GEO/AIO evidence, detect gaps, generate evidence-backed opportunities, and eventually act through the existing bounded authorization/verification/rollback/measurement framework.

Target long-term loop:

1. observe selected markets
2. refresh first-party and approved external signals
3. discover/re-score category competitors
4. normalize evidence
5. detect category/keyword/trend/SERP/entity gaps
6. synthesize/rank opportunities
7. generate bounded proposals
8. authorize through policy/human gates as required
9. execute through controlled connectors
10. verify and measure
11. retain/adjust/rollback
12. feed measured outcomes back into ranking

Observation may eventually become autonomous. Mutation must remain separately gated and auditable.

## Current safety state

Unless separately and explicitly authorized:

- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- `COMPETITOR_COLLECTION_ENABLED=false`
- `COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED=false`
- `COMPETITOR_ONE_TARGET_DRY_RUN_EXECUTION_ENABLED` effective false
- configured competitor targets = 0
- Task #61 active registration/config mutation inactive
- no autonomous competitor discovery/collection worker
- no competitor scheduler/batch/retry loop
- no Task #53 execution
- no Task #54 preflight/apply
- no production DB DDL
- no secret/credential/OAuth-scope changes

Task #69 capability specifically remains:

- planning/authorization-contract only: true
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

Sanitized Replit verification after Task #69 engineering sync confirmed:

- Task #64 one-target dry-run execution gate: false
- configured competitor targets: 0
- Task #59 collection gate: false
- Task #59 evidence persistence gate: false
- public-site write gate: false
- no publish/redeploy during verification
- no state modification during verification

## Persistent Task #54 remains separately gated

The previously diagnosed possible first persistent candidate remains Unisex Fragrance:

- Plan: `b4c6eb99-0974-4ea9-a8b7-4ea897a06a56`
- Proposal: `7404c9c7-0cf3-4577-906e-2a39d0e9e925`
- URL: `https://diamondshelf.us/collections/unisex-fragrance`
- field: `meta_description`
- diagnosed current value: `null`
- proposal fingerprint: `5fb1652af8767ecf415520d9144221d7793aa35be27c86c2179ae15399e3849d`
- evaluator risk: medium
- lifecycle at diagnosis: approval_ready
- approvals/actions/deployments at diagnosis: `0 / 0 / 0`

Tasks #56-#69 do not approve or authorize it.

## Next safe milestone — Task #70

Recommended next milestone:

**Task #70 — Controlled Single-Job Signal Collection Execution Foundation v1**

Goal: add the smallest auditable execution bridge that can eventually consume one exact Task #69 authorization and run one bounded source-read job, while remaining default-off and performing no live source request during engineering/CI.

Safe Task #70 scope under generic `continue`:

- dedicated default-off execution capability gate
- exact Task #69 authorization-consumption validation
- deterministic durable single-use reservation/claim/terminal-state design, preferably reusing existing job infrastructure without production DDL
- strict one-job / one-source / one-market / one-category / one-signal semantics
- adapter/credential capability checks as policy/descriptors only during engineering
- bounded receipt/result contract compatible with Task #68 normalization
- zero automatic observation/evidence persistence by default
- replay/stale/tamper fail-closed behavior
- authenticated/admin + CSRF-protected route design if a route is introduced
- deterministic network-free tests
- no live source request during engineering or CI

Generic `continue` still does **not** authorize:

- enabling a Task #70 execution gate
- any real keyword/trend/SERP/provider/competitor DNS/HTTP/API request
- provider enrollment
- credentials/API-key/OAuth use or mutation
- signal/observation/evidence persistence
- active target configuration
- scheduler/batch executor/worker/retry-loop activation
- production DB DDL
- provider/public-site writes
- Task #53/#54 execution
- Task #64 gate enablement or another competitor pilot
- publication/redeploy

Any first real signal-collection run must require separate explicit authorization after Task #70 is implemented, separately published, and production-certified.

## Resume rule

At the beginning of a new chat, resolve current GitHub `main` SHA/tree first, then read:

1. `CURRENT_STATE.md`
2. `AGENTS.md`
3. `PROJECT_HANDOFF.md`
4. `ARCHITECTURE.md`
5. `.agents/skills/seo-engine-project/SKILL.md`
6. `.agents/memory/MEMORY.md`
7. relevant linked memory notes

Stop rather than improvise on schema mismatch, missing auth objects, unexpectedly open write/AI/competitor/Task #53/#54/#64 gates, unexplained Replit drift, failed validation, or unexpected external/provider/public-site mutation activity.
