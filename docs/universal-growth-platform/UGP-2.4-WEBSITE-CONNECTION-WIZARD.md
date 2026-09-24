# UGP-2.4 — Website Connection Wizard

Status: implementation candidate on `ugp-024-website-connection-wizard`.

## Goal

Give a business owner or SEO operator a simple, safe “add website” flow without pretending the universal read-analysis and connector plane already exist.

The wizard is intentionally frontend-only in this work package.

## Customer sequence

1. Website URL
2. Platform hint
3. Analysis level
4. Connection method
5. Search and analytics data
6. Automation preference
7. Review and handoff

## Truth model

The first step validates and canonicalizes a public HTTP/HTTPS website origin locally.

The platform step is explicitly a **URL-pattern hint**, not evidence-based detection. Only provider-hosted patterns such as `.myshopify.com`, `.wordpress.com`, `.webflow.io`, and `.wixsite.com` produce a named hint. Custom domains remain “Platform not identified.”

No website request is made by the wizard. Evidence-based platform detection belongs to the universal public-web onboarding work that follows this UX milestone.

## Connection boundary

The wizard may describe or select an intended connection path, but it creates no credential and persists no connection.

- Existing Shopify and Google authorization remain on the current Connections surface.
- Unsupported CMS connectors remain explicitly unavailable or coming later.
- Public-web analysis is described as planned rather than silently simulated.
- The final step hands the customer to `/settings/connections` when authorization is desired.

## Automation boundary

Automation mode is a planning preference only.

The customer can choose recommendations only or review before any future change. Automatic live-site changes remain unavailable.

No wizard state grants approval, execution authorization, provider-write authority, scheduler activation, or public-site mutation authority.

## Security and validation

The URL model rejects non-HTTP(S) schemes, embedded URL credentials, localhost/local/internal names, obvious private/link-local/loopback IPv4 ranges, and local IPv6 forms.

The wizard reduces page URLs to an origin-scoped website identity for the setup plan.

## Certification

UGP-2.4 adds pure model regression tests, static truth/scope contracts, route-mapping coverage, and the distinct wizard route to WCAG 2.2 AA plus responsive/product-polish browser certification.

Existing performance budgets remain unchanged.

## Out of scope

No API, backend, database, schema, migration, crawl, platform-detection request, OAuth endpoint, provider credential change, provider/public-site mutation, scheduler/worker activation, deployment, publication, contextual onboarding, or universal read-analysis implementation.
