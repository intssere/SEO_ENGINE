# UGP-11.C2 — Deny-only Control Issuer Contract

**Baseline:** `initiative-universal-growth-platform` at `24182ece68b27b799266f99431a1205603d46b72`.

**Disposition: engineering-only C2 preflight, NOT C2 certification.** C1's proposed architecture has not been independently approved. No independently administered IDP, KMS, scoped authorization ledger, security reviewer, or accountable trust owner has been designated.

The new `ugp-11-c2-denied-control-issuer.ts` validates the syntax, tenant/site/principal/policy binding, bounded control action, revision ancestry, and effective/expiry times of an offline control-issuance *intent*. It invokes the existing D12 caller-evidence review but **always returns** `identityTrusted=false`, `grantTrusted=false`, `signerTrusted=false`, `issuanceAllowed=false`, `claimAllowed=false`, and `dispatchAllowed=false`.

Adversarial unit tests cover positive-looking self-attested credentials, cross-scope drift, policy drift, expired/future intents, malformed previous fingerprints, revoked key evidence, missing assertion and stale session evidence. These tests validate denial behavior, not positive trusted issuance.

## Unmet C2 acceptance gates

1. Name an accountable independent security reviewer, identity/governance owner, key custody owner, privacy owner and durable-policy/database reviewer.
2. Formally approve C1's trust-boundary design and choose an independently administered OIDC identity service and managed signing authority with documented data region, custody and incident recovery.
3. Prove immutable server-owned tenant/site/action grant lookups; no policy from caller assertions.
4. Prove governed verifier resolution and revocation freshness, key rollover, stale-key denial, and IDP/JWKS outage fail-close without remote user-supplied URLs.
5. Prove authenticated issuance journal transactions, exact nonce and predecessor checks, cross-tenant denial, independent provenance, and auditable review.
6. Run isolated integration and adversarial certification, including concurrent replay and kill/recovery, before enabling any positive authorization. Later C3–C7 gates still block worker execution.

No database migration, credential, trust root, route, worker, scheduler, provider call, publication, production activation, or UGP-to-main merge is introduced.
