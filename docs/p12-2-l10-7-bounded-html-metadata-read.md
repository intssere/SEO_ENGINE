# P12.2-L10.7 — bounded HTML metadata reads for large first-party pages

## Certified cause

Packet 008's L10.6 durable SELECT-only certification established the exact bounded-pilot attribution:

- terminal failures: 15
- policy rejections: 14
- robots-policy rejections: 0
- other policy rejections: 14
- other-policy reasons: `response_oversize = 14`
- permanent HTTP failures: one HTTP 404
- transient exhausted failures: zero

The existing first-party page transport read the entire successful HTML response solely to inspect robots metadata. Its default transient limit was 262,144 bytes, so a page whose full HTML body exceeded that limit was rejected even when the metadata needed by the crawler was small and valid.

## Correction

L10.7 keeps the existing transient byte ceiling. It does not increase the packet page count, request rate, concurrency, retry count, or response-body persistence.

For successful HTML/XHTML responses the transport now:

1. reads a bounded transient prefix;
2. stops as soon as the HTML metadata region ends at `</head>` or `<body...`;
3. evaluates robots meta directives from that bounded metadata only;
4. cancels the remaining response body;
5. still returns `response_oversize` if the metadata region itself exceeds the selected transient limit.

If an `X-Robots-Tag: noindex` header is already present, the response body is canceled immediately.

For successful non-HTML responses, the body is canceled immediately because no body content is required for this crawl contract.

## Safety invariants

The change preserves:

- HTTPS and exact-origin validation;
- pinned/public-address transport protections;
- manual redirects;
- robots enforcement;
- response-body persistence disabled;
- page-content persistence disabled;
- default transient metadata limit of 262,144 bytes;
- absolute transient limit of 1,048,576 bytes;
- one-shot packet authorization semantics;
- scheduler/autonomous worker disabled;
- provider writes disabled;
- public-site writes disabled.

No migration, Railway configuration, deployment, Production database operation, or live crawl is part of this PR.
