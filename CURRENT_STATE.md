# SEO ENGINE — Current State Checkpoint

This is the authoritative mutable resume checkpoint. Always independently resolve current GitHub `main` SHA/tree and CI before acting. `AGENTS.md` remains the normative operating contract, `MASTER_COMPLETION_ROADMAP.md` remains the full completion plan, and GitHub `main` remains canonical.

## Published production

The currently published and production-certified application release remains **Task #73 — GSC First-Live-Read Pilot Readiness v1**.

Published application source:
- SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- URL: `https://dsseoengine.replit.app`
- deployment status: success

Tasks #74, #75 and roadmap P2.1 have **not** been published. Git-only Replit synchronization does not change the separately attested production application source.

## Current engineering state — P2.1 complete

Roadmap **P2.1 — Full-Site Crawl Controller Architecture: `baseline` vs `full_site`** — is engineering-complete, CI-certified, merged, and Git-only synchronized to Replit.

Authoritative issue:
- issue #145

Implementation PR:
- PR #146
- exact tested head: `e382edba7da43aaae630d819213feaa5af7a7daf`
- PR CI #249 / run `34893786940`: success
- merge: `aa564d68b1b92fc673ff1a5fa8113aa0321a1a6d`
- tree: `614a71a4a41bafc2423cd922ee1f730f50c1a137`
- post-merge main CI #250 / run `34893997324`: success

Both CI gates passed task tests, full workspace tests, typecheck and build.

Detailed engineering record:
- `.agents/memory/p2-1-crawl-controller-closeout.md`

## Replit engineering workspace

After post-merge CI #250, Replit was Git-only synchronized and read-only verified at the exact P2.1 implementation merge:
- branch: `main`
- HEAD: `aa564d68b1b92fc673ff1a5fa8113aa0321a1a6d`
- tree: `614a71a4a41bafc2423cd922ee1f730f50c1a137`
- cached origin/main: same
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit: false

No publication/redeployment, live crawl/external request, runtime/config/environment mutation, DB/schema/data operation, persistence activation, credential/OAuth/provider mutation, safety-gate change, competitor execution/gate change, scheduler/worker/retry action, provider/public-site write, or other non-Git mutation occurred.

## Current first-party crawler reality

The original historical Task #4 standalone crawler package is no longer in the current tree. The active first-party crawler is embedded inside the pilot runner.

Current active pilot crawl behavior remains unchanged by P2.1:
- production bound: 30 pages
- maximum depth: 2
- GET-only
- sequential breadth-first crawling
- robots-aware
- no retries
- 10-second request timeout
- maximum HTML response: 750,000 bytes
- same-site normalization for Diamond Shelf
- query strings stripped
- redirects currently delegated to `fetch(..., redirect: "follow")`
- canonical extracted as evidence only, not yet a dedupe identity
- noindex observed but does not stop link expansion
- `crawlSite()` itself is in-memory, while the enclosing guarded pilot can persist successful crawl observations.

The 30-page behavior is now explicitly the **baseline** mode. It is not the intended production whole-site ceiling.

## P2.1 controller contract

P2.1 added a pure planning layer only. It does not add or enable a crawler endpoint.

### `baseline`
Locked to the current pilot policy:
- page hard limit: 30
- depth limit: 2
- `unlimited=false`
- bounded link BFS
- same-origin only
- GET-only
- robots required
- sequential
- caller cannot override the hard page limit.

An integration test locks these values to the current `PILOT_LIMITS` so baseline drift fails CI.

### `full_site`
Inventory-driven rather than unlimited. Every plan requires:
- explicit first-party `siteId`
- normalized HTTPS canonical origin
- explicit finite positive integer hard page fuse
- independent finite positive integer absolute page ceiling
- hard page fuse <= absolute ceiling.

Fail closed on:
- missing hard fuse or ceiling
- `Infinity`
- `NaN`
- zero/negative values
- fractional values
- fuse above ceiling
- competitor/external target
- missing site identity
- non-HTTPS/invalid canonical origin.

A valid full-site plan records:
- sitemap-first inventory
- internal-link supplementation
- same-origin GET-only policy
- robots enforcement
- canonical deduplication required before execution
- query/trap controls required before execution
- bounded batching required before execution
- concurrency control required before execution
- per-origin rate limiting required before execution
- checkpoint/resume required before execution
- deterministic completion-ledger contract.

Completion-ledger fields are fixed to:
- discovered
- eligible
- fetchedSuccessful
- redirects
- canonicalizedDeduplicated
- robotsExcluded
- noindex
- failed
- pending
- coveragePercent
- hardLimitState
- wholeSiteCertified
- wholeSiteReason.

