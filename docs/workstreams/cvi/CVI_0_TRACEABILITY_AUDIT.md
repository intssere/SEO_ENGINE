# CVI-0 source-and-test traceability audit
Date: 2026-10-08
Repository: intssere/SEO_ENGINE
Audited snapshot: 613eb498cbcc7adfd0cb65bc3c437b56c355eecf
Starting main: ce4f836ef77f15f767c97d92c9f5fad774404916
Scope: read-only GitHub tree inspection, selected source files and test-file inspection. No test suite executed.
Interpretation: PARTIAL means adjacent code and named tests were found, **not** that the full CVI requirement is implemented or tests pass. NOT_VERIFIED is not proof of absence.

## Audit methodology and limitations
Read root AGENTS.md, ARCHITECTURE.md, CURRENT_STATE.md and all eight CVI design documents. Enumerated complete Git tree (1,675 entries) and inspected selected implementation/test source files. No local checkout, runtime execution, coverage report, CI verification or production inspection. GitHub code search returned no results for selected natural-language queries; tree enumeration provided source paths. Root CURRENT_STATE contains historical checkpoint sections: do not interpret its first heading as live deployment truth. Existing root instructions require additional procedural documents and runtime checks before engineering actions.

## Requirement matrix
| ID | Status | Candidate code/test evidence (prefix artifacts/api-server/src/lib/) | Audit observation / gap |
|---|---|---|---|
| CVI-R01 | PARTIAL | opportunity-engine.ts; opportunity-engine.test.ts | GSC queries and content_alignment opportunities; no demonstrated full editorial intent taxonomy |
| CVI-R02 | PARTIAL | opportunity-engine.ts; crawl-history-comparison.test.ts | Crawl page signals and comparison tests; canonical-to-intent content inventory not demonstrated |
| CVI-R03 | PARTIAL | dataforseo-serp-adapter.ts; dataforseo-serp-adapter.test.ts | SERP acquisition exists; editorial answer-gap scoring not established |
| CVI-R04 | NOT_VERIFIED | opportunity-actionability.ts; opportunity-lifecycle.test.ts | Actionability exists; explicit CREATE/PRESERVE/NO_ACTION editorial selector not verified |
| CVI-R05 | PARTIAL | observation-evidence-quality-model.ts; observation-evidence-quality-model.test.ts | Observation evidence controls exist but source-to-article-claim lineage not verified; quality model runtime flag false |
| CVI-R06 | NOT_VERIFIED | proposal-quality.ts | Original contribution manifest not evidenced |
| CVI-R07 | NOT_VERIFIED | proposal-content.ts; proposal-quality.ts | Boilerplate/unsupported-claim heuristics are not an authoritative business truth registry |
| CVI-R08 | PARTIAL | proposal-content.ts; proposal-quality.test.ts | Metadata proposal generation exists; cited long-form article blueprint/generation not evidenced |
| CVI-R09 | PARTIAL | proposal-quality.ts; proposal-quality.test.ts | Independent proposal checks exist; claim-level independent verification benchmark not evidenced |
| CVI-R10 | NOT_VERIFIED | proposal-content.ts | No verified fact-preserving editorial refinement stage |
| CVI-R11 | PARTIAL | proposal-quality.ts; proposal-quality.test.ts | Page relevance and generic-filler checks exist; expert reader-utility and accessibility rubric not evidenced |
| CVI-R12 | PARTIAL | proposal-quality.ts; proposal-quality.test.ts | Uniqueness and template boilerplate checks exist; sitewide scaled-content/doorway controls not evidenced |
| CVI-R13 | NOT_VERIFIED | p8-8-policy-authorization.test.ts | Governed policy actions exist; YMYL editorial review rules not evidenced |
| CVI-R14 | PARTIAL | p8-8-policy-single-action-shopify.ts; p8-8-policy-single-action-shopify.test.ts | Product write receipts/readback safety exist; CMS article adapter not established |
| CVI-R15 | PARTIAL | first-party-refresh-materialization.ts; first-party-refresh-materialization.test.ts | Signal refresh exists; claim dependency-based content refresh not established |
| CVI-R16 | PARTIAL | action-attribution.ts; experiment-holdout.test.ts | Attribution and holdout infrastructure exists; CVI content-specific causal evaluation not established |
| CVI-R17 | PARTIAL | opportunity-prioritization.ts; opportunity-prioritization.test.ts | Opportunity prioritization exists; editorial production/maintenance cost optimization not evidenced |
| CVI-R18 | NOT_VERIFIED | dataforseo-serp-adapter.ts | Language-code input exists; multilingual editorial validation not evidenced |
| CVI-R19 | NOT_VERIFIED | observation-evidence-quality-model.ts | Evidence controls exist; article source licensing/PII enforcement not evidenced |
| CVI-R20 | PARTIAL | failure-retry-dead-letter.test.ts; p8-8-policy-single-action-shopify.ts | Read failure handling and uncertain mutation receipts exist; article publish recovery not evidenced |

