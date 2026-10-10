# UGP-11.C2-C — Offline Trust Certification Vector Baseline

**Baseline:** initiative integration branch `d0a602ae05fcf7ac5d8a0f3694d1dbfdd172c4e0`.

**Status:** OFFLINE / DENY ONLY / NOT OPERATIONAL. Issue #1054 remains blocked: named independent security/DB/key custody/privacy owners, approved OIDC/KMS providers, and bounded nonproduction provisioning authority have not been evidenced.

## Deliverable

The bounded `ugp-11-c2c-offline-trust-vectors.ts` matrix enumerates identity, grant, signer, revocation, issuance and runtime threat cases. Its test proves every vector denies admission, issuance, claim and dispatch. Unknown or modified vectors fail rather than silently becoming certified. This matrix records **negative baseline cases only**; it is not evidence of independent issuer trust, identity/JWKS verification, managed signing, positive authorization, or durable replay safety.

## Mandatory nonproduction exit scenarios (future, only after approval)

1. Independently administered OIDC identity proof: issuer/audience/algorithm, token lifetime, malicious JWKS and stale sessions.
2. Server-governed tenant/site/action grants, independent reviewer approvals and revoked/self-granted permission denial.
3. KMS asymmetric signing with non-exportable key material, independently governed key IDs, version/custody, revocation, provider outage and signer-role compromise.
4. Durable issuance lineage and nonce uniqueness under concurrent writers, corruption/replay/expiry recovery.
5. Atomic policy admission, kill/pause/drain control precedence and lost-lease fencing before claim/dispatch.
6. Failure injection with identity/KMS/PostgreSQL outage, uncertain write outcome quarantined and no automatic send.
7. Independent audit custody, retention and key-recovery runbooks. Separate reviewer signs off on the exact controlled test environment and result.

**Safety:** No keys, credentials, external identity calls, KMS signing, database DDL, worker activity, transport, deployment or scheduling were introduced. GitHub CI for this PR tests only source-level denial behavior. No positive C2-C certification is claimed.
