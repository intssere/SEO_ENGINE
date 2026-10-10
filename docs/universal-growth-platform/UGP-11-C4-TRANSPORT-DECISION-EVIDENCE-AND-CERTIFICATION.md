# UGP-11.C4 — Transport Selection Evidence and Nonproduction Certification Plan

**Baseline:** `initiative-universal-growth-platform` at `ee447608465d4db450713e4347026cd17b6e54f6` (2026-10-11).
**Issue:** #1061. **Status:** DECISION PENDING / RUNTIME ADMISSION NOT GRANTED.
**Dependencies:** C2 governed identity/signer authorization gate #1054 remains OPEN; transport selection cannot bypass P9 authority.

## Source-verified compatibility facts

| Item | Current repository evidence | Consequence |
|---|---|---|
| CI Node | `.github/workflows/ci.yml` uses `actions/setup-node` with `node-version: 22` | Does **not prove an exact patch >=22.12**; record runtime `node -v` and image digest before adoption. |
| CI PostgreSQL | `.github/workflows/ci.yml` service `postgres:17-alpine` | CI PostgreSQL major 17, **not evidence** of Railway/production PostgreSQL version or extensions. |
| Runtime package | `artifacts/api-server/package.json` contains `postgres` and `drizzle-orm`; no `pg-boss` dependency in this package | A new dependency would require a specific reviewed and pinned version, lockfile verification and independently authorized installation. |
| pg-boss candidate | Existing `UGP-11.1C-PG-BOSS-ADOPTION-ASSESSMENT.md` nominates 12.37.0 with publisher-stated Node >=22.12, PostgreSQL >=13, schema 45 | CONDITIONAL ONLY. Version freshness, exact tagged package, license, transitive security status and migration compatibility need current independent evidence. |
| Transport safety | `UGP-11.1-JOB-TRANSPORT-ADOPTION-AND-SAFETY-CONTRACT.md` | Queue state, successful enqueue/claim/heartbeat and cancellation are never policy or provider-write authority. |

## Engineering comparison to be certified

| Property | pg-boss candidate | Thin PostgreSQL adapter | Required proof |
|---|---|---|---|
| Job durability, deduplication | Library-managed queues and jobs | Engine-owned tables/unique constraints | Explicit serialization + duplicate producer tests |
| Claims, lease and fencing | Published SKIP LOCKED/heartbeat capabilities; not independently certified against P9 | Explicit row locks, owner/epoch fencing, CAS updates | Worker A expired, B reclaim, A attempts complete => **must deny** |
| Control kill/pause/drain | Adapter-layer transaction must consult independent P9 state | Same requirement | Kill wins races; no claim/dispatch from stale control revision |
| Retry, dead letter | Library may provide configurable retries | Engine must implement | P9 attempt ceiling/expiry controls; no blind retries of uncertain external effects |
| DB/schema operations | Isolated library schema/version migrations | Engine-owned migration lifecycle | No DDL on module import/ordinary startup; isolated namespace, rollback review |
| Observability | Candidate library metrics/tracing | Implement explicit metrics/events | Reconstruct attempts and fence-loss without logging credentials or raw private payloads |
| Ops and upgrades | Vendor maintenance + migration cadence | More in-house ownership | Independent support, security and upgrade-cost assessment |
| Portable authority | Needs engine-owned JobTransport adapter | Needs engine-owned JobTransport adapter | Verify policies independent of transport choice |

**Provisional finding:** **No provider selected.** pg-boss is a reasonable candidate for a separately authorized disposable-DB spike, but native PostgreSQL may be preferable if library auto-start/migration or stale-claim semantics cannot be proven. The deciding factor is transactionally fenced P9 control with no external effects while uncertain.

## Executable certification specification (not performed)

1. **Environment:** independent reviewer accepts exact CI/runtime Node patch, PostgreSQL version, pinned library artifact/lockfile/commit and license. Use a disposable database and isolated namespace; no shared/prod DDL.
2. **Negative controls:** absence of independently issued and durable P9 control denies claim; a fixture-signed/public-key-asserted control is not trusted.
3. **Race A:** two producers enqueue identical fingerprint: exact replay deduped, conflicting identity rejected.
4. **Race B:** stale worker A loses lease, worker B receives fence N+1, A heartbeat/complete/dispatch denied.
5. **Race C:** kill committed before or during claim: no new claim/dispatch, latched kill not cleared by retry.
6. **Race D:** database outage and ambiguous commit: do not dispatch; read-only reconcile prior to retry.
7. **Race E:** worker crashes before confirmed side effects versus after possibly started external effect: only confirmed never-started read-only work may be retried subject to fresh P9 approval.
8. **Poison input:** malformed/foreign-tenant envelope quarantined, no credentials in queue payload or logs.
9. **Bounded window:** expire original slot; do not manufacture catch-up work or silently renew attempt budgets.
10. **Result requirements:** exact commit/test names/results, environment identity, DB/version, independent reviewer, failure-injection traces and no unauthorized dispatch before admission consideration.

## Follow-up and explicit gates

- Obtain separately approved **read-only** access to hosted runtime versions/region and independently audit package metadata, release history, license and security advisories.
- Formally decide between transport implementations after a reviewed design and cost/operability record.
- Require **separate** exact-scoped approval before adding the library, provisioning any nonproduction DB/schema, running migration tests with external resources, or activating workers.
- C2 #1054 remains the critical path; no C4 evidence grants authenticated P9 issuer, worker claim, publication or outreach authority.

**Actions expressly excluded from this increment:** dependency installation, network calls to trust services, cloud provisioning, credentials, migrations, job claiming, workers, scheduling, production deployment, external sends or provider/public-site writes.
