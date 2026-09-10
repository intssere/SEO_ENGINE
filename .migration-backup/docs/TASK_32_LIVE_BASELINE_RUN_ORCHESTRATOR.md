# Task #32 — Live Baseline Run Orchestrator v1

## Purpose
Provide the fail-closed gate that converts verified Task #31 read-only activation evidence plus real runtime observations into a Diamond Shelf live-baseline readiness decision.

## Scope
This task does not perform a live crawl, call Shopify/GSC/GA4 directly, or mutate the site. It validates the accounting/provenance of a real secure-runtime baseline run and delegates readiness evaluation to the existing Task #23 baseline model.

## Required evidence
- Task #31 live read-only activation is verified
- site identity is `diamondshelf.us`
- `PUBLIC_SITE_WRITES_ENABLED=false`
- source run ID and observation timestamp are present
- explicit positive crawl hard limit
- reconciled discovered/fetched page counts
- Shopify inventory count
- GSC rows
- GA4 rows where available
- AI visibility observations where available
- technical finding count
- internal-link edge count

## Whole-site trust rule
A whole-site baseline may only be represented when reconciled crawl coverage is at least 95%. Partial coverage remains explicitly partial and cannot pass the downstream readiness assertion.

## Accounting safety
The gate rejects impossible or untrusted run accounting, including fetched pages greater than discovered pages or fetched pages greater than the declared crawl hard limit.

## Write safety
If either the runtime environment or the observation reports public-site writes enabled, the baseline run is blocked. Operational baseline collection remains read-only.

## Operational next step
After this package merges, run Task #31 probes and the real Diamond Shelf baseline workflow in the secure runtime with credentials supplied only through environment secrets. Feed the resulting real counts into this gate. Do not claim `ready` or whole-site coverage from fixtures or CI.

## Critical boundary
A green CI run proves only that the live-baseline readiness gate behaves correctly. It does not prove that a real Diamond Shelf baseline has been collected.
