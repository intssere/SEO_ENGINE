# INT-02C-08 — Production DB authority and recovery design reconciliation

> **Current status overlay — 2026-10-13 (INT-02D-03):** The owner approved Railway PostgreSQL (Path B) as SEO ENGINE's future target architecture; the supersession proposal and canonical reconciliation merged through PR #1108, main `f61932a1f241b7ed41b4b4f6fc7dfc471be87299` with passing post-merge CI. C2Y Path A remains the **historical previous target**, rather than today's normative target architecture. Earlier sections describing Path A as currently normative, a Draft PR, or unassigned external reviewers document the former checkpoint. **No current Production DB source-of-truth certification** is implied: binding, identity, SQL channel, migration ledger and PITR/recovery evidence remain unresolved, and all execution gates below remain intact. No SQL, credentials, migration, cutover, infrastructure change or deployment is authorized.


**Scope:** source-only comparison; no database credentials, SQL, deployments, provider changes, merge, cutover, or live data inspection.

## Compared authoritative and proposed documents

1. `docs/p8-8-w09c2y-railway-database-architecture-decision.md` — merged architecture decision, **Path A (external Neon)** until explicitly superseded.
2. `docs/p12-2-l10-56h-1-railway-pitr-evidence-handoff.md` — October 10 operator-reported isolated Railway PITR rehearsal, not source-of-truth certification.
3. `docs/p12-2-l10-56h-2-db-authority-recovery-cert-design.md` — existing *proposal* defining provider lineage, recovery integrity, evidence manifest and P11.4 stage mapping.
4. `docs/integration/int-02c-04-railway-postgres-architecture-supersession.md` — user-selected Railway Path B, Draft supersession pending approvals/merge.
5. `docs/integration/int-02c-06-railway-operator-inspection-procedure.md` — fixed-query, read-only operator procedure with strict execution gates.
6. `docs/integration/int-02c-07-historical-binding-evidence-reconciliation.md` — October 10 operator-reported unresolved `DATABASE_URL` reference, not provider-attested current binding.
7. `docs/integration/int-02c-05a-railway-metadata-query-contract.mjs`, `int-02c-05b-disposable-execution-adapter.mjs`, `int-02c-05c-independent-evidence-gate.mjs`, `int-02c-05d-trusted-evidence-source.mjs` — offline-only safeguards; no Production SQL adapter.

## Reconciliation decisions

| Area | Existing P12.2 recovery design | INT-02C integration design | Disposition |
|---|---|---|---|
| Governing architecture | Path A remains normative | User chose Path B as target, Draft ADR | **NO AUTO-SUPERSESSION**. Named accountable architecture and security reviewers must approve and merge successor ADR. |
| Primary candidate | Railway source/restore observed | `Postgres` exact service/volume pinned; restore excluded | Candidate recognized, never automatically Production-authoritative. |
| Binding | Operator UI previously reported reference to named `Postgres` | Current app exposes only `DATABASE_URL` variable name via safe API | Historical reference reported; **current independent structural attestation missing**. |
| Live SQL | Existing recovery doc *proposes* broader per-stage approvals | INT-02C-05A permits four catalog-query shapes in offline contract | **NO LIVE EXECUTION**. Need transport/role attestation and separately approved actual session. |
| Migration history | Requires schema lineage and ledger | Ledger candidate-name query only; no ledger contents | **HISTORICAL_SOURCE_PENDING**. No backfill or inferred apply receipt. |
| Schema comparison | Schema, indexes, columns, grants, extensions, version history | Only bounded table/constraint/candidate-ledger names | **NOT EQUIVALENT**. Additional independently reviewed metadata contracts required for full recovery certification. |
| Record integrity | Suggests allowlisted deterministic keyed digests and cross-snapshot provenance | INT-02C prohibits customer-record inspection | **OUT OF SCOPE**. No row counts/hashes/cross-volume comparisons under current authorization. |
| PITR verification | Target-time WAL/replay and source/restore snapshot continuity | Metadata-only, primary candidate target | Separate recovery workstream; no claim that historical restored copy is authoritative or PITR fully certified. |
| Identity trust | Independently witnessed provider, DB, snapshot and immutable evidence | 05C/05D reject caller-provided unverified anchors | **TRUST ANCHOR MISSING**. Matching checksums or flags do not establish provider provenance. |
| Cutover | Requires isolation, rollback, RPO/RTO, application smoke, approvals | No deployment or application binding changes | **BLOCKED**. Separate risk and execution approvals required. |

## Concrete execution ordering

**Track A — architecture and authority (before Production SQL):**
- A1: Architecture owner and security reviewer approve Path B in a superseding ADR; ensure it cannot be misconstrued as a database cutover.
- A2: Operator plus independent reviewer capture current **unresolved** app binding expression and target Railway service/volume + deployed revision through a provider-native surface, with no secret values.
- A3: Prove a pre-existing private, least-privilege, non-owner, non-superuser read-only role/session is available. If not, stop; permission or infrastructure creation is a different change request.
- A4: Independently authenticate evidence custody, reviewer separation and observed time; a self-declared registry flag is insufficient.
- A5: Obtain a new exact-target **execution** authorization and, only through an approved mechanism, inspect the fixed 05A catalog query set. The earlier INT-02C-05 authorization stopped for lack of safe access; do not replay it as an execution permit.

**Track B — historical migration proof (after A5):**
- B1: Identify candidate migration-ledger table/column schema from narrowly approved metadata only.
- B2: Submit a separate fixed, fingerprinted query contract for allowlisted ledger identifiers, timestamps and recorded source hashes. Do not select customer rows or arbitrary ledger payloads.
- B3: Compare independently witnessed original main `0008–0011`, legacy UGP `0008–0011`, proposed renumbered UGP `0012–0015`, and source-content hashes against PR #1072 compatibility rules.
- B4: Escalate missing ledger/ambiguous historical provenance to `HISTORICAL_SOURCE_PENDING`; escalate verified collisions to `HISTORICAL_COLLISION`. No migration replay, stamping or content hash substitution.

**Track C — recovery (separate authorization/workstream):**
- C1: Preserve P12.2 recovery manifest and P11.4 stage mapping unchanged; do not fold recovery or customer-data integrity into INT-02C metadata certification.
- C2: Only with separate privacy/security review, authorize target-instant recovery provenance, bounded record-integrity checks and isolated app smoke.
- C3: Require dedicated RPO/RTO, rollback and cutover signoffs. No production writes, provider switching, restore promotion or cleanup under this reconciliation.

## Current evidence classification

- **Observed provider control plane:** identified exact Railway `Postgres`, volume and app service; app has `DATABASE_URL` name.
- **Historical operator report:** `${{Postgres.DATABASE_URL}}` unresolved expression from October 10; not independently current.
- **Source-tested only:** PR #1072 migration compatibility and 05A–05D offline contracts.
- **Not established:** canonical Production database authority; exact current application binding; authenticated SQL session; migration ledger; migration execution lineage; full recovery/RPO/RTO.

## Immediate next deliverable

Assign named architecture/database/security owners and provide an operator-origin **redacted, current unresolved binding observation** with immutable witness. Until this is available, classify `INT-02C-08_RECONCILED_SOURCE_ONLY / LIVE_BINDING_UNATTESTED / LEDGER_NOT_INSPECTED / PRODUCTION_MIGRATION_BLOCKED`. Never create a new Production collector or port solely to obtain evidence without separate explicit approval.
