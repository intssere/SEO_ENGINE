# UGP-4.4 — Future Site Agent Specification

**Status:** specification only; no implementation authority.

## 1. Purpose and entry condition

The Future Site Agent is a last-resort connector lane for a customer-controlled environment that cannot be safely supported through the Public Web, Native API, MCP, OpenAPI, or Git connector lanes. The existing universal connector kind `site_agent` is reserved for this purpose.

No runtime agent may be implemented merely because this specification exists. Implementation requires all of:

1. a documented real environment that cannot be supported through the existing connector lanes;
2. an approved threat model and security review;
3. a separately reviewed protocol/cryptography design and dependency review;
4. explicit implementation authorization;
5. a certification plan preserving the universal capability and authorization boundaries.

## 2. Non-goals and permanent prohibitions

A Site Agent is **not** a remote shell, RCE surface, generic automation daemon, plugin host, deployment system, credential broker, or unrestricted site administrator.

The protocol MUST NOT expose:

- arbitrary shell or command execution;
- arbitrary code, script, module, package, plugin, template, or binary upload/execution;
- unrestricted filesystem, network, database, process, environment-variable, secret, or credential access;
- generic HTTP proxying or arbitrary URL fetch;
- wildcard site, account, tenant, resource, or capability scope;
- capability discovery that self-grants authority;
- capability self-escalation or agent-selected authorization;
- scheduler/autonomous recurring execution;
- agent-originated publication authority;
- any path that bypasses SEO ENGINE policy, preflight, authorization, verification, or rollback controls.

Unknown operations, capabilities, resources, signatures, versions, keys, state, or side effects MUST fail closed.

## 3. Trust and identity model

The Site Agent MUST bind to one existing `UniversalSiteIdentity` and one exact `UniversalConnectionIdentity`. The connection provider and mode identify the certified agent installation; all resource locators MUST preserve the same site and connection lineage.

The agent has a stable `agentId`, protocol version, installation identity, and signing-key identity. Key material is never carried in capability manifests or requests. Public verification-key identity is explicit and rotatable.

The agent MUST NOT infer or substitute another site, tenant, connection, resource, or key identity.

## 4. Signed capability manifest

Before any operation can be considered, the installed agent exposes a signed manifest containing only descriptive availability:

```text
manifestVersion
protocolVersion
agentId
siteId + siteIdentityFingerprint
connectionId + connectionIdentityFingerprint
signingKeyId
manifestSequence
issuedAt / notBefore / expiresAt
capabilities[]:
  universalCapability
  resourceKinds[]
  operationName
  maxOperationsPerRequest
  maxPayloadBytes
  verificationAssurance
  rollbackAssurance
manifestFingerprint
signature
```

The manifest MUST map every operation to an existing universal capability and bounded resource kinds. Manifest presence means availability only. It MUST NOT grant authorization, provider-write authority, public-site-write authority, or automatic execution.

Mutation capability advertisement MUST declare verification support and rollback support/absence exactly. Unsupported rollback may be permitted only where the higher-level policy explicitly allows that mutation class.

## 5. Signature and key lifecycle requirements

A future implementation MUST use a reviewed modern signature scheme and canonical signed representation. This specification intentionally does not select an algorithm or cryptographic library.

Every signed object MUST bind its object type, protocol version, agent/site/connection identity, signing-key ID, complete normalized payload, and object fingerprint. Signature confusion across object types or protocol versions MUST be impossible.

The design MUST support key rotation and revocation. Revoked, unknown, expired, not-yet-valid, or identity-mismatched keys fail closed. Rotation MUST NOT silently expand capabilities or site scope.

## 6. Request envelope and replay protection

Every operation request MUST be a bounded signed/attested envelope containing:

```text
requestVersion
operationName
agentId
site/connection fingerprints
capability
target resource locator fingerprint
manifest fingerprint + sequence
authorization reference (required for external mutation)
expected state fingerprint (required for mutation)
payload/artifact fingerprint
idempotency key
nonce
issuedAt / notBefore / expiresAt
request fingerprint
```

