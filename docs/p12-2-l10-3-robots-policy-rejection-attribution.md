# P12.2-L10.3 — robots policy-rejection attribution

Packet 006 proved that 14 of 15 terminal failures were policy rejections, while 1 was a permanent HTTP 404. The previous durable attribution contract could not distinguish why robots-policy evaluation failed.

This milestone preserves a bounded robots-only policy-rejection breakdown for future bounded pilots without storing URLs, robots.txt content, response bodies, or page content.

## Closed reason classes

Robots-policy failures are reduced to one of these safe aggregate reasons:

- `http_unavailable`
- `redirect_limit`
- `response_oversize`
- `malformed_policy`
- `scope_validation`
- `secure_transport_rejection`
- `transport_error`
- `unclassified`

The durable bounded-pilot result retains:

- total `policyRejections`;
- `robotsPolicyRejections.total`;
- aggregate reason/count pairs;
- `otherPolicyRejections` for non-robots policy failures.

The contract requires:

`robotsPolicyRejections.total + otherPolicyRejections = policyRejections`.

All existing terminal-failure accounting remains unchanged.

## Safety

- no URL-level rejection persistence;
- no robots.txt body persistence;
- no response-body or page-content persistence;
- no provider or public-site writes;
- no scheduler or autonomous worker;
- no crawl authorization;
- no replay of packet 006.

A fresh future bounded-pilot packet is required to populate these fields.
