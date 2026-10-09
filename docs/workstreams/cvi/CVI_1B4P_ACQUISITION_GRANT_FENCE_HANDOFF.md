# CVI-1B.4P — Acquisition membership and site-read grant fence

Date: 2026-10-09
Status: Draft, exact-head validation pending, not deployed.

## Verified predecessor
- PR #962 at `ced67f2b0d2e379ac201d85b9c72942a9245176a`: full CI SUCCESS, run 37911406957.
- PR #963 at `adff23a52e502f22fc69ce89b828d647b418746f`: dedicated disposable PostgreSQL certification passed, full CI in progress at checkpoint.
- All upstream CVI PRs open, draft and unmerged.

## Current increment
- Draft PR #965: https://github.com/intssere/SEO_ENGINE/pull/965
- Branch `workstream/cvi-1b4p-acquisition-membership-fence-pr963-dependent`, base `workstream/cvi-1b4o-disposable-acquisition-ledger-pr962-dependent`.
- Exact initial HEAD `8eff1c33c5be9bed5873a439c5b42e5a47d97ce5`.
- Proof-only CI branch `ugp-cvi-1b4e-ci-proof-20261009-p` at identical SHA.

## Source
- `lib/db/migrations/0015_cvi_acquisition_membership_fence_draft.sql`: intentionally dormant replacement of insertion trigger requiring active tenant membership, matching active and unexpired read_evidence site grant, active site, connected provider with recognized read scope and valid active auth session.
- `lib/db/src/cvi-1b4o-disposable-acquisition-ledger.test.ts`: second sequential disposable PostgreSQL test applies migration after 0014 and checks missing membership, missing grant, revoked grant, revoked member and irrelevant Google Analytics-only scope denial, with one successful test record.
- Existing dedicated CI `test:cvi-1b4o` executes only in localhost `seo_engine_cvi_disposable` isolated proof branch and database is removed after job.

## Caveats
- This is necessary-condition admission only: actor can spoof claimed external acquisition and provider evidence; DB triggers alone do not authenticate provider transport or independently prove site ownership.
- Membership/grant checks are evaluated at SQL statement time. In-flight revocation fencing, per-operation reauthorization, cryptographic issuance, ownership proof and long-term immutable receipt retention are not solved.
- Security-critical grant provisioning and trusted actor authentication must be separately governed.
- No production migration, runtime route, provider execution, CMS publication, merge or deployment occurred.

## Next
Check PR #965 exact-head database and full CI, repair on its own branch, then resume trustworthy provider acquisition and CVI business-fact/editorial integration work rather than treating guard contracts as feature completion.
