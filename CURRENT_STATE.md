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

Tasks #74, #75 and roadmap P2.1–P2.7 have **not** been published as application releases. Git-only Replit synchronization does not change the separately attested production source.

## Current engineering state — P2.7 complete

Roadmap **P2.7 — URL Explorer API/query model v1** is engineering-complete, exact-head CI-certified, merged to GitHub `main`, post-merge CI-certified and Git-only synchronized to Replit.

Authoritative task:
- issue #165 — P2.7 URL Explorer API/query model v1
- certified implementation PR #167
- superseded failed PR #166 is closed unmerged

Certification lineage:
- P2.7 baseline main: `f640eb7c9d017a0e8e6faf4344332b18b1476023`
- baseline tree: `2e201263c28e50133c3d814466d51864dbd1e69a`
- exact tested P2.7 head: `3046ab6f77604be45b175cf793948ea28908d33d`
- PR CI #282 / run `35021282299`: success
- implementation merge: `f8e1d406b4985247f8b115b0105980e32510820e`
- implementation tree: `37190828dde42ceed79e47b121c64f5964ba5968`
- post-merge main CI #283 / run `35021463871`: success

Both P2.7 certification runs passed the P2.7 task gate, full workspace tests, typecheck and build.

A prior alternate P2.7 PR #166 remained open on head `bf9294a3f4bdff1a338194167783ba6f485832f8`; its CI #281 / run `35012502576` failed. It was explicitly closed as superseded after the exact green replacement PR #167 merged. Its code was not merged.

Detailed records:
- `.agents/memory/p2-5-crawl-history-closeout.md`
- `.agents/memory/p2-6-incremental-recrawl-planner-closeout.md`
- `.agents/memory/p2-7-url-explorer-closeout.md`

## Replit engineering workspace

After P2.7 post-merge CI #283, Replit was reconciled Git-only and independently re-inspected at:
- branch: `main`
- HEAD: `f8e1d406b4985247f8b115b0105980e32510820e`
- tree: `37190828dde42ceed79e47b121c64f5964ba5968`
- cached `origin/main`: same SHA/tree
- ahead/behind: `0/0`
- tracked changes: `0`
- untracked files: `0`
- working tree clean: true
- extra local commit on `main`: false

A previously unpushed P2.5 documentation closeout commit remains intentionally preserved for audit on local branch `p2-5-crawl-history-closeout-docs` at `d2f5d94f7d23b08fcb9de47ba91f12f490dc5732`. Its failed push was not force-retried and the branch was not rewritten or discarded.

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

## P2.1–P2.4 whole-site control foundations

### P2.1 — crawl controller
Defines immutable 30-page/depth-2 `baseline` planning and separately bounded `full_site` planning. `full_site` requires first-party identity, HTTPS canonical origin, finite page fuse under an independent absolute ceiling, sitemap-first inventory, dedupe, trap controls, bounded batching, checkpoint/resume and completion accounting. Execution/persistence/scheduler/worker/competitor/provider/public-write flags remain false.

### P2.2 — sitemap inventory
Provides network-free supplied-sitemap inventory, bounded `sitemapindex`/`urlset` parsing, strict first-party URL policy, canonical normalization/dedupe, child completeness accounting, hard-limit state, rejection accounting and deterministic sanitized fingerprinting. It does not fetch sitemaps.

### P2.3 — crawl execution control
Provides deterministic inventory-derived batches; finite concurrency/rate/timeout/redirect/retry/trap limits; same-origin HTTPS GET-only request/redirect validation; query/fragment/credential/cross-origin/trap rejection; plan/batch fingerprints; deterministic checkpoint/resume; supplied-outcome advancement; stale/replay/out-of-order/duplicate/foreign outcome rejection; bounded transient retry classification; and semantic integrity checks. It contains no network executor.

### P2.4 — completion ledger and whole-site certification
Creates deterministic `first_party_full_site_crawl_certification_v1` artifacts over exact P2.1/P2.2/P2.3 lineage. It records discovered/eligible/success/redirect/robots/inventory-excluded/noindex/failed/finalized/pending counts, stable coverage, hard-limit state and whole-site certification reasons/blockers. Certification means complete reconciled accounting of approved canonical inventory, not a zero-SEO-issues claim. Terminal failures, incomplete inventory, pending work, unfinished batches, count drift, tampered lineage or open authorization fail closed.

## P2.5 — crawl history/comparison contract

P2.5 provides deterministic same-site comparison over retained P2.2 inventories and P2.4 certifications.

Provable dimensions include:
- canonical inventory additions/removals;
- sitemap `lastmod` additions/removals/changes when supplied;
- aggregate completion-ledger deltas;
- whole-site certification transitions;
- certification blocker added/removed sets;
- bounded lineage/configuration changes affecting comparability;
- deterministic ordering, sanitized output and fingerprinting.

Explicitly unavailable per-URL dimensions remain unavailable rather than inferred:
- HTTP status transitions;
- fetch outcome transitions;
- redirect-target changes;
- canonical-target changes;
- indexability transitions;
- content-fingerprint changes.

P2.5 adds no network, persistence, DDL, scheduler/worker/retry, competitor, provider, write or publication path.

P2.5 lineage:
- issue #160 / PR #161
- exact tested head `646719a4bc0afd30fa6fc5b1049e25862f80eaed`
- PR CI #271 / run `35001858253`: success
- merge `a177c4590273da29113af75b431d6ae20c7e3b4c`
- tree `2d4a2103c9036f5e90032d5f569d01f7e8ecb78f`
- post-merge CI #272 / run `35002068558`: success.

## P2.6 — incremental recrawl planner contract

