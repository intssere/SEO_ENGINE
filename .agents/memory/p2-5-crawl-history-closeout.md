# P2.5 — Crawl History, Comparison, and Change Detection v1 closeout

## Status
Engineering-complete, exact-head CI-certified, merged to canonical GitHub `main`, post-merge CI-certified, and Git-only synchronized to Replit at the implementation merge. Not published. No live sitemap request, crawl, provider request, persistence, scheduler/worker execution, or public-site/provider write occurred.

Authoritative issue: #160  
Implementation PR: #161

## Certified lineage
- starting `main`: `f291c35764206318f51597d14c322c2bdb93a21b`
- starting tree: `679c4ceecb804d8ef4e45d38917a451d3a42053e`
- exact tested PR head: `646719a4bc0afd30fa6fc5b1049e25862f80eaed`
- PR CI #271 / run `35001858253`: success
- implementation merge: `a177c4590273da29113af75b431d6ae20c7e3b4c`
- implementation tree: `2d4a2103c9036f5e90032d5f569d01f7e8ecb78f`
- post-merge main CI #272 / run `35002068558`: success

Both CI runs passed the task gate, legacy PostgreSQL core-schema validation, full current workspace tests, typecheck, and build.

## Replit reconciliation
After post-merge CI #272, Replit was Git-only synchronized and read-only verified at the exact P2.5 implementation merge:
- branch: `main`
- HEAD: `a177c4590273da29113af75b431d6ae20c7e3b4c`
- tree: `2d4a2103c9036f5e90032d5f569d01f7e8ecb78f`
- cached origin/main: same SHA
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit: false.

A first documentation-only closeout commit was created locally by Replit at `d2f5d94f7d23b08fcb9de47ba91f12f490dc5732` / tree `340150a6f4de6c27a2120385dc46fed51901a3e4`, but its push failed because Replit lacked GitHub authentication. It is not canonical. Canonical closeout documentation was therefore transferred through the connected GitHub workflow.

No publication/redeploy, app run, runtime/config/environment mutation, DB/schema/data action, credential/OAuth/provider action, live crawl/sitemap/provider/public-site/competitor request, scheduler/worker/batch/retry activation, persistence action, provider/public-site write, or other non-Git mutation occurred.

## Implementation
P2.5 adds exactly three implementation/test files under the API-server library:
- `crawl-history-comparison.ts`
- `crawl-history-comparison.test.ts`
- `crawl-history-comparison-hardening.test.ts`

It is a pure deterministic comparison layer over supplied P2.2 sitemap-inventory and P2.4 full-site-certification artifacts. It contains no API route, built-in network transport, persistence path, DDL, scheduler, worker, live retry loop, competitor transport, provider client, or public-site mutation path.

## Comparison contract
The P2.5 artifact is versioned as `first_party_crawl_history_comparison_v1`.

It requires:
- valid P2.2 `first_party_sitemap_inventory_v1` inventory for each side;
- valid P2.4 `first_party_full_site_crawl_certification_v1` certification for each side;
- exact inventory-to-certification lineage within each source;
- same `siteId` and same canonical HTTPS origin across before/after sources.

Cross-site or cross-origin comparisons fail closed.

## Proven change dimensions
P2.5 can deterministically report:
- canonical inventory URLs added;
- canonical inventory URLs removed;
- sitemap `lastmod` changes for unchanged URLs when those values are supplied upstream;
- unchanged membership count;
- aggregate P2.4 completion-ledger deltas;
- before/after whole-site certification state;
- certification blockers added and removed;
- inventory fingerprint changes;
- execution-plan fingerprint changes;
- checkpoint fingerprint changes;
- checkpoint-sequence delta;
- page-hard-limit changes;
- absolute-page-ceiling changes;
- hard-limit-blocked transitions;
- deterministic summary booleans and SHA-256 comparison fingerprint.

Ordering is stable and deterministic.

## Explicit evidence boundary
P2.1–P2.4 do not retain enough per-URL fetch/content evidence to prove URL-specific transitions for:
- `http_status`;
- `fetch_result`;
- `canonical_target`;
- `indexability`;
- `content_fingerprint`.

P2.5 therefore declares `perUrlOutcomeComparisonAvailable=false` with the reason `upstream_p2_1_to_p2_4_do_not_retain_per_url_fetch_or_content_outcomes`.

This is a required safety/data-quality boundary: missing evidence must never be converted into an invented URL-specific change signal. P2.6 and later automation may use only evidence that its inputs actually prove unless a later observation/evidence contract supplies additional verified per-URL data.

## Integrity and safety
P2.5 independently checks supplied inventory semantics and fingerprint integrity and calls the P2.4 certification integrity validator. It rejects inconsistent inventory/certification lineage.

The comparison artifact has its own deterministic fingerprint and semantic integrity checks. Tampered summary state or a recomputed/incorrect fingerprint is rejected.

All authorization/capability flags remain false/default-off:
- network execution;
- crawl execution;
- sitemap network fetching;
- persistence;
- scheduler;
- batch executor;
- autonomous worker;
- retry loop;
- provider writes;
- public-site writes.

Static hardening tests prohibit built-in network primitives, persistence mutation primitives, and raw/secret-bearing artifact fields such as raw HTML/XML, response bodies, access/refresh tokens, client secrets and credential fields.

## What P2.5 did not do
P2.5 did not:
- fetch a sitemap;
- execute a crawl;
- compare unrecorded per-URL HTTP/content/indexability outcomes;
- persist history/comparison/observation/evidence records;
- add a history API route;
- modify schema or data;
- add DDL;
- enable runtime/environment gates;
- enable scheduler/worker/batch/retry execution;
- widen competitor acquisition permissions;
- perform Google/provider requests;
- create/use credentials or delegated OAuth tokens;
- perform provider/public-site writes;
- publish or redeploy the application.

## Next safe boundary
Roadmap **P2.6 — Incremental Recrawl Planner**.

P2.6 should initially remain pure/default-off and network-free. It should consume verified P2.5 comparison signals plus current inventory/certification lineage and deterministically plan a finite recrawl candidate set without executing requests or persisting jobs.

Strong URL-specific signals available now include newly added inventory URLs and supplied sitemap `lastmod` changes. Aggregate failure/certification regressions may influence planner state, but must not be falsely attributed to a specific URL. Any freshness, content, GSC, unresolved-issue, recent-execution or high-value-page signals must enter through an explicit trusted input contract if used.

P2.6 must preserve bounded candidate counts, stable ordering, deterministic fingerprints, exact first-party identity, closed execution/persistence/scheduler/write authorizations and the same competitor isolation. It must not silently activate live crawling, persistence/DDL, scheduler/autonomous execution, provider/public-site writes, OAuth/provider stages, or publication.
