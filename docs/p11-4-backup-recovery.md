# P11.4 — Backup/recovery and disaster-runbook certification

## Scope

P11.4 adds a deterministic/offline recovery-planning and certification foundation over caller-supplied synthetic/local evidence.

It covers:

- recovery inventory;
- explicit RPO/RTO objectives;
- immutable synthetic backup manifests;
- backup freshness/eligibility checks;
- ordered synthetic restore stages;
- synthetic recovery-exercise certification;
- disaster-scenario recovery classification;
- fail-closed recovery safety semantics.

P11.4 does **not** prove that production backups exist, are current, are complete, are encrypted, are restorable, or have ever been exercised against production.

It performs no production backup discovery/read/export, no database/storage restore, no failover/cutover, no provider/public-site activity, no secret retrieval, no deployment and no publication.

## Certified baseline

Canonical baseline at P11.4 start:

- GitHub main: `1ad2efa3b194183e245724ac69f0863a4504df21`;
- tree: `4a0ca940dfa811d63e91b5f0f12166b4fcc63377`;
- P11.3 complete/certified;
- final P11.3 post-closeout CI #603 / run `35584504817`: success;
- Replit exact-aligned, `0/0`, clean.

Published production remains the separately certified Task #73 source.

## Current persistence boundary

The repository currently has three committed PostgreSQL migrations:

1. `lib/db/migrations/0001_core.sql`
   - organizations/sites/connections;
   - crawl/page/search state;
   - evidence/findings/opportunities;
   - action/approval/deployment/rollback/verification records;
   - experiments/outcomes;
   - policy/rules;
   - AI query/response/citation state;
   - learning signals;
   - jobs.

2. `lib/db/migrations/0002_auth.sql`
   - auth sessions;
   - auth audit events.

3. `lib/db/migrations/0003_observation_evidence_schema.sql`
   - P3.6 observations;
   - evidence references;
   - observation/evidence associations.

Existing P3.6 contracts provide deterministic schema and record-fingerprint semantics for the observation/evidence subsystem.

There is no committed production backup/export/restore automation or existing production disaster runbook.

## Recovery inventory

P11.4 classifies recovery domains explicitly.

### PostgreSQL-backup domains

The following domains are modeled as requiring database backup coverage:

- `postgres_core`;
- `postgres_auth_audit`;
- `postgres_observation_evidence`.

These represent in-scope PostgreSQL state only.

### Source-controlled recovery material

`source_migrations` is recovered from canonical source control, not from a database backup.

The expected migration lineage for P11.4 is exactly:

- `0001_core.sql`;
- `0002_auth.sql`;
- `0003_observation_evidence_schema.sql`.

P11.4 also binds the supplied backup manifest to the current P3.6 schema-contract fingerprint.

### External secrets

`external_secrets` is an explicit external/manual recovery dependency.

The core schema stores references such as `secret_ref`; it does not imply that secret values themselves are present in a PostgreSQL backup.

P11.4 therefore never treats a database backup as recovery evidence for secret values.

### External provider/public-site state

`external_provider_state` is outside PostgreSQL-backup scope.

A database restore cannot by itself reverse or reconstruct external provider/public-site mutations.

### Runtime-local state

`runtime_ephemeral` is classified as non-authoritative unless a later separately authorized architecture explicitly promotes a runtime artifact to durable recovery state.

## RPO and RTO

Recovery objectives are caller-supplied and explicit.

P11.4 never invents provider or platform guarantees.

### RPO

RPO is expressed in whole minutes.

For a selected synthetic backup:

`measured RPO = incident time - backup coverage-through time`

A backup whose coverage age exceeds the caller-supplied RPO blocks synthetic certification.

### RTO

RTO is expressed in whole minutes.

For a completed synthetic exercise:

`measured RTO = first restore-stage start -to- final post-recovery completion`

P11.4 computes this descriptively from supplied timestamps only.

It does not claim that production would recover in the same time.

## Synthetic backup manifest

A P11.4 manifest contains bounded supplied evidence for:

- backup ID;
- status: complete / partial / failed;
- creation time;
- coverage-through time;
- covered recovery domains;
- migration lineage;
- P3.6 schema-contract fingerprint;
- optional object count;
- optional byte count;
- SHA-256 checksum/digest;
- optional supplied encryption flag;
- verification state and verification time.

Each normalized manifest receives a deterministic SHA-256 backup fingerprint.

Exact replay of an identical backup ID dedupes.

Reusing a backup ID with different content fails closed.

## Backup eligibility

A selected database backup is eligible only when supplied evidence shows:

- status is `complete`;
- integrity verification status is `verified`;
- all three required PostgreSQL recovery domains are present;
- migration lineage exactly matches the current expected migration list;
- the P3.6 schema fingerprint matches the current schema contract;
- backup coverage is inside the supplied RPO window;
- the backup was not created after the incident/reference used for recovery selection.

An incomplete, failed, unverified, stale, domain-incomplete or schema/migration-mismatched backup cannot certify a synthetic recovery exercise.

## Restore-stage runbook

P11.4 defines the following ordered checklist:

1. `incident_declared`
2. `writes_frozen`
3. `isolated_target_ready`
4. `base_restore_complete`
5. `schema_lineage_verified`
6. `integrity_verified`
7. `app_readonly_smoke_verified`
8. `external_dependencies_reconciled`
9. `cutover_review_ready`
10. `post_recovery_verified`

These are **evidence stages**, not executable steps.

A completed stage requires:

- start time;
- completion time;
- verification fingerprint;
- no blockers.

A blocked stage requires:

