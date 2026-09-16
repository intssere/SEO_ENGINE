# P3.2 — Dedupe/Fingerprint/Freshness/Provenance Persistence Foundation Closeout

## Scope

P3.2 adds a storage-neutral persistence-planning contract over the P3.1 normalized observation/evidence model. It does **not** activate production persistence, a database client, SQL, migrations, provider/crawl activity, scheduler/worker execution, or publication.

Issue: #176  
Implementation PR: #177

## Certified implementation lineage

- baseline main: `3d951dcbf286ed2e41d474b96f9aa9b552169a48`
- baseline tree: `da8c6a81178d4d74e3610e39399c68de1fb41f08`
- exact tested PR head: `c6300c48a07ea4fafb97b7b6ae45f04968288493`
- exact tested PR tree: `f301adf1d70799aa36caf72dcb055f68f6669536`
- PR CI #295 / run `35067036756`: success
- implementation merge: `cb71b464ceb131931a24bf1b5f6f25e04f5236d8`
- implementation tree: `f301adf1d70799aa36caf72dcb055f68f6669536`
- post-merge main CI #296 / run `35067208751`: success

Both certification runs passed legacy schema validation, task tests, full workspace tests, typecheck and build.

## Replit reconciliation

After post-merge CI #296, the Replit Git workspace was reconciled Git-only and read-only verified at:

- branch: `main`
- HEAD: `cb71b464ceb131931a24bf1b5f6f25e04f5236d8`
- tree: `f301adf1d70799aa36caf72dcb055f68f6669536`
- cached origin/main: same SHA
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit on main: false

The separately recorded published application remains Task #73:

- source SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- source tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`

No application publication/redeployment occurred.

## P3.2 contract delivered

Production module:
- `artifacts/api-server/src/lib/observation-evidence-persistence-plan.ts`

The module defines:

- `P3_2_SCHEMA_VERSION = p3_2_v1`;
- bounded existing-record and relation-target limits;
- fail-closed `PERSISTENCE_PLAN_AUTHORIZATION` with all live/production capabilities false;
- deterministic persistence keys derived from P3.1 observation identity/fingerprints;
- declarative, storage-neutral index intent for idempotency, supersession, conflict/corroboration read paths, read models and freshness;
- deterministic write-plan actions:
  - `insert_observation`;
  - `duplicate_noop`;
  - `supersede_and_insert`;
  - `preserve_conflict_insert`;
  - `corroborate_insert`;
- exact replay identity via deterministic idempotency key;
- exact snapshot binding via deterministic snapshot fingerprint;
- deterministic plan fingerprint and integrity reconstruction;
- immutable in-memory application helper for tests only.

## Important semantics

1. **P3.1 remains the source of truth for normalized observation identity and transition semantics.** P3.2 validates P3.1 records rather than redefining them.
2. Exact candidate replay against a snapshot that already contains the same observation ID is a strict relation-free `duplicate_noop`.
3. Same semantic key + same provenance + newer candidate supersedes only the current same-provenance head while retaining historical records.
4. Same-provenance older candidates fail closed as out-of-order.
5. Different provenance is never collapsed by last-write-wins:
   - same material value is retained and linked as corroboration;
   - different material value is retained and linked as conflict.
6. When a candidate supersedes one provenance while other current provenance exists, the plan still records the relevant corroboration/conflict context.
7. Existing-record input ordering and exact duplicate input rows do not change the plan fingerprint.
8. Site/origin isolation is enforced before planning.
9. A plan cannot be applied against a different snapshot without integrity failure.
10. The in-memory apply helper returns a new immutable logical snapshot and never deletes superseded history.

## Hardening proof

Focused hardening tests prove the P3.2 production module contains no:

- built-in network request primitive;
- HTTP/socket/DNS/TLS transport import;
- production DB/ORM client;
- SQL DDL statement;
- SQL DML statement;
- filesystem-write primitive;
- environment-secret binding;
- scheduler/timer primitive;
- worker/process primitive.

All production persistence/mutation/runtime/publication authorization flags remain false.

## Explicitly still not authorized

P3.2 does not authorize:

- a real database or ORM client;
- production SQL DDL/DML;
- schema/table/index creation;
- production migrations;
- real observation/evidence persistence;
- provider or crawl network activity;
- environment secret binding;
- scheduler/worker execution;
- competitor collection;
- public-site/provider writes;
- autonomous mutation;
- publication/redeployment.

P3.6 remains the separately reviewed and explicitly authorized production migration/DDL boundary.

## Next safe milestone

**P3.3 — Retention / History / Supersession Persistence Model.**

P3.3 should remain pure/default-off and storage-neutral. It may define deterministic retention-policy decisions, history-chain persistence intent, supersession relation persistence, conflict/corroboration relation retention, bounded archival/pruning plans, and replay-safe lineage invariants using P3.1/P3.2 artifacts and fake/in-memory test stores only.

It must not activate real DB persistence, DDL/DML, migrations, provider/crawl activity, schedulers/workers, or publication.
