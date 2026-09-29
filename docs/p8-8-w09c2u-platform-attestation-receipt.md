# P8.8 W09-C2U — Dormant platform-attestation adapter and safe receipt seam

## Status

Repository-only engineering seam. No live producer is certified or invoked by this milestone.

## Purpose

W09-C2U carries forward the durable, bounded receipt pattern used elsewhere in the project while preserving the W09-C2K/W09-C2N secret-non-observability boundary.

The seam exists so that a future separately certified Replit/platform control-plane producer can supply an already-sanitized C2N attestation without requiring application code to discover database identity.

## Boundary

The adapter:

- accepts only an unknown already-sanitized attestation value and explicit C2N verification context;
- delegates all identity/provenance/freshness/binding verification to W09-C2N;
- emits only a bounded receipt;
- includes sanitized identity only when C2N returns PASS;
- never echoes rejected input;
- uses caller-supplied observation time and no ambient clock;
- approves no provenance kind or authority by itself.

The adapter has no interface for:

- DATABASE_URL or REPLIT_DB_URL;
- connection strings or credential-bearing URLs;
- passwords, usernames, tokens, Secrets, or environment maps;
- process/shell environment discovery;
- database sessions or SQL;
- Replit, Neon, provider, network, filesystem, or persistence clients;
- deployment, publication, restart, configuration, migration, or provider mutation.

## Receipt schema

Schema: `p8-8-w09c2u-receipt-v1`

Allowlisted receipt fields:

- schemaVersion
- verdict
- code
- receiptObservedAt
- freshnessVerdict
- deploymentBindingVerdict
- secretNonObservabilityVerdict
- provenanceVerdict
- identity, only on PASS

The PASS identity is exactly the allowlisted sanitized identity returned by W09-C2N.

## Fail-closed behavior

Any C2N UNPROVED result remains UNPROVED. C2U does not reinterpret, repair, infer, enrich, hash, redact, or derive identity from rejected input.

Credential-shaped contamination remains `ATTESTATION_CREDENTIAL_SHAPED_INPUT` and is never copied to the receipt.

Unapproved provenance remains `ATTESTATION_PROVENANCE_UNAPPROVED`.

## Explicit non-goals

C2U does not solve the current Replit deployment-to-Production-Database evidence gap.

The recent Replit Agent investigation returned `DEPLOYMENT_DATABASE_BINDING_UNPROVED`; no customer-facing Replit mechanism is therefore approved as a live C2N producer by this milestone.

A future producer requires separate certification under W09-C2S/W09-C2T and separate live authorization before any current Production identity observation.

## Production consequence

After this milestone:

- Side R remains UNPROVED.
- W09-C2I remains blocked.
- W09-C2H remains blocked.
- no Production DB session or SQL is authorized;
- no Neon inspection is authorized;
- no deployment/republish/config/Secrets action is authorized;
- no real Stage 0 execution is authorized.

C2U only ensures that, if a qualifying authoritative producer becomes available, the repository already has a deterministic safe adapter and receipt boundary ready to consume it.
