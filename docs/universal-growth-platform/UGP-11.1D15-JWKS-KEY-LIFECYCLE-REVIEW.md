# UGP-11.1D15 — Offline JWKS Key Provenance and Lifecycle Review

Base: `initiative-universal-growth-platform` commit `1526aa8d442c1b6a5254a0499bf67fd64c4ab0d8`.

This increment adds a **pure negative, offline** lifecycle review for fixture RSA JWK verification keys. It validates RSA public-key parseability and modulus size, key ID binding, RS256 signing use, scoped issuer/tenant/site metadata, canonical validity timestamps, rotation epoch and revoked/retired/rotating state. An accepted fixture receives a deterministic evidence fingerprint, but **all results deny** key trust, P9 issuance, queue claims and dispatch.

The supplied issuer, tenant/site metadata, public JWK, lifecycle state and provenance are caller-owned, not independently verified. A valid RSA key does not establish an issuer relationship, root of trust, a key registry or authorized rotation. There is no JWKS fetching, key persistence, cryptographic attestation of lifecycle metadata, KMS/HSM, IDP connection, production key, database migration, authorization or executable route.

Before any operational trust, separately certify independently administered issuer allowlisting, origin-safe JWKS acquisition, pinned trust anchors, signed key lifecycle and revocation events, scoped operator permissions, immutable issuance audit, and transactional P9 control enforcement. No ability to authorize workers is introduced.

No provider writes, public-site changes, production DDL, runtime activation, scheduling, deployment or external sending.
