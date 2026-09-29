# P8.8 W09-C3A — Railway→Neon authoritative acquisition mechanism feasibility certification

## Verdict

**PARTIAL ACQUISITION FEASIBILITY / STRUCTURAL DATABASE BINDING UNAVAILABLE / NEON LIVE IDENTITY UNPROVED / FAIL CLOSED**

C3A certifies that the current Railway control-plane interface can authoritatively provide the deployment side of C2Z without credentials, but cannot expose the unresolved database reference/resource association needed to prove the exact Railway→Neon binding.

Railway documentation proves that reference variables and Infrastructure as Code can structurally express resource relationships. It does not prove the current `seo-engine-shadow` service's `DATABASE_URL` source.

A bounded Neon project-description attempt for the historical candidate project did not yield usable evidence because the connector request was unavailable/authorization-failed. No provider identity is promoted from that failure.

No live C2Z provenance authority is approved.

## Canonical basis

- base main: `81a130a0fa9d3eed69a5af3df24554e1292483ea`
- C2Y selected Railway runtime + explicit external Neon lineage
- C2Z defines the pure Railway→Neon sanitized join
- C2W remains the independent attestation verifier

## Current Railway observations

Read-only Railway control-plane observation confirms:
- project ID `52265e29-921b-4652-ac0d-9da4e5e69936`;
- environment ID `7f8d920f-f6c6-44f0-b9fe-252cb4f32298`, label `production`;
- service ID `1e8c1e7d-16f7-4c63-8193-1021bcbe6d90`, `seo-engine-shadow`;
- source repository `intssere/SEO_ENGINE`, branch `main`;
- Dockerfile deployment configuration and healthcheck `/api/healthz`;
- a variable named `DATABASE_URL` exists, but its value/reference expression is omitted;
- staged patch remains present and includes staged `AUTH_PUBLIC_ORIGIN`; C3A did not accept or alter it.

The deployment list also observed an automatically created deployment for canonical C2Z commit `81a130a0fa9d3eed69a5af3df24554e1292483ea`, deployment ID `546cb8af-9fe8-4f4e-bdda-1321d71becaf`, in `WAITING` state at observation time with no snapshot yet. C3A did not trigger, approve, cancel, or modify this deployment. A WAITING deployment is not eligible for C2Z/C2W PASS.

## Railway documentation capability evidence

Railway documentation states that:
- reference variables may target another service with syntax conceptually `${{SERVICE_NAME.VAR}}`;
- a service may therefore define `DATABASE_URL` from another service's `DATABASE_URL`;
- Infrastructure as Code can represent a database resource and set an application environment field from the database resource's environment output;
- changing variables creates staged changes requiring review/deploy;
- sealed variable values are intentionally not retrievable through API/CLI surfaces.

These are platform capabilities, not current binding evidence.

## Current connector boundary

### Safe and authoritative now
Current non-secret control-plane operations can supply:
- Railway project ID;
- environment ID;
- service ID;
- deployment ID;
- deployment status;
- deployment snapshot ID when present;
- Git commit/branch metadata associated with a deployment;
- public URL when present;
- service configuration excluding variable values;
- variable names;
- staged-patch existence/metadata.

### Capability only
Railway supports structural reference variables and IaC resource relationships, but the currently available read-only service-config result does not return the unresolved expression/source resource for the current `DATABASE_URL`.

### Forbidden for C3A evidence
`list_variables` is documented to return fully rendered values for session/token authentication and may expose credentials. It must not be called merely to infer the binding. A rendered value must not be parsed, redacted, hashed, fingerprinted, or transformed into identity evidence.

Runtime environment inspection and application logs are also not substitutes for control-plane structural binding metadata.

## C2Z field acquisition matrix

