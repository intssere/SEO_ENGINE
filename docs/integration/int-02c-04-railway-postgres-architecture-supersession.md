# INT-02C-04 — Railway PostgreSQL target-architecture decision (proposed C2Y supersession)

> **Current status overlay — 2026-10-13 (INT-02D-03):** Path B (Railway-managed PostgreSQL) received owner target-architecture approval in issue #1156 and PR #1108 was merged into canonical main as `f61932a1f241b7ed41b4b4f6fc7dfc471be87299`; post-merge CI run #38408381426 passed. This supersedes the earlier C2Y Path A **as the target architecture decision only**. References below to a Draft PR or pending architectural merger are historical pre-merge statements. The identified Railway service/volume, current application binding, database authority, historical migration ledger, and recovery remain **uncertified**. No Production SQL, credential access, migration, infrastructure changes or deployment are authorized.


**Decision date:** 2026-10-12. **Decision source:** Explicit user instruction: "go with railway postgrsql". **Status:** User-selected target architecture; Draft PR proposal for accountable architecture and security approval. This document does **not** certify a Production database, change the deployed runtime binding, or authorize DB mutations.

## Decision

For future SEO ENGINE Production database certification, choose **Path B: Railway-managed PostgreSQL**, rather than C2Y's previously selected Path A (external Neon). The current C2Y ADR remains the merged historical decision until this successor is independently reviewed, approved, and merged. The target-provider change does **not** authorize selecting a particular live database, making it active, changing `DATABASE_URL`, migrating schema or records, deploying, or restoring data.

## Observed candidate resources — evidence, not authority

- Railway project `52265e29-921b-4652-ac0d-9da4e5e69936`; `production` environment `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`.
- Candidate **primary** PostgreSQL service `Postgres` `b69e0633-7ab9-40ab-85f3-c9edd6acb031`; mounted persistent `postgres-volume` `5e7f09d1-c436-4a49-9526-c3150d0e820a`.
- **Restored** service `Postgres-restored-20261010-1701` `ad459f76-e3fa-4aef-bcb7-0bff509aa326`; mounted independent `postgres-restored` `bf4673b5-3aa8-4cf3-ba14-8edfc37d2403`.
- Application `seo-engine-shadow` `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90` exposes variable name `DATABASE_URL`; **no authenticated target reference** obtained.
- Last control-plane view reports successful deployments and no staged patch. These observations do not establish DB lineage, schema, recovery health, or current binding.

## Required Railway-specific identity and continuity model

Do not represent Railway PostgreSQL as Neon by filling Neon project/branch/endpoint fields with Railway IDs. Instead, require provider=`railway`, exact Railway project/environment/service ID, attached volume ID and mount continuity, authoritative database name, independently observed PostgreSQL instance/system identity (under future approved metadata-only SQL envelope), deployment/snapshot revision, WAL/PITR lineage when available, observed-at timestamp, and separate evidence custody/witness.

If provider controls cannot prove underlying storage continuity, identify that limitation; never infer identity from a service name, same `DATABASE_URL` key or successful deployment. Explicitly distinguish active primary, independently restored copy, and any pending replacement/cutover. A restored volume never becomes authoritative implicitly.

## Production binding gate

Obtain a provider-native, credential-safe **unresolved structural reference** from the deployed application to an exact Railway PostgreSQL service and resource revision. The variable name `DATABASE_URL` alone is not enough. Never use resolved credential values, connection strings, password-derived hashes, environmental dumps or unreviewed network-probing as attestation. If no safe API can expose the binding, retain `APPLICATION_BINDING_UNVERIFIED`.

## Historical schema and migration gate

After precise target and least-privilege scope are separately authorized, independently inspect read-only ledger/catalog metadata: original application main 0001–0011, legacy UGP 0008–0011 collision candidates, and integrated UGP 0012–0015. Enforce exact source SHA-256 and independently witnessed execution provenance; do not rewrite ledger, stamp, replay, backfill, or infer execution from table count. Existing INT-02B guards remain fail-closed.

## Required operational certification before cutover

- Confirm accountable architecture, database and security reviewers approve this new target.
- Certify primary-versus-restored resource roles with independently witnessed evidence.
- Verify PITR/WAL backups and test restore continuity in an explicitly approved disposable environment (no Production modification under this decision).
- Establish running application's exact binding and write/worker gating; no change to existing secret values.
- Obtain target-specific, read-only schema/ledger attestation and independent review.
- Prepare separate exact-target runbook for rollback, data movement if any, outage window, and migration checks; require separate authorization before each execution.

## Compatibility with existing design

C2Y's Neon-specific attestation criteria must not be silently weakened. The successor must add Railway-specific provenance and binding attestations with equal or stronger enforcement, and retain `PRODUCTION_MIGRATION_BLOCKED` until all review gates pass. PR #1072 migration renumbering/source checks and PR #1108 existing read-only evidence remain relevant. Do not merge these PRs automatically.

**Present disposition:** `RAILWAY_POSTGRES_SELECTED_AS_TARGET`; `PRIMARY_CANDIDATE_UNCERTIFIED`; `RESTORED_COPY_NOT_PROMOTED`; `APPLICATION_BINDING_UNVERIFIED`; `HISTORICAL_SOURCE_PENDING`; `NO_EXECUTION_AUTHORITY`.
