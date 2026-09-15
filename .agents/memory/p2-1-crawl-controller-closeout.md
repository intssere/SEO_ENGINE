# P2.1 — Full-Site Crawl Controller Architecture closeout

## Status
Engineering-complete, CI-certified, merged to canonical GitHub `main`, and Git-only synchronized to Replit. Not published.

Authoritative issue: #145  
Implementation PR: #146

## Certified implementation lineage
- starting `main`: `e0f868767a94ddf6b68f576bdcb8e3e46b1cd704`
- starting tree: `05295cd1997e246087dc3deb6c3771dfb5870a0f`
- exact tested PR head: `e382edba7da43aaae630d819213feaa5af7a7daf`
- PR CI #249 / run `34893786940`: success
- implementation merge: `aa564d68b1b92fc673ff1a5fa8113aa0321a1a6d`
- implementation tree: `614a71a4a41bafc2423cd922ee1f730f50c1a137`
- post-merge main CI #250 / run `34893997324`: success

PR CI and implementation post-merge CI both passed task tests, full workspace tests, typecheck, and build.

## Closeout docs and final CI stabilization
The P2.1 closeout/docs PR #147 was exact-head certified by CI #251 and merged at:
- closeout docs merge: `902ec2b254e99793bd2a994203a611b8b9353daf`
- tree: `a052002fff2679f275b76ffdbf7f99b4a65dc1ab`

Post-merge CI #252 / run `34944221138` then exposed one latent time-dependent Task #75 test failure:
- file: `artifacts/api-server/src/lib/gsc-oauth-profile.test.ts`
- test: `GSC callback orchestration keeps exact profile identity and uses only injected dependencies`
- error: `OAuth state expired.`

The failure was not caused by P2.1 runtime behavior. PR #147 was documentation-only. Root cause was a test-created GSC OAuth state pinned to `2026-09-15T00:00:00.000Z` while production callback validation correctly used the actual wall clock. Once the short-lived state aged beyond its TTL, the success test became stale.

Blocker issue #148 and PR #149 corrected only the test clock coupling:
- exact fix head: `cd1290b02e3a38b5b4006bd7820de598cd95ea55`
- diff: one test file, 2 additions / 2 deletions
- production OAuth TTL/expiry validation unchanged
- PR CI #253 / run `34944593824`: success
- fix merge: `8cbcd43a6f9a1a8ae8f7df8ab98928b6c0779795`
- fix merge tree: `105dc4d87c0c1c1f22c12593b2b78985bec5f545`
- post-merge main CI #254 / run `34944774214`: success

CI #253 and #254 both passed task tests, full workspace tests, typecheck, and build. The incident must be preserved as a test-stability lesson; production OAuth expiry validation was not weakened.

## Final Replit reconciliation
After CI #254, Replit was Git-only synchronized and read-only verified at the final certified main:
- branch: `main`
- HEAD: `8cbcd43a6f9a1a8ae8f7df8ab98928b6c0779795`
- tree: `105dc4d87c0c1c1f22c12593b2b78985bec5f545`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- clean: true
- extra local commit: false.

No publication/redeploy, live crawl/external request, runtime/config/environment mutation, DB/schema/data action, persistence activation, credential/OAuth/provider mutation, safety-gate change, competitor execution/gate change, scheduler/worker/retry action, provider/public-site write, or other non-Git mutation occurred.

## Current first-party crawl baseline discovered during audit
The historical Task #4 standalone crawler package is no longer in the current tree. The active first-party crawler is embedded in the pilot runner.

Current active pilot crawl characteristics:
- production bound: 30 pages
- maximum depth: 2
- same-site normalization for Diamond Shelf
- GET-only
- sequential breadth-first queue
- robots-aware
- no retries
- 10-second request timeout
- 750,000-byte HTML response ceiling
- query strings stripped
- redirect handling delegated to `fetch(..., redirect: "follow")`
- canonical is evidence only, not a dedupe identity
- noindex is observed but does not stop link expansion
- `crawlSite()` itself is in-memory, but the enclosing pilot pipeline persists successful crawl observations.

Competitor acquisition remains a separate subsystem with separate gates, identity, authorization/replay controls, secure transport, robots policy, persistence authorization, and execution routes. P2.1 does not import or widen competitor acquisition.

## P2.1 implementation
Exactly three implementation files were added; existing runtime files were not modified by P2.1:
- `artifacts/api-server/src/lib/crawl-controller.ts`
- `artifacts/api-server/src/lib/crawl-controller.test.ts`
- `artifacts/api-server/src/lib/crawl-controller-integration.test.ts`

### Baseline mode
`baseline` is locked to the current production pilot policy:
- page hard limit: 30
- depth limit: 2
- unlimited: false
- bounded link BFS
- GET-only
- same-origin only
- robots required
- sequential
- no caller override of page hard limit.

An integration test binds those values to the current `PILOT_LIMITS`, preventing accidental drift.

### Full-site planning mode
`full_site` is inventory-driven, never unlimited. A plan requires:
- explicit first-party `siteId`
- normalized HTTPS canonical origin
- explicit finite positive integer `hardPageLimit`
- independently supplied finite positive integer `absolutePageCeiling`
- hard page limit <= absolute ceiling.

`Infinity`, `NaN`, zero, negative, fractional, missing limits, and hard limits above the ceiling fail closed.

The plan records:
- sitemap-first inventory
- internal-link supplementation
- same-origin GET-only policy
- robots enforcement
- canonical dedupe required before execution
- query/trap controls required before execution
- bounded batching required before execution
- concurrency limit required before execution
- per-origin rate limit required before execution
- checkpoint/resume required before execution
- deterministic completion-ledger fields.

Completion-ledger contract:
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

Every plan hard-codes the following false:
- controller execution
- persistence authorization
- scheduler
- autonomous worker
- retry loop
- competitor collection
- competitor persistence
- provider writes
- public-site writes.

Competitor and external targets fail before first-party execution planning.

## What P2.1 did not do
P2.1 did not add a crawler endpoint, execute a crawl, fetch a sitemap, contact an external site, persist observations, modify schema/data, add DDL, enable a scheduler/worker/retry loop, change competitor gates, write to a provider/public site, or publish/redeploy the application.

## Next safe boundary
Roadmap P2.2 — **Sitemap Inventory / Discovery + Canonical Dedupe Foundation**.

P2.2 should remain pure/default-off initially:
- normalize supplied sitemap XML/text rather than perform built-in network fetches;
- model sitemap index + urlset traversal with bounded depth/document/URL/response-size ceilings;
- enforce exact first-party same-origin identity;
- normalize/canonicalize URLs deterministically;
- dedupe inventory by canonical identity;
- reject cross-origin, credential-bearing, unsupported-scheme and trap-risk entries with explicit reasons;
- integrate only with the P2.1 planning layer;
- no live crawl/sitemap request, persistence, DDL, scheduler/worker, competitor widening, writes, or publication.
