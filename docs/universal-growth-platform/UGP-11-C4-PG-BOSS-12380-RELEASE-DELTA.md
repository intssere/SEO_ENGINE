# UGP-11.C4 — pg-boss 12.38.0 release delta and blocked transport adoption

**Review date:** 2026-10-15. **Base:** `initiative-universal-growth-platform` at `31c9b139190f8eb92068d93807e0c9470b6c8532` (postmerge CI [#38701286134](https://github.com/intssere/SEO_ENGINE/actions/runs/38701286134) succeeded). **Issues:** #1061 transport decision and independent P9 C2 trust gate #1054 remain open.

## Material upstream change since PR #1166

- [Official pg-boss releases](https://github.com/timgit/pg-boss/releases) list **12.38.0**, published **2026-10-13**, after 12.37.1. As of this review it is the newest release shown by the publisher. **12.37.1 is historical candidate evidence, not the current release target.**
- Publisher declares **schema version 46; a migration runs on upgrade**. Previous 12.37.1 declared schema version 45. No production or isolated upgrade/rollback has been inspected or certified in SEO ENGINE.
- Publisher notes maintenance, expiry and bulk deletes now operate in bounded batches, each transaction separate. This is a potential improvement to long-transaction behavior, **not independently benchmarked or verified under SEO ENGINE load/failure conditions**.
- The [tagged upstream package-lock shown on GitHub](https://github.com/timgit/pg-boss/blob/master/package-lock.json) currently lists runtime dependency names `cron-parser`, `pg`, `rrule-temporal` and `serialize-error` and Node `>=22.12.0`. **Master-branch metadata is not a verified 12.38.0 tarball, lockfile integrity attestation, or security/advisory review.**
- Companion [dashboard release 1.12.0](https://github.com/timgit/pg-boss/releases) declares compatibility with pg-boss 12.38/schema 46 and indicates earlier dashboard versions may fail write operations after migration. This reinforces the need to inspect tooling version coupling; **no dashboard is chosen or installed by this review**.

## Source-derived SEO ENGINE boundaries

1. `.github/workflows/ci.yml`: Node 22 is not exact patch pinned; disposable PostgreSQL uses `postgres:17-alpine`, not proof of any live Railway version.
2. `artifacts/api-server/package.json`: `pg-boss` is absent. The existing `postgres` and `drizzle-orm` packages do not imply a transport selection.
3. `UGP-11-C4-RAILWAY-RUNTIME-INVENTORY.md`: read-only image metadata indicates a PostgreSQL *tag* 18 and shadow app digest, not a verified live PostgreSQL server version or exact Node patch; no authorized DB interrogation occurred.
4. `UGP-11-C4-CERTIFICATION-EVIDENCE-ROLLUP.md`: disposable PostgreSQL uncertainty, fencing, snapshot and timeout tests certify **fixtures only** and cannot prove pg-boss runtime safety or P9 operational authority.
5. `UGP-11-C4-PG-BOSS-12371-CANDIDATE-REFRESH.md` remains valid historical 12.37.1 evidence, especially the stately/singleton starvation regression. That fix must still be tested as inherited behavior in any selected newer release.

## Updated isolated decision checklist (ALL OPEN)

| Gate | pg-boss 12.38.0 evidence required | Thin PostgreSQL comparator |
|---|---|---|
| Version integrity and supply chain | Exact tagged source, tarball SHA/integrity, license, immutable dependency tree, advisories, maintainer risk | Existing client/adapter dependencies, lockfile/advisories and code review |
| Host compatibility | Exact Node patch >=22.12, PostgreSQL server/version, deployment image digest, privilege/extension requirements | Exact Node/PostgreSQL requirements and SQL portability |
| Migration safety | Offline inspect version-46 DDL and boot/start migration triggers; design separate sandbox migrate/rollback protocol | Engine-owned explicit, separately approved migration and rollback |
| Concurrency and fairness | Multi-instance singleton/stately fetch, stale claim settlement, heartbeat cancellation, kill/claim race, load fairness | Existing fixture-backed control-first lock, compare-and-swap, expiry and fairness |
| Maintenance and backlogs | Measure v12.38 bounded transaction batches under backlog, outage, restart and competing claims | Evaluate explicit cleanup batches, transaction bounds, operator burden |
| Unknown side effects | Fail closed after uncertain commit and possible dispatch; ban redrive/blind retry and autonomous `start({attempts})` effects | Preserve manual intervention and independent P9 gate |
| Operations and support | Incident response, telemetry, compatible dashboard/schema upgrade, retention and maintenance cost | Engineering ownership, observability and support cost |

**Decision:** **NO SELECTION / NO INSTALLATION / PRODUCTION NOT GRANTED**. Track pg-boss **12.38.0 as the new review target**, not as approved technology. A comparison cannot close until independent reviewers approve objective criteria and trustworthy evidence. C2 #1054 independently blocks P9 claims and dispatch. Do not infer the library's queue receipts as external-write permission.

**Excluded in this PR:** dependency or lockfile edits, CI/runtime changes, service/database access, SQL/DDL, worker startup, enqueue/claim, scheduler, auto-retry, remote signing, provider/public-site mutation, rollout, deployment or edits to `main`. This document supplements rather than rewrites the historically accurate 12.37.1 assessment.
