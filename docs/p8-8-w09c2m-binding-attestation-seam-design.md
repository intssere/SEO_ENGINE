# P8.8 W09-C2M — Binding attestation seam design and synthetic certification

**Issue:** #614  
**Status:** OFFLINE DESIGN / SYNTHETIC CONTRACT ONLY — NO LIVE OPERATION AUTHORIZED

## 1. Frozen basis

- canonical main at design creation: `0d2ca45b7a3a0975a21f6aad036c648ad694a96d`
- W09-C2K blob: `6175983bb5f1b4ef797d8b6e0b2408e7c78d4a2b`
- W09-C2L blob: `acbebd6bed30e4b6ad427b0ece0133a145e30330`

W09-C2K requires secret suppression before evidence crosses the authoritative platform boundary. W09-C2L establishes that the currently exposed Replit interfaces do not provide the required deployment-bound database identity.

## 2. Options

### Option A — native Replit deployment-binding attestation
A structured Replit control-plane response directly maps the exact deployment to sanitized database resource identity.

**Trust:** strongest.  
**Application code:** none.  
**Secret exposure:** none by contract.  
**Current availability:** not established by available interfaces.

This remains preferred if Replit exposes such a capability later.

### Option B — authoritative platform-side attestation producer + pure repository verifier
A trusted producer on the platform/control-plane side resolves the deployment binding before the credential boundary and emits a strict sanitized object. Repository code verifies only that object.

**Trust:** acceptable only when producer provenance is independently authoritative and deployment-bound.  
**Application code:** pure verifier only.  
**Secret exposure:** forbidden at verifier boundary.  
**Deployability:** depends on a future platform integration capable of producing the object without passing credentials outward.

This is the minimum design selected for certification.

### Option C — application endpoint parses DATABASE_URL
Rejected. The application would receive/observe the secret and derive identity from it. Redaction after retrieval does not satisfy W09-C2K.

### Option D — operator/manual metadata assertion
Rejected. Manual transcription, repository constants, historical receipts, candidate Neon IDs, or Agent prose are not independent deployment-binding proof.

## 3. Trust-boundary architecture

```
Replit authoritative deployment/binding control plane
        |
        | internal lookup; credentials never cross boundary
        v
sanitized attestation producer
        |
        | typed allowlisted identity object only
        v
W09-C2M pure verifier
        |
        | PASS / UNPROVED receipt only
        v
future W09-C2I Side-R receipt
```

The verifier MUST NOT have any interface for a connection string or environment map.

## 4. Sanitized attestation input

The verifier may accept only a closed object with:

- `schemaVersion`
- `provenanceKind`
- `provenanceAuthority`
- `replId`
- `deploymentId`
- `deploymentStatus`
- `publicUrl`
- `bindingRevisionId`
- `provider`
- `providerProjectId`
- `branchId`
- `databaseName`
- `timelineId` when authoritative platform metadata exposes it
- `endpointId`
- `observedAt`

Unknown fields fail closed. The producer must omit fields it cannot authoritatively establish rather than infer them.

## 5. Explicitly forbidden input

The verifier contract has no fields for and must reject credential-shaped contamination including:

- `DATABASE_URL`
- `connectionString`
- `url` when it is a database/credential URL
- `username`
- `password`
- `token`
- `secret`
- `credentials`
- arbitrary environment maps
- raw database hostnames when they contain credential/binding material not certified as sanitized identity
- hashes, encodings, fingerprints, or other derivatives of secret values

No secret may be accepted merely so the verifier can prove that it discarded it.

## 6. Provenance requirements

A syntactically valid object is not enough. PASS requires:

1. provenance kind identifies an approved authoritative platform/control-plane producer;
2. provenance authority is independently bound to Replit, not application code or operator input;
3. `replId` equals the exact target repl;
4. `deploymentId` equals the independently current successful publication observation;
5. the producer asserts the binding association belongs to that exact deployment/revision;
6. required provider identity fields are authoritative, not inferred;
7. attestation is fresh within the future authorization packet's bounded observation window.

Until a concrete producer is separately certified, no provenance value is approved for live PASS.

