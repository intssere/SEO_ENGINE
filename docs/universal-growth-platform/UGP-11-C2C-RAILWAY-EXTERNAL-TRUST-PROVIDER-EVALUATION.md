# UGP-11.C2-C — Railway-hosted external trust-service candidate evaluation

**Baseline:** `initiative-universal-growth-platform` at `253c3c894973d66914c9a6461914a5c7ed2c40c7`.
**Disposition:** RESEARCH / NO PROVIDER OR PROVISIONING AUTHORIZATION. **Issue:** #1054.

## 1. Decision statement
Evaluate a Railway-hosted SEO ENGINE API and PostgreSQL policy ledger with independently administered managed operator identity (OIDC) and managed asymmetric signing. **Provisional leading combination:** Amazon Cognito + AWS KMS; retain Auth0 and Google Cloud KMS as alternatives. This is an engineering evaluation, not organizational approval or evidence of verified runtime compatibility.

## 2. Candidate comparison
| Need | Leading option | Alternative | Selection evidence still missing |
|---|---|---|---|
| Operator OIDC | Amazon Cognito user pool | Auth0 | Exact tenant model, token issuer/audience/JWKS behavior, user lifecycle, authentication assurance, MFA, audit, pricing and geographic data handling |
| Managed signing | AWS KMS asymmetric SIGN_VERIFY key | Google Cloud KMS ASYMMETRIC_SIGN | Least-privilege signed API access from Railway; key ownership, external audit, disable/revoke, regional placement, signing throughput, costs, recovery |
| Scoped authorization | Separately governed SEO ENGINE-owned PostgreSQL grant ledger | Independently managed policy service | Principals/action/site/tenant policy provenance, independent administrator, non-self-granting RBAC, durable revocation/nonce and transactional claim checks |
| Runtime | Railway nonproduction isolated service | Preapproved alternate environment | Public egress to chosen cloud API; TLS, AWS/GCP identity credentials, network egress rules, region and IP restrictions, incident path |
| Audit | Independent append-only/checkpointed audit custody | Reviewed third-party archival | Immutability, custody, retention, access controls, privacy, data classification |

## 3. Source references and facts observed 2026-10-10
- AWS KMS: https://docs.aws.amazon.com/kms/latest/developerguide/symmetric-asymmetric.html — asymmetric private keys are created and held inside AWS KMS; the Sign API creates signatures via IAM-authorized requests.
- AWS KMS Sign: https://docs.aws.amazon.com/kms/latest/APIReference/API_Sign.html — external public-key verification is supported; signing of larger messages requires consideration of digest mode.
- AWS key algorithm/key specifications: https://docs.aws.amazon.com/kms/latest/developerguide/symm-asymm-choose-key-spec.html — compare supported EC/RSA algorithms with exact D12 trust envelope before integration.
- Cognito OIDC: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-flow.html — this page concerns *Cognito acting as an OIDC relying party to third-party IdPs* and is not by itself certification of the SEO ENGINE application's Cognito token validation. Obtain Cognito user-pool token/JWKS API-specific evidence before adoption.
- Google Cloud KMS asymmetric signing: https://docs.cloud.google.com/kms/docs/create-validate-signatures — ASYMMETRIC_SIGN purpose and signing permissions.
- Google Cloud KMS pricing: https://cloud.google.com/kms/pricing — key-version and usage-based pricing; verify current effective rates at approval.
- Auth0 M2M organization scope: https://auth0.com/docs/manage-users/organizations/organizations-for-m2m-applications — org-scoped M2M capability is plan-dependent and token claims still require API-side authorization.
- Railway service networking: https://docs.railway.com/networking/private-networking and https://docs.railway.com/networking — Railway private mesh is for same-project/environment services; external cloud APIs are not automatically on that private mesh.
- Railway variables: https://docs.railway.com/variables — variables may be available in builds, runtime and CLI environments; **never store KMS private key material**. Review exposure, least privilege and secret access before provisioning.

No verified pricing comparison for Cognito vs Auth0 or AWS KMS request-level costs is included here; no cost estimates or adoption claims should be inferred.

## 4. Required validation before provider approval
1. Independent security owner and reviewer, identity administrator, grant ledger/database owner, key custody owner and privacy/data residency owner named in issue #1054. Formal selection and risk acceptance from authorized decision-maker.
2. Validate OIDC issuer, audience, token type, token expiry, MFA/authn assurance, JWKS trust discovery, malicious JWKS/kid swaps, session and principal revocation with controlled TEST users. Never use Google/GSC OAuth access tokens as operator authorization.
3. Choose precise KMS algorithm and immutable key purpose/ID/version; key region, rotation, disable/revocation, regional operations and independent audit; prefer short-lived cloud credentials to long-lived user-managed secrets, but establish whether Railway supports the chosen credential mechanism.
4. Verify Railway nonproduction → external trust APIs TLS/network egress, access policy and credential custody. Railway internal database traffic alone is not an OIDC/KMS security guarantee.
5. Establish separately administered scoped grants in PostgreSQL, transactionally durable P9 lineage and independent audit custody; deny self-service grants and key rotation.
6. Evaluate provider failure: OIDC/JWKS/KMS outages, malicious token, replay/fork, cross-tenant grant, revoked signer, data-store outage and unknown signing result. Every ambiguity denies authority or quarantines effects.
7. Obtain explicit bounded nonproduction provisioning/credential/egress authorization *after* independent approval. Never infer approval from a GitHub PR merge or generic `continue`.

## 5. Recommended staged integration after human approval
- C2-C1: approved provider and region decisions with named accountable reviewers.
- C2-C2: controlled offline security/algorithm compatibility test vectors with no cloud credentials.
- C2-C3: separate nonproduction identities and KMS keys, scoped credentials, explicit test authorization.
- C2-C4: JWT signature/issuer/audience validation + independently managed grant lookup; KMS signing, verification, replay/nonce and revocation tests.
- C2-D: independent adversarial certification and isolated durable issuance. *No worker claims/dispatch* until C3–C7 controls are separately certified.

## 6. Hard stop
This document does not select Amazon Cognito, Auth0, AWS KMS or Google Cloud KMS for use; does not create any resources, costs, credentials, network connections, production DDL or migrations; does not grant P9 issuance, claims, scheduling, workers, provider sends, public-site mutations or deployments. Existing C2-B deny-only adapters remain unchanged.
