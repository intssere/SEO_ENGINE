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

## Current engineering state — P2.8 complete

Roadmap **P2.8 — Technical issue taxonomy and evidence model expansion v1** is engineering-complete, exact-head CI-certified, merged to GitHub `main`, post-merge CI-certified and Git-only synchronized to Replit.

Authoritative task:
- issue #170 — P2.8 Technical issue taxonomy and evidence model expansion v1
- implementation PR #171

Certification lineage:
- P2.8 baseline main: `785e5042a6c6a1b4546d7be36fd44ded0568fdd3`
- exact tested P2.8 head: `198965f52e428af99f2af4cc6fcab64c0373243c`
- PR CI #287 / run `35025006982`: success
- implementation merge: `d15551b2ec841856e88c872ddd476ddbadbf6c4c`
- implementation tree: `5ce4e67ada0e7a078d3bf6b8fa4deecfaad85afe`
- post-merge main CI #288 / run `35025174780`: success

Both P2.8 certification runs passed legacy schema validation, task tests, full workspace tests, typecheck and build.

Detailed record:
- `.agents/memory/p2-8-technical-issue-evidence-closeout.md`

## Replit engineering workspace

After P2.8 post-merge CI #288, Replit was reconciled Git-only and read-only verified at:
- branch: `main`
- HEAD: `d15551b2ec841856e88c872ddd476ddbadbf6c4c`
- tree: `5ce4e67ada0e7a078d3bf6b8fa4deecfaad85afe`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit on `main`: false

No publish/redeploy, app run, runtime/config/environment mutation, DB/schema/data action, credential/OAuth/provider action, live crawl/sitemap/provider/public-site/competitor request, scheduler/worker/batch/retry activation, persistence action or public-site/provider write occurred during P2.8 engineering or Git reconciliation.

## Current first-party crawler reality

The active published production/pilot crawler remains the historical bounded pilot implementation. P2.1–P2.8 are engineering foundations and do not activate a new runtime.

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

Retained/provable URL-level dimensions include canonical URL/stable URL identity, pathname, sitemap-source membership, sitemap `lastmod` where supplied, and P2.6 recrawl context where proven by a valid current-inventory-bound plan.

Per-URL HTTP status, fetch outcome, redirect target, canonical target, indexability and content fingerprint remain explicitly unavailable in P2.7.

### P2.8 — Technical issue taxonomy and evidence model
Provides a deterministic technical-SEO issue/evidence contract across:
- crawlability/indexability;
- canonicalization;
- metadata;
- structured data;
- internal links;
- performance;
- images;
- content quality;
- AI accessibility;
- crawl completeness.

P2.8 reuses the existing severity vocabulary exactly: `info | low | medium | high | critical`.

Evidence is explicitly typed as:
- retained fact;
- aggregate fact;
- supplied first-party observation;
- unavailable marker.

It binds issues to first-party site/origin identity and upstream fingerprints, uses stable P2.7 URL identity for affected URLs, creates deterministic evidence IDs/issue keys/evidence-set/issue/query fingerprints, supplies deterministic filtering/sorting/bounded pagination, sanitizes bounded output, and maps active URL-scoped issues to the existing `TechnicalFindingSignal` shape.

### P2.8 honesty rule
Taxonomy metadata may describe issue types that need facts not retained by P2.7, but an issue instance cannot be substantiated by an unavailable marker. The following P2.7-unavailable per-URL dimensions require a later explicitly supplied and provenance-valid observation before they can support an issue:
- HTTP status;
- fetch outcome;
- redirect target;
- canonical target;
- indexability;
- content fingerprint.

P2.8 therefore expands the issue/evidence vocabulary without fabricating crawl facts.

## Competitor isolation remains mandatory

Competitor crawling/acquisition remains a separate subsystem with separate target identity, secure transport, gates, replay controls and persistence authorization. P2 first-party foundations do not grant or widen competitor permissions.

## GSC live-provider boundary remains closed

Task #75 remains engineering-complete but unpublished. Its GSC transport remains intentionally unbound/default-off.

Exact GSC identity:
- profile: `gsc_read_only_v1`
- provider: `google`
- external account ID: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported property: `sc-domain:<domain>`
- accepted permissions: `siteRestrictedUser`, `siteFullUser`.

No real GSC OAuth client/secret, OAuth consent, delegated token, `sites.list`, Search Analytics call, real property binding, Task #70 live execution or GSC evidence persistence has been authorized by P2.8.

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
- production DDL/schema migration=false
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
- P2.7 — URL Explorer API/query model;
- P2.8 — technical issue taxonomy + evidence model.

P1 live-provider activation remains separately authorized. P2.1–P2.8 do not imply live full-site crawl execution, sitemap network fetching, persistence, scheduled crawling, autonomous operation or publication.

`MASTER_COMPLETION_ROADMAP.md` is the durable plan; if a table status there lags this checkpoint, this file and the independently verified repository/CI state govern mutable status until the roadmap table is updated.

## Next safe engineering milestone

**P3.1 — Observation/evidence persistence design.**

P3.1 is a **design/domain-contract** milestone, not production persistence activation.

Initial P3.1 should define and test:
- a unified durable observation/evidence record contract spanning existing normalized signal observations and P2.8 technical evidence;
- stable observation/evidence IDs and semantic dedupe/fingerprint keys;
- site/entity/page/query/category/competitor scope references without weakening tenant/site isolation;
- source/provider/profile/resource provenance and upstream lineage fields;
- observed-at, collected-at, freshness/staleness and validity semantics;
- evidence quality/confidence fields compatible with P2.8;
- immutable source facts vs derived/normalized fields;
- supersession/history hooks needed by P3.3 without prematurely implementing retention policy;
- compatibility/read-model hooks for later P3.4 page/query/category/competitor/entity evidence views;
- a proposed storage/migration shape and indexes documented as a plan only;
- strict sanitization and raw-payload/secret boundaries;
- deterministic validation/fingerprinting tests;
- all persistence/DDL/network/execution/write authorization flags closed.

P3.1 must not execute production DDL, create/alter/drop production schema, persist real production observations, activate a writer, scheduler or worker, make provider/crawl requests, perform competitor collection, mutate a public site or publish/redeploy the application.

**P3.6 remains the separately reviewed and explicitly authorized production migration/DDL boundary.**

Generic `continue` may advance the pure P3.1 design/domain-model workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit sync and docs closeout. It does **not** authorize production persistence, DDL, live provider/crawl activity, scheduler/worker activation, competitor execution, provider/public-site writes or publication.

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
