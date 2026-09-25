# P8.8 W09-C2A — Live Production Read-Only Preflight Evidence

**Issue:** #517  
**Status:** LIVE READ-ONLY PREFLIGHT — INCOMPLETE / DDL BLOCKED  
**Canonical Git baseline:** `1bd16ff506c40b7dacdb533358d1be050d65055f`

## 1. Authorization boundary

This evidence run was limited to read-only Production identity/recovery/schema/runtime-fence observation. It performed no DDL, DML, migration, provider/public-site request, credential/config/gate mutation, deploy/redeploy action, scheduler/worker activation, or application persistence.

No secret value is recorded here.

## 2. Current Production hosting evidence

Railway currently exposes:

- project: `SEO ENGINE`;
- project ID: `52265e29-921b-4652-ac0d-9da4e5e69936`;
- environment: `production`;
- environment ID: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
- application service: `seo-engine-shadow` / `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`;
- database service: `Postgres` / `b69e0633-7ab9-40ab-85f3-c9edd6acb031`;
- database image: `ghcr.io/railwayapp-templates/postgres-ssl:18`;
- region: `europe-west4-drams3a`;
- database volume: `postgres-volume` / `5e7f09d1-c436-4a49-9526-c3150d0e820a`, mounted at `/var/lib/postgresql/data`, 50,000 MB;
- Postgres deployment `31895ebb-987b-47e7-a938-a52b902b62ef` is successful;
- application `DATABASE_URL` is configured as a Railway reference to the Postgres service's `DATABASE_URL`.

Therefore the historical Neon P3.6 project/branch/timeline cannot be treated as the current Production database identity for W09-C2. The current application configuration points to the Railway Postgres service.

The exact PostgreSQL database name and credential values are redacted by the connected Railway access and were not bypassed or exposed.

## 3. Application deployment observation

The merge of W09-C2 PR #516 was followed automatically by Railway deployment `15db2e3f-c6e7-4e20-8789-9c20eed27b33`. No deployment action was invoked by this preflight. On the later read-only status check, that deployment was successful.

A prior deployment was still being removed by Railway lifecycle processing at the observation time.

This is runtime-state evidence only, not authorization for any deployment action.

## 4. Recovery / backup evidence

Current Railway read-only tools used by this preflight do not expose sufficient backup, PITR, snapshot or restore-window evidence for this Postgres service.

Result: **Gate B not satisfied.**

Before DDL, current usable recovery capability for the exact Railway Postgres volume/database must be independently proved. Historical Neon PITR evidence does not satisfy this requirement.

## 5. Schema / no-drift evidence

Direct PostgreSQL catalog access was not available through the connected Railway read-only tool path because database credentials and connection details are intentionally redacted.

Accordingly this run could not independently prove:

- exact public base-table count = 34;
- exact public table-name set;
- `sites` and the `sites.id` prerequisite;
- absence of the six W04/W05/W07 tables;
- absence of migration 0005/0006/0007 indexes/constraints;
- absence of a partial migration installation;
- absence of unexplained schema drift;
- absence of active/conflicting DDL sessions.

Result: **Gate C not satisfied.**

No attempt was made to bypass credential boundaries or execute SQL through an unapproved path.

## 6. Runtime/write-fence evidence

The `seo-engine-shadow` service contains the expected safety-related variable names, including:

- `PUBLIC_SITE_WRITES_ENABLED`;
- `COMPETITOR_COLLECTION_ENABLED`;
- `PILOT_INGESTION_QUEUE_RESUME_ENABLED`;
- `COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED`;
- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED`;
- `AI_PROPOSAL_GENERATION_ENABLED`;
- `COMPETITOR_ONE_TARGET_DRY_RUN_EXECUTION_ENABLED`;
- `GSC_READONLY_OAUTH_RUNTIME_ENABLED`.

Their values are redacted by the connected Railway access, so disabled/non-executing state was not proved.

Railway also reports an existing staged environment patch `5d9ed802-32c2-4d0a-ac8a-b45a010ca535` involving the application service and `AUTH_PUBLIC_ORIGIN`. This preflight did not accept, discard or otherwise mutate that patch.

Result: **Gate D not satisfied.**

## 7. Gate status

| W09-C2 gate | Result |
|---|---|
| A — current Production identity/lineage | **PARTIAL** — Railway project/environment/app/database service and app→DB reference proved; exact DB name/operator path not proved |
| B — current recovery capability | **BLOCKED** — current Railway recovery/PITR evidence unavailable |
| C — exact pre-schema/no-drift catalog | **BLOCKED** — no approved direct PostgreSQL catalog path available through connected tools |
| D — runtime/write fences | **BLOCKED** — variable names present but values redacted; staged environment patch also exists |
| E — bounded migration session | **NOT ELIGIBLE** — A–D are incomplete |

## 8. Production DDL verdict

**PRODUCTION DDL IS BLOCKED.**

Do not execute migrations 0005/0006/0007. The current evidence packet does not satisfy W09-C2.

The blocker is stronger than the prior W09-C2 assumption: current application evidence points to Railway Postgres, not the historical Neon target. The DDL packet must therefore be reconciled to the actual Railway Production lineage before any migration authorization can be considered.

## 9. Required next evidence

A later read-only continuation must obtain, without exposing secrets:

1. exact Railway Postgres database identity/name and an approved bounded operator path;
2. current backup/recovery capability and usable recovery window for the exact database/volume;
3. direct read-only PostgreSQL catalog evidence for the 34-table baseline, `sites(id)`, zero partial 0005/0006/0007 objects, no unexplained drift, and no conflicting DDL;
4. independently readable proof that required runtime/write gates are disabled/non-executing;
5. resolution or explicit classification of the existing staged Railway environment patch before DDL eligibility.

Only after those items are captured and reviewed may Gate E be designed against the actual Railway Production target.

## 10. Explicit non-authorization

This evidence record authorizes no DDL/migration execution, DML/persistence, repair/drop SQL, credential/config/gate mutation, staged-patch acceptance/discard, deployment/redeployment, provider/public-site access, W03–W07 runtime execution, Task #51/#53/#54 execution, scheduler/worker activation, W09-C Stage 0 run, provider-read addendum, or W10.
