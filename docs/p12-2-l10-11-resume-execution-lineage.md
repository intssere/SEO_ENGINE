# P12.2-L10.11 — execution-lineage-compatible full-resume planning

Packet 011 was a single authorized `full_resume` attempt bound to the certified packet-010 checkpoint. It was permanently consumed and failed closed with `crawl_checkpoint_lineage_mismatch`. It must not be replayed.

## Root cause

The full-site execution plan is deterministic over the sorted canonical URL set, execution policy, and the sitemap inventory fingerprint. Batch IDs are also salted with the inventory fingerprint.

The sitemap inventory fingerprint intentionally covers the complete bounded inventory object, including metadata such as sitemap `lastmod`. On a live Shopify site, that metadata can change between an intentional interruption and a later resume even when the canonical URL membership used for execution is unchanged.

This means a metadata-only inventory change can produce a new inventory fingerprint, which in turn produces new batch IDs and a new execution-plan fingerprint. The existing checkpoint integrity guard then correctly rejects the rebuilt plan as different lineage.

## L10.11 invariant

For `full_resume` only, the bridge still acquires and validates the current sitemap inventory and still derives execution work from the current canonical URL set and current execution policy. However, when an already-certified checkpoint is supplied, the resume plan uses that checkpoint's certified inventory fingerprint as the execution-lineage salt.

The reconstructed plan must then pass the existing `assertFullSiteCrawlCheckpointIntegrity()` guard unchanged.

This has two consequences:

- if only non-execution inventory metadata changed while the canonical URL set and execution policy remain identical, the original batch IDs and execution-plan fingerprint are reconstructed exactly and the checkpoint can resume;
- if any canonical URL membership changes, the reconstructed batches or plan fingerprint differ and checkpoint integrity still rejects the resume before page execution.

The design does not compare URL counts alone. URL identity and batch membership remain cryptographically bound into every batch and the overall plan.

Completion certification also preserves both facts rather than conflating them:

- `inventoryFingerprint` records the current observed sitemap inventory, including current metadata;
- `executionInventoryFingerprint` records the certified inventory lineage salt used by the resumed execution plan and checkpoint.

Certification reconstructs the execution plan from the current validated canonical URL set using the execution-lineage fingerprint and requires exact semantic equality with the supplied execution plan. Therefore metadata-only drift is observable in the certification while URL-set drift remains a hard failure.

## Safety boundary

L10.11 does not disable or weaken checkpoint integrity. It does not bypass current sitemap acquisition, sitemap completeness checks, same-origin URL validation, canonicalization, excluded-path controls, batching, concurrency, robots enforcement, request-rate limits, redirect revalidation, retry bounds, or persistence safety.

The new planner rejects a non-hex certified lineage fingerprint and is used only when a resume checkpoint is already supplied.

Packet 011 remains consumed. A later live proof requires a new packet fingerprint, a separately released canonical runtime image containing L10.11, and a new explicit one-shot authorization. No live crawl, resume, Railway mutation, Production query, migration, provider write, public-site write, scheduler, worker, or publication action is performed by this repository milestone.
