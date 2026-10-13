# UGP-11.C4 — Post-Release Observer Freshness Boundary

Baseline `cd9b19a9a09019207e46b76ce8353f430c4a6dea`; certified post-merge CI #38283911604.

This disposable PostgreSQL fixture test obtains exact marker and fenced-job evidence through an independently completed REPEATABLE READ observer transaction. It then advances the job fence and changes the owner after the observation lock is released. A new independent observation must be incompatible with the original expected attempt and fail closed to manual intervention. The original historical evidence may still describe a completed transaction, but must not grant retry, provider dispatch or production authority.

**Limit:** This certifies only a bounded sequential post-release drift scenario. It does not create a race-free current-state authorization gate, prove freshness of retained snapshots, attest production PostgreSQL schemas, or validate arbitrary concurrent schedules. Any future mutation would require a separately certified transactional policy gate and explicit authorization; UGP-11.C4 itself provides none.

No main merge, production DB operation, provider mutation, credential or scheduler change, deploy, autonomous replay, or P9 authority. Require exact-head push/PR CI, explicit authorization before merge, and successful post-merge UGP CI.
