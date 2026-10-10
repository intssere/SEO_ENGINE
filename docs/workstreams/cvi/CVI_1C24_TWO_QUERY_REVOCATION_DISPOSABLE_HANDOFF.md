# CVI-1C.24 — Disposable two-query private Express/database revocation proof

Date: 2026-10-10. Status: new stacked draft; terminal full CI pending.

## Certified predecessor
- CVI-1C.23 PR #1018 at exact HEAD 8f7c18f293c0537faca16b9d4ff28ceac049565c: terminal full GitHub CI SUCCESS run 38039331794.
- All CVI implementation PRs remain open drafts and unmerged.

## New increment
- Draft PR #1022 https://github.com/intssere/SEO_ENGINE/pull/1022
- Head workstream/cvi-1c24-disposable-two-query-composition-pr1018-dependent
- Base workstream/cvi-1c23-private-express-db-composition-pr1017-dependent
- Initial exact HEAD acfa118da1984ed1306d2594b2954640ef3828c0
- Disposable proof branch ugp-cvi-1b4e-ci-proof-20261010-ab; CI run 38039576681.
- Dedicated disposable database certification step SUCCESS; full CI in progress at checkpoint.
- Test appended to lib/db/src/cvi-1b4o-disposable-acquisition-ledger.test.ts.

## What was proved
- Dynamically imports the actual CVI-1C.23 private Express-to-PostgreSQL composition, using a real postgres.Sql connection to disposable localhost CVI database.
- Synthetic protected Express-shaped AuthPrincipal and stored acquisition record yield only UNTRUSTED_HISTORICAL_REVIEW_ONLY; provider and publishing/execution authorization remain false.
- Disabled CVI authentication returns DENY. Untrusted cross-tenant lineage mismatch returns DENY.
- Two DB connections: after resolver SELECT succeeds, a separate connection revokes the site read grant, before the independent scoped historical readback SELECT. Readback is DENY, verifying it does not reuse earlier authorization as a persistent capability.
- Revoking authenticated DB session also denies the private composition even when Express-shaped input remains valid.

## Boundaries
- This is a CI-only disposable localhost integration, with no public route, runtime middleware registration, production DB changes or live provider calls.
- Synthetic request principal is not independent proof of a real cookie-authenticated user.
- Two independently scoped SELECTs are not a single serializable transaction. Fresh grant and session checks are performed at each statement, and the temporary result is not reusable authorization for later operations.
- Provider-origin verification, Google OAuth/TLS, factual accuracy, source licensing and publishing approval remain unimplemented or unproven. All outputs remain nonauthorizing.
- No PR merge, deployment, production migration or CMS publication.

## Immediate next
1. Verify terminal exact-head full CI for PR #1022, repair if necessary.
2. Audit real Express auth middleware ordering and session loading; design private integration only after fail-closed guarantees. Do not mount any route or fetch Google without explicit permission.
3. Maintain independent source provenance, tenant authorization and editorial review gates.
