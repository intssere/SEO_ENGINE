# UGP-4.1 — Controlled MCP Connector

Issue: #541. This milestone defines the first MCP connector plane as a pure, deterministic policy/inventory layer over UGP-1.3. It does not create an MCP transport.

## Contract
An MCP connection is valid only when its universal connector kind is `mcp`, its exact server identity is present in an explicit allowlist, and every discovered/declared remote tool or resource is mapped to an existing universal capability and bounded resource kinds. Unmapped remote operations fail closed.

Initial certification is read-only. A remote tool's existence does not grant a capability, authorization, credentials, network access, provider mutation, or public-site mutation. The policy accepts only credential-profile identity already present in the universal descriptor; it accepts no credential material.

## Determinism and scope
Allowlist entries and mapped operations are normalized/sorted and fingerprinted. Duplicate identities are rejected. Site, provider, connection and credential-profile scope remain inherited from the integrity-checked UGP-1 descriptor. Capability/resource compatibility is checked against the UGP-1.2 registry.

## Explicit exclusions
No MCP SDK dependency; no stdio/SSE/HTTP transport; no live server discovery; no DNS/network; no credential acquisition or token handling; no DB/schema/persistence; no API route; no scheduler/worker; no provider/public-site write; no deployment/publication. WordPress is represented only by synthetic contract fixtures.

A future live MCP adapter requires a separate dependency/security/license review and authorization boundary; it must consume this policy rather than expose arbitrary remote tools.
