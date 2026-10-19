# UGP-11.C4 — pg-boss 12.38.0 startup and migration source audit

**Date:** 2026-10-19. **SEO ENGINE baseline:** `initiative-universal-growth-platform` `79cb706f819077c03a3ce543215c24dad1ef4247`, post-merge [CI #39224453527](https://github.com/intssere/SEO_ENGINE/actions/runs/39224453527) completed successfully. **Upstream:** `timgit/pg-boss` tag `12.38.0` observed at immutable Git commit `2c1005b744952360e999c2000e155a1bfebb8951`.

## Source-backed findings (not runtime tests)

1. **Mutation-capable defaults.** Upstream [`src/attorney.ts`](https://github.com/timgit/pg-boss/blob/2c1005b744952360e999c2000e155a1bfebb8951/src/attorney.ts#L513-L517) sets `config.schedule=true`, `config.supervise=true`, `config.migrate=true`, `config.createSchema=true` and `config.reindex=true` unless explicitly overridden. Source blob `090c08b7bc2dee47d3f779fedb3c40200238e916`.
2. **Startup calls the migration-capable path.** Upstream [`src/index.ts`](https://github.com/timgit/pg-boss/blob/2c1005b744952360e999c2000e155a1bfebb8951/src/index.ts#L260-L285) calls `contractor.start()` when `migrate` is true, otherwise `contractor.check()`. Regardless of that branch, the startup flow also starts manager, boss, navigator, and conditionally timekeeper (`schedule`) and background migration manager (`bam` when `migrate`). Thus disabling migration is **not by itself a safe permission model for worker or schedule admission**.
3. **Contractor creates or upgrades schema.** Upstream [`src/contractor.ts`](https://github.com/timgit/pg-boss/blob/2c1005b744952360e999c2000e155a1bfebb8951/src/contractor.ts#L104-L115) checks installation; for an existing older schema version it invokes `migrate(version)`, and for an absent installation it invokes `create()`. Source blob `contractor.ts` verified by read-only fetched source. Consequently a default `start()` can execute database-changing installation/migration operations.
4. **Migration SQL is not a zero-risk trivial operation.** Upstream [`src/migrationStore.ts`](https://github.com/timgit/pg-boss/blob/2c1005b744952360e999c2000e155a1bfebb8951/src/migrationStore.ts) contains versioned migration build and rollback functions, including handling async and potentially concurrent-index operations. This documents code paths; **it does not certify safe 45→46 upgrade, rollback, permissions or interruption recovery**.

## Required guardrails before any authorized disposable spike

- **No default `start()`** may run against shared or hosted databases, and module import/route/server initialization must never implicitly invoke pg-boss. This source audit made **no `start()` call, SQL connection, installation, dependency change or schema mutation**.
- Future disposable experiments must use a dedicated database URL and dedicated schema, a reviewed least-privilege role, explicit configuration (including `migrate`, `createSchema`, `schedule`, `supervise`, `reindex`) and an independent pre-start assertion that the configured target is the approved disposable fixture. Explicit false flags are useful defense-in-depth, **not sufficient authority**.
- Inspect exact v45→v46 statements offline and classify locks, nontransactional/async work, retry behavior, permissions and interruption states. Approve any isolated migration test separately.
- Distinguish dry read-only schema `check()` from a claimed read-only *runtime*: `start()` performs further service initialization even when `migrate=false`. Do not grant workers, claims, schedules, retries, dispatch or provider access from this inspection.
- Require the same evidence rigor for the engine-owned thin PostgreSQL alternative (explicit migration lifecycle, lock order, rollback, zero implicit startup DDL).

## Disposition

**Confirmed by tagged source:** default pg-boss configuration is migration- and scheduler-capable; startup can install/upgrade schema and initializes multiple background subsystems. **NOT established:** whether application-supplied options safely disable all actions under all versions, whether v46 SQL is compatible with SEO ENGINE runtime, or whether a library can enforce independent P9 trust. **Transport selection: DEFER.** Issues #1061 and independent C2 #1054 stay open. Production admission **NOT GRANTED**.

**Strict exclusions:** no dependency installation, runtime change, secret, Railway interaction, PostgreSQL connection/DDL, migration execution, job claim/worker/schedule, provider call, retry, external write, deployment, `main`, or P12.2 change.
