# UGP-11.C1 — Independent Trust Boundary and Threat-Model Decision Record

**Status:** PROPOSED / REVIEW REQUIRED / NOT OPERATIONALLY ADOPTED
**Source baseline:** `initiative-universal-growth-platform` at `d9dc6aaf87da41e3bd7ca4eb5f51e2a234177ac2` (UGP-11 closure audit merged).
**Scope:** architecture-only decision proposal, acceptance contracts and adversarial scenarios. No credentials, routes, migrations, workers, public/provider calls or deployments.

## 1. Evidence and unchanged invariant

Relevant source-backed contracts: `UGP-11-CLOSURE-TRACEABILITY-2026-10-10.md` (C1–C8), `UGP-11.1D12-IDENTITY-KEY-TRUST-CONTRACTS.md` (identity/key denial), `UGP-11.1D14-IDP-TRUST-CONFIG-REVIEW.md` (self-asserted provider configuration), `UGP-11.1D18-REVOCATION-AUTHORITY-REVIEW.md` (caller-provided key cannot establish trust), and `ugp-11-1d6-closed-claim.ts` (fixture-only controls cannot pass `certified_p9` gate).

**Decision boundary:** C1 must define future trust sources, but architectural approval does not elevate D12–D18 evidence or enable P9 issuance, claiming, dispatch, signing, or publication. Retain existing default-deny behavior.

## 2. Candidate architecture decision

**Proposed target pattern, conditional on independent security and operator approval:** centrally governed *identity verification + scoped authorization ledger + managed asymmetric signing service*, all server-side, separated from transport and external effects.

```
independently governed IDP + pinned issuer/audience/key policy
           | authenticated operator identity (NOT permission)
           v
server-side scoped grants + policy engine + dual control where needed
           | approved action + tenant/site + policy/control revision
           v
transactionally durable P9 decision intent + nonce/idempotency
           | managed asymmetric signing with immutable key version
           v
immutable signed decision + authority provenance + revocation snapshot
           | verified by separate policy/claim gate at use-time
           v
atomic P9 durable-control projection + job claim fence
           |
           v
class-specific authorization recheck before ANY dispatch
```

Never trust authorization claims from a browser, queue message, submitted PEM/JWKS, embedded flags, or a transport receipt. User authentication alone does not grant control-action authority. The IDP and key manager must be configured from administrative, independently protected trust sources with auditable change control.

### Decision alternatives (unapproved until validated)

| Option | Benefit | Key risk / tradeoff | C1 disposition |
|---|---|---|---|
| A. Governed OIDC IDP + managed KMS/HSM + internal scoped-grant ledger | Distinct identity, authorization, signing and durable policy controls | Integration complexity, IAM/KMS cost, governance/operational dependence | **Preferred architecture candidate**, not vendor selection |
| B. Self-hosted OIDC + self-managed signer/HSM-backed keys | More hosting/control flexibility | Larger security patch, availability and key-custody burden | Contingency only after documented threat/operational comparison |
| C. Internal JWT/shared-secret or caller-supplied public keys as trust root | Simplest to implement | Circular trust, poor custody/revocation isolation, signer impersonation | **REJECTED** as operational authority |
| D. Delegate P9 authorization to pg-boss or worker messages | Fewer layers | Transport does not attest permission and can replay stale jobs | **REJECTED** |

No IDP vendor, KMS vendor, tenancy model, actual credential holder, region, data-retention term, or monetary expenditure has been selected. Obtain security, privacy, database and accountable operational ownership before C2.

## 3. Non-negotiable trust contracts

**Identity trust:** Pin configured HTTPS issuer, audience, client, accepted algorithms and issuer-controlled JWKS; validate signature, token type, time, subject, tenant binding, authentication strength and revocation/session lifetime server-side. JWKS retrieval, if introduced, needs strict network egress allowlist, redirect denial, DNS/IP anti-SSRF, size ceilings, fail-closed outages, anti-rollback and independently governed key rotation.

**Authorization trust:** Maintain an authoritative server-owned tenant/site/principal/action grant ledger with least privilege; principal must not self-approve grants or change trust configuration. Require explicit second-person approval for high-risk kill-reset, signer/grant promotion or production enablement if policy adopts dual control. Deny missing, stale, cross-tenant, revoked or indeterminate grants.

**Signing trust:** Use non-exportable managed asymmetric private keys; centrally governed key ID/version/algorithm, tenant/site context, purpose separation, issue/revoke/retire epochs and historical verification. Do not accept an event-provided PEM, `kid` alone, caller-declared `approvedBy`, or evidence of an offline fixture signature as the trust source.

