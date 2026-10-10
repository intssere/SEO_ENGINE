# CVI-1C.25 — Express auth ordering and private-route regression guards

Date: 2026-10-10. Status: stacked draft / terminal CI pending.

## Certified predecessor
- CVI-1C.24 PR #1022 exact HEAD acfa118da1984ed1306d2594b2954640ef3828c0 — terminal full GitHub CI SUCCESS, run 38039576681.
- All CVI implementation PRs remain open drafts and unmerged.

## Current increment
- Draft PR #1023: https://github.com/intssere/SEO_ENGINE/pull/1023
- Branch workstream/cvi-1c25-auth-middleware-order-regression-pr1022-dependent
- Base workstream/cvi-1c24-disposable-two-query-composition-pr1018-dependent
- Initial HEAD b0f33525d725cd1d76ae60055f593fe3487caee0
- Exact-head proof branch ugp-cvi-1c25-ci-proof-20261010
- GitHub CI run 38040092210 in progress at initial checkpoint.
- Test artifacts/api-server/src/lib/cvi-gsc-runtime-auth-wiring.static.test.ts

## Audited real API request path
- artifacts/api-server/src/app.ts mounts cookieParser() before attachAuthSession() and then /api router.
- artifacts/api-server/src/routes/index.ts mounts health, provenance and auth routes before requireApiAuthentication(), then protected business routes.
- artifacts/api-server/src/middlewares/auth-security.ts loads req.auth through loadAuthSession from protected auth session cookie if enforcement is enabled/configured.
- General API requireApiAuthentication intentionally skips enforcement when config.enabled=false. CVI-1C.20 requires enabled=true and configured=true and protected req.auth, blocking that optional-auth bypass for CVI private readback.
- No CVI readback router has been registered. No runtime production readback endpoint is certified.

## New regression checks
- Static tests assert cookie parser / auth attachment / API route order and requireApiAuthentication placement relative to business routers.
- Tests prohibit accidental route registration of CVI/GSC readback in routes/index.ts.
- Assert private CVI auth gate explicitly requires enabled and configured authentication and does not derive req.auth from body/query/header fields.
- Assert private historical composition invokes grant-scoped resolver and independent readback while containing no provider/network operation.

## Limitations
- Static source tests are regression guards; they do not demonstrate that a deployed request uses that code or that a req.auth object is independently cryptographically authenticated.
- No production route, live provider transport, production SQL migrations, CMS publisher writes, merges or deployments.
- CVI-1C.23/1C.24 continues to return untrusted historical review only, with execution/publication rights false.

## Next
1. Verify terminal full CI for PR #1023 exact HEAD. Repair/retrigger if needed.
2. Consider a purely offline end-to-end Express middleware harness test: configured/disabled/missing session, no public endpoint, no production database or network requests.
3. A production route or Google provider access needs separate bounded authorization and an audit of trusted session and credentials custody.
