# UGP-11.1D12 — Independently Verified Identity and Signing-Key Trust Contracts

Baseline `initiative-universal-growth-platform` at `b557871ca2a3312bbc49b77ad01f406660343250`.

## Current deliverable: contract validation, denial only
A pure TypeScript review introduces explicit operator evidence and signing-key evidence contract types. It checks canonical UTC windows, principal/scope identifiers, tenant/site binding, algorithm allowlist, rotation epoch and revoked/stale state. It does **not** authenticate caller-supplied claims. Even apparently current `assertedVerified`, `assertedSignatureVerified`, claimed identity provider, policy version, issuer, and trust anchor remain untrusted data, and every response denies identity trust, signing-key trust, issuance, authority, claim, and dispatch.

No production keys, real signatures, IDP credentials, sessions, DB schema, runtime registration or remote calls. The unit tests do not certify identity providers or KMS/HSM integration.

## Next independent trust engineering gates
1. Choose and separately authorize an identity provider with server-side OIDC discovery, pinned issuer/audience and JWT/JWKS verification, session revocation, nonce and authentication assurance.
2. Implement durable independently sourced tenant/site-specific operator grants, least privilege, control-action policy and audit evidence. Never use self-declared role/approval as authorization.
3. Choose an approved signing authority (managed KMS/HSM or audited delegated key registry). Bind immutable key IDs, issuer, algorithm, tenant/site scope, key rotation, revocation, timestamps, and historical verification.
4. Build detached signature verification over the exact revision-bound issuance envelope, with replay-resistant nonce, independently verified actor and permission proof, and transactionally durable issuance history.
5. Certify revocation and concurrency against PostgreSQL; keep D5 fixture-only control projection and D6 negative claim gating unchanged until separately approved certified controls and worker protocol exist.
6. Obtain explicit production credential, schema, worker, provider and deployment authorization separately.

**Safety:** UGP-11.1D12 is a non-operational trust-contract review. `authorityVerified=false`, `issuanceAllowed=false`, `claimAllowed=false` and `dispatchAllowed=false` are invariant. No scheduling, external dispatch, live migrations, deployment or public-site writes.
