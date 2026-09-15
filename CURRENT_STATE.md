# SEO ENGINE — Current State Checkpoint

This is the authoritative mutable resume checkpoint. Always independently resolve current GitHub `main` SHA/tree and CI before acting. `AGENTS.md` remains the normative operating contract, `MASTER_COMPLETION_ROADMAP.md` remains the durable completion plan, and GitHub `main` remains canonical.

## Published production

The currently published and production-certified application release remains **Task #73 — GSC First-Live-Read Pilot Readiness v1**.

Published application source:
- SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- URL: `https://dsseoengine.replit.app`
- deployment status: success

Tasks #74, #75 and roadmap P2.1/P2.2/P2.3 have **not** been published. Git-only Replit synchronization does not change the separately attested production application source.

## Current engineering state — P2.3 implementation complete

Roadmap **P2.3 — Batched Crawler, Rate Limits, Trap Guards, Checkpoints/Resume Foundation** is engineering-complete, exact-head CI-certified, merged to GitHub `main`, post-merge CI-certified, and Git-only synchronized to Replit.

Authoritative issue:
- issue #154

Implementation lineage:
- implementation PR #155
- exact tested head: `7e04011871d6eaad8a4c54894fe0523344b992a1`
- PR CI #263 / run `34993680595`: success
- implementation merge: `60cd0b60ce20fffac5d33ddb19aae50d6514deab`
- implementation tree: `1b4aa21ecb58aadebcccb75a130ed90e02afa921`
- post-merge main CI #264 / run `34993940693`: success

Both green certification runs passed the task gate, full workspace tests, typecheck, and build.

Detailed engineering record:
- `.agents/memory/p2-3-batched-crawl-control-closeout.md`

### CI #262 hardening-test incident
PR CI #262 / run `34993072863` passed the dedicated task gate but failed one full-workspace hardening assertion. The implementation was not merged.

The failure was test-only: a source scanner used generic `/\bUPDATE\b/i`, which matched ordinary source text rather than SQL mutation syntax. Production crawl-control code contained no persistence path and was not weakened or changed for the failure. The hardening test was narrowed to actual SQL mutation forms (`INSERT INTO`, `UPDATE <table> SET`, `DELETE FROM`). The corrected exact head then passed CI #263 fully and the merge passed CI #264.

## Replit engineering workspace

After post-merge CI #264, Replit was Git-only synchronized and read-only verified at the exact P2.3 implementation merge:
- branch: `main`
- HEAD: `60cd0b60ce20fffac5d33ddb19aae50d6514deab`
- tree: `1b4aa21ecb58aadebcccb75a130ed90e02afa921`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit: false

No publication/redeployment, app run, runtime/config/environment mutation, DB/schema/data action, credential/OAuth/provider/safety-gate action, live crawl/sitemap/provider/public-site/competitor action, scheduler/worker/batch/retry activation, persistence action, provider/public-site write, or other non-Git mutation occurred.

A later docs-only closeout merge may advance GitHub/Replit `main` beyond this implementation SHA without changing application behavior. Always independently resolve current `main` before acting.

## Current first-party crawler reality

The active production/pilot crawl runtime remains unchanged by P2.1/P2.2/P2.3. The actual pilot crawler is still bounded at:
- 30 pages
- maximum depth 2
- GET-only
- sequential breadth-first crawl
- robots-aware
- no retries
- 10-second request timeout
- maximum HTML response 750,000 bytes
- same-site normalization
- query stripping
- runtime redirect following through the existing pilot transport.

The 30-page behavior remains **baseline** mode. It is not the intended whole-site production ceiling.

P2.1, P2.2 and P2.3 are currently pure/default-off foundations around the future `full_site` path. They do not replace or activate the existing live pilot crawler.

## P2.1 crawl-controller contract

P2.1 defines two modes:

### `baseline`
- immutable 30-page hard limit
- immutable depth 2
- `unlimited=false`
- same-origin GET-only
- robots required
- sequential bounded link BFS
- caller cannot widen limits.

### `full_site`
Inventory-driven, never unlimited. It requires:
- explicit first-party `siteId`
- normalized HTTPS canonical origin
- finite positive page hard fuse
- independent finite positive absolute page ceiling
- page hard fuse <= absolute ceiling.

Before execution it requires sitemap-first inventory, canonical dedupe, query/trap controls, bounded batching, concurrency control, per-origin rate limiting, checkpoint/resume, and completion accounting.

