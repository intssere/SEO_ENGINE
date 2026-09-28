# P8.8 W09-C2P — Replit authoritative binding-attestation request and acceptance contract

**Issue:** #620  
**Status:** OFFLINE EXTERNAL-CAPABILITY REQUEST CONTRACT — NOT SUBMITTED

## 1. Frozen basis
- canonical main: `e3d13990c38a10a9c738c382e4e343745c28d159`
- W09-C2O blob: `f0a54ace7273372b4803aaa8b3a17bdddb218ad8`
- W09-C2N verifier blob: `1144fabecc1a994336e4f52af53729f67fe84491`

## 2. Exact platform question

Can Replit provide a structured, read-only, authoritative operation that, given an exact Replit application/repl ID and an exact successful deployment/publication ID, resolves the Production database resource **actually bound to that deployment** and returns only non-credential identity metadata, without exposing, reading, returning, hashing, parsing, or otherwise deriving the result from a credential outside Replit's authoritative control-plane boundary?

A conceptual operation is:

`GetDeploymentDatabaseBinding(replId, deploymentId)`

This name is illustrative; any native API, trusted platform integration, or Replit-generated signed manifest is acceptable if it satisfies this contract.

## 3. Required semantics

The response must describe actual binding, not intended configuration.

Replit must resolve the association from its authoritative deployment/binding metadata. The caller must not supply provider project, branch, database, endpoint, timeline, connection string, hostname, or resource identity as assertions to be echoed back.

The operation must be read-only and must not:
- alter deployment configuration;
- republish/redeploy/restart;
- rotate credentials;
- create/change database resources;
- connect to the database;
- execute SQL;
- mutate provider state.

## 4. Required sanitized response

The qualifying surface must make it possible to populate:
- `schemaVersion`;
- `provenanceKind`;
- `provenanceAuthority`;
- `replId`;
- `deploymentId`;
- `deploymentStatus`;
- `publicUrl`;
- `bindingRevisionId`;
- `provider`;
- `providerProjectId`;
- `branchId`;
- `databaseName`;
- `timelineId`, when directly exposed by authoritative metadata;
- `endpointId`;
- `observedAt`.

If lineage is represented by a different immutable provider/control-plane association instead of `timelineId`, Replit should identify that field and its continuity semantics.

## 5. Credential non-observability

The response and audit path must never include:
- DATABASE_URL;
- connection strings;
- username/password;
- tokens;
- secrets;
- arbitrary environment maps;
- credential-bearing URLs;
- hashes, fingerprints, encodings, or derivatives of credentials.

It is not acceptable to return a credential and instruct the caller to redact it.

## 6. Provenance evidence requested

For certification, Replit should identify:
1. the API/control-plane surface or integration producing the response;
2. why it is authoritative for the deployment binding;
3. whether resource identity is resolved from internal binding metadata rather than caller assertions;
4. whether the operation can return credential material;
5. whether `bindingRevisionId` changes when the bound database resource changes;
6. how deployment ID and binding revision are associated;
7. whether the response is point-in-time/fresh and how `observedAt` is defined;
8. what happens for no binding, ambiguous binding, stale deployment, unsupported provider, or unavailable metadata.

## 7. Required fail-closed behavior

The platform operation should return a non-success state such as:
- `NOT_BOUND`;
- `AMBIGUOUS`;
- `UNAVAILABLE`;
- `UNSUPPORTED`;
- `DEPLOYMENT_NOT_FOUND`;

rather than falling back to a secret, inferred hostname, operator-entered identity, or application environment.

## 8. Acceptance matrix

### ACCEPTABLE
A. Native Replit control-plane API returning sanitized deployment-bound resource identity.

B. Replit-supported broker/integration that resolves the binding internally and exposes only the sanitized object.

C. Replit-generated, signed, immutable deployment manifest whose database identity fields originate from authoritative binding metadata.

### CONDITIONAL
A surface lacking `timelineId` may proceed to separate review only if Replit provides an authoritative immutable continuity identifier whose semantics can satisfy W09-C2I.

### REJECT
- DATABASE_URL or Secrets retrieval;
- connection-string parsing/redaction;
- app endpoint/process environment inspection;
- shell inspection;
- operator-entered project/branch/database/endpoint IDs;
- repository/GitHub configuration asserting expected IDs;
- natural-language Agent answers;
- Neon lookup without the Replit-side association;
- a response that cannot prove exact deployment binding.

## 9. Certification procedure after a positive answer

A positive vendor answer does not itself authorize live use.

Before live execution:
1. document the exact producer/API and immutable version/contract;
2. map its output to the W09-C2N closed schema;
3. certify provenance kind and authority;
4. add synthetic adapter tests if transformation is required;
5. prove credential-shaped fields cannot cross the adapter boundary;
6. freeze freshness and deployment-binding rules;
7. create a one-shot Side-R authorization packet naming the exact producer and verifier identities;
8. obtain explicit authorization;
9. perform exactly one bounded read-only Side-R observation;
10. fail closed on any mismatch, ambiguity, secret exposure, or unsupported field.

## 10. Copy-ready request to Replit

We need a read-only, authoritative way to attest which Production database resource is actually bound to a specific Replit deployment, without retrieving or inspecting DATABASE_URL, Secrets, or any credential.

Given a Replit application/repl ID and a successful deployment ID, can Replit expose a structured control-plane API, supported integration, or Replit-signed deployment manifest that returns only non-secret binding identity such as: deployment ID/status, binding revision/association ID, database provider, provider project/resource ID, branch ID, database name, endpoint/compute ID, lineage/timeline ID (or equivalent immutable continuity identifier), and observation timestamp?

The identity must be resolved by Replit from the deployment's authoritative binding metadata rather than supplied by the application/operator. Missing or ambiguous binding data should fail closed instead of returning a connection string or inferred identity.

If such a capability exists, please provide its official name/API/documentation, authentication/scopes, exact response fields, whether it can ever return credentials, and the semantics connecting deployment ID, binding revision, and database resource identity.

## 11. Current state

Until this request receives a qualifying answer and that mechanism is independently certified:
- no live C2N provenance authority is approved;
- W09-C2I Side R remains UNPROVED;
- W09-C2J/C2I must not be retried;
- Side N must not be used as a substitute for Side R;
- W09-C2H remains blocked;
- real Production Stage 0 remains blocked.

Submitting this request to Replit, enabling any integration, changing platform configuration, or executing a live attestation requires separate explicit authorization.
