# UGP-11.C4 — Disposable Control-Transition Negative Race Test

Baseline integration HEAD: `c454f4428be6799bc6c0e0c160c27f0f7d58869e`. Linked to issue #1061. C2 independent trust ownership issue #1054 remains open.

## Increment

Adds `ugp-11-c4-control-transition-race.ephemeral.test.ts` to the **existing** isolated PostgreSQL CI test lane, after disposable D1 and D5 fixture tables are installed.

For each fixture state `paused`, `draining`, and `killed`, an explicit SQL transaction selects the corresponding fixture control with `FOR UPDATE`, updates its monotonic revision from 1 to 2, and runs five competing denied-claim attempts. The test verifies:

- Every claim returns `claimed=false`, `dispatchAllowed=false`, reason `no_certified_p9_authority`.
- The committed fixture control stays in its target nonrunning mode with revision 2 and `source='fixture_only'`.
- The queued job preserves `fence=0`, `attempts=0`, null worker and null receipt.
- No external operations or job-processing loops run. The test only mutates its own disposable CI fixture records and cleans them up.

## Boundary and limitations

This is a **negative authorization/control-transition concurrency test**. Since the D5 fixture schema enforces `source='fixture_only'`, no positive authority is possible. It does not prove production transaction-level claim-versus-kill ordering in the presence of a certified issuer, worker leasing, recovery after failed commits, real dispatch, or pg-boss behavior. In particular, it must never be cited as proof of operational positive claim safety.

Future C4 certification should design a separately approved test-only positive-authority simulator in a disposable namespace, without granting actual P9 runtime capabilities, and test deterministic lock ordering, kill wins, stale epochs, recovery and ambiguous commit. Independent C2 trust is required before operational claims can be considered.

No production DDL or SQL, dependency adoption, secrets, worker/scheduler activation, provider sends, deployment, or Shopify mutations.
