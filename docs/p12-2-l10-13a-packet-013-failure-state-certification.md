# P12.2-L10.13A — packet 013 durable failure-state certification

Packet 013 is permanently consumed. Its exact Railway deployment `87389cf3-5aae-4c29-ab10-2023aa7f5aad` emitted the terminal operator failure code `p12_2_persistence_completed_run_not_certified`.

The canonical execution path persists each advanced checkpoint before building full-site certification. Therefore packet 013 can durably finish URL work and persist a completed checkpoint, then fail while saving the completed-run snapshot if certification is blocked.

L10.13A adds a packet-specific SELECT-only certification path to prove that durable state before any recovery design is authorized.

## Exact binding

The certification is bound to:

- packet fingerprint `4d3b401a688b4928f42cc31fdde4e57bbc9b390745157fa6cc867b21795559ea`;
- phase `full_resume`;
- run ID `p12-2-diamond-shelf-full-interrupt-010`;
- observed-at `2026-10-05T15:04:49.000Z`;
- Railway deployment `87389cf3-5aae-4c29-ab10-2023aa7f5aad`;
- operator failure code `p12_2_persistence_completed_run_not_certified`;
- source checkpoint revision `141`;
- source checkpoint fingerprint `3ec71dfe067053ec1a8e3d72c93fb998d9f5565ee338741346ca79521759e84b`;
- execution-plan fingerprint `0818612ac8f35d5109cb4901442a0546630b9ca31a7ae6f24f77f8271db650aa`;
- execution inventory fingerprint `275af2602679a5f1b3f0d58573d578e3d82d988287cb57933d69586543554545`;
- the exact Diamond Shelf site/origin and Railway project/environment/Postgres IDs.

## Eight-query read-only contract

The certification runs exactly eight single-statement SELECT queries:

1. database identity;
2. exact packet-013 identity;
3. durable L2 invocation state;
4. final checkpoint state and counters;
5. completed-checkpoint accounting guard;
6. completed-run absence guard;
7. claimed/consumed invocation guard;
8. combined durable failure-state guard.

The completed-checkpoint guard requires a completed checkpoint, zero pending URLs, finalized URLs equal total URLs, all batches completed, exact plan/inventory lineage, and at least one terminal failure. It does not assume the exact final checkpoint revision or exact terminal-failure count; those values are evidence returned by the certification.

The completed-run guard requires no completed-run snapshot for this run/plan. The invocation guard requires the packet-013 L2 row to remain `claimed` with no completion receipt, which is the expected durable state when the executor throws after claim but before the L2 caller can complete its receipt.

## Safety boundary

The runtime uses a PostgreSQL read-only session with a 15-second statement timeout, one attempt, zero retries, and no fallback transport. Credentials are excluded from command arguments and emitted receipts.

This milestone performs no crawl, resume, retry, migration, schema/data mutation, provider/public-site write, scheduler/worker activity, or publication.

Certification-image release and Production SELECT-only execution remain separate explicit authorization boundaries after merge.
