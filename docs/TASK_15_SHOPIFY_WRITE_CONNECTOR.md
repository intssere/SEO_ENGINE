# Task #15 — Shopify Write Connector v1

## Purpose

Task #15 introduces the first Shopify mutation transport in SEO ENGINE while preserving a fail-closed execution boundary. It does **not** perform any production deployment during implementation.

## Supported V1 mutations

Only these action types are implemented:

- `metadata.title` → product SEO title via Shopify `productUpdate`
- `metadata.description` → product SEO description via Shopify `productUpdate`
- `image.alt` → media alt text via Shopify `fileUpdate`

The connector intentionally does not expose a generic GraphQL mutation escape hatch.

Planner actions such as `internal_link.fix_broken`, `schema.patch`, and `sitemap.maintenance` remain unsupported by this connector until dedicated Shopify-safe adapters are implemented. Unsupported actions fail closed.

## Execution gates

A network write is permitted only when all gates pass:

1. `PUBLIC_SITE_WRITES_ENABLED=true` in the runtime environment.
2. Connector config explicitly sets `publicSiteWritesEnabled: true`.
3. Neither the action nor its action plan is `blocked`.
4. Any `approval` plan/action includes explicit approved proof with actor and approval identifiers.
5. The action type is in the connector's V1 allowlist.
6. The target uses an expected Shopify GID type.
7. Required Shopify scopes are present.

A plan classified `approval` holds all child actions until approval, including children that would otherwise be `auto` eligible.

## Shopify scopes

- Product SEO mutations require `write_products`.
- File alt mutations require `write_files` or `write_themes`.

Task #3's read-only connection contract remains separate. Enabling write scopes is an explicit later operational step and is not performed by this task.

## Safety properties

- fixed GraphQL operation templates only
- POST-only Admin GraphQL endpoint
- no access token in URLs
- no access token logging
- no mutation when the global kill switch is disabled
- no mutation when approval is missing
- no mutation for blocked or unsupported actions
- API/user errors fail closed
- no live Diamond Shelf mutation in Task #15 implementation or CI

## API version

The connector defaults to Shopify Admin GraphQL `2026-07`, matching the existing Shopify integration baseline.

## Next stage

Task #16 adds post-deployment verification and rollback. Production writes should remain disabled until the write connector, verification path, rollback path, approval persistence, and pilot controls are certified together.