## 7. Minimum identity for Side-R usability

For the current W09-C2I comparison, Side R remains UNPROVED unless the attestation supplies enough authoritative identity to compare:

- provider = Neon;
- provider project/resource ID;
- branch ID;
- database name;
- endpoint/compute ID;
- timeline/lineage ID when required, or an independently authoritative continuity association sufficient under W09-C2I;
- exact deployment/binding association.

Missing comparison-critical identity fails closed.

## 8. Verifier output

The pure verifier returns only:

- `verdict`: `PASS` or `UNPROVED`;
- `code`: stable fail-closed reason code;
- the allowlisted sanitized identity fields actually verified;
- `freshnessVerdict`;
- `deploymentBindingVerdict`;
- `secretNonObservabilityVerdict`;
- `provenanceVerdict`.

It must not echo unknown input or rejected credential-shaped values.

## 9. Stable UNPROVED codes

At minimum:

- `ATTESTATION_SCHEMA_UNSUPPORTED`
- `ATTESTATION_UNKNOWN_FIELD`
- `ATTESTATION_CREDENTIAL_SHAPED_INPUT`
- `ATTESTATION_PROVENANCE_UNAPPROVED`
- `ATTESTATION_REPL_MISMATCH`
- `ATTESTATION_DEPLOYMENT_MISMATCH`
- `ATTESTATION_DEPLOYMENT_NOT_SUCCESS`
- `ATTESTATION_BINDING_UNPROVED`
- `ATTESTATION_STALE`
- `ATTESTATION_PROVIDER_MISSING`
- `ATTESTATION_PROJECT_MISSING`
- `ATTESTATION_BRANCH_MISSING`
- `ATTESTATION_DATABASE_MISSING`
- `ATTESTATION_ENDPOINT_MISSING`
- `ATTESTATION_LINEAGE_UNPROVED`

## 10. Synthetic certification matrix

Offline tests must prove:

1. complete synthetic authoritative fixture -> PASS;
2. unknown field -> UNPROVED;
3. DATABASE_URL field -> UNPROVED without echo;
4. connection string nested in an otherwise allowed field -> UNPROVED without echo;
5. unapproved provenance -> UNPROVED;
6. wrong repl -> UNPROVED;
7. wrong deployment -> UNPROVED;
8. deployment status other than success -> UNPROVED;
9. missing binding association -> UNPROVED;
10. stale observedAt -> UNPROVED;
11. missing project -> UNPROVED;
12. missing branch -> UNPROVED;
13. missing database -> UNPROVED;
14. missing endpoint -> UNPROVED;
15. lineage unavailable without independently certified continuity -> UNPROVED;
16. verifier performs zero network calls and zero database calls;
17. logs/receipts contain no rejected raw input;
18. deterministic same-input/same-context receipt.

Synthetic provider/project/branch/database/endpoint identifiers must be obviously non-Production fixtures.

## 11. Implementation boundary

W09-C2M certifies the contract and test requirements only.

A later implementation PR may add the pure verifier and synthetic fixtures without live platform access. It must not add:
- environment/secret reads;
- connection-string parsing;
- database clients;
- Replit mutation;
- Neon calls;
- provider calls;
- deployment behavior.

The authoritative producer is a separate platform capability. It must be independently identified and certified before any live Side-R attempt.

## 12. Future gates

1. merge this design after exact-head CI;
2. implement/certify the pure verifier with synthetic fixtures;
3. identify/certify an authoritative producer mechanism;
4. separately authorize any Replit/platform configuration or deployment required for that producer;
5. create a fresh one-shot Side-R authorization packet freezing the exact producer + verifier identities;
6. execute one bounded live Side-R observation;
7. only after Side R PASS, authorize Side N/equality under W09-C2I;
8. only after lineage PASS, return to W09-C2H Gate B/C/D readiness.

Generic continuation authorizes only safe offline engineering. It does not authorize gates 4–8.

## 13. Current decision

Adopt **Option B** as the minimum certifiable architecture while retaining Option A as preferred if a native Replit structured binding-attestation API becomes available.

Do not implement Option C or D.
