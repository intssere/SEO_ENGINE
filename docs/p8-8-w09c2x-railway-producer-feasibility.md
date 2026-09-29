# P8.8 W09-C2X — Railway authoritative producer feasibility and current binding inventory

## Verdict

**PARTIAL CONTROL-PLANE FEASIBILITY / DATABASE BINDING UNPROVED / FAIL CLOSED**

Railway exposes substantially stronger non-secret deployment identity than the currently available Replit interface. The current tool surface can authoritatively select a Railway project, environment, service, deployment, deployment snapshot, deployment status, source repository, branch, and Git commit without reading credentials.

The currently exposed safe interface does **not** prove which database resource the application's `DATABASE_URL` resolves to. The only available variable-reading operation is documented to return fully rendered values for session/token authentication and may therefore expose secrets. C2X does not call it.

No live C2W provenance authority is approved by this milestone.

## Canonical basis

- base main: `18d104e9ca9866e978b9b98726b93a18d4e81ad2`
- W09-C2W platform-neutral verifier is canonical on that base
- W09-C2V Railway contract remains the migration/certification boundary

## Read-only Railway inventory

Authoritative Railway control-plane metadata currently reports:

- project: `SEO ENGINE`
- project ID: `52265e29-921b-4652-ac0d-9da4e5e69936`
- environment: `production`
- environment ID: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- application service: `seo-engine-shadow`
- application service ID: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`
- database service: `Postgres`
- database service ID: `b69e0633-7ab9-40ab-85f3-c9edd6acb031`
- database volume ID: `5e7f09d1-c436-4a49-9526-c3150d0e820a`
- database volume mount: `/var/lib/postgresql/data`

This is inventory only. The environment name `production` is a Railway environment label and does not mean Railway is the certified serving Production platform for SEO ENGINE.

## Current application deployment observation

Railway has a deployment record for canonical Git commit:

`18d104e9ca9866e978b9b98726b93a18d4e81ad2`

The record exposes:

- deployment ID: `38d2c495-fdd7-40d3-8fd3-cfea603da31f`
- snapshot ID: `220e8ea2-e52f-4c40-8957-84a474b47967`
- service ID: `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`
- environment ID: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`
- branch: `main`
- commit hash: exact canonical main above
- status: **FAILED**

Therefore this deployment is not eligible for C2W PASS even if database binding evidence were later available.

No redeploy is authorized by C2X.

## Existing staged Railway changes

The Railway environment reports an existing staged patch with two changes, including an application-service resource update and `AUTH_PUBLIC_ORIGIN` variable staging.

C2X does not accept, discard, alter, inspect secret values for, or otherwise mutate this patch.

Any later Railway deployment authorization must explicitly reconcile the staged patch first so unrelated pending changes cannot be silently committed.

## Safe deployment identity capability

Railway's current read-only control-plane surface provides:

1. project ID;
2. environment ID;
3. service ID;
4. deployment ID;
5. deployment status;
6. deployment snapshot ID;
7. source Git commit hash and branch;
8. service source repository and branch;
9. non-secret build/deploy configuration;
10. service domain/config metadata.

Railway documentation also defines deployment-injected system identities including `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_SERVICE_ID`, `RAILWAY_DEPLOYMENT_ID`, `RAILWAY_SNAPSHOT_ID`, and Git commit identity.

The control-plane records are preferred C2W producer inputs. Runtime environment inspection is not required and is not authorized here.

## Database-association gap

The application service's safe configuration reports that a variable named `DATABASE_URL` exists. The database service exposes the expected PostgreSQL credential variable **names**. These facts do not prove that the application variable references that exact database service.

Railway supports reference-variable syntax such as a service variable referencing another service's database variable. Its IaC model can represent an application database association structurally.

However, the currently exposed `get_service_config` interface intentionally omits variable values/reference expressions. The available `list_variables` operation is documented to return fully rendered values when authenticated by a Railway session or API token. Those values may contain database credentials.

Therefore:

- C2X MUST NOT call `list_variables` merely to infer database identity;
- a rendered `DATABASE_URL` MUST NOT be read and then redacted, parsed, hashed, fingerprinted, or transformed into evidence;
- the existence of a `DATABASE_URL` variable name alone is insufficient;
- service co-location in one project/environment is insufficient;
- the database service name `Postgres` is insufficient;
- a database hostname or credential-bearing URL is insufficient.

A qualifying producer needs a Railway control-plane operation that exposes the **unresolved structural reference** or another immutable association, for example conceptually:

`application service + environment + deployment/snapshot -> variable DATABASE_URL -> source service/resource ID + source variable name`

without returning the rendered value.

## Provider mismatch with the current C2W contract

The currently inventoried database is a Railway `Postgres` service backed by a Railway persistent volume. C2X has not established a Neon provider project, Neon branch, Neon endpoint, or Neon timeline for this service.

W09-C2W currently requires `expectedProvider: "Neon"`.

Consequently the current Railway Postgres service MUST NOT be represented as Neon and its Railway service/volume IDs MUST NOT be substituted into Neon project/branch/endpoint/timeline fields.

This leaves two valid future architecture paths:

### Path A — explicit Neon database for Railway

Bind the Railway application to the already intended/certified Neon lineage or another explicitly selected Neon resource, then obtain:
- Railway deployment -> non-secret structural database reference;
- exact Neon project/branch/database/endpoint/timeline identity;
- C2W verification.

This path preserves the existing C2W provider model.

### Path B — generalize provider identity beyond Neon

Design a separately reviewed successor contract for a Railway-managed PostgreSQL resource with provider-appropriate identity and lineage semantics. This cannot be done by weakening or aliasing C2W fields.

No path is selected or activated by C2X.

## Producer feasibility result

### Eligible now

A future producer can safely obtain the Railway **deployment side** of C2W from authoritative control-plane metadata.

### Not eligible now

The current safe tool surface does not expose enough non-secret structural metadata to prove the exact application deployment -> database resource association required for a complete PASS.

The current Railway Postgres service also does not satisfy C2W's Neon-specific provider identity.

Therefore the current result is:

**RAILWAY DEPLOYMENT IDENTITY PROVABLE; DATABASE BINDING AND C2W PROVIDER IDENTITY UNPROVED.**

## Minimum next certification step

Before any deployment or database mutation, perform a repository-only **W09-C2Y Railway database architecture decision**:

1. choose Path A (explicit Neon) or Path B (new provider-neutral DB lineage contract);
2. define the exact non-secret Railway structural-reference evidence required;
3. define staged-change reconciliation before any future deploy;
4. define how a successful Railway deployment and snapshot are pinned to canonical Git main;
5. keep C2W/C2U fail closed until the selected provider identity and binding association are authoritative.

## Hard exclusions

C2X authorizes none of the following:

- Railway deployment/redeploy or acceptance of staged changes;
- variable/secret value reads;
- `list_variables` rendered values;
- logs as a substitute for control-plane binding metadata;
- DB sessions or SQL;
- DDL/DML/migrations;
- Neon/provider mutation;
- Replit mutation;
- scheduler/worker/provider activation;
- DNS or traffic cutover;
- Stage 0;
- UGP integration.
