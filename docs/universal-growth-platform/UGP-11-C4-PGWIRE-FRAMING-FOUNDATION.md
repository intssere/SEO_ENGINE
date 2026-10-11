# UGP-11.C4 — PostgreSQL v3 Framing Foundation (Non-Certifying)

Baseline: UGP `fecdd22a87209f7ba7b56e96c1eb536534ff871e`, post-merge CI `38149911293` successful.

This increment adds a bounded, fail-closed parser for ordinary typed PostgreSQL v3 protocol frames and isolated tests for byte fragmentation, coalescing, frame limits, malformed lengths, explicit simple-query COMMIT, CommandComplete(COMMIT) and idle ReadyForQuery. It rejects unsupported SSL and GSS startup requests rather than treating them as plaintext typed frames. It is a **foundation only**: there is no TCP listener, PostgreSQL session state machine, actual network interruption, end-to-end PostgreSQL test or lost-ACK certification in this increment.

Next increment must implement a dedicated loopback-only proxy with separate writer and observer, exact single-connection startup and authentication handling, strict one-in-flight COMMIT discipline, response withholding, timeout/cleanup, and independent durable marker reconciliation. Fail closed if the client uses an extended protocol or message sequence outside proven parser scope; never substitute synthetic caller exceptions for a lost network acknowledgment.

This parser never enables provider writes, retry authority, P9 operations, Production DB activity, deployment, or UGP-to-main integration. Related issues: #1061 and #1054.
