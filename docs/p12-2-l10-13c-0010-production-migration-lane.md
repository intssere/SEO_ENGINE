# P12.2-L10.13C — migration 0010 Production certification/apply lane

L10.13C packages migration `0010_first_party_crawl_terminal_failure_recovery.sql` for an explicit, fail-closed Production sequence. This milestone does not apply the migration.

## Immutable migration identity

- path: `lib/db/migrations/0010_first_party_crawl_terminal_failure_recovery.sql`
- Git blob: `a22547808f1a8d30424c659435dc81bf3da44023`
- SHA-256: `f97c1d5417d0eaf0eae46d075e1b85125a1a2aa91881a921b640f596fc921516`
- expected Production-lineage pre-apply public base tables: 38
- expected Production-lineage post-apply public base tables: 41

The apply image also verifies the migration SHA-256 at build time and again at runtime.

### Production lineage correction

Production did not apply engineering-only migrations `0005`, `0006`, or `0007`. Its certified path was `0001–0004 → 0008 → 0009`, which yields 38 public base tables before migration `0010`. Migration `0010` adds exactly three tables, so the correct Production transition is `38 → 41`.

The 44/47 counts remain valid only for the separate CI engineering chain where P8.8 migrations `0005–0007` are also present. They are not Production migration-0010 pre/post counts.

## Required application compatibility prerequisite

The currently deployed Production application source predates L10.13B and recognizes the current Production schema. Current L10.13B source recognizes both the 38-table pre-apply Production lineage and the 41-table post-apply Production lineage by schema shape.

Before any migration-0010 pre-cert/apply sequence is authorized:

1. release an immutable current application image from canonical source;
2. transition only `seo-engine-shadow` to that image while the database is still at 38 tables;
3. certify application health/readiness against the unchanged 38-table Production database;
4. preserve that exact compatible image through migration apply and post-certification.

This prevents migration 0010 from placing an older running application into an unrecognized 47-table schema state.

## Sequenced boundaries

After the compatible application-image prerequisite is satisfied, the migration path is intentionally split into six separately authorized boundaries:

1. release the L10.13C-A pre-certification image;
2. execute the L10.13C-A SELECT-only pre-apply certification once;
3. release the L10.13C-B apply image;
4. execute migration 0010 once through the exact apply image;
5. release the L10.13C-C post-certification image;
6. execute the L10.13C-C SELECT-only post-apply certification once.

An authorization for one boundary does not authorize any later boundary.

## Pre-apply certification

The pre-certification surface is read-only and requires:

- exact Railway project/environment/Postgres identity;
- 38 public base tables;
- all three L10.13B tables absent;
- the immutable-mutation helper function absent;
- exact active Diamond Shelf site binding;
- packet 013 final checkpoint revision 307 and fingerprint `6c13e3bd...`;
- 3,044 / 3,044 finalized, zero pending, one terminal failure;
- no certified completed-run snapshot for that run/plan;
- packet 013 durable L2 invocation still claimed with no completion receipt.

The pre-certification cannot execute a migration.

## Apply image

The apply image contains only the exact migration and bounded PostgreSQL CLI. It:

- requires the exact 38-table Production lineage, including durable L2 and migration-0009 `bounded_pilot`, with all six engineering-only P8.8 policy tables absent;
- binds the same exact packet-013 checkpoint before apply;
- starts exactly one `psql` process;
- uses `ON_ERROR_STOP`, a statement timeout, and lock timeout;
- applies only the embedded migration;
- requires 41 tables afterward;
- requires the three new tables to be empty immediately after apply;
- requires all three append-only triggers and the immutable-mutation helper function;
- requires packet 013 checkpoint evidence to remain unchanged;
- has one attempt, zero retries, and no fallback transport.

## Post-apply certification

The post-certification surface is read-only and requires:

- 41 public base tables;
- exactly the three new tables present and empty;
- all three append-only triggers present;
- the immutable mutation function present;
- exact column/trigger projections;
- packet 013 checkpoint and uncertified state unchanged;
- exact active Diamond Shelf site binding.

## Safety

This lane does not backfill packet 013 failure evidence. It does not authorize a blind retry or recovery crawl. It does not change `seo-engine-shadow`, scheduler/worker state, provider writes, or public-site writes.

The compatible current application image must already be active before migration 0010. Only after migration 0010 is independently post-certified should any new crawl/recovery execution be considered.
