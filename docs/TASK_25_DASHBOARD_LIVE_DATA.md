# Task #25 — Dashboard Live Data v1

## Goal

Replace the Task #19 presentation fixtures with database-backed Diamond Shelf metrics without claiming data that does not exist.

## Runtime contract

The command center is a server-rendered, force-dynamic view. It reads `DATABASE_URL` at runtime and selects the active `diamondshelf.us` site record.

If the database is not configured, the site is absent, or a query fails, the dashboard fails closed into a visible **DATA UNAVAILABLE** state. It never falls back to the Task #19 sample numbers.

## Persisted sources

The dashboard reads only existing SEO ENGINE tables:

- `crawl_runs` for latest analyzed-page count
- `search_queries` + `search_metrics` for 28-day GSC clicks, impressions, average position and top-10 query count
- `findings` for open technical findings
- `opportunities` for the prioritized decision queue
- `action_plans`, `actions`, `approvals` for action and approval state
- `deployments`, `verifications`, `rollbacks` for execution proof
- `ai_queries`, `ai_responses`, `ai_citations` for AI visibility
- `learning_signals` for learning-engine evidence
- `experiments` for completed experiment count

No GA4 revenue KPI is shown in v1 because the current core schema does not yet provide a durable revenue metric suitable for a trustworthy dashboard aggregate. Missing data is preferable to a fabricated KPI.

## Freshness

The dashboard reports the freshest timestamp among completed crawl, GSC metrics and AI observations. A live dataset is visibly marked stale when the freshest observation is older than 72 hours.

## Metric definitions

- Organic clicks: sum of persisted GSC clicks over the last 28 days.
- Impressions: sum of persisted GSC impressions over the last 28 days.
- Top-10 keywords: distinct persisted GSC queries whose 28-day average position is <= 10.
- Average position: average persisted GSC position over the last 28 days.
- AI citation rate: share of persisted AI responses containing at least one own-domain citation.
- Brand mention rate: share of persisted AI responses where the brand was marked mentioned.
- Citation share: own-domain citations divided by all persisted citations for the site.
- Open findings: persisted `findings` with status `open`.

## Safety

Task #25 performs no public-site writes and does not change the write kill switch. It is a read-only presentation layer over persisted evidence and operational state.

## Production exit criteria

Task #25 code can merge when CI passes. The dashboard must not be described as showing real Diamond Shelf performance until Task #22 live connections and Task #23 real baseline have actually populated the production database.
