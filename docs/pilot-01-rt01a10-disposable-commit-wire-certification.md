# PILOT-01 RT01-A10 — Disposable PostgreSQL COMMIT transport-fault certification

## Authorized scope
Owner-authorized **isolated disposable PostgreSQL transport-level COMMIT failure certification only**. This branch does not access staging/Production, modify existing database migrations, deploy, merge, call providers, execute operational workers or write to a public site. GitHub is engineering source of truth; Railway is not connected, Replit remains unchanged.

## Test mechanism
The local, test-only `DisposableCommitWireFault` TCP proxy forwards PostgreSQL protocol traffic between an injected `postgres.js` client and a fresh localhost PostgreSQL 17 service. It requires both `PILOT01_DISPOSABLE_PG=I_ACKNOWLEDGE_DISPOSABLE_ONLY` and `PILOT01_DISPOSABLE_DATABASE_URL`; only loopback `postgres` users and `pilot01_disposable_*` names pass the guard. Each test creates and removes an independent random `pilot01_test_<uuidhex>` schema, synthetic grant, job and immutable admission receipt fixtures. The proxy listens only on a random loopback port and is not exported to the operational API.

Two deterministic interception points:
1. **Before COMMIT is forwarded:** the proxy observes the terminating-NUL `COMMIT` simple-protocol query and destroys the client/server sockets without sending it. PostgreSQL must roll back consumed grant, pending job and admission receipt. Read-only same-key reconciliation stays `unresolved`; no speculative retry.
2. **After PostgreSQL responds to COMMIT, before its acknowledgement reaches the client:** the proxy forwards COMMIT but buffers its response; when the backend emits PostgreSQL ReadyForQuery('I') it closes both sockets without forwarding the response. The database must show exactly one consumed grant, job and receipt; a read-only primary lookup confirms the exact scope. A separately initiated same-key replay returns `already_committed` and the identical receipt without additional jobs.

Tests assert the application receives `unavailable` on both interrupted connections and never infers transaction success from the transport exception.

## Evidence limits
The injected proxy recognizes PostgreSQL *unencrypted simple-query protocol* COMMIT and its idle ReadyForQuery response. This covers two controlled wire points in one client implementation and disposable PostgreSQL version; it is not comprehensive TLS, extended-protocol, proxy outage, timeout, packet fragmentation, failover or Production-network certification. `confirmed_for_rehearsal` remains test-only; no runtime recovery or automatic retry is authorized. Real auth session enforcement, membership/issuer custody, canonical UGP/CVI migration provenance, worker fencing and outbox behavior remain unverified.

## Merge gates
Require Standard CI SUCCESS, this disposable PostgreSQL CI SUCCESS, Tahseen's formal APPROVED at exact HEAD, and separate owner exact-HEAD merge authorization. Keep `PUBLIC_SITE_WRITES_ENABLED=false` and `AI_PROPOSAL_GENERATION_ENABLED=false`. No deployment or integration is included.
