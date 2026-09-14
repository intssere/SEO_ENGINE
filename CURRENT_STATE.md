# SEO ENGINE — Current State Checkpoint

This file is the authoritative **mutable checkpoint** for resuming work. Always independently resolve the current GitHub `main` SHA/tree before relying on any recorded SHA here. Current GitHub code is implementation truth; `AGENTS.md` remains the durable operating contract.

## Current published production application

Production still serves the certified **Task #65 — One-Target Pilot Preparation & Authorization Packet Foundation v1** application bundle.

- certified application source: `1f2a2a9cefd07676b0569b93401bd116ff995fa4`
- certified application tree: `33b049d3bc35acaaef508db3432aabd8b2522de8`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- production URL: `https://dsseoengine.replit.app`

Tasks #66-#70 are newer GitHub/Replit engineering foundations and have **not** been separately published. Do not confuse current repository/workspace HEAD with the published runtime bundle.

## Canonical engineering checkpoint — Task #70 complete

Task #70 — **Controlled Single-Job Signal Collection Execution Foundation v1** — is engineering-complete, merged, CI-certified, and synchronized to Replit without publication.

Canonical release:

- issue: #114
- PR: #116
- exact tested PR head: `44d970ded1697e7ecb2e8c9d527b1eee2cad93ed`
- PR CI #213: success
- merged GitHub `main`: `1a9ad06049249def4b0c105bebaea1c1c76be7ca`
- merged tree: `9dec59db23fde87f18916e7ff2d1aa2f40263e07`
- post-merge main CI #214: success

Latest independently verified Replit workspace state before this docs closeout:

- branch: `main`
- HEAD: `1a9ad06049249def4b0c105bebaea1c1c76be7ca`
- tree: `9dec59db23fde87f18916e7ff2d1aa2f40263e07`
- cached `origin/main`: same SHA
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree: clean
- publication/redeploy: **not performed**

Detailed closeout: `.agents/memory/task70-engineering-closeout.md`.

## Task #70 execution boundary

Task #70 is the smallest durable execution bridge between an exact Task #69 authorization packet and a future source-specific read runner.

Control chain:

`Task #66 market/category identity`

→ `Task #67 source registry + refresh plan`

→ `Task #68 adapter request + supplied-result normalization`

→ `Task #69 exact expiring collection-job packet + authorization`

→ `Task #70 default-off durable single-job execution`

Dedicated runtime gate:

`SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED`

Exact Task #69 authorization family:

`AUTHORIZE_SIGNAL_COLLECTION_JOB:<jobId>:<jobFingerprint>`

The gate alone is never authorization.

Each Task #70 execution is strictly one Task #69 job, one source, one market, one category, one signal type, one Task #68 request, one runner invocation, and one deterministic durable execution identity.

Task #70 reuses the existing `jobs` table with job type `signal_collection_single_job_v1` and lifecycle `pending -> active -> completed|failed`. Existing exact identity is replay-locked; identity collision fails closed. No migration or production DDL was required.

API surface in engineering code:

- `GET /api/signal-collection-execution/capability`
- `POST /api/signal-collection-execution/run`

Both require authenticated admin role. Unsafe POST remains under the existing authenticated-session, CSRF, and mutation-rate-limit controls.

## Task #70 runner and persistence state

The production/default runner is intentionally:

- configured: false
- credential ready: false
- network ready: false

Engineering/CI used only deterministic fake/in-memory runners and stores. No live source/provider/competitor request occurred.

Task #70 does not persist normalized observations or competitor evidence. Durable receipts retain only bounded normalized metadata/fingerprints and do not retain raw provider bodies, headers, cookies, tokens, API keys, OAuth credentials, or arbitrary runner error text.

Task #70 introduced no scheduler, batch executor, autonomous worker, or retry loop.

## Current sanitized safety state

Latest verified Replit state:

- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `COMPETITOR_ONE_TARGET_DRY_RUN_EXECUTION_ENABLED=false`
- `COMPETITOR_COLLECTION_ENABLED=false`
- `COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED=false`
- `PUBLIC_SITE_WRITES_ENABLED=false`
- configured competitor targets: `0`
- Task #70 scheduler enabled: false
- Task #70 batch executor enabled: false
- Task #70 autonomous worker enabled: false
- Task #70 retry loop enabled: false
- production/default Task #70 runner configured: false
- production/default Task #70 credential ready: false
- production/default Task #70 network ready: false

Unless separately and explicitly authorized:

- `AI_PROPOSAL_GENERATION_ENABLED=false`
- no Task #53 execution
- no Task #54 preflight/apply
- no Task #64 live execution
- no Task #70 live execution
- no real signal-source collection
- no observation/evidence persistence
- no provider enrollment
- no credential/API-key/OAuth use or mutation
- no production DB DDL
- no target configuration mutation
- no scheduler/batch/worker/retry loop activation
- no provider/public-site writes
- no approval-to-execution automatic transition

A merged PR, admin login, enabled capability gate, or generic `continue` is not authorization for these boundaries.

## Market/category intelligence engineering chain

### Task #66 — Market-Aware Category Competitor, Trend & Keyword Intelligence Architecture v1

- issue #96 / PR #99
- tested head: `01a00a6757a6c5355824e39b8b4d0730c4712557`
- merge: `47105c6a2667edc37aece69307c001d535ea5c4a`
- tree: `0521dff83b1805782a541af646421e23eb76a504`
- PR CI #191 / main CI #193: success
- no publication

### Task #67 — Signal Source Registry & Refresh Planning Foundation v1

