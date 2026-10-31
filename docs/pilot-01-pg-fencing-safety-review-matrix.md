# PILOT-01 — PostgreSQL fencing implementation safety review matrix

**Scope: source-only; no SQL execution or database access authorized.**
Baseline: `161d35ab6107bb55032ec641386ec5660d1df3d9`. Prior acceptance #1256, design #1258, disconnected port #1259, SQL candidate fixtures #1260.
The existing SQL fixtures represent individual conditional statements, not complete transactional authorization. This matrix documents integration blockers before a real PostgreSQL adapter can be implemented.

## Required corrections and proof obligations

| Gate | Current limitation / hazard | Implementation requirement | Evidence before approval |
| --- | --- | --- | --- |
| P01 | Claim statement has no trusted owner-id nonempty predicate; values are supplied through caller bindings | Validate authenticated owner and scope at adapter boundary, reject empty/unknown identities | Negative tests with empty owner and tenant mismatch |
| P02 | Lease duration is merely positive integer | Explicit maximum TTL and documented policy; ensure DB time defines expiry | Exact boundary tests for 0, 1, max, over-max and overflow |
| P03 | Lease claim and audit append are separate concerns in query candidates | One transaction, atomic job mutation and append-only receipt; rollback on audit failure | Inject audit violation and inspect unchanged job |
| P04 | Completion and external effects are not in one transaction | Enforce generation and lease on every progress/output transaction; stage external effects through a transactional outbox | Pause worker A, allow B takeover; A emits no accepted effect |
| P05 | Revoke/consume SQL conditions are independent operations | Same grant row lock or conditional updates; identity from authenticated context, not user inputs | Two PG sessions race consume/revoke, only one valid outcome |
| P06 | Current grant fixture accepts operation strings without issuer/signed provenance | Bind grant issuer, authenticity, tenant, actor, site, operation and optional exact diff to immutable database record | Unauthorized forged grant denied even if fields match |
| P07 | No real schema, constraints, RLS or migration exists in this source-only workstream | Review actual UGP/CVI schema before drafting new tables, constraints or migration | Diffed migration and rollback plan, default-off flags |
| P08 | No durable idempotency/outbox proof | Unique scoped idempotency key and transactional receipt; external effects separately deduplicated | Crash/restart tests and repeated outbox delivery |
| P09 | Static regex checks do not parse/execute SQL | Disposable real PG sessions with explicit approved DDL and bound queries | PostgreSQL version, setup hash, transaction traces, PASS/FAIL counts |
| P10 | Production access G2–G5 and startup policy remain uncertified | Preserve environment separation, fail-closed startup, no automatic live launch | Explicit owner-approved deployment/read-only pilot gates |

## Atomicity invariant

For each successful **claim, renew, progress, completion, consumption or revocation**, the caller must commit (a) scoped state change and (b) corresponding immutable audit receipt **in one database transaction**. Failure of either step must roll back both. A returned zero-row conditional update must not be treated as success.

For any external side effect, the transaction instead records a scoped, generation-fenced outbox intent. Outbox delivery must independently check authorization/idempotency and must not treat an old generation as valid simply because its intent once existed.

## Authorization boundary

`actorId`, `tenantId`, `siteId`, `ownerId`, and permission type are established by authenticated/trusted server-side context. Client-supplied values are never proof of identity or authority. An analysis grant cannot authorize site modification. Every eventual DiamondShelf.us public mutation needs separate owner approval for the exact action.

## Execution policy

This is an unexecuted safety checklist. No dependencies, DDL, migrations, PostgreSQL connections, SQL execution, workers, OAuth, provider operations, deployment, AI proposal generation, public site writes or autonomous crawl are authorized by the document. An isolated disposable PostgreSQL environment, credentials, synthetic dataset, permitted operations, cleanup and independent review must be separately approved before testing.