Every P2.1 plan hard-codes false for controller execution, persistence authorization, scheduler, autonomous worker, retry loop, competitor collection/persistence, provider writes and public-site writes.

## Competitor isolation remains mandatory

Competitor crawling/acquisition remains a separate subsystem with separate:
- target identity
- gates
- authorization/replay controls
- secure transport
- robots policy
- persistence authorization
- dry-run/live-execution boundaries.

P2.1 first-party full-site planning does not import, enable or widen competitor acquisition. First-party whole-site permission must never be represented by a generic crawler/network flag that a competitor path can inherit.

## GSC control chain remains closed at live-provider boundary

The controlled chain remains:

`Task #66 market/category identity`
→ `Task #67 reviewed signal-source registry + refresh planning`
→ `Task #68 exact adapter request + normalization`
→ `Task #69 exact expiring collection-job packet + authorization`
→ `Task #70 durable default-off single-job execution + replay lock`
→ `Task #71 GSC Search Analytics runner foundation`
→ `Task #72 GSC delegated OAuth/property readiness`
→ `Task #73 first-live-read pilot packet/readiness composition`
→ `Task #74 GSC OAuth client/config binding architecture`
→ `Task #75 profile-isolated GSC runtime binding foundation`.

Task #75 remains engineering-complete but unpublished. Its GSC transport remains intentionally unbound/default-off.

Exact GSC identity remains:
- profile: `gsc_read_only_v1`
- provider: `google`
- external account ID: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported property identity: `sc-domain:<domain>`
- accepted permission levels: `siteRestrictedUser`, `siteFullUser`.

No real GSC OAuth client/secret, OAuth consent, token, `sites.list`, Search Analytics call, real property binding, Task #70 live execution or GSC evidence persistence has been authorized by P2.1.

## Current safety boundary

Unless a later task explicitly authorizes otherwise, keep closed/default-off:
- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `GSC_READONLY_OAUTH_RUNTIME_ENABLED=false`
- first-party `full_site` crawl execution=false
- first-party full-site persistence=false
- competitor one-target execution/collection/evidence persistence=false
- Task #72 configured/credential/scope/property/network/live-read readiness=false
- Task #73 packet/lineage/Task #69/Task #70/first-live-read readiness=false
- provider/public writes=false
- observation/evidence persistence=false
- scheduler/batch/autonomous-worker/retry=false.

## Master roadmap status

Program tracker: issue #139. Keep it open until final production completion certification.

Completed engineering foundations now include:
- P1.1 / P1.2 — Task #75 GSC profile isolation
- P2.1 — first-party baseline/full-site crawl controller planning foundation.

P1 live-provider activation items remain separately authorized. P2.1 does not imply crawl execution.

## Next safe engineering milestone

The next safe/default-off engineering milestone is:

**P2.2 — Sitemap Inventory / Discovery + Canonical Dedupe Foundation.**

Initial P2.2 should remain network-free and deterministic. It should:
- accept supplied sitemap XML/text rather than fetch external URLs itself;
- model bounded sitemap index and URL-set normalization;
- enforce first-party site/canonical-origin identity;
- define finite sitemap nesting, document, URL and response-size ceilings;
- normalize and canonicalize inventory URLs deterministically;
- dedupe by canonical URL identity;
- reject unsupported schemes, credential-bearing URLs, cross-origin entries and trap-risk URLs with explicit reason codes;
- model useful query-parameter/trap policy without broadening current live crawl behavior;
- produce deterministic inventory entries and exclusion/rejection accounting;
- integrate only with the P2.1 planning layer;
- leave live sitemap fetching, live crawling, persistence, DDL, scheduler/worker, competitor widening, provider/public writes and publication disabled.

Generic `continue` may advance this pure/default-off P2.2 engineering workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit sync. It does **not** authorize live sitemap/crawl requests, persistence, DDL, scheduler/worker activation, competitor execution, provider/public-site writes, Task #75 live-provider stages, or publication.

## Resume rule

At every new session:
1. independently resolve GitHub `main` SHA/tree and current CI;
2. read `AGENTS.md`;
3. read this `CURRENT_STATE.md`;
4. read `MASTER_COMPLETION_ROADMAP.md`;
5. read `ARCHITECTURE.md` and `PROJECT_HANDOFF.md`;
6. read `.agents/skills/seo-engine-project/SKILL.md`;
7. read `.agents/memory/MEMORY.md` and relevant closeouts, especially Task #75 and P2.1;
8. read program issue #139 and the active task issue/PR;
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before sync/publish.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence, or external/provider/public-site activity.
