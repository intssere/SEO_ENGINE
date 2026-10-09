# CVI-1C.7 — Signed receipt nonce-admission integration handoff

Date: 2026-10-09
Status: DRAFT and unmerged; exact-head CI pending; no production activity.

## Current PR and dependency
- Parent CVI-1C.6 PR #980: https://github.com/intssere/SEO_ENGINE/pull/980 at HEAD b696dd7d909f5b336a945e20613ababb8e2b7ff2; full CI run 37960814904 pending at creation.
- New draft PR #981: https://github.com/intssere/SEO_ENGINE/pull/981
- Branch: workstream/cvi-1c7-receipt-nonce-atomic-admission-pr980-dependent
- Base: workstream/cvi-1c6-signed-source-receipt-pr979-dependent
- Exact head at creation: a18a7865665ca2c1dc92f503aeb84461ee6edfc7
- Proof-only branch ugp-cvi-1c7-ci-proof-20261009 at exact head.

## Implementation
- artifacts/api-server/src/lib/cvi-receipt-nonce-admission.ts
- artifacts/api-server/src/lib/cvi-receipt-nonce-admission.test.ts
- Checks 1C.6 HMAC verified receipt, tenant/site/subject/session/acquisition/nonce and nested UGP ledger integrity before issuing any call to the injected atomic store.
- Validates UUID shaped DB identities and bounded source-observation/request timeline.
- Defines parameterized single-statement PostgreSQL INSERT ... ON CONFLICT DO NOTHING RETURNING against dormant 0014/0015 CVI acquisition ledger; rejection of unique key collision, grant/revocation trigger errors and DB outages is designed to fail closed.
- Offline unit tests check no ledger calls on invalid key, mismatched session or expired receipt, and no permission grant even when a mocked store claims a successful recording.
- All outcomes have providerOriginIndependentlyVerified=false, evidenceTruthIndependentlyVerified=false, publicationAuthorized=false and executionAuthorized=false.

## Critical trust and certification boundaries
- The ledger implementation is an **injected interface**, not a production DB adapter. Unit tests use mocks. A reported durableNonceRecorded=true is not independently certified without an actual trusted DB transport.
- The SQL is a static contract; the prior disposable PostgreSQL unique nonce concurrency tests in PR #963/#965 do not by themselves prove this specific newly exported SQL is executed.
- The HMAC secret is caller-supplied to the pure function; keys must never come from browser or requests. Trusted secret custody remains unimplemented.
- Correct DB migration and trusted session/membership/grant enforcement are required. The migrations remain dormant and have not run on production.
- A valid signed receipt does not prove real GSC/Shopify property control, provider request authenticity, factual truth, licensing or human approval.
- No runtime handler, provider call, CMS publishing, merge, deployment or production writes.

## Next
1. Check exact-head full CI on PR #980 and #981; repair any failures using new proof branches.
2. Validate exported atomic SQL on a disposable PostgreSQL instance in a dedicated integration test, bound to concurrent nonce admission and revocation.
3. Establish server-only key custody and trusted authenticated DB transport under separate governed authorization.
4. Prioritize independently verified content truth and editorial review before any real publication integration.
