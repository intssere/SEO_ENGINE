# CVI-1B.2 — Business-fact freshness and declared scope handoff
Date: 2026-10-08
Status: STACKED DRAFT PR, CI PENDING, NOT MERGED OR DEPLOYED

## Dependency chain
- PR #923: CVI-1A necessity assessment, exact HEAD 2f5b90d331093e584b100ccfcec8f8deb055ecca, GitHub validate SUCCESS.
- PR #928: CVI-1B.1 source-ledger binding, exact HEAD 930066cd5078c15896e41bfc0d3154e0ed192b81, GitHub validate SUCCESS (run 37807923744).
- PR #931: CVI-1B.2 business-fact freshness, created on workstream/cvi-1b2-business-truth-freshness-pr928-dependent from PR #928 exact HEAD.
- PR #931 HEAD at creation: 71bf13d412d8da1bd4ce64628cc85477904696e6.
- PR #931 base: workstream/cvi-1b1-ledger-binding-pr923-dependent.
- Exact-head CI validation branch: ugp-cvi-1b2-ci-proof-20261008 (matches repository's existing ugp-* push trigger). Use branch only for CI, never deployment.

## Changes
- artifacts/api-server/src/lib/cvi-business-truth-freshness-contract.ts
- artifacts/api-server/src/lib/cvi-business-truth-freshness-contract.test.ts

## Behavior
- Pure, bounded 1..128 fact review with explicit evaluation time; ISO strictness; no implicit clock.
- Checks caller-declared tenant/site against source binding scope.
- Requires evidence fingerprint membership in SOURCE_BOUND ledger matching set.
- Flags expired/stale evidence, absent evidence and declared conflicts.
- Blocks malformed windows, future observations, invalid times, duplicate fact keys and changed source binding hash.
- Reorders facts deterministically and binds all result-relevant data in report fingerprint.
- Status RESEARCH_REVIEW_ONLY or BLOCKED. **Neither status grants publishing or independent factual certification**.
- Trust flags explicitly state tenant authority and business truth NOT independently verified.
- No runtime caller integrated, no DB, provider, CMS, production, scheduler or deployment effects.

## Critical unresolved trust boundary
Source-ledger integrity uses deterministic fingerprints, not a trusted attestation of source acquisition or user permission. Calling a field hasVerifiedBusinessTruth or matching tenant IDs does not prove either. No agent may wire PR #931 to automatic generation, CMS mutation or live publishing without separate independently authenticated authority/resolver and policy review.

## Validation and next safe step
- Check PR #931 head, dependency PRs, and exact-head CI result after it completes.
- Fix errors only in PR #931 branch, repeat validation on exact new head; update docs.
- Source-review data shape, line-level provenance, source usage/rights requirements.
- CVI-1B.3 candidate: claim corroboration/original-contribution manifest with reviewer escalation, still advisory.
- Keep all three PRs draft and unmerged until each is certified and a coordinated dependency merge strategy is authorized.