- issue #101 / PR #102
- tested head: `d5207bbe17f3c9b277addc3d524dcd38256da5fc`
- merge: `444b22747ea537735e4778f6fd63bb39919f6a67`
- tree: `09cf5eaa76a2ea422600c904ee2f0a85c54754df`
- corrected PR CI #197 / main CI #198: success
- no publication

### Task #68 — Source Adapter Contract & Signal Observation Normalization Foundation v1

- issue #104 / PR #105
- tested head: `73de8511cc86c421108d587171a8fba5d1e608f7`
- merge: `0f1371e0cfdd1678bb9ff78bc0bc54abec49caec`
- tree: `43b1b1a1948212ddd9d319e3e465698e06e1d124`
- corrected PR CI #202 / main CI #203: success
- no publication

### Task #69 — Signal Collection Job Planning & Authorization Foundation v1

- issue #109 / PR #110
- tested head: `63995d86e2a8c2a03b7b574fe924c02be7f39e8f`
- merge: `e1b6264c4d14376bbe65a568b5483f6d752fcb56`
- tree: `3f391a4de591181d1e9c72b9396a5d88019e2edd`
- PR CI #207 / main CI #208: success
- no publication

### Task #70 — Controlled Single-Job Signal Collection Execution Foundation v1

- issue #114 / PR #116
- tested head: `44d970ded1697e7ecb2e8c9d527b1eee2cad93ed`
- merge: `1a9ad06049249def4b0c105bebaea1c1c76be7ca`
- tree: `9dec59db23fde87f18916e7ff2d1aa2f40263e07`
- PR CI #213 / main CI #214: success
- Replit exact engineering sync complete
- no publication
- no real source request
- no observation/evidence persistence
- no production DDL

## First real competitor pilot — historical completed proof

The first real one-target competitor dry-run against `https://tripletraders.com/collections/fragrance` remains completed and restored:

- pilot ID: `cpr-073e715d5661b885292142cf`
- fingerprint: `073e715d5661b885292142cf49de5a9fb6b37caad906c4a31315e1be7279bad8`
- Task #64 job: `799e8813-6769-5a62-b64f-aec0e03762ff`
- exactly one production job/attempt/receipt
- completed/terminal/replay-locked
- redirects: 0
- raw competitor body retained: false
- evidence persisted: 0
- configured competitor targets: 0
- no provider/public-site mutation
- temporary Task #64 gate restored false

Detailed closeout: `.agents/memory/first-live-competitor-pilot-closeout.md`.

## Persistent Task #54 remains separately gated

The previously diagnosed possible first persistent candidate remains Unisex Fragrance:

- plan: `b4c6eb99-0974-4ea9-a8b7-4ea897a06a56`
- proposal: `7404c9c7-0cf3-4577-906e-2a39d0e9e925`
- URL: `https://diamondshelf.us/collections/unisex-fragrance`
- field: `meta_description`
- diagnosed current value: `null`
- proposal fingerprint: `5fb1652af8767ecf415520d9144221d7793aa35be27c86c2179ae15399e3849d`
- evaluator risk: medium
- lifecycle at diagnosis: `approval_ready`
- approvals/actions/deployments at diagnosis: `0 / 0 / 0`

Tasks #56-#70 do not approve or authorize it.

## Product direction

SEO ENGINE must become an autonomous-observation + controlled-action SEO/GEO/AIO operating system for Diamond Shelf that reasons separately by category × selected market; continuously gathers first-party and approved external evidence; discovers/re-scores competitors; monitors trends/keywords/SERPs/entities/GEO/AIO; ranks evidence-backed opportunities; creates bounded proposals; executes mutations only through explicit governance; verifies and measures every action; and learns from measured outcomes without weakening safety controls.

Core loop:

`Observe -> Refresh -> Discover/Re-score -> Normalize -> Detect Gaps -> Rank -> Propose -> Authorize -> Execute -> Verify -> Measure -> Learn`

Observation may eventually become autonomous. Mutation remains separately gated, auditable, reversible, and measurable.

## Next safe milestone — Task #70 prepublication certification

After this docs-only closeout is merged and exact-synced to Replit, the next safe phase is **read-only Task #70 prepublication certification**.

Safe work under generic `continue` may include:

- independently resolving the new GitHub `main` SHA/tree
- verifying the docs-only diff/merge/CI
- exact docs-only Replit sync
- confirming Replit `0/0` and clean
- read-only inspection of build/runtime prerequisites
- confirming dev/prod schema parity without DDL
- confirming auth objects and sanitized safety gates
- confirming production still serves Task #65
- preparing a bounded publication authorization packet

Generic `continue` does **not** authorize publication/redeploy.

Publication of Task #70 requires separate explicit authorization. Any later real signal-source execution additionally requires a separately reviewed source-specific runner/provider boundary, fresh Task #67/#68/#69 lineage, exact Task #69 authorization, and any separately authorized temporary Task #70 gate deployment. Observation/evidence persistence remains a separate boundary.

## Resume rule

At the beginning of every new chat/session:

1. independently resolve current GitHub `main` SHA/tree
2. read `CURRENT_STATE.md`
3. read `AGENTS.md`
4. read `PROJECT_HANDOFF.md`
5. read `ARCHITECTURE.md`
6. read `.agents/skills/seo-engine-project/SKILL.md`
7. read `.agents/memory/MEMORY.md` and relevant linked memory notes
8. read the active task issue/PR/task-specific architecture doc
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before sync/publish

Stop and diagnose read-only rather than improvising on unknown GitHub changes, Replit drift, unexpectedly open execution/write gates, nonzero targets, unknown runner/credential state, schema mismatch, missing auth objects, failed CI, unexpected DB/job/evidence deltas, or unexpected external/provider/public-site activity.
