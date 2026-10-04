# P12.2-L10.1 — Bounded pilot failure attribution

Packet 005 proved that the bounded-pilot path can complete durably, but its checkpoint retained only aggregate terminal-failure counts. The exact failure classes could not be reconstructed after process exit.

This milestone adds bounded, aggregate failure attribution for future bounded-pilot runs without persisting response bodies or page content.

## Attribution model

Terminal failures are categorized as:

- policy rejection;
- permanent HTTP status, counted by status code;
- exhausted transient transport:
  - network timeout;
  - connection reset;
  - transport unavailable;
- exhausted retryable HTTP status, counted by status code.

Only terminal outcomes are attributed. Retryable outcomes are counted only when their configured attempt limit is exhausted.

The sum of all attribution categories must equal the checkpoint's terminal-failure counter or execution fails closed.

## Durable binding

L6.3 copies the bounded-pilot aggregate attribution into the completed L2 execution result. Because the durable L2 receipt store persists that result, the diagnostic breakdown remains available for later SELECT-only certification after the process exits.

The completed result accepts bounded-pilot diagnostics only for the `bounded_pilot` phase. HTTP status/counts and transport counters are validated before the L2 receipt fingerprint is committed.

## Safety

- no raw response body persistence;
- no page-content persistence;
- no URL-level failure persistence;
- no provider writes;
- no public-site writes;
- no scheduler or autonomous worker;
- no additional crawl authorization;
- no replay of packet 005.

Packet 005 itself is not retroactively attributable because the old receipt/checkpoint did not persist these categories. A future fresh bounded-pilot packet is required to populate this diagnostic field.
