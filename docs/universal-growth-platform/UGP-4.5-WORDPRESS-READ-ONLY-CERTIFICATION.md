# UGP-4.5 — WordPress Read-Only Provider Certification Boundary

Tracking: #578, parent exit-gap #574.

This milestone adds a WordPress-specific certification harness over the existing universal site, connection, capability and connector contracts. It does **not** execute a live WordPress request and therefore does not by itself satisfy the live-provider evidence gap recorded in #574.

## Certified contract boundary

- provider is exactly `wordpress`;
- a universal connection is required;
- canonical site origin must be exact HTTPS origin;
- initial routes are exactly `/wp-json/wp/v2/pages` and `/wp-json/wp/v2/posts`;
- method is GET only;
- pages map to `page`, posts map to `article`;
- only existing universal `read.resource` / `read.content` capabilities are accepted;
- caller-supplied successful JSON evidence is bounded to 1 MB and normalized into deterministic request/state/receipt fingerprints;
- effective URL must exactly equal the planned same-origin route;
- transport, credential material, authorization grants, provider writes and public-site writes remain disabled.

## Evidence classification

Passing unit/CI tests certifies the deterministic **WordPress read-provider adapter and certification harness**. It must be reported as fixture/contract certification, not as a live WordPress provider certification.

A later live evidence run, if required for UGP-4 exit, needs separate explicit authorization for the exact read-only network target and credential mode. That run must preserve the same site/connection/capability/route bounds and produce evidence that can be normalized through this harness.

## Out of scope

No OAuth expansion, credential storage, MCP/REST SDK adoption, live provider call, write method, mutation capability, Production DB change, scheduler/worker activation, deployment or publication.
