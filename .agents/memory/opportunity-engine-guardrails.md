---
name: Opportunity engine guardrails
description: Durable eligibility, confidence, lifecycle, and action-planning rules for evidence-backed SEO opportunities.
---

Property-level GSC aggregates establish that the reporting context is valid, but detailed query/page rows drive opportunity discovery. CTR and ranking opportunities must use non-overlapping position ranges so weak rankings are never mislabeled as snippet problems.

**Why:** Property aggregates cannot identify an affected query or page, and low CTR at weak average rank is normally a ranking issue rather than a defensible snippet-optimization opportunity.

**How to apply:** Require a pilot-ready aggregate context and non-inconsistent reconciliation, then classify query/page signals by guarded position, impression, and evidence thresholds. Attach page-level crawl evidence and a derived opportunity-signal record to every accepted candidate.

Opportunity confidence must remain below whole-site confidence when the crawl is bounded, and partial dimensional reconciliation must reduce confidence further.

**Why:** A 30-page crawl and incomplete dimensional GSC export cannot establish whole-site coverage even when the sampled evidence is internally valid.

**How to apply:** Persist the crawl coverage and reconciliation state with every score, and apply deterministic confidence penalties before prioritization.

Managed candidates that no longer qualify must be dismissed as superseded history, not left in the active queue. Recommendations are blocked dry-run plans with execution authorization and public-site writes explicitly false.

**Why:** Persisted candidates become misleading when the latest evidence changes, and recommendation generation must never create an implicit execution path.

**How to apply:** Reconcile candidates by stable generation key on every baseline run, show only active managed rows in current counts, retain dismissed rows separately for audit history, and store plans with blocked risk.