Every P2.1 plan keeps execution, persistence, scheduler, autonomous worker, retry loop, competitor collection/persistence, provider writes and public-site writes false.

## P2.2 sitemap inventory contract

P2.2 is the network-free supplied-sitemap inventory layer for P2.1 `full_site`.

It:
- accepts supplied sitemap documents only;
- supports bounded `sitemapindex`/`urlset` traversal;
- requires exact first-party identity;
- enforces finite document/depth/byte/inventory/path ceilings plus independent code caps;
- rejects unsafe/malformed XML and unsupported DTD/entity behavior;
- rejects unsupported scheme, credentials, cross-origin, fragment, query and utility/trap URLs;
- normalizes/deduplicates canonical URL identity deterministically;
- records missing supplied children and explicit completeness state;
- produces deterministic sanitized inventory fingerprinting;
- keeps network fetching, crawl execution, persistence, scheduler/batch/worker/retry, competitor collection/persistence, provider writes and public-site writes false.

P2.2 does not fetch any sitemap.

## P2.3 crawl execution-control contract

P2.3 composes a valid P2.1 `full_site` plan with a matching complete P2.2 inventory. It remains **network-free** and default-off.

### Lineage and identity
It requires:
- exact P2.1 full-site first-party plan;
- exact P2.2 inventory version;
- matching site ID and canonical HTTPS origin;
- complete inventory with no hard-limit condition;
- inventory within the P2.1 page fuse;
- all upstream execution/persistence/write authorization boundaries closed.

P2.3 independently revalidates semantic plan/checkpoint invariants rather than trusting a recomputed fingerprint alone.

### Finite execution-planning ceilings
Independent code ceilings are:
- batch size <= 250 URLs
- concurrency <= 8
- per-origin requests <= 120/minute
- request timeout <= 30 seconds
- redirects <= 5/request
- attempts <= 3/URL
- retry base delay <= 60 seconds
- retry max delay <= 120 seconds
- URL length <= 2,048
- path segments <= 64
- repeated identical path-segment run <= 4.

Configured values must be finite integers and obey relational constraints such as concurrency <= batch size and batch size <= P2.1 page fuse.

These are planning ceilings, not live execution authorization.

### Deterministic batches
P2.3:
- accepts no arbitrary caller URL injection;
- consumes only P2.2 canonical inventory entries;
- revalidates every URL for execution safety;
- sorts canonical URLs deterministically;
- partitions finite batches;
- fingerprints each batch against inventory identity;
- fingerprints the overall plan against site/origin, P2.1 limits, P2.2 inventory, policy, batches, request controls, and closed authorization state.

### Execution-time trap/redirect guards
Request and redirect candidates require:
- HTTPS
- exact canonical origin
- no credentials
- no query
- no fragment
- no control characters
- no backslash
- no encoded path separators
- no excluded utility/trap path (`/cart`, `/checkout`, `/account`, `/apps`, `/search`)
- bounded URL length and path depth
- bounded repeated identical path segment runs
- valid path decoding
- canonical normalized identity.

Redirect count is finite and every redirect target must be revalidated.

### Retry model
P2.3 models retry decisions only from supplied outcomes. It does **not** implement a live retry loop.

Retryable transport categories:
- network timeout
- connection reset
- transport unavailable.

Retryable HTTP statuses:
- 408, 425, 429, 500, 502, 503, 504.

Policy rejection, permission/auth/permanent HTTP failures, and other permanent errors are terminal. Attempts and backoff remain finite; exhaustion becomes a terminal failure so checkpoint progress cannot loop forever.

### Checkpoint/resume and replay protection
Checkpoints bind:
- P2.3 plan fingerprint
- P2.2 inventory fingerprint
- site/origin
- sequence
- active batch
- next attempt
- exact pending URLs
- completed batch prefix
- sanitized counters/progress
- closed authorization state
- checkpoint fingerprint.

Supplied outcomes must exactly match the current checkpoint fingerprint, active batch, attempt and pending URL set. Stale/replayed/out-of-order/missing/duplicate/foreign outcomes fail closed.

Checkpoint/resume contains no response body, raw HTML, secret, token or credential. `describeCrawlResumeWork` returns bounded work metadata with `executionEnabled=false`.

P2.3 intentionally cannot set `wholeSiteCertified=true`; whole-site completion certification belongs to P2.4.

