# UGP-11.C4 — Disposable Atomic Commit-Attempt Evidence

Baseline: `initiative-universal-growth-platform` at `712cd48c064f34b8bd2837a79a311f5d129f4621`; post-merge CI #38142928976 succeeded.

This increment adds `ugp11_transport_fixture.commit_attempts` in a disposable-only SQL file. It is not a Production migration. A transaction must update the fenced job and insert the matching immutable attempt marker atomically. A separate PostgreSQL client independently observes that a committed mutation and marker persist together, while a deliberately rolled-back transaction leaves both unchanged. The fixture asserts append-only journal protection, exact attempt identity, payload fingerprint and fence transition. Cleanup drops this *disposable* table and fixture function before clearing fixture rows.

**Important limitation:** This test deliberately injects a failure *before COMMIT*, not a network disconnection at COMMIT. The marker cannot, without additional trusted authority and isolation of concurrent transitions, establish a definitive outcome for an arbitrary lost COMMIT acknowledgement. Marker absence is not unconditional rollback proof. The pure fail-closed uncertain-COMMIT policy remains separate and non-operational.

Next increment: genuine PostgreSQL connection-loss experiment (before, at and after COMMIT), with observed backend identity and bounded server-side kill/disconnect; independently reconcile exact durable marker and fence state. No timing claim can be made without verifiable fault injection. Unknown outcomes must fail closed to manual intervention with no forward retry. Also outstanding: independent reviewer/P9 authority, worker/provider integration safety and production authorization.

Safety: only explicit loopback `/seo_engine_test` and `UGP_11_EPHEMERAL_DATABASE_URL`; no Production DDL/DML, runtime migration, provider, scheduler, main integration, or operational issuance.
