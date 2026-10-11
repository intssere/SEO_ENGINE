# CVI-1C.39 — Session Refresh/Rotation Lock-Wait Clock Audit

## Starting evidence
CVI-1C.38 implementation HEAD `23e07e8c612016f24b71b666623effa57a0b4072` passed full CI https://github.com/intssere/SEO_ENGINE/actions/runs/38122428762. The documentation receipt revision `e5c5d48f6370fa94cf9593bd69a5ee3c53bb75f3` awaits a separate exact-head proof.

## Source-backed discrepancy
`loadAuthSession` persists `last_seen_at=clock_timestamp()` and validates expiration/idle expiry against `clock_timestamp()` within one conditional PostgreSQL UPDATE. `rotateAuthSessionToken` validates expiration/idle with `clock_timestamp()` but writes `last_seen_at=now()`, PostgreSQL's transaction-start time. After a row-lock wait, `now()` can predate actual completion, creating a stale `last_seen_at` even when the decision is made at a later wall-clock time. This is a bounded consistency concern, not proof of authorization bypass.

## Proposed certification
1. Preserve conditional eligibility evaluation after row-lock acquisition, including revocation, absolute expiry, and idle expiry.
2. Verify a controlled concurrent row-lock wait during a successful eligible rotation (without revoking), capturing database time immediately before lock release; require persisted last_seen_at not to predate lock release and old token denial.
3. If the test exposes stale timestamp behavior, use `clock_timestamp()` for the rotation refresh field while preserving the conditional WHERE security checks.
4. Re-run existing CVI-1C.33 revocation races and CVI-1C.36 expiry boundary certification plus full exact-head CI.

## Safety limits
Synthetic disposable PostgreSQL; no production database, live providers, public route, publishing, merge or deployment. Audit only; implementation and certification pending.

## Bounded implementation
Changed successful token rotation's `last_seen_at` refresh from PostgreSQL transaction-start `now()` to `clock_timestamp()` while retaining the conditional revocation/expiry/idle checks. Added disposable row-lock blocking regression verifying the persisted refresh timestamp is no earlier than a DB clock marker captured immediately before releasing the lock, the old token denies, and the rotated token authenticates. Await exact-head full CI; no runtime certification claimed yet.

## Exact-head implementation CI receipt
- Implementation SHA `7ce128792a362feefad9a4ae370cfc7ea4ac3fba`.
- Full workflow https://github.com/intssere/SEO_ENGINE/actions/runs/38123039267 completed SUCCESS, validation job `114421533338`, no failed steps.
- PR #1077 remains open/draft, unmerged and undeployed. This documentation revision requires separate exact-head CI.
