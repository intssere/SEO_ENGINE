# SEO ENGINE — Current State Checkpoint

This is the authoritative mutable resume checkpoint. Always independently resolve current GitHub `main` SHA/tree and CI before acting. `AGENTS.md` remains the normative operating contract, `MASTER_COMPLETION_ROADMAP.md` remains the durable long-term completion plan, and GitHub `main` remains canonical.

## Published production

The currently published and production-certified application release remains **Task #73 — GSC First-Live-Read Pilot Readiness v1**.

Published application source:
- SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- URL: `https://dsseoengine.replit.app`
- deployment status: success

Tasks #74, #75, roadmap P2 engineering foundations and P3.1–P3.4 have **not** been published as application releases. Git-only Replit synchronization does not change the separately attested production source.

## Current engineering state — P3.4 complete

Roadmap **P3.4 — Retention / History Read Models** is engineering-complete, exact-head CI-certified, merged to GitHub `main`, post-merge CI-certified and Git-only synchronized to Replit.

Authoritative task:
- issue #182 — P3.4 Retention / History Read Models
- implementation PR #183

Certification lineage:
- P3.4 baseline main: `aea6edfbe9f57f207dd88bcac8c771bf919b1999`
- baseline tree: `e0f0357b0177fca2b9a2d2313f8c481d0d608c55`
- exact tested P3.4 implementation head: `58450fd6063515dd369bb4b9ec579bdb31eb8bc7`
- exact tested tree: `ff9856fbaa69c2135a087fefa866ea662d8bee00`
- PR CI #303 / run `35071947145`: success
- implementation merge: `af17c36b53b3659fa1a4b69fc1eb253a3f8804e5`
- implementation tree: `ff9856fbaa69c2135a087fefa866ea662d8bee00`
- post-merge main CI #304 / run `35072135792`: success

Both P3.4 certification runs passed legacy schema validation, task/bootstrap checks, all current workspace tests, typecheck and build.

Detailed record:
- `.agents/memory/p3-4-retention-history-read-model-closeout.md`

## Replit engineering workspace

After P3.4 post-merge CI #304, Replit was reconciled Git-only and read-only verified at:
- branch: `main`
- HEAD: `af17c36b53b3659fa1a4b69fc1eb253a3f8804e5`
- tree: `ff9856fbaa69c2135a087fefa866ea662d8bee00`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit on `main`: false

No publish/redeploy, runtime/config/environment mutation, DB/schema/data action, credential/OAuth/provider action, live crawl/sitemap/provider/public-site/competitor request, scheduler/worker activation, real persistence/archive/prune/delete action or public-site/provider write occurred during P3.4 engineering or Git reconciliation.

A docs-only closeout merge may advance canonical GitHub `main` beyond the implementation merge above. After any such merge, independently resolve the newer exact `main`, require its CI to be green, and Git-only reconcile Replit to that exact docs checkpoint without publication.

## Completed engineering foundations

Completed non-published engineering foundations include:

- **P1.1 / P1.2 — Task #75 GSC profile isolation:** dedicated GSC-purpose state/config/scope/discovery/identity isolation; live GSC transport remains intentionally unbound/default-off.
- **P2.1–P2.8 — Crawl and technical evidence foundations:** bounded baseline/full-site planning, sitemap inventory, batch execution control, completion certification, crawl history, incremental recrawl planning, URL Explorer and technical issue/evidence modeling. These remain engineering contracts and do not activate a new production crawler.
- **P3.1 — Observation/evidence persistence design:** storage-agnostic normalized observation identity, provenance, freshness, evidence references, duplicate/supersession/conflict/corroboration semantics, history integrity and bounded read/query contracts.
- **P3.2 — Persistence planning:** deterministic storage-neutral persistence keys, index intent, replay/idempotency, provenance-aware insert/supersede/conflict/corroboration plans, exact snapshot binding and immutable in-memory test application.
- **P3.3 — Retention/history/supersession model:** explicit-time deterministic retention decisions, replay-safe history relations, protected lineage, bounded archive/prune planning only and storage-neutral lookup/index intent.
- **P3.4 — Retention/history read models:** deterministic current-head and retained-history projections, supersession-chain/conflict/corroboration views, descriptive retention state, bounded filters/sorting/cursors, explicit unavailable evidence semantics and storage-neutral read/index intent.

None of these engineering foundations activates new production crawling, provider reads, database persistence/reads, archival/pruning/deletion, autonomous operation or publication.

## P3.4 contract completed

P3.4 production module:
- `artifacts/api-server/src/lib/observation-evidence-retention-history-read-model.ts`

