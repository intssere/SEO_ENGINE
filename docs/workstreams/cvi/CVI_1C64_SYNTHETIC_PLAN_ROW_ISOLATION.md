# CVI-1C.64 — Disposable Synthetic Plan-Row Isolation Probe

## Scope
Adds a small isolated probe to the existing proof-branch-only CVI authenticated-session PostgreSQL test. It creates a connection-local temporary synthetic plan table, takes a bounded `FOR UPDATE` lock, changes the synthetic marker, and checks that a distinct connection cannot resolve that temporary table.

## Important limitations
This is **not** a two-connection plan-versus-grant lock-order regression. PostgreSQL temporary tables are connection-private, so they cannot establish concurrent revocation or a deadlock cycle between different connections. The probe is only a narrow fixture-isolation and row-lock prerequisite. Existing session and acquisition concurrency tests remain the real database serialization evidence; a dedicated shared synthetic schema and independent reviewed lock order would be necessary to add genuinely new plan/grant contention tests.

No real `action_plans` row, organization grant, or `edit_draft` capability is touched. The dormant ACL remains excluded from production bootstrap. No production handler, migration, provider, crawling, CMS write, merge, or deployment.