| C2Z input | Current classification | Reason |
| --- | --- | --- |
| railwayProjectId | AUTHORITATIVE_NOW | Railway project control plane |
| railwayEnvironmentId | AUTHORITATIVE_NOW | Railway environment control plane |
| railwayServiceId | AUTHORITATIVE_NOW | Railway service control plane |
| railwayDeploymentId | AUTHORITATIVE_NOW | Railway deployment record |
| railwayDeploymentStatus | AUTHORITATIVE_NOW | Railway deployment record |
| railwaySnapshotId | AUTHORITATIVE_NOW_WHEN_PRESENT | Railway deployment record; absent for current WAITING deployment |
| railwayPublicUrl | AUTHORITATIVE_NOW_WHEN_PRESENT | Railway deployment/domain metadata |
| railwayBindingRevisionId | UNAVAILABLE_FOR_REQUIRED_SEMANTICS | snapshot alone does not expose the DB reference source |
| structuralReferenceId | UNAVAILABLE | current safe connector omits unresolved reference expression/source |
| structuralReferenceTargetResourceId | UNAVAILABLE | current safe connector does not identify target resource behind DATABASE_URL |
| provider | CAPABILITY_ONLY | C2Y selected Neon architecturally; current binding is not proven |
| providerProjectId | LIVE_IDENTITY_UNPROVED | historical candidate exists; current Neon lookup yielded no usable evidence |
| branchId | LIVE_IDENTITY_UNPROVED | historical candidate only |
| databaseName | LIVE_IDENTITY_UNPROVED | historical candidate only |
| timelineId | LIVE_IDENTITY_UNPROVED | historical candidate only |
| endpointId | LIVE_IDENTITY_UNPROVED | historical candidate only |
| providerResourceId | UNAVAILABLE | no authoritative cross-control-plane resource identifier currently joins Railway reference to Neon |
| observedAt | AUTHORITATIVE_CALLER_INPUT | must be explicit and freshness-bounded |
| provenanceKind | NOT_APPROVED | cannot self-approve |
| provenanceAuthority | NOT_APPROVED | cannot self-approve |

## Neon-side feasibility

The available Neon connector contains read-only control-plane operations capable in principle of describing projects, branches, databases, endpoints/computes, and snapshots without using a connection string.

However, C3A's bounded attempt to describe historical candidate project `late-sunset-42762033` returned no usable project evidence because the request was unavailable/authorization-failed. The failure does not establish absence of the project and does not certify any historical identity.

C3A does not retry automatically and does not fall back to connection strings, SQL, schema similarity, or historical constants.

## Minimum acceptable Railway acquisition mechanism

One of the following must exist before Railway-side provenance can be certified:

1. an authoritative read-only Railway API/connector operation that returns the **unresolved** variable/reference expression or equivalent source-resource association without rendered values; or
2. an immutable Railway IaC declaration that is itself tied by authoritative deployment metadata to the exact successful deployment/snapshot, where the declaration identifies the external Neon resource through a non-secret stable resource identifier; plus proof that no out-of-band variable override supersedes it; or
3. a Railway-produced signed/sanitized attestation exposing exact deployment/snapshot → binding revision → structural reference → provider resource identity.

A repository IaC file alone is insufficient unless Railway independently proves that exact deployed configuration consumed it and that no runtime/staged override changes the binding.

## Minimum acceptable Neon acquisition mechanism

A separately authorized read-only provider observation must establish:
- exact Neon project;
- exact branch;
- exact database;
- exact endpoint/compute;
- exact timeline/lineage or separately certified continuity;
- current resource state;
- stable provider-side resource identity suitable for comparison with the Railway structural target.

No connection string is needed or accepted.

## Cross-side join requirement

C2Z may be invoked live only when:
1. Railway independently emits the structural target resource ID for the exact successful deployment/config revision;
2. Neon independently emits the matching provider resource ID and lineage;
3. neither acquisition observes credential material;
4. freshness is bounded;
5. provenance mechanisms are separately certified;
6. C2Z exact join passes;
7. C2W independently approves provenance and passes.

## Fail-closed conclusion

The current state cannot satisfy items 1 or 2 simultaneously. Therefore:

**DO NOT construct a live C2Z input from current evidence.**

Do not infer the binding from:
- existence of a `DATABASE_URL` variable name;
- service co-location;
- Railway Postgres presence;
- historical Neon identifiers;
- hostnames or connection details;
- repository configuration alone;
- successful application connectivity;
- schema/table similarity.

## Next milestone

The next safe repository milestone is **W09-C3B — explicit Railway→Neon IaC binding design**.

C3B should design a future explicit, reviewable Railway configuration where the database binding is declared structurally rather than entered as an opaque rendered URL, while keeping the existing staged patch and live Railway state untouched.

The design must include:
- immutable resource/reference identity;
- deployment/snapshot pinning;
- out-of-band override detection;
- secret separation;
- rollback;
- transition from the current Railway-managed Postgres shadow resource;
- no activation until a separate mutation authorization.

## Hard exclusions

No `list_variables`, rendered variable values, Secrets, runtime env dump, connection string, DB session, SQL, DDL/DML/migration, staged-patch acceptance/discard, Railway deployment/redeploy/cancel, service/config mutation, Neon mutation, Replit mutation, scheduler/worker/provider activation, DNS/cutover, Stage 0, or UGP integration.
