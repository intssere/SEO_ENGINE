# P12.2-L10.5 — other-policy rejection source attribution

Packet 007 durably proved:

- 15 fetched successfully;
- 15 terminal failures;
- 14 policy rejections;
- 0 robots-policy rejections;
- 14 non-robots policy rejections;
- 1 permanent HTTP 404.

L10.5 traces the remaining non-robots policy bucket to the page-transport boundary and preserves a closed aggregate source taxonomy for fresh bounded pilots.

## Closed reason classes

Non-robots page-policy failures are reduced to one of these safe aggregate reasons:

- `response_oversize`
- `redirect_validation`
- `scope_validation`
- `secure_transport_rejection`
- `request_validation`
- `unclassified`

The page transport still returns the existing `policy_rejection` retry signal. The new reason is diagnostic metadata only and does not weaken or change retry, crawl-scope, network-security, persistence, or write boundaries.

## Durable bounded-pilot contract

The bounded-pilot failure attribution retains:

- `terminalFailures`;
- `policyRejections`;
- `robotsPolicyRejections.total`;
- `robotsPolicyRejections.reasons[]`;
- `otherPolicyRejections`;
- `permanentHttp[]`;
- exhausted transient failure counters.

It adds:

- `otherPolicyRejectionReasons[]` with aggregate `{ reason, count }` pairs.

The contract requires:

`sum(otherPolicyRejectionReasons[].count) = otherPolicyRejections`

and preserves:

`robotsPolicyRejections.total + otherPolicyRejections = policyRejections`.

All reason arrays are deterministically sorted, counts must be positive integers, reasons must be unique, and only values from the closed taxonomy are valid.

## Current source mapping

The live page adapter classifies:

- transient HTML/body byte limit failures as `response_oversize`;
- missing or invalid redirect locations as `redirect_validation`;
- exact-site/origin/HTTPS/query/fragment/request-scope violations as `scope_validation`;
- secure pinned-transport policy rejections such as private/mixed DNS targets or forbidden request properties as `secure_transport_rejection`;
- invalid bounded request-timeout configuration as `request_validation`;
- other recognized `p12_2_live_*` policy failures as `unclassified`.

Unexpected non-policy transport failures remain `transport_unavailable`; aborts remain `network_timeout`. L10.5 does not reclassify those as policy failures.

## Safety

- no URL-level rejection persistence;
- no response-body persistence;
- no page-content persistence;
- no sitemap XML persistence;
- no provider writes;
- no public-site writes;
- no scheduler or autonomous worker;
- no crawl authorization;
- no replay of packet 007.

Packet 007 cannot be retroactively populated with the new reason array. A fresh bounded-pilot packet, at the same conservative 30-URL envelope, is required after canonical merge and runtime-image release to determine the dominant non-robots policy source.
