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

Tasks #74, #75 and roadmap P2 engineering foundations have **not** been published as application releases. Git-only Replit synchronization does not change the separately attested production source.

## Current engineering state — P2.7 complete

Roadmap **P2.7 — URL Explorer API/query model v1** is engineering-complete, exact-head CI-certified, merged to GitHub `main`, post-merge CI-certified and Git-only synchronized to Replit.

Authoritative task:
- issue #165 — P2.7 URL Explorer API/query model v1
- implementation PR #167

Certification lineage:
- P2.7 baseline main: `f640eb7c9d017a0e8e6faf4344332b18b1476023`
- exact tested P2.7 head: `3046ab6f77604be45b175cf793948ea28908d33d`
- PR CI #282 / run `35021282299`: success
- implementation merge: `f8e1d406b4985247f8b115b0105980e32510820e`
- implementation tree: `37190828dde42ceed79e47b121c64f5964ba5968`
- post-merge main CI #283 / run `35021463871`: success

Both P2.7 certification runs passed the task gate, full workspace tests, typecheck and build.

Detailed records:
- `.agents/memory/p2-5-crawl-history-closeout.md`
- `.agents/memory/p2-6-incremental-recrawl-planner-closeout.md`
- `.agents/memory/p2-7-url-explorer-closeout.md`

A stale duplicate implementation PR #166 exists from an earlier P2.7 branch. PR #167 is the certified merged implementation; #166 should remain closed/superseded and must not be treated as a second implementation path.

## Replit engineering workspace

After P2.7 post-merge CI #283, Replit was reconciled Git-only and read-only verified at:
- branch: `main`
- HEAD: `f8e1d406b4985247f8b115b0105980e32510820e`
- tree: `37190828dde42ceed79e47b121c64f5964ba5968`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit on `main`: false

No publish/redeploy, app run, runtime/config/environment mutation, DB/schema/data action, credential/OAuth/provider action, live crawl/sitemap/provider/public-site/competitor request, scheduler/worker/batch/retry activation, persistence action or public-site/provider write occurred during P2.7 engineering or Git reconciliation.

## Current first-party crawler reality

The active published production/pilot crawler remains the historical bounded pilot implementation. P2.1–P2.7 are engineering foundations and do not activate a new runtime.

Published production/pilot behavior remains approximately:
- 30-page bound;
- depth 2;
- GET-only;
- sequential breadth-first crawl;
- robots-aware;
- no retries;
- 10-second request timeout;
- maximum HTML response 750,000 bytes;
- same-site normalization;
- query stripping;
- existing runtime redirect handling.

The 30-page behavior remains **baseline** mode. It is not the intended whole-site production ceiling.

## P2 engineering foundations completed

### P2.1 — Crawl controller
Defines immutable 30-page/depth-2 `baseline` planning and separately bounded `full_site` planning. Full-site mode requires first-party identity, finite hard ceilings, sitemap-first inventory, dedupe, trap controls, bounded batching, checkpoint/resume and completion accounting. Execution and persistence remain disabled.

### P2.2 — Sitemap inventory
Provides network-free supplied-sitemap inventory parsing, strict first-party URL policy, canonical normalization/dedupe, completeness/rejection accounting and deterministic fingerprinting. It does not fetch sitemaps.

### P2.3 — Crawl execution control
Provides deterministic inventory-derived batches, finite concurrency/rate/timeout/redirect/retry/trap limits, same-origin request/redirect validation, deterministic checkpoint/resume, supplied-outcome advancement, replay/order guards and semantic integrity validation. It contains no network executor.

### P2.4 — Completion ledger and whole-site certification
Provides deterministic completeness/accounting certification over exact P2.1/P2.2/P2.3 lineage. Certification means reconciled accounting of approved canonical inventory; it is not a zero-SEO-issues claim.

### P2.5 — Crawl history/comparison
Provides deterministic same-site comparison over retained P2.2 inventories and P2.4 certifications, including inventory/lastmod/ledger/certification changes. It explicitly leaves unavailable per-URL facts unavailable rather than inferring them.

### P2.6 — Incremental recrawl planner
Produces bounded deterministic recrawl plans from P2.5 changes plus explicitly supplied trusted first-party signals. Budgets remain finite; insufficient evidence triggers bounded full reconciliation rather than invented targeting.

### P2.7 — URL Explorer query model
Provides a deterministic, bounded, read-only URL-level exploration contract over supplied P2.2 inventory and optional P2.6 recrawl plans.

