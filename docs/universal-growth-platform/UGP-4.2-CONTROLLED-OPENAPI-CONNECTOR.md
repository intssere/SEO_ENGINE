# UGP-4.2 — Controlled OpenAPI Connector

Issue: #546. UGP-4.2 introduces a pure read-only OpenAPI operation-planning layer over UGP-1 identity, capability registry and connector contracts.

## Initial contract
The caller supplies already-acquired OpenAPI metadata: an OpenAPI 3.0/3.1 version, stable document identity/fingerprint, and bounded operation declarations. UGP-4.2 does not fetch a document URL. Each operation requires a unique operationId, unique method/path identity, GET or HEAD method, explicit universal capability and explicit resource kinds. The capability must already exist as read-only in the descriptor registry.

Operations are normalized, sorted and fingerprinted. Unknown operations fail closed. OpenAPI discovery never grants authorization. Site/provider/connection/credential-profile scope is inherited from the integrity-checked universal descriptor.

## Typed-client boundary
The normalized plan records generator=unselected and runtimeGenerated/networkEnabled/executionEnabled=false. Hey API/openapi-ts or another generator may be evaluated later, but dependency adoption requires separate security/license review. Generated code cannot become authorization.

## Excluded
No remote spec retrieval, URL execution, HTTP/API/provider calls, credentials or secret material, runtime code generation, generated client execution, DB/schema/persistence, scheduler/worker, provider/public-site mutation, deployment or publication.
