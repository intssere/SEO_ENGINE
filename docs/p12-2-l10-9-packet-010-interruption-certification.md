# P12.2-L10.9 — packet 010 intentional-interruption checkpoint certification

Packet 010 is permanently consumed. Its single `full_interrupt` execution ran on the L10.7 runtime, crossed the Diamond Shelf HTTPS and Production Postgres boundaries, and Railway deployment `a1b97d35-a757-48a8-bd39-bfba81d179c0` reached terminal SUCCESS. Railway runtime logs retained only container lifecycle messages, not the operator receipt.

L10.9 adds a separate packet-specific SELECT-only certification path for the durable packet-010 receipt and checkpoint. It does not replay, continue, resume, or otherwise execute the crawl.

## Exact packet binding

The certification is bound to:

- packet fingerprint `a93b76b252ecb9b9ac063675fcc99b5c70ad5af9c40092b5c2d8574476d1f6d6`;
- phase `full_interrupt`;
- run ID `p12-2-diamond-shelf-full-interrupt-010`;
- observed-at `2026-10-05T09:22:00.000Z`;
- intentional interruption revision `3`;
- Diamond Shelf's exact site/origin;
- the exact Railway project/environment/Postgres service IDs.

## Certification contract

Eight single-statement SELECT queries certify:

1. database identity;
2. exact packet identity;
3. invocation receipt;
4. durable checkpoint state and progress;
5. absence of a completed whole-site run;
6. exact receipt-to-checkpoint interruption binding;
7. checkpoint integrity and closed authorization state;
8. final durable interruption integrity.

The interruption guard requires the durable one-shot receipt to report `intentional_interruption`, checkpoint revision `3`, and checkpoint/execution-plan fingerprints that exactly match the persisted checkpoint row.

The checkpoint guard additionally requires a pending, fingerprint-valid `first_party_full_site_crawl_checkpoint_v1` whose sequence is exactly `3`, whose plan fingerprint matches the persisted execution-plan fingerprint, whose whole-site certification remains false, and whose embedded authorization controls all remain closed.

The durable guard requires attempt 1, no automatic whole-run retry, no completed whole-site row, and no incremental receipt for packet 010.

## Safety boundary

The certification runtime uses a read-only PostgreSQL session with a 15-second statement timeout, one attempt, zero retries, and no fallback transport. Connection credentials are excluded from command arguments and emitted receipts.

This milestone performs no crawl, resume, retry, schema/data mutation, provider/public-site write, scheduler/worker activity, or publication. It persists no URL-level data, response bodies, HTML, robots content, or sitemap XML.

Certification-image release and Production SELECT-only execution remain separate explicit authorization boundaries after merge. The later `full_resume` packet must be constructed only from the checkpoint revision, checkpoint fingerprint, execution-plan fingerprint, and checkpoint payload certified by L10.9.
