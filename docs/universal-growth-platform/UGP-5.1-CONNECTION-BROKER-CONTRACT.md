# UGP-5.1 — ConnectionBroker contract

## Status

**IMPLEMENTATION CANDIDATE — MERGE PENDING EXACT-HEAD CI AND EXPLICIT AUTHORIZATION**

UGP-5.1 introduces the provider-neutral `ConnectionBroker` contract used by later broker implementations and multi-site connection UX.

This milestone is pure and deterministic. It does not implement OAuth, token exchange, secret persistence, provider transport, background refresh, or automatic reconnect.

## Baseline

- Initiative baseline: `8218ced8ed170039f50712753eb6996e4fcadb01`
- UGP-4 connector-plane exit: complete
- ConnectionBroker contract version: `ugp-5-1-connection-broker-contract-v1`

The contract extends the existing UGP universal identity model rather than defining a second provider/site/connection identity system.

## Contract surface

The broker contract models:

- connection start request;
- bounded pending connection session;
- durable provider-neutral connection handle;
- credential-profile lease metadata;
- deterministic refresh-required decision;
- connection health observation;
- revocation receipt;
- reconnect plan.

The conceptual interface remains:

```text
beginConnection
getConnection
getCredentialLease
refreshIfRequired
revokeConnection
getHealth
planReconnect
```

## Identity and scope

A connection handle binds the exact UGP site identity, provider, connection mode, universal connection identity, optional external account identity, credential profile identity, connection/confirmation timestamps, and deterministic handle fingerprint.

Credential profile identity is metadata only. The contract never contains credential material, access tokens, refresh tokens, authorization headers, passwords, client secrets, API keys, cookies, or session secrets.

## Credential lease contract

A credential lease binds the connection identity fingerprint, credential profile identity, lease identity, issue/expiry timestamps, renewable boolean, and deterministic lease fingerprint.

Permanent lease assertions:

- `credentialMaterialPresent=false`;
- `grantsAuthorization=false`.

`refreshIfRequired` is a pure clock comparison against an explicit refresh window. It does not refresh credentials or call any provider.

## Health, revoke and reconnect

Health values are `healthy`, `degraded`, `unavailable`, and `revoked`. Degraded/unavailable health requires a reason. Healthy/revoked health does not accept a diagnostic reason in v1.

Reconnect output is planning-only: it may state reconnect is required, while `automaticReconnect=false` and `grantsAuthorization=false` remain invariant.

Revocation produces a deterministic revocation artifact. It does not call a provider or credential store.

## Authority boundary

All broker artifacts preserve:

- `grantsAuthorization=false`;
- `grantsProviderWrite=false`;
- `grantsPublicSiteWrite=false`;
- `storesCredentialMaterial=false`;
- `executesProviderRequests=false`;
- `automaticReconnect=false`.

A valid broker connection or credential lease proves only connection/lease state. It never authorizes a connector mutation. Connector capability availability remains separate from action authorization. Existing SEO ENGINE policy/preflight/execution/verification gates remain authoritative.

## Integrity and fail-closed behavior

The contract rejects malformed/noncanonical identities, invalid session expiry, connection completion outside the bounded session, confirmation before connection, forged connection or handle fingerprints, invalid lease expiry, forged lease fingerprints, invalid health/reconnect artifacts, and malformed timestamps/identifiers.

All deterministic artifacts are deep-frozen and fingerprinted from canonical normalized fields.

## Explicit exclusions

UGP-5.1 does **not** include Nango or another broker dependency, OAuth redirects/callbacks, provider APIs, network calls, credential/token storage, database/schema changes, API routes, frontend connection UI, automatic credential refresh, automatic reconnect, scheduler/worker activation, provider/public-site writes, deployment, or publication.

Those require later UGP-5 milestones and their own review/certification.

## Exit criteria

UGP-5.1 is complete when:

1. the pure ConnectionBroker contract and deterministic artifacts are merged;
2. universal site/connection identity is reused exactly;
3. credential material is structurally absent;
4. connection/lease/health/revoke/reconnect semantics are fail-closed;
5. no broker artifact grants action authorization;
6. exact-head CI passes;
7. merge receives explicit authorization and post-merge verification.

Completion of UGP-5.1 permits evaluation of **UGP-5.2 — Broker implementation evaluation**, including Nango only after the roadmap-required security/license/data-residency/token-storage/failure-recovery review.
