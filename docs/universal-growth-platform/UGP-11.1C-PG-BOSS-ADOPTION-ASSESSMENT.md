# UGP-11.1C — pg-boss Dependency Adoption Assessment

**Decision: CONDITIONAL CANDIDATE / DO NOT INSTALL YET.**  
**Source baseline:** `initiative-universal-growth-platform` at `2c91a37681ecfc9f85167428aff2a1c480e48b34`.  
**Assessment date:** 2026-10-09 (project review).  
**Execution state:** No transport dependency, scheduler, worker, database schema or production service activated.

## Published source evidence

| Property | Verified published information | Evidence |
|---|---|---|
| Candidate version | `pg-boss@12.37.0` listed as latest in publisher release history and npm package directory at assessment | https://github.com/timgit/pg-boss/releases ; https://www.npmjs.com/package/pg-boss |
| License | npm reports `MIT`; exact tagged license file/notice must be inspected and recorded before installation | https://www.npmjs.com/package/pg-boss |
| Runtime | Node >=22.12 or Bun | https://github.com/timgit/pg-boss |
| Database | PostgreSQL >=13 | https://github.com/timgit/pg-boss |
| Concurrency | PostgreSQL `SKIP LOCKED` transport claim implementation | https://github.com/timgit/pg-boss |
| v12.37.0 schema | Schema version **45**, upgrade entails migration | https://github.com/timgit/pg-boss/releases |
| v12.37.0 changes | fixes duplicate queued jobs in concurrent singleton-key upserts; `start({ attempts })` may retry during DB unavailability | https://github.com/timgit/pg-boss/releases |
| v12.35.0 claim safety | lapsed claim cannot settle or heartbeat a replacement attempt; handler signal aborted upon lost heartbeat | https://github.com/timgit/pg-boss/releases |
| v12.36.0 observability | OpenTelemetry optional integration, plus instance registration and wait/run histogram support; new `@opentelemetry/api` peer `^1.9.0` | https://github.com/timgit/pg-boss/releases |

The above are **publisher statements and package metadata**, not independent certification of claims. The repository's current runtime Node and PostgreSQL versions, all transitive advisories, full tagged license, migration upgrade/rollback, hosting extensions and privileges, and adapter's runtime claim semantics are **not yet verified**. Do not present them as PASS.

## Compatibility/adoption gates

1. Confirm deployed and CI Node is >=22.12, plus supported PostgreSQL >=13. Record exact image/digest and database server version.
2. Review exact `12.37.0` package contents, MIT license notice, full transitive dependency tree, npm integrity, software advisories, maintainer trust, and lockfile diff. Pin exact version: do not use caret range.
3. Compare pg-boss schema 45 DDL to SEO ENGINE migration conventions; isolate in dedicated namespace/DB, prove no auto-migration in ordinary boot or `start()`. Any production DDL requires separate explicit approval.
4. Determine whether `start({ attempts })` can retry during missing DB state; never permit this to bootstrap a worker or authorize execution.
5. Verify claim leases, signal cancellation, settle-by-attempt, clock authority, crash windows, dead-letter and redrive mechanics in isolated PostgreSQL concurrency experiments. A signal abort does not prove that an in-flight provider side effect was canceled.
6. Transport must not silently retry or redrive any unknown external write, content publication, or outreach send. These classes are denied by UGP-11.1B and P9 authorization until separate review.
7. Confirm retention, archival, PII/redaction, partition/cleanup and diagnostic controls; transport payload must not store credentials or raw private provider responses.
8. Record load/failover results: duplicate producers, lost connection before/after commit, expired claim race, stale worker settle, kill/pause/drain races, poison payload and bounded retry/backoff.
9. pg-boss's own scheduler, retry and automatic maintenance features must never replace P9's original slot expiry, attempt budget or kill latch.
10. Compare self-managed cost, operational burden, observability, library API/major-upgrade cadence and fallback adapter option before making final adoption decision.

## Decision and next increment

**Recommended:** Keep `pg-boss@12.37.0` as the leading transport candidate, **not an approved dependency or operational transport**. Latest release changes are materially relevant to singleton uniqueness and stale-claim safety, but the new schema migration and start-time database retry demand separate testing.

**UGP-11.1D preparation:** an explicit-URL disposable-Postgres adapter spike, migration SQL/code inspection and failure-fencing tests. First complete the open compatibility/security gates above. The existing inert `JobTransport` port remains the engine-owned authority boundary. No worker should be started by module import, route registration or server startup.

**Production admission:** `NOT_GRANTED`. No automatic schedule, DB DDL, credential use, provider request, public-site write, outreach send or deployment is authorized by this assessment.
