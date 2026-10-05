# P12.2-L10.10 — persisted exact resume checkpoint resolution

Packet 010 proved a durable, pending full-site checkpoint at revision 3. The checkpoint payload contains URL-level execution state, so moving that full payload through chat, Railway variables, or operator logs would unnecessarily expand the evidence surface.

L10.10 keeps the packet-level resume contract small and exact while resolving the checkpoint payload from the existing first-party persistence store at execution time.

## Binding

A `full_resume` packet continues to bind only:

- `checkpointRevision`;
- `checkpointFingerprint`;
- `executionPlanFingerprint`.

The live operator may still accept an embedded checkpoint for backward compatibility. When no checkpoint payload is embedded, the operator loads it from `first_party_crawl_checkpoints` using the packet run ID and execution-plan fingerprint through `FirstPartyCrawlPersistence.loadCheckpoint()`.

The loaded checkpoint must then pass:

1. stored checkpoint fingerprint integrity;
2. exact packet checkpoint revision equality;
3. exact packet checkpoint fingerprint equality;
4. exact packet execution-plan fingerprint equality.

A missing checkpoint or any mismatch fails closed before the full-crawl adapter is invoked.

## Security and execution boundary

The resolver does not create a new database query path. It reuses the existing bounded persistence API, which already validates site/origin identity, stored payload fingerprint integrity, and forbidden-content rules.

The durable L2 one-shot claim still precedes executor work. Therefore a live resume packet remains one-shot: once its durable claim is accepted, resolver failure, sitemap drift, execution-plan drift, transport failure, or any later failure consumes that packet and does not authorize a retry.

After exact checkpoint resolution, the existing crawl bridge independently rebuilds current sitemap inventory and execution plan. If current site state no longer matches the checkpoint lineage, `assertFullSiteCrawlCheckpointIntegrity` rejects the resume before page execution proceeds.

## Data minimization

L10.10 means a live resume envelope no longer needs to transport or log the checkpoint payload or its URL arrays. Only the compact packet binding is required outside persistence.

No migration, Production query, Railway configuration, image release, crawl, resume, scheduler, worker, provider write, public-site write, or publication is performed by this repository milestone.
