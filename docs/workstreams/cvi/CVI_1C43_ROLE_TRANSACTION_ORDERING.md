# CVI-1C.43 — Role-Demotion Transaction Ordering

Parent CVI-1C.42 PR #1082 certified at `49d72aa2209e241bed5eaef3013a2942725f65e5`, full CI https://github.com/intssere/SEO_ENGINE/actions/runs/38129205098.

## Bounded regression
Disposable PostgreSQL test uses an uncommitted role demotion to hold a session-row lock while a separate transaction attempts to read and lock that row for operation authorization. After an independent `pg_stat_activity` lock-wait observation, the demotion commits; the blocked operation must observe the committed `viewer` role. A subsequent CSRF-protected POST is denied. Existing CVI-1C.42 tests cover sequential role authorization.

## Limitations
The test establishes demotion-first ordering only. Operation-first ordering, atomic mutation persistence, expiry or revoke contention, and real handler transactional integration are not yet certified. Entry middleware does not provide full in-flight fencing. No provider, production DB, publishing, merge or deployment.

## Certification
Full exact-head CI pending.

## Implementation certification receipt
- Exact HEAD `188298252d855b7f3ef60099bf076266ff888f1d`.
- Full CI https://github.com/intssere/SEO_ENGINE/actions/runs/38129564810 — SUCCESS, job `114440880643`, zero failed steps.
- Draft PR #1084 remains unmerged and undeployed. This documentation revision requires independent exact-head verification.
