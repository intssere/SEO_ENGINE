# SEO ENGINE — Current State Checkpoint

This file is the authoritative mutable resume checkpoint. Always independently resolve current GitHub `main` SHA/tree before acting. `AGENTS.md` remains the durable operating contract and GitHub `main` remains canonical.

## Published production

The currently published application release remains **Task #71 — Google Search Console Read-Only Runner Foundation v1**.

Published application source:

- SHA: `2ff2b3db1f6204f773aeec0d68b8780dffd7c9db`
- tree: `d352b7c74c2a4e35bcf469a5326a784b8d6783ad`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- URL: `https://dsseoengine.replit.app`
- deployment type: autoscale
- last certified status: success

Task #71 production health/auth certification is recorded in `.agents/memory/task71-production-closeout.md`.

**Tasks #72 and #73 are not published.** Later GitHub/Replit engineering synchronization does not alter the separately attested production application source.

## Current engineering main before these closeout docs

Task #73 engineering merged as:

- issue: #126
- PR: #129
- exact corrected tested head: `0a998bea96f442f00a235086bcada1e8b8f7beeb`
- PR CI #228: success
- merge: `d6a7a4b7cb1f3802e1fd9934b5de72d52a221dd2`
- tree: `d105bf916e15333efef5f7f07fb416e2dcfa4f1b`
- post-merge main CI #229: success

The initial Task #73 PR head `8a4bda45893587078a59e727332159fdcd844125` was not merged because CI #227 exposed a wall-clock-sensitive test fixture. The test timestamps were corrected on the feature branch; the production contract was unchanged. The corrected exact head passed focused tests, full workspace tests, typecheck, and build before merge.

Detailed record: `.agents/memory/task73-engineering-closeout.md`.

## Task #72 foundation

Task #72 — **GSC Read-Only OAuth + Property Binding Foundation v1** — is engineering-complete, merged, and Git-only synchronized but not published.

Canonical Task #72 lineage:

- issue #123 — completed
- PR #125
- exact tested head: `f2cc11785773ce9644bff4effbf61ec5d3b36a1e`
- PR CI #225: success
- merge: `6dd743afd44225ee62a2bfc1944bfd9899170eed`
- tree: `3f29182b109ff181a20d5c42950182b33e9ba1c6`
- post-merge CI #226: success

Task #72 establishes only a GSC-purpose delegated OAuth/property-readiness model:

- profile: `gsc_read_only_v1`
- external account identity: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported v1 property: `sc-domain:<domain>`
- accepted permission levels: `siteRestrictedUser`, `siteFullUser`
- property selection must come from exact discovered-resource membership
- app OIDC/login is not provider OAuth credential material
- no schema migration
- no live Google transport in engineering/tests.

Detailed record: `.agents/memory/task72-engineering-closeout.md`.

## Task #73 pilot-readiness foundation

Task #73 — **GSC First-Live-Read Pilot Readiness v1** — adds the final pure/default-off control layer before any real GSC interaction.

The deterministic pilot packet binds sanitized metadata only:

- purpose `gsc_search_analytics_first_pilot`
- environment
- Google project ID
- public OAuth client ID
- exact redirect URI
- explicit consent mode
- exact Task #72 GSC profile/external identity
- exact `webmasters.readonly` scope
- exact supported selected `sc-domain` property
- accepted permission level
- fresh Task #67 refresh-plan fingerprint
- fresh Task #68 adapter-request fingerprint
- exact Task #69 job ID/fingerprint
- bounded first-pilot query policy
- issued/expiry timestamps
- SHA-256 fingerprint.

The packet contains no client secret, access token, refresh token, authorization header, cookie, raw provider payload, or arbitrary provider response.

### Production packet controls

Production pilot packets fail closed unless:

- redirect URI exactly matches its allowlist
- redirect uses HTTPS
- redirect is not localhost/loopback
- consent mode is explicitly production
- Task #72 GSC-purpose identity is exact
- scope set is exactly `webmasters.readonly`
- selected property is a supported `sc-domain`
- permission level is explicitly accepted
- TTL is at most 30 minutes.

### First pilot query bounds

- one selected `sc-domain` property
- default date range: 7 days
- maximum date range: 31 days
- `query` dimension required
- optional `page` dimension
- maximum 5,000 rows/page
- maximum 2 pages
- no provider write
- no automatic retry
- dimensional/top-row Search Analytics result semantics remain `partial` because Google does not guarantee exhaustive rows.

## Task #73 readiness

`livePilotReady` cannot become true unless all independent controls are true:

1. valid, unexpired Task #73 packet
2. Task #72 configured
3. provider OAuth credential ready
4. exact GSC scope ready
5. GSC property discovery ready
6. selected supported property ready
7. network ready
8. fresh Task #67 lineage
9. fresh Task #68 lineage
10. fresh Task #69 lineage
11. exact Task #69 authorization present
12. Task #70 execution gate separately ready
13. exact first-live-read authorization present
14. no conflicting write/autonomy gate open.

Provider/public-site writes, observation/evidence persistence, scheduler, batch executor, autonomous worker, and retry loop are hard-false in the Task #73 readiness projection.

