# P11.10 — synthetic load/scale certification

## Scope

P11.10 certifies bounded engineering scale for the current SEO ENGINE pure-function architecture.

It does **not** generate production traffic and does not change any live runtime limit.

The dedicated scale gate exercises:

- sitemap inventory normalization;
- full-site crawl batch planning;
- URL Explorer full-inventory filtering/sorting/paging;
- opportunity/recommendation generation over a large supplied page-query signal set;
- read-scheduler projection.

All inputs are generated locally in memory. No network client, database client, provider credential, public site, scheduler, worker, deployment or production runtime is used.

## Certified target envelope

### URL/site envelope

P11.10 uses the existing architectural maximum rather than raising it:

- **25,000 canonical URLs per site**;
- sitemap inventory absolute URL limit remains 25,000;
- URL Explorer absolute offset limit remains 25,000;
- crawl execution batch size remains 250;
- 25,000 URLs therefore partition into exactly **100 deterministic batches**;
- sitemap document ceiling remains 1,024;
- concurrency, request-rate, timeout, redirect and retry ceilings remain unchanged.

### Query/search envelope

P11.10 uses:

- **100,000 synthetic page-query signal rows per site**;
- at most **25,000 materialized opportunity candidates** in the benchmark fixture.

This is an internal processing target.

It does **not** raise any provider request limit. In particular:

- DataForSEO keyword request contract remains **50 keywords/request**;
- no live provider request is made by the benchmark.

### Scheduler envelope

The existing P9.1 bound remains:

- **100 read schedules per projection**.

The scale run exercises that exact maximum without activating timers, queue reservation, durable enqueue or workers.

## Scale scenarios

### 1. Sitemap inventory

The benchmark constructs one synthetic same-origin sitemap containing exactly 25,000 canonical product URLs.

Checks:

- completeness is true;
- hard-limit state is false;
- 25,000 unique URLs are retained;
- duplicate count is zero;
- deterministic inventory fingerprint is retained.

This exercises the real `buildSitemapInventory()` parser/normalizer.

### 2. Full-site execution-plan partitioning

The benchmark passes the 25k inventory through the real `planFullSiteCrawlExecution()` pure planner.

Checks:

- 25,000 URLs remain represented;
- exactly 100 batches are produced at batch size 250;
- network execution remains disabled;
- deterministic plan/batch fingerprints are retained.

No crawl request is sent.

### 3. URL Explorer

The benchmark passes the full 25k inventory through the real `queryUrlExplorer()` model.

Checks:

- total matched = 25,000;
- one page returns exactly 500 rows;
- deterministic result fingerprint is retained;
- network/crawl/provider authorization remains false.

### 4. Opportunity engine

The benchmark constructs:

- 25,000 synthetic crawl-page signals;
- 100,000 synthetic GSC/page-query signals.

Exactly the first 25,000 query rows are shaped as bounded striking-distance candidates. The remaining 75,000 rows exercise the scan without materializing recommendations.

Checks:

- all 100,000 query rows are processed as supplied input;
- exactly 25,000 candidates are materialized;
- candidate type remains `striking_distance`;
- complete candidate-key/score fingerprinting is deterministic.

The benchmark calls the real `generateOpportunityCandidates()` pure function.

### 5. Read scheduler

The benchmark constructs exactly 100 normalized read schedules and evaluates one supplied reference time through the real `buildReadQueueProjection()` model.

Checks:

- 100 schedules are evaluated;
- 100 deterministic proposed intents are produced in the supplied fixture;
- scheduler activation remains false.

## Performance budgets

P11.10 budgets are deliberately **catastrophic-regression guards**, not latency SLOs.

| Budget | Ceiling |
|---|---:|
| Individual scenario elapsed time | 20,000 ms |
| Combined five-scenario elapsed time | 45,000 ms |
| Process heap-used observation per scenario | 768 MiB |

Why the budgets are loose:

- shared CI runners vary;
- P11.10 is intended to detect algorithmic blow-ups, runaway materialization or gross scale regressions;
- P11.10 does not claim production p50/p95/p99 latency;
- P11.10 does not claim production capacity or concurrency.

The deterministic certification fingerprint intentionally excludes noisy elapsed-time and heap observations. It includes:

- target counts;
- budget definitions;
- output counts;
- deterministic correctness fingerprints;
- fail/pass blocker state;
- safety semantics.

Therefore two healthy runs with different timing noise produce the same certification fingerprint.

## CI integration

The API package adds:

`pnpm --filter @workspace/api-server test:scale`

Canonical GitHub CI runs the scale gate:

1. after the normal workspace test suite;
2. before Playwright/Chromium;
3. before typecheck/build completion.

The normal unit-test glob keeps only lightweight P11.10 contract tests. The 25k/100k workload runs separately so it does not compete with the rest of the Node test runner.

## Safety contract

The P11.10 capability explicitly denies:

- production load generation;
- public-site crawling;
- provider/API load;
- provider requests;
- Production DB benchmarking;
- database reads/writes/DDL/DML;
- destructive retention tests;
- scheduler activation;
- worker activation;
- Task #51/#53/#54 execution;
- P9.8 implementation/activation;
- autonomous mutation;
- runtime/config mutation;
- secret mutation;
- deployment;
- publication.

