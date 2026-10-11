# UGP-11.C4 — Real COMMIT-Phase Backend Interruption (Disposable PostgreSQL)

Certified source baseline: `initiative-universal-growth-platform` at `616bf528a542ecd89a572fac02bd642f0511798d`; post-merge CI #38144951031 passed.

## Experiment

This is a genuine PostgreSQL backend termination, not a mocked JavaScript exception. In the loopback-only `seo_engine_test` database, the test creates a deferred constraint trigger on the disposable attempt journal. A writer transaction atomically updates an expired synthetic fenced claim and writes a matching attempt marker. A deferred trigger enters `pg_sleep` while PostgreSQL is processing `COMMIT`. A separate observer polls the exact writer backend PID in `pg_stat_activity` and requires observed `query=COMMIT` and `wait_event=PgSleep` before executing `pg_terminate_backend(pid)`.

The writer must reject. The independent PostgreSQL connection must then observe the original owner/fence/attempt count and absence of the attempted journal marker. If the exact COMMIT phase is not observed, the test fails rather than asserting the wrong fault window. The exercise confines DDL and backend termination to disposable local PostgreSQL, and test cleanup removes the dedicated fixture.

## What this does and does not prove

If CI passes, it certifies a **real interruption while COMMIT processes unfinished deferred transaction work** and verifies rollback through an independent connection. It does not certify all uncertain-COMMIT outcomes, especially **COMMIT succeeded but its acknowledgment was lost**. It does not introduce a durable production attempt API or authorize retry, provider dispatch, operational P9 identity or workers. Marker absence must never be treated as general proof of rollback in an arbitrary unknown-commit execution; the deterministic experiment relies on the observed COMMIT-phase pause and backend termination.

Further work: reproducible post-commit lost-ACK transport cut, immutable externally reconciled attempt lineage, multiple contenders, timeout and conflicting evidence scenarios, independent P9 trust governance and operational transport certification. No changes to `main`, Production databases, provider state, scheduling, or deployments.
