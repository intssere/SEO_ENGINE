# P2.4 — Crawl Completion Ledger and Whole-Site Certification Foundation closeout

## Status
Engineering-complete, exact-head CI-certified, merged to canonical GitHub `main`, post-merge CI-certified, and Git-only synchronized to Replit at the implementation merge. Not published. No live sitemap request, crawl, provider request, persistence, scheduler/worker execution, or public-site/provider write occurred.

Authoritative issue: #157  
Implementation PR: #158

## Certified lineage
- starting `main`: `3708bd13252c5ece0876910328ae66190e8528f1`
- starting tree: `ad321a7a8a026d56c76d813f3e4a3bb8ffab050e`
- exact tested PR head: `9db5ec1bdd3337c0dd20ff3015e2143ddbfe7528`
- PR CI #267 / run `34996859850`: success
- implementation merge: `977ea26dc823bc21e8371ddac0d35e3b702907f0`
- implementation tree: `65566cbc1f91c6e8c2e6413853760c9cecfdc34b`
- post-merge main CI #268 / run `34997071122`: success

PR CI #267 and post-merge CI #268 both passed the task gate, full current workspace tests, typecheck, and build.

## Replit reconciliation
After post-merge CI #268, Replit was Git-only synchronized and read-only verified at the exact P2.4 implementation merge:
- branch: `main`
- HEAD: `977ea26dc823bc21e8371ddac0d35e3b702907f0`
- tree: `65566cbc1f91c6e8c2e6413853760c9cecfdc34b`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit: false.

No publication/redeploy, app run, runtime/config/environment mutation, DB/schema/data action, credential/OAuth/provider action, live crawl/sitemap/provider/public-site/competitor request, scheduler/worker/batch/retry activation, persistence action, provider/public-site write, or other non-Git mutation occurred.

## Implementation
P2.4 adds exactly three files under the API-server library:
- `full-site-crawl-certification.ts`
- `full-site-crawl-certification.test.ts`
- `full-site-crawl-certification-hardening.test.ts`

It is a pure deterministic certification/accounting layer over certified P2.1/P2.2/P2.3 artifacts. It contains no API route, built-in network transport, persistence path, scheduler, worker, live retry loop, competitor transport, provider client, or public-site mutation path.

### Exact upstream lineage
P2.4 accepts only:
- P2.1 `first_party_crawl_controller_v1` in `full_site` mode;
- a matching P2.2 `first_party_sitemap_inventory_v1` inventory;
- a matching P2.3 `first_party_full_site_crawl_control_v1` execution plan;
- a matching P2.3 `first_party_full_site_crawl_checkpoint_v1` checkpoint.

It revalidates upstream semantics rather than trusting supplied fingerprints alone:
- P2.1 is reconstructed through the canonical planner and compared semantically;
- P2.2 inventory counts, ordering, rejection accounting, completeness, authorization state, and fingerprint are independently checked;
- P2.3 execution-plan/checkpoint integrity validators are called;
- P2.3 execution planning is reconstructed from P2.1 + P2.2 + the certified execution policy and compared exactly;
- site ID, canonical origin, limits, inventory fingerprint, execution-plan fingerprint, and checkpoint lineage must all match.

Any open upstream execution/persistence/scheduler/worker/competitor/provider/public-write authorization fails closed.

## Completion-ledger semantics
The P2.4 artifact is versioned as `first_party_full_site_crawl_certification_v1` and reports:
- `discovered`: accepted URL-entry occurrences plus URL-entry rejections from processed supplied sitemap documents; sitemap-reference rejections do not inflate discovered page counts;
- `eligible`: unique canonical P2.2 inventory URLs;
- `fetchedSuccessful`: P2.3 successful fetch count, including noindex pages;
- `redirects`: terminal classified redirects;
- `canonicalizedDeduplicated`: duplicate accepted sitemap occurrences collapsed into canonical inventory identity;
- `robotsExcluded`: execution-time robots exclusions;
- `inventoryExcluded`: P2.2 URL-entry `excluded_path` rejections;
- `robotsOrExcluded`: explicit reporting aggregate of robots + inventory exclusions;
- `noindex`: subset of `fetchedSuccessful`, never added again to finalized count;
- `failed`: terminal P2.3 failures;
- `finalized`: fetchedSuccessful + redirects + robotsExcluded + failed;
- `pending`: eligible - finalized;
- deterministic bounded `coveragePercent`;
- explicit hard-limit state;
- `wholeSiteCertified`, reason and stable sorted blockers.

