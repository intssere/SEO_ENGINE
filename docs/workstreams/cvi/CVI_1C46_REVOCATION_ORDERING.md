# CVI-1C.46 — Revocation-First Transaction Ordering

Parent CVI-1C.45 draft PR #1088 passed documentation-inclusive full CI at `c36e7c34935429a707eb0110c4b22b58eb5316bc`: https://github.com/intssere/SEO_ENGINE/actions/runs/38132631290.

## Synthetic proof scope
A transaction holds an uncommitted `auth_sessions.revoked_at` update; a second disposable PostgreSQL transaction attempts `SELECT ... FOR UPDATE` with eligibility filters. An observed database lock wait precedes revocation commit. The waiting transaction must reject an invalid session; a subsequent authenticated privileged HTTP POST is denied. No synthetic write is attempted in the losing transaction.

## Boundaries and remaining work
Test is revocation-first ordering, not operation-first revocation, nor an integrated real business write. Follow-up should integrate synthetic write count under revocation contention and verify rollback semantics; then separately review endpoint authorization architecture. All tests require full exact-head CI. No production DB, external provider, public CVI route, CMS publishing, merge or deployment.

## Implementation CI receipt
Corrected implementation `d6e511cf781dd37b898b7927e5d53fdacb5376a4`: SUCCESS https://github.com/intssere/SEO_ENGINE/actions/runs/38134471492 (job `114455405989`). The revoked session returns HTTP 401, not 403. Documentation-inclusive exact-head CI still required.
