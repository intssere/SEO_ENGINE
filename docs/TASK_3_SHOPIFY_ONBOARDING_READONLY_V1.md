# Task #3 — Shopify Onboarding + Read-Only Connection v1

## Objective
Connect a Shopify store to SEO ENGINE for identity and capability verification without permitting public-site writes.

## Locked Shopify API
- Admin GraphQL API
- Version: `2026-07`
- Endpoint: `https://{shop}.myshopify.com/admin/api/2026-07/graphql.json`

## Required scopes
The Task #3 connector requires:
- `read_products`
- `read_content`

The connector rejects the installation if **any** granted scope begins with `write_`.

This is intentionally stricter than the eventual production app. Write scopes will be introduced only after the Safety Engine, approval workflow, deployment verification, and rollback paths are certified in later tasks.

## Environment variables
Set these outside source control:

```bash
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=***
SHOPIFY_ADMIN_API_VERSION=2026-07
PUBLIC_SITE_WRITES_ENABLED=false
```

Do not use the storefront vanity domain for `SHOPIFY_SHOP_DOMAIN`.

## Verification command

```bash
pnpm --filter @seo-engine/shopify verify:connection
```

A successful probe returns only non-secret shop identity and scope metadata. The access token is never printed.

## Verification query
The connection probe reads:
- shop ID
- shop name
- permanent myshopify domain
- primary storefront domain
- currency
- IANA timezone
- current app installation access scopes

No GraphQL mutations exist in the Task #3 connector.

## Safety invariants
1. `PUBLIC_SITE_WRITES_ENABLED=false` remains mandatory.
2. A connection with any `write_*` scope fails certification.
3. Tokens are environment secrets and must never be committed or logged.
4. The connector accepts only `*.myshopify.com` Admin API hosts.
5. Task #3 performs no product, collection, page, theme, metafield, redirect, or publication mutations.

## Acceptance criteria
- Shopify connector package builds and typechecks.
- Domain normalization rejects vanity/external domains.
- Scope guard accepts the required read scopes.
- Scope guard rejects any write scope.
- Scope guard rejects missing required read scopes.
- CI tests the read-only safety helpers.
- Existing PostgreSQL schema validation remains green.
- Existing monorepo build remains green.

## Explicit non-goals
- OAuth installation flow
- multi-tenant credential encryption implementation
- catalog synchronization
- storefront crawling
- product/page editing
- theme editing
- SEO metadata writes
- webhook ingestion
- autonomous actions

Those capabilities belong to later tasks.
