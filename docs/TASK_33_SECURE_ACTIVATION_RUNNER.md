# Task #33 — Secure Activation Runner v1

## Purpose
Turn the Task #31 read-only probe library into an operator-runnable secure-runtime command for Diamond Shelf without introducing any public-site write path.

## Command
Run from the repository root in the secure runtime:

`pnpm --filter @seo-engine/pilot-live-activation activate:read-only`

The command exits `0` only when every read-only probe succeeds. It exits `2` when activation is blocked or any probe fails.

## Required secure runtime variables
- `SHOPIFY_SHOP_DOMAIN` — permanent `*.myshopify.com` domain
- `SHOPIFY_ADMIN_ACCESS_TOKEN` — read-only Shopify Admin token for activation
- `SHOPIFY_ADMIN_API_VERSION` — optional, defaults to the Task #31 API version
- `GOOGLE_SEARCH_CONSOLE_SITE_URL=https://diamondshelf.us/`
- `GA4_PROPERTY_ID` — numeric property ID
- `GOOGLE_OAUTH_ACCESS_TOKEN` — token with the required read scopes
- `PUBLIC_SITE_WRITES_ENABLED=false`
- `SEO_PROVIDER_PROBE_URL` or `OPENSEO_BASE_URL`
- `OPENSEO_API_KEY` when required by the configured provider

Optional evidence metadata:
- `SEO_ENGINE_ACTIVATION_RUN_ID`
- `GIT_COMMIT_SHA` or `REPLIT_GIT_COMMIT_SHA`
- `SEO_ENGINE_ACTIVATION_EVIDENCE_PATH` to save the sanitized JSON result with owner-only file permissions

## Safety contract
- The runner is locked to `diamondshelf.us`.
- It reuses Task #31 and refuses all live probes when `PUBLIC_SITE_WRITES_ENABLED=true`.
- The SEO-provider probe requires HTTPS outside localhost.
- Secrets are used only to authenticate outbound reads and are not serialized into the evidence artifact.
- The evidence artifact contains run identity, timestamps, non-secret Git commit metadata, sanitized probe results, blockers, and the final read-only readiness decision.
- This task does not crawl the site, ingest baseline data, mutate Shopify, enable guarded autonomy, or certify V1 production operation.

## Operational sequence after merge
1. deploy/pull the exact merged commit into the secure runtime
2. configure the runtime secrets outside Git
3. confirm `PUBLIC_SITE_WRITES_ENABLED=false`
4. run `activate:read-only`
5. retain the sanitized evidence JSON
6. only if `readOnlyReady=true`, proceed to the Task #32 live baseline data collection/run

## Critical distinction
A passing CI run validates runner behavior with mocks. It does not prove the real Shopify, GSC, GA4, or SEO-provider credentials work. Real Task #31 activation evidence is created only by executing this command in the secure runtime.
