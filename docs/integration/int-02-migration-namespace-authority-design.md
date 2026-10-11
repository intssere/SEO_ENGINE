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

## Explicit gates

**INT-02A:** source-backed SQL and migration-runner dependency audit with filename and checksum mapping; no DDL.

**INT-02B:** reconciliation implementation and disposable database migration tests, after reviewing both schema ownership lineages and pinning current heads.

**INT-02C:** combined runtime-bootstrap, package/build and CI integration, then full isolated regression certification.

**NO-GO** on any Production SQL, schema modification, new crawl, public/provider write, autonomous UGP activation, or merge to main without separate authorization.

**Next action:** audit complete SQL dependency graph and existing migration application tracking, then propose actual isolated migration-compatibility implementation and tests. Avoid another blanket UGP merge.