P2.6 consumes a semantically valid P2.5 comparison plus exact supplied P2.1–P2.4 lineage and produces a deterministic bounded `first_party_incremental_recrawl_plan_v1` artifact only.

Supported planning signals include:
- newly added canonical URLs;
- sitemap `lastmod` changes;
- explicitly supplied trusted first-party high-value URLs;
- explicitly supplied stale URLs;
- explicitly supplied unresolved-issue URLs;
- explicitly supplied GSC-opportunity URLs;
- explicitly supplied URLs affected by recent executions.

The planner provides deterministic reason merging, priority, ordering, dedupe, batching, finite page/batch budgets, included/deferred/excluded accounting and SHA-256 fingerprinting. Budgets cannot exceed P2.1/P2.3 hard-page/absolute ceilings and there is no unlimited mode.

When retained evidence is insufficient for safe targeted planning—such as an aggregate regression with no retained per-URL cause—the planner recommends a bounded full reconciliation instead of fabricating a targeted reason.

P2.6 reconstructs/revalidates the P2.5 comparison and exact supplied upstream artifacts rather than trusting fingerprints alone. Serialized plans have an independent semantic integrity validator.

P2.6 remains execution-disabled and persistence-disabled. It adds no network client, live crawl, sitemap fetch, DDL, scheduler/worker/batch executor, retry activation, competitor collection, provider request/write or publication path.

## P2.7 — URL Explorer query-model contract

P2.7 provides deterministic bounded URL-level exploration over supplied P2.2 inventory plus an optional valid P2.6 incremental-recrawl plan.

Supported retained/provable URL-level fields include:
- stable URL identity;
- canonical URL and normalized pathname;
- sitemap source membership;
- sitemap `lastmod` where actually supplied;
- recrawl status (`selected`, `deferred`, `not_planned`), priority and reasons only when proven by a valid supplied P2.6 plan.

The query model provides:
- exact `siteId` + canonical-origin binding;
- inventory semantic-integrity validation before use;
- optional recrawl-plan semantic-integrity and exact current-inventory lineage validation;
- deterministic text/path/lastmod/sitemap/recrawl filtering;
- deterministic sorting;
- bounded pagination with no unbounded result mode;
- deterministic query/result fingerprints;
- sanitized output;
- explicit closed authorization/capability flags.

The following per-URL facts remain explicitly unavailable rather than inferred because P2.1–P2.7 do not retain them as certified per-URL evidence:
- HTTP status;
- fetch outcome;
- redirect target;
- canonical target;
- indexability;
- content fingerprint.

P2.7 adds no network-facing route, network client, live crawl/sitemap fetch, persistence/DDL, scheduler/worker/batch/retry activation, competitor execution, OAuth/GSC live stage, provider/public-site write or publication path.

P2.7 lineage:
- issue #165 / certified PR #167
- exact tested head `3046ab6f77604be45b175cf793948ea28908d33d`
- PR CI #282 / run `35021282299`: success
- merge `f8e1d406b4985247f8b115b0105980e32510820e`
- tree `37190828dde42ceed79e47b121c64f5964ba5968`
- post-merge CI #283 / run `35021463871`: success.

## Competitor isolation remains mandatory

Competitor crawling/acquisition remains a separate subsystem with separate target identity, secure transport, gates, replay controls and persistence authorization. P2 first-party whole-site foundations do not grant or widen competitor permissions. First-party whole-site permission must never be represented by a generic network/crawler flag that a competitor path can inherit.

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
- P2.7 — bounded read-only URL Explorer query model.

P1 live-provider activation remains separately authorized. P2.1–P2.7 do not imply live full-site crawl execution, sitemap network fetching, persistence, scheduled crawling, autonomous operation or publication.

## Next safe engineering milestone

**P2.8 — Technical issue taxonomy and evidence model expansion.**

Initial P2.8 should remain pure/default-off and should not require live crawling or persistence. The safe first implementation should define and test a deterministic technical-issue/evidence contract that can consume only explicitly supplied, provenance-bound first-party facts. It should establish:

- stable versioned technical issue category/type identifiers;
- bounded severity and confidence semantics that remain distinct from execution risk;
- explicit evidence source/provenance and freshness fields;
- URL/site scope binding and deterministic evidence/issue identity;
- exact fact requirements per issue type so a rule cannot fire when its required fact is unavailable;
- deterministic dedupe/aggregation of repeated evidence;
- explicit `insufficient_evidence` / unavailable states instead of fabricated findings;
- deterministic issue fingerprints suitable for later history/supersession work;
- sanitized outputs with no raw HTML/provider payloads/tokens/secrets/credentials;
- closed authorization/capability state;
- no hidden live fetch, persistence mutation, provider/public-site write or autonomous execution path.

P2.8 must not retroactively pretend P2.1–P2.7 retained per-URL HTTP/indexability/canonical/content facts they do not retain. Tests should use synthetic/supplied evidence fixtures only and fail closed on identity, lineage, provenance or required-fact mismatch.

Generic `continue` may advance the pure/default-off P2.8 engineering workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit sync and docs closeout. It does **not** authorize live crawl/provider activity, persistence, DDL, scheduler/worker activation, competitor execution, provider/public-site writes or publication.

## Resume rule

At every new session:
1. independently resolve GitHub `main` SHA/tree and current CI;
2. read `AGENTS.md`;
3. read this `CURRENT_STATE.md`;
4. read `MASTER_COMPLETION_ROADMAP.md`;
5. read `ARCHITECTURE.md` and `PROJECT_HANDOFF.md`;
6. read `.agents/skills/seo-engine-project/SKILL.md`;
7. read `.agents/memory/MEMORY.md` plus Task #75 and P2.1–P2.7 closeouts;
8. read program issue #139 and the active task issue/PR;
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before sync/publish.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence or external/provider/public-site activity.