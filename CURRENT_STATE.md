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

Tasks #74, #75, P2.1 and P2.2 have **not** been published. Git-only Replit synchronization does not change the separately attested production application source.

## Current engineering state — P2.2 implementation complete

Roadmap **P2.2 — Sitemap Inventory / Discovery + Canonical Dedupe Foundation** is engineering-complete, exact-head CI-certified, merged to GitHub `main`, post-merge CI-certified and Git-only synchronized to Replit.

Authoritative issue:
- issue #151

Implementation PR:
- PR #152
- exact tested head: `b30e0b16bcf198a0e484b77712682ede13e6ab85`
- PR CI #258 / run `34989940853`: success
- implementation merge: `7822504b1d5cf6bbd9f1a5f797320526830978b4`
- implementation tree: `f7bab25db2d3b0ab0e2c45ecc52b1a961cb82d6e`
- post-merge main CI #259 / run `34990146084`: success

Both green certification runs passed task tests, full workspace tests, typecheck and build.

Detailed engineering record:
- `.agents/memory/p2-2-sitemap-inventory-closeout.md`

### CI #257 fixture incident
PR CI #257 / run `34989513456` passed P2.2 task tests but failed one full-workspace assertion. The implementation was not merged.

The failing fixture treated `&amp;unknown;` as an undefined XML entity. That is not correct XML semantics: `&amp;` decodes once to a literal `&`, so the content represents literal text `&unknown;`. The test was corrected to use raw `&unknown;`, which is the actual unsupported entity-reference case. Parser/runtime behavior was not weakened. The corrected exact head then passed CI #258 fully.

## Replit engineering workspace

After post-merge CI #259, Replit was Git-only synchronized and read-only verified at the exact P2.2 implementation merge:
- branch: `main`
- HEAD: `7822504b1d5cf6bbd9f1a5f797320526830978b4`
- tree: `f7bab25db2d3b0ab0e2c45ecc52b1a961cb82d6e`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit: false

No publication/redeployment, application run, live sitemap/crawl/provider/public-site request, runtime/config/environment mutation, DB/schema/data action, persistence activation, credential/OAuth/provider mutation, safety-gate change, competitor action, scheduler/worker/batch/retry action, provider/public-site write, or other non-Git mutation occurred.

A docs-only closeout merge may advance GitHub/Replit `main` beyond this implementation SHA without changing application behavior. Always independently resolve current `main` before acting.

## Current first-party crawler reality

The historical Task #4 standalone crawler package is no longer in the current tree. The active first-party crawler remains embedded in the pilot runner and is unchanged by P2.1/P2.2.

Current active pilot behavior remains:
- production bound: 30 pages
- maximum depth: 2
- GET-only
- sequential breadth-first crawl
- robots-aware
- no retries
- 10-second request timeout
- maximum HTML response: 750,000 bytes
- same-site normalization for Diamond Shelf
- query strings stripped
- redirects delegated to `fetch(..., redirect: "follow")`
- canonical extracted as evidence only in the pilot runtime
- noindex observed but does not stop pilot link expansion
- `crawlSite()` itself is in-memory, while the enclosing guarded pilot may persist successful crawl observations under its separate controls.

The 30-page behavior is the **baseline** mode. It is not the intended whole-site production ceiling.

## P2.1 crawl-controller contract

P2.1 is complete and remains the governing first-party planning contract.

### `baseline`
- immutable page hard limit: 30
- immutable depth limit: 2
- `unlimited=false`
- bounded link BFS
- same-origin GET-only
- robots required
- sequential
- caller cannot widen limits.

### `full_site`
Inventory-driven, never unlimited. It requires:
- explicit first-party `siteId`
- normalized HTTPS canonical origin
- finite positive integer `hardPageLimit`
- independent finite positive integer `absolutePageCeiling`
- hard page limit <= absolute ceiling.

It records required-before-execution controls for sitemap-first inventory, canonical dedupe, query/trap controls, bounded batching, concurrency, per-origin rate limiting, checkpoint/resume and deterministic completion accounting.

Every P2.1 plan keeps controller execution, persistence, scheduler, autonomous worker, retry loop, competitor collection/persistence, provider writes and public-site writes false.

## P2.2 sitemap inventory contract

P2.2 supplies the deterministic inventory layer required by P2.1 `full_site`. It is **network-free** and accepts supplied sitemap documents only.

### Binding and finite controls
A P2.2 inventory build requires a valid P2.1 `first_party_crawl_controller_v1` plan in `full_site` mode. Baseline/non-first-party contexts fail closed.

Explicit planning ceilings are required for:
- sitemap document count
- sitemap nesting depth
- UTF-8 bytes per document
- unique inventory URLs
- path segments.

Code absolute ceilings are:
- 1,024 sitemap documents
- depth 8
- 50,000,000 bytes/document
- 25,000 inventory URLs
- 64 path segments.

The configured inventory URL limit must not exceed the P2.1 crawl plan page hard fuse. Infinity, NaN, fractional, negative and above-absolute values fail closed.

### XML/parser boundary
The narrow dependency-free sitemap parser:
- supports `sitemapindex` and `urlset` roots only
- rejects DTD/entity declarations
- rejects malformed/multiple roots and bad nesting/attribute syntax
- supports namespace-prefixed sitemap elements by local name
- decodes built-in/numeric XML entities once
- captures only direct sitemap/page `loc` and page `lastmod`
- prevents nested extension locs such as `image:loc` from replacing page identity
- never includes raw XML in normalized result/fingerprint state.

