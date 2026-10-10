# CVI-1C.20 — Private Express authentication gate

Date: 2026-10-10. Status: open draft PR; exact-head CI in progress. No production actions.

## Certified predecessor
- CVI-1C.18 PR #1007 at exact HEAD 3d1e0929e4da6b3a8cf67099f37d58ecd9d158ea: terminal full GitHub CI SUCCESS, run 38036226000, after fixing TypeScript cross-project dynamic import.
- CVI-1C.19 PR #1011 at HEAD 3db00868e9bd8644c8bc7b741e0f9e7d9880a98d: full CI in progress at checkpoint.

## New incremental PR
- Draft PR #1012 https://github.com/intssere/SEO_ENGINE/pull/1012
- Branch workstream/cvi-1c20-express-auth-gate-pr1011-dependent
- Base workstream/cvi-1c19-server-principal-readback-pr1007-dependent
- Initial HEAD 779738222fedba5f85fce5f6f73bfeaa65a24e1c
- Proof branch ugp-cvi-1c20-ci-proof-20261010; run 38036663447, full CI pending.
- Source artifacts/api-server/src/lib/cvi-gsc-express-auth-gate.ts
- Tests artifacts/api-server/src/lib/cvi-gsc-express-auth-gate.test.ts

## Audited existing auth behavior
- artifacts/api-server/src/middlewares/auth-security.ts attaches authenticated application req.auth by loadAuthSession from protected cookie if AUTH_ENFORCEMENT_ENABLED and configured.
- General requireApiAuthentication intentionally calls next() when authentication is disabled. This is **not an acceptable CVI runtime readback behavior**.
- The private CVI preflight expressly requires config.enabled and config.configured, protected req.auth, canonical session issue/last-seen/expiry, allowed viewer/operator/admin role and a valid session ID; it never falls back to HTTP-supplied identity.
- Bridge wraps CVI-1C.19 server principal facade and accepts a separately server-owned tenant/site/connection resolver and private CviScopedReadbackStore.
- Unit tests reject disabled authentication, missing/expired/malformed principals and prove denied inputs make zero storage calls. Valid mocked context yields only UNTRUSTED_SCOPED_HISTORICAL_REVIEW_ONLY.

## Trust limitations
- This is not yet an HTTP route and no Express mount or production wiring was changed.
- The code does not prove req.auth was populated by protected middleware. Only correct trusted Express placement can establish that.
- The injected site/connection resolver remains hypothetical and must be backed by authenticated session/grant and trusted DB state; never trust client-submitted scope identifiers.
- The tests are offline, not evidence of authenticated production authorization or live Google provenance.
- All CVI outputs remain nonauthorizing; no merge, production deploy, migration, provider request or CMS publishing occurred.

## Next
1. Verify terminal full CI for PR #1011 and #1012 at exact heads; repair/rerun if failures.
2. Review and implement trusted server-controlled site/connection resolver from database, with tenant, membership, grant and connection scope state checked atomically.
3. Do not expose a CVI readback route without separate explicit authorization, authenticated middleware order and code review.
