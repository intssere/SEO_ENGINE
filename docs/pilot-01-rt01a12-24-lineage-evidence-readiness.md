# PILOT-01 RT01-A12.24 — Operational migration lineage evidence readiness

## Disposition

**Operational migration: BLOCKED / independent lineage UNVERIFIED.** A12.24 provides *disconnected evidence validation contracts only*. It does not attest a real database, collect live provider facts, access SQL, create independent witnesses or authorize migrations. A synthetic mock-verified `PASS` proves only that a fabricated complete test packet satisfies the code contract; `operationalExecutionAuthorized` is always `false`.

## Deduplicated provenance and authority map

- `lib/db/src/pilot-01-rt01a12-23-migration-lineage-gate.ts` owns canonical source names and SHA-256 checksums, missing/duplicate installed receipts, and blocking legacy/integrated UGP namespace conflicts. A12.24 **imports and reuses** `Gate`, `LedgerReceipt` and `reconcileEvidence`; it does not clone a competing migration ledger.
- `docs/pilot-01-rt01a12-23-migration-compatibility.md` certifies only synthetic clean PostgreSQL 17 replay of mainline `0001–0011` plus A12.1/A12.14/A12.16/A12.21 candidates. Production schema and migrations remain unattested.
- `docs/integration/int-02c-db-authority-source-audit.md` documents semantic collision between canonical main `0008–0011` and historical UGP `0008–0011`; INT-02B PR #1072 proposed renumbered `0012–0015`. INT-02B-specific intake documents referenced by INT-02C are **not present in merged main**; no missing historical receipt is replaced or invented.
- `docs/integration/int-02c-08-authority-recovery-design-reconciliation.md` overlays the earlier Path A decision with merged target architecture **Path B (Railway)**, but explicitly **does not certify current Production DB binding, historical ledger, SQL authority or recovery**. Earlier Path A descriptions are historical context, not proof of current binding.
- `docs/p12-2-l10-56h-2-db-authority-recovery-cert-design.md` remains the separate recovery/backup design source. This PR checks reference completeness only; it does not claim snapshot integrity, WAL continuity, RPO/RTO or restore readiness.

## Delivered non-operational contracts

`lib/db/src/pilot-01-rt01a12-24-disconnected-evidence-gate.ts` defines:
1. Exact provider/project/environment/service/database/deployment/source-revision identity across anchor, app binding, migration ledger and catalog evidence.
2. Independently attributable collector/witness identities, digest, timestamp, witness-proof and approval references. These fields **do not cryptographically prove** signatures or trust by themselves.
3. Injectable external `IndependentEvidenceVerifier` port that must independently authenticate immutable evidence, target binding and qualified authority. A12.24 provides **no live implementation**; CI mocks do not satisfy operational trust.
4. Migration receipt namespace, original version/name, checksum, applied timestamp and opaque receipt reference. No default renumbering, stamping, aliasing or installed-receipt synthesis.
5. Catalog fingerprint comparison for tables, columns, indexes, constraints, triggers, functions, extensions, roles, grants and RLS. Metadata digests are supplied as synthetic fixture inputs, not collected from a database.
6. Recovery provenance reference completeness and explicit `PASS`, `BLOCKED`, `UNVERIFIED` outcomes, always paired with `operationalExecutionAuthorized:false`.

Any `legacy-ugp` or `integrated-ugp` record remains BLOCKED under A12.23's conservative namespace gate. A textual mapping reference alone is insufficient; a future independently authorized mapping verifier must prove exact historical equivalence and lineage before this gate can be broadened.

## Synthetic adversarial test coverage

Tests detect: missing evidence; untrusted and unavailable verifier; fabricated/self-witnessed identity; cross-project, database, deployment and revision targets; reused artifact IDs/digests; mismatched independent target attestations; conflicting main and UGP versions; legacy/integrated historical receipts; duplicate, missing and tampered checksums; schema/RLS/role drift; and missing backup, restore or rollback evidence. No network, provider, SQL or credential access is performed. Dedicated CI runs only these offline fixtures and reuses A12.23's existing source gate tests; **no new PG17 SQL execution is necessary** for this evidence-intake milestone.

## Operational STOP gates (separate future authorization)

- Authoritatively and independently attest provider/resource, actual application binding, reviewer separation, approved evidence scope and trusted verification mechanism.
- Inspect at most separately authorized bounded metadata; capture immutable, target-bound historical migration receipts and digest provenance, **not application or customer rows**.
- Resolve all main/UGP `0008–0015` collisions by accountable historical evidence, not source rename.
- Reconcile actual schema/roles/grants/RLS and migration loader history against independently obtained catalog evidence.
- Verify backup and recovery continuity, backfill, lock/rollback risk and independently approved additive installer.
- Require a new authorization for any provider read, operational SQL, migration, runtime integration, worker or deployment. This PR grants none.

## Governance

Draft PR only. Require exact-HEAD Standard CI and dedicated offline evidence CI SUCCESS, Tahseen formal GitHub APPROVED, zero unresolved review threads, and separate owner exact-HEAD merge authorization. No operational database, SQL, credentials, providers, migrations, runtime, workers, public-site writes, deployments or merge.
