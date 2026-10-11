# UGP-11.C4 — Real Network-Level Post-COMMIT ACK Loss: Certification Design Gate

Baseline: `initiative-universal-growth-platform` at `a6752e9cde8fc26c344804442156be960788e21f`; post-merge CI run `38148093085` passed. Scope: isolated engineering for #1061, with #1054 independent P9 authority denied. This document is **a design and test protocol, not a claim of certification**.

## Why the existing tests are insufficient

- PR #1099 terminates the PostgreSQL backend while a deferred trigger blocks COMMIT; its observable result is rollback.
- PR #1102 lets PostgreSQL successfully COMMIT, then throws a synthetic error *after the client library already received success*.
- Neither causes a real PostgreSQL protocol or TCP acknowledgment to be lost between server commit and client acknowledgment, therefore neither establishes the true uncertain-outcome window.

## Required fault apparatus

Build a **local-only PostgreSQL protocol-aware TCP proxy** between the test writer and disposable `/seo_engine_test`. Do not attempt raw packet pattern matching on encrypted/compressed traffic or infer completion from a fixed delay. Use a dedicated loopback proxy port, distinct writer and independent observer connections, no `DATABASE_URL` fallback, explicit per-test backend/session and attempt identifiers, and a bounded 10–20 second watchdog.

The proxy must parse PostgreSQL v3 frames with bounded lengths and handle startup negotiation deliberately. Restrict the experiment to locally controlled plain-text protocol or fail closed when TLS/GSS negotiation, unexpected framing, pipeline mode, unknown message types or multiple in-flight COMMIT requests make unambiguous classification impossible. Do not use a general deployment-side reverse proxy or intercept operational traffic.

### Fault modes and acceptance

| Mode | Server-side proof | Proxy fault | Independent disposition |
|---|---|---|---|
| Control (no fault) | COMMIT completed; marker and fence durable | Forward all server responses | Matched committed evidence, no retry authority |
| Before COMMIT delivered | No COMMIT reaches server | Close writer channel before forwarding COMMIT | Baseline and absent marker; not a generic permission to retry |
| During COMMIT | Exact backend seen executing COMMIT/deferred work | Terminate writer/backend within observed window | Rollback evidence; no automatic retry |
| **After COMMIT, before client acknowledgment** | Proxy **observes server-side COMMIT completion** (CommandComplete + ReadyForQuery with idle status) for the exact request | Drop corresponding successful server responses, close writer-facing socket | Matched immutable attempt marker and fence on a fresh observer; writer must not see success |
| Ambiguous/unprovable | Frame alignment or completion not certified | Fail closed; never label as after-COMMIT | Manual intervention required, no retry or dispatch |

The proxy receiving a backend success frame is an in-test observation; its provenance must be tied to one exact COMMIT request on one controlled connection. Use a protocol version/pinning check and confirm `postgres` client behavior under the dropped socket. PostgreSQL `ReadyForQuery` idle state is required; do not infer completion from CommandComplete alone. For the split-window experiment, the proxy may see the server commit response but MUST NOT forward that response to the writer client. Instrument byte counts or frame-level test assertions verifying that the writer did not receive the completion frames. Test both with and without authentication/SSL-negotiation variations only when explicitly supported, and reject unsupported modes.

## Atomic evidence and race requirements

Commit one immutable `commit_attempts` row and one fenced fixture job transition in the same transaction. Bind immutable attempt ID, tenant, site, job identity, payload fingerprint and before/after fences. Observe using a fresh independent PostgreSQL connection and an exact identity query. Verify a single attempt marker, expected owner/fence/attempt count, and absence of a second transition. Repeat the exact same attempt through a deliberate invalid replay path and verify the DB constraint blocks it; **never retry the forward mutation itself**. Verify that conflicting fingerprints, missing markers, stale fence or unavailable observer remain `manual_intervention_required`.

## CI and safety gates

Install the disposable schema by explicit SQL only after URL allowlist validation. No production DDL or migrations. Bind the proxy listener only to 127.0.0.1, close all sockets on completion/failure, assert no secret-bearing logs, and terminate test-owned processes only. Separate simulated write/transport outcomes from actual network fault evidence in test names and reports. Require push CI, PR CI, post-merge UGP CI, exact-head human merge authorization, and an independent review of all failure windows.

## Non-goals

No operational P9 issuance, provider dispatch, automated retries, production worker connection, scheduling, deployment, Diamond Shelf writes, or UGP-to-main integration. Passing a future isolated test establishes only the declared fault window, not the independent authority/governance gates.
