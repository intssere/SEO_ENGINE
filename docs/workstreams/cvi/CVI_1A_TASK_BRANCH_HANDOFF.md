# CVI-1A — implementation branch handoff
Date: 2026-10-08
Status: DRAFT PR / TEST CERTIFICATION PENDING

## Repositories and immutable source anchors
Repository: intssere/SEO_ENGINE
CVI design branch: workstream/cvi-content-value-intelligence-v4
UGP baseline for the code branch: 3e0e8c84cf6eae86a18c515413c2777e7d2ed3e5
Code branch: workstream/cvi-1a-necessity-contract-ugp-dependent
Draft PR: https://github.com/intssere/SEO_ENGINE/pull/923
PR target: initiative-universal-growth-platform
Code HEAD at document creation: 1cee24c69758f6e78bd8951acaa9c8d96787358e

## Changed code
- artifacts/api-server/src/lib/cvi-necessity-assessment-contract.ts
- artifacts/api-server/src/lib/cvi-necessity-assessment-contract.test.ts

## Behavior implemented
Opt-in pure assessment wrapping the UGP `ContentOpportunityModelResult` integrity function. Maps upstream create/refresh candidate with evidence to PROCEED_TO_RESEARCH, existing leave_alone to PRESERVE or NO_ACTION, missing evidence to REQUEST_EVIDENCE, consolidation/conflicts to REVIEW_REQUIRED. Includes tenant/site binding IDs, evidence fingerprints, immutable advisory report hash and fail-closed no-write semantics. No application caller has been wired. This feature cannot publish.

## Important architectural note
The code branch is intentionally derived from UGP initiative (not from the main-based CVI documentation branch), because requisite UGP contracts are not on that branch. Never merge code directly into main or cherry-pick UGP dependency code without explicit reconciliation. Maintain a single logical CVI workstream across these references and avoid duplicate implementations.

## Required review
1. Verify exact current branch, PR head, UGP base and CI after any change.
2. Inspect any CI failure and fix only within code branch; retest exact new head.
3. Review source-model integrity limits: UGP validator checks report fingerprint and safety semantics; whether nested opportunity fields need deeper invariant validation must be assessed before acceptance.
4. Review deterministic hashing, tenant/site cross-binding proof, boolean assertions, and test fixture fidelity (synthetic upstream model fixtures are not full real UGP pipeline fixtures).
5. Add realistic upstream-created opportunity fixtures or adapt UGP builder tests as appropriate.
6. Run focused tests and full relevant API server CI/typecheck/build; record pass/fail proof.
7. Require explicit exact-HEAD merge authorization after tests/review; do not deploy or publish.

## Test scope
Deterministic evidence ordering; fingerprint drift; upstream defer; leave_alone; consolidation/conflicts; missing business truth and original contribution; invalid tenant/evidence/opportunity; tampered upstream hash; static absence of network/persistence. No production tests or external side effects.

## Known limitations
- No runtime invocation or production proof.
- Upstream model authorization/read-only flags are checked, but tenant/site binding evidence is caller-supplied and not independently authenticated by this pure contract.
- Verified-business-truth and verified-original-contribution fields are caller assertions that must be backed by independently verifiable signed/immutable evidence in later increments; until then integration must not trust arbitrary boolean input.
- Need confirm CI outcomes and follow through with documentation updates.


## Continuation checkpoint — 2026-10-08 (subsequent head)
- PR #923 latest code HEAD: dc972ca9182725dddde2e9b51dcd69b105372894.
- Earlier head 1cee24c69758f6e78bd8951acaa9c8d96787358e passed all listed workspace tests and browser tests while its workflow was still at Typecheck; no overall green certification was claimed.
- Added tests to bind business-truth/original-contribution assertions to immutable assessment fingerprint and verify no-authority semantics across all five upstream actions.
- Exact-head GitHub validate workflow on dc972... was queued at last inspection; **must wait for terminal success and investigate failure before merge review**.
- Source contract still relies on caller-supplied verified-evidence assertions; never wire directly to production workflow without an independently authenticated evidence/trust context.
- UGP base remained 3e0e8c84cf6eae86a18c515413c2777e7d2ed3e5 at inspection. Current main was not the PR base.
- Preserve DRAFT status. No merge, deployment or CMS write authorized.

## Security-review checkpoint — 2026-10-08
- CI for prior PR HEAD dc972ca9182725dddde2e9b51dcd69b105372894: validate COMPLETED/SUCCESS (GitHub Actions run 37801323719).
- During subsequent contract review, malformed upstream action values were found to be a potential fallthrough to PROCEED_TO_RESEARCH if an otherwise valid report fingerprint were supplied.
- Added an explicit action allowlist and mandatory limitations/rationale arrays to the pure CVI contract; updated synthetic fixtures and regression coverage.
- Current code PR HEAD: c773e1a7d54e20d9f9bea0aa4589a461b1af4e74, PR #923 still DRAFT.
- Latest-head GitHub validate run 37803141003 was IN PROGRESS at this checkpoint. Prior green does not certify current HEAD. Inspect latest exact-head CI before any approval.
- Remaining integration blocker: caller-supplied booleans and site binding fingerprints do not constitute independently verified business truth, original contribution or tenant authorization. Do not connect to publishing or production autonomous generation.
- No merge, deployment, database migration, provider call, public-site mutation or scheduler activation occurred.

## Evidence trust-boundary hardening — 2026-10-08
- The pre-hardening latest CI on `c773e1a7d54e20d9f9bea0aa4589a461b1af4e74` had reached browser tests; final outcome was not yet established when further work began. **Do not reuse its checks for a later HEAD.**
- New CVI-1A code HEAD `8c8aa459382c5e1ed37621a7f7dce33bed7eb311` includes explicit immutable `evidenceTrust` metadata: `assertionProvenance=caller_supplied_unverified`, `independentlyCertified=false`, `mustRevalidateBeforeGenerationOrPublication=true`, with targeted regression assertions.
- This is disclosure and fail-closed integration guidance, not cryptographic attestation. Never treat `hasVerifiedBusinessTruth` and `hasVerifiedOriginalContribution` booleans as independently certified.
- Future CVI-1B should provide a verified tenant-bound evidence context, immutable evidence lineage, authorization checks and content-purpose proof before any autonomous generation path consumes CVI recommendations.
- PR #923 remains DRAFT; exact HEAD must receive fresh green CI, review, and separate merge authorization. No application caller integrated, no production mutation or deployment.

## CVI-1A CI typecheck repair checkpoint — 2026-10-08
- Code head `8c8aa459382c5e1ed37621a7f7dce33bed7eb311` **FAILED** GitHub validate run 37803635179, specifically Typecheck step 26. Workspace tests, schema/migration checks, load test, and browser tests completed successfully before that failure.
- Exact TypeScript issue: TS2352 in `cvi-necessity-assessment-contract.test.ts` (line 21) from casting an incomplete synthetic opportunity to `ContentOpportunity`. This was an invalid fixture, not an established runtime test failure.
- Repair committed to code branch: `2f5b90d331093e584b100ccfcec8f8deb055ecca`. Fixture now supplies all required typed `ContentOpportunity` fields, removing the unsafe partial cast.
- New CI run 37804700304 was QUEUED when inspected. This new exact-head run must complete successfully before requesting approval.
- CVI-1A remains DRAFT PR #923, based on UGP initiative `3e0e8c84cf6eae86a18c515413c2777e7d2ed3e5`. No merge or runtime change.
- Maintain evidenceTrust independentlyCertified=false; next CVI-1B must certify evidence externally to the caller assertions and enforce tenant/site authority before any production integration.
