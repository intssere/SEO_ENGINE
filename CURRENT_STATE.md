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

Tasks #74, #75 and roadmap P2.1/P2.2/P2.3/P2.4/P2.5 have **not** been published as application releases. Git-only Replit synchronization does not change the separately attested production application source.

## Current engineering state — P2.5 implementation complete

Roadmap **P2.5 — Crawl History, Comparison, and Change Detection v1** is engineering-complete, exact-head CI-certified, merged to GitHub `main`, post-merge CI-certified, and Git-only synchronized to Replit at the implementation merge.

Authoritative issue:
- issue #160

Implementation lineage:
- implementation PR #161
- exact tested head: `646719a4bc0afd30fa6fc5b1049e25862f80eaed`
- PR CI #271 / run `35001858253`: success
- implementation merge: `a177c4590273da29113af75b431d6ae20c7e3b4c`
- implementation tree: `2d4a2103c9036f5e90032d5f569d01f7e8ecb78f`
- post-merge main CI #272 / run `35002068558`: success

Both green certification runs passed the task gate, legacy PostgreSQL core-schema validation, full current workspace tests, typecheck, and build.

Detailed engineering record:
- `.agents/memory/p2-5-crawl-history-closeout.md`

## Replit engineering workspace

After post-merge CI #272, Replit was Git-only synchronized and read-only verified at the exact P2.5 implementation merge:
- branch: `main`
- HEAD: `a177c4590273da29113af75b431d6ae20c7e3b4c`
- tree: `2d4a2103c9036f5e90032d5f569d01f7e8ecb78f`
- cached origin/main: same SHA
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit: false

A first docs-only closeout attempt was created locally in Replit at commit `d2f5d94f7d23b08fcb9de47ba91f12f490dc5732` / tree `340150a6f4de6c27a2120385dc46fed51901a3e4`, but its push failed because the Replit Git environment lacked GitHub authentication. That local documentation commit is not canonical. The canonical closeout is the GitHub-first docs branch/PR created after that failure.

No publication/redeployment, app run, runtime/config/environment mutation, DB/schema/data action, credential/OAuth/provider action, live crawl/sitemap/provider/public-site/competitor request, scheduler/worker/batch/retry activation, persistence action, provider/public-site write, or other non-Git product mutation occurred.

A docs-only closeout merge may advance GitHub/Replit `main` beyond the implementation SHA without changing application behavior. Always independently resolve current `main` before acting.

## Current first-party crawler reality

The active production/pilot crawl runtime is still the historical bounded pilot implementation. P2.1–P2.5 are engineering foundations and do not replace or activate that runtime.

Current production/pilot behavior remains approximately:
- 30-page bound
- depth 2
- GET-only
- sequential breadth-first crawl
- robots-aware
- no retries
- 10-second request timeout
- maximum HTML response 750,000 bytes
- same-site normalization
- query stripping
- existing runtime redirect handling.

The 30-page behavior remains **baseline** mode. It is not the intended whole-site production ceiling.

## P2.1 crawl-controller contract

P2.1 defines `baseline` and `full_site` planning.

`baseline` is immutable at 30 pages/depth 2, sequential, same-origin GET-only, robots-required and never unlimited.

`full_site` is inventory-driven and finite. It requires explicit first-party site identity, canonical HTTPS origin, a positive page hard fuse, an independent positive absolute page ceiling, and page fuse <= absolute ceiling. Before execution it requires sitemap-first inventory, canonical dedupe, trap controls, bounded batching/concurrency/rate limits, checkpoint/resume and completion accounting.

All P2.1 execution/persistence/scheduler/worker/competitor/provider/public-write authorization flags remain false.

## P2.2 sitemap inventory contract

P2.2 is the network-free supplied-sitemap inventory layer for P2.1 `full_site`.

It provides bounded `sitemapindex`/`urlset` parsing, exact first-party URL policy, deterministic canonical normalization/dedupe, supplied-child completeness accounting, explicit hard-limit state, rejection accounting, sitemap `lastmod` metadata where supplied, and deterministic sanitized fingerprinting.

It does not fetch sitemaps. Network fetching, crawl execution, persistence, scheduler/batch/worker/retry, competitor collection/persistence, provider writes and public-site writes remain false.

## P2.3 crawl execution-control contract

P2.3 composes a valid P2.1 `full_site` plan with a matching complete P2.2 inventory and remains network-free/default-off.

It provides deterministic batches, finite batch/concurrency/request-rate/timeout/redirect/retry/trap ceilings, same-origin HTTPS GET-only controls, checkpoint/resume state, supplied-outcome advancement, stale/replay/out-of-order/missing/duplicate/foreign outcome rejection, bounded transient retry classification and semantic integrity checks.

P2.3 does not perform network execution and cannot itself claim whole-site certification.

## P2.4 completion-ledger/certification contract

P2.4 consumes exact valid P2.1/P2.2/P2.3 lineage and creates deterministic `first_party_full_site_crawl_certification_v1` artifacts.

The ledger records discovered, eligible, fetched-successful, redirect, dedupe, robots/exclusion, noindex, failure, finalized, pending, deterministic coverage and hard-limit state. `wholeSiteCertified=true` is a **completeness/accounting assertion**, not a claim that every page is SEO healthy.

