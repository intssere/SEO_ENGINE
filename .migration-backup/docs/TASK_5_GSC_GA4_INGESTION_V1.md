# Task #5 — GSC + GA4 Ingestion v1

## Scope

Add read-only ingestion adapters for Google Search Console Search Analytics and the Google Analytics Data API.

## Search Console

- Endpoint: `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`
- Required authorization scope: `https://www.googleapis.com/auth/webmasters.readonly`
- Fixed dimensions: `date`, `query`, `page`, `country`, `device`
- Normalized metrics: clicks, impressions, CTR, average position
- Output is shaped for later persistence into `queries` and `search_metrics`.

Search Console can return top rows rather than a guaranteed exhaustive export. Callers must therefore preserve date windows, pagination state, and provenance when production ingestion is added.

## GA4

- Endpoint: `POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport`
- Required authorization scope: `https://www.googleapis.com/auth/analytics.readonly`
- Dimensions: `date`, `landingPagePlusQueryString`
- Metrics: sessions, activeUsers, engagedSessions, keyEvents, totalRevenue
- Output is normalized as analytics evidence for later page matching and persistence.

## Safety invariants

1. This package performs reads only.
2. No Measurement Protocol writes are included.
3. No Search Console mutation endpoints are included.
4. OAuth access tokens are supplied at runtime and never embedded in URLs.
5. Tokens are not persisted or logged by this package.
6. `PUBLIC_SITE_WRITES_ENABLED=false` remains unchanged.
7. Task #5 does not create OAuth consent flows, token refresh storage, schedulers, or production ingestion jobs; those are integration/runtime concerns for later tasks.

## Acceptance criteria

- GSC normalization tests pass.
- GA4 normalization tests pass.
- transport tests confirm POST-only requests and bearer authorization.
- invalid GA4 property IDs fail closed.
- existing crawler and Shopify safety tests remain green.
- PostgreSQL migration validation remains green.
- TypeScript typecheck and monorepo build pass.
