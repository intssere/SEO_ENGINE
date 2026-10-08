# CVI-0B — cross-branch reconciliation and CVI-1A design freeze proposal

Date: 2026-10-08
Status: SOURCE-INSPECTED DESIGN / NOT IMPLEMENTED / NOT TEST-EXECUTED
CVI baseline: 54db693c3d616554606328b66f85e8828bc714cb
Canonical main at inspection: e9913490fd0db5123cabba635ac495e5696b8df6
UGP initiative branch at inspection: 3e0e8c84cf6eae86a18c515413c2777e7d2ed3e5
Authority: root AGENTS.md; no live provider, publishing, deployment, merge or production mutation authorized.

## Major audit correction
The initial CVI-0 audit at CVI_0_TRACEABILITY_AUDIT.md inventories candidate implementations on the main-based CVI branch. It is **not** the entire SEO ENGINE functional inventory. The UGP initiative branch is separate and contains significant contract-level implementations that are absent from the earlier main-based snapshot. Avoid creating duplicate generation, quality, calendar, refresh or publisher components.

## Repository instructions reviewed
AGENTS.md, ARCHITECTURE.md, CURRENT_STATE.md, MASTER_COMPLETION_ROADMAP.md, PROJECT_HANDOFF.md, .agents/skills/seo-engine-project/SKILL.md, .agents/memory/MEMORY.md and all CVI docs were fetched and reviewed. Root docs contain historical mutable SHA details; actual GitHub branch SHA is authoritative for this document. Read-only GitHub metadata showed open P12.2 PR #922, UGP PR #921 and other historical open PRs, establishing concurrent work. No runtime/deployment inspection occurred.

## Cross-branch inventory and requirement impact
All paths below are on initiative-universal-growth-platform at the pinned SHA, prefix artifacts/api-server/src/lib/. Presence of files and named tests is not certification of production behavior.

| CVI requirements | UGP code/test files | Already addressed at contract level | Remaining CVI-specific requirement |
|---|---|---|---|
| R01/R03 | keyword-serp-evidence-contract.ts; content-opportunity-model-contract.ts; their tests | Intent/market/search-evidence modeling and opportunity decisions | User-task outcome/real-world utility calibration and richer demand signals |
| R02/R12 | cannibalization-detection-contract.ts; topic-coverage-classification-contract.ts; their tests | Topic coverage, query/page collision and creation guards | Sitewide content-purpose ledger and programmatic duplication risk validation |
| R04/R17 | content-opportunity-model-contract.ts; content-opportunity-model-contract.test.ts | create_candidate, refresh_candidate, consolidate_candidate, leave_alone, defer_insufficient_evidence; business relevance gating | Additive reasoned NO_ACTION/PRESERVE/REQUEST_EVIDENCE evidence needs; economic optimization only after baseline |
| R05/R19 | source-evidence-ledger-contract.ts; source-evidence-ledger-contract.test.ts | Evidence and source provenance ledger | Rights/reuse, license, claim freshness and sensitive-data controls |
| R06/R11 | article-draft-pipeline-contract.ts; article-quality-gate-contract.ts | originality and additive_value pipeline stages; low_value_scaled_content gate | Independently verified original-contribution manifest, human usefulness benchmark and accessible presentation |
| R07/R09/R13 | article-quality-gate-contract.ts; its tests | Independent fail-closed quality pass/block checks | Business truth registry, contradiction benchmarks, regulated-topic editorial approvals |
| R08/R10 | content-brief-outline-contract.ts; article-draft-pipeline-contract.ts; tests | Grounded brief, section drafts, citation/claims, coherence, brand voice | Fact-preserving editorial transformations and ground-truth calibration |
| R14/R20 | article-publishing-contract.ts; shopify/wordpress/webflow/git-markdown-article-publishing-mapping.ts; article-publication-cross-provider-certification.ts; tests | Connector-neutral immutable publication plan, CMS mappings, offline certification | Production authorization, destination-specific readback/rollback proof and uncertain-outcome reconciliation; mapping only != live publishing |
| R15 | content-decay-refresh-detection.ts; content-refresh-calendar-integration.ts; tests | Decay/refresh opportunity detection | Claim-to-source invalidation and per-claim re-verification |
| R16 | experiment-holdout.ts; action-attribution.ts; tests on main | Attribution, holdout and confounders | CVI-specific user utility and controlled outcome measurement |
| R18 | keyword-serp-evidence-contract.ts; research-plan-contract.ts | Search market/language evidence | Locale-based content factual accuracy test suites |

## Relevant UGP contract facts confirmed through source inspection
- UGP content opportunity policy requires complete observed inventory and query/page evidence for create candidates; creating without evidence is disallowed at contract level.
- UGP article draft pipeline already declares citation_binding, fact_verification, originality, additive_value, brand_voice, SEO and AEO/GEO stages.
- UGP article quality gate checks important_claim_support, citation_integrity, duplication_cannibalization, unsafe_prohibited_content, intent_requirements and low_value_scaled_content. It explicitly grants neither execution nor publication.
- UGP publishing contract expresses create/update/publish as plans with required preview and verification; execution request is *not constructed*.
- UGP Shopify article mapping is explicitly mapping-only, declares no network/persistence/write authority, requires a concrete blog GID, and uses articleCreate/articleUpdate.
- UGP decay detection distinguishes refresh_candidate, watch, stable and defer_insufficient_evidence and marks performance measurement observational, not causal.

