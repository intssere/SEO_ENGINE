# UGP-11.C4 — Strict Fenced Evidence Reconciliation

Baseline: `initiative-universal-growth-platform` at `2f036b225a4c7b53ec1978aa1958a199a522c5b3`, post-merge CI `38236105502` success.

This increment adds **pure, non-operational** reconciliation for one independently obtained snapshot. Only an exact immutable attempt marker and exact fenced job owner/fence/attempt count classify a committed outcome. A duplicate marker, missing marker, stale fence, wrong owner, unexpected attempt count, different tenant/site/job/payload/attempt, invalid expected fence or missing/unavailable/partial/conflicting evidence returns `manual_intervention_required`. It never grants automatic retry, provider dispatch or production authority.

The caller must independently collect the snapshot from a fresh PostgreSQL observer and establish atomic consistency; this pure function alone does not acquire locks, guarantee snapshot provenance, perform SQL or prove source authority. It intentionally never infers rollback from absence. Further tests must address actual concurrent independent observer races, transaction isolation/snapshot timing and server-network uncertainty.

No Production DB, provider invocation, scheduler, worker activation, P9 governance override, deployment or `main` integration. Workstreams #1061 and #1054 remain separately gated.
