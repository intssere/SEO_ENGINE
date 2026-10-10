# CVI-1C.27 — Actual application auth session roundtrip in disposable PostgreSQL

Date: 2026-10-10. Status: stacked draft, CI queued at checkpoint.

## Certified predecessor
- CVI-1C.26 PR #1024 exact HEAD 48e2c25ca0d9ede7e4dda73d6fbba452c6234ab7: full CI SUCCESS, run 38042551759.
- All CVI implementation PRs remain open drafts and unmerged.

## New increment
- Draft PR #1028 https://github.com/intssere/SEO_ENGINE/pull/1028
- Branch workstream/cvi-1c27-disposable-auth-session-roundtrip-pr1024-dependent
- Base workstream/cvi-1c26-loopback-express-auth-harness-pr1023-dependent
- Exact initial HEAD 2d32facdb6453b3b10308b22dcff60581a548790
- Proof branch ugp-cvi-1b4e-ci-proof-20261010-ac
- GitHub Actions run 38044062051 queued at last checkpoint.
- Appends CVI-1C.27 test to lib/db/src/cvi-1b4o-disposable-acquisition-ledger.test.ts

## Test
- Only gated localhost disposable PostgreSQL connection, with environment DATABASE_URL temporarily pointed to disposable database and restored.
- Exercises actual application auth-foundation createAuthSession, loadAuthSession and revokeAuthSession, not a simulated driver.
- Asserts random cookie token is loaded through stored SHA256 hash, forged token denied, revoked cookie denied.
- Passes loaded real DB AuthPrincipal through CVI-1C.20 reviewCviExpressAuthenticatedPrincipal to certify date/time representation and session validity.
- Tests use dynamic runtime-only imports to avoid crossing lib/db's TypeScript rootDir.

## Known potential contract risk
- auth-foundation's database query selects created_at::text, last_seen_at::text and expires_at::text. PostgreSQL may render noncanonical timestamps (space instead of T, timezone offset), while CVI gate insists on exact toISOString UTC form. CI must determine whether normalization is required. Never relax authentication gate for a formatting mismatch without a justified contract change.

## Security limits
- Offline disposable database only; no production user creation, no Google OAuth, no actual Express public route or live provider connection.
- An authenticated session is NOT itself tenant/site access; CVI-1C.21 and CVI-1C.16 must still check live grants and revocation.
- No live GSC calls, CMS writes, merges, deployments or production migrations.

## Next
1. Observe terminal CI. On failure inspect exact step and repair; issue fresh exact-head proof.
2. If timestamp format contract fails, normalize session data at trusted auth-foundation DB loader and ensure no loss of idle/expiry semantics.
3. Additional request-level authenticated-cookie proof would require carefully controlled disposable DB and local-only ephemeral Express harness, with no production exposure.
