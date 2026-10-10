# CVI-1C.27 — Disposable PostgreSQL authenticated session handoff

Date: 2026-10-10

## Implementation and receipts
- Draft PR: https://github.com/intssere/SEO_ENGINE/pull/1029
- PR HEAD at initial proof: `8f1c7deef52e7282a4132c1d76e4c74b7cb4ec80`
- Base: PR #1024, `48e2c25ca0d9ede7e4dda73d6fbba452c6234ab7`
- Proof branch: `ugp-cvi-1b4e-ci-proof-20261010-ad`
- CI: https://github.com/intssere/SEO_ENGINE/actions/runs/38044865592
- Certification: **PENDING** when authored. Do not claim SUCCESS until completed exact-head workflow result is observed.

## Test scope
Real disposable PostgreSQL `createAuthSession` and `loadAuthSession`, synthetic subjects, actual cookieParser, attachAuthSession, requireApiAuthentication, private CVI gate and temporary loopback HTTP. Tests forged/no-cookie denials, role and CSRF, subject isolation, absolute expiry, idle timeout, revocation, token rotation, disabled authentication and invalid config. The successful gate permits historical review context only, not tenant scope or content execution/publication.

## Isolation and changes
Only `127.0.0.1:5432/seo_engine_cvi_disposable` permitted. Reject preexisting `DATABASE_URL`, validate database identity and server address before temporary mapping. CI creates and drops database with shell trap, applies `0002_auth.sql` only to disposable instance. Dedicated test process avoids concurrent env mutation. `auth-foundation.ts` now canonicalizes PostgreSQL timestamp text into ISO strings for CVI gate validation.

No production migration, live provider access, public route, merge, publication or deployment.

## Next
Inspect full CI; repair and re-proof any failure with exact new SHA. Then CVI-1C.28 positive private tenant/site authorization composition testing, still historical untrusted-review-only.
