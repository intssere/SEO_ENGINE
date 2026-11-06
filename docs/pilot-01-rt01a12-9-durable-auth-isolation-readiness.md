# PILOT-01 RT01-A12.9 — durable authorization and PostgreSQL transaction isolation readiness

**Authority:** source-only branch + draft PR, offline negative tests and documentation. No existing DB access, SQL execution, migration application, runtime wiring, worker activation, deployment, provider operations, public-site writes or merge. The candidate SQL remains unexecuted outside `lib/db/migrations`.

## Baseline evidence
- `lib/db/migrations/0001_core.sql`: canonical `organizations(id uuid)`, `sites(id uuid,organization_id uuid)` and tenant/site relationship. Existing unique `(organization_id,domain)` is not equivalent to the candidate composite `(organization_id,id)` index.
- `lib/db/migrations/0002_auth.sql`: `auth_sessions` has subject, global role, expiry and revocation but no organization-scoped membership or issuer custody.
- `docs/sql-candidates/rt01-a12-1-pilot01-additive.sql`: five `pilot01` tables with ENABLE + FORCE RLS and no tenant policies, PUBLIC revoked; not a migration. RLS currently defaults to deny; no production role grant is certified.
- `lib/db/src/pilot-01-rt01a12-8-disconnected-transaction.ts`: synthetic request/evidence checks, transaction port, membership/issuer revision fences. No real recheck or durable revocation serialization.
- `docs/pilot-01-rt01a12-6-source-compat-security-readiness.md`: detailed C01-C12 blockers, notably membership, issuer, roles, RLS, migration compatibility, legacy queue and worker boundaries.

## PostgreSQL roles/RLS compatibility specification — no executable statements
| Future role | Intended custody | Must not have |
| --- | --- | --- |
| migration owner (NOLOGIN) | Schema/object ownership behind controlled deployment | Application login or routine query access |
| migration operator | Separately approved, time-limited migrations | Permanent app ownership and unrestricted credential sharing |
| API runtime | Only explicitly approved scoped reads | BYPASSRLS, superuser, ownership, arbitrary SQL, unscoped writes |
| admission service | Narrowly bounded transaction operations after server-auth | BYPASSRLS, untrusted tenant settings or unrestricted EXECUTE |
| fenced worker | Restricted work claim/transition only, separate identity | Grant issuance, membership mutation, public-site effects |
| auditor | Bounded redacted reads | All writes, bypass and SECURITY DEFINER escalation |

Required security properties: segregated database principals, all affected tables ENABLE/FORCE RLS, separate reviewed restrictive tenant policies, `USING` and `WITH CHECK` for their respective operations, no implicit PUBLIC grants, no unsafe owner/BYPASSRLS or SECURITY DEFINER escalation. Tenant/actor context must be authenticated by server-owned session evidence and transaction-scoped, never supplied as arbitrary client-settable GUC/session variables. Pool reuse must reset the context; tenant isolation also needs composite FKs and bounded app roles. Validate policies under actual least-privilege roles, not superuser-only fixtures.

**The pure `assessRole` function is a deny-oriented checklist. Its `candidate-review` status is not proof that policies are correct or that a PostgreSQL role is configured. It cannot inspect grants, RLS policy text, database owners, GUC exposure or deployed state.**

## Lock order and transaction isolation analysis
Proposed conceptual acquisition order: **session → site → membership → issuer → grant → scoped idempotency**. Every admission and every revocation process must follow a reviewed compatible order for shared resources or use a proved equivalent CAS/version-fence protocol. Consider deadlocks, missing rows, issuer reissuance, session expiry and site reassignment; a lock list is not sufficient.

| Race / failure | Expected future durable behavior |
| --- | --- |
| Membership revoked before admission's transactional authorization | Deny; stale membership version never admits |
| Issuer revoked before transactional authorization | Deny; stale issuer version never admits |
| Admission finishes commit before revocation commits | Admission is ordered before revocation; subsequent attempts deny |
| Revocation races during preliminary check | Recheck under the protected transaction boundary; deny or serialize correctly |
| Cross-tenant/site session or issuer | Deny at trusted lookup, RLS predicate, composite FK and durable admission |
| Concurrent same scoped idempotency key | One durable result; exact replay reads receipt; different fingerprint conflicts |
| COMMIT response lost | `commit_unknown`; read-only reconciliation; no implicit second write |
| Serialization failure/deadlock | Roll back and report bounded conflict/unavailable; retry policy separately reviewed, never duplicate external effects |
| Pool/session context leak | Fail closed; no tenant scope borrowed from previous request |

An implementation must account for PostgreSQL isolation-level semantics, row lock release on commit, absence/phantom custody records, transaction-scoped version fences, deterministic lock order, and database-clock expiry at the decision point. The synchronous mock cannot establish correctness under READ COMMITTED, REPEATABLE READ or SERIALIZABLE. All three need real PostgreSQL negative tests under a separately authorized disposable test environment with non-superuser roles.

## Canonical migration-impact inventory (assessment only)
1. Inspect migration ledger and checksums for `0001_core.sql` through `0011_first_party_crawl_expected_absence_disposition.sql`; no assumption that a running database matches source.
2. Assess additive tenant membership and issuer custody tables, immutable revocation audit, positive monotonic revision and referential constraints; do not alter `auth_sessions` role semantics silently.
3. Assess candidate `public.sites(organization_id,id)` unique index: cardinality, build locks, constraint compatibility, existing indexes, and ON DELETE references.
4. Assess role creation, owner grants, RLS policies, function/trigger privileges, immutable admission events, session/auth domain boundaries and transition from superuser test fixtures.
5. Assess DDL and DML backfill sequencing, possible locks, rollback/roll-forward, fail-closed application compatibility, schema ownership, and database drift.
6. Separate legacy `public.jobs` admission/worker path from protected `pilot01`; forbid implicit fallback. Keep outbox default blocked, `PUBLIC_SITE_WRITES_ENABLED=false`, `AI_PROPOSAL_GENERATION_ENABLED=false`.
7. Independently authorize target identity, read-only state inspection, disposable canonical migration replay and SQL implementation before claiming compatibility. Nothing here proves production readiness.

## Offline tests and limitations
`pilot-01-rt01a12-9-isolation-readiness.test.ts` uses no database and no network. It rejects synthetic role privilege escalation, missing RLS policy prerequisites, unsafe tenant context, cross-tenant scope, wrong lock order, stale revisions and incomplete migration gates. It illustrates necessary conditions only, not sufficient security, operational policies, or actual concurrent DB serialization. No credentials, database, migrations, API, queues, providers or public site were touched.

## Governance gates
Standard CI and A12.9 offline CI at **exact PR HEAD**, Tahseen formal GitHub `APPROVED`, then separate owner merge authorization naming the PR and exact HEAD. Source-only merge does not authorize operational SQL, migration, role changes, runtime integration, worker activation, provider operations, deployment or external writes.