## Future real-provider stages remain separate

Task #73 defines, but does not execute, these eight future stages:

1. OAuth client/config binding
2. Google OAuth consent
3. GSC `sites.list` discovery
4. exact GSC property selection/binding
5. Task #70 gate/deployment
6. exact Task #69 job authorization
7. first Search Analytics read
8. observation/evidence persistence.

No stage authorizes any later stage.

## Replit engineering synchronization

After Task #73 post-merge CI, Replit was Git-only synchronized and read-only verified at the engineering merge:

- branch: `main`
- HEAD: `d6a7a4b7cb1f3802e1fd9934b5de72d52a221dd2`
- tree: `d105bf916e15333efef5f7f07fb416e2dcfa4f1b`
- cached origin/main: same
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- clean: true
- extra local commit: false

Sanitized gates remained:

- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `COMPETITOR_ONE_TARGET_DRY_RUN_EXECUTION_ENABLED=false`
- `COMPETITOR_COLLECTION_ENABLED=false`
- `COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED=false`
- `PUBLIC_SITE_WRITES_ENABLED=false`

Task #72 readiness remained all false:

- configured=false
- credentialReady=false
- scopeReady=false
- propertyDiscoveryReady=false
- selectedPropertyReady=false
- networkReady=false
- task70ExecutionEnabled=false
- liveReadAuthorized=false

Task #73 default readiness remained closed:

- packetPresent=false
- packetValid=false
- Task #67/#68/#69 lineage readiness=false
- exact Task #69 authorization present=false
- Task #70 execution gate ready=false
- exact first-live-read authorization present=false
- conflictingWriteOrAutonomyGateOpen=false
- `livePilotReady=false`
- provider/public writes=false
- observation/evidence persistence authorization=false
- scheduler/batch/worker/retry=false.

No publication/redeploy, DB/schema/data mutation, credential/OAuth/property mutation, live Google/GSC/provider request, Task #70 execution, observation/evidence persistence, scheduler/batch/worker/retry activation, or provider/public-site mutation occurred.

## Control chain

Current architecture extends the controlled chain as:

`Task #66 market/category identity`

→ `Task #67 reviewed signal-source registry + bounded refresh planning`

→ `Task #68 exact adapter request + supplied-result normalization`

→ `Task #69 exact expiring collection-job packet + fingerprint authorization`

→ `Task #70 default-off durable single-job execution + replay lock`

→ `Task #71 GSC Search Analytics source runner foundation`

→ `Task #72 GSC-only delegated OAuth/property readiness`

→ `Task #73 first-live-read pilot packet/readiness composition`

Task #70 remains authoritative for durable execution and replay protection. Tasks #71–#73 do not create an alternate executor.

## Current authorization boundary

Generic `continue` may cover only pure/default-off engineering, deterministic tests/docs, PR/CI/merge, Git-only Replit synchronization, and read-only certification when the active task explicitly permits it.

It does **not** authorize:

- Task #72/#73 publication/redeploy
- creation/configuration of a real Google OAuth client or client secret
- OAuth consent or consent-screen mutation
- real access/refresh token acquisition, refresh, storage change, or use
- live `sites.list`, property-verification, Search Analytics, or other Google/provider request
- real Search Console property binding or permission mutation
- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=true`
- Task #70 execution
- observation/evidence persistence
- scheduler/batch/worker/retry activation
- production DDL/migration
- Task #53/#54/#64 execution
- provider/public-site mutation.

## Next safe milestone — Task #73 prepublication certification

After these engineering-closeout docs are exact-head CI-green, merged, post-merge CI-green, and Git-only synchronized to Replit, the next safe step is **read-only Task #73 prepublication certification**.

Certification may verify:

- exact current GitHub/Replit SHA/tree and `0/0` clean state
- Task #72/#73 files in the canonical source tree
- PR/post-merge CI lineage
- development/production schema parity without DDL
- auth objects/configuration without auth mutation
- all Task #70/competitor/public-write gates false
- Task #72 and Task #73 readiness fail-closed
- no real credential/property binding
- zero unexpected Task #70/GSC pilot jobs
- no observation/evidence persistence
- no Google/provider/public-site write activity
- production deployment remains the separately published Task #71 release unless separately authorized.

Task #72/#73 publication requires a separate explicit authorization. Any first real Google interaction remains separately staged after publication/certification.

## Resume rule

At every new session:

1. independently resolve GitHub `main` SHA/tree
2. read `CURRENT_STATE.md`
3. read `AGENTS.md`, `PROJECT_HANDOFF.md`, `ARCHITECTURE.md`
4. read `.agents/skills/seo-engine-project/SKILL.md`
5. read `.agents/memory/MEMORY.md` and relevant linked closeouts
6. read the active issue/PR/task-specific architecture doc
7. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before sync/publish

Stop and diagnose read-only rather than improvising on unexpected GitHub changes, Replit drift, open execution/write gates, unknown credentials/readiness, schema mismatch, failed CI, unexpected jobs/persistence, or external/provider/public-site activity.
