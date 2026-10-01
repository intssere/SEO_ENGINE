# P12.2-L1A — read-only Railway Production DB/schema/site-binding observation packet

## Result

**AUTHORIZATION PACKET IMPLEMENTED / PRODUCTION OBSERVATION NOT YET AUTHORIZED OR EXECUTED.**

This artifact defines the exact future read-only observation boundary. It performs no Production SQL.

## Canonical lineage

Repository baseline:

`5c9fede586f7c841af6920414fe09d2083db3bbf`

Current Railway identifiers:

- project: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- Postgres service: `b69e0633-7ab9-40ab-85f3-c9edd6acb031`

Exact first-party binding:

- site ID: `eb1da9ee-539c-4200-8f04-f64ccaea7768`
- canonical origin: `https://diamondshelf.us`

Certified migration:

- path: `lib/db/migrations/0004_first_party_crawl_execution_state.sql`
- Git blob: `c46e007f087d0edbb6e4f5c8cda1490e9f0be548`

## Release-image boundary

Current `main` contains the L2 caller blob:

`2fc96c2e94317b94622c3b264f6b59ff52db1731`

The currently running immutable image source tree:

`75b750b59f2de907a121c61907c2f1cfe7364c1f`

contains no L2 caller.

Therefore:

- L2 is repository-certified;
- L2 is not currently deployed;
- the current Production image cannot be used for an L2-mediated live crawl;
- any future L2 live proof requires a newly certified immutable release containing L2.

This does not block L1A database observation because L1A is a separate management/read-only verification step.

## Future allowed observation

A separately authorized L1A execution may read only what is required to establish:

1. exact connected Railway Postgres/database identity;
2. count of public base tables;
3. presence or absence of the three P12.2 tables;
4. if present, exact columns/constraints/indexes for those three tables only;
5. exactly one `sites` row by primary key:
   `eb1da9ee-539c-4200-8f04-f64ccaea7768`;
6. from that row, only:
   - `id`
   - `canonical_origin`

It may not scan other site rows or application/business tables.

## Explicitly prohibited

The future L1A observation must perform:

- zero DDL;
- zero INSERT/UPDATE/DELETE/MERGE/TRUNCATE;
- zero migration execution;
- zero advisory-lock mutation;
- zero checkpoint/crawl/evidence persistence;
- zero application/business-row reads beyond the exact site binding;
- zero Diamond Shelf network requests;
- zero provider/OAuth access;
- zero scheduler/worker activation;
- zero Railway configuration mutation.

## Accepted schema states

### Certified pre-migration state

Accepted only if:

- public base-table count is exactly `34`;
- none of the three P12.2 tables exists;
- exact site row exists;
- its `canonical_origin` is exactly `https://diamondshelf.us`;
- no observation-scope violation occurred.

Disposition:

`eligible_for_migration_review`

This does **not** authorize migration 0004.

### Certified post-migration state

Accepted only if:

- public base-table count is exactly `37`;
- all three P12.2 tables exist;
- each table's columns, constraints and required index state match the certified migration contract;
- exact site row exists with exact canonical origin;
- no observation-scope violation occurred.

Disposition:

`migration_not_required`

This does not authorize crawl execution or persistence writes.

## Any other state

Any partial, extra, missing or structurally mismatched state is:

`blocked / p12_2_l1a_schema_state_unexpected`

No repair, seeding, migration or schema mutation may follow automatically.

## Receipt

The repository contract builds a deterministic receipt over:

- fixed L1A scope;
- observed schema/site facts;
- assessment;
- SHA-256 fingerprint.

The receipt cannot convert a mismatched observation into readiness.

## Required future authorization

Before any Production SQL is executed, obtain a separate explicit authorization bounded to this read-only observation only.

A suitable authorization must name:

- project/environment/Postgres service IDs;
- exact site ID;
- migration blob;
- read-only metadata/site-binding scope;
- zero writes/DDL;
- zero crawl/network/provider activity;
- one bounded observation attempt;
- evidence capture only.

## Next boundary after observation

If the observation proves exact 34-table pre-migration state:
- prepare **P12.2-L1B migration 0004 authorization/certification** separately.

If it proves exact 37-table certified post-migration state:
- skip migration and proceed to release/runtime readiness review.

If it proves anything else:
- stop fail-closed and investigate repository/read-only only.
