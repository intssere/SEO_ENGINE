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

Tasks #74, #75, roadmap P2 engineering foundations and P3.1 have **not** been published as application releases. Git-only Replit synchronization does not change the separately attested production source.

## Current engineering state — P3.1 complete

Roadmap **P3.1 — Observation/Evidence Persistence Design Foundation** is engineering-complete, exact-head CI-certified, merged to GitHub `main`, post-merge CI-certified and Git-only synchronized to Replit.

Authoritative task:
- issue #173 — P3.1 Observation/Evidence Persistence Design Foundation
- implementation PR #174

Certification lineage:
- P3.1 baseline main: `40aeb600cb8da486031023bab5d8d1c024711d0f`
- exact tested P3.1 head: `add9a5a59b15ef8880dd8e398739bedd66babc0e`
- PR CI #291 / run `35064641066`: success
- implementation merge: `e94a38427b23cbd6d74f6a9ef722e16d84c88635`
- implementation tree: `52c45dccd332877222e132a35aea1f4309f45b9f`
- post-merge main CI #292 / run `35064873440`: success

Both P3.1 certification runs passed legacy schema validation, task tests, full workspace tests, typecheck and build.

Detailed record:
- `.agents/memory/p3-1-observation-evidence-persistence-design-closeout.md`

## Replit engineering workspace

After P3.1 post-merge CI #292, Replit was reconciled Git-only and read-only verified at:
- branch: `main`
- HEAD: `e94a38427b23cbd6d74f6a9ef722e16d84c88635`
- tree: `52c45dccd332877222e132a35aea1f4309f45b9f`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit on `main`: false

No publish/redeploy, runtime/config/environment mutation, DB/schema/data action, credential/OAuth/provider action, live crawl/sitemap/provider/public-site/competitor request, scheduler/worker activation, persistence action or public-site/provider write occurred during P3.1 engineering or Git reconciliation.

### Replit smoke caveat

A Replit automatic `smoke` workflow ran approximately 79 seconds after the Git fast-forward and failed its first proxied health check at `http://localhost:80/api/healthz` with HTTP 502.

Read-only diagnosis found:
- the API workflow was listening on port 8080;
- recorded API requests were successful;
- web and component-preview Vite workflows were running;
- P3.1 is not wired into runtime;
- the running processes predated the P3.1 Git sync and therefore did not runtime-certify the new checkout;
- available evidence points to the Replit-facing development proxy/runtime condition rather than a P3.1 compile/test/runtime exception.

No restart, new request, configuration change or other mutation was performed to diagnose further because P3.1 does not authorize runtime mutation or publication.

## P2 engineering foundations completed

P2.1 through P2.8 are engineering-complete foundations and remain non-published/non-live unless separately authorized:

- **P2.1 — Crawl controller:** immutable 30-page/depth-2 `baseline` planning plus separately bounded `full_site` planning with finite safety ceilings.
- **P2.2 — Sitemap inventory:** network-free supplied-sitemap parsing, strict first-party URL policy, canonical normalization/dedupe and deterministic completeness accounting.
- **P2.3 — Crawl execution control:** deterministic bounded batches, rate/concurrency/timeout/redirect/retry/trap controls, checkpoint/resume and supplied-outcome advancement; no network executor.
- **P2.4 — Completion ledger:** deterministic whole-site accounting certification over exact P2 lineage; certification means reconciled approved inventory accounting, not zero SEO issues.
- **P2.5 — Crawl history:** deterministic retained-artifact comparison and change detection without inventing unavailable per-URL facts.
- **P2.6 — Incremental recrawl planner:** bounded recrawl plans from proven changes/trusted supplied signals; insufficient evidence falls back to bounded reconciliation.
- **P2.7 — URL Explorer:** deterministic bounded read-only URL query model over retained P2 inventory/recrawl evidence.
- **P2.8 — Technical issue/evidence model:** deterministic technical SEO taxonomy/evidence contract with strict provenance, stable fingerprints and explicit unavailable-fact honesty.

P2.7 still does not magically provide HTTP status, fetch outcome, redirect target, canonical target, indexability or content fingerprint when those facts were not retained by an authorized source. P2.8 issue instances cannot treat unavailable markers as substantiating evidence.

