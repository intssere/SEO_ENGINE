# INT-02 — migration namespace and schema authority design (source audit)

**Status:** proposal only. No migrations renamed, no executable integration tree, no DB access or DDL.
**Pinned main:** `93f457f9f00d1ef36c3c92dacef1ca42aa2c2b9e`.
**Observed UGP:** `c454f4428be6799bc6c0e0c160c27f0f7d58869e` (UGP moved since INT-01: re-freeze before integration implementation).
**Prerequisite:** INT-01 PR #1068 merged with post-merge CI run 38120441858 SUCCESS.

## Evidence

GitHub source directory inspection confirms distinct SQL files numbered 0008–0011 in each branch:

| Sequence | Main (preserve) | UGP (preserve as provenance) |
| --- | --- | --- |
| 0008 | `0008_first_party_crawl_l2_invocations.sql` | `0008_ugp_10_3_authority_outreach_review_events.sql` |
| 0009 | `0009_first_party_crawl_l2_bounded_pilot_phase.sql` | `0009_ugp_10_31_outbound_safety_ledger.sql` |
| 0010 | `0010_first_party_crawl_terminal_failure_recovery.sql` | `0010_ugp_10_32_single_send_execution.sql` |
| 0011 | `0011_first_party_crawl_expected_absence_disposition.sql` | `0011_ugp_10_33_controlled_https_certification.sql` |

Main `lib/db/src/runtime-bootstrap.ts` recognizes P12.2 L2/recovery/expected absence states; UGP counterpart recognizes UGP 10.3/10.31/10.32. Both share earlier 0001–0007 migration assumptions. Both `lib/db/package.json` scripts exercise their respective migrations. A combined bootstrap is not currently certified. Existing table counts alone cannot prove schema authority, installed migration lineage, or column/constraint integrity.

## Design choice — do not apply yet

1. Keep the **existing** main 0008–0011 source names/checksums and deployed history unchanged.
2. Reserve a new numbered, scoped **UGP integration series**, tentatively `0012–0015`, **only if** independent search proves no new main/UGP migration is using those IDs and historical installation state permits this strategy.
3. Copy the exact UGP SQL bodies with pinned original hashes and an auditable mapping `UGP 0008→integration 0012`, `0009→0013`, `0010→0014`, `0011→0015`. This is **not yet a rename authorization**; prove dependencies on the main 0011 state and any UGP standalone environments' already-applied history before implementation.
4. Add a deterministic migration manifest with canonical lineage identifiers, SHA-256s, explicit prerequisite graph and installation-check rules that are not inferred from filename prefixes alone.
5. Extend runtime schema recognition to use table and column identities, constraints and version evidence rather than table counts alone. Preserve legacy distinctions and reject mixed/ambiguous schemas.
6. Ensure isolated PostgreSQL tests cover (a) main path 0001–0011, (b) proposed combined path, (c) already-applied UGP 0008–0011 provenance, (d) replay/no-op, (e) checksum collision, (f) partial applications, (g) missing prerequisites, (h) incompatible dual-lineage state and (i) default-off runtime behavior.
7. Review exact SQL (including referential dependencies, triggers, indexes, permissions and backfill behavior), migration consumers, any installed migration ledger and build packaging **before** choosing final numbering or authorizing DDL.
8. Resolve canonical Production data authority (Neon vs Railway) independently; test only disposable fixtures. Do not infer what has been applied from repository filenames.

## INT-02A source-level SQL dependency audit (verified)

All four UGP SQL bodies were read at UGP HEAD `c454f4428be6799bc6c0e0c160c27f0f7d58869e`:

- UGP 0008 creates `authority_outreach_review_events` (1 table), foreign key to `sites(id)`.
- UGP 0009 creates `authority_outreach_suppressions`, `authority_outreach_send_reservations`, and `authority_outreach_send_safety_events` (3 tables), with `sites` references and intra-migration reservation reference.
- UGP 0010 creates `authority_outreach_single_send_executions` and `authority_outreach_single_send_execution_events` (2 tables), dependent on the 0009 reservations and `sites`.
- UGP 0011 adds a changed event-reason CHECK constraint to the execution-events table created in UGP 0010. It first discovers and drops the existing constraint dynamically, and fails if missing; this makes ordering and replay checks particularly important.
- The four UGP migrations have **six new tables total**, plus an ALTER migration. They form the dependency sequence `UGP 0008 / 0009 -> UGP 0010 -> UGP 0011` (the 0008 and 0009 relationship is not asserted from FK evidence; both depend on the pre-existing `sites` table).
- Proposed 0012–0015 remains provisional; do not assume those numbers unused in later branch changes, or that renamed files can be applied safely to databases that already recorded original 0008–0011 names.

