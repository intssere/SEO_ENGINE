# P8.8 W09-C2Z — Railway→Neon binding producer contract

## Status
Repository-only implementation. **No live provenance authority is approved.** No Railway, Neon, database, deployment, configuration, credential, or Production action is authorized.

## Basis
Canonical base: `3165e4055fcbbf2d4aa38a110b9a2fb45f213efd`. C2Y selected Railway runtime + explicitly certified external Neon lineage. C2W remains the independent verifier.

## Contract
Schema `p8-8-w09c2z-producer-v1` joins already-sanitized facts only. Railway inputs are exact project/environment/service/deployment/snapshot, public URL, immutable binding revision, and opaque structural-reference ID/target-resource ID. Neon inputs are provider/project/branch/database/endpoint/timeline/provider-resource identity. Provenance kind/authority and observed-at are carried through but never self-approved.

The producer performs no discovery. Unknown fields and credential-shaped content fail closed before processing.

## Structural reference
`structuralReferenceTargetResourceId` must equal independently supplied `providerResourceId`. This is internal consistency, not proof that either acquisition source is authoritative. A future live producer must obtain the unresolved resource association from a certified non-secret control-plane mechanism.

Rendered `DATABASE_URL`, connection strings, rendered variable maps, credentials, and credential-derived hashes/fingerprints/redactions are forbidden evidence.

## Railway rules
The caller supplies expected project, environment, service, deployment, and snapshot IDs. Exact mismatch fails closed. Deployment status must be `SUCCESS`; binding revision and structural reference are mandatory. C2Z maps `railwayServiceId` to C2W `platformSubjectId` and status to lowercase `success`.

## Neon rules
Provider must be `Neon`. Project, branch, database, endpoint, provider resource, and timeline are mandatory. C2Z v1 deliberately does not use C2W's lineage-continuity escape hatch.

## Provenance separation
C2Z PASS means only that sanitized inputs are complete and cross-consistent. C2W must separately approve provenance kind and authority. Tests prove a C2Z PASS remains `ATTESTATION_PROVENANCE_UNAPPROVED` until C2W receives an external allowlist.

## Stable fail-closed codes
`PRODUCER_OK`, `PRODUCER_SCHEMA_UNSUPPORTED`, `PRODUCER_UNKNOWN_FIELD`, `PRODUCER_CREDENTIAL_SHAPED_INPUT`, `PRODUCER_RAILWAY_IDENTITY_UNPROVED`, `PRODUCER_DEPLOYMENT_NOT_SUCCESS`, `PRODUCER_SNAPSHOT_UNPROVED`, `PRODUCER_BINDING_UNPROVED`, `PRODUCER_REFERENCE_UNPROVED`, `PRODUCER_PROVIDER_MISMATCH`, `PRODUCER_PROVIDER_IDENTITY_UNPROVED`, `PRODUCER_LINEAGE_UNPROVED`, `PRODUCER_CROSS_SIDE_MISMATCH`.

## Live-readiness consequence
C2Z closes the offline schema/join gap, not the acquisition gap. A future milestone must demonstrate an authoritative non-secret Railway structural-reference mechanism and independently authoritative Neon read-only identity mechanism before any provenance authority can be certified. Historical Neon IDs remain candidates, not proof.

## Hard exclusions
No live Railway inventory, variable values/Secrets, staged-patch acceptance, deployment/redeploy, config mutation, logs-as-binding-proof, Neon inspection/mutation, DB/SQL, DDL/DML/migration, Replit mutation, scheduler/worker/provider activation, DNS/cutover, Stage 0, or UGP integration.
