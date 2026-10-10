# UGP-11.1D16 — Offline Signed Key-Revocation Evidence Fixture

Base: `initiative-universal-growth-platform` at `60b9f5c6cd363bf2340dfc2853545b620a8878e5`.

This increment adds a pure, offline detached-signature revocation event review. It computes a domain-separated SHA-256 fingerprint for canonical issuer, tenant, site, key ID, event ID, sequence, prior event fingerprint, action (revoke/rotate/retire), and effective time; verifies an RSA-SHA256 signature with a caller-supplied public key; and verifies exact prior fingerprint, scope, and contiguous sequence. Negative tests cover altered event content, wrong signing key, stale sequence/replay, altered predecessor, and cross-site history.

**Hard boundary:** The public verification key and prior history are caller-provided fixture inputs and therefore are not independently authoritative. A valid fixture signature or intact hash chain does not prove governed issuer ownership, authenticated signing, operator authority, revocation enforcement, durable recording or replay resistance across concurrent processes. Every review denies `keyTrusted`, `issuanceAllowed`, `claimAllowed`, and `dispatchAllowed`. This increment does not modify P9 controls, journal storage, jobs or claim gates.

Future operational work must independently certify protected issuer trust anchors, approved key custody and revocation governance, durable append-only key-event history and atomic uniqueness, fail-closed key rotation, real operator permissions and binding to P9 issuance. No migrations, provider calls, remote JWKS, production credentials, workers, scheduling or deployments.
