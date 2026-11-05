# RT01-A12.3 — PostgreSQL 17 disposable schema verification

## Authority and isolation

Owner authorized **only** fresh, local/CI, disposable PostgreSQL 17 execution using synthetic fixtures. The test is not a deployment migration, not a production rehearsal on an existing database, and does not change operational runtime wiring.

Harness: `lib/db/src/pilot-01-rt01a12-3-disposable-schema.ephemeral.test.ts`.
CI: `.github/workflows/pilot-01-rt01a12-3-disposable-schema.yml`.

The test requires BOTH `PILOT01_A12_3_DISPOSABLE_PG=I_ACKNOWLEDGE_NEW_EMPTY_PG17_ONLY` and `PILOT01_A12_3_DISPOSABLE_DATABASE_URL`. The URL must be loopback, have a specifically named `pilot01_disposable_rt01a12_3_*` database, and use the synthetic `postgres` test principal. The first connection verifies PostgreSQL major version 17, current database identity, absence of public tables and pilot namespace, and absence of other user schemas **before creating any object**. If the guard fails, the test aborts without DDL.

GitHub Actions creates an ephemeral `postgres:17-alpine` service with test-only credentials and `permissions: contents: read`. The workflow is path-filtered to the harness, candidate SQL and workflow; the application has no imported runtime reference to the harness. The test creates only three minimal synthetic reference tables, runs the source SQL candidate **inside the disposable database**, asserts negative and positive constraints, then removes the candidate namespace, candidate public index, temporary role and synthetic reference tables. No application migrations or operational database schema are invoked.

## Checks and limitations

- PostgreSQL 17 execution and candidate schema creation against a **minimal** synthetic canonical reference schema: `organizations`, `sites`, and `auth_sessions`.
- Cross-organization site FK and unsupported operation rejection.
- Grant lifecycle timestamps; composite grant/job/actor FK enforcement.
- Immutable admission and job event triggers, duplicate admission rejection.
- Default-blocked outbox and invalid delivery transition rejection.
- Five-table RLS `ENABLE/FORCE` metadata verification; non-bypass disposable probe role sees zero rows despite a test-scoped SELECT grant.
- Cleanup validates public tables return to zero.

**Not proven:** compatibility with full production migrations, existing data/indexes, effective application-role permissions, authenticated issuer/membership binding, transactional admission adapter, worker lease DML, generation fencing, receipt/event pairing, concurrent race behavior, outbox dispatch safety, rolling deployment or rollback under live workloads. Superuser can bypass RLS even when FORCE is set; the synthetic probe tests a `NOBYPASSRLS` role only. Candidate SQL continues to reside outside `lib/db/migrations` and remains prohibited from operational application.

## Explicit remaining gates

Do not connect to Railway, staging, restored, Production, customer or any other pre-existing database. Do not execute production migrations, deploy, wire runtime or workers, activate provider operations, or write to a public site. Keep `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`.

Require **successful PR CI on the exact HEAD**, Tahseen's formal GitHub `APPROVED` review, and separately specified owner exact-HEAD authorization before merging. A green disposable run only certifies its bounded synthetic fixture, not operational readiness.
