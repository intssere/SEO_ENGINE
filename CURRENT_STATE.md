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

Tasks #74, #75, roadmap P2 engineering foundations, P3.1 and P3.2 have **not** been published as application releases. Git-only Replit synchronization does not change the separately attested production source.

## Current engineering state — P3.2 complete

Roadmap **P3.2 — Dedupe/Fingerprint/Freshness/Provenance Persistence Foundation** is engineering-complete, exact-head CI-certified, merged to GitHub `main`, post-merge CI-certified and Git-only synchronized to Replit.

Authoritative task:
- issue #176 — P3.2 Dedupe/Fingerprint/Freshness/Provenance Persistence Foundation
- implementation PR #177

Certification lineage:
- P3.2 baseline main: `3d951dcbf286ed2e41d474b96f9aa9b552169a48`
- baseline tree: `da8c6a81178d4d74e3610e39399c68de1fb41f08`
- exact tested P3.2 head: `c6300c48a07ea4fafb97b7b6ae45f04968288493`
- tested tree: `f301adf1d70799aa36caf72dcb055f68f6669536`
- PR CI #295 / run `35067036756`: success
- implementation merge: `cb71b464ceb131931a24bf1b5f6f25e04f5236d8`
- implementation tree: `f301adf1d70799aa36caf72dcb055f68f6669536`
- post-merge main CI #296 / run `35067208751`: success

Both P3.2 certification runs passed legacy schema validation, task tests, full workspace tests, typecheck and build.

Detailed record:
- `.agents/memory/p3-2-persistence-planning-closeout.md`

## Replit engineering workspace

After P3.2 post-merge CI #296, Replit was reconciled Git-only and read-only verified at:
- branch: `main`
- HEAD: `cb71b464ceb131931a24bf1b5f6f25e04f5236d8`
- tree: `f301adf1d70799aa36caf72dcb055f68f6669536`
- cached origin/main: same SHA
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit on `main`: false

No publish/redeploy, runtime/config/environment mutation, DB/schema/data action, credential/OAuth/provider action, live crawl/sitemap/provider/public-site/competitor request, scheduler/worker activation, real persistence action or public-site/provider write occurred during P3.2 engineering or Git reconciliation.

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

None of these engineering foundations activates new production crawling, provider reads, database persistence, autonomous operation or publication.

## P3.2 contract completed

P3.2 production module:
- `artifacts/api-server/src/lib/observation-evidence-persistence-plan.ts`

P3.2 defines and tests:
- persistence keys derived only from validated P3.1 observation/semantic/value/provenance/record identity;
- deterministic idempotency key and snapshot fingerprint;
- bounded storage-neutral uniqueness/index intent;
- `insert_observation` for independent new semantic state;
- strict relation-free `duplicate_noop` for exact replay;
- `supersede_and_insert` for newer same-provenance state while retaining history;
- fail-closed rejection of out-of-order same-provenance candidates;
- `corroborate_insert` for independent provenance with the same material value;
- `preserve_conflict_insert` for independent provenance with different material value;
- full deterministic conflict/corroboration context even when one provenance is superseded;
- site/origin isolation;
- bounded relation fanout and bounded input snapshots;
- deterministic planning independent of existing-record ordering;
- plan-integrity reconstruction and stale/different-snapshot rejection;
- pure immutable in-memory apply behavior for tests only;
- hardening proof that the production module contains no network transport, DB/ORM client, SQL DDL/DML, filesystem-write primitive, environment binding, scheduler/worker primitive or enabled production persistence gate.

### P3.2 honesty rule

P3.2 does **not** make a storage engine real. Storage-neutral index intent is not a database migration; an in-memory apply helper is not durable persistence; a `supersede_and_insert` plan does not delete history; conflict/corroboration relation intent does not authorize relation writes. Production database storage remains closed until later reviewed/authorized milestones.

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
- maximum HTML response 750,000 bytes;
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

No real GSC OAuth client/secret, OAuth consent, delegated token, `sites.list`, Search Analytics call, real property binding, Task #70 live execution or GSC evidence persistence is authorized by P3.2.

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

## Master roadmap status

Program tracker: issue #139. Keep it open until final production completion certification.

Completed engineering foundations now include:
- P1.1 / P1.2 — Task #75 GSC profile isolation;
- P2.1 through P2.8 — crawl planning, inventory, control, certification, history, recrawl, URL Explorer and technical evidence;
- P3.1 — normalized observation/evidence persistence design;
- P3.2 — dedupe/fingerprint/freshness/provenance persistence planning foundation.

P1 live-provider activation remains separately authorized. P2/P3 do not imply live full-site crawl execution, sitemap fetching, database persistence, scheduled crawling, autonomous operation or publication.

`MASTER_COMPLETION_ROADMAP.md` is the durable plan; if a table status there lags this checkpoint, this file, program issue #139 and independently verified repository/CI state govern mutable status until the roadmap table is updated.

## Next safe engineering milestone

**P3.3 — Retention / History / Supersession Persistence Model.**

P3.3 should remain a **pure/default-off storage-neutral contract**, not production storage activation.

Initial P3.3 may safely define and test:
- deterministic retention-policy classes and bounded retention decisions over P3.1 observations/P3.2 write plans;
- persistent-history intent that retains superseded observations rather than destructive last-write-wins replacement;
- deterministic supersession relation persistence intent;
- conflict/corroboration relation-retention intent;
- bounded archival/pruning plans driven by explicit supplied reference time, retention class and lineage constraints;
- protections that prevent pruning current records, unresolved conflicts, required evidence lineage or audit history;
- replay-safe history/relation fingerprints and integrity checks;
- fake/in-memory history stores in tests only;
- storage-neutral lookup/index requirements needed by later P3.4 read models;
- every production database/network/DDL/DML/write/runtime/publication authorization flag closed.

P3.3 must **not**:
- import/connect to a production database client;
- execute SQL DDL or production DML;
- create/alter/drop production tables/indexes;
- start production migrations;
- bind environment secrets;
- persist/prune/archive real production observations;
- make provider/crawl/network calls;
- activate schedulers/workers;
- perform competitor collection;
- mutate a public site/provider;
- publish/redeploy the application.

**P3.6 remains the separately reviewed and explicitly authorized production migration/DDL boundary.**

Generic `continue` may advance the pure P3.3 engineering workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit sync and docs closeout. It does not authorize production persistence, DDL/DML, live provider/crawl activity, scheduler/worker activation, competitor execution, provider/public-site writes or publication.

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
