# UGP-11.1D13 — Offline OIDC Evidence Verification Fixture

Baseline: initiative-universal-growth-platform at `5b599098d03b9919e029a6b43a7fbb400bd44d43`.

This increment adds a **pure offline JWT signature review fixture**. It cryptographically checks an RS256 JWT with a caller-supplied RSA public key (at least 2048 bits); demands matching static issuer, audience, key ID and token expiry; rejects unsigned/unsupported token algorithms, header-provided key references, malformed encodings, signature tampering and expired/future claims. No network, IDP discovery or JWKS fetch occurs.

**This is not independent authentication.** The verifier configuration and public key are untrusted caller inputs. A cryptographically valid JWT using an arbitrary caller-provided key proves only consistency with that key, not identity-provider trust, user permissions, scope or control authority. All results invariantly set identityTrusted=false, permissionGranted=false, issuanceAllowed=false, claimAllowed=false and dispatchAllowed=false.

Subsequent work requires authenticated, pinned issuer/audience trust configuration independent of the caller, verified JWKS provenance and key rotation/revocation, bounded token policy with replay prevention and session revocation, independent operator tenant/site permission grants and audited authorization. No production credentials, issuer configuration, trust store, P9 authority or runtime route are created here.

This increment introduces no schema migration, worker activation, scheduler, provider writes, deployment or production execution.
