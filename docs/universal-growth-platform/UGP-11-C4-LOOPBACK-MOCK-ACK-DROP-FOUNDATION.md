# UGP-11.C4 — Local Loopback COMMIT ACK-Drop Proxy (Mock-Upstream Increment)

Baseline: UGP `64a98f78a035cdd2f22b937f7dfc8ea6f04f6f96`, post-merge CI `38230354176` success.

Adds a single-client local-only TCP proxy, wrapping the prior bounded PostgreSQL v3 frame parser. In its synthetic mock-upstream test, the proxy forwards one simple-query COMMIT, observes CommandComplete(COMMIT) and idle ReadyForQuery from the mock server, withholds both from the downstream client, destroys the channel and reports the intercepted window. It also rejects unsupported startup framing. CI runs isolated socket tests without any database credentials or production access.

## Critical certification boundary

**This does not certify real PostgreSQL COMMIT or actual durable-state reconciliation.** The upstream in this increment is a local mock server, not PostgreSQL. No real transaction exists and no immutable marker has been observed. The returned event is wire-response suppression, not proof of a durable server commit. Client-side PostgreSQL library behavior under abrupt socket closure is not yet tested.

## Next engineering checks

- Connect writer through the loopback proxy to the explicitly allowlisted disposable PostgreSQL test database; run one fenced job transition and immutable `commit_attempts` marker in one real transaction.
- Pin and verify actual PostgreSQL handshake, authentication framing and writer client's simple-query COMMIT behavior; fail closed on extended query, TLS/GSS, pipelining or unknown protocol.
- Independently inspect exact marker identity, payload fingerprint, owner, fence, attempt count on a separate real PostgreSQL connection; require exactly one transition.
- Verify no COMMIT success acknowledgment was forwarded to the writer, writer sees disconnection, and no automatic retry or duplicate forward mutation occurs.
- Prove negative cases (missing marker, conflicting fingerprint, stalled/unknown server response, inaccessible observer) remain manual intervention.

No production DDL, credentials, provider writes, job/worker automation, scheduling, P9 authority, deployment or `main` integration. Design issue #1061, P9 governance issue #1054.
