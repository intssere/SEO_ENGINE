# Task #8 — Technical SEO Engine v1

## Purpose
Convert canonical page-snapshot evidence into deterministic technical SEO findings without recommending, approving, or executing any public-site change.

## Inputs
The engine accepts structurally compatible canonical evidence records. V1 evaluates `page_snapshot` evidence only.

## Deterministic rules
- `crawl.http_5xx`
- `crawl.http_4xx`
- `metadata.missing_title`
- `metadata.missing_meta_description`
- `metadata.duplicate_title`
- `canonical.missing`
- `canonical.non_self`
- `headings.missing_h1`
- `headings.multiple_h1`
- `indexability.noindex_conflict`
- `links.broken_internal`
- `images.missing_alt`

## Deliberate non-goals
V1 does not score content quality, keyword density, word count, E-E-A-T, topical authority, semantic relevance, schema quality, or ranking opportunity. Those require separate engines and/or stronger evidence.

A non-self canonical is recorded as a medium-severity conflict signal, not declared an error with certainty, because canonicalization can be intentional.

## Findings contract
Every finding includes:
- stable rule ID
- site/page scope
- category and severity
- human-readable title and description
- canonical evidence dedupe references
- deterministic finding dedupe key

## Safety
- read/evaluate only
- no action plans
- no recommendations are executed
- no Shopify or CMS mutations
- no redirects, metadata changes, schema changes, or link changes
- `PUBLIC_SITE_WRITES_ENABLED=false` remains unchanged

## Acceptance
CI must pass PostgreSQL validation and every prior test suite plus the Task #8 technical SEO tests, TypeScript typecheck, and monorepo build.
