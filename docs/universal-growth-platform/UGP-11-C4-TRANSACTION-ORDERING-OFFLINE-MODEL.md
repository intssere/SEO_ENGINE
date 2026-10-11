# UGP-11.C4 — Offline Transaction-Ordering Model

**Baseline:** initiative-universal-growth-platform at `5cecb83da3352fd6a2e79423abbb69f2e7e9105b`. Issue #1061; independent trust issue #1054 open.

A new *pure in-memory reference model* and node:test suite exercise kill-before-claim, claim-before-kill, pause/drain, simulated lease rollover, old-fence rejection and ambiguous-outcome quarantine. An eight-action three-deep interleaving check verifies every model trace stays free of side effects.

**IMPORTANT:** A positive `claim`/ `reclaim` in this model means a *synthetic reference state transition*, NOT a genuine P9-authorized claim. This source must never be wired to routes, workers, persisted controls or transport. There are no credentials, real claim API, scheduling, provider calls, PostgreSQL connections or DDL.

**Not certified:** a genuine concurrent PostgreSQL claim-vs-kill lock-order race, lease expiry based on transaction_timestamp, tx deadlock/retry, ambiguous commit recovery, receipt persistence, external side effects, production database schema, or independently issued signing authority. Passing tests must not be labeled complete C4 certification.

**Next step:** compare the model against an isolated PostgreSQL implementation test with explicitly test-only authority records in a disposable namespace, retaining the existing fixture_only claim gate and requiring a separately reviewed test design. In particular no production-capable positive authority is permissible until #1054 governance is resolved.
