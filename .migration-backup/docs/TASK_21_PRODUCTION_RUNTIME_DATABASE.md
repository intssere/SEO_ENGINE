# Task #21 — Production Runtime + Database v1

## Purpose
Prepare SEO ENGINE for a real hosted runtime before connecting Diamond Shelf. This task establishes runtime invariants; it does not provision credentials or enable public-site writes.

## Runtime contract
Production requires a secret-backed `DATABASE_URL`. The worker fails during boot if production starts without it. The web health endpoint reports `503 degraded` when a production runtime has no database configuration.

`PUBLIC_SITE_WRITES_ENABLED` is parsed fail-closed: only the exact string `true` enables the runtime flag. The repository default remains `false`.

Health/log output may report whether a database is configured but must never print the database URL, Shopify token, Google OAuth token, OpenAI key, or provider credentials.

## PostgreSQL
Use managed PostgreSQL compatible with the existing plain SQL migration. Before Task #22 connection work:
1. create a production database and a separate non-production/test database where practical;
2. store `DATABASE_URL` in the hosting platform secret store;
3. require TLS according to the provider's connection instructions;
4. apply `packages/db/migrations/0001_core.sql` once through the controlled release process;
5. verify the expected 29 public tables;
6. record migration/deployment version without recording credentials.

The application currently has no runtime ORM dependency. Task #21 deliberately preserves that boundary rather than introducing infrastructure solely for convenience.

## Services
Minimum pilot topology:
- `web`: Next.js command center/API surface
- `worker`: background execution/ingestion process
- `postgres`: managed PostgreSQL

A Redis/BullMQ service is not required for the pilot. The existing PostgreSQL `jobs` table remains the intended V1 queue foundation until throughput demonstrates a need for dedicated queue infrastructure.

## Secret handling
Production values are runtime-only:
- `DATABASE_URL`
- Shopify token(s)
- Google OAuth credentials/tokens
- SEO provider credentials
- OpenAI/provider keys

Git contains variable names/examples only. `connections.secret_ref` remains the persistence pattern for references to external secrets; raw secret values must not be persisted in application tables.

## Deployment gate
Before Task #22:
- CI green on exact `main` commit
- production web and worker built from the same commit
- database secret present
- migration applied and 29 tables verified
- `/api/health` returns healthy
- worker emits ready/healthy without secrets
- `PUBLIC_SITE_WRITES_ENABLED=false`
- rollback to the previous application release is documented by the hosting platform

## Non-goals
- no Diamond Shelf credentials
- no live Shopify/GSC/GA4 connection
- no public-site mutation
- no Redis/Kafka/Kubernetes/Temporal
- no database vendor lock-in beyond PostgreSQL compatibility
