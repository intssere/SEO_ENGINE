# SEO ENGINE — Current State Checkpoint

This file is the authoritative mutable resume checkpoint. Always independently resolve current GitHub `main` SHA/tree before acting. `AGENTS.md` remains the durable operating contract and GitHub `main` remains canonical.

## Published production

Task #73 — **GSC First-Live-Read Pilot Readiness v1** — is now published and production-certified on the existing SEO_ENGINE deployment.

Published application source:

- SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- URL: `https://dsseoengine.replit.app`
- deployment status: success

Detailed production record: `.agents/memory/task73-production-closeout.md`.

Task #73 publication did **not** authorize or perform a live Google Search Console interaction, real OAuth/client/token/property binding, Task #70 execution, observation/evidence persistence, scheduler/worker activation, DDL, Task #53/#54/#64 execution, or provider/public-site mutation.

## Task #72/#73 engineering lineage

Task #72 — **GSC Read-Only OAuth + Property Binding Foundation v1**:

- issue #123 — completed
- PR #125
- exact tested head: `f2cc11785773ce9644bff4effbf61ec5d3b36a1e`
- PR CI #225: success
- merge: `6dd743afd44225ee62a2bfc1944bfd9899170eed`
- tree: `3f29182b109ff181a20d5c42950182b33e9ba1c6`
- post-merge CI #226: success

Task #73 — **GSC First-Live-Read Pilot Readiness v1**:

- issue #126 — completed
- engineering PR #129
- exact corrected tested head: `0a998bea96f442f00a235086bcada1e8b8f7beeb`
- PR CI #228: success
- engineering merge: `d6a7a4b7cb1f3802e1fd9934b5de72d52a221dd2`
- engineering tree: `d105bf916e15333efef5f7f07fb416e2dcfa4f1b`
- post-merge CI #229: success
- engineering-closeout docs PR #130
- docs merge / published source: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- published tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- post-merge main CI #231: success

The initial Task #73 PR head `8a4bda45893587078a59e727332159fdcd844125` was not merged because CI #227 exposed a wall-clock-sensitive test fixture. The deterministic test timestamps were corrected without changing the production contract.

Detailed engineering records:

- `.agents/memory/task72-engineering-closeout.md`
- `.agents/memory/task73-engineering-closeout.md`

## GSC control architecture now present in production source

Task #71 provides the bounded Search Analytics runner foundation.

Task #72 adds GSC-purpose delegated OAuth/property-readiness modeling only:

- profile: `gsc_read_only_v1`
- external account identity: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported v1 property: `sc-domain:<domain>`
- accepted permission levels: `siteRestrictedUser`, `siteFullUser`
- property selection must come from exact discovered-resource membership
- application login/OIDC is not provider OAuth material.

Task #73 adds a deterministic first-live-read pilot packet binding sanitized metadata only:

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
- fresh Task #67/#68/#69 lineage
- bounded first-pilot query policy
- issued/expiry timestamps
- deterministic fingerprint/replay identity.

The packet contains no client secret, access token, refresh token, authorization header, cookie, raw provider payload, or arbitrary provider response.

## First-pilot bounds

The first future Search Analytics pilot is bounded to:

- one selected `sc-domain` property
- recommended 7-day date range; Task #71 maximum remains 31 days
- `query` dimension required
- optional `page` dimension
- maximum 5,000 rows/page
- maximum 2 pages
- no provider write
- no automatic retry
- dimensional/top-row results remain `partial` because Google does not guarantee exhaustive rows.

## Runtime/readiness boundary

`livePilotReady` cannot become true unless all independent controls are true:

1. valid, unexpired Task #73 packet
2. Task #72 configured
3. credential ready
4. exact GSC scope ready
5. property discovery ready
6. selected property ready
7. network ready
8. fresh Task #67 lineage
9. fresh Task #68 lineage
10. fresh Task #69 lineage
11. exact Task #69 authorization present
12. Task #70 execution gate separately ready
13. exact first-live-read authorization present
14. no conflicting write/persistence/autonomy gate open.

Provider/public-site writes, observation/evidence persistence, scheduler, batch executor, autonomous worker, and retry loop remain hard-false in the Task #73 default readiness projection.

## Production publication and certification

Immediately before publication, GitHub and Replit matched exact published SHA/tree, Replit was `0/0` clean, and all execution/write/readiness gates were false.

