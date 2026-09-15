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

Tasks #74, #75 and roadmap P2.1–P2.6 have **not** been published as application releases. Git merge or Git-only Replit reconciliation does not change the separately attested production source.

## Current canonical engineering state — P2.6 implementation complete

Roadmap **P2.6 — Incremental Recrawl Planner v1** is engineering-complete, exact-head CI-certified, merged to GitHub `main`, and post-merge CI-certified.

Authoritative issue:
- issue #162

Implementation lineage:
- implementation PR #163
- exact tested head: `1553430a96bec277009a458d704dcdf5f5f4795f`
- PR CI #273 / run `35005645661`: success
- implementation merge: `cdc272ea33b5e937662f85543fde9928175777bf`
- implementation tree: `227da28f22bc0047a71227f4fd01925a2011f717`
- post-merge main CI #274 / run `35005842971`: success

Both green certification runs passed task tests, the full current workspace suite, typecheck and build.

Detailed records:
- `.agents/memory/p2-5-crawl-history-closeout.md`
- `.agents/memory/p2-6-incremental-recrawl-planner-closeout.md`

## Replit engineering workspace — reconciliation required

Before the P2.6 merge, read-only inspection found Replit clean on local branch `p2-5-crawl-history-closeout-docs` at docs-only commit:
- local HEAD: `d2f5d94f7d23b08fcb9de47ba91f12f490dc5732`
- parent: P2.5 implementation merge `a177c4590273da29113af75b431d6ae20c7e3b4c`
- cached `origin/main`: `a177c4590273da29113af75b431d6ae20c7e3b4c`
- ahead/behind: `1/0`
- working tree clean: true
- changed files in that local commit: continuity/docs only.

That local commit was never present on GitHub and must not be treated as canonical. Its P2.5 closeout semantics are now reconstructed on the GitHub-authoritative P2.6 closeout branch. Replit must be reconciled to the final certified GitHub `main` only after this docs closeout is merged and certified. Do not discard or overwrite unexpected Replit work blindly; verify exact branch/HEAD/tree/ahead-behind before reconciliation.

No application publication/redeployment or live runtime/provider/database activity is authorized by this reconciliation.

## First-party crawler reality

The active published production/pilot crawler is still the historical bounded pilot implementation, approximately:
- 30-page bound;
- depth 2;
- GET-only;
- sequential breadth-first crawl;
- robots-aware;
- no retries;
- 10-second request timeout;
- maximum HTML response around 750,000 bytes;
- same-site normalization;
- query stripping;
- existing runtime redirect handling.

The 30-page behavior remains **baseline** mode. P2.1–P2.6 are engineering foundations and do not silently replace or activate the published runtime.

## P2.1–P2.4 foundation summary

P2.1 defines immutable `baseline` planning and finite first-party `full_site` planning with an explicit hard page fuse under an independent absolute ceiling. All execution/persistence/scheduler/worker/competitor/provider/public-write flags remain false.

P2.2 defines network-free supplied-sitemap inventory: bounded sitemap parsing, first-party URL policy, canonical normalization/dedupe, completeness/rejection accounting and deterministic fingerprints. It does not fetch sitemaps.

P2.3 defines network-free execution control over P2.1/P2.2: deterministic batches, finite concurrency/rate/timeout/redirect/retry/trap ceilings, exact supplied-outcome advancement, checkpoints/resume, replay/order guards and semantic integrity checks. It contains no live transport.

P2.4 defines deterministic completion ledger / whole-site completeness certification over exact P2.1/P2.2/P2.3 lineage. Whole-site certification means complete reconciled accounting over the approved canonical inventory, not zero SEO issues. Terminal crawl failures block certification; known redirects/robots exclusions/noindex can be classified terminal states.

## P2.5 crawl-history comparison contract — DONE

P2.5 issue #160 / PR #161 merged at:
- merge: `a177c4590273da29113af75b431d6ae20c7e3b4c`
- tree: `2d4a2103c9036f5e90032d5f569d01f7e8ecb78f`
- PR CI #271 / run `35001858253`: success
- post-merge CI #272 / run `35002068558`: success.

P2.5 provides deterministic `first_party_crawl_history_comparison_v1` over supplied valid before/after crawl artifacts. It proves:
- inventory URL additions/removals;
- sitemap `lastmod` changes;
- aggregate completion-ledger deltas;
- certification/blocker transitions;
- crawl-lineage/configuration changes;
- deterministic comparison fingerprints and semantic integrity.

P2.5 explicitly does **not** claim unavailable per-URL historical facts. P2.1–P2.4 do not retain enough per-URL history to prove HTTP-status, fetch-result, canonical-target, indexability or content-fingerprint changes. Those remain declared unavailable rather than inferred.

## P2.6 incremental-recrawl planning contract — DONE

P2.6 adds deterministic `first_party_incremental_recrawl_plan_v1` over exact P2.5 history and supplied upstream lineage.

