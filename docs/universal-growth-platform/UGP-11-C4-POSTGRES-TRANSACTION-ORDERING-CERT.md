# UGP-11.C4 — Disposable PostgreSQL Serialized Transaction Ordering

Baseline: `initiative-universal-growth-platform` at `d309c372b742eabaf52198ea7c8dd339a67cb4cf`. UGP transport issue #1061; independent trust issue #1054 remains open.

This increment adds a dedicated CI-driven ephemeral PostgreSQL test to the existing, opt-in `seo_engine_test` fixture database. The URL is restricted to a loopback PostgreSQL connection with exact path `/seo_engine_test`. It uses the existing `ugp11_transport_fixture` SQL objects, with `source='fixture_only'` unchanged. Test records are cleaned up.

For each target mode (paused, draining, killed), two real database transaction serializations are tested:
1. **Close then synthetic claim:** a control-row `FOR UPDATE` transaction changes the control from running/revision 1 to nonrunning/revision 2. A subsequent synthetic SQL claim sees closed control, leaves job queued, zero fence and zero attempts.
2. **Synthetic claim then close:** the transaction locks the running control row, increments the fixture fence and attempts and stamps an artificial lease. The next transaction closes the control. Settlement that requires `source='certified_p9'` and matching running revision affects zero records.

These are actual PostgreSQL transactions and row locks, but execution is deliberately **serial**, not simultaneous contention. The synthetic fixture claim is an expressly non-operational SQL state change, not the application P9 issuer and never a dispatch permit.

**Unverified / not authorized:** PostgreSQL concurrent row-lock ordering under blocked transactions, deadlocks and timeouts, expired lease takeover, stale-owner fencing under active concurrent attempts, rollback/ambiguous commit recovery, production transport, external credentials and real provider side effects. The fixture's CHECK constraint continues to prohibit certified authority.

Next test increments should use two independent connections with deterministic synchronization and bounded timeouts to test overlapping transactions, followed by lease transfer/unknown outcome. No production DDL or migrations, worker activation, scheduling, provider sends, deployment or Shopify writes.
