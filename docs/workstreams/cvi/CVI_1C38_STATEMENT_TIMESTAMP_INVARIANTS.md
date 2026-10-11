# CVI-1C.38 — Exact Session Issuance Timestamp Invariants

Parent CVI-1C.37 PR #1073: implementation SHA `0269f498a7b0908d92d5b1fd21c2d828655bf957` full CI success https://github.com/intssere/SEO_ENGINE/actions/runs/38121814808. Documentation SHA `651f9b2a7dcd6e2f61011627e39453fafc5a0789` has separate pending full-CI proof.

## Verified source concern
Session creation used three calls to PostgreSQL `clock_timestamp()` in one INSERT, which can return different times. Thus `created_at` and `last_seen_at` could differ and `expires_at-created_at` could differ slightly from the canonical TTL. This increment replaces the issuance trio with PostgreSQL statement-stable `statement_timestamp()` to guarantee equality within the INSERT, without trusting caller time. Exact-equality regression checks are added to the disposable authenticated PostgreSQL suite.

## Deferred safety review
Session load and rotation continue to use `clock_timestamp()` checks (rotation also writes `now()`). Replacing these with a statement-stable timestamp could introduce lock-wait expiration windows; this increment does not alter the security-sensitive concurrent UPDATE checks. Review separately with adversarial lock wait and expiry timing if changing them.

## Boundaries
Synthetic disposable PostgreSQL, stacked draft PR, no production changes, provider calls, publication authority, merge or deployment. Exact-head CI pending.
