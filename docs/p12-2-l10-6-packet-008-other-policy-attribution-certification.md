# P12.2-L10.6 — packet 008 durable other-policy attribution certification

Packet 008 is permanently consumed. Its single bounded-pilot execution crossed the Production Postgres and Diamond Shelf HTTPS boundaries and the Railway deployment reached terminal SUCCESS, but the final operator JSON was not retained in deploy logs.

L10.6 adds a separate packet-specific, read-only certification path for the durable packet 008 receipt. It never replays or continues the crawl.

## Exact binding

The certification is bound to packet fingerprint `86531a870b9e0968a26366b56d9cfcc2baf15b3df33dacdfb2e2414b033380a7`, phase `bounded_pilot`, run ID `p12-2-diamond-shelf-bounded-pilot-008`, observed-at `2026-10-04T17:52:00.000Z`, Diamond Shelf's exact site/origin, and the exact Railway project/environment/Postgres service IDs.

## Query contract

Ten single-statement read-only queries certify database identity, packet identity, invocation receipt, checkpoint state, completed-run absence, aggregate policy attribution, bounded persistence, robots reasons, other-policy reasons, and final durable attribution integrity.

The runtime enforces a read-only database session with a 15-second statement timeout. Connection credentials are not placed in command arguments or emitted receipts. The runner performs one attempt, zero retries, and no fallback transport.

## Other-policy attribution

The closed non-robots taxonomy is:

- `response_oversize`
- `redirect_validation`
- `scope_validation`
- `secure_transport_rejection`
- `request_validation`
- `unclassified`

The guard requires unique valid reasons, positive integer counts, and an aggregate sum equal to `otherPolicyRejections`. Existing robots attribution remains independently guarded, and robots plus other policy counts must equal total policy rejections.

The final durable guard also validates packet/receipt identity, attempt 1 with no automatic whole-run retry, terminal-failure accounting, latest checkpoint lineage, and absence of a completed whole-site run.

## Safety boundary

This milestone performs no crawl, no replay or retry, no schema or data mutation, no provider/public-site write, and no scheduler or autonomous worker activity. It persists no URL-level rejection data, response bodies, page content, robots content, or raw sitemap XML. It does not assume or hardcode packet 008 outcome counts.

Certification image release and Production read-only execution remain separate authorization boundaries after merge.