**Concrete fail-closed hazards:** (1) duplicate sequence IDs masquerading as equivalent migrations; (2) an already-applied UGP installation recorded by original filenames/checksums; (3) the UGP 0011 dynamic constraint replacement applied against an unexpected constraint; (4) main runtime classification based on table count and UGP's six extra tables; (5) packaging/runtime bootstrap assumptions on both branches.

**Next source audit:** trace the actual runner/ledger and test assertions that bind filenames and checksums; verify current main schema prerequisite objects and all SQL effects (triggers, indexes, DML). Then create a deterministic rename/manifest proposal with isolated fixture tests. No SQL execution authorized by this document.

## INT-02A bootstrap tracking findings (source-backed)

At both branch heads, `lib/db/src/runtime-bootstrap.ts`'s `applyMigration(sql, filename)` reads a SQL file by explicit filename and submits its contents to `sql.unsafe`. The ordinary bootstrap path applies only `0001_core.sql` and `0002_auth.sql` when their early table-count states warrant them. Subsequent migrations are not shown to be automatically sequenced by a durable migration ledger in this path. **Do not infer that the entire repository has no migration ledger**: all dedicated P12.2/UGP migration executors, release CLIs and tests still require inspection.

Main's `classifyRuntimeIdentitySchema(tableCount, shape)` distinguishes selected ambiguous 38-, 41-, and 43-table shapes by presence/count of crawl L2, recovery/disposition and P8.8 policy tables; it also recognizes later engineering table counts. UGP's parallel bootstrap instead recognizes its outreach phases. Neither can simply replace the other in a combined runtime.

Implications:
1. Preserve the current main bootstrap's explicit Production shape distinctions. Combined schema admission must distinguish the **actual** six UGP outreach tables and altered CHECK constraint, not just an arithmetic table-count increment.
2. Search every dedicated migration apply/certifier and runtime packaging path for existing lineage fingerprints, checksum enforcement and rollout receipts before assigning new filenames.
3. A new integration migration manifest is a **proposed** contract, not an existing guaranteed ledger. Specify immutable UGP-original SQL hashes and explicit mapping only after source audit and a confirmed current numbering reservation.
4. Refuse to recognize a partially installed, already-applied-but-misnumbered, or semantically divergent schema as ready; build disposable negative tests.

## INT-02A dedicated migration-executor evidence (verified)

Main's **P12.2 migration 0011 is not a freely renumberable SQL script**. The production migration contract `artifacts/api-server/src/lib/p12-2-l10-19-a-0011-apply-contract.ts` hardcodes exact migration path, Git blob SHA and SHA-256, together with Packet 014, execution-plan, checkpoint, failure-event, accounting-snapshot and L2 receipt fingerprints into an explicit authorization fingerprint. The corresponding `p12-2-l10-19-a-0011-apply-cli.ts` expects the migration at `/app/0011_first_party_crawl_expected_absence_disposition.sql`, verifies raw bytes against expected SHA-256 and requires the exact authorization literal before invoking `psql` with a single bounded process and state checks.

**Consequences:** preserve main 0011's original filename, bytes, pinned artifacts and historical authorizations. Do not change the main 0008–0011 namespace or replace its migration body. The ordinary `runtime-bootstrap.ts` path is not the only migration authority. Other dedicated execution pathways must be traced before assuming lack of checksum/receipt tracking. UGP 0008–0011 path consumers and historical apply receipts still require separate verification before final UGP integration numbering. No existing UGP installation may be assumed upgrade-safe from filename renumbering alone.

**INT-02 acceptance gate:** produce a source-backed immutable mapping manifest (original UGP blob SHA, raw SHA-256, proposed integration path, prerequisite objects, execution consumers); test collision and already-applied-lineage rejection on disposable PostgreSQL; preserve independent Production authority decision. No SQL/DDL was executed during this audit.

## Explicit gates

**INT-02A:** source-backed SQL and migration-runner dependency audit with filename and checksum mapping; no DDL.

**INT-02B:** reconciliation implementation and disposable database migration tests, after reviewing both schema ownership lineages and pinning current heads.

**INT-02C:** combined runtime-bootstrap, package/build and CI integration, then full isolated regression certification.

**NO-GO** on any Production SQL, schema modification, new crawl, public/provider write, autonomous UGP activation, or merge to main without separate authorization.

**Next action:** audit complete SQL dependency graph and existing migration application tracking, then propose actual isolated migration-compatibility implementation and tests. Avoid another blanket UGP merge.
