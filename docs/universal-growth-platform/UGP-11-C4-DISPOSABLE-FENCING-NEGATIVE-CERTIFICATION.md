# UGP-11.C4 — Disposable PostgreSQL stale-fence negative certification

**Baseline**: `initiative-universal-growth-platform` at `a6e492f1b9f0332fda2d518cfb4ad51c61b56460`. Linked issue #1061.

**Scope:** A fixture-only, explicitly localhost `seo_engine_test` PostgreSQL test, reusing the preexisting UGP-11 D1/D5 fixture tables and the D6 independently certified P9 claim deny gate. No new migration or schema and no provider dependency.

The test runs in the existing CI job after disposable D1 and D5 fixtures are applied. It verifies that:
- A running `fixture_only` control cannot produce an independently certified claim.
- Test setup manually constructs a claimed fixture row and simulates expiry and owner replacement from A (fence 7) to B (fence 8); **this is not an authorized job claim or a transport implementation**.
- Six parallel stale-A completion attempts return no rows; stale-A heartbeat returns no rows.
- A later running-only fixture control still cannot grant claims; killed control also denies.
- The fixture row stays owned by B at fence 8 without a completion receipt, and is cleaned up.

**This proves only the test SQL's compare-and-swap fencing predicate on disposable fixture records, not an operational implementation.** It does **not** certify reclaim authorization, claim-vs-kill transaction ordering, database outage recovery, stale external sends, pg-boss compatibility, managed trust, C2 completion, or durable operational P9 authority. The next increment must implement isolated control-authorized claim/reclaim and concurrently exercise true transactional races with approved identity signing and runtime scope, after separate approval. Until then, positive claim admission, dispatch and external effects remain forbidden.

No production DB connection, PostgreSQL DDL, worker, scheduler, package installation, live provider call or deployment occurs as part of this PR.
