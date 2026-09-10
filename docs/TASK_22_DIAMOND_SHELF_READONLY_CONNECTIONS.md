# Task #22 — Diamond Shelf Read-Only Connections v1

## Purpose
Prepare the live Diamond Shelf integration boundary for Shopify, Google Search Console, GA4 and the SEO data provider while preserving a strict read-only pilot posture.

## Connection contract
Task #22 separates **configuration readiness** from **live connection verification**. A configured environment is not treated as connected until its live probe succeeds.

Required runtime values:
- `SHOPIFY_SHOP_DOMAIN` using the permanent `*.myshopify.com` domain
- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `GOOGLE_SEARCH_CONSOLE_SITE_URL=https://diamondshelf.us/`
- `GA4_PROPERTY_ID`
- `GOOGLE_OAUTH_ACCESS_TOKEN`
- configured SEO data provider transport/credential
- `PUBLIC_SITE_WRITES_ENABLED=false`

The new `@seo-engine/pilot-connections` package validates these invariants deterministically without printing secret values.

## Live probe order
1. Shopify identity/scope verification using the existing Task #3 read-only verifier.
2. GSC minimal read query against the exact Diamond Shelf property.
3. GA4 minimal read query against the intended numeric property ID.
4. OpenSEO/provider transport check and exact tool-name validation before research ingestion.

Stop immediately on property/shop mismatch, rejected authorization or unexpected Shopify write scopes.

## Shopify acceptance
- permanent `*.myshopify.com` domain matches the installed Diamond Shelf store
- API version remains the supported pinned version
- `read_products` and `read_content` are present
- any `write_*` scope causes the read-only verifier to fail
- token is runtime-only and never logged

## Google acceptance
GSC and GA4 use read-only OAuth scopes from Task #5. Live probes must prove the intended property identity and successful API access before baseline ingestion. The shared OAuth access token is runtime-only and must not be persisted in application tables or logs.

## SEO provider acceptance
Task #6 remains provider-neutral. Before pilot use, exact OpenSEO MCP/tool names must be verified against the running provider transport; normalized downstream contracts remain owned by SEO ENGINE.

## Safety
- no website mutation
- no Shopify write scopes accepted by the read-only connector
- no public-site write gate enablement
- no committed credentials
- no claim of live connectivity until probes are actually run

## Exit criteria
Task #22 code can merge when CI is green. Runtime state moves to `READ_ONLY_READY` only after real secure-environment probes for Shopify, GSC, GA4 and the SEO provider all succeed with `PUBLIC_SITE_WRITES_ENABLED=false`.
