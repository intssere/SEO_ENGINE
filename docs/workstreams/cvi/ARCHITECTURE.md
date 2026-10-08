# CVI architecture — proposed target state

## C4 context
SEO ENGINE is the orchestration host. CVI is a domain subsystem. Inputs: approved website inventory, GSC/analytics, SERP research, business knowledge, expert evidence, CMS capabilities, customer policy. Outputs: decisions, briefs, evidence manifests, reviewable content artifacts, publication proposals, and learning events. External writes pass through existing governed execution/publishing infrastructure.

## Logical components
1. Demand and user-journey analysis
2. Site inventory, entity graph, and intent deduplication
3. SERP coverage and knowledge-gap analysis
4. Necessity/format/portfolio decision (CREATE, UPDATE, MERGE, PRESERVE, RETIRE, REQUEST_EVIDENCE, NO_ACTION)
5. Evidence acquisition, license checks, provenance graph, and freshness tracking
6. Business-truth registry and protected content regions
7. Content blueprint and source-grounded generation
8. Independent claim and contradiction verification
9. Editorial refinement and brand voice
10. Verifiable contribution and reader-utility evaluation
11. SEO, accessibility, multimodal and machine-readable optimization
12. Risk and publication policy gate
13. CMS-neutral publishing proposal -> governed adapter -> live readback verification
14. Outcome measurement, controlled experimentation, recalibration and refresh

## Event/data flow
Opportunity -> inventory match -> necessity decision -> evidence requirements -> research pack -> content blueprint -> draft -> independent evaluation -> publication decision -> authorized CMS command -> provider receipt -> live verification -> outcome observations -> decision calibration.

## Critical architectural invariants
- Generation cannot certify itself; independent evaluation required.
- A numerical aggregate score cannot override critical gate failures.
- Missing original data is requested, never fabricated.
- Preserve existing URLs and protected human-authored fields by default.
- Publishing is never equivalent to indexing or ranking.
- Content lifecycle is tenant-scoped and site-scoped.
- Idempotency, immutable evidence, optimistic concurrency and bounded retries required for all writes.
- Unknown external-write outcome is PUBLISH_UNKNOWN and requires reconciliation, not blind retry.
- All model output, retrieved pages, and tool data are untrusted inputs.
- The simplest valid action may be NO_ACTION or PRESERVE.

## Nonfunctional requirements
Auditability, reproducibility, isolation, observability, cost budgets, rate limits, security, privacy, accessibility, disaster recovery, rollback, data retention, and explicit human override. Avoid premature microservice proliferation; integrate as modules behind existing service contracts until load or ownership justifies separation.

## Decisions still requiring code audit
Existing article model, quality gate, provider contracts, scheduler, CMS adapters, migrations, auth/tenant boundaries, audit logs, and evidence ledger must be mapped to actual source files.