## CVI-1A refined architecture decision
**Do not build a parallel content opportunity engine.** Build a pure, optional `CviNecessityAssessment` layer that consumes and validates existing UGP `ContentOpportunity` and its evidence lineage after interface reconciliation. If UGP remains unmerged into canonical main, prototype as a schema-design fixture only; do not transplant large UGP modules or introduce a competing set of opportunity actions. Base an actual code increment on a newly verified, approved integration baseline.

### Proposed contract
`CviNecessityAssessmentV1`:
- version, assessmentId, assessmentFingerprint
- sourceOpportunityId/fingerprint and sourceContractVersion
- subject: tenant/site/market/locale and target topic fingerprint
- inputEvidenceFingerprints (sorted, deduplicated, immutable)
- existingCoverage and cannibalization summary **from UGP** (not independently reinterpreted without evidence)
- decision: `create_candidate | refresh_candidate | consolidate_candidate | leave_alone | defer_insufficient_evidence` (retain upstream enumerations)
- editorialDisposition: `PROCEED_TO_RESEARCH | REQUEST_EVIDENCE | PRESERVE | NO_ACTION | REVIEW_REQUIRED`
- benefitHypothesis and unmetUserNeed (grounded references, optional only where evidence insufficient)
- reasonCodes (fixed controlled vocabulary)
- blockers, policyVersion, evaluatedAt, limitations
- safety semantics: readOnly=true, deterministic=true, publicationAuthorized=false, executionAuthorized=false, performsNetworkOperation=false, performsPersistence=false

Avoid treating `editorialDisposition` as authorization; it is advisory and fail-closed. Cannot convert `defer_insufficient_evidence` to PROCEED_TO_RESEARCH. Cannot convert `leave_alone` to content creation. An action candidate can still become REQUEST_EVIDENCE if original contribution/business truth is unsupported.

### Decision precedence
1. Bad tenant/site/scope binding, invalid source fingerprint or contradictory identity => reject invalid input.
2. Missing essential upstream evidence => REQUEST_EVIDENCE.
3. Upstream defer_insufficient_evidence => REQUEST_EVIDENCE.
4. Upstream leave_alone => PRESERVE or NO_ACTION with reason.
5. Unresolved collisions or business-source contradiction => REVIEW_REQUIRED.
6. Upstream create/refresh/consolidate with sufficient evidence => PROCEED_TO_RESEARCH only (not APPROVED or PUBLISH).
7. All requests preserve source opportunity lineage and exact source action.

### Test contract (provider-free)
- Repeated identical inputs produce identical fingerprints regardless of evidence input order.
- One altered claim/evidence fingerprint changes assessment fingerprint.
- Unknown upstream action, malformed SHA, duplicate conflicting subject, invalid locale or cross-tenant reference fails closed.
- defer_insufficient_evidence never returns PROCEED_TO_RESEARCH.
- leave_alone never produces create or publish recommendation.
- create_candidate without required observed inventory/query-page evidence is rejected by upstream integrity or returns REQUEST_EVIDENCE; no bypass.
- Collision and unsupported business truth lead to REVIEW_REQUIRED, not generation.
- No fabricated firsthand experience or claims; must surface missing evidence.
- No nondeterminism from wall-clock, random, environment, DB, network or LLM.
- No runtime or provider action even if report says PROCEED_TO_RESEARCH.
- Existing UGP contract tests remain unchanged and green.
- Authorization and hash checks prevent stale source report reuse.

### Detailed next engineering prerequisite
1. Reverify current canonical main and UGP initiative head, compare ancestry, resolve any current integration PR conflicts.
2. Inspect full UGP source-evidence-ledger, research-plan, opportunity-model integrity and applicable tests.
3. Decide integration target with maintainer review: prefer dependent task branch based on approved UGP baseline, or defer until merged to main. Never quietly merge initiative into CVI branch.
4. Only then implement small pure `cvi-necessity-assessment-contract.ts` and focused `.test.ts`, documentation and ADR.
5. Run `pnpm --filter @workspace/api-server exec tsx --test src/lib/cvi-necessity-assessment-contract.test.ts` after checking script and dependency context, plus existing UGP opportunity/quality tests, `pnpm --filter @workspace/api-server typecheck`, relevant full checks and `git diff --check`. Commands are proposed, NOT executed.

## Release boundaries
No DB schema change; no migrations; no provider/OAuth calls; no CMS draft or publish calls; no publication grant; no scheduler/worker; no Railway/Replit deployment; no merge. Any future task branch uses a freshly verified target baseline, one PR, CI and explicit exact-HEAD merge approval.
