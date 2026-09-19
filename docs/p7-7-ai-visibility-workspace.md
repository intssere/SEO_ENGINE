# P7.7 — AI Visibility Production Workspace v1

## Purpose

P7.7 replaces the former /ai-visibility coming-soon placeholder with a production-quality read-only workspace over deterministic synthetic data shaped to certified P7.1–P7.6 semantics.

The workspace is frontend engineering only.

It does not activate live provider collection, API bindings, persistence, execution, scheduling, database access, site mutation, deployment or publication.

## Workspace projections

The synthetic frontend model exposes descriptive projections for:

- P7.1 crawler/bot accessibility;
- P7.2 prompt/topic-set coverage;
- P7.3 supplied answer, brand-mention and citation observations;
- P7.4 citation/domain/competitor comparison evidence;
- P7.5 evidence-bound visibility scores/history;
- P7.6 explicit AI/GEO → P6.1 opportunity integration lineage.

## UI sections

The workspace includes:

1. read-only/default-off/live-disabled topbar and hero;
2. scope/lineage strip;
3. P7.1/P7.2/P7.3/P7.5/P7.6 summary cards;
4. searchable/sortable P7.3 answer-observation DataGrid;
5. searchable/sortable P7.4 citation/competitor-evidence DataGrid;
6. searchable/sortable P7.5 score/history DataGrid;
7. searchable/sortable P7.6 → P6.1 integration DataGrid;
8. interpretation guardrails and explicit diagnostics.

## Required semantic boundaries

The model and UI preserve all of the following:

- robots allowance is not training consent or license;
- crawler accessibility is not indexing, citation, retrieval or AI-answer visibility;
- prompt/topic membership is not demand, popularity, search volume or priority;
- supplied mention evidence is not correctness, sentiment or endorsement;
- citation-domain co-occurrence is not support, endorsement or association;
- missing mention evidence is not proof of brand absence;
- P7.5 scores are bound to their exact provider/model/profile frames and do not create a cross-provider winner;
- history direction is arithmetic only, not improvement/regression;
- P7.6 projections require explicit integration requests;
- P7.5 score is not a P6.2 score;
- P6.1 AI opportunity projection is not recommendation, approval, priority or execution.

## Synthetic fixture

The frontend fixture is explicitly marked synthetic_read_only, default-off, and live disabled.

It exists only to exercise the production workspace presentation and browser behavior without contacting providers or external sites.

The fixture deliberately contains:

- accessible, limited and indeterminate crawler examples;
- exact prompt/topic-set counts;
- observed, not-observed-with-evidence and missing-evidence brand-mention states;
- citation comparison evidence;
- positive, zero and null/unscorable P7.5 score examples;
- explicit P7.6 visibility-gap and citation-gap integrations.

Null score is preserved distinctly from numeric zero.

## Browser and accessibility coverage

P7.7 extends the P4.10 browser suite to verify:

- the placeholder is gone;
- the AI Visibility workspace renders;
- synthetic/default-off/live-disabled labels are visible;
- DataGrid keyboard focus, search and sort work;
- the browser network boundary remains closed;
- browser console/page errors remain clean;
- /ai-visibility participates in serious/critical axe scans.

## Runtime boundary

P7.7 authorizes none of:

- backend/API schema changes;
- live provider or AI calls;
- credentials;
- public-site reads/writes;
- answer/citation collection;
- persistence;
- Production DB reads/writes;
- P6 scoring/prioritization/actionability/execution;
- scheduler/worker/retry activity;
- deployment/publication.

The existing published production source remains unchanged unless separately authorized.
