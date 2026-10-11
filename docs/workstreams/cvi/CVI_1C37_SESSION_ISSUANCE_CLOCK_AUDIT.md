# CVI-1C.37 — Session issuance clock-authority audit

## Proven predecessor
CVI-1C.36 draft PR #1069, exact HEAD `6730bb6e30bed913e5b0786bc1cc3c432366c3aa`, full CI success: https://github.com/intssere/SEO_ENGINE/actions/runs/38119266114.

## Source-backed finding
`loadAuthSession` validates and refreshes idle time using PostgreSQL `clock_timestamp()`, and `rotateAuthSessionToken` validates expiry using PostgreSQL time. However, `createAuthSession` still computes `created_at`, `last_seen_at`, and `expires_at` using the application's `input.now ?? new Date()` and persists those values. Its optional `now` argument is potentially supplied by trusted internal callers or tests; identify call sites before changing semantics. An application clock substantially ahead of database time may grant a future absolute expiry or last_seen_at not aligned with the database-clock authorization model.

## Proposed bounded implementation
1. Trace every real caller of `createAuthSession`, especially any test fixtures using `input.now`.
2. Add disposable PostgreSQL issuance tests with far-future and far-past injected application time; assert database-authoritative creation and expiration bounds.
3. If compatible, move persisted issuance clock and expiry computation to a single SQL statement using database time, and return normalized timestamps from the actual inserted row.
4. Retest authentication, idle expiry, token rotation, role, CSRF, refresh and revocation; prove no premature or extended capability under skew.
5. Preserve server-side authentication and CVI historical-review-only restrictions. Do not mount public CVI routes.

## Current status
Audit and source-backed gap identified. No CVI-1C.37 source modification, test implementation or CI certification yet. No merge, deployment, production migration, OAuth/provider use or CMS mutation.
