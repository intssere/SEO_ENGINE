# UGP-11.C4 — In-Flight Independent Observer Fence Race

Certified base `4023746f0aa302a680f27b645dd5e630fb923985`; post-merge CI #38386295480 completed successfully.

An isolated disposable PostgreSQL experiment observes a scoped fenced job with `SELECT ... FOR SHARE` in a `REPEATABLE READ` transaction, then attempts a simultaneous competing update via another connection using a bounded lock timeout. The attempted mutation must be blocked until the observing transaction completes. Exact immutable marker and fenced row reconciliation within that read is non-executable historical evidence. Once the observer releases its lock, a writer can advance fence and owner; the prior expected state must then fail closed when compared with a newer observation.

**Certification boundaries:** This verifies a single-job row-lock interleaving on a disposable PostgreSQL fixture only, not comprehensive lock ordering, race-free production authorization, stale replicas, general serializable retry behavior, multi-observer concurrency, or a production mutation gate. It grants no retry or provider authority.

Never modify main, Production databases, credentials, deployments, providers or P9 authority. Exact-head push and PR CI, separate merge authorization and successful post-merge UGP CI remain required.
