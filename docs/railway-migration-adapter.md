# Railway Migration Adapter v1

## Purpose

This adapter prepares SEO ENGINE for a controlled Railway staging deployment while GitHub remains canonical and the certified Replit deployment remains the rollback target.

It does not create a Railway project, copy a database, change secrets, register OAuth callbacks, deploy, publish or cut traffic.

## Runtime topology

Railway should initially run one web service from the repository-root `Dockerfile`:

- one Node process;
- Express API under `/api`;
- built SPA assets and SPA fallback under `/`;
- healthcheck `/api/healthz`;
- Railway-provided `PORT`;
- no persistent filesystem volume.

The single-origin topology preserves application-auth cookies, CSRF, OAuth callback paths and the frontend's relative `/api` requests.

## Fail-closed startup

- When `DATABASE_URL` is configured, startup verifies, but does not create or update, the canonical Diamond Shelf database identity and aborts if verification is not ready.
- The expected current schema is exactly 34 public base tables: the 31 Task #55 runtime tables plus the three P3.6 observation/evidence tables.
- No migration command is embedded in the image or container startup.
- Pending legacy `pilot_ingestion_v1` jobs are not resumed merely because `DATABASE_URL` is present.
- `PILOT_INGESTION_QUEUE_RESUME_ENABLED` defaults false and must remain false for Railway shadow certification.
- Disabled AI proposal generation does not load the OpenAI client or require provider credentials at boot.

## Railway staging variables

Railway supplies `PORT`. Configure `NODE_ENV=production` and copy required secret values through Railway variables without placing them in GitHub.

Mandatory for full authenticated runtime parity:

- `DATABASE_URL`
- `AUTH_ENFORCEMENT_ENABLED=true`
- `AUTH_PUBLIC_ORIGIN=<exact Railway HTTPS origin>`
- `AUTH_GOOGLE_CLIENT_ID`
- `AUTH_GOOGLE_CLIENT_SECRET`
- `AUTH_SESSION_SECRET`
- `AUTH_ADMIN_EMAILS`
- `APP_ORIGIN=<same exact Railway HTTPS origin>`
- `OAUTH_CREDENTIAL_ENCRYPTION_KEY`

Preserve or configure only when the corresponding existing runtime path needs them:

- `AUTH_OPERATOR_EMAILS`
- `AUTH_VIEWER_EMAILS`
- `OAUTH_STATE_SIGNING_SECRET`
- `SESSION_SECRET`
- `SHOPIFY_OAUTH_CLIENT_ID`
- `SHOPIFY_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GSC_OAUTH_CLIENT_ID`
- `GSC_OAUTH_CLIENT_SECRET`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `LOG_LEVEL`

Initial Railway shadow gates must be explicit:

- `PUBLIC_SITE_WRITES_ENABLED=false`
- `AI_PROPOSAL_GENERATION_ENABLED=false`
- `SIGNAL_COLLECTION_JOB_EXECUTION_ENABLED=false`
- `GSC_READONLY_OAUTH_RUNTIME_ENABLED=false`
- `COMPETITOR_COLLECTION_ENABLED=false`
- `COMPETITOR_EVIDENCE_PERSISTENCE_ENABLED=false`
- `COMPETITOR_ONE_TARGET_DRY_RUN_EXECUTION_ENABLED=false`
- `PILOT_INGESTION_QUEUE_RESUME_ENABLED=false`

Do not configure competitor targets or enable any autonomous/scheduled execution during shadow certification.

## Database boundary

The first Railway build/boot certification may run without `DATABASE_URL` and prove only image boot, static assets and public health. Full application certification requires an isolated Railway PostgreSQL copy with the exact 34-table schema and canonical identity.

Database dump/restore, production fingerprints and any data movement require a separately authorized migration step. Never point Replit and Railway at one writable production database while both runtimes can execute background work.

## OAuth/domain boundary

Authentication and provider OAuth redirects bind to exact origins. Before authenticated Railway certification, configure one stable Railway staging domain and separately authorize the necessary callback registrations. Replit callback registrations remain intact until cutover is certified.

## Cutover boundary

Replit remains live until Railway passes build, boot, static asset, SPA route, health, auth, schema, API, log and safety-gate certification. Production traffic and background capabilities move only through separately authorized, individually verified steps.
