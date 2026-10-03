# P12.2-L6.2 — Deterministic incremental executable-material binding

## Purpose

L6.2 resolves the incremental-material blocker without enabling a live crawl entrypoint.

The binding rebuilds an incremental recrawl plan from explicit certified before/after full-crawl lineage and requires the rebuilt material to match the fingerprints frozen in the L2 incremental packet.

## Binding invariants

The resolver fails closed unless:

- the packet phase is exactly `incremental`;
- the packet carries an incremental fingerprint binding;
- both sources are exact Diamond Shelf first-party lineage;
- both sources are completed and whole-site certified;
- each certification fingerprint matches its supplied inventory, execution plan, and checkpoint;
- before/after run IDs differ and `before.observedAt < after.observedAt`;
- the packet full-crawl limits match the after execution-plan lineage;
- the selected incremental policy exactly matches the packet incremental limits;
- the rebuilt incremental-plan fingerprint equals the packet incremental-plan fingerprint;
- the after execution-plan fingerprint equals the packet execution-plan fingerprint.

Trusted candidates are never inferred. When explicitly supplied, they participate in the rebuilt plan and are therefore indirectly frozen by the packet's incremental-plan fingerprint.

## Remaining blockers

After L6.2, the readiness contract still blocks the first live crawl on:

1. a real live executable entrypoint;
2. proof that the certified Production image contains that entrypoint.

No live CLI, Production migration, image release, Railway deployment, crawl, provider/public-site execution, scheduler, or worker activation is authorized by this milestone.
