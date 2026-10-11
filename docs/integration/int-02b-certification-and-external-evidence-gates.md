# INT-02B — compatibility certification and external-evidence gate

**Scope:** Draft PR #1072, isolated `integration/int-02-migration-authority-design`. This is a review/decision document, not database inspection or SQL application authority.

## Verified engineering evidence (at commit c64c33f8e11afac86c3f7301e9f774170aa9c537)
- Immutable 0008–0011 main SQL namespace preserved, and original UGP SQL bytes copied under integration 0012–0015, source mapped and SHA-pinned.
- Disposable PostgreSQL 16 executes 0001–0015 in order, checks completed-application trace, and independently reconstructs a second clean 55-table schema.
- Structural catalog comparisons reject changed columns, indexes, constraints (including foreign keys), and audit-trigger disablement, including where table count is unchanged.
- Source-only manifest/receipt tests reject missing/duplicate/out-of-order/fabricated migrations, historical UGP 0008–0011 namespace collisions, and mismatched canonical file SHA-256.
- Migration-admission and installer-authority guards return non-admission even for caller-supplied positive verification and approval flags.

These are **CI/disposable results only**, not evidence of installed historical lineage for a real target.

## Explicit blockers before changing Draft status

**G1: Independently identified target and DB authority.** Responsible infrastructure/architecture owner must supply an approved authority decision, precise provider account/project/environment/service/database identity, and independent corroboration of actual application binding. Existing provider documents are hypotheses until validated. No Production access is authorized in INT-02B.

**G2: Independently collected historical migration receipts.** A separately authorized read-only operation or signed controlled export must establish actual applied SQL records, hashes, immutable execution references, ordering, and target binding. Absence of a ledger remains unresolved; source hashes and matching schema alone do not prove execution. Original UGP 0008–0011 must be distinctly classified before integration.

**G3: Exact target-specific reconciliation.** Validate real installed schema/catalog, its source history, prestate, and collision/partial states against the pinned reference. Document whether the target is main-only, legacy UGP-only, already combined, partial, or unknown. Reject unclear or mixed histories; no automatic renumbering/backfill/replay.

**G4: Execution plan and approval.** Design an idempotent, transactional where feasible, fail-closed installer, with least-privilege credentials, single-owner lock, exact expected prestate, error rollback rules, dry-run report, backups/recovery and separate per-target authorization. Do not wire it into startup, cron, or deployment before security/DB-owner review. Existing migration authorizations cannot be reused.

**G5: Integration review.** Reconcile remaining INT-01 application merge conflicts, validate downstream build/API consumers and staged service behavior in a newly authorized isolated environment, and separately plan deployment/rollback. Passing compatibility tests cannot substitute for this integration review.

## Recommendation

Place INT-02B in **disposable compatibility validated / live-history blocked** until G1 and G2 receive independently witnessed evidence. Avoid promoting a synthetic receipt or accepting operator-supplied `verified:true` as proof. Keep Draft PR #1072 open for review; no merge, deployment or Production database operations.
