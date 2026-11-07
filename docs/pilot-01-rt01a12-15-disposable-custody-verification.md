# RT01-A12.15 — deduplicated disposable PostgreSQL 17 custody validation

## Exact authorization and isolation
Only a *new, empty, loopback-only* `postgres:17-alpine` GitHub Actions service named `pilot01_disposable_rt01a12_15_ci`, synthetic credentials and explicit sentinel may be used. The test rejects unarmed and non-loopback targets, existing nonempty public schema, unexpected roles, non-17 versions and unexpected namespaces **before any DDL**. All SQL is executed exclusively inside this attested disposable service. **No existing/staging/Railway/Production/restored/customer database**, migration application to a standing resource, worker, runtime route, provider operation, public-site write, deployment or merge.

## Reuse rather than duplication
- Reuse *unchanged* canonical SQL migrations `0001–0011` and the A12.1 five-table SQL candidate, followed by the **actual** A12.14 three-table candidate, only in a fresh synthetic PostgreSQL 17 fixture. No copying SQL into operational migrations.
- Reuse A12.12's guarded target and canonical migration-replay pattern. No new grant/job/admission/outbox adapter or generic custody contract.
- Reuse A12.7/A12.8/A12.10/A12.13 security designs and A12.14 offline SQL mutation checks; A12.15 is DB-behavior evidence for new three-table definitions.

## New tests and observed limits
| Test | Meaning | Explicit non-proof |
| --- | --- | --- |
| Canonical replay + A12.1 + A12.14 and exactly eight tables | Actual SQL parses and dependencies resolve on empty PG17 | No existing schema/ledger compatibility or lock-cost proof |
| Mandatory FORCE + ENABLE RLS and zero policies | Default-deny source configuration | No operational role grant/tenant policy certification |
| Composite site FK | Cross-tenant issuer/site pairing rejected | Not proof of browser tenant identity |
| Membership unique key, positive revisions, issuer operation/lifecycle | Database constraints reject invalid rows | Revision does not auto-increment or establish trusted issuance |
| Revocation shape and receipt fingerprint validation | Wrong event kind/issuer/revision/hash rejected | Hash is correlation, not issuer authentication |
| Non-superuser NOBYPASSRLS roles, no UPDATE/INSERT privileges | No privilege bypass through ordinary application probe role | Synthetic `SET LOCAL ROLE` by superuser is not production authentication |
| Test-only role-mapped tenant SELECT policy | Role A may read tenant A; role B cannot read it; injected tenant GUC does not switch trusted DB identity | Policy is **test-only** and not committed as operational SQL |
| Transactional invalid event rollback | Membership revoke rolls back if revocation event fails | Future runtime adapter must enforce same transaction |
| Privileged revision downgrade/revival probe, rolled back | Demonstrates absence of SQL monotonic revision/anti-reactivation guarantee | Does not install a fix or authorize privileged runtime writes |
| Privileged audit-event DELETE probe, rolled back | Demonstrates table owner can mutate audit history absent further enforcement | Not immutable or cryptographically attested audit |

These represent additional evidence, not production certification. A12.12's cooperative advisory-lock races, admission receipt reconciliation and provider-blocking remain separate prior tests, not duplicated.

## Outstanding blockers
1. Independently attested historical migration ledger, resource owner, existing indexes, drift, backfill, lock and rollback cost (especially 0008–0015 integration lineage).
2. Authoritative authenticated issuer issuance, trusted membership, monotonic revocation and append-only audit mutation interface, including approved role/RLS policies.
3. Enforced, non-bypass transactional admission and worker fencing integrated with actual routes, plus separate provider authorization.
4. Real non-superuser credentials/pool isolation and revocation transaction concurrency under a later independently authorized isolated environment.
5. Actual SHA-256 provenance is not a signature; signing and cryptographic provenance remain unresolved.

## Governance
Keep draft until Standard CI and dedicated A12.15 PostgreSQL 17 CI both SUCCESS on the exact HEAD, Tahseen submits formal GitHub APPROVED, and owner explicitly authorizes merge with exact PR/HEAD. A merge does not authorize any operational database, SQL, migration, runtime, worker, provider, public-site or deployment action.
