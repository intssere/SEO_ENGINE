# UGP-11.C2 — Trust-Service Selection and Accountable Review Gate

**Baseline:** `initiative-universal-growth-platform` `82415d4a5ee645565a72416253d501d8833eefbf` (C2 denial-only increment merged).
**Decision:** NOT APPROVED. No production or nonproduction trust service has been selected, integrated or authorized by this document.

## Source observations

- `UGP-11-C1-INDEPENDENT-TRUST-ARCHITECTURE-ADR.md` proposes separated server-governed OIDC identity, scoped authorization, and KMS/HSM signing; explicitly leaves ownership and vendors open.
- `UGP-11-C2-DENY-ONLY-CONTROL-ISSUER-CONTRACT.md` states no independent identity/key registry, authorization grant owner, or certified positive issuance.
- `artifacts/api-server/src/lib/ugp-11-c2-denied-control-issuer.ts` and its tests continue to deny `issuanceAllowed`, `claimAllowed`, and `dispatchAllowed`.
- Repository includes OAuth infrastructure (`artifacts/api-server/src/lib/oauth.ts`, `packages/oauth-connection-manager`) and auth-security middleware. **Existence does not certify a P9 operator IDP, trustworthy signing authority, or operational issuer authorization.** Do not repurpose Google/Search Console OAuth client credentials as privileged P9 issuer identity.

## Decision matrix: providers remain candidates

| Trust function | Candidate architecture classes | Mandatory selection evidence | Status |
|---|---|---|---|
| Operator identity | Managed OIDC enterprise IdP; existing enterprise SSO only if tenant/issuer boundaries prove compatible | Exact issuer, audience, JWKS, auth assurance, revocation/session policy, admin roles, lifecycle, tenant isolation, regional processing, verified available integration path | UNSELECTED |
| Key custody and signing | Managed cloud KMS/HSM asymmetric signing; independently reviewed self-hosted HSM only with operations capability | Non-exportable keys, purpose-separated key policies, key version, revoke/disable and audit trail, incident rotation, regional residency, signed artifact verification and outage behavior | UNSELECTED |
| Authoritative grants | SEO ENGINE-owned database permission ledger with independent administration and audit custody | Scope/action/tenant/site, grant revision, separation of duties, immutable provenance, revocation freshness, transaction ordering, fail-closed queries | DESIGN REQUIRED |
| Independent audit | Append-only evidence with externally protected checkpoints | Independent custody, retention, PII classification, tamper indicators, access audit, incident export | DESIGN REQUIRED |
| Policy decision control | Application-owned P9 policy engine, not queue vendor | Non-bypassable check at issuance, claim, and dispatch; kill-latch precedence and quarantine | DESIGN REQUIRED |

**Not adopted:** caller-supplied public keys, self-asserted approval flags, transport receipts, shared-secret JWTs used as standalone root, an OAuth access token to a content/search provider, or a database trigger as sole independent audit guarantee.

## Evidence to obtain before choosing providers

1. Governance: named accountable owner for identity/SSO, scope/grants, signer/KMS, database controls, security review, privacy/retention, incident response. Independent reviewer must not be the primary implementer. Record their approval in a distinct issue/PR review or authorized change record.
2. Threat model: key compromise, forged JWKS, stolen operator token, self-grant, cross-tenant/site confusion, replay/fork, stale revocation, identity provider outage, KMS outage, database failure, emergency kill and uncertain external effects.
3. Compatibility and costs: existing hosting runtime, network egress restrictions, service regions, version/dependency licensing, KMS request throughput, key availability, operational support and vendor portability.
4. Security: exact issuer/audience allowlists controlled outside end-user inputs; provenance-bound JWKS with SSRF/redirect protections; asymmetric signature validation; signing-key policy; emergency disable; least-privilege IAM; audit log export.
5. Privacy and controls: data classes sent to each service, consent, retention/deletion and access rules, backup/recovery, operator approval for high-risk decisions.
6. Certification: isolated, governed **test** identity, grants and signing service; forged/stale/revoked/scope-mismatched tests; concurrent issuance nonce, signature/key rotation and rollback; no operational claimant until C3–C7 complete.

## Proposed implementation order (conditional, no positive authority)

- **C2-A — decision approval:** Obtain named reviewers, architecture selection, risk acceptance and an exact identity/KMS compatibility record. Document the administrative trust source and accountable administrator. Stop if absent.
- **C2-B — provider-neutral ports:** Implement read-only verifier, governed grant resolver, managed signer and revocation registrar interfaces, with local deny-only fakes. Explicitly segregate authentication from authorization and signing. No privileged provider calls.
- **C2-C — independent nonproduction integration:** Only under separately approved scope, configure controlled test tenant and managed keys, implement fail-closed identity and grant checks plus auditable issuance. Do not use any production account or credentials by default.
- **C2-D — certification:** Cross-tenant, malicious `kid`, stale/revoked identity/key, concurrent lineage, outage and conflict tests; independent review. Positive issuance cannot itself grant worker claims or dispatch.

## Acceptance and refusal conditions

Until the named owner and independent reviewers approve the architecture, identity provider, key service, and scoped governance system, **C2 remains OPEN** and all positive P9 issuance is NOT_GRANTED. Existing D12–D18/C2 fixture semantics must remain fail closed. Pure planning/contract work may continue, but C3–C7 cannot be presented as runtime certified.

This PR makes no implementation, migrations, credentials, outbound provider connections, workers, schedulers, deployment, public-site writes, provider sends, or production changes.
