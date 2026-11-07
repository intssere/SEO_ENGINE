# PILOT-01 RT01-A12.21 — isolated PostgreSQL roles and tenant RLS certification

## Execution restrictions and attestation
The SQL candidate is outside the operational migration directory. It may be executed only in a **new, empty, disposable** `pilot01_disposable_rt01a12_21_ci` PostgreSQL 17 GitHub Actions service, with synthetic credentials, exact arming sentinel and loopback-only URL. Pre-DDL attestation checks DB name, major version, current DB principal, zero public tables, zero A12.21 roles, zero other application schemas, and zero non-default extensions. No existing or restored database access, no production role creation, migrations, runtime wiring, activation, provider operations, site writes or deployment. The PR remains draft/unmerged.

## Deduplicated reuse and exact scope
- Replays canonical `lib/db/migrations/0001–0011` and the **unmodified** A12.1 grant/job/event, A12.14 membership/issuer/revocation and A12.16 immutable custody transition candidates into the disposable test database only.
- Preserves A12.20 atomic-custody admission module unchanged; no parallel admission, worker, issuer or identity implementation.
- Adds only one `docs/sql-candidates/rt01-a12-21-isolated-role-rls-default-deny.sql`, one synthetic PG17 test harness, dedicated CI and this documentation.
- The candidate defines **NOLOGIN, NOINHERIT, NOBYPASSRLS** API, worker, migrator and owner identities. It grants API read of grants/admissions and worker read of jobs/events/outbox, but **zero role-specific RLS policies**: service roles see no rows. Service roles cannot access tenant membership, issuer custody or revocation events. Owner/migrator are inert design placeholders; they are not actual ownership chains or migrator permissions.
- All nine `pilot01` tables retain `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`. No PUBLIC custody privileges or runtime EXECUTE granted.

## Negative certification
The disposable harness covers service zero-row default-deny, unauthorized reads/writes, forbidden custody transitions, no role membership between service principals, current-user role escalation refusal, session-context GUC spoof denial, and isolation across reuse/rollback of a single pooled connection. It provisions exactly two **test-only** per-tenant roles and row policies pinned to synthetic tenant UUIDs, then verifies cross-tenant invisibility. These policies are intentionally NOT in the candidate and are NOT operational tenant membership plumbing.

## Unresolved security and deployment gaps
1. **Shared API role cannot securely determine tenant authority by arbitrary client-settable GUC.** `current_setting('pilot01.tenant_id')` alone is spoofable. Source-only tests use distinct synthetic DB roles and hard-pinned UUID policies, which do not solve production authorization or identity issuance.
2. Real application auth must establish a trusted connection/session/tenant context using independently verified identity, an auditable restricted DB API and non-reusable authority. No operational role login or trust binding is built here.
3. Service identities are intentionally default-denied; they cannot execute A12.20's privileged admission SQL. A separate security-invoker / narrowly scoped transaction API and DB-owned custody enforcement require authorization.
4. Superuser/schema-owner `BYPASSRLS`, table ownership, `ALTER TABLE`, `TRUNCATE`, SECURITY DEFINER misuse and existing privileged paths remain outside certification. Production role membership, database owner/migrator separation, grant provenance and migration history are not attested.
5. Worker lease, outbox/provider dispatch, provider read scopes, connection pool production identity and legacy public.jobs shutdown require independent review.
6. Schema setup uses test-only privileged PostgreSQL user; production-equivalent restricted-role mutation was not certified.

## Approval requirements
Exact-HEAD Standard CI SUCCESS; dedicated A12.21 disposable PostgreSQL 17 CI SUCCESS; Tahseen formal GitHub APPROVED; zero unresolved threads; separate owner exact-HEAD merge authorization. Merging source-only material does not grant operational migration, database, worker, site or deployment authority.
