# CVI-1C.17 — Private scoped PostgreSQL readback adapter

Date: 2026-10-10. Status: draft/unmerged, exact-head CI pending.

## Predecessor remediation
- CVI-1C.15 PR #1001 at HEAD 388b1e79cd78a81b98e2da97303c9fc28aecec16: full CI SUCCESS, run 37971763785.
- CVI-1C.16 PR #1003 originally failed TypeScript TS2345 (unknown[] passed into postgres typed parameters) despite disposable PostgreSQL proof passing. The test helper was repaired to use readonly string[] and copied string[] driver parameters at new HEAD 5fbaf3e9d2634b47f7b4501861e88646b7e7bf31. Fresh proof branch ugp-cvi-1b4e-ci-proof-20261010-u and run 38035213249 are pending at checkpoint.
- All implementation PRs remain drafts and unmerged.

## New increment
- CVI-1C.17 draft PR #1006 https://github.com/intssere/SEO_ENGINE/pull/1006
- Head workstream/cvi-1c17-scoped-readback-postgres-adapter-pr1003-dependent
- Base workstream/cvi-1c16-scoped-ledger-readback-pr1001-dependent
- Exact initial HEAD cc7e3949c2f603515dd9b087909697b2230b9905
- Proof branch ugp-cvi-1c17-ci-proof-20261010 and CI run 38035319828 pending.
- New source artifacts/api-server/src/lib/cvi-gsc-scoped-readback-postgres-adapter.ts
- New unit tests artifacts/api-server/src/lib/cvi-gsc-scoped-readback-postgres-adapter.test.ts

## Behavior
- Implements private CviScopedReadbackStore adapter using the exact parameterized and revocation-aware CVI-1C.16 SELECT through postgres.Sql.
- Validates input length/format/control characters, passes six positional parameters, returns null for no rows, rejects ambiguous or corrupted records and returns only allowlisted fields.
- Tests query/parameter identity, internal field redaction, no records, multiple records, malformed disposition/fingerprint, invalid scope and database transport rejection.

## Hard restrictions
- **No runtime wiring** is performed; the postgres.Sql connection must come from trusted server setup and tenant/subject/session identifiers must come from authenticated runtime, never from user input. The adapter alone is not authentication.
- The SQL checks access only during the current statement. It is not a standing capability for future provider reads, publication or source truth.
- No GSC OAuth tokens, Google live HTTP requests, production database migrations, secret reads, CMS publication, merges or deployment.
- Full exact-head CI must pass before declaring this increment certified.

## Immediate next
1. Verify full exact-head CI outcomes for PR #1003 and #1006. If failure occurs repair and rerun a new proof-only branch at the new SHA.
2. Test this adapter end-to-end against disposable PostgreSQL with a real postgres.Sql, not only a simulated driver.
3. Design an authenticated server-only binding from verified session/tenant to the scoped storage port under separate governance. This must not bypass provider-token isolation.
