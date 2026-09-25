# P8.8 W09-C1 — Production Schema Readiness Review

**Issue:** #511  
**Status:** REVIEW / SPECIFICATION ONLY — PRODUCTION DDL NOT AUTHORIZED

## 1. Purpose

W09-C1 determines whether the three already-merged P8.8 migrations can later be presented for a separately authorized Production DDL session. This review does not connect to Production and does not execute SQL.

Canonical review baseline: `267a682ed58f898b6a550a1307a6f461ac178af7`.

## 2. Frozen migration identity

Only these exact Git blobs are eligible:

| Order | Migration | Git blob |
|---|---|---|
| 0005 | `lib/db/migrations/0005_p8_8_policy_mutation_reservations.sql` | `b25d111af1610ea1a13333b6fbdaf4f521aea131` |
| 0006 | `lib/db/migrations/0006_p8_8_policy_mutation_controls.sql` | `1079b9687472abf387cb67421efa7d1f1ffcbc35` |
| 0007 | `lib/db/migrations/0007_p8_8_policy_mutation_dispatch.sql` | `a98ca47f9735d7fe4f53feebde38562102cbf6f2` |

Any content/blob drift invalidates this review.

Execution order is fixed: 0005 → 0006 → 0007.

## 3. DDL review

The three files contain transaction-bounded CREATE-only schema DDL. They contain no INSERT, UPDATE, DELETE, TRUNCATE, DROP, ALTER, provider request, application runtime activation, seed or backfill statement.

0005 creates:
- `policy_mutation_reservations`;
- 2 unique partial indexes;
- 1 history index.

0006 creates:
- `policy_mutation_control_state`;
- `policy_mutation_control_events`;
- `policy_mutation_claims`;
- 2 history indexes.

0007 creates:
- `policy_mutation_dispatches`;
- `policy_mutation_dispatch_events`;
- 2 unique partial blocking indexes;
- 2 history indexes.

Total expected new public base tables: **6**. Given the last certified Production state of 34 public base tables, the expected post-migration count is **40**, but this is a review expectation, not a live observation.

Dependencies require 0005 before 0006 because claims reference reservations, and 0006 before 0007 because dispatches reference both reservations and claims. All three also depend on the existing `sites(id)` relation.

## 4. Additive/non-destructive classification

At source level the migration set is additive: it creates new tables/indexes/constraints and does not modify or delete existing rows or objects.

This does not make Production execution automatically safe. CREATE TABLE/INDEX takes PostgreSQL locks and can fail if names already exist or prerequisite objects differ. The scripts do not use `IF NOT EXISTS`; therefore any unexpected partial installation must fail closed rather than be papered over.

## 5. Historical Production identity — not current proof

The certified P3.6 closeout historically identified:
- database: `neondb`;
- Neon project: `late-sunset-42762033`;
- branch: `br-super-frost-b341k9ms`;
- timeline: `07b8ce1a7a41f71ba395a1bab2b03de3`;
- 7-day PITR enabled at that time;
- post-P3.6 public base-table count: 34.

These facts may seed a future authorization packet but must be independently re-verified before DDL. W09-C1 does not inspect live Neon/Replit configuration or secrets.

## 6. Required pre-DDL gate for a future separately authorized session

Before any migration connection is opened, a future authorization must prove:

1. canonical Git SHA/tree and all three migration blobs;
2. exact Production project, branch/timeline, database and writable compute/endpoint;
3. target is the same certified Production lineage, not a preview/dev branch;
4. recovery capability is currently enabled and its usable recovery window is sufficient;
5. exact operator identity and bounded writable credential injection path;
6. no migration 0005/0006/0007 object is unexpectedly present or partially present, based on separately authorized catalog verification or equivalent certified evidence;
7. prerequisite `sites(id)` contract exists;
8. no unexplained schema drift from the certified baseline;
9. no conflicting Production DDL/migration session;
10. public-write/policy/scheduler/worker gates remain unchanged and disabled as required;
11. an exact execution command/runbook and evidence destination are approved;
12. a rollback/recovery decision owner is named.

A known mismatch means **do not execute**.

## 7. Future execution boundary

If separately authorized later, the DDL session must be limited to the three exact files in fixed order with:
- one named Production database;
- one bounded migration session;
- `ON_ERROR_STOP` or equivalent fail-fast behavior;
- each file's own BEGIN/COMMIT boundary preserved;
- no ad hoc repair SQL;
- no seed/backfill/DML;
- no application deployment/restart/publication;
- no provider/public-site request;
- no scheduler/worker/runtime activation.

A failure in any migration stops the sequence. Do not proceed to later migrations or improvise repairs.

## 8. Rollback and recovery

Because these migrations create new schema objects and should contain no application data at installation time, the preferred failure policy is fail closed and preserve evidence, not automatic DROP-based rollback.

No destructive rollback SQL is authorized by this review.

For a failure before COMMIT, PostgreSQL transaction rollback should remove that file's uncommitted DDL. For a failure after one or more committed files, stop and classify the database as a partial installation. Recovery must then be separately decided using current PITR/recovery capability or a separately reviewed corrective plan.

Never drop a committed table merely to force the table count back to 34 without a separate authorization.

## 9. Abort conditions

A future DDL attempt must abort before or during execution on:
- Production identity mismatch;
- migration blob mismatch;
- missing/insufficient recovery proof;
- unexpected existing 0005/0006/0007 object;
- prerequisite schema mismatch;
- unexplained catalog drift;
- concurrent migration/DDL anomaly;
- SQL outside the frozen files;
- unexpected DML;
- unexpected provider/network/runtime activity;
- migration error or timeout;
- inability to preserve exact evidence.

## 10. Independent post-migration verification

After a separately authorized successful DDL session, use a fresh read-only verification path to prove:
- public base-table count expected at 40 if pre-state was exactly 34;
- all 6 new tables exist;
- exact columns/types/nullability/defaults;
- primary/foreign keys and ON DELETE actions;
- CHECK constraints;
- unique and non-unique indexes, including partial predicates;
- zero rows in all 6 new tables immediately after schema-only installation;
- no pre-existing table was removed or altered unexpectedly;
- no application/runtime gate changed;
- no provider/public-site request occurred.

Only zero unexplained mismatches closes schema installation.

## 11. W09-C relationship

Successful installation/certification of 0005–0007 would resolve only the known W09-C schema blocker. It would **not** itself authorize the W09-C real Stage 0 Production SELECT.

W09-C would still require its separately bound read-only role, exact Production identity, external evidence destination/retention, exact W01 shadow grant/fingerprint, site/grant/package equality, exact query-set fingerprint and explicit one-shot read authorization.

## 12. Readiness verdict

**Source-level migration readiness: REVIEWABLE / ADDITIVE.**

**Production DDL readiness: BLOCKED pending current live Production identity, recovery, pre-schema/no-drift, writable-role/session and evidence-destination proofs plus separate explicit DDL authorization.**

## 13. Explicit non-authorization

W09-C1 authorizes no:
- Production connection or schema inspection;
- Production SELECT;
- migration/DDL execution;
- DML/persistence;
- provider/public-site read/write;
- W03–W07 runtime execution;
- Task #51/#53/#54 execution;
- scheduler/worker/startup activation;
- credential/scope/config/gate change;
- deployment/publication;
- real W09-C Stage 0 run;
- provider-read addendum;
- W10.
