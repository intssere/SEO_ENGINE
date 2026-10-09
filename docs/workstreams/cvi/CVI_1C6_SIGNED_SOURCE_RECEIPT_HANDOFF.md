# CVI-1C.6 — Offline signed source receipt identity boundary

Date: 2026-10-09
Status: DRAFT, exact-head CI pending; no production operations

## Stack
- PR #979 CVI-1C.5 head `4a89f7b4e9c7091115dc972731d415b90428ee31`; CI run 37960314389 still running at checkpoint.
- PR #980 CVI-1C.6: https://github.com/intssere/SEO_ENGINE/pull/980
- Branch `workstream/cvi-1c6-signed-source-receipt-pr979-dependent`; base `workstream/cvi-1c5-nested-source-integrity-pr974-dependent`
- Head `b696dd7d909f5b336a945e20613ababb8e2b7ff2`
- Exact-head proof-only branch `ugp-cvi-1c6-ci-proof-20261009`; validation run 37960814904 pending.
- Ancestor CVI PRs remain drafts/unmerged.

## Code and tests
- `artifacts/api-server/src/lib/cvi-signed-source-receipt.ts`
- `artifacts/api-server/src/lib/cvi-signed-source-receipt.test.ts`
- Offline HMAC-SHA256 receipt with canonical sorted JSON, domain-separated MAC, minimum 32-byte secret and constant-time signature comparison.
- Claims bind tenant/site, authenticated subject and session, acquisition ID/nonce, source-ledger fingerprint, nested source integrity result fingerprint, issued and expiration clocks with <=5 minute validity.
- Verifier checks identity scope, exact nonce/acquisition, source nested integrity and time bounds.
- Tests valid key but not authority, tampering and wrong key, mismatched tenant/site/session/subject/nonce, expired/future clocks, unsafe nested report and weak key.

## Hard security limits
- Passing MAC proves only that somebody possessed the supplied HMAC key and issued those *claims*. No server-only key custodian is integrated or verified; caller-provided key would destroy the trust model.
- Issuer is a pure offline primitive. It has no independently authenticated OAuth/provider transport, actual first-party acquisition or source licensing rights, no human approval and no true business fact verification.
- No durable uniqueness ledger is called in this module. A signed nonce may replay until ledger-based atomic consumption and revocation fencing are independently integrated.
- Matching receipts yield PENDING_DURABLE_REPLAY_AND_PROVIDER_ORIGIN_CHECK with providerOriginIndependentlyVerified=false, nonceUniquenessIndependentlyVerified=false, businessTruthIndependentlyVerified=false, humanApprovalAuthenticated=false, and executionAuthorized/publicationAuthorized=false.
- No runtime integration, public endpoint, provider request, database migration, CMS mutation, merge or deploy.

## Immediate next
1. Check full exact-head CI of #979 and #980; repair and retest before certification if needed.
2. Explore trusted server-owned key custody and atomic nonce-consumption versus dormant 0014/0015 ledger; require separately governed deployment and genuine authenticated user/session.
3. Independently verify source facts/rights and editorial approval; do not treat signature as proof of factual correctness.
