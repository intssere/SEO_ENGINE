# P3.6 — Production Observation/Evidence Schema Migration Closeout

## Scope

P3.6 implemented and executed the first production PostgreSQL persistence schema for the certified observation/evidence contract. The milestone remained DDL-only: it created the three frozen tables and indexes, inserted no rows, activated no runtime database reads/writes, and did not publish or redeploy the application.

Issue: #188  
Prerequisite identity/recovery gate: #193  
Implementation PR: #192

## Certified implementation lineage

- exact tested implementation head: `0724318749f4061e5d828e9e0eb7ded398b1cb4e`
- exact tested implementation tree: `2733b8d3ab781834a10dcfbd2b833e786d3f2e1b`
- exact-head CI: #328 / run `35127827007` / job `104901139040`: success
- merge commit: `e3295531fd3cb50ac8d2801ccc0a9fe996d0c8bc`
- merge tree: `2733b8d3ab781834a10dcfbd2b833e786d3f2e1b`
- post-merge main CI: #329 / run `35128064998` / job `104901925552`: success
- canonical migration: `lib/db/migrations/0003_observation_evidence_schema.sql`
- migration Git blob: `ea13df6e9e0e0307e349f1502a4548b9e4de11ed`

The merged migration translates the P3.6A physical contract into PostgreSQL DDL without redesigning it.

## Production target certification

The production database target was independently identified and re-verified before DDL:

- database: `neondb`
- Neon project: `late-sunset-42762033`
- Neon branch: `br-super-frost-b341k9ms`
- Neon timeline: `07b8ce1a7a41f71ba395a1bab2b03de3`
- Replit Production read-only endpoint observed during verification: `ep-lucky-river-b3sh13is`
- writable compute used for the migration on the same project/branch/timeline: `ep-muddy-mouse-b34bjs0w`

The endpoint difference was reconciled by matching the same project, branch, database, timeline, and schema state. The writable compute reported `pg_is_in_recovery() = false`; the Replit Production verification path was read-only/recovery-oriented.

## Recovery gate

Before DDL, Replit Production Database settings showed:

- Point-in-time recovery: enabled
- recovery window: last 7 days

Scheduled backups were not required for this gate because resource-specific PITR was enabled for the certified production database.

Issue #193 was closed only after production identity, catalog state, and recovery capability were proven.

## Final pre-migration state

Immediately before execution:

- public base tables: `31`
- `public.seo_observation`: absent
- `public.seo_evidence`: absent
- `public.seo_observation_evidence`: absent
- representative core/auth tables present
- obvious concurrent production DDL sessions: `0`
- repository HEAD: `e3295531fd3cb50ac8d2801ccc0a9fe996d0c8bc`
- migration blob: `ea13df6e9e0e0307e349f1502a4548b9e4de11ed`

No unexplained drift remained.

## Production execution

The canonical migration file was executed exactly once with `psql`, `ON_ERROR_STOP`, and its own transaction boundary.

Observed execution sequence:

- `BEGIN`
- 3 × `CREATE TABLE`
- 12 × `CREATE INDEX`
- `COMMIT`

No application DML, seed rows, backfill, or repair statements were executed.

## Independent post-migration certification

A fresh read-only Production catalog verification compared the committed schema with the exact canonical migration and reported **PASS — zero mismatches**.

Verified state:

- public base-table count: `34`
- `public.seo_observation`: exists, `0` rows
- `public.seo_evidence`: exists, `0` rows
- `public.seo_observation_evidence`: exists, `0` rows
- all 32 columns match name, ordinal position, PostgreSQL type, nullability, and default
- all 21 canonical CHECK constraints present and semantically equivalent
- all 3 primary keys correct
- both foreign keys correct with `ON DELETE RESTRICT`
- all 15 migration-defined indexes, including PK indexes, present with correct column order
- no ambient-time defaults
- no generated/random identity defaults
- total catalog mismatches: `0`

## Replit and publication boundary

Before production DDL, the Replit engineering workspace had already been reconciled Git-only to canonical main at:

- branch: `main`
- HEAD: `e3295531fd3cb50ac8d2801ccc0a9fe996d0c8bc`
- tree: `2733b8d3ab781834a10dcfbd2b833e786d3f2e1b`
- ahead/behind: `0/0`
- clean working tree

The published application artifact was intentionally not republished or restarted as part of P3.6. Production schema installation does not authorize runtime use of the new tables.

## Gates that remain closed

P3.6 does **not** authorize or activate:

- application persistence to the new tables
- production application reads from the new tables
- observation/evidence runtime binding
- relation/disposition persistence deferred from P3.3/P3.4
- P3.5 advisory/conflict persistence
- provider or competitor requests
- crawler or sitemap network execution
- worker, scheduler, retry loop, or autonomous mutation
- archive, prune, delete, or destructive rollback
- public-site or provider mutation
- publication/redeployment

Any activation of those capabilities requires a separately reviewed and authorized milestone.

## Closeout status

P3.6 is complete:

1. schema contract frozen by P3.6A;
2. exact migration implemented and CI-certified;
3. exact tested head merged;
4. post-merge main CI green;
5. Replit engineering workspace reconciled Git-only;
6. production target and 7-day PITR proven;
7. canonical DDL executed exactly once;
8. independent post-migration catalog verification returned zero mismatches;
9. issue #188 closed completed.

Program issue #139 remains open for the broader SEO ENGINE program.