# UGP-11.C4-E1 Stage 2A: offline readiness plan

**Status: PREPARATION ONLY. No experiments, package installation, database connection, migration, runtime activation, deployment, or merge.**

## Reference baseline
- Last certified UGP HEAD at preparation start: `acbb3c3a5bcbf6479194837b2b38e1ddfe3c5f51`; CI #39969735875 passed.
- Subsequent UGP commit `b2c62bcd250b0fc45ccffcea9574daa21f16e7af` had CI #40118290999 still running when inspected. Reconcile and re-review the design against the latest certified baseline before integration.
- Related repository documents: `UGP-11-C4-E1-STAGE1-HARNESS-PREPARATION.md`, `UGP-11-C4-TRANSPORT-PARITY-ACCEPTANCE-PROTOCOL.md`, `UGP-11-C4-PG-BOSS-SCHEMA46-SOURCE-RISK-REVIEW.md`.
- Independent trust approval issue #1054 and transport selection issue #1061 remain open.

## Offline evidence inventory
| Area | Established from source | Evidence still missing |
| --- | --- | --- |
| Node.js | CI requests major 22 | Exact runtime patch and binary/image provenance |
| PostgreSQL | CI specifies postgres:17-alpine | Disposable instance server version, immutable image digest |
| Package manager | Workspace pins pnpm 10.34.5 | Reviewed reproducible candidate-specific lockfile |
| pg-boss | Tag 12.38.0 reviewed at upstream commit 2c1005b744952360e999c2000e155a1bfebb8951 | Distribution artifact checksum, transitive dependencies, advisory clearance |
| Migration | Schema version 46 has concurrent asynchronous index work | Approved disposable-only lock/interruption/cleanup evidence |
| Startup | Upstream defaults include migration, schema creation, scheduling and supervision | Reviewed explicit lifecycle containment |
| P9 | Source fixtures are deny-only | Independently approved trust ownership and scoped authority |

## Proposed Stage 2B environment
Use an independently approved, separately identified disposable test account and database. Record Node patch, immutable PostgreSQL image digest, role/schema isolation, artifact hashes, reviewer ownership, bounded synthetic workloads, network isolation, deterministic seeds, evidence storage and teardown requirements. Exclude production, shared databases, Railway services, customer data, providers and P12.2 fixtures. Treat all these as **unverified plans**, not environment facts.

Separate a privileged migration phase from an ordinary minimally privileged test runtime. A reviewed target-identity assertion must prevent running against anything other than the approved disposable fixture. Prohibit import-time startup and default schema changes. Keep external network and real credentials unavailable. Require a reviewed restoration and teardown procedure.

## Proposed gated Stage 2B sequence — NOT AUTHORIZED
1. Obtain named project operator, independent DB/security reviewer, reliability reviewer and privacy reviewer approvals.
2. Secure a separate user authorization that names the specific disposable target, exact package versions, installation allowance, permitted SQL/migrations, tests, concurrency ceilings and teardown.
3. Validate runtime versions, image digest, package hash, dependency tree, license/advisories and planned schema before any approved execution.
4. Run independently approved migration-only checks using disposable synthetic fixtures, including v45-to-v46 interruption, incomplete indexes and recovery.
5. Execute the A01–A14 parity cases against both candidates under identical synthetic seeds and stop conditions.
6. Record observations, failures, inconclusive cases, uncertainty classification, latency/locking, cleanup evidence and independent reviewer disposition.

A missing, failed, skipped or ambiguous case is NOT CERTIFIED. A successful isolated test never authorizes operational claim, scheduling, production schema modification, publication or provider calls.

## Stage 2A exit checklist (all subject to reviewer confirmation)
- [ ] DB owner signs isolated-target, privileges, migration and teardown plan.
- [ ] Security/P9 owner signs trust, tenant isolation and network-boundary plan.
- [ ] Reliability owner signs deterministic injection and evidence requirements.
- [ ] Privacy owner signs synthetic-data and log-retention constraints.
- [ ] Project owner independently authorizes Stage 2B in precise written scope.

**Disposition:** PREPARATION COMPLETE WHEN DOCUMENT REVIEWED; EXECUTION BLOCKED. This document itself provides no approval for dependency installation, database access, migrations, workers, provider operations, deployment, `main`, or merge.
