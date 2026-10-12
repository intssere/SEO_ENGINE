# STAGE-03D-02E — Railway staging execution gate (NOT AN EXECUTION AUTHORIZATION)

## Certified CI evidence

- Source base: `47ba001ce217e7742bf5121cf56f0f937e0515c9`
- Disposable PostgreSQL 18 full migration/identity/synthetic-session/recreation CI: run 38262285403 — SUCCESS.
- Isolated Docker build and unauthorized startup rejection: run 38262285336 — SUCCESS.
- Full repository CI: run 38262285356 — SUCCESS.

## Railway exact target

- Project `52265e29-921b-4652-ac0d-9da4e5e69936`
- Environment `customer-ui-staging`, `86150bfb-2149-4c69-ba71-e9488c81c1e3`
- Database service `Postgres-R84i`, `6e58c3f2-0a14-4cca-b3ac-b93c1e82e937`
- Database volume `d895ac1c-d6f4-42cc-a90f-b0b9a24e465e`
- Application `seo-engine-ui-staging` MUST stay unbound.

## Preconditions before executing SQL

1. Operator independently confirms the isolated database has no user data and zero public tables. Database name, identity, private Railway DNS, volume and project/environment IDs must match the runner checks.
2. Confirm there is an **actually restorable** Railway staging backup/snapshot **or** explicitly approve disposal and recreation of this new empty staging database on migration failure. The CI recreation test is not a backup/PITR guarantee.
3. Verify exact candidate-image digest and source revision of Dockerfile/runner; do not build from a floating branch/tag at execution time.
4. Create a *temporary one-shot service confined to the staging environment* using private DNS, with `DATABASE_URL` as a Railway service-variable reference to Postgres-R84i, not plaintext copied into a ticket or log. No public domain/TCP proxy.
5. Restrict its environment with immutable project and environment IDs, expected database-service ID and an execution token only after preflight.
6. Approve a one-time staging-only migration execution, receipt capture, and controlled teardown. No app `DATABASE_URL`, OAuth variables, public writes, provider calls, or production changes.

## Fail-closed procedure

- If the target cannot be verified or the DB is nonempty, STOP before SQL.
- Run once; emit sanitized migration count/identity/session test receipt; check database migration results with a separate read-only metadata query.
- If any migration fails, DO NOT rerun against the partial database. Quarantine and inspect metadata only. Restore a verified pre-migration snapshot, or dispose and recreate **only the new staging database** after separate explicit approval; then start a fresh migration attempt.
- If success, retire migration runner and ensure staging customer UI remains unconnected until separately authorized OAuth and application binding work.
- Do not expose credentials or commit any pending deletion patch involving an unintended resource.

## Current blockers

- Railway OAuth integration exposes database variable names but not values, and has no SQL command execution API, verified backup/restore API, or arbitrary command execution API.
- No immutable runnable image artifact (digest) published from this PR.
- No confirmed Railway staging recovery mechanism and no private runner deployment route verified.
- Do not interpret green CI as permission to publish a runnable image, provision a runner service, modify database, or attach application.