Validity windows are short and bounded. Nonces are single-use within their validity domain. The receiver MUST durably or equivalently enforce replay resistance before a mutation implementation can be certified.

The idempotency key binds the exact normalized operation. Reuse with a different request fingerprint, target, authorization, expected state, or payload MUST fail closed.

## 7. Read semantics

Reads are limited to manifest-advertised existing universal read capabilities and exact resource scope. Responses MUST include observed resource/state identity, observation time, evidence fingerprint, request fingerprint, and agent/site/connection lineage.

A read response is evidence, not authorization.

## 8. Mutation semantics

A mutation request is admissible only when all of the following match exactly:

- current non-revoked signed manifest and sequence;
- site, connection, capability, and resource lineage;
- a valid SEO ENGINE `UniversalAuthorizationReference`;
- the authorization capability, resource locator, and operation fingerprints;
- current expected state fingerprint;
- bounded payload/artifact fingerprint;
- unused nonce and exact idempotency identity;
- unexpired validity window.

The agent MUST NOT broaden a requested mutation, select additional resources, reinterpret a capability, or perform an undeclared side effect.

One authorized request produces at most one bounded mutation attempt.

## 9. Receipts, verification, and rollback

Every mutation attempt MUST produce an auditable receipt binding request, authorization, manifest, target, pre-state, reported post-state, timestamps, idempotency identity, and provider/local result identity. A receipt is not proof of success.

Certified mutation classes require independent read-after-write verification through the universal verification contract. Until verification succeeds, the mutation remains reported/unverified.

Where rollback is supported, rollback is a distinct authorized operation bound to the original receipt and an exact restore-state fingerprint. Rollback MUST be independently verified. Rollback support MUST never be inferred from a generic write capability.

## 10. Drift, uncertainty, and partial failure

The agent MUST reject execution when the manifest sequence changes, target state drifts from the expected fingerprint, authorization expires, resource lineage changes, key state is uncertain, replay state cannot be established, or operation side effects cannot be bounded.

Timeout or transport uncertainty after dispatch MUST NOT trigger blind retry. Resolution requires idempotency/receipt reconciliation and observed state before another mutation can be considered.

## 11. Version negotiation

Protocol and manifest versions are explicit allowlists. No permissive downgrade is allowed. Unsupported versions fail closed. A version upgrade that changes signed fields, capability semantics, authorization binding, replay behavior, or side-effect semantics requires recertification.

## 12. Audit requirements

Future implementations MUST emit correlation-safe audit evidence sufficient to reconstruct:

- manifest/key identity used;
- exact request and authorization fingerprints;
- nonce/idempotency disposition;
- pre-state and post-state observations;
- receipt and verification result;
- rollback request/result where applicable;
- rejection reason without secret leakage.

Audit records do not contain private keys, bearer credentials, raw secrets, or unnecessary customer content.

## 13. Deployment and isolation requirements

A future agent must run with least privilege in a customer-controlled trust boundary. Its runtime identity, storage, network destinations, and secret access are independently bounded. The agent must not expose a general inbound administrative surface.

Installation, updates, signing-key provisioning, runtime sandboxing, egress policy, and software-supply-chain attestation require their own implementation design and certification; none are authorized by UGP-4.4.

## 14. Relationship to existing UGP contracts

The Site Agent MUST reuse, not replace:

- universal site/connection/resource identity;
- universal capability registry semantics;
- universal connector request/receipt/verification/rollback contracts;
- SEO ENGINE policy and authorization;
- exact state fingerprints and read-before-write;
- independent verification and fail-closed uncertainty handling.

`connectorKind: "site_agent"` identifies transport class only. It conveys no capability or authority.

## 15. UGP-4.4 certification boundary

UGP-4.4 is complete when this specification and continuation handoff are reviewed, exact-head CI is green, and the scoped documentation PR is explicitly authorized and merged.

UGP-4.4 deliberately ships **zero** Site Agent runtime code, client/server transport, cryptographic implementation, dependencies, credentials, persistence, migrations, schedulers/workers, external calls, provider/public-site writes, deployment, or publication.
