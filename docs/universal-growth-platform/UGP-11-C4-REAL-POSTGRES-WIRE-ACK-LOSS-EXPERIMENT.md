# UGP-11.C4 — Real Disposable PostgreSQL Lost-COMMIT-ACK Experiment

Baseline: `initiative-universal-growth-platform` at `c409ba27b935c7ba30358c088dd6fc730d3989fb` with successful post-merge CI `38233955442`.

## Experiment

A loopback-only proxy intercepts plaintext PostgreSQL v3 traffic between one `psql` writer session and the explicit `/seo_engine_test` PostgreSQL server at `127.0.0.1:5432`. The writer issues separate simple-query commands for BEGIN, a fenced fixture job update, a matching immutable attempt marker INSERT, and COMMIT. Server response frames for the exact COMMIT are withheld: proxy observes CommandComplete(COMMIT) then idle ReadyForQuery, destroys the client channel, and the writer cannot receive success.

A separate `postgres` connection subsequently checks the exact committed marker fingerprint, prior and committed fence, owner and attempt count, database uniqueness protection, and absence of a second job transition. No forward replay is attempted. CI installs the disposable marker schema explicitly and runs the single-shot experiment.

The prior mock-upstream proxy has been extended only to permit PostgreSQL password-authentication frames before ready, and simple SQL within an open transaction. TLS/GSS requests and extended-query/pipeline protocols remain prohibited; `psql` is invoked with SSL and GSS encryption disabled against *loopback only*. Credential bytes are not logged. Environment URL must explicitly match the allowlisted ephemeral database.

## What success would establish

Successful exact-head CI would demonstrate a **real PostgreSQL COMMIT with its protocol success response withheld from a disposable writer connection**, then independent fresh-connection durable reconciliation. It would not establish comprehensive race-window coverage, all PostgreSQL authentication modes, general transport recovery, production readiness, or automatic retry/dispatch authority. On missing, conflicting or unavailable evidence, the operational decision must remain manual intervention, not inferred replay permission.

## Explicit exclusions

No Production DDL, Production SQL, long-lived service, provider calls, Diamond Shelf operations, P9 authority, scheduler, autonomous retry, deployment, or integration into `main`. The one-shot fault proxy is test-only and bound to localhost. This experiment must pass independent push and PR CI and exact-head human-authorized merge, then post-merge UGP CI, before being considered certified.

Related: #1061 transport workstream; #1054 P9 governance.
