# CVI-1C.56 — Disposable Session-Scoped Synthetic Write

## Dependency
Stacked on CVI-1C.55 draft PR #1107, commit `775a1c753d1bc35afbccfac09a3f5f65e244b723`. Parent implementation CI https://github.com/intssere/SEO_ENGINE/actions/runs/38148786539 was pending when this increment started.

## Narrow test
Inside the pre-existing localhost-only PostgreSQL test harness, a synthetic operator session is read with `SELECT ... FOR UPDATE` and checked for persisted role, subject, revocation, absolute and idle expiry. Authorization and insertion into a connection-local temporary table take place inside the same `postgres.begin` transaction. A synthetic `review_content` input is denied, a synthetic `synthetic_edit_draft` input is accepted, and revocation followed by the same input is denied. The temporary table retains exactly one row from the prerevocation operation.

## Nonclaims and remaining gaps
This is synthetic session authorization, not a real tenant ACL authorization check. `synthetic_edit_draft` is an in-test string and **not** a valid permission in dormant CVI ACL migration 0012. No membership or grant records are inserted or verified; no `action_plans` record is updated, no production route is changed, and no migration is applied. Concurrent ACL revocation, cross-site validation, and real handler integration remain blocked on approved policy/schema and independent review.

## Safety
No production database, external provider, crawler, CMS, public writes, merge, or deployment. Full exact-head CI is required before certification.

## Implementation CI receipt
Implementation HEAD `47abc370c44623ef5b015ea504a4973190ac73df` passed GitHub Actions run https://github.com/intssere/SEO_ENGINE/actions/runs/38149096970 (job `114498564207`, zero failures). This documentation commit requires its own exact-head CI. No merge or deployment.
