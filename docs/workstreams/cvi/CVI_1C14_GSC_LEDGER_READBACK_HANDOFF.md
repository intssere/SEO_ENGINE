# CVI-1C.14 — GSC acquisition nonce-ledger readback

Date: 2026-10-09. Status: stacked draft; exact-head CI pending. No production operations.

## Certified predecessors
- PR #993, CVI-1C.12 at f7f46c0c284bc92107e204d07a2b23a28241880e: complete GitHub CI SUCCESS run 37968038925.
- PR #996, CVI-1C.13 at 796ce7ed265541af5dc0e4f37f2907e17df1940f: complete GitHub CI SUCCESS run 37968541203.
- All CVI implementation PRs are open drafts and unmerged.

## New increment
- PR #997 https://github.com/intssere/SEO_ENGINE/pull/997
- Head workstream/cvi-1c14-ledger-receipt-readback-pr996-dependent
- Base workstream/cvi-1c13-gsc-raw-nonce-lineage-pr993-dependent
- Initial head 62fb481b47a5fab2de827f89c9a419bfc99847eb
- Proof-only CI branch ugp-cvi-1c14-ci-proof-20261009.
- Source artifacts/api-server/src/lib/cvi-gsc-ledger-receipt-readback.ts
- Tests artifacts/api-server/src/lib/cvi-gsc-ledger-receipt-readback.test.ts

## Behavior
- Read-only reconciliation of prior CVI-1C.13 GSC lineage with a durable nonce-ledger row obtained from an injected read-only storage interface.
- Exact-match acquisition ID, tenant/site/connection, authenticated subject/session claims, nonce, requested GSC resource, raw-observation SHA-256 and recorded_untrusted disposition.
- Parameterized, immutable SELECT contract, no writes. Rejects missing or changed rows, unsafe upstream status, expected identity drift and DB errors.
- Result is DENY or LEDGER_MATCH_UNTRUSTED_REVIEW_ONLY. A match does not authenticate Google-origin data or grant content execution/publication.

## Remaining trust gaps
- Injected port is mocked in unit tests; it is not proof of a real database read in a trusted server process.
- Upstream lineage identifiers are supplied by caller. Session/grant values must be derived independently from authenticated runtime and checked against current revocation.
- No connected trusted OAuth transport, TLS origin attestation, live GSC request, verified licensing or independent truth review.
- Existing 0014/0015/0016 migrations remain dormant and were not applied in production.
- No PR merge, deployment, CMS write, or provider request occurred.

## Next
1. Certify full exact-head CI for #997; fix failures and rerun with a fresh proof branch if necessary.
2. Execute the exact SELECT in disposable Postgres after 0014-0016 with recorded nonce and revocation state, then test that replay/tenant substitution is rejected.
3. Implement server-owned authenticated connection and key custody only under separately governed authorization.
