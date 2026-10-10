# P12.2 L10.56H-2 — Production DB authority and recovery certification design (proposal only)

**Canonical base:** `c3ba1f3ea92579c41b647f2ed4826e380d91f9e0`.
**Prerequisite:** `docs/p12-2-l10-56h-1-railway-pitr-evidence-handoff.md`.
**Normative safety:** `AGENTS.md`; `docs/p8-8-w09c2y-railway-database-architecture-decision.md`; `docs/p11-4-backup-recovery.md`.
**Status:** proposed design, not approval, Production lineage certification, live-data inspection authority, or recovery/cutover authorization.

## 1. Decision record — open, not resolved

Current C2Y **selects Path A** (Railway runtime + certified external Neon Production DB). Evidence now exists for a successful standalone PITR rehearsal of **Railway-managed** PostgreSQL, but that operational evidence neither certifies that Railway is Production authority nor supersedes C2Y.

| Dimension | A: external Neon (currently selected) | B: Railway managed (candidate only) |
| --- | --- | --- |
| Existing canonical architecture | Compatible with C2Y/C2W provider model | Requires explicit superseding architecture decision and new provider identity/lineage model |
| Verified Production lineage | Current Neon state remains unproved | Railway service and volume IDs observed; true data authority/lineage still unproved |
| Replit separation | Possible through external DB association | Railway PostgreSQL is separate from Replit DB; migration/authority remains to be certified |
| Disaster recovery evidence | Production Neon restore not evidenced here | Isolated Railway restore, schema-name parity and nine-table count parity evidenced |
| Rollback/data movement | Requires exact independent Neon identity and app binding | Requires migration plan, consistency boundary and separately approved writes if adopted |
| Cross-provider resilience | Depends on independent Neon environment and recovery guarantees | Depends on Railway availability, region and backup/recovery architecture |

**Decision gates:** named architecture owner; security/privacy review; independently attested provider resource/lineage; source-of-truth and ownership of historical data; DDL/migration baseline; RPO/RTO objectives; incident response ownership; restore semantics; app config resolution without credential exposure; retention and costs; fallback/cutover; data migration and rollback strategy.

**Decision rule:** Maintain C2Y Path A as normative until a separately reviewed, explicitly approved superseding ADR is merged. A Path B proposal must not retroactively label the existing `Postgres` resource Production-authoritative. Do not assume Neon exists or is healthy from legacy IDs.

## 2. Integrity verification architecture

### Objective and threat model

Prove an isolated recovery copy contains the expected point-in-time database state without exposing row payloads, credentials, provider tokens, or sensitive identifiers. Prevent false PASS from matching only table counts, untrusted caller-supplied digests, nondeterministic serialization, post-target writes, schema drift or a compromised digest collector.

### Trust boundaries

- Compare evidence generated independently *inside each exact database service*; bind reports to Railway service ID, volume ID, deployment ID, database identity, transaction snapshot and independently validated recovery-time evidence.
- Neither provider-reported timestamp configuration nor `pg_is_in_recovery() = false` proves actual WAL replay endpoint. Obtain separately vetted provider/recovery logs or signed recovery attestation where possible.
- Require independent database/domain reviewer and security/privacy approver before any live record fingerprints. If the tooling cannot preserve sensitive-data boundaries, fail closed.
- Stronger record integrity may require deterministic per-table keyed digests over allowlisted columns and stable primary-key ordering in a single `REPEATABLE READ READ ONLY` snapshot. Any hash or aggregate can leak low-cardinality data; evaluate whether an HMAC/keyed mechanism or only local comparison is appropriate. **Do not print or store raw row digests for sensitive fields by default**.
- PostgreSQL's `pg_stat_user_tables.n_live_tup` is an estimate; it is not integrity proof. Exact `COUNT(*)` parity on nine tables is useful but incomplete.
- For tables without a stable key, for mutable timestamps, JSON/JSONB, nulls, collation, floats, binary values and timezone-aware fields, specify canonical serialization plus tie/collision rules before running any digest.
- The currently live source may be newer than the requested PITR instant. A correct restored snapshot can legitimately differ from the current source. Certify against a source snapshot at the *target instant* or independently retained historical invariants; never silently compare to later mutable Production state and certify exact timestamp equality.

### Proposed verification stages (no SQL supplied/authorized here)

