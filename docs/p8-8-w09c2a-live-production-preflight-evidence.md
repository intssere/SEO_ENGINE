# P8.8 W09-C2A — Live Production Read-Only Preflight Evidence

**Issue:** #517  
**Status:** PREFLIGHT CORRECTION — RAILWAY OBSERVATIONS ARE STAGING-ONLY / PRODUCTION DDL BLOCKED  
**Canonical Git baseline:** `1bd16ff506c40b7dacdb533358d1be050d65055f`

## 1. Correction and environment boundary

The initial W09-C2A inspection observed Railway resources whose Railway environment is named `production`. Project operating context subsequently confirmed that these resources are the intentionally frozen **Railway staging/shadow environment** used while the application is being completed.

The Railway environment label must therefore **not** be interpreted as evidence that Railway is the canonical SEO ENGINE Production database or deployment target.

This correction supersedes the initial inference that the Railway Postgres service replaced or superseded the historical Production database lineage.

No claim is made here that historical Neon identity is current Production proof either. The actual canonical Production database identity remains unresolved and must be independently established before W09-C2 can pass.

## 2. Authorization boundary

The inspection was limited to read-only infrastructure observation. It performed no DDL, DML, migration, provider/public-site request, credential/config/gate mutation, deploy/redeploy action, scheduler/worker activation, staged-patch mutation, or application persistence.

No secret value is recorded here.

## 3. Railway staging/shadow evidence

The observed Railway staging/shadow resources are:

- Railway project: `SEO ENGINE`;
- project ID: `52265e29-921b-4652-ac0d-9da4e5e69936`;
- Railway environment label: `production`;
- environment ID: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
- application service: `seo-engine-shadow` / `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`;
- database service: `Postgres` / `b69e0633-7ab9-40ab-85f3-c9edd6acb031`;
- database image: `ghcr.io/railwayapp-templates/postgres-ssl:18`;
- region: `europe-west4-drams3a`;
- database volume: `postgres-volume` / `5e7f09d1-c436-4a49-9526-c3150d0e820a`, mounted at `/var/lib/postgresql/data`, 50,000 MB;
- Postgres deployment `31895ebb-987b-47e7-a938-a52b902b62ef` was successful;
- `seo-engine-shadow` references this Railway Postgres service through its `DATABASE_URL`.

These facts characterize **staging only**. They do not satisfy W09-C2 Gate A for canonical Production.

The exact Railway PostgreSQL database name and credential values were redacted by connected access and were not bypassed or exposed.

## 4. Frozen Railway staging boundary

Railway staging is intentionally frozen while the application is completed.

Accordingly W09-C2 must not:

- run migrations 0005/0006/0007 against Railway staging;
- use Railway staging schema state as the canonical Production pre-DDL baseline;
- accept or discard staged Railway environment changes;
- change Railway variables, credentials, services, volumes, gates or deployment settings;
- deploy/redeploy/restart staging;
- use staging runtime state as proof of Production runtime/write fences.

The observed staged Railway patch `5d9ed802-32c2-4d0a-ac8a-b45a010ca535`, involving the application service and `AUTH_PUBLIC_ORIGIN`, remains untouched.

The automatic Railway application deployment observed after PR #516 was not initiated by W09-C2A. Its observation does not authorize further Railway deployment activity.

## 5. Separate development-branch boundary

A separate long-running development initiative is intentionally isolated from `main` and is to remain separate until its own completion, certification and explicit merge authorization.

W09-C2A does not reconcile, merge, modify, or use that branch as authority for Production migration execution.

Canonical Git `main` remains the completed-work integration line for this review, while isolated initiative development preserves its existing branch policy.

## 6. Actual Production identity — unresolved

Because the Railway resources are staging-only, the inspection did **not** establish the actual canonical Production database identity.

The historical P3.6 Neon evidence remains historical evidence only. It may be used as a lead for identification, but it cannot satisfy the current Production gate without fresh verification.

W09-C2 Gate A therefore requires an independently verified current Production target, including:

- hosting/database provider;
- project/account identifier as applicable;
- exact Production branch/timeline or equivalent lineage identifier;
- database name;
- endpoint/compute identity sufficient to distinguish Production from staging/preview/development;
- relationship to the previously certified Production lineage;
- approved bounded operator/credential-injection path, without recording secrets.

Until that target is identified, no Production catalog query or migration session should be aimed at any database merely because its platform environment is labeled `production`.

## 7. Recovery / backup evidence

No current recovery/PITR evidence for the **actual canonical Production database** was established by this inspection.

Railway staging backup/recovery state is irrelevant to satisfying Production Gate B.

Result: **Gate B not satisfied.**

After Gate A identifies the actual Production target, current usable recovery capability and recovery window must be proved for that exact target before DDL.

## 8. Schema / no-drift evidence

No PostgreSQL catalog query was run against the actual canonical Production database.

Therefore this run did not independently prove:

- exact public base-table count = 34;
- exact public table-name set;
- `sites` and the `sites.id` prerequisite;
- absence of the six W04/W05/W07 tables;
- absence of migration 0005/0006/0007 indexes/constraints;
- absence of a partial migration installation;
- absence of unexplained schema drift;
- absence of active/conflicting DDL sessions.

Railway staging catalog state must not be substituted for these Production facts.

Result: **Gate C not satisfied.**

## 9. Runtime/write-fence evidence

The observed Railway staging service contains the expected safety-related variable names, but this is staging-only evidence and their values were redacted.

It does not establish the gate state of the actual Production runtime.

Result: **Gate D not satisfied.**

## 10. Corrected gate status

| W09-C2 gate | Corrected result |
|---|---|
| A — current Production identity/lineage | **BLOCKED / UNRESOLVED** — Railway observations are staging-only; actual Production target not yet independently identified |
| B — current Production recovery capability | **BLOCKED** — must be proved on the actual Production target after Gate A |
| C — exact Production pre-schema/no-drift catalog | **BLOCKED** — no catalog query has been run against an independently identified Production target |
| D — Production runtime/write fences | **BLOCKED** — Railway staging variables cannot prove Production gate state |
| E — bounded migration session | **NOT ELIGIBLE** — A–D are incomplete |

## 11. Production DDL verdict

**PRODUCTION DDL REMAINS BLOCKED.**

Do not execute migrations 0005/0006/0007 against Railway staging or any unresolved/historical target.

The next W09-C2 step is **Production identity resolution only**. Once the actual Production target is independently established, recovery, catalog/no-drift and runtime-fence evidence can be acquired against that exact target under the appropriate read-only authorization boundary.

## 12. Required next evidence

A later W09-C2 continuation should:

1. identify the actual canonical Production hosting/database target without mutating staging or the isolated development branch;
2. verify whether the historical Neon lineage still corresponds to current Production, rather than assuming that it does;
3. bind current Production recovery/PITR evidence to the independently verified target;
4. obtain read-only catalog evidence from that exact target for the 34-table baseline, `sites(id)`, zero partial 0005/0006/0007 objects, no unexplained drift and no conflicting DDL;
5. prove required Production runtime/write gates are disabled/non-executing;
6. only then prepare Gate E for the exact target.

## 13. Explicit non-authorization

This corrected evidence record authorizes no Railway staging mutation, staged-patch acceptance/discard, branch reconciliation/merge, Production DDL/migration execution, DML/persistence, repair/drop SQL, credential/config/gate mutation, deployment/redeployment, provider/public-site access, W03–W07 runtime execution, Task #51/#53/#54 execution, scheduler/worker activation, W09-C Stage 0 run, provider-read addendum, or W10.
