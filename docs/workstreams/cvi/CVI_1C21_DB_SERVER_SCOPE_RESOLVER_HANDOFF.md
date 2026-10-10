# CVI-1C.21 — Private database server-scope resolver

Date: 2026-10-10. Status: stacked draft, exact-head CI pending, no production operations.

## Verified predecessor
- CVI-1C.20 PR #1012 exact HEAD 779738222fedba5f85fce5f6f73bfeaa65a24e1c: full CI SUCCESS, run 38036663447.
- All CVI implementation PRs remain open/draft and unmerged.

## New implementation
- Draft PR #1013 https://github.com/intssere/SEO_ENGINE/pull/1013
- Head workstream/cvi-1c21-db-scoped-context-resolver-pr1012-dependent
- Base workstream/cvi-1c20-express-auth-gate-pr1011-dependent
- Initial HEAD 0276800174c0a71bd9577792832de1d5677fd7c3
- Proof branch ugp-cvi-1c21-ci-proof-20261010, run 38038394937 at initial checkpoint.
- Source artifacts/api-server/src/lib/cvi-gsc-server-scope-resolver.ts and corresponding test.

## Server-side resolution
- Takes acquisition ID as a mere locator and protected AuthPrincipal subject/session from the server-only CVI Express auth gate.
- SQL joins the immutable acquisition ledger to tenant/site, connected Google readonly connection, current authenticated session, active tenant membership and active site read_evidence grant in one SELECT.
- Filters by acquisition ID, auth subject and UUID session, validates current expiry and revocation, and acquires FOR SHARE row locks on site/connection/session/member/grant.
- Returns only tenant/site/connection UUIDs. Denies null, invalid, ambiguous records; tests assert no nonessential database fields leak and auth-subject/session are parameter-bound.
- Existing CVI-1C.16 scoped ledger readback independently rechecks permissions when actually reading the record.

## Restrictions
- This is an offline private library; no Express route or production database connection has been added. Principal provenance relies on correct trusted runtime wiring; request-supplied req.auth or credentials would violate its trust assumptions.
- A SELECT resolving a scope does not grant a standing access capability, provider authenticity, verified factual claims or content publishing.
- Source admission, credential custody, actual Google TLS/OAuth provenance and reviewer authorization remain separate.
- No real provider calls, production database migrations, CMS writes, merge or deployment.

## Next
1. Certify terminal full CI exact head for PR #1013. Repair tests and repeat proof if needed.
2. Run its exact query against disposable PostgreSQL with real tenant/member/grant/session fixtures and post-revocation denial.
3. Only with explicit separate operational authorization should a trusted Express route/production service wiring be contemplated.
