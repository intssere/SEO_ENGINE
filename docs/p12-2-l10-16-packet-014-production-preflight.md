# P12.2-L10.16 — Packet 014 Production SELECT-only pre-execution certification

## Purpose

L10.16 is the last database-state certification layer before the fresh post-0010 Packet 014 full-site crawl can be armed.

It does not execute Packet 014. It proves that Production is still in the exact state that the separately released Packet 014 execution image expects.

## Bound execution image

The preflight contract is tied to the already released immutable application image:

- image: `ghcr.io/intssere/seo-engine@sha256:afa1e3f7bc2b38b59b0fa36aa9eb4d0ed2a533122439d5d9647ed48ee63ecf93`;
- release run: `37503596029`;
- attestation: `53272234`;
- source SHA: `dedaee261336234b6eb9a8273bb6961667f6d30b`;
- source tree: `aed5119c9f6945437a3bf1b911b2b9ce04dc2a55`.

This means the preflight authorization cannot be silently repurposed for a different crawler image.

## Packet 014 identity

- phase in the execution image: `full_initial`;
- run ID: `p12-2-diamond-shelf-post-0010-full-014`;
- packet fingerprint: `b853dcc4d1cbc383e5f9a1185085b6bc77ac42394a33db9c1380a6e511e7a560`;
- exact Diamond Shelf site ID: `eb1da9ee-539c-4200-8f04-f64ccaea7768`;
- canonical origin: `https://diamondshelf.us`.

## Production identity

The certification contract is bound to:

- Railway project: `52265e29-921b-4652-ac0d-9da4e5e69936`;
- Production environment: `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`;
- Postgres service: `b69e0633-7ab9-40ab-85f3-c9edd6acb031`.

## Ten SELECT-only checks

The exact query set performs ten bounded SELECT statements:

1. database/server identity;
2. combined pre-execution state guard;
3. P8.8 engineering-policy table absence;
4. L2 invocation constraint inspection;
5. recovery-table column contract;
6. append-only trigger/function contract;
7. immutable packet-013 checkpoint/completed-run guard;
8. packet-013 claimed-invocation guard;
9. Packet-014 complete absence guard;
10. exact Diamond Shelf site binding.

The combined state guard requires:

- exactly 41 public base tables;
- `first_party_crawl_l2_invocations` present;
- its phase constraint still recognizes `bounded_pilot`;
- all six P8.8 engineering-only policy tables absent;
- all three migration-0010 recovery/accounting tables present;
- all three migration-0010 tables globally empty before Packet 014;
- all three immutable triggers present;
- `reject_p12_2_l10_13b_immutable_mutation` present;
- exact active Diamond Shelf site/origin binding.

## Packet 013 preservation

The preflight re-proves the immutable legacy state:

- run ID `p12-2-diamond-shelf-full-interrupt-010`;
- execution-plan fingerprint `0818612ac8f35d5109cb4901442a0546630b9ca31a7ae6f24f77f8271db650aa`;
- final checkpoint revision `307`;
- checkpoint fingerprint `6c13e3bde165f5349f94f8139c35fd878631dc9e3a21a31c91e0936bd5eb4a99`;
- 3,044 / 3,044 finalized;
- zero pending;
- one terminal failure;
- no completed-run certification;
- L2 invocation remains `claimed` with null receipt.

L10.16 does not repair, backfill or retry packet 013.

## Packet 014 absence guard

Before live execution, the certification fails closed if any Packet-014 state already exists.

It requires no matching:

- L2 invocation row for either the exact packet fingerprint or run ID;
- checkpoint row for the run ID;
- completed-run row for the run ID;
- terminal-failure event for the run ID;
- accounting snapshot for the run ID;
- recovery receipt for the run ID.

This prevents a stale, partially consumed or replayed Packet-014 authorization from being treated as fresh.

## Runtime properties

The dedicated CLI:

`artifacts/api-server/dist/p12-2-l10-16-packet-014-preflight.mjs`

uses:

- `/usr/bin/psql`;
- no credential material in argv;
- `default_transaction_read_only=on`;
- 15-second statement timeout;
- bounded output;
- ten SELECT statements only;
- one certification attempt;
- zero retries;
- no fallback transport;
- exact project/environment/Postgres binding;
- exact deterministic authorization literal.

## Dedicated certification image

The dedicated Dockerfile is:

`Dockerfile.p12-2-l10-16-packet-014-preflight`

The dedicated release workflow is:

`.github/workflows/p12-2-l10-16-packet-014-preflight-image-release.yml`

Its release authorization is separately bound to the canonical source SHA and tree:

`AUTHORIZE:P12_2_L10_16_PACKET_014_PREFLIGHT_IMAGE_RELEASE:<SOURCE_SHA>:<SOURCE_TREE>`

The image release does not authorize the Production SELECT-only certification itself.

## Sequence after merge

1. merge L10.16 only after exact-head CI succeeds;
2. post-merge CI must succeed;
3. separately release and attest the immutable L10.16 certification image;
4. calculate/revalidate the committed query-set and Production authorization fingerprint;
5. obtain the exact Production SELECT-only authorization;
6. repin only the bounded one-shot runner to the exact certification image and exact authorization;
7. execute exactly once;
8. consume that authorization when the runner crosses the Production DB boundary;
9. if successful, inspect the Packet-014 live runner configuration and stop at the separate live crawl authorization boundary;
10. never use the preflight authorization to execute the crawl.

## Safety boundary

This milestone itself authorizes no:

- Production database query or mutation;
- Packet-014 claim or execution;
- sitemap, robots or page request;
- Railway mutation/deployment;
- application image transition;
- scheduler or autonomous-worker activation;
- provider/public-site write;
- recovery or packet-013 backfill.

Merge, certification-image release, Production preflight, runner arming, and Packet-014 live execution remain separate explicit boundaries.