Publication lifecycle completed:

`pending -> building -> running -> promoting -> success`

Postpublication SELECT-only certification confirmed:

- development/production public base tables: `31 / 31`
- `auth_sessions` present in both
- `auth_audit_events` present in both
- Task #55 auth indexes: `6 / 6` in both
- `signal_collection_single_job_v1` jobs: `0 / 0`
- Task #72/#73/GSC-pilot tagged jobs: `0 / 0`
- Task #72/#73/GSC-pilot tagged evidence: `0 / 0`
- no matching Task #72/#73 observation persistence
- no retained-log marker for Task #70 execution
- no retained-log marker for Google/GSC/Search Console/Search Analytics request
- no retained-log provider-write or public-site-write marker.

Direct production checks returned:

- `GET /api/healthz`: `200`
- `HEAD /`: `200`
- `GET /api/auth/status`: `200`, auth configured/enforced and public registration disabled
- unauthenticated `GET /api/signal-collection-execution/capability`: `401 authentication_required`

No POST/mutation route or provider endpoint was used in certification.

## Replit publication reconciliation

Publication created one metadata-only local commit:

- SHA: `60f7b9030b155e98d1a5862479d13b18d220852a`
- parent: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- subject: `Published your App`
- changed files: `0`

It was removed by Git-only reconciliation without republishing. Replit returned to exact published-source `main`, cached origin same, `0/0`, clean, with no extra local commit.

## Post-certification bookkeeping note

Two accidental documentation-only direct-main writes occurred while starting this production-closeout record. Each was immediately reverted with normal non-force commits before any Replit synchronization or republish. The cleanup commits restored the exact published tree `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`. CI #233 passed on the first cleanup; no application/runtime/provider/database state was affected. This closeout is being completed through the normal docs-branch/PR/CI path.

## Current safety boundary

Unless separately and explicitly authorized, keep all of the following closed:

- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `COMPETITOR_ONE_TARGET_DRY_RUN_EXECUTION_ENABLED=false`
- `COMPETITOR_COLLECTION_ENABLED=false`
- `COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED=false`
- `PUBLIC_SITE_WRITES_ENABLED=false`
- Task #72 configured=false
- credentialReady=false
- scopeReady=false
- propertyDiscoveryReady=false
- selectedPropertyReady=false
- networkReady=false
- task70ExecutionEnabled=false
- liveReadAuthorized=false
- Task #73 packet/lineage/Task #69/Task #70/first-live-read readiness=false
- scheduler/batch/autonomous-worker/retry=false
- observation/evidence persistence unauthorized
- provider/public-site writes=false.

Task #73 is **published but inert**.

## Future real-provider stages remain separately authorized

Task #73 defines, but does not execute, the following sequence:

1. real OAuth client/config binding
2. Google OAuth consent
3. GSC `sites.list` discovery
4. exact property selection/binding
5. Task #70 gate/deployment
6. exact Task #69 job authorization
7. first Search Analytics read
8. observation/evidence persistence.

No stage authorizes any later stage.

Generic `continue` does not authorize creation/use of a real Google OAuth client/secret/token, consent, `sites.list`, Search Analytics, real property binding, Task #70 enablement/execution, persistence, scheduler/worker activation, DDL, Task #53/#54/#64 execution, or provider/public-site mutation.

## Next safe milestone

The next safe step is **read-only Stage A provider-binding planning** for a future real GSC pilot. This may define the exact Google Cloud OAuth client/config contract, secret-storage/rotation model, redirect URI, consent-mode requirements, rollback rules, and authorization phrase without creating or using any real credential or contacting Google.

Any actual OAuth client creation/configuration or secret storage remains separately explicitly authorized.

## Control chain

`Task #66 market/category identity`

→ `Task #67 reviewed signal-source registry + refresh planning`

→ `Task #68 exact adapter request + normalization`

→ `Task #69 exact expiring collection-job packet + authorization`

→ `Task #70 durable default-off single-job execution + replay lock`

→ `Task #71 GSC Search Analytics runner foundation`

→ `Task #72 GSC delegated OAuth/property readiness`

→ `Task #73 first-live-read pilot packet/readiness composition`

Task #70 remains authoritative for durable execution and replay protection. Tasks #71–#73 do not create an alternate executor.

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
