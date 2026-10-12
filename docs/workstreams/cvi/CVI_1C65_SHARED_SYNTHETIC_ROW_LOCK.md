# CVI-1C.65 — Shared Synthetic Row-Lock Contention

## Change
Extends the existing proof-branch-only disposable PostgreSQL authenticated-session test with a two-connection `UPDATE` contention regression on `cvi_1c65_synthetic_lock`, a **test-only shared synthetic table**. Connection A locks and updates the row before commit. Connection B attempts a transactional update with `lock_timeout='3s'`; an explicit entry barrier and bounded pre-commit noncompletion assertion verify that the contender has entered its transaction and cannot finish before A releases the row lock. After A commits, B's update completes and the final marker is asserted. The test attempts rollback and drops the synthetic table in `finally`.

## Isolation and limitations
The existing CI step creates the localhost-only `seo_engine_cvi_disposable` database for this test and drops it on step exit. This exercises **actual interconnection row locking**, unlike CVI-1C.64's connection-private temporary table. It is not an authorization test, site grant, deadlock proof, `action_plans` handler test or certification of any proposed production lock order. It creates no `edit_draft` permission and does not apply dormant ACL migrations beyond the previously existing CI proof harness.

The initial `pg_stat_activity` observer failed in CI twice, so it was replaced by an explicit contender-entry barrier and a bounded noncompletion assertion. Those are test assertions, not proof of production authorization. The repaired implementation's CI must pass before certification. No provider, crawl, CMS write, production database, merge or deployment.