## Certification meaning
`wholeSiteCertified=true` is deliberately a **completeness/accounting assertion**, not a claim that the site has zero SEO issues.

Known classified terminal states can coexist with certification when all approved canonical inventory is reconciled:
- redirects;
- robots exclusions;
- noindex pages.

Terminal failures block certification even when `finalized / eligible` is mathematically 100%. This prevents a failed URL from being treated as equivalent to a successfully classified URL.

Empty eligible inventory is mathematically represented as 100% coverage but is explicitly non-certified with `empty_eligible_inventory` in this foundation. Zero-page certification semantics require a future deliberate decision rather than being inferred silently.

## Certification blockers
Stable blockers are:
- `checkpoint_incomplete`
- `coverage_below_100`
- `empty_eligible_inventory`
- `terminal_failures_present`
- `unfinished_batches_remaining`
- `pending_urls_remaining`.

Incomplete/hard-limit-truncated P2.2 inventory is rejected before a certification artifact is produced. Stale/tampered lineage, accounting mismatch, invalid upstream semantics, or unexpectedly open authorization also fail closed.

## Hard-limit semantics
The ledger records:
- P2.2 inventory hard-limit state;
- P2.1 page hard limit;
- P2.1 absolute page ceiling;
- whether eligible inventory numerically reaches the configured page hard limit;
- whether a hard-limit condition actually blocked complete approved-inventory accounting.

Merely having eligible URLs equal to a configured page fuse is not itself treated as proof of truncation; explicit inventory completeness/hard-limit state remains authoritative.

## Determinism and artifact safety
The certification artifact includes deterministic SHA-256 fingerprinting over normalized lineage, ledger, certification semantics, blockers, and closed authorization state.

A separate semantic integrity validator checks reconciliation before fingerprint acceptance, so a caller cannot legitimize inconsistent counts simply by recomputing a fingerprint.

The artifact does not retain raw XML, raw HTML, response bodies, access/refresh tokens, client secrets, credentials, or provider payloads.

## Tests
Acceptance/adversarial coverage proves:
- deterministic certification fingerprints;
- exact P2.1/P2.2/P2.3 lineage;
- success + noindex + robots exclusion + redirect can reconcile to certified complete accounting;
- noindex remains a success subset and is not double-counted;
- terminal 404/failure blocks certification at 100% finalized coverage;
- pending checkpoint produces explicit blockers;
- empty inventory remains explicitly non-certified;
- sitemap-reference rejections do not inflate discovered page count;
- stale/tampered lineage and open authorization fail closed;
- incomplete/hard-limit-truncated inventory cannot enter certification;
- recomputed-fingerprint semantic tampering is rejected;
- source contains no built-in network/socket/DNS/provider/persistence mutation primitive;
- artifact surface has no raw/secret-bearing fields.

One bounded test helper was corrected before PR CI: a fixture using a 2-page P2.1 hard fuse initially inherited a 4-URL batch size, which P2.3 correctly rejects. The fixture was changed to cap batch/concurrency values at the fixture page fuse. Production controls were not weakened.

## What P2.4 did not do
P2.4 did not:
- fetch a sitemap;
- execute a crawl;
- persist a crawl, ledger, observation or evidence record;
- add a crawler/certification API route;
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
Roadmap **P2.5 — Crawl History / Comparison and Change Detection**.

P2.5 should initially remain pure/default-off and network-free. It should compare supplied valid P2.4 certification snapshots/artifacts deterministically and model change history without introducing persistence yet. At minimum it should define exact identity/lineage rules, ordered before/after comparison, inventory additions/removals, classification transitions, coverage/certification changes, deterministic change fingerprints, and fail-closed handling for incomparable/stale/tampered artifacts.

P2.5 must not silently activate live crawling, persistence/DDL, scheduler/autonomous worker, competitor execution, provider/public-site writes, OAuth/provider stages, or publication. Those remain separate authorization boundaries.