**Decision integrity:** Canonical versioned envelopes bind principal, grant revision, tenant/site, action, prior control revision/fingerprint, nonce/idempotency, effective/expiry time, policy digest, signing key version and exact decision fingerprint. Persist and verify under transactionally ordered database locks; reject replay forks; never advance revision on signature validation alone.

**Use-time enforcement:** Job claim/lease and side-effect dispatch require fresh independently verified policy and durable state under atomic fencing; kill > drain > pause > running; uncertain external side effects enter manual intervention, not blind retry. Transport success is not authority.

**Revocation:** An independent, durable, monotonically versioned revocation registry governs key and principal/grant revocation. Maintain emergency disable path and key compromise recovery; ambiguous revocation freshness denies new decisions/claims/dispatch. Historical signatures are evidence, not perpetual live authorization.

## 4. Threat and failure analysis

| Threat / failure | Required defense and test |
|---|---|
| Forged JWKS, `kid` swap or alg confusion | Server-owned issuer/audience/alg allowlist, pinned trust provenance, forged/swap negative tests |
| Caller substitutes a PEM that verifies their own payload | Reject untrusted key material; independently resolve verifier from governed trust registry |
| Stolen operator token | Short-lived assurance, per-tenant grants and session revocation; role/permission change closes promptly |
| Tenant or site ID confused in token, grant or job | Full lineage check at issuance, commit, claim and dispatch; cross-scope requests denied |
| Compromised operator tries self-grant or key rotation | Separation of duties, dual review for sensitive operations, append-only external audit evidence |
| Replay, fork or stale revision | Nonce/idempotency uniqueness, previous-fingerprint continuity, transactional revision locks |
| Key revoked between issuance and claim | Claim-time revocation/policy revalidation; reject stale signer epochs |
| JWKS, IDP, KMS, registry or DB unavailable | Fail closed without fallback to payload assertions or cached positive permission beyond bounded approved windows |
| Pause/kill race after claim but before dispatch | Monotone control epoch and fencing recheck before effect; stop/hold unknown effects |
| Crash after possible provider write or outreach send | Quarantine with manual intervention; no blind transport retry |
| Audit writer privilege or database admin compromises journal | External tamper-evident checkpoint/independent audit custody; DB trigger alone is insufficient |
| Clock skew or expired grants | Authoritative bounded time source, strict expiry and skew limits; deny ambiguous age |
| Emergency trust-root loss | Preapproved break-glass governance and independent investigation; emergency stop without automatic resumption |

## 5. Ownership and independent review gate

Before any C2 positive-authority implementation, name accountable individuals/teams for: IDP configuration and availability, operator RBAC governance, managed signing keys and recovery, database/revision control, privacy/retention, independent security review, and production incident response. Architecture must be reviewed by someone independent from primary implementation. These owners are **not identified or approved in this document**.

Required artifacts: threat model with abuse cases, dependency/license and data-region review, key lifecycle/runbook, provider/service account permissions, dual-control policy, retention/privacy classification, disaster recovery matrix, migration and rollback strategy, auditable change approval, and exact negative acceptance suite.

## 6. C2 entry/exit criteria

**C2 entry requires:** named owner and independent reviewer, approved trust pattern and chosen IDP/KMS implementations, isolated nonproduction scope, approved cryptographic algorithms, explicit source of server-owned trust anchors and role grants, and clear nonproduction key custody policy. Without them, C2 may only implement pure *deny-only* interface contracts and fakes.

**C2 exit proof in isolated environment:** authenticated operator from independently sourced verifier; genuinely server-owned signed and versioned role/grant lookup; tenant/site/action policy checks; independently governed key signature and revocation; durable replay-safe issuance journal; forged/stale/revoked/cross-scope adversarial tests. Even successful C2 certification cannot enable workers until C3–C7 separately pass and appropriate runtime authorizations are explicitly granted.

## 7. Explicit deferrals

No operational signer, live IDP integration, runtime trust registry, positive P9 permission, privileged SQL migration, production DDL/DML, worker dispatch, schedule activation, provider send, public-site mutation, deployment or final UGP-to-main merge is authorized by this architecture PR.

**C1 disposition:** architecture proposal prepared; independent owner/reviewer approval and actual trust-service selection remain OPEN. Do not describe C1 as an approved production design until those decisions are recorded.
