# P12.2 L10.56H-1 — Railway isolated PITR rehearsal evidence and architecture reconciliation

**Status:** documentation-only handoff; **NOT** authoritative Production recovery certification, database promotion, deployment, or recovery-operation authorization.
**Canonical base:** `main` at `0ac6dbec1e1143de1b338c8589e6f2c0d06e736d`.
**Scope:** record operator-provided observations and Railway read-only control-plane results from October 10, 2026. Preserve uncertainties and source boundaries.

## Source of truth and architecture conflict

- `AGENTS.md` remains the execution and safety contract.
- `docs/p11-4-backup-recovery.md` certifies synthetic/offline recovery planning; its claims **do not** constitute real Production recoverability evidence.
- `docs/p8-8-w09c2y-railway-database-architecture-decision.md` selects Path A: Railway application runtime plus independently certified **Neon** Production database; it explicitly says **not** to promote Railway-managed `Postgres` to Production authority.
- Observed `seo-engine-shadow` Railway application has an existing `DATABASE_URL` variable; prior operator UI reported reference `${{Postgres.DATABASE_URL}}`. A successful Railway deployment is **not** evidence that this DB is the canonical Production data authority.
- Therefore the recovery rehearsal below must be designated **Railway-managed candidate database recovery**, not a final certification of authoritative SEO ENGINE Production database. Formal Path B adoption requires a separately reviewed architecture amendment, lineage and data authority decisions, and any necessary provider-neutral attestation design. Do not quietly rewrite C2Y.

## Evidence inventory: October 10, 2026

Railway project `52265e29-921b-4652-ac0d-9da4e5e69936`; production environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`.

| Resource | Identity | Evidence | Limit |
| --- | --- | --- | --- |
| Source service | `Postgres`, `b69e0633-7ab9-40ab-85f3-c9edd6acb031` | deployment `9927392d-4e12-4266-a831-148ffe970d75` SUCCESS; volume `postgres-volume` `5e7f09d1-c436-4a49-9526-c3150d0e820a` | Not an established canonical data authority |
| Isolated restore | `Postgres-restored-20261010-1701`, `ad459f76-e3fa-4aef-bcb7-0bff509aa326` | deployment `d91e8d9f-05b8-4180-a1f3-a355d22923e2` SUCCESS; separate volume `postgres-restored` `bf4673b5-3aa8-4cf3-ba14-8edfc37d2403` | Separate volume/service does not prove total network or credential isolation |
| Application | `seo-engine-shadow`, `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90` | existing deployment `11362736-c4ea-43a0-9e4b-f6627acdee24` SUCCESS; no staged changes in later inspections | No app-level restored DB test or traffic cutover |
| Recovery target | Operator command in **restored** container printed `POSTGRES_RECOVERY_TARGET_TIME=2026-10-10 17:01:28.777688+00` | matches UI display `2026-10-10 22:01:28` at UTC+05:00 | Configured target, not independently verified WAL replay endpoint |

Operator-reported read-only `psql` sessions on source and restored containers each identified `railway`, PostgreSQL `18.6 (Debian 18.6-1.pgdg13+2)`, and an identical alphabetically sorted set of 43 public base-table names. `pg_is_in_recovery()=false` in both sessions. Both SQL transactions completed with COMMIT. This is not a byte-level comparison.

Exact `COUNT(*)` matched for nine public tables (original = restored):

| Table | Each database |
| --- | ---: |
| `organizations` | 1 |
| `sites` | 1 |
| `auth_audit_events` | 1 |
| `first_party_crawl_accounting_snapshots` | 1 |
| `first_party_crawl_checkpoints` | 7 |
| `first_party_crawl_l2_invocations` | 13 |
| `first_party_crawl_terminal_failure_dispositions` | 1 |
| `first_party_crawl_terminal_failure_events` | 1 |
| `first_party_crawl_terminal_failure_reconciliation_receipts` | 1 |
| **Total** | **27** |

Earlier `pg_stat_user_tables.n_live_tup` estimates showed all-zero estimates on restored instance; those are **statistics**, not counts. Later exact `COUNT(*)` matched across the nine checked tables. Neither statement proves record-content equality or proves all 43 tables have equal counts.

## Scoped certification verdict

**PASS within bounded observation:** standalone service provisioned; original deployment retained; separate persistent volume; database connects; observed schema-name parity; nine-table exact row-count parity; configured recovery target matches operator UI after timezone conversion.

**NOT YET CERTIFIED:** full-table exact counts, row/key/content equality, physical/page or WAL validation, actual replay completion at requested microsecond, source historical snapshot equivalence, migration and extension parity, constraints/indexes/functions/permissions parity, application read-only smoke, runtime source-to-database authority/lineage, secret/external-provider dependencies, recovery RPO/RTO against approved objectives, isolation of all possible clients, regional disaster recovery, and any traffic cutover/rollback exercise.

The source was observed later than the PITR instant, so even a future mismatch may reflect post-target writes and requires timestamp-aware interpretation. Never infer loss solely from mismatched live counts.

## Recovery-runbook handoff, not permission to execute

1. Pin incident, authorized target instant (UTC), source and restore service IDs, retention evidence and operator.
2. Require explicit restoration authorization; use standalone PITR creation, **not** the in-place volume backup swap.
3. Verify isolated service, distinct volume, original deployment survival, no application rebind, default-off workers/providers and staged-patch state.
4. With separate bounded SQL authorization, establish engine/database/schema/migration identity, strict read-only transactions and safe output handling. Never print credentials or row payloads.
5. Under privacy/compliance sign-off, design deterministic per-table key/content proof or privacy-safe integrity digests; avoid unstable ordering, mutable timestamps and secrets; evaluate historical replay limitations.
6. Verify recovery engine endpoint from trustworthy provider evidence, if available; do not treat recovery configuration alone as replay completion evidence.
7. Establish explicit RPO/RTO objectives and measure real rehearsal durations; do not invent provider guarantees.
8. Perform independent application-read-only smoke only in an isolated rehearsal with separately authorized configuration; no auto-connect to Production or public-site/provider writes.
9. Require review of architecture authority (C2Y Path A vs proposed Path B), restored-data lineage and privacy before any promotion.
10. Obtain independent approval for cleanup, deletions or cutover; do not implicitly remove the cost-bearing recovered instance.

## Stop conditions and immediate successor

Remain **RECOVERY_REHEARSAL_PARTIAL_PASS / FULL_CERTIFICATION_PENDING**. Do not call the Railway Postgres database the authoritative Production database based on this rehearsal.

Next documentation/design increment should produce (a) Path A/Path B architecture decision proposal without silently adopting either path; (b) privacy-safe immutable integrity-verification design and bounded read authorization; (c) recovery evidence manifest and operator checklist mapped to P11.4 stage terms. Every live SQL call, infrastructure mutation, deployment, cutover, credential access and deletion requires its own explicit scope.
