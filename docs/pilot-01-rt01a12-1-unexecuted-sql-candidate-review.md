# RT01-A12.1 — Additive PILOT-01 SQL *candidate* (never executed)

**Baseline:** `d68da121353daa18818d912b5209de6a9be5a78a` / merged RT01-A12.0. **Authorization:** source-only SQL candidate plus static tests, draft PR only.

## Files and separation

- `docs/sql-candidates/rt01-a12-1-pilot01-additive.sql`: **non-operative** proposed DDL. Deliberately **outside** `lib/db/migrations` and any runtime bootstrap path. Do not copy, rename, apply, enqueue or use as a migration without a separately authorized review of the exact content and target.
- `lib/db/src/pilot-01-rt01a12-1-candidate-static.test.ts`: offline text inspection, with `node:fs`, `node:test`, no PostgreSQL client and no test DB.
- No runtime imports; no modifications to `public.jobs`, `auth_sessions`, P8.8 tables, application config, routes or workers.

## Proposed integrity architecture

1. A dedicated `pilot01` namespace contains `grants`, `jobs`, `admissions`, `job_events`, `outbox`. Existing canonical `organizations` and `sites` identities remain authoritative.
2. Add a **unique index** on canonical `public.sites(organization_id,id)` so a composite FK can constrain grants to the exact owner/site pair. **Caution:** this does change the indexing of an existing table; it requires independent live schema, lock, latency and drift impact review before any execution.
3. All grants are session- and issuer-bound, allow only `analyze`/`recommend`, enforce mutually exclusive issued/consumed/revoked timestamp shapes. A SQL CHECK alone does **not** enforce legal state *transitions*, server-authenticated issuer authority or DB-time expiry; these require transactional adapter logic and tests.
4. Composite FKs connect jobs to grants, admission receipts to jobs, and events/outbox to admission identities. Unique constraints limit grant/job duplicates and idempotency collisions per organization. A replay must additionally validate exact scope and request fingerprint, not just rely on uniqueness.
5. Admission and job-event rows reject UPDATE/DELETE via triggers; owners/superusers can still alter DDL and therefore governance, role custody and backups remain necessary.
6. Worker generation, lease expiry, owner and outbox identity are represented, but **the candidate has no atomic claim/renew/complete implementation and does not prove fencing**. The outbox state defaults to `blocked`; it cannot authorize provider execution.
7. All five tables have RLS **enabled and forced**, with **no access policies**. Schema/table/function privileges are revoked from `PUBLIC`. This is intentional default-deny and **not a deployable app role design**. A future vetted migration must define least-privilege roles, row policies, ownership and verified tenancy checks. No role is created or granted here.
8. No migration stamp, policy control, initial issuer, seed grant, switch, queue job or app integration is introduced.

## Important blockers and proposed corrections for A12.2+

- **S01 — Transactional integrity:** DDL does not enforce consume+job+receipt+event in one commit; implement a reviewed SQL transaction adapter with fault injection and no-success-on-unknown-commit semantics.
- **S02 — Lease fencing:** DB checks must require exact owner, generation, unexpired DB-time lease for *every* state, result and outbox transition; CAS/locking tests with stale owner are required.
- **S03 — RLS role design:** explicit grants, scoped tenant policies and tests for owner and worker roles are absent by design. Beware table owners, BYPASSRLS roles, function definer privileges and SET-based identity spoofing.
- **S04 — Membership and issuer:** canonical `auth_sessions` has no evidenced tenant membership or issuer custody. Session FK is referential, not proof of unrevoked authenticated authority; resolve separately from trusted server source.
- **S05 — Race and retention:** grant transitions, cancellations, event atomicity, issuer revocation, outbox delivery/cancellation and grant expiration require separate implementation. No guaranteed external exactly-once effects.
- **S06 — Existing table index:** composite unique index on `public.sites` requires evaluation of existing indexes, migration lock, rollback, owner and drift before execution; no automatic bootstrap or Drizzle push.
- **S07 — Existing runtime:** legacy queue and signed-cookie admission remain unmodified and cannot be allowed as a fallback. Current public-table-count classifier is untouched but compatibility requires explicit isolated tests.
- **S08 — Structural review:** PostgreSQL syntax, constraint behavior, privileges and deadlocks have NOT been tested against any database. Offline text assertions cannot certify these properties.
- **S09 — No current deployability:** default-deny RLS with no policies intentionally denies application access. Do not treat a successful source CI as migration, startup or operational pilot certification.

## Acceptance and authorization ledger

| Gate | Requirement | This PR |
| --- | --- | --- |
| Source candidate and offline static inspection | Candidate remains outside runtime migration lane | Delivered for review |
| Syntax/constraint/role validation on isolated PostgreSQL 17 | Separately authorized disposable environment, negative tests and cleanup | **Not performed** |
| Database identity, migration ledger, drift and locking certification | Specific approved resource and credentials, least privilege | **Not performed** |
| Durable adapter and worker-lease proof | Exact tenant/issuer and atomic, fenced transactions, T01–T16 | **Not performed** |
| Operational integration, provider reads, deploy | Independent owner authorization and certification | **Not performed** |
| PR merge | CI SUCCESS, Tahseen formal APPROVED, user exact-HEAD authorization | **Pending** |

Preserve `PUBLIC_SITE_WRITES_ENABLED=false`, `AI_PROPOSAL_GENERATION_ENABLED=false`. No SQL execution, connection, migration, worker activation, deployment, provider access or public-site write is authorized by this PR.
