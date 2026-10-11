# UGP-11.C4 — Overlapping PostgreSQL Lock Timeout (Negative Evidence)

Baseline: `initiative-universal-growth-platform` at `b3f6edb4c9b4c6e6a79cfe18553bfa80793f469e`, following certified PR #1076.

A new disposable-only CI test uses **two overlapping PostgreSQL transactions on separate pooled connections**. The holder takes `FOR UPDATE` on a fixture control, changes running/revision 1 to killed/revision 2 and stays open behind an explicit in-process barrier. A second independent transaction attempts the same lock and must receive PostgreSQL SQLSTATE `55P03` via a bounded `lock_timeout = '150ms'`. The holder is then released in `finally`, committed, and checked. The fixture job must remain queued with fence and attempts zero; a subsequent control-lock read observes killed and refuses synthetic claim.

Test is constrained to loopback `/seo_engine_test`, the existing `ugp11_transport_fixture` namespace and fixture_only controls. No new schema, runtime integration or P9 positive issuer exists. The test never sends, settles, dispatches or claims a job.

**Limits:** This certifies one contention order (kill lock held while a competing lock times out), not the converse, not an eventually unblocked competing claim, not lock-deadlock recovery, not lease rollover under contention, not ambiguous commit recovery, and not operational end-to-end transport. These require separate increments. Repeated CI success must not be misrepresented as production claim authority. Independent C2 trust gate #1054 remains open.

No production migration, credentials, deployment, real worker or external provider writes.
