# INT-02C-01 — Authorized read-only discovery record

**Observation date:** 2026-10-12 (UTC date). **Authorization:** User explicitly authorized read-only Production database authority, binding, and historical migration metadata discovery; no writes, credentials, customer rows, deployments or migration execution. This report uses provider control-plane metadata **only**; no connection to SQL endpoints.

## Connected-provider observations

- Railway project `SEO ENGINE` exists as project `52265e29-921b-4652-ac0d-9da4e5e69936`. Its environments include `production` (`7f8d920f-f6c6-44f0-b9fe-252cb4f32298`), `p12-2-fixture`, and `customer-ui-staging`.
- In the Railway `production` environment, `Postgres` service `b69e0633-7ab9-40ab-85f3-c9edd6acb031` has successful deployment, and mounts distinct `postgres-volume` `5e7f09d1-c436-4a49-9526-c3150d0e820a`.
- Also in `production`, `Postgres-restored-20261010-1701` service `ad459f76-e3fa-4aef-bcb7-0bff509aa326` has successful deployment and separately mounts `postgres-restored` `bf4673b5-3aa8-4cf3-ba14-8edfc37d2403`. A restored database is **not** automatically authoritative.
- `seo-engine-shadow` service `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90` is present in the `production` Railway environment, with a successful deployment, and exposes a `DATABASE_URL` **variable name**. Its target is **not confirmed** by the provider-safe description. Do not read or reproduce its value.
- `customer-ui-staging` contains `seo-engine-ui-staging`, which is a separate environment and not proof of Production authority.
- The currently connected Neon account returned `[]` from `list_projects`. This establishes only absence of accessible projects **through this connection**; it does not establish nonexistence of Neon elsewhere.

## Attestation boundaries and blockers

| Question | Observed | Disposition |
| --- | --- | --- |
| Does Railway have a project and database instances? | Yes; two separately mounted PostgreSQL services in production-named environment | `RESOURCE_EXISTS` only |
| Is Neon currently independently visible? | No projects returned for connected account | `NEON_NOT_VISIBLE_FROM_THIS_CONNECTION` |
| Which database is canonically authoritative? | Not independently established; C2Y architecture continues to select external Neon until superseded | `UNVERIFIED_DATABASE_AUTHORITY` |
| Does deployed application bind to exact DB ID/lineage? | `DATABASE_URL` variable name exists for `seo-engine-shadow`, but structural target is unavailable from safe description | `APPLICATION_BINDING_UNVERIFIED` |
| Are real historical 0001–0015 migrations attested? | No SQL ledger, immutable audit receipt, or separately witnessed execution history obtained | `HISTORICAL_SOURCE_PENDING` |
| Are original UGP 0008–0011 present? | No evidence inspected to establish existence/absence | `HISTORICAL_COLLISION_UNKNOWN` |

## Safe evidence collection limits

No resolved variable values, connection strings, database credentials, secret material, customer data, database SQL queries, row payloads, logs, or provider writes were requested. Existing documentation and migration fixtures are not independently collected historical execution receipts.

**Remaining authorized technical path:** A read-only, provider-supported reference/structural-binding endpoint (excluding credentials) or a separately approved independently witnessed metadata inspection mechanism is necessary for binding proof. This connected Railway tool can describe variable names but not their non-secret resolution. Do not use `list_variables` because it fully resolves and exposes secret values. Do not infer binding from PostgreSQL service names or successful deployments.

**Disposition:** `DISCOVERY_PARTIAL__NO_LIVE_MIGRATION_ADMISSION`. No merge, migration, deployment or write is authorized by this record.
