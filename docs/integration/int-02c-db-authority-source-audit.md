# INT-02C — Database authority and historical lineage: source-only audit

**Date:** 2026-10-11
**Canonical baseline:** `main@f51c5dbddfa5af36f11b139dd0a24bd3bc06d3ff`
**Scope:** repository documents and source only; no provider access, database inspection, secrets, deployment, migrations, or Production changes.
**Relation:** INT-02B remains Draft PR #1072, unmerged. Its disposable compatibility and combined-tree tests are not proof of historical execution.

## Verified source observations

| Topic | Repository source | Finding | Confidence boundary |
| --- | --- | --- | --- |
| Architecture default | `docs/p8-8-w09c2y-railway-database-architecture-decision.md` | C2Y selects Path A: Railway runtime with **independently certified external Neon** Production lineage. Railway-managed Postgres is explicitly **not promoted** to Production authority by that decision. | Architectural selection, not proof that a current Neon resource, link, or schema exists. |
| Recovery candidate | `docs/p12-2-l10-56h-2-db-authority-recovery-cert-design.md` | Reports a separately isolated Railway-managed PostgreSQL PITR rehearsal; Path B remains a candidate requiring a superseding ADR. | Recovery rehearsal is not a Production DB authority attestation. |
| Runtime bootstrap | `lib/db/src/runtime-bootstrap.ts` | Contains enumerated schema states/table counts and a bootstrap plan; table count/shape classification is not a complete historical migration ledger. | Cannot use ready/table-count labels as proof that all 0001–0015 SQL was historically executed. |
| P12.2 0011 | `artifacts/api-server/src/lib/p12-2-l10-19-a-0011-apply-contract.ts` | Pins migration filename, blob and SHA-256 and derives a specific authorization fingerprint from environment/packet evidence. | Contract is specific to 0011; neither a general 0012–0015 authority nor independent current installed-history evidence. |
| INT-02B evidence | `docs/integration/int-02b-historical-authority-evidence-gap-ledger.md` on Draft PR #1072 | Original UGP 0008–0011 namespace collides semantically with mainline 0008–0011; integrated files were renumbered 0012–0015 for clean installations. | SQL source mapping and disposable success cannot certify existing DB history. |
| Receipt protocol | `docs/integration/int-02b-independent-historical-receipt-intake.md` on Draft PR #1072 | Requires independently collected, target-bound history and witness; self-attested flags are not accepted. | Proposal/validation design, not collected Production evidence. |

## Explicitly unresolved facts

1. Which exact live provider project, branch/instance, endpoint, database and deployment are authoritative today.
2. Whether the application runtime truly binds to that independently identified resource.
3. Whether a durable migration ledger exists and covers main 0001–0011, legacy standalone UGP 0008–0011, or integrated 0012–0015.
4. Whether historical SQL was applied using versioned migrations, manual scripts, bootstrap, restored snapshot, or a mixed lineage.
5. Whether the canonical Production schema actually matches any of the certified disposable structures.
6. Whether a currently authorized accountable architecture/DB owner can independently attest identity and historical execution.

## Narrowly scoped future evidence request — NOT an authorization

A separate reviewer may propose an exact read-only inspection authorization identifying: provider/project/resource/database, deployment binding to corroborate, read-only role, approved catalog/ledger **metadata-only** queries, audit-log provenance, collection principal, immutable artifact destination, and required redaction. A witness must be independent of submitted source digests. Do not fetch connection strings, personal records, raw row payloads, tokens or secrets; do not invoke SQL or providers solely because this audit exists.

## Admission and disposition

- **Source architecture:** Path A Neon selected, **not live-certified**.
- **Historical installed lineage:** **UNKNOWN / UNVERIFIED**.
- **INT-02B disposable source and integration compatibility:** engineering-verified separately; cannot confer historical database admission.
- **Current live migration decision:** **DENY** absent explicit independent DB identity, historical receipts, reviewed target-specific installer, and new authorization.
- **INT-02C next safe step:** accountable review of this source-only gap inventory and authorization-scoped evidence collection plan; avoid generating synthetic 'Production receipts.'

This record makes no Production-state claims and authorizes no inspection or mutation.