## Verified representative code observations
- `opportunity-engine.ts` defines opportunity types including organic_ctr, striking_distance, technical_remediation, internal_link and content_alignment, and models GSC page/query and crawl page signals.
- `proposal-quality.ts` defines checks including unsupported_claims, generic_filler, template_boilerplate, source_language_integrity, active_set_uniqueness and page_specific_content.
- `proposal-content.ts` implements page-derived metadata proposal logic and boilerplate filtering, not demonstrated long-form editorial research.
- `dataforseo-serp-adapter.ts` defines organic SERP provider request and result contracts.
- `p8-8-policy-single-action-shopify.ts` models accepted/rejected/uncertain provider mutation receipts and verified/mismatch/unavailable storefront readback, with automaticRetryPerformed=false.
- `observation-evidence-quality-model.ts` explicitly has OBSERVATION_EVIDENCE_QUALITY_MODEL_ENABLED=false; do not assume production availability.
- `experiment-holdout.test.ts` and `failure-retry-dead-letter.test.ts` contain test fixtures, but were not executed during this audit.

## Key overlap and integration risks
1. Do not duplicate the existing opportunity engine, SERP adapter, proposal quality, observation evidence, Shopify write controls, action attribution, experiment holdout or failure retry infrastructure.
2. Existing Shopify write logic shown is product-oriented. A customer CMS article publisher requires separate adapter capability and policy assessment.
3. Existing proposal quality gate is not an article fact-checking or human-utility certification.
4. No proof of live article publishing, live CMS adapter authorization, or production CVI runtime was established.
5. Root AGENTS.md and CURRENT_STATE.md retain strict production controls; all future code changes must follow current canonical state and exact authorization.

## First proposed implementation increment: CVI-1A
**Decision and evidence contract foundation, provider-free.**
- Extend or wrap existing opportunity types with a typed, versioned editorial necessity decision.
- Support CREATE, UPDATE, CONSOLIDATE, PRESERVE, REQUEST_EVIDENCE, NO_ACTION (RETIRE requires separate policy).
- Attach tenant/site/intent keys, supporting evidence IDs, confidence rationale, input fingerprints and immutable policy version.
- Deterministic fail-closed decision rules: absent evidence -> REQUEST_EVIDENCE; strong overlap -> CONSOLIDATE or PRESERVE; insufficient value -> NO_ACTION; never infer author experience.
- Build fixtures for intent collision, duplicate URL, stale evidence, unsupported claims, tenant mismatch, protected content and no-op.
- No database migrations, network calls, CMS writes, scheduler changes or production flags in first increment.
- Prefer new small module integrated through existing opportunity contracts; avoid modifying existing live paths until test and review evidence is available.

## Proposed verification commands (not executed)
From repository root, inspect package scripts before selecting commands:
`cat package.json`
`cat artifacts/api-server/package.json`
`git diff --check`
Run focused tests through the repository's actual configured test runner for opportunity-engine, opportunity-actionability, proposal-quality, and new CVI-1A contract tests. Run repository-required typecheck/build/CI suites before PR. Do not assume `npm test` is correct without reading scripts.

## Remaining audit follow-up before implementation
Read root MASTER_COMPLETION_ROADMAP.md, PROJECT_HANDOFF.md, .agents/skills/seo-engine-project/SKILL.md, .agents/memory/MEMORY.md and latest closeouts. Inspect full opportunity contracts, tests, proposal-quality internals, CMS and auth boundaries, migrations, package scripts and current main/CI. Record exact test cases and line references, verify current branch divergence. This audit is a source-backed preliminary baseline, not a complete passing certification.

## Handoff
Documentation-only commit permitted. No app code changed. No tests executed. No deployment, merge, provider calls, DB writes or publication. Next: complete deep CVI-1A design and focused contract test plan against current canonical main, then request implementation authorization as required.
