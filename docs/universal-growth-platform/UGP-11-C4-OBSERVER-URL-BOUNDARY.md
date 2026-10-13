# UGP-11.C4 — Disposable observer connection-string boundary

Certified baseline `827e5ec357d6f1c83343052ead843ebef3470b3e`, with successful post-merge CI #38412032685.

The disposable observer connection URL already requires PostgreSQL, localhost or 127.0.0.1, exact port 5432, and exact `/seo_engine_test` database. This increment also rejects nonempty URL query parameters and fragments before creating any connection. Unrecognized parameters must not be used to alter connection transport or behavior despite a seemingly compliant hostname.

The existing disposable adapter test adds explicit fail-closed assertions for `?host=example.invalid`, `?sslmode=disable`, and a fragment. Rejected inputs return `unavailable` evidence and reconcile to `manual_intervention_required`. This is a conservative parser boundary, not a security proof against every alternate DSN parser representation or a production credential/role audit.

No production DB connection, provider write, main merge, deployment, retries, dispatch, P9 or scheduler authority. Require exact-head push and PR CI, separate explicit merge authorization and successful post-merge UGP CI.
