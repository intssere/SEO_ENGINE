# CVI-1C.8 — Actual exported atomic SQL disposable PostgreSQL proof

Date: 2026-10-09. Status: stacked draft PR, pending full exact-head validation. No production changes.

## Predecessor remediation
- CVI-1C.7 PR #981 at prior HEAD a18a7865665ca2c1dc92f503aeb84461ee6edfc7 failed GitHub Typecheck TS2345: readonly denial reasons were passed to mutable string[].
- Corrected on #981 to HEAD 382705fc749469d2ddd5bae3668f0eb93d697154 (only accepts readonly string[]); new proof-only branch ugp-cvi-1c7-ci-proof-20261009-r2, run 37962742594 pending at checkpoint.
- PR #981 remains draft/unmerged.

## Current
- New draft PR #985: https://github.com/intssere/SEO_ENGINE/pull/985
- Work branch workstream/cvi-1c8-atomic-sql-disposable-proof-pr981-dependent
- Base branch workstream/cvi-1c7-receipt-nonce-atomic-admission-pr980-dependent
- Exact head 3ba57d60e31ad46a5ff1557a2de8f6cdc298d6c9
- Proof branch ugp-cvi-1b4e-ci-proof-20261009-q
- CI run 37962898506 (pending initial checkpoint).
- Existing CI gated test step creates isolated localhost seo_engine_cvi_disposable, runs cvi-1b4e ACL and cvi-1b4o ledger tests including newly appended CVI-1C.8 test, and drops disposable DB via trap.

## Test and control surface
- lib/db/src/cvi-1b4o-disposable-acquisition-ledger.test.ts new third test.
- Reads artifacts/api-server/src/lib/cvi-receipt-nonce-admission.ts as text, extracts the actual exported parameterized CVI_ATOMIC_RECEIPT_LEDGER_SQL literal, executes it with real postgres against dormant 0014/0015 schema after preceding tests create valid tenant, session, member and grants.
- Simultaneous same-tenant/connection/nonce write competition must yield exactly one durable row and one zero-row ON CONFLICT result; reused acquisition ID must result in zero rows.
- Revoked membership must block new acquisition via trigger and no second row may exist.
- All work confined to disposable test database; no new migration, provider read, production table mutation, CMS publish, merge or deploy.

## Residual risks
- This proves SQL execution under local disposable postgres, but not a production service's trusted database adapter, authenticated session binding, or cryptographically managed source acquisition.
- Concurrent membership revocation vs same-transaction admission needs further explicit fencing tests and policy. Revocation check at statement start is not a general authorization capability.
- Signed receipt only proves local key possession, not provider truth or licensing, and emitted packet never authorizes execution/publication.
- Do not advance this PR to merged/deployed without explicit user authorization and all CI passing at exact HEAD.
