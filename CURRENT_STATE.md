# SEO ENGINE — Current State Checkpoint

This file is the authoritative **mutable checkpoint** for resuming work. Always independently resolve the current GitHub `main` SHA/tree before relying on any recorded SHA here. Current GitHub code is implementation truth; `AGENTS.md` remains the durable operating contract.

## Current published production application

The currently published production application remains the certified **Task #70 — Controlled Single-Job Signal Collection Execution Foundation v1** release.

Published production record:

- GitHub source SHA: `d43629dc8b4c50bff1088fad6c74c15825ee0373`
- Git tree: `9b5cc9b2e1153cba82f13859829544cff7581127`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- production URL: `https://dsseoengine.replit.app`
- deployment type: autoscale
- last certified deployment status: success

Detailed production record: `.agents/memory/task70-production-closeout.md`.

Task #71 has **not** been published or redeployed as part of engineering closeout.

## Task #71 engineering release

Task #71 — **Google Search Console Read-Only Runner Foundation v1** — is implemented, merged, CI-certified, and synchronized exactly to the Replit workspace without publication.

Engineering lineage:

- issue: #119 — completed
- PR: #120
- exact tested PR head: `c8788667f77ff028c8f950c233c80a1dbca524b1`
- PR CI #219: success
- engineering merge: `abb62e1a95840b0e4b5a4bee63c9440c3d458e1a`
- engineering tree: `40c9cf3729e4b7c35c2d4d147f315e977a8b3d39`
- post-merge main CI #220: success

Engineering changed exactly three additive files: the source-specific runner foundation, deterministic tests, and Task #71 architecture/safety documentation. No existing Task #70 route, auth path, runtime gate, schema/migration, environment configuration, target configuration, provider write path, public-site write path, or deployment configuration was modified.

Detailed engineering closeout: `.agents/memory/task71-engineering-closeout.md`.

## Replit engineering workspace

After the Task #71 engineering merge, Git-only synchronization was performed without publication or runtime mutation.

Read-only verification confirmed:

- branch: `main`
- HEAD: `abb62e1a95840b0e4b5a4bee63c9440c3d458e1a`
- tree: `40c9cf3729e4b7c35c2d4d147f315e977a8b3d39`
- cached `origin/main`: same SHA
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree: clean
- new local commit beyond canonical main: false

The synchronization and inspection did not publish/redeploy, mutate environment/database/credentials/targets/provider/public-site state, or make any live provider/competitor request.

After this docs-only closeout merges, re-resolve GitHub/Replit SHA/tree rather than assuming the engineering SHA remains current.

## Intelligence and execution chain

The implemented control chain is now:

`Task #66 market/category identity`

→ `Task #67 reviewed signal-source registry + bounded refresh planning`

→ `Task #68 adapter request + bounded supplied-result normalization`

→ `Task #69 exact expiring collection-job packet + fingerprint-bound authorization`

→ `Task #70 default-off durable single-job execution + replay lock`

→ `Task #71 default-off Google Search Console Search Analytics runner foundation`

Task #71 does not create an alternate execution path. Task #70 remains authoritative for the runtime gate, exact Task #69 authorization consumption, durable reservation/claim, one runner invocation, terminal receipt, and replay rejection.

## Task #71 source-specific boundary

The selected first source-specific runner foundation is Google Search Console Search Analytics.

The reviewed v1 source identity is intentionally narrow:

- source key: `google-search-console-search-analytics`
- source class: `first_party`
- trust class: `first_party_authoritative`
- collection mode: `provider_api`
- provenance complete: true
- manually reviewed: true
- supported v1 signal: `keyword`

The only future Google OAuth scope represented is:

`https://www.googleapis.com/auth/webmasters.readonly`

Engineering does **not** create, store, bind, refresh, or use a real OAuth client secret, access token, or refresh token. Existing application/OIDC login is not Search Console API authorization.

Task #71 includes no built-in Google SDK, generic HTTP client, `fetch`, arbitrary URL/method executor, provider endpoint binding, or credential lookup. CI/tests use an injected fake in-memory transport only.

## Task #71 bounded data contract

The engineering foundation models only bounded Search Analytics inputs:

- domain properties: `sc-domain:<domain>`
- dimensions: `query`, `page`
- filter operators: `equals`, `contains`
- date span: maximum 31 days
- filters: maximum 5
- rows per page: maximum 5,000
- pages per job: maximum 2
- modeled rows per job: maximum 10,000
- timeout descriptor: maximum 10 seconds
- aggregate/no-dimension query: one page only

Only bounded numeric evidence crosses Task #68:

- clicks
- impressions
- CTR
- position

Query/page dimension strings and raw provider content are not retained by the Task #68 result.

Conservative status semantics:

- non-empty aggregate/no-dimension response: `success`
- valid zero-row response: `empty`
- dimensional/top-row response: `partial` with `gsc_top_rows_non_exhaustive`
- configured page cap reached: additional `gsc_page_cap_reached`
- modeled provider/transport failure: sanitized `error`

