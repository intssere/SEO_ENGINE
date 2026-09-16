# P3.3 — Retention / History / Supersession Persistence Model Closeout

## Scope

P3.3 adds a pure, deterministic, storage-neutral retention/history/supersession persistence-model contract over the P3.1 normalized observation model and P3.2 write-planning contract. It does **not** activate a production database, durable archive/prune execution, destructive deletion, provider/crawl activity, scheduler/worker execution, or publication.

Issue: #179  
Implementation PR: #180

## Certified implementation lineage

- baseline main: `a013768dc45f92f7c7df3d01068a1035952f345e`
- baseline tree: `f2398bc856377b617bfaaedaa2852ca35ae643eb`
- exact tested P3.3 implementation head: `a6c05a6ca86f22109024482edd42671a2489564f`
- exact tested tree: `68691346b0346a0fb058f296641fe59998433600`
- PR CI #299 / run `35069987381`: success
- implementation merge: `d38cd243c21476272b0fcd9a98e90b3a8a987afb`
- implementation tree: `68691346b0346a0fb058f296641fe59998433600`
- post-merge main CI #300 / run `35070159129`: success

Both certification runs passed the repository CI stack: legacy schema validation, task/bootstrap checks, all current workspace package tests, typecheck and build.

No failed-CI patch cycle was required for P3.3.

## Replit reconciliation

After post-merge CI #300, the Replit Git workspace was reconciled Git-only and read-only verified at:

- branch: `main`
- HEAD: `d38cd243c21476272b0fcd9a98e90b3a8a987afb`
- tree: `68691346b0346a0fb058f296641fe59998433600`
- cached origin/main: same SHA/tree
- ahead/behind: `0/0`
- tracked/untracked: `0/0`
- working tree clean: true
- extra local commit on `main`: false

The separately published application remains Task #73:

- source SHA: `2498e5b34bbd130c97aa60865cc81875d76eb895`
- source tree: `62016e4a5952628dfbd0eff4f9cf32d797aa6b51`
- deployment ID: `fbef9788-c08d-475d-a85d-88ede16e92c7`
- status: success
- URL: `https://dsseoengine.replit.app`

No application publication/redeployment occurred.

## P3.3 contract delivered

Production module:

- `artifacts/api-server/src/lib/observation-evidence-retention-history-model.ts`

Focused behavioral and hardening tests:

- `artifacts/api-server/src/lib/observation-evidence-retention-history-model.test.ts`
- `artifacts/api-server/src/lib/observation-evidence-retention-history-model.hardening.test.ts`

The module defines/tests:

- `P3_3_SCHEMA_VERSION = p3_3_v1`;
- explicit caller-supplied reference time for retention decisions, with no ambient wall-clock dependency;
- deterministic retention policies for `operational_history`, `evidence_lineage`, and `audit_history`;
- deterministic replay-safe history relation intent for:
  - `supersedes`;
  - `conflicts_with`;
  - `corroborates`;
- deterministic relation, decision, history, snapshot, index-intent and plan fingerprints;
- exact site/origin/semantic-lineage isolation for relations;
- retained superseded observations rather than destructive last-write-wins replacement;
- bounded archive planning and bounded prune-candidate planning;
- conservative non-pruning protection for:
  - current records;
  - audit history;
  - evidence lineage;
  - unresolved conflict participants;
  - retained corroboration lineage;
- deterministic ordering-independent planning over records and relation inputs;
- replay-safe relation dedupe;
- fail-closed relation and plan integrity reconstruction;
- rejection of tampered relations, changed reference-time inputs, invalid reference-time ordering and bounded-input violations;
- declarative storage-neutral index/lookup intent intended to support later P3.4 read models;
- hard-coded fail-closed authorization state for every production persistence/runtime/publication capability.

## Important semantics

1. **P3.1 remains the source of truth for normalized observation identity and transition semantics.** P3.3 validates and reuses those records rather than redefining identity.
2. **P3.2 remains the source of truth for write-plan actions and exact snapshot/write-plan integrity.** P3.3 consumes the validated write plan.
3. A supersession relation means the older observation remains part of history and is related to the newer observation; it does not authorize deletion.
4. `archiveObservationIds` and `pruneObservationIds` are planning artifacts only. They do not archive, prune, delete or mutate real storage.
5. Current observations cannot become prune candidates merely because they are old.
6. `audit_history` and `evidence_lineage` are conservatively non-pruneable in P3.3.
7. Unresolved conflict participants remain retained even when an age window would otherwise make an operational record a prune candidate.
8. Corroborating independent provenance remains traceable while retained.
9. Record/relation input ordering does not affect deterministic plan output.
10. A P3.3 plan cannot be treated as valid against changed/tampered snapshot, relation or reference-time inputs.

## Retention windows are model defaults, not production deletion policy

The P3.3 model currently represents an `operational_history` archive threshold of 30 days and prune-candidate threshold of 180 days. These values exist to make the deterministic planning contract testable and reviewable. They are **not** authorization to archive/delete real production data and are not a substitute for later product/legal/operational retention-policy review before production persistence is activated.

## Storage-neutral index intent is not a migration

P3.3 declares bounded lookup/index requirements for relation idempotency, history/lineage lookup, retention lookup and later read models. These are data-contract intents only.

P3.3 does not:

- create a database table;
- create or drop an index;
- run SQL;
- run a migration;
- bind a database client;
- persist a history relation;
- archive a row;
- delete/prune a row.

P3.6 remains the separately reviewed production migration/DDL boundary.

## Hardening proof

Focused source-hardening tests prove the P3.3 production module contains no:

- built-in network request primitive;
- HTTP/socket/DNS/TLS transport import;
- production DB/ORM client;
- SQL DDL statement;
- SQL DML statement;
- filesystem-write primitive;
- environment-secret binding;
- scheduler/timer primitive;
- worker/process primitive;
- ambient wall-clock read.

All production persistence, archive/prune execution, destructive deletion, DB/DDL/DML, migration, provider/crawl, competitor, scheduler/worker, public-write and publication authorization flags remain false.

## Explicitly still not authorized

P3.3 does not authorize:

- a production database/ORM client;
- production DDL/DML or migrations;
- real observation/history/relation persistence;
- real archive/prune/delete execution;
- provider or GSC calls;
- live sitemap fetching or full-site crawling;
- competitor collection/evidence persistence;
- environment-secret binding;
- scheduler/worker execution;
- autonomous mutation;
- public-site/provider writes;
- OAuth consent/real credentials;
- publication/redeployment.

## Next safe milestone

**P3.4 — Retention/History Read Models.**

P3.4 should remain read-only, deterministic, bounded and storage-neutral/default-off. It may define query/read projections over validated P3.1 observations, P3.2 persistence plans and P3.3 retained-history/relation artifacts, including history timelines, current-head selection, supersession/conflict/corroboration views, retention-state visibility, bounded filters/pagination and strict lineage/integrity checks.

P3.4 must not silently cross the P3.6 production database/migration boundary, activate real persistence, execute archive/prune/delete operations, call providers/crawlers, start schedulers/workers, mutate public/provider state, or publish/redeploy the application.
