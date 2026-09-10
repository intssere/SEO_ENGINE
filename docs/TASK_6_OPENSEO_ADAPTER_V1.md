# Task #6 — OpenSEO Adapter v1

## Purpose
Use OpenSEO as a replaceable read/research data provider without coupling SEO ENGINE's proprietary decision, safety, deployment, verification, or learning layers to OpenSEO internals.

## Architecture boundary
SEO ENGINE owns the `SeoDataProvider` contract. `OpenSeoAdapter` implements that contract through an injected tool-call transport.

The adapter exposes only normalized primitives needed by later engines:
- keyword research
- SERP results
- domain overview
- ranked keywords
- backlink summary

OpenSEO-specific payloads are retained only as optional `raw` provenance. Downstream engines must consume normalized fields.

## Transport boundary
The adapter does not assume Cloudflare Workers, D1, DataForSEO, or OpenSEO's deployment topology. A separate transport can call OpenSEO MCP/API/self-hosted services later without changing the proprietary core.

## Safety
Task #6 is read-only. It introduces no public-site mutation, CMS write, backlink creation, rank manipulation, or autonomous action. `PUBLIC_SITE_WRITES_ENABLED=false` remains the global safety gate.

## Source alignment
OpenSEO currently exposes MCP tooling for keyword research, SERPs, ranked keywords, domain overview, SERP competitors, and backlink data. Task #6 uses the stable conceptual tool boundary rather than importing OpenSEO source code or creating a deep fork.

## Acceptance
- provider-neutral contract compiles
- OpenSEO payloads normalize into stable SEO ENGINE records
- adapter tests pass
- existing PostgreSQL, Shopify, crawler, and Google-ingestion CI remains green
- no secrets or write paths are introduced
