# P12.2-L10.18 — Packet 014 sitemap-provenance policy correction and bounded durable finalization repair

## Why L10.18 exists

Packet 014 completed the crawl accounting itself but failed during final durable accounting persistence.

Certified durable state before L10.18:

- packet fingerprint: `b853dcc4d1cbc383e5f9a1185085b6bc77ac42394a33db9c1380a6e511e7a560`
- run: `p12-2-diamond-shelf-post-0010-full-014`
- phase: `full_initial`
- execution plan fingerprint: `62022df7bea241b7f86a5286271686c9aa4d0f62bead39a626d1914845e5760b`
- inventory fingerprint: `8d650efa3831ae7d8e66c1a43259ff5b5070a543edd191d572a5aad6fe502e67`
- final checkpoint fingerprint: `f1aee026cc2227f9d72642e25b7ed4935fdfa94bcdc508e4eda7344a2d2b608f`
- final checkpoint revision: `306`
- total/finalized/pending: `3044 / 3044 / 0`
- completed/total batches: `305 / 305`
- fetched successful: `3043`
- terminal failures: `1`
- exact failed URL: `https://diamondshelf.us/blogs/news`
- terminal event fingerprint: `2ad7b75d87a05d4c49090afef13278b96a635b881391bd835ae3388e8d989693`
- event checkpoint fingerprint: `07902f476e0be0e58fe95053428dac51db6ac64b1b22e2c8c541af9be1249d66`
- event checkpoint revision: `1`
- L2 invocation state before repair: `claimed`
- accounting snapshot: absent
- completed run: absent
- recovery receipt: absent

The original runtime error was:

`p12_2_persistence_url_policy_rejected`

## Root contract mismatch

The sitemap inventory intentionally accepts same-origin query-bearing supplied/child sitemap document URLs.

Examples include pagination/provenance URLs such as:

`https://diamondshelf.us/sitemap_products_1.xml?from=1&to=250`

Before L10.18, persistence applied the ordinary page-URL policy to fields named `sourceSitemap`, `sourceSitemaps`, and `missingSupplied`. The page policy rejects all query strings.

L10.18 separates the policies:

### Ordinary page/canonical URL fields

Still require:

- HTTPS;
- exact `https://diamondshelf.us` origin;
- no credentials;
- no query string;
- no fragment.

### Sitemap-provenance/document URL fields

Require:

- HTTPS;
- exact `https://diamondshelf.us` origin;
- no credentials;
- query string allowed;
- no fragment.

Cross-origin, insecure, credential-bearing and fragmented sitemap URLs remain rejected.

## Why the legacy full accounting snapshot cannot be reconstructed

The durable checkpoint table stores only the latest checkpoint payload. It does not retain:

- the full sitemap inventory payload;
- the full execution plan payload;
- historical checkpoint payloads.

Raw sitemap XML and page content are deliberately not persisted.

Therefore L10.18 does **not** fabricate a legacy `FullSiteCrawlBridgeSnapshot` and does **not** refetch mutable site data just to recreate historical material.

Instead it writes a compact durable-finalization accounting snapshot whose only inputs are already durable, certified state:

- exact Packet-014 identity;
- exact final checkpoint and counters;
- exact execution/inventory fingerprints;
- exact append-only terminal-failure event;
- exact failed canonical URL.

The compact snapshot records explicitly that:

- full bridge snapshot reconstruction was not performed;
- inventory payload is not persisted;
- execution-plan payload is not persisted;
- no network refetch occurred;
- no crawl replay occurred.

The legacy recovery loader filters for the legacy bridge snapshot version, so it does not interpret the compact snapshot as a recoverable full execution snapshot.

## Repair transaction

The repair executor is:

`artifacts/api-server/dist/p12-2-l10-18-packet-014-finalization-repair.mjs`

It is authorized by:

