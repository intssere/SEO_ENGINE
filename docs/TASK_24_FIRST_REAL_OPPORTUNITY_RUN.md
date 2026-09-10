# Task #24 — First Real Opportunity Run v1

## Purpose
Turn a certified Diamond Shelf baseline into the first trustworthy, read-only prioritized optimization queue.

## Gate
The run must be blocked unless:
- the Diamond Shelf baseline is certified from real observations;
- `PUBLIC_SITE_WRITES_ENABLED=false`;
- every candidate retains an evidence reference;
- no fixture metric is treated as live evidence.

Task #24 code can merge before the live Diamond Shelf baseline exists. A merged package does not mean a real opportunity run has occurred.

## Inputs
The pilot run consumes the outputs already produced by the existing engines:
- technical findings from the Technical SEO engine;
- ranking opportunities from Ranking Accelerator;
- optional business context for commercial weighting;
- internal-link opportunity signals with source/target evidence;
- AI-visibility/GEO signals with provider/model/query/citation provenance.

The existing Opportunity Engine remains authoritative for technical/ranking queue scoring. Task #24 does not duplicate or replace it.

## Output
A deterministic candidate queue containing:
- source
- title
- page identity where available
- score
- confidence
- evidence reference
- rationale

The queue also reports source distribution and count of high-confidence candidates.

## Runtime sequence for Diamond Shelf
1. Complete Task #23 live baseline certification.
2. Freeze the exact baseline observation window and crawl run IDs.
3. Run Technical SEO on current page snapshots.
4. Run Ranking Accelerator on real GSC metrics.
5. Build the unified technical/ranking queue through Opportunity Engine.
6. Add internal-link signals from the certified link graph.
7. Add AI visibility signals only when real provider observations exist.
8. Sort the combined queue deterministically.
9. Persist the resulting opportunities with evidence/provenance.
10. Review the top queue before Task #26 dry-run planning.

## Safety
This task performs no Shopify mutation, no approval bypass, no deployment and no automatic action planning. It is an analysis/prioritization boundary only.

## Acceptance criteria
- uncertified baseline fails closed;
- enabled public-site writes fail closed;
- technical/ranking scoring continues through the existing Opportunity Engine;
- supplemental internal-link and AI-visibility signals require evidence references;
- deterministic ordering is test-covered;
- CI/typecheck/build are green.