## P3.1 foundation completed

P3.1 provides a **storage-agnostic domain contract**, not active persistence.

It defines and tests:
- site- and URL-scoped normalized observation identity;
- deterministic semantic/value/evidence/provenance/record fingerprints;
- bounded scalar material state instead of arbitrary raw payload persistence;
- structured evidence references without retaining P2.8 free-form summaries, labels, details or raw evidence values;
- explicit caller-supplied `observedAt` at the P2.8 adapter boundary because P2.8 does not itself carry observation time;
- deterministic supplied-time freshness windows;
- exact duplicate, supersession, conflict, corroboration and independent transition semantics;
- deterministic history relations and integrity validation;
- bounded read/query contracts across site, URL, observation kind, provenance source, lifecycle and freshness;
- secret-like material, credential-bearing URL, malformed timestamp/fingerprint and unbounded-input rejection;
- hardening proof that the P3.1 production module contains no network transport, DB/ORM client, SQL DDL/DML, filesystem-write primitive, environment binding, scheduler/worker primitive or enabled mutation/persistence gate.

### P3.1 honesty rule

Do not fabricate source time or collapse independent provenance using arbitrary last-write-wins behavior. If an upstream record lacks `observedAt`, a trusted adapter boundary must supply it explicitly. Source lineage, observation semantics, material value and evidence identity remain distinct concepts.

## Current first-party crawler reality

The active published production/pilot crawler remains the historical bounded pilot implementation. P2 and P3.1 engineering foundations do not activate a new runtime.

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

No real GSC OAuth client/secret, OAuth consent, delegated token, `sites.list`, Search Analytics call, real property binding, Task #70 live execution or GSC evidence persistence is authorized by P3.1.

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
- production DDL/schema migration=false
- filesystem writer=false
- scheduler/autonomous-worker execution=false
- autonomous mutation=false.

## Master roadmap status

Program tracker: issue #139. Keep it open until final production completion certification.

Completed engineering foundations now include:
- P1.1 / P1.2 — Task #75 GSC profile isolation;
- P2.1 through P2.8 — crawl planning, inventory, control, certification, history, recrawl, URL Explorer and technical evidence;
- P3.1 — normalized observation/evidence persistence design.

P1 live-provider activation remains separately authorized. P2/P3.1 do not imply live full-site crawl execution, sitemap fetching, database persistence, scheduled crawling, autonomous operation or publication.

`MASTER_COMPLETION_ROADMAP.md` is the durable plan; if a table status there lags this checkpoint, this file and independently verified repository/CI state govern mutable status until the roadmap is updated.

## Next safe engineering milestone

**P3.2 — Dedupe/Fingerprint/Freshness/Provenance Persistence Foundation.**

P3.2 should remain a **pure/default-off persistence-facing contract**, not production migration activation.

Initial P3.2 may safely define and test:
- storage-facing persistence keys derived from P3.1 observation/semantic/value/provenance fingerprints;
- deterministic idempotent write-plan decisions such as insert, duplicate/no-op, supersede, preserve-conflict and corroboration linkage;
- freshness/provenance-aware uniqueness/index intent as a storage-neutral schema contract;
- bounded transaction/write-plan interfaces driven only by injected fake/in-memory stores in tests;
- deterministic replay/idempotency behavior;
- provenance isolation and conflict preservation;
- persistence-facing query/index requirements needed by later P3.3/P3.4;
- all production database/network/DDL/write activation flags closed.

P3.2 must **not**:
- import/connect to a production database client;
- run SQL DDL or production DML;
- create/alter/drop production tables/indexes;
- start migrations;
- bind environment secrets;
- persist real production observations;
- make provider/crawl/network calls;
- activate schedulers/workers;
- perform competitor collection;
- mutate a public site/provider;
- publish/redeploy the application.

**P3.6 remains the separately reviewed and explicitly authorized production migration/DDL boundary.**

Generic `continue` may advance the pure P3.2 engineering workflow through issue/branch/tests/PR/CI/merge/post-merge CI/Git-only Replit sync and docs closeout. It does not authorize production persistence, DDL, live provider/crawl activity, scheduler/worker activation, competitor execution, provider/public-site writes or publication.

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