- start time;
- one or more explicit blockers;
- no completion time.

A not-run stage carries no execution evidence.

Later stages cannot be completed if an earlier required stage is blocked or not run.

## Synthetic certification

For database-relevant scenarios, `certified_synthetic` is possible only when supplied evidence proves all of the following:

- a backup was selected;
- backup eligibility passed;
- all required restore stages completed in order;
- required schema/migration lineage matched;
- integrity verification passed through the supplied manifest/stage evidence;
- external dependency reconciliation completed;
- measured RPO met the supplied objective;
- measured RTO met the supplied objective;
- no stage blocker remains.

This is a certification of the **synthetic fixture/runbook evidence**, not a production restore certification.

## Disaster-scenario classification

### Database loss/corruption

Database backup is relevant.

Source recovery is also relevant.

External secrets and provider connection validation remain manual dependencies.

A PostgreSQL backup alone cannot fully recover the entire application ecosystem.

### Accidental destructive mutation

Database backup is relevant to in-scope persisted state.

External provider/public-site side effects require separate review and reconciliation.

### Region/runtime loss

Source plus database recovery may be required.

Runtime reprovisioning, external secrets and provider connection validation remain separate dependencies.

### Credential/secret loss

This scenario is **not database-backup-recoverable**.

Required work remains external/manual, such as secret reissue or external secret-manager recovery and connection validation.

### Provider outage

This scenario is **not database-backup-recoverable**.

Restoring PostgreSQL does not repair a third-party provider outage.

### Public-site/provider write regression

Database/source state may help reconstruct intent/history.

However, provider/public-site state is external.

P11.4 retains explicit requirements for external state diff, rollback/reconciliation and post-rollback verification.

## Safety capability

The P11.4 capability explicitly records:

- deterministic projection only;
- offline only;
- supplied fixtures only;
- planning/certification only;
- no production backup discovery;
- no production backup read;
- no production backup export;
- no backup creation;
- no restore execution;
- no point-in-time recovery operation;
- no snapshot/storage API operation;
- no Production DB read/write/DDL;
- no secret retrieval or rotation;
- no provider/public-site request or write;
- no runtime mutation;
- no failover;
- no cutover;
- no scheduler/worker/retry activation;
- no Task #51/#53/#54 execution;
- no P9.8 implementation/activation;
- no deployment;
- no publication.

## What P11.4 does not claim

P11.4 does not claim:

- that a production backup schedule exists;
- that production backup retention is configured;
- that production snapshots or PITR are enabled;
- that a production backup catalog has been inspected;
- that current backup encryption has been independently verified;
- that current production data can be restored;
- that secrets can be recovered from PostgreSQL;
- that external provider/public-site state can be restored from PostgreSQL;
- that a regional failover path is configured;
- that the production RPO/RTO equals a synthetic exercise result.

Those require separately authorized operational verification and production disaster-recovery exercises later in P11/P12.

## Implementation

P11.4 adds:

- `artifacts/api-server/src/lib/backup-recovery-foundation.ts`;
- `artifacts/api-server/src/lib/backup-recovery-foundation.test.ts`;
- `artifacts/api-server/src/lib/backup-recovery-foundation-contract.test.ts`;
- this document.

Existing dependencies only.

No schema migration, backup utility, storage SDK, API route, runtime configuration or worker is added.

## Publication boundary

P11.4 engineering may be merged and Git-synchronized after CI certification.

It does not authorize deployment or publication.


## Certification

P11.4 is complete and certified as a deterministic/offline recovery-planning and synthetic disaster-runbook milestone.

- Issue: #351 — `P11.4 — offline backup/recovery contracts and disaster-runbook certification`
- Implementation PR: #352 — `P11.4 — offline backup/recovery contracts and disaster-runbook certification`
- Base SHA/tree: `1ad2efa3b194183e245724ac69f0863a4504df21` / `4a0ca940dfa811d63e91b5f0f12166b4fcc63377`
- Final exact tested implementation head/tree: `7905b2db758e2af5e0187c238d121abb26927bcb` / `b50bdc0b8ad256fc7f022c9edbf933d660cb22ae`
- Detached Replit final exact-head validation: 16/16 focused tests, 1,054/1,054 API tests, API typecheck and diff integrity PASS
- Exact-head PR CI: #607 / run `35586999609` — success
- Implementation merge/tree: `41329684f56f16e6da1645cd6c29339e038cf1c7` / `b50bdc0b8ad256fc7f022c9edbf933d660cb22ae`
- Post-merge main CI: #608 / run `35587257845` — success
- Replit exact Git alignment: same merge/tree, origin/main exact, ahead/behind `0/0`, clean
- Replit validation: 1,210 reported tests passed / 0 failed, full typecheck PASS, full build PASS, P11.1 budget gate PASS, `git diff --check` PASS
- No deployment or publication

Intermediate branch checks exposed only documentation-contract test fixture problems: Markdown-sensitive assertion matching and one malformed test edit. These were corrected before the final tested head; no recovery logic, production backup, database, storage or runtime operation failed or was attempted.

P11.4 does not establish that production backups exist or are restorable. Operational backup catalog/retention/PITR/snapshot verification and real restore exercises remain separately authorized future acceptance work.

## Next safe boundary

**P11.5 — accessibility WCAG 2.2 AA certification**

Generic continuation may begin with deterministic source/static review and local/synthetic browser accessibility testing/remediation. It does not authorize production crawl/scan, provider/public-site mutation, Production DB/storage activity, secret/runtime/deployment changes, scheduler/worker activation, P9.8 implementation/activation, Task #51/#53/#54 execution, deployment or publication.