P2.4 revalidates upstream semantics and exact lineage rather than trusting fingerprints alone. Terminal failures block certification. Known redirects, robots exclusions and noindex states may coexist with complete accounting. Incomplete/hard-limit-truncated inventory, invalid lineage, inconsistent accounting or unexpectedly open authorization fails closed.

P2.4 contains no network client, API route, persistence path, DDL, scheduler, worker, live retry loop, competitor transport, provider action or public-site mutation path.

## P2.5 crawl-history/comparison contract

P2.5 adds deterministic `first_party_crawl_history_comparison_v1` artifacts over supplied P2.2 inventory + P2.4 certification sources.

### Proven comparison dimensions
P2.5 can prove and report:
- inventory membership changes: canonical URLs added and removed;
- sitemap `lastmod` changes when those values are supplied upstream;
- aggregate completion-ledger numeric deltas;
- whole-site certification transitions;
- certification blockers added and removed;
- inventory/execution-plan/checkpoint lineage changes;
- checkpoint-sequence deltas;
- page-hard-limit, absolute-ceiling and hard-limit-blocked transitions;
- deterministic summary/change state and SHA-256 fingerprint.

Comparisons require the same first-party site ID and canonical origin. Cross-site/cross-origin comparisons fail closed. Upstream inventory/certification integrity is revalidated before comparison, and tampered artifacts or inconsistent lineage fail closed.

### Explicit evidence boundary
P2.1–P2.4 do **not** retain enough per-URL outcome evidence for P2.5 to prove per-URL changes in:
- HTTP status;
- fetch result;
- canonical target;
- indexability;
- content fingerprint.

P2.5 therefore exposes `perUrlOutcomeComparisonAvailable=false` with the reason `upstream_p2_1_to_p2_4_do_not_retain_per_url_fetch_or_content_outcomes` rather than inventing those changes.

This boundary is important for P2.6: incremental recrawl planning may use only supported P2.5 signals unless a later evidence/observation layer supplies additional verified per-URL evidence.

### Safety
P2.5 is pure/default-off and adds no built-in network transport, persistence mutation, DDL, scheduler, worker, retry executor, provider client, public-site write path, or raw/secret-bearing artifact field. All network/execution/persistence/scheduler/worker/provider/public-write authorization remains closed.

## Competitor isolation remains mandatory

Competitor crawling/acquisition remains a separate subsystem with separate target identity, secure transport, gates, replay controls and persistence authorization. P2 first-party full-site foundations do not grant or widen competitor permissions.

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

No real GSC OAuth client/secret, OAuth consent, delegated token, `sites.list`, Search Analytics call, real property binding, Task #70 live execution or GSC evidence persistence has been authorized by P2.5.

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
- P2.3 — network-free bounded crawl execution-control + checkpoint/resume
- P2.4 — deterministic completion ledger + whole-site completeness certification
- P2.5 — deterministic crawl-history/comparison and change-detection foundation.

P1 live-provider activation remains separately authorized. P2.1–P2.5 do not imply live crawl execution, sitemap fetching, persistence, scheduler/autonomous operation or publication.

## Next safe engineering milestone

**P2.6 — Incremental Recrawl Planner.**

Initial P2.6 should remain pure/default-off and network-free. It should consume verified P2.5 comparison signals plus current inventory/certification lineage and deterministically plan a finite recrawl candidate set without executing requests or persisting jobs.

At minimum P2.6 should define and test:
- exact same-site/source-lineage preconditions;
- deterministic candidate reasons and priority ordering;
- newly added URLs as strong recrawl candidates;
- sitemap `lastmod` changes as recrawl signals when supplied;
- unresolved aggregate failure/certification regression signals without fabricating per-URL attribution;
- stale/freshness inputs only when supplied by an explicit trusted input contract;
- bounded maximum candidate count and hard safety ceilings;
- dedupe/stable ordering/fingerprinting;
- explicit reason when aggregate evidence cannot safely identify a concrete per-URL candidate;
- closed execution/network/persistence/scheduler/provider/public-write authorization.

P2.6 must not infer HTTP/content/canonical/indexability changes that P2.5 cannot prove. It must not silently activate live crawling, sitemap fetching, persistence/DDL, scheduler/worker/batch/retry execution, competitor collection, Task #75 live-provider stages, provider/public-site writes or publication.

Generic `continue` may advance the pure/default-off P2.6 engineering workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit sync and docs closeout. It does **not** authorize live crawl/provider activity, persistence, DDL, scheduler/worker activation, competitor execution, provider/public-site writes or publication.

## Resume rule

At every new session:
1. independently resolve GitHub `main` SHA/tree and current CI;
2. read `AGENTS.md`;
3. read this `CURRENT_STATE.md`;
4. read `MASTER_COMPLETION_ROADMAP.md`;
5. read `ARCHITECTURE.md` and `PROJECT_HANDOFF.md`;
6. read `.agents/skills/seo-engine-project/SKILL.md`;
7. read `.agents/memory/MEMORY.md` plus Task #75 and P2.1/P2.2/P2.3/P2.4/P2.5 closeouts;
8. read program issue #139 and the active task issue/PR;
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before sync/publish.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence, or external/provider/public-site activity.
