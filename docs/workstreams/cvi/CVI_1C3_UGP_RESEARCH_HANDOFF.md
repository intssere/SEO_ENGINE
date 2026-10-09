# CVI-1C.3 — UGP-7.1 research-only handoff

Date: 2026-10-09
Status: DRAFT PR; exact-head CI pending, no runtime execution.

## Verified predecessor
- CVI-1C.2 PR #970 at HEAD 4d9c882c934f2891d4760556efff0e27767448b5: full GitHub CI success run 37913805725.
- All upstream CVI PRs remain draft/open and unmerged.

## New increment
- PR #973: https://github.com/intssere/SEO_ENGINE/pull/973
- Work branch: workstream/cvi-1c3-ugp-research-handoff-pr970-dependent
- Base: workstream/cvi-1c2-evidence-report-bridge-pr968-dependent
- Initial HEAD: c77ec3ef03cb0369c12255985cd46479875be004
- Proof-only branch: ugp-cvi-1c3-ci-proof-20261009 at same HEAD.
- CI must pass on exact HEAD before certification.

## Implementation
- artifacts/api-server/src/lib/cvi-ugp-research-handoff.ts
- artifacts/api-server/src/lib/cvi-ugp-research-handoff.test.ts
- Accepts existing UGP-7.1 ResearchPlan, CVI-1C.2 editorial bridge, and a declarative list of documented UGP research evidence classes.
- Uses assertResearchPlanIntegrity and exact opportunity ID/fingerprint/provenance agreement. Requires editorial bridge RESEARCH_AND_HUMAN_REVIEW_ONLY with matching expected fingerprint and explicit no-access/no-publication flags; lists missing evidence classes.
- Outcomes are BLOCKED or RESEARCH_PLANNING_REVIEW_ONLY, never executable research, claim approval, provider access or permission to publish.
- All outputs have authenticatedProviderEvidenceVerified=false, independentlyVerifiedBusinessTruth=false, trustedHumanApprovalVerified=false, executionAuthorized=false, publicationAuthorized=false.

## Important limitations
- The UGP ResearchPlan represents planning only. No research evidence was actually acquired, facts checked independently, licensing verified or human approvals authenticated.
- No actual UGP runtime handler, tenant-identity enforcement, provider API call, source crawl, article generation, CMS mutation, database migration, merge or deploy.
- Declared evidence classes cannot prove discovery or source custody. Even matching hashes are not cryptographically trusted provenance.
- Next: full CI verification and then governed integration with independently verified source acquisition, source/license review and authenticated editorial sign-off. Do not bypass UGP execution/publishing admission.
