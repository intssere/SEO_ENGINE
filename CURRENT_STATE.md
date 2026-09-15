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

Tasks #74, #75 and roadmap P2.1–P2.6 have **not** been published as application releases. Git-only Replit synchronization does not change the separately attested production source.

## Current engineering state — P2.6 complete

Roadmap **P2.6 — Incremental Recrawl Planner v1** is engineering-complete, exact-head CI-certified, merged to GitHub `main`, post-merge CI-certified and Git-only synchronized to Replit.

Authoritative task:
- issue #162 — P2.6 Incremental Recrawl Planner v1
- implementation PR #163

Certification lineage:
- P2.5 baseline main: `a177c4590273da29113af75b431d6ae20c7e3b4c`
- exact tested P2.6 head: `1553430a96bec277009a458d704dcdf5f5f4795f`
- PR CI #273 / run `35005645661`: success
- implementation merge: `cdc272ea33b5e937662f85543fde9928175777bf`
- implementation tree: `227da28f22bc0047a71227f4fd01925a2011f717`
- post-merge main CI #274 / run `35005842971`: success

Both P2.6 certification runs passed the task gate, full workspace tests, typecheck and build.

Detailed records:
- `.agents/memory/p2-5-crawl-history-closeout.md`
- `.agents/memory/p2-6-incremental-recrawl-planner-closeout.md`

## Replit engineering workspace

After P2.6 post-merge CI #274, Replit was reconciled Git-only and read-only verified at:
- branch: `main`
- HEAD: `cdc272ea33b5e937662f85543fde9928175777bf`
- tree: `227da28f22bc0047a71227f4fd01925a2011f717`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit on `main`: false

A previously unpushed P2.5 documentation closeout commit is intentionally preserved for audit on local branch `p2-5-crawl-history-closeout-docs` at `d2f5d94f7d23b08fcb9de47ba91f12f490dc5732`. Its failed push was not force-retried and the branch was not rewritten or discarded; equivalent/superseding closeout records are being reconciled through GitHub-first review.

No publish/redeploy, app run, runtime/config/environment mutation, DB/schema/data action, credential/OAuth/provider action, live crawl/sitemap/provider/public-site/competitor request, scheduler/worker/batch/retry activation, persistence action or public-site/provider write occurred during the P2.5/P2.6 engineering or Git reconciliation.

## Current first-party crawler reality

The active published production/pilot crawler remains the historical bounded pilot implementation. P2.1–P2.6 are engineering foundations and do not activate a new runtime.

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

No real GSC OAuth client/secret, OAuth consent, delegated token, `sites.list`, Search Analytics call, real property binding, Task #70 live execution or GSC evidence persistence has been authorized by P2.6.

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
- P2.6 — incremental recrawl planning.

P1 live-provider activation remains separately authorized. P2.1–P2.6 do not imply live full-site crawl execution, sitemap network fetching, persistence, scheduled crawling, autonomous operation or publication.

## Next safe engineering milestone

**P2.7 — URL Explorer API/query model.**

Initial P2.7 should remain read-only/default-off and should not require live crawling or new persistence. It should define a governed URL-level exploration/query model over already supplied or retained first-party crawl artifacts. The first implementation should establish and test:

- exact first-party site/origin and artifact-lineage binding;
- stable URL identity and normalized URL fields;
- deterministic filtering, sorting and pagination contracts;
- bounded query limits and cursor/page semantics;
- URL-level inventory membership and sitemap metadata where actually retained;
- URL-level recrawl-plan membership/reason/priority where supplied by P2.6;
- explicit aggregate-only/unavailable fields for facts P2.1–P2.6 do not retain per URL;
- sanitized response models with no raw XML/HTML/provider payloads, tokens, secrets or credentials;
- read-only authorization/capability state;
- deterministic query/result fingerprints where appropriate;
- no hidden live fetch, persistence mutation or write path.

P2.7 must not fabricate per-URL HTTP/content/canonical/indexability facts absent from upstream artifacts, and must not silently activate live crawling, sitemap fetching, persistence/DDL, scheduler/worker/batch/retry execution, competitor collection, Task #75 live-provider stages, provider/public-site writes or publication.

Generic `continue` may advance the pure/read-only P2.7 engineering workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit sync and docs closeout. It does **not** authorize live crawl/provider activity, persistence, DDL, scheduler/worker activation, competitor execution, provider/public-site writes or publication.

## Resume rule

At every new session:
1. independently resolve GitHub `main` SHA/tree and current CI;
2. read `AGENTS.md`;
3. read this `CURRENT_STATE.md`;
4. read `MASTER_COMPLETION_ROADMAP.md`;
5. read `ARCHITECTURE.md` and `PROJECT_HANDOFF.md`;
6. read `.agents/skills/seo-engine-project/SKILL.md`;
7. read `.agents/memory/MEMORY.md` plus Task #75 and P2.1–P2.6 closeouts;
8. read program issue #139 and the active task issue/PR;
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before sync/publish.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence or external/provider/public-site activity.
