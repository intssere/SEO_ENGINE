# UGP-11.1D14 — Independently Governed Identity-Provider Trust Configuration Review

**Baseline:** initiative branch at `264e46d011b39b4615535e4b06f4b08096b58823`.

This increment is a pure, isolated **configuration review fixture**, not independently governed IDP trust. It validates syntactic issuer/audience/scope, canonical UTC windows, version, HTTPS JWKS location, bounded key lists, deterministic configuration fingerprinting and revoked/allowed key conflicts. It does **not** fetch JWKS, connect to identity providers, persist governed credentials, authenticate principals or grant permissions. Supplied `approvedBy` and `provenance=fixture_only` remain self-asserted, not independent approval.

All results invariantly deny `configurationTrusted`, `identityTrusted`, `issuanceAllowed`, `claimAllowed`, and `dispatchAllowed`. Passing configuration review produces a fingerprint only, not authority. The HTTPS URL check is static hygiene, not an SSRF-safe network authorization check: no network calls are made, and a future real fetcher must independently implement strict allowlisting, DNS/IP resolution controls, redirects/rebinding defense, content limits, TLS and managed provenance.

**Remaining certification gates:** independently controlled issuer/audience allowlist, authenticated IDP metadata and JWKS acquisition, trusted key rotation and revocation, verified operator permission grants scoped to tenant/site, durable governance audit, signed control issuance evidence and atomic claim authority. No caller-supplied config may cross these boundaries.

No production config/credentials, migrations, scheduling, workers, route binding, provider calls, deployment or external sending are implemented or authorized.
