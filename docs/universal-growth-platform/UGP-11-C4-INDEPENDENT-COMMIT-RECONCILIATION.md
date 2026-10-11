# UGP-11.C4 — Independent Commit-Outcome Reconciliation (Disposable PostgreSQL)

Baseline: `initiative-universal-growth-platform` at `a445b5f0f5d621f64e58078caaff1f4e7af3eaba`; certified post-merge workflow `38134732393` succeeded. Transport gap tracked in #1061; independent P9 governance remains separately gated in #1054.

## Certification scope

The dedicated, allowlisted PostgreSQL `seo_engine_test` fixture uses a write connection and a **separate connection pool/session** for post-transaction observations. The fixture establishes one exact scoped job/idempotency key, attempts a fenced owner change, and then reads the durable state through the independent connection. It covers:

- Successful transaction: observed `worker_id=candidate`, fence `8`, attempts `2` — `committed`.
- Deliberate exception before COMMIT: observed `worker_id=old-owner`, fence `7`, attempts `1` — `rolled_back`.
- Missing or inconsistent evidence: `unresolved` (never infer commit or rollback from incomplete evidence).
- Job idempotency scope retains exactly one row per scenario.
- Cleanup and connection targets remain strictly within the disposable fixture database.

These labels describe only the bounded synthetic fixture's exact known initial state and one attempted transition. They do not certify arbitrary production state reconciliation, absence of concurrent actors, or permission to retry. In a real interrupted connection scenario, a baseline-looking row without durable attempt identity cannot establish that an unknown write never committed and was subsequently superseded. Thus even a fixture `rolled_back` classification is **not** general permission for an automatic retry.

## Explicit exclusions / next increment

This increment does **not** interrupt a PostgreSQL socket at COMMIT, determine whether an ACK was lost after a server commit, assert actual unknown commit outcomes, persist a dedicated attempt/outcome journal, or implement an operational recovery API. Genuine connection-drop timing, independent commit receipt/journal reconciliation, race-safe idempotent no-retry behavior and manual intervention under unresolved evidence remain outstanding. No provider requests, Production DDL/DML, worker dispatch, runtime activation, P9 issuer authority, `main` merge, deployment or public-site mutation.

CI runs the new test in the existing `UGP_11_EPHEMERAL_DATABASE_URL` lane after the disposable fixture schema is installed. The test is opt-in when executed outside CI. **Passing this test is not certification of genuine ambiguous COMMIT.**
