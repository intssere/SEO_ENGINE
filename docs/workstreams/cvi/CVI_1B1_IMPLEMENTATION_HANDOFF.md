# CVI-1B.1 — Source-ledger reconciliation handoff
Date: 2026-10-08
Status: DRAFT STACKED PR; NOT CERTIFIED / NOT MERGED / NOT DEPLOYED

## Verified source baseline
CVI-1A draft PR #923 on code branch `workstream/cvi-1a-necessity-contract-ugp-dependent`.
CVI-1A head `2f5b90d331093e584b100ccfcec8f8deb055ecca`.
CI for that exact commit: GitHub `validate` completed SUCCESS, run 37804700304.
UGP initiative advanced from `3e0e8c84cf6eae86a18c515413c2777e7d2ed3e5` to `d7326e6530646e71d73f8c8ac05b67a7a44f8a28` at initial check. GitHub compare reported two commits ahead, with only `docs/universal-growth-platform/UGP-10.34-EXIT-EVIDENCE-AND-CLOSURE-GATES.md` in changed files. Recheck immediately before PR review; UGP is concurrent.

## New stacked task
Branch: `workstream/cvi-1b1-ledger-binding-pr923-dependent`
Initial base commit: `2f5b90d331093e584b100ccfcec8f8deb055ecca`
Draft PR: https://github.com/intssere/SEO_ENGINE/pull/928
PR target: `workstream/cvi-1a-necessity-contract-ugp-dependent`
Current head at handoff creation: `930066cd5078c15896e41bfc0d3154e0ed192b81`

## Files
- `artifacts/api-server/src/lib/cvi-source-ledger-binding-contract.ts`
- `artifacts/api-server/src/lib/cvi-source-ledger-binding-contract.test.ts`

## Behavior
- Verify CVI-1A immutable assessment identity and UGP source-evidence ledger top-level integrity.
- Enforce opportunity ID, opportunity fingerprint and content-opportunity-model fingerprint equality across artifacts.
- Require ledger evidence source IDs and source record fingerprints to match indexed ledger sources.
- Match requested editorial evidence fingerprints against existing ledger evidence.
- Return SOURCE_BOUND only when there is at least one requested evidence fingerprint and every requested fingerprint is in the ledger; otherwise NEEDS_EVIDENCE.
- Never represent source ledger consistency as factual corroboration, independent content originality, license clearance, tenant authorization or publishing permission.
- Preserve pure deterministic, read-only and provider-free operation.

## Validation obligations before approval
1. Confirm exact-head CI for draft PR #928. Fix reported type errors or test failures; no bypass or suppression.
2. Confirm PR #923 dependency head and target have not drifted.
3. Review fixture quality and ensure adversarial tests cover tampered ledger, source record mismatch, ledger replay across tenants, mismatched opportunity/model, lack of evidence and malformed IDs.
4. Address trust gaps: current binding only checks matching data and fingerprint integrity. Any caller can invent coherent input objects; independent acquisition and auth-context verification require CVI-1B.2+ work.
5. Confirm no runtime caller added, no DB migrations, no network, no provider/public-site write and no deployment.
6. Review stacked PR strategy before merging: avoid double-counting commits in main. Follow root AGENTS.md exact HEAD authorization and safe PR promotion.

## Next suggested increment
CVI-1B.2: authoritative tenant/site binding + business truth registry/expiry contract. Prefer separate scoped task branch and independently authenticated existing site-owner records. No uncontrolled evidence authority upgrade from self-reported booleans or hashes.

## GitHub validation trigger workaround — 2026-10-08
- Workflow `.github/workflows/ci.yml` triggers on pull_request only for `main` or `initiative-universal-growth-platform`, and on push to `main`, `initiative-universal-growth-platform`, or `ugp-*`.
- Stacked PR #928 targets `workstream/cvi-1a-necessity-contract-ugp-dependent`, so it did not automatically receive pull-request CI.
- Created immutable-head validation branch `ugp-cvi-1b1-ci-proof-20261008` at `930066cd5078c15896e41bfc0d3154e0ed192b81` (exact PR #928 head) using the normal push trigger. No source changes on this branch.
- This successfully queued GitHub CI run 37807923744; exact-head outcome pending at the point of writing.
- This is CI verification only, NOT merge authorization or production certification. Keep both stacked PRs draft; if code head changes, repeat exact-head validation.
