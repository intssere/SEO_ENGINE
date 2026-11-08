# PILOT-01 RT01-A12.23 — canonical source migration compatibility certification

## Decision: operational migration **BLOCKED**

A source-only and disposable PostgreSQL 17 replay cannot authenticate the historical migration ledger, current database resource identity, installed schemas, privileges, runtime binding, restore lineage, or production safety. Operational migration, deployment and integration remain prohibited. No live database was accessed.

## Deduplicated source audit and dependency map

1. Canonical `lib/db/migrations/0001–0011` remains the only locally replayed mainline migration sequence; checksums and version order are recomputed from source, rather than assuming naming/installed-state parity.
2. `0001_core.sql` provides `public.organizations` and `public.sites`; `0002_auth.sql` provides `public.auth_sessions`. A12.1 depends on these canonical UUID and session relationships.
3. A12.1 creates additive `pilot01.grants/jobs/admissions/job_events/outbox` and composite tenant/site constraints; A12.14 adds `tenant_memberships/issuer_custody/custody_revocation_events`; A12.16 adds immutable guarded revocation triggers; A12.21 defines disconnected service roles and FORCE RLS. A12.20 and A12.22 reuse these schemas through disconnected transaction and identity contracts. No candidate is installed into `lib/db/migrations`.
4. Historical standalone UGP `0008–0011` collides semantically with mainline `0008–0011`; INT-02B proposed renumbering to `0012–0015` for clean installs. A source-only renumber does **not** prove what was installed to a real database. Source documentation: `docs/integration/int-02c-db-authority-source-audit.md`, `AGENTS.md` and `ARCHITECTURE.md`.
5. `lib/db/src/runtime-bootstrap.ts` enumerates public-schema table-count shapes, not an independently witnessed durable version/checksum migration ledger; it cannot certify either historical namespace.
6. The current operational database provider/connection, historical application of `0008–0015`, table/index drift, privilege authority, data backfill, restore continuity and migration ownership all remain unverified.

## Delivered gates and tests

- `pilot-01-rt01a12-23-migration-lineage-gate.ts`: deterministic source migration version and SHA-256 inventory, duplicate/gap and candidate-namespace rejection, destructive-candidate guard, namespace/checksum/witness reconciliation. Witness input is synthetic test data only; it is not evidence of independent approval.
- Negative tests prove rejection of conflicting `0001`, missing historical versions, candidate migration-name collision, destructive SQL, legacy-UGP/mainline ambiguity, duplicate receipts, altered checksums and omitted witnesses. **No operational ledger is read or fabricated.**
- Dedicated PostgreSQL 17 CI creates a brand-new empty container, exact allowlisted DB/loopback URI and synthetic credentials; verifies clean catalog, schema and version before any replay. Replays exactly canonical `0001–0011`, then A12.1/A12.14/A12.16/A12.21 in dependency order. Checks unchanged canonical public column signatures, additive custody tables, guarded revocation and FORCE RLS, protected service roles, synthetic transaction rollback, and duplicate candidate rejection.
- No new migration SQL candidate is necessary at this stage. Introducing a numbered candidate before historical installed lineage is attested would be unsafe.

## Compatibility matrix

| Evidence class | Result | Explanation |
| --- | --- | --- |
| Canonical source migration order and checksums | Conditional source PASS only | Deterministic local inventory and duplicate detection, not independently installed receipts |
| Fresh PG17 baseline/candidate replay | Await dedicated CI | Test of empty synthetic database only |
| Candidate dependency ordering and public-column preservation | Await dedicated CI | Does not guarantee live schema compatibility |
| Operational 0008–0015 migration namespace | BLOCKED | Historical main/UGP collision; no target-bound independently witnessed ledger |
| Existing database ownership, role, RLS and drift | BLOCKED | Cannot infer from git or disposable superuser setup |
| Existing data backfill, rollback/recovery and lock timing | BLOCKED | Not exercised against operational data or verified backup target |
| Production compatibility and execution | BLOCKED | Requires independent target, identity, ledger and reviewer evidence plus separate scoped authorization |

## Operational gate (future, NOT approved here)

Require independently attested target identity and app-to-database binding, target-bound immutable migration history with hashes and accountable witness, catalog/extension/role/grant/RLS/drift mapping, explicit resolution of main versus UGP 0008–0015, backfill/locking risk, recovery evidence and a separately reviewed exact additive installer. Any missing, inconsistent or ambiguous receipt must STOP the migration. Do not stamp a ledger from repository checksums, table counts, CI fixtures or self-attested values.

## Restrictions and merge governance

This milestone grants no existing database access, production SQL, operational migrations, production roles, runtime wiring, workers, providers, public-site writes, deployments or merge. SQL executes only on new empty, strictly attested loopback PG17 CI instances. Exact-HEAD Standard CI and dedicated PostgreSQL 17 CI SUCCESS, Tahseen GitHub APPROVED, zero unresolved threads and separate owner exact-HEAD authorization are required before merge.
