# P12.2-L10.12 - packet 012 full-resume completion certification

Packet 012 is permanently consumed. Its single `full_resume` execution used the L10.11 immutable application image and Railway deployment `ab7d5f20-6db9-42c0-8ccd-745304ed7151` reached terminal SUCCESS. Railway runtime logs retained only the container lifecycle line, not the live-operator JSON receipt.

L10.12 adds a packet-specific SELECT-only certification path for the durable packet-012 receipt, the completed whole-site snapshot, the final checkpoint, and the L10.11 dual inventory/execution lineage. It does not replay, resume, retry, or otherwise execute the crawl.

## Exact packet binding

The certification is bound to:

- packet 012 fingerprint `a0df337a34e9b24d7120d6c3f71b59cfe39b3b69d61de33b59b4c6743fad67e2`;
- phase `full_resume`;
- run ID `p12-2-diamond-shelf-full-interrupt-010`;
- observed-at `2026-10-05T13:56:42.000Z`;
- source packet 010 fingerprint `a93b76b252ecb9b9ac063675fcc99b5c70ad5af9c40092b5c2d8574476d1f6d6`;
- source checkpoint revision `3`;
- source checkpoint fingerprint `8ad8c571cc79492dbbbb2617f894addc2b7ccfa522c870dab189771b5e335a98`;
- execution-plan fingerprint `0818612ac8f35d5109cb4901442a0546630b9ca31a7ae6f24f77f8271db650aa`;
- Diamond Shelf's exact site/origin;
- the exact Railway project/environment/Postgres service IDs.

The same run ID is intentional: L10.10 persisted checkpoint resolution is keyed by exact run ID and execution-plan fingerprint. Packet uniqueness comes from the phase, observation time, resume binding, and deterministic packet fingerprint.

## Certification contract

Ten single-statement SELECT queries certify:

1. database identity;
2. exact packet-012 identity;
3. packet-012 durable invocation receipt;
4. packet-010 intentional-interruption source receipt;
5. final checkpoint state;
6. completed whole-site snapshot state;
7. exact packet-010 source lineage to packet-012 resume lineage;
8. packet-012 receipt-to-completed-snapshot binding;
9. L10.11 current-inventory versus execution-inventory lineage consistency;
10. final durable completion integrity.

The completion guards require one completed packet-012 invocation, invocation attempt 1, no automatic whole-run retry, a receipt fingerprint that exactly matches the persisted completed snapshot, a completed final checkpoint on the certified execution plan, and whole-site certification with reason `certified_complete_accounting`.

The dual-lineage guard does not require current and execution inventory fingerprints to be equal. Instead it requires:

- the final checkpoint inventory fingerprint to equal the execution plan's inventory-lineage fingerprint;
- `certification.lineage.executionInventoryFingerprint` to equal that checkpoint/execution lineage;
- `certification.lineage.inventoryFingerprint` to equal the current observed sitemap inventory fingerprint;
- the execution-plan fingerprint to remain the exact packet-010 certified lineage.

This proves the L10.11 compatibility model without weakening URL-set or checkpoint integrity.

## Safety boundary

The certification runtime uses a read-only PostgreSQL session with a 15-second statement timeout, one attempt, zero retries, and no fallback transport. Connection credentials are excluded from command arguments and emitted receipts.

This repository milestone performs no crawl, resume, retry, migration, Railway mutation, schema/data mutation, provider/public-site write, scheduler/worker activity, or publication.

Certification-image release and Production SELECT-only execution remain separate explicit authorization boundaries after merge.
