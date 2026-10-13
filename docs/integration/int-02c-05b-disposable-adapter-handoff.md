# INT-02C-05B — Isolated metadata adapter handoff

**Status:** dependency-injected offline/disposable fixture adapter only; no PostgreSQL driver, runtime CLI, secrets, provider calls or production connection.

The adapter in `int-02c-05b-disposable-execution-adapter.mjs` consumes the pinned, fixed query contract from INT-02C-05A. Its injected executor is accepted only for a caller-declared disposable fixture identity (`int02c_disposable`, `int02c_metadata_reader`). The identity assertion is **not** cryptographic or PostgreSQL-origin attestation; this interface cannot prevent a malicious caller from supplying an executor pointing elsewhere, and must never be exposed to Production credentials. Therefore it is not a deployable safety boundary or approved Production adapter.

It rejects any other fixture identity, modified query set, wrong session identity, oversized results, missing executor, or thrown execution errors. Successful fixture results retain only query IDs and counts; raw rows are discarded. Tests supply an in-memory function only, with no network/database queries. Its `productionAdmission()` always denies.

A future operational collector requires independently verified provider/service/volume provenance, a true least-privilege PostgreSQL role, transport/endpoint restrictions, read-only transaction and timeouts, nonsecret structural binding evidence, result custody and independent witnessing, plus separately approved exact-target execution. None is implemented or authorized here.

**Disposition:** `DISPOSABLE_ADAPTER_TESTED_ONLY / NO_PRODUCTION_EXECUTION_CAPABILITY / HISTORICAL_SOURCE_PENDING`.