`AUTHORIZE:P12_2_L10_18_PACKET_014_FINALIZATION_REPAIR:<REPAIR_AUTHORIZATION_FINGERPRINT>`

Before any write, one transaction takes an advisory lock and requires all of the following exact pre-state:

1. exactly one Packet-014 L2 invocation;
2. invocation status `claimed`;
3. null invocation receipt fields;
4. exactly one Packet-014 checkpoint row;
5. checkpoint revision/fingerprint/plan/inventory and counters equal the certified values above;
6. checkpoint status `completed`;
7. zero pending URLs;
8. exactly one terminal-failure event for `/blogs/news`;
9. exact event fingerprint/checkpoint lineage;
10. no completed-run row;
11. no accounting row;
12. no recovery receipt.

Only then does it perform exactly two durable writes:

1. insert one compact accounting snapshot into `first_party_crawl_accounting_snapshots`;
2. update the existing L2 invocation from `claimed` to `completed` with an `accounting_complete_uncertified` L2 receipt.

It does not:

- modify the checkpoint;
- modify the terminal-failure event;
- create a completed-run row;
- create a recovery receipt;
- perform a network request;
- replay any page request;
- retry automatically;
- activate scheduler/workers;
- write to providers/public site.

An exact already-finalized replay is a no-op. Any partial or conflicting state fails closed.

## Compact accounting semantics

The compact snapshot is not a claim that the whole site is certified.

It states:

- checkpoint accounting is complete;
- terminal failure count is exactly one;
- exact failed URL evidence exists;
- `wholeSiteCertified=false`;
- blocker: `terminal_failures_present`.

This is the correct durable state needed before a separately designed exact-URL recovery lane.

## Post-repair certification

The read-only executable is:

`artifacts/api-server/dist/p12-2-l10-18-packet-014-post-repair-cert.mjs`

It runs exactly ten SELECT-only checks under PostgreSQL:

`default_transaction_read_only=on`

The post-repair authorization is dynamically bound to the exact Railway repair deployment ID:

`AUTHORIZE:P12_2_L10_18_PACKET_014_POST_REPAIR_READ_ONLY:<FINGERPRINT>`

Its terminal guard requires:

- exact completed Packet-014 L2 receipt;
- unchanged final checkpoint;
- unchanged exact terminal-failure event at its actual event checkpoint revision;
- exactly one compact L10.18 accounting snapshot;
- no completed-run row;
- no recovery receipt;
- compact snapshot explicitly records no refetch/replay/full-snapshot reconstruction.

The successful classification is:

`accounting_complete_uncertified_compact_finalized`

## Immutable images and release boundaries

Repair image:

`ghcr.io/intssere/seo-engine-p12-2-l10-18-packet-014-finalization-repair`

Release authorization after merge:

`AUTHORIZE:P12_2_L10_18_PACKET_014_FINALIZATION_REPAIR_IMAGE_RELEASE:<SOURCE_SHA>:<SOURCE_TREE>`

Post-repair SELECT-only image:

`ghcr.io/intssere/seo-engine-p12-2-l10-18-packet-014-post-repair-cert`

Release authorization after merge:

`AUTHORIZE:P12_2_L10_18_PACKET_014_POST_REPAIR_CERT_IMAGE_RELEASE:<SOURCE_SHA>:<SOURCE_TREE>`

Image release, Production repair execution, post-repair image release, and Production read-only certification are four separate authorization boundaries.

## Sequencing

1. merge L10.18 only after exact-head CI success;
2. verify post-merge CI;
3. release/attest the repair image under its own authorization;
4. re-certify Production pre-state read-only if required before mutation;
5. bind the exact repair runner transition;
6. authorize and execute the repair exactly once;
7. release/attest the post-repair certification image;
8. authorize and execute the post-repair SELECT-only certification;
9. only after certified compact finalization, design the separate exact-`/blogs/news` recovery milestone.

No terminal-failure recovery is part of L10.18.