P3.4 defines and tests:
- current-head selection over exact validated retained history without destructive collapse;
- retained timeline rows preserving superseded observations;
- explicit current/superseded/conflicting lifecycle projection;
- bounded deterministic supersession-chain traversal with cycle/missing-target/branch fail-closed handling;
- unresolved-conflict projections that preserve independent provenance rather than arbitrary last-write-wins selection;
- corroboration projections that keep independent supporting provenance traceable;
- descriptive retention/disposition visibility without archive/prune/delete execution;
- explicit evidence availability and unavailable-dimension semantics rather than invented facts;
- bounded site/origin-scoped filters across semantic key, observation kind, source kind, retention class, disposition, lifecycle and relation kind;
- bounded deterministic sorting and cursor pagination;
- snapshot-bound and query-bound replay-safe cursor fingerprints;
- exact P3.3 plan integrity reconstruction, P3.1 observation integrity validation and deterministic P3.2 in-memory reconstruction only;
- deterministic row, chain, snapshot, query, index-intent and result fingerprints;
- declarative storage-neutral index/query intent for timeline, current-head, provenance, retention and relation access patterns;
- result-integrity rebuilding and tamper rejection;
- source hardening against network transport, DB/ORM clients, SQL DDL/DML, filesystem writes, environment-secret binding, scheduler/worker/process primitives and ambient clock reads;
- hard-coded false authorization for production read runtime, DB reads, persistence, archive/prune/delete execution, DDL/DML/migrations, provider/crawl/competitor activity, scheduler/worker/autonomous mutation, public writes and publication.

### P3.4 honesty rule

P3.4 does **not** make a live database-backed read service real. Storage-neutral read/index intent is not a migration. In-memory reconstruction is deterministic modeling/testing only. A `prune_candidate` remains readable because P3.4 does not execute pruning. Cursor pagination is a read-model contract, not authorization to expose a live production endpoint. Conflict/corroboration projections do not resolve or persist relations.

Production database binding, durable storage/read execution and schema/migration work remain closed. **P3.6 remains the separately reviewed and explicitly authorized production migration/DDL boundary.**

## Current first-party crawler reality

The active published production/pilot crawler remains the historical bounded pilot implementation. P2/P3 engineering foundations do not activate a new runtime.

Published production/pilot behavior remains approximately:
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

The 30-page behavior remains **baseline** mode. It is not the intended whole-site production ceiling.

## Competitor isolation remains mandatory

Competitor crawling/acquisition remains a separate subsystem with separate target identity, secure transport, gates, replay controls and persistence authorization. First-party P2/P3 foundations do not grant or widen competitor permissions.

## GSC live-provider boundary remains closed

Task #75 remains engineering-complete but unpublished. Its GSC transport remains intentionally unbound/default-off.

Exact GSC identity:
- profile: `gsc_read_only_v1`
- provider: `google`
- external account ID: `google#gsc-read-only-v1`
- exact scope: `https://www.googleapis.com/auth/webmasters.readonly`
- supported property: `sc-domain:<domain>`
- accepted permissions: `siteRestrictedUser`, `siteFullUser`.

No real GSC OAuth client/secret, OAuth consent, delegated token, `sites.list`, Search Analytics call, real property binding, Task #70 live execution or GSC evidence persistence is authorized by P3.4.

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
- provider/public writes=false
- observation/evidence production persistence=false
- production DB client/read binding=false
- production DDL/schema migration=false
- production DML=false
- production archive execution=false
- production prune execution=false
- destructive delete execution=false
- filesystem writer=false
- scheduler/autonomous-worker execution=false
- autonomous mutation=false
- publication authorization=false.

If any of these unexpectedly appears open, stop and diagnose read-only rather than widening the task.

## Master roadmap status

Program tracker: issue #139. Keep it open until final production completion certification.

Certified engineering foundations through this checkpoint include P1.1/P1.2, P2.1–P2.8 and P3.1–P3.4. P1 live-provider activation remains separately authorized. P2/P3 do not imply live full-site crawl execution, sitemap fetching, database persistence/reads, scheduled crawling, autonomous operation or publication.

`MASTER_COMPLETION_ROADMAP.md` is the durable long-term plan. If its mutable status table lags this checkpoint, this file, program issue #139 and independently verified repository/CI state govern current status until that table is refreshed.

## Next safe engineering milestone

**P3.5 — Evidence Quality / Conflict Handling.**

P3.5 should remain a **pure, deterministic, storage-neutral, default-off contract**, not production database/provider/runtime activation.

Initial P3.5 may safely define and test:
- deterministic evidence-quality dimensions over validated P3.1–P3.4 observations/read models;
- provenance-quality and evidence-availability assessment without inventing unavailable facts;
- deterministic conflict-state classification and conflict-group identity;
- corroboration-aware confidence/quality modeling while preserving independent provenance;
- stale/partial/unavailable evidence treatment;
- deterministic conflict-resolution *recommendation/state modeling only*, without destructive mutation or silent last-write-wins;
- bounded quality/conflict filters and projections;
- exact lineage/snapshot/fingerprint integrity checks;
- fake/in-memory fixtures in tests only;
- storage-neutral query/index requirements only;
- every production database/network/write/runtime/publication authorization flag closed.

P3.5 must **not**:
- import/connect to a production database client;
- execute production SQL DDL/DML or migrations;
- persist/archive/prune/delete real production observations;
- silently resolve or delete conflicting evidence;
- make provider/crawl/network calls;
- activate schedulers/workers;
- perform competitor collection;
- mutate a public site/provider;
- bind real OAuth credentials/consent;
- publish/redeploy the application.

**P3.6 remains the separately reviewed and explicitly authorized production migration/DDL boundary.**

Generic `continue` may advance the pure P3.5 engineering workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit sync and docs closeout. It does not authorize production persistence/reads, DDL/DML, live provider/crawl activity, scheduler/worker activation, competitor execution, provider/public-site writes or publication.

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
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before any sync/publish decision.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence or external/provider/public-site activity.
