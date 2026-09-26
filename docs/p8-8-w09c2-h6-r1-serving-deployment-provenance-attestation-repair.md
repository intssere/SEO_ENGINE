# P8.8 W09-C2 H6-R1 — Serving deployment provenance attestation repair

## Failure repaired
The first authorized H6 attestation failed closed with `SERVING_DEPLOYMENT_PROVENANCE_BINDING_UNAVAILABLE`: H5 deployment build logs proved provenance generation and verification ran, but did not expose the deployed artifact fields and the running API had no non-secret attestation surface.

## Contract
`GET /api/provenance` is a public, read-only build-attestation endpoint. It is mounted before application authentication because H6 must be able to attest the deployed bytes independently of user/session state.

The endpoint reads exactly the co-packaged `dist/build-provenance.json` path derived from the API module location. It accepts no file/path input and performs no fallback to environment identity, Git, workspace files, historical deployment metadata, Railway, UGP, database state, or provider state.

The artifact is parsed through the certified W09-C2F parser, which reconstructs the identity projection and validates the SHA-256 provenance fingerprint. Success returns only:
- result/code;
- attestation contract version;
- provenance schema version;
- canonical commit SHA;
- canonical tree SHA;
- source branch;
- generated-at-build timestamp;
- provenance fingerprint.

Missing/unreadable artifact returns HTTP 503 with `artifact_unavailable`. Malformed, wrong-shape/schema, or fingerprint-invalid artifact returns HTTP 503 with `artifact_invalid`. No raw artifact bytes or exception details are returned.

## Authoritative deployment binding
The endpoint proves the provenance of the artifact co-packaged with the running API build. H6 certification must independently verify the Replit current deployment ID/status immediately around the bounded request and require the returned commit/tree/branch/fingerprint to match the separately authorized canonical identity. A Replit deployment ID is intentionally not embedded into the source provenance artifact.

## Tests
Deterministic tests require:
- valid artifact passes and is returned unchanged through the allowlist;
- missing artifact fails closed;
- malformed/tampered fingerprint fails closed;
- artifact path resolves only to the fixed co-packaged dist location.

Production bundle verification requires the route contract/version and source-map files to be present.

## Absolute prohibitions
This repair does not authorize or implement Production source sync, build, deployment, publication/republication/restart, DATABASE_URL/binding access, W09-C2E parser invocation, SQL/catalog/database sessions, migrations 0005/0006/0007, provider/public-site execution, persistence, credentials/config changes, scheduler/worker activation, W09-C Stage 0, W10, Railway mutation, or UGP reconciliation/merge.

## Merge gate
Merge only after exact-head CI passes, current-main ancestry and changed-file scope are reverified, review threads are clear, and the user explicitly authorizes the exact PR merge.
