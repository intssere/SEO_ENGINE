# P12.2-L10.8 — packet 009 post-fix durable attribution certification

Packet 009 is permanently consumed. Its single bounded-pilot execution ran on the L10.7 runtime, crossed both the Diamond Shelf HTTPS boundary and the Production Postgres boundary, and its Railway deployment reached terminal SUCCESS. Railway runtime logs did not retain the final operator JSON.

L10.8 adds a separate packet-specific read-only certification path for packet 009's durable receipt. It never replays or continues the crawl.

## Exact binding

The certification is bound to:

- packet fingerprint `3f8197a30fea0b17e0d5b765cdbed7cd5dec447b00fe01b87c066e7d6303a342`;
- phase `bounded_pilot`;
- run ID `p12-2-diamond-shelf-bounded-pilot-009`;
- observed-at `2026-10-05T08:27:00.000Z`;
- Diamond Shelf's exact site/origin;
- the exact Railway project/environment/Postgres service IDs.

## Certification contract

Ten single-statement read-only queries certify database identity, packet identity, invocation receipt, checkpoint state, completed-run absence, aggregate policy attribution, bounded persistence, robots reasons, other-policy reasons, and final durable attribution integrity.

The runtime uses a read-only database session with a 15-second statement timeout. Connection credentials are excluded from command arguments and emitted receipts. The certification runner performs one attempt, zero retries, and no fallback transport.

The certification reads the same closed robots and non-robots attribution taxonomies used by L10.6, including `otherPolicyRejectionReasons[]`, but does not assume any packet-009 outcome count. This lets the durable receipt prove whether L10.7 eliminated `response_oversize` failures.

## Safety boundary

This milestone performs no crawl, no replay or retry, no schema or data mutation, no provider/public-site write, and no scheduler or autonomous worker activity. It persists no URL-level rejection data, response bodies, page content, robots content, or raw sitemap XML.

Certification image release and Production read-only execution remain separate authorization boundaries after merge.