It provides:
- `inventory_added` targeting;
- `sitemap_lastmod_changed` targeting;
- explicitly supplied trusted first-party signals: `high_value`, `stale`, `unresolved_issue`, `gsc_opportunity`, `recent_execution`;
- deterministic reason merging and priority classes;
- deterministic selection/order/batching;
- finite `maxPlanUrls` and `batchSize` ceilings bounded by the upstream full-site hard fuse and absolute ceiling;
- selected/deferred/excluded accounting;
- explicit bounded full-reconciliation recommendation when aggregate regression or lineage change cannot safely be localized;
- SHA-256 artifact fingerprinting and independent semantic integrity checks.

### P2.6 tamper resistance

The planner does not trust a P2.5 artifact only because its fingerprint is internally valid. It reconstructs P2.5 from the supplied before/after snapshots and requires the reconstructed fingerprint to match the supplied comparison. A caller cannot fabricate change rows and legitimize them merely by recomputing a fingerprint.

### P2.6 evidence boundary

P2.6 preserves P2.5's unavailable per-URL dimensions. It cannot fabricate HTTP/fetch/canonical/indexability/content-fingerprint reasons from aggregate evidence.

### P2.6 authorization boundary

The planner remains pure/default-off:
- network execution=false;
- crawl execution authorization=false;
- sitemap network fetching=false;
- persistence=false;
- scheduler=false;
- batch executor=false;
- autonomous worker=false;
- retry loop=false;
- competitor collection/persistence=false;
- provider writes=false;
- public-site writes=false.

Static hardening tests prohibit built-in networking, persistence mutation primitives, raw payload fields and secret-bearing fields.

## Competitor isolation remains mandatory

Competitor crawling/acquisition remains a separate subsystem with separate target identity, secure transport, gates, replay controls and persistence authorization. First-party whole-site or incremental-recrawl capability must never be represented by a generic crawler/network permission that a competitor path can inherit.

## GSC live-provider boundary remains closed

Task #75 remains engineering-complete but unpublished. Its GSC transport remains intentionally unbound/default-off.

Exact GSC identity:
- profile: `gsc_read_only_v1`
- provider: `google`
- external account ID: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported property: `sc-domain:<domain>`
- accepted permissions: `siteRestrictedUser`, `siteFullUser`.

No real GSC OAuth client/secret, consent, delegated token, `sites.list`, Search Analytics call, property binding, Task #70 live execution or GSC evidence persistence is authorized by P2.1–P2.6.

## Current safety boundary

Unless a later task explicitly authorizes otherwise, keep closed/default-off:
- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `GSC_READONLY_OAUTH_RUNTIME_ENABLED=false`
- first-party `full_site` live network execution=false
- first-party sitemap network fetching=false
- first-party full-site/incremental persistence=false
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
- P2.3 — bounded crawl execution control + checkpoint/resume;
- P2.4 — completion ledger + whole-site completeness certification;
- P2.5 — crawl history/comparison + change detection;
- P2.6 — bounded incremental recrawl planner.

P1 live-provider activation remains separately authorized. P2.1–P2.6 do not imply live crawl execution, sitemap fetching, persistence, scheduler/autonomous operation or publication.

## Next safe engineering milestone

**P2.7 — URL Explorer API / Query Model Foundation.**

Initial P2.7 should remain pure/default-off and should not require live crawling or persistence. It should define a deterministic read/query model over supplied authorized first-party crawl artifacts suitable for the future Audit → URL Explorer workspace.

Initial design/acceptance should cover:
- exact first-party site/origin and artifact-lineage validation;
- sanitized URL-row projection from approved inventory/certification/history/recrawl artifacts only;
- deterministic sorting and stable pagination/cursor semantics;
- bounded filters for URL/path, inventory state, available crawl classification, history/change state and recrawl reason where evidence exists;
- explicit `unknown`/`unavailable` representation for dimensions not retained upstream;
- count/facet accounting derived from the same filtered result set;
- no raw XML/HTML/response-body/token/secret exposure;
- no arbitrary SQL/filter language or user-controlled code execution;
- finite page-size/filter ceilings;
- deterministic query/result fingerprints and tamper resistance;
- all network/execution/persistence/write authorization flags closed.

P2.7 must not silently activate live crawling, sitemap fetching, persistence/DDL, scheduler/worker/batch/retry execution, competitor collection, Task #75 live-provider stages, provider/public-site writes or publication.

Generic `continue` may advance the pure/default-off P2.7 engineering workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit reconciliation and docs closeout. It does **not** authorize live crawl/provider activity, persistence, DDL, scheduler/worker activation, competitor execution, provider/public-site writes or publication.

## Resume rule

At every new session:
1. independently resolve GitHub `main` SHA/tree and current CI;
2. read `AGENTS.md`;
3. read this `CURRENT_STATE.md`;
4. read `MASTER_COMPLETION_ROADMAP.md`;
5. read `ARCHITECTURE.md` and `PROJECT_HANDOFF.md`;
6. read `.agents/skills/seo-engine-project/SKILL.md`;
7. read `.agents/memory/MEMORY.md` plus Task #75 and P2.1–P2.6 closeouts;
8. read program issue #139 and active task issue/PR;
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before any reconciliation or publication.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence, or external/provider/public-site activity.