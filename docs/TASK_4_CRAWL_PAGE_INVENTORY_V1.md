# Task #4 — Crawl + Page Inventory v1

## Objective
Build a deterministic, read-only site inventory engine that discovers same-origin HTML pages and captures the minimum SEO state needed by later evidence, ranking, action, and verification engines.

## Safety invariants
- HTTP GET only.
- No form submissions.
- No authenticated site writes.
- No GraphQL mutations.
- No CMS edits.
- `PUBLIC_SITE_WRITES_ENABLED=false` remains unchanged.
- Crawl is bounded by `maxPages` (default 5,000; hard cap 20,000).
- Only same-origin links are enqueued.

## Signals captured
- requested and normalized URL
- path
- HTTP status
- content type
- title
- meta description
- canonical
- robots meta
- first H1
- heading outline
- internal/external links and rel values
- image src/alt
- JSON-LD blocks
- indexability signal
- normalized body content hash
- fetch/parse error

## URL normalization
- strips fragments
- strips `utm_*` parameters
- lowercases host
- removes default ports
- removes non-root trailing slash

## Purpose boundary
This is not intended to replace a full commercial crawler. V1 exists to build page inventory and later verify that expected SEO changes actually landed.

## CLI

```bash
pnpm --filter @seo-engine/crawler crawl -- https://example.com 5000
```

The result is emitted as JSON. Persistence into the PostgreSQL `crawl_runs`, `pages`, and `page_snapshots` tables will be introduced in a later orchestration/persistence task.
