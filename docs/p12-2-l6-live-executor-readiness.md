# P12.2-L6 — Live executor readiness contract

## Purpose

P12.2-L5 placed the certified L2 application image in Production. That image contains the L2 one-shot operator artifact, but artifact containment is not equivalent to an executable live crawl path.

This contract prevents the first Diamond Shelf crawl until the repository can prove every runtime binding required by the L2 packet model.

## Verified post-L5 capabilities

The current codebase already contains:

- the packet-specific L2 one-shot authorization wrapper;
- the manual full-crawl execution primitive;
- persisted checkpoint loading needed by a future resume binding;
- full reconciliation primitives;
- first-party read-only live adapters and crawl persistence;
- Production database identity/schema readiness.

The public first-party crawl CLI remains inspection-only and rejects `--execute`.

## Remaining blockers

The readiness contract intentionally reports these blockers:

1. `full_interrupt_checkpoint_stop_binding_missing` — the full-site runtime bridge currently runs until completion and has no exact persisted stop-after-checkpoint revision boundary.
2. `incremental_material_binding_missing` — the L2 incremental packet carries lineage fingerprints, while the runtime requires the concrete incremental plan and current execution plan.
3. `durable_packet_consumption_receipt_missing` — the L2 wrapper accepts a process-provided prior receipt, but there is no durable packet-consumption record that can prevent replay across processes.
4. `live_executable_entrypoint_missing` — no executable CLI/entrypoint currently composes packet authorization, runtime dependencies, persistence, and the injected L2 executor.
5. `production_image_live_entrypoint_proof_missing` — because the executable entrypoint does not yet exist, the current Production image cannot be certified as containing it.

## Safety boundary

This milestone performs no crawl and grants no network, persistence, provider-write, public-site-write, scheduler, worker, deployment, or publication authority. It is a deterministic fail-closed readiness gate only.

The first live crawl remains prohibited until `readyForFirstLiveCrawl === true`.
