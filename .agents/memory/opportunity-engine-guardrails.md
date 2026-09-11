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

The dashboard's recent-opportunity activity is a count of active managed rows updated in the last 24 hours, not strictly newly inserted rows. “Actions prepared” counts executable action rows, not blocked dry-run action plans.

**Why:** A rerun can update an existing candidate and make the activity label “candidates created” misleading, while valid persisted recommendation plans can coexist with zero executable actions.

**How to apply:** Interpret the activity number as recently refreshed active candidates, and query action plans separately when confirming dry-run recommendation persistence.

Crawler technical observations currently identify their page through `payload.pageId` while their direct evidence `page_id` can be null; the derived opportunity signal has the direct page association.

**Why:** Production evidence remains traceable through the finding and payload, but direct evidence-table joins alone undercount page-aligned crawler observations.

**How to apply:** Validate technical evidence using the finding's page, the primary evidence ID, the observation payload page ID, and run provenance together.

Organic-remediation eligibility is fail-closed for every opportunity class: a page must be explicitly indexable and must not be an authentication, redirect, utility, account, cart, checkout, search-result, or other transactional path.

**Why:** Valid crawl evidence can still describe a page that should never receive organic SEO remediation, such as a customer-authentication redirect.

**How to apply:** Filter the current crawl-page set before generating query, content, internal-link, or technical candidates. Let normal generation-key reconciliation dismiss previously active ineligible rows while preserving their evidence and history.

Dry-run planning is evidence-bound and has a separate lifecycle: `draft_dry_run`, `approval_ready`, `approved_proposal`, `executable_action`, `executed_change`, `verified_result`, and `invalidated`. This planner may advance only to `approval_ready`.

**Why:** A concrete proposed change must be reviewable without becoming an implicit approval or public-site execution path.

**How to apply:** Persist current/before and proposed/after values, page identity, supporting evidence IDs, expected benefit, risk, and deterministic rollback instructions in the blocked plan. If source opportunity evidence becomes stale or ineligible, invalidate the plan while retaining its audit metadata.

Human approval is a per-proposal audit decision, not execution authorization. A deterministic quality gate must pass before `approval_ready`; approval and rejection both preserve `executionAuthorized=false` and `publicSiteWrites=false`.

**Why:** Human review must not create an action row or silently authorize public-site changes, and rejected proposals must remain auditable rather than being overwritten by an unchanged rerun.

**How to apply:** Require exact same-origin confirmation for one proposal at a time. Preserve actor, reason, timestamp, quality result, and evidence fingerprint. Regenerate a decided proposal only when evidence changes or rejection explicitly requests revision.