1. Pin source/target recovery instant in UTC, provider account/project/environment/service/volume/deployment, role, connection topology and one-read-only-transaction bound.
2. Inventory schema identity: table names, migration ledger, columns/types/nullability, primary keys, unique/check/foreign-key constraints, indexes, extensions, functions, grants/roles and sequence state. Require a separately scoped authorization for each evidence class.
3. Establish count parity across **all** in-scope tables, alongside source snapshot provenance. Preserve historic target differences explicitly.
4. Author a local-only deterministic proof strategy using allowlisted record keys/fields and reviewed canonicalization; test against synthetic fixtures covering reordering, nulls, type coercion, Unicode, JSON ordering, duplicates and deliberate tampering.
5. Require signed/sanitized independently collected evidence with no secrets or per-row content; compare expected historical reference against restored result with clear PASS/BLOCKED/UNPROVED classifications.
6. Run a separately authorized *isolated* application read-only smoke without switching Production, starting mutation schedulers or invoking third-party write APIs.
7. Assess approved RPO/RTO from actual incident/restore/start/readiness timestamps; record missing metrics, not assumed guarantees.

## 3. Recovery evidence manifest v1 (design)

One immutable, sanitized manifest per exercise:
- `exercise_id`, `schema_version`, `evidence_collected_at_utc`, `operator`, `reviewers`, `authorization_ids`;
- `canonical_source_commit`, `source_service_id`, `restore_service_id`, `source_volume_id`, `restore_volume_id`, source/restore deployment IDs, provider project and environment IDs;
- `target_timestamp_utc`, `target_timestamp_source`, `replay_completion_verification` with `observed|unproved` and source reference;
- `schema_identity_result`, `table_count_result`, `record_integrity_result`, `application_smoke_result` with evidence scope, timestamp, issuer, digest or opaque reference and explicit limitations;
- `approved_rpo_minutes`, `measured_rpo_minutes`, `approved_rto_minutes`, `measured_rto_minutes` nullable until proven;
- `data_authority_adr_ref`, `privacy_review_ref`, `security_review_ref`, `open_blockers`, `disposition`.
Never include rendered DATABASE_URL, username/password, environment dumps, WAL storage keys, full logs, raw table rows or credential-derived hashes.

## 4. P11.4 stage mapping and operator checklist

| P11.4 stage | Present rehearsal evidence | Remaining requirement |
| --- | --- | --- |
| `incident_declared` | Controlled rehearsal selection, not live incident | Dated operator exercise/incident record |
| `writes_frozen` | No source write freeze was evidenced | Explicit write-freeze or controlled snapshot semantics |
| `isolated_target_ready` | Separate restored service/volume | Client-binding/isolation verification |
| `base_restore_complete` | Restored service SUCCESS; query works | Provider backup/WAL replay provenance |
| `schema_lineage_verified` | 43 public table names equal | Migration, constraints, columns, extensions, privileges |
| `integrity_verified` | Nine-table exact counts equal (27 records) | Full/historical record content evidence |
| `app_readonly_smoke_verified` | Not attempted | Independently isolated application smoke |
| `external_dependencies_reconciled` | Not attempted | Secrets/providers/external state review |
| `cutover_review_ready` | Not authorized | Architecture, privacy/security and rollback approval |
| `post_recovery_verified` | Queryable restored service only | Application/operational recovery criteria |

No stage may be reported `completed` solely because an earlier stage partially passed. This mapping does not mutate or substitute historical P11.4 synthetic certifications.

## 5. Approval and execution boundaries

**Allowed by this PR:** documentation and review only. No additional Railway reads, production SQL, records, hashes, backup/PITR operations, migrations, writes, credential reads/changes, new network access, provider operations, deployment, application rebind, cutover, deletion or merge-by-default.

**Required separate future decisions:** choose whether to initiate a superseding ADR for Path B; name accountable database/domain and privacy/security reviewers; define exact history-proof technique; approve bounded SQL only after review; separately authorize app-level isolated smoke; separately approve any infrastructure cleanup.

**Disposition:** `L10_56H_2_DESIGN_PROPOSED`; `PITR_REHEARSAL_PARTIAL_PASS`; `PRODUCTION_DB_AUTHORITY_UNRESOLVED`; `FULL_RECOVERY_CERTIFICATION_PENDING`.
