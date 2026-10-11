# UGP-11.C4 — Post-COMMIT Acknowledgement Suppression (Synthetic Boundary)

Baseline: `initiative-universal-growth-platform` at `501aa2c54ad95ddec51bec4ba015d6649d83f592`, with post-merge CI `38146461227` successful.

## Exact scope
An independent PostgreSQL transaction commits a fenced synthetic job transition (owner old-owner → candidate, fence 7 → 8, attempts 1 → 2) and an append-only immutable attempt marker in the same transaction. Once PostgreSQL has returned success to the test harness, the harness **synthetically suppresses delivery of the positive acknowledgment to a modeled caller**. A separate PostgreSQL connection verifies exact attempt identity, payload fingerprint, marker fence and job state. A duplicate attempt marker is rejected by database uniqueness, and no second forward job mutation is sent.

The disposable `/seo_engine_test` fixture is installed explicitly inside the isolated CI lane. This work grants no retry, job, worker, provider, P9 signer or production permission.

## Certification limits
This verifies **durable commit and subsequent synthetic caller ACK loss**, not genuine TCP socket interruption or a lost PostgreSQL protocol CommandComplete/ReadyForQuery message. The test harness itself knows the COMMIT succeeded; a real client would not know that. Consequently this increment must **not** be described as real post-COMMIT network failure certification.

Additional controlled fault injection remains necessary to sever the client connection after server commit but before receipt, with independent server-side evidence of the exact window. Without such evidence the result must remain uncertain and fail closed. The existing pure uncertain-COMMIT policy disallows automatic retry even if an outcome can be classified. Manual intervention is required for detached, conflicting or unavailable evidence.

No Production DDL/DML, provider invocation, runtime activation, scheduler, deployment or integration into `main`.
