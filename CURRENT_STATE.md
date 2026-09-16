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

Tasks #74, #75, roadmap P2 engineering foundations and P3.1–P3.3 have **not** been published as application releases. Git-only Replit synchronization does not change the separately attested production source.

## Current engineering state — P3.3 complete

Roadmap **P3.3 — Retention / History / Supersession Persistence Model** is engineering-complete, exact-head CI-certified, merged to GitHub `main`, post-merge CI-certified and Git-only synchronized to Replit.

Authoritative task:
- issue #179 — P3.3 Retention / History / Supersession Persistence Model
- implementation PR #180

Certification lineage:
- P3.3 baseline main: `a013768dc45f92f7c7df3d01068a1035952f345e`
- baseline tree: `f2398bc856377b617bfaaedaa2852ca35ae643eb`
- exact tested P3.3 implementation head: `a6c05a6ca86f22109024482edd42671a2489564f`
- exact tested tree: `68691346b0346a0fb058f296641fe59998433600`
- PR CI #299 / run `35069987381`: success
- implementation merge: `d38cd243c21476272b0fcd9a98e90b3a8a987afb`
- implementation tree: `68691346b0346a0fb058f296641fe59998433600`
- post-merge main CI #300 / run `35070159129`: success

Both P3.3 certification runs passed legacy schema validation, task/bootstrap checks, all current workspace tests, typecheck and build. No failed-CI patch cycle was required.

Detailed record:
- `.agents/memory/p3-3-retention-history-closeout.md`

## Replit engineering workspace

After P3.3 post-merge CI #300, Replit was reconciled Git-only and read-only verified at:
- branch: `main`
- HEAD: `d38cd243c21476272b0fcd9a98e90b3a8a987afb`
- tree: `68691346b0346a0fb058f296641fe59998433600`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit on `main`: false

No publish/redeploy, runtime/config/environment mutation, DB/schema/data action, credential/OAuth/provider action, live crawl/sitemap/provider/public-site/competitor request, scheduler/worker activation, real persistence/archive/prune/delete action or public-site/provider write occurred during P3.3 engineering or Git reconciliation.

A docs-only closeout merge may advance canonical GitHub `main` beyond the implementation merge above. After any such merge, independently resolve the newer exact `main`, require its CI to be green, and Git-only reconcile Replit to that exact docs checkpoint without publication.

## Completed engineering foundations

Completed non-published engineering foundations include:

- **P1.1 / P1.2 — Task #75 GSC profile isolation:** dedicated GSC-purpose state/config/scope/discovery/identity isolation; live GSC transport remains intentionally unbound/default-off.
- **P2.1 — Crawl controller:** immutable 30-page/depth-2 `baseline` planning plus separately bounded `full_site` planning with finite safety ceilings.
- **P2.2 — Sitemap inventory:** network-free supplied-sitemap parsing, strict first-party URL policy, canonical normalization/dedupe and deterministic completeness accounting.
- **P2.3 — Crawl execution control:** deterministic bounded batches, rate/concurrency/timeout/redirect/retry/trap controls, checkpoint/resume and supplied-outcome advancement; no network executor.
- **P2.4 — Completion ledger:** deterministic whole-site accounting certification over exact P2 lineage; certification means reconciled approved inventory accounting, not zero SEO issues.
- **P2.5 — Crawl history:** deterministic retained-artifact comparison and change detection without inventing unavailable per-URL facts.
- **P2.6 — Incremental recrawl planner:** bounded recrawl plans from proven changes/trusted supplied signals; insufficient evidence falls back to bounded reconciliation.
- **P2.7 — URL Explorer:** deterministic bounded read-only URL query model over retained P2 inventory/recrawl evidence.
- **P2.8 — Technical issue/evidence model:** deterministic technical SEO taxonomy/evidence contract with strict provenance, stable fingerprints and explicit unavailable-fact honesty.
- **P3.1 — Observation/evidence persistence design:** storage-agnostic normalized observation identity, provenance, freshness, evidence references, duplicate/supersession/conflict/corroboration semantics, history integrity and bounded read/query contracts.
- **P3.2 — Persistence planning:** deterministic storage-neutral persistence keys, index intent, replay/idempotency, provenance-aware insert/supersede/conflict/corroboration plans, exact snapshot binding and immutable in-memory test application.
- **P3.3 — Retention/history/supersession model:** explicit-time deterministic retention decisions, replay-safe history relations, protected lineage, bounded archive/prune planning only and storage-neutral read-model index intent.

None of these engineering foundations activates new production crawling, provider reads, database persistence, archival/pruning/deletion, autonomous operation or publication.

## P3.3 contract completed

P3.3 production module:
- `artifacts/api-server/src/lib/observation-evidence-retention-history-model.ts`

