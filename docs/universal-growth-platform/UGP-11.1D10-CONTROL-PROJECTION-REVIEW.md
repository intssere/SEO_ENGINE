# UGP-11.1D10 — Control Issuance Governance and Projection Review

**Status: only a fixture-only projection, NOT authenticated issuance.** Source baseline: integration branch at `5202ee6da66cfb45cf45cb826f37973a0c64b5b0`.

The D9 journal accepts offline fixture-HMAC decisions with contiguous per-site revision checks and append-only storage. This D10 increment introduces an opt-in disposable PostgreSQL read-only view selecting each tenant/site's latest journaled decision. It always projects `authority_verified=false`, `claim_allowed=false` and `dispatch_allowed=false`. The projection never updates the D5 control table, never creates certified P9 authority and cannot turn a journal signature into execution permission.

A valid HMAC held by any test-key possessor is **not** proof of an authenticated P9 operator, credential governance, separate authorization or key lifecycle. The next substantive required increments must implement an independently governed identity/trust mechanism, durable immutable issuance evidence, revocation and audit controls, authenticated issuance checks, projection authorization logic, and atomic claim control verification with failure/recovery tests.

CI applies the view only after D9 fixture journal setup to `seo_engine_test` on localhost, testing a current running fixture, exact replay, paused latest revision, no control-table promotion, and persistent denial. The SQL lives outside runtime migrations.

No production DDL, deployment, worker, scheduler, pg-boss installation, provider call or external send. Authorization state is **NOT_GRANTED**.