The profile source contains no `fetch()`, PostgreSQL client or child-process launcher.

## Relationship to P11.1

P11.1 remains the frontend build-asset and local-browser performance budget gate.

P11.10 does not replace or weaken P11.1.

The two milestones cover different dimensions:

- P11.1 — frontend bundle and synthetic route timing regression;
- P11.10 — backend/pure-model data-volume scale.

Both must remain green.

## Limitations

P11.10 does not prove:

- production database throughput;
- production provider throughput;
- network crawl throughput;
- provider quota sufficiency;
- production memory limits;
- production horizontal scaling;
- production concurrency behavior;
- production queue/worker capacity;
- production p95/p99 latency;
- production uptime/SLA.

Those require later production-safe operational certification.

## Acceptance

P11.10 is complete only when:

1. scale contract tests pass;
2. dedicated 25k/100k scale profile passes;
3. correctness/count assertions pass;
4. no existing safety ceiling is raised;
5. full workspace suite passes;
6. canonical 110-test Chromium suite remains green;
7. full typecheck passes;
8. build and P11.1 budgets pass;
9. exact-head PR CI is green;
10. exact tested head is merged;
11. post-merge main CI is green;
12. Replit is Git-only reconciled;
13. Replit non-browser validation is run where the environment permits;
14. durable closeout marks P11 enterprise hardening complete;
15. no production load, provider traffic, DB mutation, scheduler/worker activation, deployment or publication occurs.

## Next boundary

After P11.10 closes, the safe roadmap boundary advances to **P12 — final production certification**.

P12 remains separately governed. Completing P11.10 does not authorize any live integration, production crawl, provider activation, autonomous execution, deployment or publication.

## Canonical implementation certification evidence

The first canonical PR run intentionally exposed a real scale defect rather than being hidden by relaxed budgets.

### Stabilization history

Initial CI #654 / run `35626527851`:

- legacy/schema/bootstrap checks: PASS;
- normal workspace tests: PASS;
- P11.10 scale gate: FAIL before Chromium/typecheck/build;
- observed assertion: **50,000 materialized candidates vs 25,000 target**;
- the run spent roughly 58 seconds before the assertion surfaced.

Root cause analysis found two separate facts:

1. the first stress fixture caused each qualifying page-query signal to produce both a striking-distance and an internal-link candidate, so the fixture produced 50,000 valid candidates rather than the intended 25,000;
2. more importantly, internal-link source selection used `eligibleCrawlPages.filter(...).slice(0, 3)`, which scanned every eligible crawl page for every qualifying query even though only the first three matching source pages were required.

The performance repair replaced that full-array scan with an ordered loop that stops after three matching sources. This preserves the exact previous first-three selection semantics while preventing unnecessary whole-inventory scanning after the required three matches are found.

A dedicated regression test proves that when five matching source pages are available, the same first three crawl-page/evidence records are selected in original order.

The stress fixture was also corrected so 12,500 qualifying query rows each produce exactly:

- one `striking_distance` candidate; and
- one `internal_link` candidate;

for a total of 25,000 bounded candidates while all 100,000 query-signal rows are still scanned.

### Optimized exact-head evidence

Exact implementation head:

- SHA: `a59854b5e5663adcf282120d058f4a167cb8cfc7`;
- tree: `561fc249c2f91de8b1b9a3e9e93c8a5091c0283b`;
- exact-head CI #657 / run `35627054602`: **success** before this documentation-only evidence append.

Canonical P11.10 profile from CI #657:

| Scenario | Input rows | Output rows | Elapsed | Heap used |
|---|---:|---:|---:|---:|
| Sitemap inventory | 25,000 | 25,000 | 231.322 ms | 54.55 MiB |
| Crawl execution plan | 25,000 | 100 batches | 66.784 ms | 54.94 MiB |
| URL Explorer | 25,000 | 500-page output | 196.240 ms | 33.73 MiB |
| Opportunity engine | 100,000 | 25,000 candidates | 230.854 ms | 98.56 MiB |
| Read scheduler | 100 | 100 schedules | 12.524 ms | 91.50 MiB |

Combined measured scenario time: **737.724 ms**.

Highest observed heap-used measurement: **98.56 MiB**, well below the 768 MiB catastrophic-regression guard.

Certification fingerprint:

`99c9910efd2474573f5ffd060bd24cea276aa337adfdf57140679e6ae6fdb20c`

All scale scenarios reported zero blockers and `certifiedSynthetic=true`.

The same exact-head CI also passed:

- **1,250 workspace tests / 0 failures** across the reported package groups;
- API package: **1,063/1,063**;
- canonical Chromium: **110/110**;
- full typecheck;
- full build;
- P11.1 asset budgets:
  - JS 611,156 raw / 175,333 gzip;
  - CSS 186,332 raw / 31,020 gzip.

These measurements are engineering evidence from one GitHub shared-runner execution. They are not production latency, throughput, capacity, concurrency, SLA or hosting-size guarantees.