Dimensional/top-row Search Analytics output is never treated as guaranteed exhaustive evidence.

## Current safety state

Last sanitized Replit inspection confirmed:

- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `COMPETITOR_ONE_TARGET_DRY_RUN_EXECUTION_ENABLED=false`
- `COMPETITOR_COLLECTION_ENABLED=false`
- `COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED=false`
- `PUBLIC_SITE_WRITES_ENABLED=false`
- Task #71 configured: false
- Task #71 credentials ready: false
- Task #71 network ready: false
- Task #71 live execution authorized: false
- scheduler enabled: false
- batch executor enabled: false
- autonomous worker enabled: false
- retry loop enabled: false

Task #71 engineering did **not**:

- enable Task #70
- configure or use a real GSC runner/transport
- configure or use a real Search Console credential
- enroll/authorize a Google account or property
- make any live Search Console/provider/competitor request
- execute a production Task #70 job
- persist Task #68 observations/evidence
- mutate competitor/source targets
- enable scheduler/batch/worker/retry behavior
- perform production DDL
- execute Task #53/#54/#64
- write to Diamond Shelf/provider/public-site state
- publish/redeploy

A merged PR, admin login, capability existence, publication, or generic `continue` is not authorization for any live-read or mutation boundary.

## Historical first competitor pilot

The previously authorized one-target Triple Traders Task #64 dry-run remains a completed historical proof:

- target: `https://tripletraders.com/collections/fragrance`
- pilot ID: `cpr-073e715d5661b885292142cf`
- Task #64 job: `799e8813-6769-5a62-b64f-aec0e03762ff`
- exactly one durable completed job
- replay locked
- raw competitor body retained: false
- evidence persisted: 0
- configured competitor targets after restoration: 0
- temporary Task #64 gate restored false
- no provider/public-site mutation

Detailed record: `.agents/memory/first-live-competitor-pilot-closeout.md`.

## Persistent Task #54 remains separately gated

The previously diagnosed Unisex Fragrance candidate remains historical diagnostic context only:

- plan: `b4c6eb99-0974-4ea9-a8b7-4ea897a06a56`
- proposal: `7404c9c7-0cf3-4577-906e-2a39d0e9e925`
- URL: `https://diamondshelf.us/collections/unisex-fragrance`
- field: `meta_description`
- proposal fingerprint: `5fb1652af8767ecf415520d9144221d7793aa35be27c86c2179ae15399e3849d`

Tasks #56-#71 do not approve or authorize this candidate.

## Product direction

SEO ENGINE is intended to become an autonomous-observation + controlled-action SEO/GEO/AIO operating system for Diamond Shelf that reasons separately by category × selected market, continuously gathers approved first-party/external evidence, detects and ranks opportunities, creates bounded proposals, and executes mutations only through explicit governance, verification, measurement, and rollback controls.

Target loop:

`Observe -> Refresh -> Discover/Re-score -> Normalize -> Detect Gaps -> Rank -> Propose -> Authorize -> Execute -> Verify -> Measure -> Learn`

Observation may eventually become automated under separately authorized controls. Mutation remains separately gated, auditable, reversible, and measurable.

## Next safe milestone — Task #71 read-only prepublication certification

After the Task #71 engineering closeout docs PR is exact-head CI-green, merged, post-merge CI-green, and exact-synced to Replit, the next safe phase is **read-only Task #71 prepublication certification**.

Safe certification may verify:

- exact current GitHub/Replit SHA/tree alignment
- `0/0`, clean workspace state
- Task #71 files present in the build/source tree
- PR and post-merge CI lineage
- development/production schema parity without DDL
- existing auth objects/configuration without changing auth
- every Task #70/competitor/public-write gate closed
- Task #71 configured/credential/network/live-execution readiness all false
- no real Search Console credential/provider binding
- no unexpected Task #70 jobs, observation/evidence persistence, external request, or provider/public-site write activity
- currently published production remains the Task #70 certified deployment unless separately changed

Generic `continue` does **not** authorize Task #71 publication/redeploy, OAuth/property binding, a live Search Console request, Task #70 gate enablement/execution, observation/evidence persistence, scheduler/worker activation, DDL, Task #53/#54/#64 execution, or provider/public-site mutation.

Any first real Search Console read requires a separately reviewed provider/property/credential boundary, fresh Task #67 refresh-plan lineage, fresh Task #68 request, fresh Task #69 packet, exact Task #69 authorization, and separately authorized Task #70 gate/deployment behavior where required. Observation/evidence persistence remains a separate authorization boundary.

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

Stop and diagnose read-only rather than improvising on unknown GitHub changes, Replit drift, unexpectedly open execution/write gates, unknown runner/credential state, schema mismatch, missing auth objects, failed CI, unexpected DB/job/evidence deltas, or unexpected external/provider/public-site activity.
