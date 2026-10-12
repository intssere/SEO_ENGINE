# UGP-11.C4 — Independent PostgreSQL Observer Snapshot Concurrency

Certified starting HEAD: `032189a21cfcc104a9c5bbbd35f02a43b599c459`. Post-merge CI #38237845873 succeeded.

Adds a disposable-only PostgreSQL test for an immutable attempt marker and fenced job update atomically committed, observed via a separate client transaction at REPEATABLE READ. The observer selects the job FOR SHARE to prevent concurrent fence mutation during its marker read. A distinct contender attempts to advance the fence with a short lock timeout and must fail while that row lock is held. The exact marker and job state are passed into the existing pure fail-closed reconciler. After observer transaction completion, a contender can advance the job; observing the later mismatched fence must return manual_intervention_required without any retry or provider authority.

## Scope and limits

This is a **locked, single-job disposable fixture concurrency experiment**, not an operational observer implementation or general guarantee that unconstrained snapshots reflect the latest state. It does not prove correctness for multi-job lock ordering, stale replica reads, unavailable observer connections, serializable abort/retry discipline, uncommitted marker reads, altered marker identity, or concurrent competing observers. Lock timeout is an expected negative-case result and cannot be interpreted as permission to retry a transport write.

No production schema or database operation, deployment, external provider, autonomous scheduler, P9 operational grant, or main-branch integration. Use exact-head push and pull-request CI, separately authorized merge and successful post-merge CI.

Related issues: #1061 transport and #1054 P9 governance.