P3.3 defines and tests:
- explicit caller-supplied reference time; no ambient wall-clock dependency;
- retention-policy modeling for `operational_history`, `evidence_lineage` and `audit_history`;
- deterministic replay-safe relation intents for `supersedes`, `conflicts_with` and `corroborates`;
- deterministic relation, decision, snapshot, history, index-intent and plan fingerprints;
- same-site/origin/semantic-lineage validation;
- supersession history that retains older observations rather than destructive replacement;
- bounded archive and prune-candidate planning;
- non-pruning protections for current records, audit history, evidence lineage, unresolved conflicts and retained corroboration lineage;
- ordering-independent planning and relation replay dedupe;
- fail-closed relation/plan integrity reconstruction and tamper rejection;
- bounded storage-neutral lookup/index intent for later P3.4 read models;
- source hardening against network transport, DB/ORM clients, SQL DDL/DML, filesystem writes, environment-secret binding, scheduler/worker/process primitives and ambient clock access;
- hard-coded false authorization for production persistence, archive/prune execution, destructive deletion, DB/DDL/DML/migrations, provider/crawl/competitor activity, scheduler/worker/autonomous mutation, public writes and publication.

### P3.3 honesty rule

P3.3 does **not** make durable storage real. `archiveObservationIds` and `pruneObservationIds` are planning artifacts only; they do not archive, prune or delete data. History relation intent does not persist a relation. Storage-neutral index intent is not a database migration. The modeled `operational_history` 30-day archive and 180-day prune-candidate thresholds are deterministic contract defaults, not production deletion authorization or final legal/operational retention policy.

Production database persistence and schema/migration work remain closed. **P3.6 remains the separately reviewed and explicitly authorized production migration/DDL boundary.**

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

No real GSC OAuth client/secret, OAuth consent, delegated token, `sites.list`, Search Analytics call, real property binding, Task #70 live execution or GSC evidence persistence is authorized by P3.3.

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
- observation/evidence production persistence=false
- production DB client binding=false
- production DDL/schema migration=false
- production DML=false
- filesystem writer=false
- scheduler/autonomous-worker execution=false
- autonomous mutation=false.

If any of these unexpectedly appears open, stop and diagnose read-only rather than widening the task.

## Master roadmap status

Program tracker: issue #139. Keep it open until final production completion certification.

Completed engineering foundations now include:
- P1.1 / P1.2 — Task #75 GSC profile isolation;
- P2.1 through P2.8 — crawl planning, inventory, control, certification, history, recrawl, URL Explorer and technical evidence;
- P3.1 — normalized observation/evidence persistence design;
- P3.2 — dedupe/fingerprint/freshness/provenance persistence planning foundation;
- P3.3 — retention/history/supersession persistence model.

P1 live-provider activation remains separately authorized. P2/P3 do not imply live full-site crawl execution, sitemap fetching, database persistence, scheduled crawling, autonomous operation or publication.

`MASTER_COMPLETION_ROADMAP.md` is the durable long-term plan. If its mutable status table lags this checkpoint, this file, program issue #139 and independently verified repository/CI state govern current status until the table is refreshed.

## Next safe engineering milestone

**P3.4 — Retention / History Read Models.**

P3.4 should remain a **bounded deterministic read-only/storage-neutral/default-off contract**, not production database activation.

Initial P3.4 may safely define and test:
- current-head selection over validated retained history without deleting history;
- deterministic history timeline projections;
- supersession-chain read projections;
- unresolved conflict views;
- corroborating-provenance views;
- retention/disposition visibility;
- bounded filters, sorting, pagination/cursors and site/origin scoping;
- explicit unavailable-data semantics instead of invented facts;
- exact lineage/snapshot/relation integrity checks;
- storage-neutral query/index requirements only;
- fake/in-memory read fixtures/stores in tests only;
- every production database/network/write/runtime/publication authorization flag closed.

P3.4 must **not**:
- import/connect to a production database client;
- execute production SQL DDL/DML or migrations;
- persist/archive/prune/delete real production observations;
- make provider/crawl/network calls;
- activate schedulers/workers;
- perform competitor collection;
- mutate a public site/provider;
- bind real OAuth credentials/consent;
- publish/redeploy the application.

**P3.6 remains the separately reviewed and explicitly authorized production migration/DDL boundary.**

Generic `continue` may advance the pure P3.4 engineering workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit sync and docs closeout. It does not authorize production persistence, DDL/DML, live provider/crawl activity, scheduler/worker activation, competitor execution, provider/public-site writes or publication.

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
9. inspect Replit branch/HEAD/tree/ahead-behind/clean state and sanitized gates before sync/publish.

Stop and diagnose read-only rather than improvising on GitHub drift, Replit drift, open execution/write gates, unexpected credential/readiness state, schema mismatch, failed CI, unexpected jobs/persistence or external/provider/public-site activity.
