# CVI-1B.4O — Disposable acquisition/nonce ledger certification handoff

Date: 2026-10-09
Status: DRAFT STACKED PR; exact-head CI pending; NO production application

## Stack
- Parent PR #962 CVI-1B.4N head `ced67f2b0d2e379ac201d85b9c72942a9245176a`, validation run 37911406957 still in progress at last check.
- New draft PR #963: https://github.com/intssere/SEO_ENGINE/pull/963
- Branch `workstream/cvi-1b4o-disposable-acquisition-ledger-pr962-dependent`
- Base `workstream/cvi-1b4n-provider-evidence-custody-pr959-dependent`
- Exact HEAD `adff23a52e502f22fc69ce89b828d647b418746f`
- Proof branch `ugp-cvi-1b4e-ci-proof-20261009-o` triggers run 37911885274.
- All ancestor CVI PRs remain drafts and unmerged.

## Source changes
- `lib/db/migrations/0014_cvi_acquisition_nonce_ledger_draft.sql` is a dormant, non-bootstrap migration; one table `cvi_acquisition_nonce_ledger`, primary key acquisition_id, composite unique (tenant_id,connection_id,request_nonce), composite site/organization foreign key, connection/site and session/subject insert checks, immutable update/delete/truncate triggers.
- `lib/db/src/cvi-1b4o-disposable-acquisition-ledger.test.ts` executes SQL only in `seo_engine_cvi_disposable` on localhost when explicitly configured; demands 34 preceding tables, applies 0014, expects 35 tables, and tests two competing connections submitting identical nonce.
- `lib/db/package.json` adds `test:cvi-1b4o`.
- `.github/workflows/ci.yml` includes test:cvi-1b4o immediately after test:cvi-1b4e inside the existing proof-only disposable DB step, with database cleanup trap.

## Meaning and limitations
- Unique admission detects duplicate claimed acquisition IDs and nonce reuse; immutable rows serve as replay tombstones. This does NOT authenticate a provider transport, validate business truth, prove site ownership or authorize usage.
- The trigger checks basic current session and connected site ID at insertion time but cannot by itself prove tenant membership, independently authenticated request origin, response authenticity, freshness or connection revocation safety. Races and DB-owner trigger bypass remain relevant.
- The ledger uses retention-unbounded immutable rows; production retention/performance/data protection governance is unresolved.
- No real acquisition records, credentials, tenant memberships or permissions are seeded; no runtime route/provider calls/deployment/migrations/merges.
- The exact-head run must pass disposable database tests AND full TypeScript CI before certification.
- After certification, independently authenticated provider custody, trustworthy source evidence, editorial decisions and UGP pipeline integration remain material milestones.
