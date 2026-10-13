# UGP-11.C4 — Bounded SQL statement time for disposable independent observer

Certified base `2e98540158b3ffaa0dc8869112e28463e305a061`; post-merge CI #38415363116 succeeded.

The disposable-only observer opens its local `REPEATABLE READ` transaction, establishes `READ ONLY`, then sets `SET LOCAL statement_timeout = '5000ms'` before reading the scoped fenced job and immutable marker. A statement exceeding the limit raises PostgreSQL cancellation and is returned as unavailable observer evidence, not a commit conclusion. Fail-closed reconciliation never grants retry, provider dispatch or production authority.

The isolated fixture regression opens a separate disposable read-only transaction, sets a shorter **test-only** statement bound (25ms), attempts a 200ms `pg_sleep` and asserts PostgreSQL code `57014`, unavailable classification, and manual intervention. This proves PostgreSQL cancellation semantics, not guaranteed worst-case network latency, application liveness, timeout tuning, or exhaustive error paths. The adapter's normal success path remains covered by existing disposable tests.

No main merge, Production DB connection or migration, deployment, provider writes, scheduler, P9 activation, or retries. Exact-head push and pull-request CI, separate merge authorization and post-merge UGP CI remain required.
