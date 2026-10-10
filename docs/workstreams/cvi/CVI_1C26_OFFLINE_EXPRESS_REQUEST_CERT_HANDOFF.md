# CVI-1C.26 — Offline Express Request-Level Authentication Regression

Date: 2026-10-10. Status: draft, exact-head CI running.

## Predecessor
- CVI-1C.25 PR #1023, exact HEAD b0f33525d725cd1d76ae60055f593fe3487caee0: complete GitHub CI SUCCESS, run 38040092210.
- All CVI implementation PRs remain drafts and unmerged.

## New increment
- Draft PR #1024 https://github.com/intssere/SEO_ENGINE/pull/1024
- Branch workstream/cvi-1c26-loopback-express-auth-harness-pr1023-dependent
- Base workstream/cvi-1c25-auth-middleware-order-regression-pr1022-dependent
- Exact initial HEAD 48e2c25ca0d9ede7e4dda73d6fbba452c6234ab7
- Proof branch ugp-cvi-1c26-ci-proof-20261010
- GitHub CI run 38042551759 in progress at checkpoint.
- New file artifacts/api-server/src/lib/cvi-gsc-loopback-express-auth.test.ts

## Actual offline request path
- Test-only ephemeral server bound exclusively to 127.0.0.1 using real Express cookieParser, attachAuthSession and requireApiAuthentication, plus CVI-specific reviewCviExpressAuthenticatedPrincipal.
- Anonymous configured/enabled GET is 401; forged identity headers and fake session cookie are 401; optional generic auth mode disabled is overridden by CVI private 403 DENY; misconfigured auth is 503.
- DATABASE_URL is deliberately removed from process environment while test runs and restored afterwards. No provider request is created.
- The probe route is defined only inside a test function. It is never registered in production app.ts or routes/index.ts.

## Boundaries
- No production or external HTTP request, no live database, no Google OAuth, no persistent policy mutation or publishing.
- A passing test validates negative enforcement and middleware execution ordering on a local test app. It does NOT validate successful real user cookies, production runtime configuration, principal provenance or a production CVI endpoint.
- All CVI review outputs remain untrusted, nonauthorizing.
- No merges, deployments or production migrations.

## Next
1. Verify terminal exact-head CI success for #1024, repair and retrigger on any failure.
2. Design an offline positive principal test using authenticated signed-cookie/session fixtures in disposable PostgreSQL only, without external provider/production contact.
3. Do not mount public CVI historical-readback routes or contact live GSC absent explicit new bounded authorization.
