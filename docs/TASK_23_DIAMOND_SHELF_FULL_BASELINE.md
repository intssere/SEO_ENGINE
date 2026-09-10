# Task #23 — Full Diamond Shelf Baseline v1

## Purpose
Establish the first trustworthy, read-only Diamond Shelf baseline using real crawl, Shopify inventory, Google Search Console, GA4, internal-link and AI-visibility evidence. This task builds the certification model and run contract; it does not fabricate live metrics or perform public-site writes.

## Baseline principle
A crawl is not "whole-site" merely because the crawler stopped normally. Coverage must be reconciled against an external expected URL/inventory count. The baseline package blocks a whole-site claim below 95% reconciled crawl coverage.

The 95% threshold is a V1 certification floor, not an SEO truth. Operators must still inspect excluded/noindex/non-HTML surfaces and document any material gap.

## Live run inputs
- expected eligible URL count derived from Shopify inventory/sitemaps and documented exclusions
- crawler `pagesDiscovered` and `pagesFetched`
- GSC search analytics rows
- GA4 landing-page rows where available
- Shopify inventory/page count
- technical findings
- internal-link graph edge count
- AI visibility observations

## Crawl configuration
The crawler supports an explicit `maxPages` with a hard upper bound of 20,000 and currently defaults to 5,000. For Diamond Shelf, use an explicit value above the reconciled eligible-page count, rather than relying on the default.

Recommended initial production setting: `maxPages=5000` with conservative request pacing at the runtime/orchestration layer. If discovery approaches the cap, stop treating the run as complete and investigate URL explosion, faceted/search URLs, duplicate parameters, or legitimately larger inventory.

## Baseline states
- `blocked`: a primary evidence dependency such as crawl, GSC, or Shopify inventory is absent, or crawl has not started.
- `partial`: primary evidence exists but coverage/enrichment is incomplete.
- `ready`: primary sources are present and crawl coverage is at least 95%, with enrichment sources present according to the V1 readiness contract.

No code path may turn missing observations into synthetic production values.

## Required production artifacts
A real Task #23 run should persist or export:
1. exact application commit/deployment version
2. baseline date window
3. expected eligible URL count and exclusion rationale
4. crawl discovered/fetched counts and coverage ratio
5. GSC row count and aggregation window
6. GA4 row count and aggregation window
7. Shopify inventory count
8. technical finding counts by severity/type
9. internal-link edge count plus orphan/underlinked counts
10. AI visibility sample count with provider/model provenance
11. readiness state and blockers

## Safety
- `PUBLIC_SITE_WRITES_ENABLED=false`
- all source systems accessed read-only
- no mutation credentials required
- no dashboard fixture values used as baseline evidence
- no claim of whole-site coverage from a partial crawl
- no credentials written to reports/logs

## Exit criteria
Task #23 code can merge when CI is green. Diamond Shelf's **real baseline** remains pending until Task #22 live connection probes are completed in a secure runtime and this baseline model is fed real observations.
