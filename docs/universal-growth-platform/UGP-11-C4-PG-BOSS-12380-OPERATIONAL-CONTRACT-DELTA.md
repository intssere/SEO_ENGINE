# UGP-11.C4 — pg-boss 12.38.0 operational API and failure-contract delta

**Source baseline:** `initiative-universal-growth-platform` `5d7ab50f0652447246dca29084ca4a0ff98fd0d8`, post-merge CI [#38712382446](https://github.com/intssere/SEO_ENGINE/actions/runs/38712382446) successful. **Date:** 2026-10-15. **Scope:** publisher-source release inspection only. **Trust gates:** #1061 open, C2 #1054 open. **Result:** no adoption, installation, runtime admission or production authority.

## Source of claims and evidentiary weight

Reviewed [official pg-boss release 12.38.0](https://github.com/timgit/pg-boss/releases/tag/12.38.0) as published upstream release notes. A release note is a *publisher claim*: it is neither an immutable reviewed npm package-artifact attestation nor independent proof of correctness. The earlier `UGP-11-C4-PG-BOSS-12380-RELEASE-DELTA.md` covers schema 46, maintenance batching, dashboard compatibility, and version freshness; the following are additional integration-sensitive contract changes.

## Previously unrecorded 12.38.0 behavioral deltas

| Publisher-described behavior | SEO ENGINE implication | Required isolated proof |
|---|---|---|
| `work()` handler exceeding its timeout **keeps its worker occupied until the handler returns**; emits `handler_overrun` warning | Handler timeout/abort must **not** be treated as positive evidence that an external side effect never started; kill and unknown outcomes remain quarantined | Disposable overrun handler plus concurrent expired lease/kill; assert no second side-effect dispatch and explicit manual intervention |
| `findJobs()`, `getQueues()`, `getSchedules()`, `getBlockedKeys()`, dependency and instance reads default to **at most 1,000 rows**, fixed order, with `after` pagination (explicit limit up to 100,000) | Read-only inventory and reconciliation must not infer absence from a partial page or trust an unbounded list as complete | Synthetic >1,000 item pagination, cursor deletion and consistency tests; missing page => unavailable, never dispatch permission |
| `previewRedrive()` reads a bounded number of each kind, default 1,000 | Preview counts at the limit cannot be read as complete totals; preview is never retry authority | Synthetic >1,000 redriveable objects; refuse to derive retry authorization from a truncated preview |
| `deleteQueuedJobs()`, `deleteStoredJobs()`, `deleteAllJobs()` may report deletion counts; partitioned or nameless `deleteAllJobs()` may still **TRUNCATE** and return `null` | These APIs are **destructive**; no general-purpose cleanup/redrive is permitted by a read-only C4 adoption assessment | Offline API review and guard assertions that no deletion entrypoints are wired to read-only transport |
| Background schema migrations may run sequentially once pending; `stop()` waits only up to its timeout for a background migration | Shutdown or stop is not proof of migration completion or clean rollback; startup can entail DDL | Offline tagged-source inspection, then separately authorized disposable schema-46 bootstrap/upgrade/rollback and interruption experiment |
| With `persistWarnings`, handler overruns, failed `LISTEN/NOTIFY` listeners and disabled `xmin_horizon` checks are stored in a warning table | Warnings can support observability but do not establish safe processing or current P9 authority | Negative tests for missing warnings, stale warning records, and diagnostic data redaction |

## Required safety contracts before a spike

1. Preserve **separate independently issued and durable P9 admission/control**; neither pg-boss queue state, DB success, handler signal nor warning record issues permission.
2. Guarantee **no retry after possibly started side effects**; `manual_intervention_required` is mandatory for unresolved write/send/publication outcomes, including overrun or aborted handler cases.
3. Distinguish **read-only observation completeness** from a list-page success. Pagination must be exhaustive or explicitly marked unavailable; a 1,000-row cap is not an authoritative universe.
4. For any prospective pg-boss experiment, disable or intercept all destructive methods, user-facing writes, provider dispatch and autonomous scheduling; run only in an expressly approved disposable database.
5. Treat background schema migrations as an explicit operational risk: require a pinned tag/tarball, reviewed 45→46 SQL, migration privileges and boot-path analysis, backup/rollback protocol, and distinct authorization.
6. Compare equivalent thin PostgreSQL adapter behavior on bounded reads, timeouts, leases, cleanup, memory use and failure handling rather than assuming a library is more or less reliable.

## Decision

**pg-boss 12.38.0 remains an unapproved candidate.** This incremental release-contract inspection identifies risks and acceptance criteria; it does **not** certify that these flaws exist in deployed SEO ENGINE (pg-boss is not installed), prove package integrity/security, complete #1061, unblock #1054, or authorize any production action.

No package, code, workflow, lockfile, database, environment, deployment, provider, worker, scheduler, `main`, or P12.2 workstream is changed by this document.