### First-party URL and trap policy
Inventory/document URLs enforce:
- HTTPS only
- no embedded credentials
- exact canonical origin
- no fragments
- no query strings at this foundation stage
- exclusion of utility/trap paths `/cart`, `/checkout`, `/account`, `/apps`
- configured path-segment ceiling
- deterministic slash/trailing-slash normalization.

Explicit rejection reasons include invalid URL, unsupported scheme, credentials, cross-origin, fragment, query, excluded path, path-depth excess, sitemap-depth excess and inventory-limit reached.

### Determinism and completeness
P2.2:
- traverses only supplied sitemap documents
- records missing supplied children rather than fetching them
- deduplicates by normalized canonical URL identity
- merges/sorts source sitemap provenance
- retains latest valid normalized `lastmod`
- records supplied/processed/referenced documents, accepted/duplicate/unique URLs, sorted rejections and per-reason counts
- records completeness reasons and hard-limit state
- produces deterministic SHA-256 fingerprinting over sanitized normalized state.

Every result hard-codes false for network fetching, crawl execution, persistence, scheduler, batch executor, autonomous worker, retry loop, competitor collection/persistence, provider writes and public-site writes.

## Competitor isolation remains mandatory

Competitor crawling/acquisition remains a separate subsystem with separate target identity, gates, authorization/replay controls, secure transport, robots policy, persistence authorization and execution boundaries.

P2.1/P2.2 first-party whole-site capabilities do not import, enable or widen competitor acquisition. A generic crawler/network flag must never grant competitor permissions.

## GSC live-provider boundary remains closed

Task #75 remains engineering-complete but unpublished. Its GSC transport remains intentionally unbound/default-off.

Exact GSC identity remains:
- profile: `gsc_read_only_v1`
- provider: `google`
- external account ID: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported property: `sc-domain:<domain>`
- accepted permissions: `siteRestrictedUser`, `siteFullUser`.

No real GSC OAuth client/secret, OAuth consent, delegated token, `sites.list`, Search Analytics call, real property binding, Task #70 live execution or GSC evidence persistence has been authorized by P2.2.

## Current safety boundary

Unless a later task explicitly authorizes otherwise, keep closed/default-off:
- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `GSC_READONLY_OAUTH_RUNTIME_ENABLED=false`
- first-party `full_site` live network execution=false
- first-party sitemap network fetching=false
- first-party full-site persistence=false
- competitor execution/collection/evidence persistence=false
- Task #72 credential/scope/property/network/live-read readiness=false
- Task #73 first-live-read readiness=false
- provider/public writes=false
- observation/evidence persistence=false
- scheduler/batch/autonomous-worker/retry execution=false.

## Master roadmap status

Program tracker: issue #139. Keep it open until final production completion certification.

Completed engineering foundations now include:
- P1.1 / P1.2 — Task #75 GSC profile isolation
- P2.1 — first-party baseline/full-site crawl-controller planning
- P2.2 — supplied-sitemap inventory/discovery normalization + canonical dedupe foundation.

P1 live-provider activation remains separately authorized. P2.1/P2.2 do not imply live crawl execution or sitemap fetching.

`MASTER_COMPLETION_ROADMAP.md` may still show the previous P2.2 `NEXT` label until the next roadmap-status maintenance edit; this `CURRENT_STATE.md` checkpoint and independently verified GitHub state take precedence for mutable task status.

## Next safe engineering milestone

**P2.3 — Batched crawler, rate limits, trap guards, checkpoints/resume.**

Initial P2.3 should remain first-party-only and default-off. It should compose P2.1 + P2.2 into a bounded execution architecture that defines and tests:
- finite batch sizing and page-budget consumption
- bounded concurrency
- explicit per-origin rate/request budgets
- secure redirect handling and same-origin revalidation
- query/filter/session/calendar/facet/trap guards beyond the P2.2 inventory exclusions
- deterministic checkpoint/resume state
- replay/idempotency expectations
- bounded retry classification/backoff policy for safe transient reads
- halt/fuse behavior and resumable terminal states
- handoff fields required by P2.4 completion-ledger/whole-site certification.

P2.3 must not silently activate live crawling, sitemap network fetching, persistence, DDL, scheduler/autonomous worker, competitor execution, provider/public-site writes or publication. Any real first-party network execution remains a separate explicit authorization boundary.

Generic `continue` may advance the pure/default-off P2.3 engineering workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit sync. It does **not** authorize live sitemap/crawl requests, persistence, DDL, scheduler/worker activation, competitor execution, provider/public-site writes, Task #75 live-provider stages, or publication.

## Resume rule

At every new session:
1. independently resolve GitHub `main` SHA/tree and current CI;
2. read `AGENTS.md`;
3. read this `CURRENT_STATE.md`;
4. read `MASTER_COMPLETION_ROADMAP.md`;
5. read `ARCHITECTURE.md` and `PROJECT_HANDOFF.md`;
6. read `.agents/skills/seo-engine-project/SKILL.md`;
7. read `.agents/memory/MEMORY.md` plus Task #75, P2.1 and P2.2 closeouts;
8. read program issue #139 and the active task issue/PR;
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before sync/publish.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence, or external/provider/public-site activity.