Retained/provable URL-level dimensions include:
- canonical URL and stable URL identity;
- normalized pathname;
- sitemap-source membership;
- sitemap `lastmod` where supplied;
- selected/deferred/not-planned P2.6 recrawl context, priority and reasons where supplied by a valid current-inventory-bound plan.

Explicitly unavailable dimensions remain marked unavailable:
- HTTP status;
- fetch outcome;
- redirect target;
- canonical target;
- indexability;
- content fingerprint.

P2.7 adds deterministic filtering/sorting/bounded pagination and query/result fingerprints. It adds no network-facing route, live fetch, persistence, DDL, scheduler/worker execution, provider action, competitor collection, public-site write or publication path.

## Competitor isolation remains mandatory

Competitor crawling/acquisition remains a separate subsystem with separate target identity, secure transport, gates, replay controls and persistence authorization. P2 first-party whole-site foundations do not grant or widen competitor permissions.

## GSC live-provider boundary remains closed

Task #75 remains engineering-complete but unpublished. Its GSC transport remains intentionally unbound/default-off.

Exact GSC identity:
- profile: `gsc_read_only_v1`
- provider: `google`
- external account ID: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported property: `sc-domain:<domain>`
- accepted permissions: `siteRestrictedUser`, `siteFullUser`.

No real GSC OAuth client/secret, OAuth consent, delegated token, `sites.list`, Search Analytics call, real property binding, Task #70 live execution or GSC evidence persistence has been authorized by P2.7.

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
- P1.1 / P1.2 — Task #75 GSC profile isolation;
- P2.1 — baseline/full-site crawl-controller planning;
- P2.2 — supplied-sitemap inventory + canonical dedupe;
- P2.3 — bounded crawl execution-control + checkpoint/resume;
- P2.4 — completion ledger + whole-site completeness certification;
- P2.5 — crawl history/comparison + change detection;
- P2.6 — incremental recrawl planning;
- P2.7 — URL Explorer API/query model.

P1 live-provider activation remains separately authorized. P2.1–P2.7 do not imply live full-site crawl execution, sitemap network fetching, persistence, scheduled crawling, autonomous operation or publication.

## Next safe engineering milestone

**P2.8 — Technical issue taxonomy and evidence model expansion.**

Initial P2.8 should remain pure/read-only/default-off. It should establish a deterministic technical-SEO issue/evidence contract suitable for later crawl-analysis, opportunity, Audit UI and durable evidence work without pretending unavailable P2.1–P2.7 facts exist.

The first implementation should define and test:
- stable issue type IDs and categories aligned to the Audit areas in the master roadmap;
- severity, confidence/evidence-quality and lifecycle/status vocabulary with deterministic ordering;
- first-party site/origin and exact upstream artifact-lineage binding;
- affected URL references using stable P2.7 URL identity where available;
- evidence references that explicitly distinguish retained facts, supplied observations, aggregate-only facts and unavailable facts;
- deterministic issue fingerprints for dedupe/suppression compatibility;
- sanitized summaries/details with bounded lengths and no raw XML/HTML/provider payloads, tokens, secrets or credentials;
- deterministic sorting/filtering/grouping contracts suitable for later API/UI integration;
- closed authorization/capability flags and no hidden execution/write path;
- explicit unsupported/unavailable states for per-URL HTTP/fetch/redirect/canonical/indexability/content facts until an authorized future evidence source actually supplies them.

P2.8 must not silently activate live crawling, sitemap fetching, persistence/DDL, scheduler/worker/batch/retry execution, competitor collection, Task #75 live-provider stages, provider/public-site writes or publication.

Generic `continue` may advance the pure/read-only P2.8 engineering workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit sync and docs closeout. It does **not** authorize live crawl/provider activity, persistence, DDL, scheduler/worker activation, competitor execution, provider/public-site writes or publication.

## Resume rule

At every new session:
1. independently resolve GitHub `main` SHA/tree and current CI;
2. read `AGENTS.md`;
3. read this `CURRENT_STATE.md`;
4. read `MASTER_COMPLETION_ROADMAP.md`;
5. read `ARCHITECTURE.md` and `PROJECT_HANDOFF.md`;
6. read `.agents/skills/seo-engine-project/SKILL.md`;
7. read `.agents/memory/MEMORY.md` plus the latest task closeouts;
8. read program issue #139 and the active task issue/PR;
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before sync/publish.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence or external/provider/public-site activity.
