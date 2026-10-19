# UGP-11.C4 — pg-boss schema 45→46 tagged-source risk review

**Date:** 2026-10-19. **Base:** `initiative-universal-growth-platform` at `6325e75efd2559efd958e4643dccbebbbb1d95bc`; post-merge CI [#39259779982](https://github.com/intssere/SEO_ENGINE/actions/runs/39259779982) successful. **Upstream pinned commit:** `timgit/pg-boss@2c1005b744952360e999c2000e155a1bfebb8951` (tag `12.38.0`). **Scope:** source inspection only. C4 issue #1061 and independent P9 authority issue #1054 remain OPEN.

## Exact tagged-source migration delta

Read [`src/migrationStore.ts` lines 2351 onward](https://github.com/timgit/pg-boss/blob/2c1005b744952360e999c2000e155a1bfebb8951/src/migrationStore.ts#L2351-L2410) (Git blob `a7b3d786b96d478c7407cc9baccd5cc6ca8c58ff`).

- The migration record declares `release: 12.38.0`, `previous: 45`, `version: 46`.
- `install` adds nullable columns `queue.retained_count integer` and `queue.retained_on timestamptz` using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`; partitioned mode additionally updates `create_queue` using versioned function `createQueueFn[46]`. The source comments expect no row rewrite for those nullable/no-default columns, but that is **not independently measured**.
- Four named asynchronous/concurrent indexes on `job`: `job_i14` (live state), `job_i15` (name/created), `job_i16` (completed), `job_i17` (queued singleton-key); `noPartitioning` mode adds `queue_stats_i2` (captured_on/id). Source routes asynchronous work through BAM and handles partitioned and nonpartitioned cases differently.
- `uninstall` includes dropping newly created indexes; the partitioned branch reverts `createQueueFn[45]`. This is **a source-defined rollback plan, not proof that downgrade is data-safe or interruption-safe**.
- `CREATE INDEX CONCURRENTLY` can require additional migration lifecycle handling and leave an invalid index after interruption; independently inspect transaction boundaries, schema locks, background work completion and cleanup before any experiment.

## Risk and isolated evidence plan (all OPEN)

| Risk | Mandatory demonstration before selection |
|---|---|
| Startup changes schema without separate authority | Assert deployment code never calls `start()` against shared/production DB; offline examine explicit `migrate=false` and `createSchema=false` controls, but never treat flags as trust grants |
| Partitioned vs nonpartitioned paths | Compare generated v46 DDL and indexed objects in isolated databases for both configurations |
| Concurrent index interruption | Inject cancellation/crash during BAM index build; inspect invalid indexes, migration marker, retries, and bounded recovery without production writes |
| Partial upgrade / downgrade | Simulate interruption after queue-column ALTER and before async index completion; record supported rollback, backup and restore requirements |
| Retention/maintenance under backlog | Measure lock duration, transaction length, xmin/autovacuum effects and foreground claim latency under disposable synthetic loads |
| Safe runtime permissions | Verify separate DDL-capable migration identity versus minimally privileged run identity; no schema privilege for ordinary worker runtime |
| Side effects and P9 governance | Assert no queued work, scheduled dispatch, provider call or automatic retry can be inferred from successful migration, logs or queue receipts |

## Decision

**No migration certification or transport selection.** This source review reduces uncertainty about the schema-v46 code path but does not include package installation, executing SQL, dependency resolution, production runtime testing or a reviewed rollback. A future **separately authorized disposable PostgreSQL spike** must collect exact SQL, engine version, reproducible logs and negative-case outcomes under independent DB/security review. C2 issue #1054 must independently authorize identity/grants before any P9 activity.

**Explicitly excluded:** `main` modification, package/lockfile change, Railway, production or shared SQL/DDL, workers, enqueue/claim, schedules, provider/public writes, uncertain-side-effect retry, deployments and P12.2 interference.
