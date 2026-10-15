# UGP-11.C4 — pg-boss candidate refresh (read-only evidence, 2026-10-14)

**Base:** `initiative-universal-growth-platform` at `2b24bb6fd2bdb604d801246f4d7f71c7e1b0d3ba`, exact successful post-merge CI [#38528861937](https://github.com/intssere/SEO_ENGINE/actions/runs/38528861937). **Issue:** #1061; independent C2 trust gate #1054 remains OPEN. **Decision:** CANDIDATE REFRESH ONLY / DO NOT INSTALL / NOT GRANTED.

## New published upstream observation

- The upstream [pg-boss GitHub release history](https://github.com/timgit/pg-boss/releases) currently lists **12.37.1** (published 2026-10-08), following the previously assessed 12.37.0 (2026-10-05). [npm package page](https://www.npmjs.com/package/pg-boss) also displays 12.37.1 at review.
- Upstream states **schema version 45 remains unchanged** from 12.37.0. This is **not proof that schema migration is safe or unnecessary from any engine-owned or hosted baseline**.
- The 12.37.1 notes report a fix to `singleton` and `stately` queue fetching: cached active singleton keys could prevent fetching after jobs finished until a monitor refresh; with several supervising instances the stale block could persist without a bound. Treat this as a *material concurrency/availability regression candidate* for isolated reproduction, **not** as a certified fix in SEO ENGINE.
- The existing assessment `UGP-11.1C-PG-BOSS-ADOPTION-ASSESSMENT.md` named 12.37.0 as the leading candidate on 2026-10-09. That candidate version is therefore **stale as a current-version recommendation**. This note does not rewrite or erase the historical assessment.

## Locally verified source boundaries (at base commit)

1. `.github/workflows/ci.yml`: `actions/setup-node` uses `node-version: 22` (not a guaranteed 22.x patch), disposable CI `postgres:17-alpine`; tests do not establish the live Railway runtime.
2. `artifacts/api-server/package.json`: `postgres` and `drizzle-orm` are included; **no pg-boss dependency** is declared.
3. `UGP-11-C4-RAILWAY-RUNTIME-INVENTORY.md`: read-only October 11 service metadata shows Railway PostgreSQL image *tag* 18 and a digest-pinned shadow app, but neither observed SQL `server_version` nor Node patch and no UGP worker admission.
4. `UGP-11-C4-CERTIFICATION-EVIDENCE-ROLLUP.md`: exact-head disposable PostgreSQL fault-injection, fencing and read-only observation evidence is consolidated. None certifies pg-boss or grants dispatch/automatic retry authority.

## Candidate comparison — decision gates, not claimed passes

| Gate | pg-boss 12.37.1 candidate | Engine-owned thin PostgreSQL adapter | Status |
|---|---|---|---|
| Exact package, license, dependencies, advisories | Independently pin and inspect 12.37.1 tarball, integrity, tagged source, license, lockfile and transitive advisories | Independently review existing `postgres` dependency and engine-owned code | OPEN |
| Runtime compatibility | Confirm exact Node >=22.12, PostgreSQL >=13, engine version and extensions in explicitly approved nonproduction environment | Confirm supported Node/PostgreSQL and protocol behavior | OPEN |
| Schema lifecycle | Inspect schema 45 migration/boot/start path offline, prohibit implicit DDL | Review fixture versus planned migrations and rollback | OPEN |
| Claim/lease/fence | Reproduce lost-lease, stale settle/heartbeat, abort-after-side-effect, kill/claim races with independent P9 trust | Preserve exact control-first lock order, fenced compare-and-swap, deny without certified P9 | OPEN |
| Singleton availability | Reproduce 12.37.1 cached-key regression fix across multiple instances and monitor contention | Compare uniqueness/claim fairness/load behavior | OPEN |
| Ambiguous commit/retry | Disable or isolate worker start/retry; uncertain external effects go to manual intervention | Existing disposable uncertainty experiments remain test-only | OPEN |
| Security/operability | Review retention, telemetry, cost, lifecycle, version churn and incident response | Review engine-maintenance burden and migration cost | OPEN |

**Provisional recommendation:** Do **not** select either transport from publisher claims or disposable tests alone. Keep 12.37.1 as the *updated pg-boss review target*, retain the thin adapter as baseline comparator, and request independent security/architecture signoff plus a separately authorized disposable package spike if justified.

## Required subsequent evidence / authorities

- Produce tagged-source/tarball checksum and complete dependency/advisory record, license notices and migration inspection. **No installation in this PR**.
- Capture exact *authorized nonproduction* runtime and PostgreSQL versions without secrets or production SQL.
- Certify concurrency, uncertain commits, stale claims and multi-instance singleton/fetch behavior in a separately authorized disposable PostgreSQL environment.
- Resolve independent P9 C2 identity and signing ownership issue #1054; queue or test fixtures must never issue authority.
- Document security, privacy, reliability, operational cost and explicit selection by accountable reviewers before any adoption PR. Operational activation requires later **separate** approval.

**Explicitly excluded:** package installation, lockfile mutation, application code or CI changes, database access/DDL, service restart, worker/scheduler/claim activation, credential access, publication/outreach/provider calls, public-site mutations, deployment, `main` modification, or permission to retry uncertain side effects.

**Disposition:** Upstream candidate freshness **UPDATED**; candidate compatibility **UNVERIFIED**; transport choice **UNDECIDED**; production/P9 authority **NOT GRANTED**.