## Competitor isolation remains mandatory

Competitor crawling/acquisition remains a separate subsystem with separate target identity, secure transport, gates, replay controls and persistence authorization. P2.1/P2.2/P2.3 first-party full-site controls do not grant or widen competitor permissions.

First-party whole-site permission must never be represented by a generic network/crawler flag that a competitor path can inherit.

## GSC live-provider boundary remains closed

Task #75 remains engineering-complete but unpublished. Its GSC transport remains intentionally unbound/default-off.

Exact GSC identity:
- profile: `gsc_read_only_v1`
- provider: `google`
- external account ID: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported property: `sc-domain:<domain>`
- accepted permissions: `siteRestrictedUser`, `siteFullUser`.

No real GSC OAuth client/secret, OAuth consent, delegated token, `sites.list`, Search Analytics call, real property binding, Task #70 live execution or GSC evidence persistence has been authorized by P2.3.

## Current safety boundary

Unless a later task explicitly authorizes otherwise, keep closed/default-off:
- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `GSC_READONLY_OAUTH_RUNTIME_ENABLED=false`
- first-party `full_site` live network execution=false
- first-party sitemap network fetching=false
- first-party full-site persistence=false
- first-party batch executor=false
- first-party retry loop=false
- competitor execution/collection/evidence persistence=false
- Task #72 credential/scope/property/network/live-read readiness=false
- Task #73 first-live-read readiness=false
- provider/public writes=false
- observation/evidence persistence=false
- scheduler/autonomous-worker execution=false.

## Master roadmap status

Program tracker: issue #139. Keep it open until final production completion certification.

Completed engineering foundations now include:
- P1.1 / P1.2 — Task #75 GSC profile isolation
- P2.1 — first-party baseline/full-site crawl-controller planning
- P2.2 — network-free supplied-sitemap inventory + canonical dedupe
- P2.3 — network-free batched crawl execution-control + rate/trap/retry/checkpoint-resume foundation.

P1 live-provider activation remains separately authorized. P2.1–P2.3 do not imply live crawl execution, sitemap fetching, persistence or autonomous operation.

`MASTER_COMPLETION_ROADMAP.md` may retain older mutable status labels until roadmap-status maintenance; this `CURRENT_STATE.md` checkpoint and independently verified GitHub/Replit state take precedence for current status.

## Next safe engineering milestone

**P2.4 — Crawl Completion Ledger and Whole-Site Certification.**

Initial P2.4 must remain pure/default-off and network-free. It should consume certified P2.1/P2.2/P2.3 lineage and deterministically model the completion ledger required by the roadmap:
- discovered
- eligible
- fetched successful
- redirects
- canonicalized/deduplicated
- robots/excluded
- noindex
- failed
- pending
- coverage percent
- hard-limit state
- whole-site-certified boolean/reason.

P2.4 should prove accounting reconciliation and define explicit certification blockers/reasons. It must fail closed when:
- P2.2 inventory is incomplete;
- P2.3 plan/checkpoint lineage is stale, invalid or tampered;
- pending URLs or unfinished batches remain;
- configured hard limits/fuses prevented complete coverage;
- counters cannot reconcile to the approved inventory;
- unsafe/unknown terminal state exists;
- an execution/persistence/write authorization boundary is unexpectedly open.

P2.4 must **not** add a built-in network transport or silently activate live crawling, sitemap fetching, persistence, DDL, scheduler/worker/batch/retry execution, competitor collection, provider/public-site writes or publication.

Generic `continue` may advance this pure/default-off P2.4 engineering workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit sync. It does **not** authorize a live sitemap/crawl request, persistence, DDL, scheduler/worker/batch executor activation, competitor execution, Task #75 live-provider stages, provider/public-site writes, or publication.

## Resume rule

At every new session:
1. independently resolve GitHub `main` SHA/tree and current CI;
2. read `AGENTS.md`;
3. read this `CURRENT_STATE.md`;
4. read `MASTER_COMPLETION_ROADMAP.md`;
5. read `ARCHITECTURE.md` and `PROJECT_HANDOFF.md`;
6. read `.agents/skills/seo-engine-project/SKILL.md`;
7. read `.agents/memory/MEMORY.md` plus Task #75 and P2.1/P2.2/P2.3 closeouts;
8. read program issue #139 and the active task issue/PR;
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before sync/publish.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence, or external/provider/public-site activity.
