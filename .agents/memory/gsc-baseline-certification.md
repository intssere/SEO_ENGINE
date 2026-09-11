---
name: GSC baseline certification
description: Rules for aggregate Search Console KPIs, dimensional reconciliation, and bounded-crawl certification.
---

Headline Search Console clicks, impressions, CTR, and average position must come from a separate property-level aggregate request for the exact reporting window. Detailed query/page rows remain a distinct dataset for ranking and opportunity analysis and must not be summed to replace aggregate KPIs.

**Why:** Search Console dimensional exports can omit anonymized queries or stop at a row limit, producing materially different totals from the property-level Performance report.

**How to apply:** Persist aggregate metrics and detailed row counts separately. Reconcile them with tolerant coverage checks, expose aggregate failure explicitly, and require aggregate support before creating or retaining CTR opportunities.

A successful bounded crawl may establish `PILOT_READY`, but it can never establish whole-site certification.

**Why:** The production baseline intentionally fetches at most 30 pages, so even valid findings and complete provider evidence do not prove whole-site coverage.

**How to apply:** Report fetched versus discovered URLs and coverage percent, validate every technical finding against matching page-level crawl evidence, and always withhold whole-site certification for the bounded pilot.