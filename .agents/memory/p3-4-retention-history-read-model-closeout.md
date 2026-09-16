# P3.4 — Retention / History Read Models Closeout

## Scope

P3.4 adds a pure, deterministic, bounded, storage-neutral, read-only projection/query contract over validated P3.1/P3.2/P3.3 observation/history artifacts. It does **not** activate a production database, durable reads, persistence, archive/prune/delete execution, provider/crawl activity, scheduler/worker execution, public/provider writes, or publication.

Authoritative task:
- issue #182 — `P3.4 — Retention / History Read Models`
- implementation PR #183 — `P3.4 — retention / history read models`

## Certified implementation lineage

- baseline canonical main: `aea6edfbe9f57f207dd88bcac8c771bf919b1999`
- baseline tree: `e0f0357b0177fca2b9a2d2313f8c481d0d608c55`
- exact tested implementation head: `58450fd6063515dd369bb4b9ec579bdb31eb8bc7`
- tested tree: `ff9856fbaa69c2135a087fefa866ea662d8bee00`
- PR CI #303 / Actions run `35071947145`: success
- implementation merge: `af17c36b53b3659fa1a4b69fc1eb253a3f8804e5`
- implementation tree: `ff9856fbaa69c2135a087fefa866ea662d8bee00`
- post-merge main CI #304 / Actions run `35072135792`: success

Both certification runs passed legacy PostgreSQL schema validation, task/bootstrap checks, all current workspace tests, typecheck and build.

## Replit reconciliation

After post-merge CI #304, Replit was reconciled Git-only and independently read-only verified at:

- branch: `main`
- HEAD: `af17c36b53b3659fa1a4b69fc1eb253a3f8804e5`
- tree: `ff9856fbaa69c2135a087fefa866ea662d8bee00`
- cached origin/main: exact same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit on `main`: false

The separately published production application remains unchanged at Task #73:

- published source SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- published source tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- deployment status: success
- URL: `https://dsseoengine.replit.app`

No publish/redeploy or runtime/config/environment mutation occurred during P3.4 engineering or Git reconciliation.

## Contract delivered

Production module:
- `artifacts/api-server/src/lib/observation-evidence-retention-history-read-model.ts`

Focused tests:
- `artifacts/api-server/src/lib/observation-evidence-retention-history-read-model.test.ts`
- `artifacts/api-server/src/lib/observation-evidence-retention-history-read-model.hardening.test.ts`

P3.4 defines and tests:

- deterministic current-head selection derived from validated retained history without deleting or collapsing superseded records;
- deterministic retained-history rows carrying observation identity, material value, provenance, confidence, freshness, retention class and disposition;
- explicit lifecycle projection for current, superseded and conflicting observations;
- deterministic supersession-chain projections with bounded traversal and fail-closed cycle/missing-target/ambiguous-branch handling;
- unresolved conflict projections that keep independent conflicting provenance separately visible rather than applying arbitrary last-write-wins behavior;
- corroboration projections that preserve independent supporting provenance;
- descriptive retention/disposition visibility, including archive/prune-candidate state, without executing archive, prune or delete actions;
- explicit evidence availability (`available`, `partial`, `unavailable`) and unavailable-dimension reporting rather than invented missing facts;
- bounded filters for semantic key, observation kind, source kind, retention class, disposition, lifecycle and relation kind;
- bounded deterministic sorting;
- bounded deterministic cursor pagination with cursor fingerprints bound to the exact validated read snapshot and query contract;
- cursor/query/snapshot tamper rejection;
- exact P3.3 plan integrity reconstruction before read projection;
- P3.1 observation integrity validation and P3.2 in-memory plan application only for deterministic test/model reconstruction;
- site/origin isolation;
- deterministic row, chain, read-snapshot, query, index-intent and result fingerprints;
- bounded declarative storage-neutral read/index intent for timeline, current-head, provenance, retention and relation access patterns;
- exact result integrity rebuilding;
- source hardening against network transports, DB/ORM clients, SQL DDL/DML, filesystem writers, environment-secret binding, scheduler/worker/process primitives and ambient wall-clock reads;
- hard-coded false capability/authorization fields for production read runtime, DB reads, persistence, archive/prune/delete execution, DDL/DML/migrations, provider/crawl/competitor activity, schedulers/workers/autonomous mutation, public/provider writes and publication.

## Honesty boundary

P3.4 makes a **read-model contract**, not a live production read service.

- `RETENTION_HISTORY_READ_INDEX_INTENTS` is declarative index/query intent, not a database migration.
- The in-memory reconstruction path is deterministic modeling/test behavior, not production persistence or durable querying.
- A `prune_candidate` row remains readable because P3.4 does not execute prune intent.
- Current-head selection is a deterministic projection over validated retained state, not destructive last-write-wins replacement.
- Conflict and corroboration projections do not resolve or persist relations.
- Cursor support is model-level deterministic pagination, not authorization to expose a live production API.

Production database binding, schema/migration work and real durable query execution remain closed. **P3.6 remains the separately reviewed and explicitly authorized production migration/DDL boundary.**

## Safety result

Read-only Replit verification after synchronization confirmed all protected capabilities remain false, including:

- public-site writes;
- AI proposal generation;
- signal collection job execution;
- GSC runtime;
- live first-party full-site crawl and sitemap network fetching;
- observation/evidence production persistence;
- production DB binding;
- production DDL and DML;
- filesystem writes;
- scheduler and worker execution;
- autonomous mutation;
- competitor execution/persistence;
- archive execution;
- prune execution;
- destructive delete execution;
- publication authorization.

No real provider, crawl, database, archive/prune/delete, scheduler, competitor or public-write action occurred.

## Next safe milestone

Roadmap **P3.5 — Evidence Quality / Conflict Handling**.

P3.5 should stay pure/default-off and may define deterministic evidence-quality assessment and conflict-state handling over validated P3.1–P3.4 artifacts. It should not activate production storage, providers, crawling, schedulers, writes or publication.

P3.6 remains the separate production migration/DDL authorization boundary.
