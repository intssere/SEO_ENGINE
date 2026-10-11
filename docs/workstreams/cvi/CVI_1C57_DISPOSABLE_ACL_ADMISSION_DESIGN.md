# CVI-1C.57 — Disposable ACL Admission and Revocation Design

## Baseline
Parent CVI-1C.56 draft PR #1109, documentation head `84ce8f2ee27fa1222a74e47b884709b2a4af753f`. Final exact-head CI https://github.com/intssere/SEO_ENGINE/actions/runs/38149489609 was in progress when this design increment began.

## Source-confirmed constraints
- `lib/db/migrations/0012_cvi_tenant_site_acl_draft.sql` defines dormant `cvi_organization_memberships` and `cvi_site_read_grants` with cross-organization foreign keys, effective and expiry times, and active/revoked states. It allows `read_evidence`, `review_content`, and `manage_connection`, **not** `edit_draft`.
- `lib/db/migrations/0016_cvi_acquisition_revocation_serialization_draft.sql` uses site → connection → session → membership → grant locking for read-only acquisition admission; it is not a production draft-edit authorization design.
- `lib/db/src/runtime-bootstrap.ts` does not apply the dormant CVI ACL migrations.
- Current CVI-1C.55/56 tests check in-memory synthetic permission and disposable session-scoped synthetic mutation, **not** actual site ACL revocation.

## Proposed next disposable-only certification
1. Author a dedicated test database fixture or isolated rollback-scoped transaction that explicitly applies `0012` to a **disposable localhost database only**, with schema prerequisites verified, no production URL and no default runtime bootstrap changes.
2. Create synthetic organization, site, session subject, active editor membership, and `review_content` read grant. Test positive **review-only** admission and negative cross-org/site, inactive membership, revoked grant, not-yet-effective and expired rows.
3. Run two dedicated connections: one locks site/session/membership/grant in the vetted common order while another revokes membership/grant. Assert deterministic operation-first and revocation-first outcomes with no unauthorized synthetic review receipt.
4. Do **not** treat `review_content` as `edit_draft`; new mutation-specific permission requires separate product/security approval and schema review. No `action_plans` writes.
5. Ensure fixtures and SQL are designed to clean up completely on failure, and CI checks fail closed if disposable database identity cannot be established.

## Review checklist
- Establish that migration application in the test harness does not conflict with the existing disposable CI's schema setup, table counts, or cleanup procedures.
- Confirm the exact session identity mapping (`auth_sessions.subject` to `cvi_organization_memberships.auth_subject`), site organization identity, and required read-only grant.
- Confirm lock ordering and effective-time checks after lock waits.
- Compare existing CVI-1C.xx tests for duplicate coverage before implementing this test.
- Obtain independent database/security review before any mutation-grant schema extension, production API integration, or deployment.

## Explicit nonclaims
Design-only. Not an ACL migration, no production enforcement, grants, credentials, provider calls, CMS publishing, production DB access, merge or deployment. Passing CI certifies documentation and the existing test suite only, not the proposed ACL behavior.

## Disposable harness review — concrete implementation constraints
Inspected `artifacts/api-server/src/lib/cvi-gsc-disposable-authenticated-session.ephemeral.test.ts`: the test allows only PostgreSQL at `127.0.0.1:5432/seo_engine_cvi_disposable` as user `postgres` (with no URL query/fragment), rejects inherited `DATABASE_URL`, verifies the connected database name, requires `auth_sessions`, and then temporarily points `DATABASE_URL` at that disposable instance. The existing harness holds one main test across many CVI increments and restores environment variables in `finally`.

**Critical isolation requirement:** Do **not** automatically apply draft migration `0012` inside that shared session harness: it changes public schema and could invalidate CI schema-count expectations or other concurrently running tests. First design an **independent disposable database fixture** or a schema-isolated rollback strategy with explicit prerequisites and a committed cleanup test. Its exact database name and CI workflow orchestration must be established from source before implementation. An ephemeral PostgreSQL test can use `BEGIN ... ROLLBACK` if all DDL and records are in the same connection/transaction and no parallel connections need the uncommitted schema; concurrent revocation proof needs a genuinely committed temporary schema and reliable teardown.

**No migration enactment is part of CVI-1C.57.** Only after fixture isolation and policy review should a separate bounded PR add tests for the *existing read-only* `review_content` grant. Its success must never be used to claim `edit_draft` authority.
