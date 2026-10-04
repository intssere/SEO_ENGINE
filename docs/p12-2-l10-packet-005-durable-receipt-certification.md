# P12.2-L10 — Packet 005 durable receipt/persistence certification

This milestone certifies the already-consumed Diamond Shelf bounded-pilot packet 005 without executing another crawl.

## Bound packet

- packet fingerprint: `669a9120f744e3470d1f106d7a094b414015d25b5da8f37ac2864765f4254f85`
- run ID: `p12-2-diamond-shelf-bounded-pilot-005`
- phase: `bounded_pilot`
- site ID: `eb1da9ee-539c-4200-8f04-f64ccaea7768`
- canonical origin: `https://diamondshelf.us`
- observedAt: `2026-10-04T10:34:36.551Z`

## Read-only proof

The certifier issues seven single-statement SELECT queries under `default_transaction_read_only=on`:

1. database identity;
2. exact packet identity guard;
3. durable invocation/receipt projection;
4. bounded-pilot checkpoint projection and counters;
5. completed whole-site run count;
6. bounded persistence guard requiring a valid checkpoint and no completed whole-site snapshot for this run;
7. durable completion guard requiring the L2 invocation row to be `completed` with exact packet/run lineage and valid 64-hex receipt fingerprints.

The bounded pilot's full bridge receipt is not stored as a separate row. Its fingerprint is durably linked from `receipt_payload.result.receiptFingerprint`; crawl counts are projected from the persisted checkpoint. This milestone therefore does not claim reconstruction of an unpersisted receipt payload.

## Safety boundary

- SELECT-only SQL;
- one attempt;
- zero retries;
- no fallback transport;
- no crawler imports or crawl entrypoint;
- no provider writes;
- no public-site writes;
- no deployment/publication authorization;
- no packet replay.

Runtime authorization is generated as:

`AUTHORIZE:P12_2_L10_PACKET_005_READ_ONLY:<fingerprint>`

The immutable cert image release is separately authorized as:

`AUTHORIZE:P12_2_L10_PACKET_005_CERT_IMAGE_RELEASE:<SOURCE_SHA>:<SOURCE_TREE>`
