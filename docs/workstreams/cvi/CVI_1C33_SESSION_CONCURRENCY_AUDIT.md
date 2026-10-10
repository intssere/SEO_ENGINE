# CVI-1C.33 — Session Concurrency and Clock Audit

Parent CVI-1C.32 PR #1052 at exact HEAD `a2636fb862edd0f916ea3261a8dcbbae791cba18`, GitHub Actions run 38058188635 SUCCESS.

## Verified source review
`loadAuthSession` now performs a single conditional UPDATE RETURNING, eliminating its prior SELECT/UPDATE separation. `rotateAuthSessionToken` now requires one eligible UPDATE RETURNING row; revoked, missing, absolute-expired and idle-expired sessions are rejected. `revokeAuthSession` updates `revoked_at` by token hash.

## Next verification scope
- Reproduce overlapping load, revoke and rotate operations with two disposable PostgreSQL sessions and deterministic transaction barriers.
- Verify old rotated tokens cannot authenticate; revoked sessions cannot revive through a racing load or rotation.
- Compare application-supplied session time with PostgreSQL `clock_timestamp()` behavior, including skewed/future times. Avoid silently declaring clock-skew correctness.
- Verify failed rotation leaves token hashes unchanged and emits no apparent successful session.
- Confirm role and CSRF invariants survive rotation and refresh.
- Keep positive CVI outcomes historical untrusted review only, never execution or publication.

## Restrictions
Draft-only engineering; no production database, production migration, live Google access, new public route, CMS action, merge or deployment. The current file records a source-backed audit and proposed certification; no implementation or CI certification of CVI-1C.33 is claimed.
