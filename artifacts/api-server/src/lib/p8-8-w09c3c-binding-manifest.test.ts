import assert from "node:assert/strict";
import test from "node:test";
import {
  W09_C3C_EXPECTED_RAILWAY_ENVIRONMENT_ID,
  W09_C3C_EXPECTED_RAILWAY_PROJECT_ID,
  W09_C3C_EXPECTED_RAILWAY_SERVICE_ID,
  buildC3CBindingManifest,
  verifyC3CBindingManifest,
} from "./p8-8-w09c3c-binding-manifest.js";

const valid = {
  railwayProjectId: W09_C3C_EXPECTED_RAILWAY_PROJECT_ID,
  railwayEnvironmentId: W09_C3C_EXPECTED_RAILWAY_ENVIRONMENT_ID,
  railwayServiceId: W09_C3C_EXPECTED_RAILWAY_SERVICE_ID,
  provider: "Neon" as const,
  providerProjectId: "project-synthetic",
  branchId: "branch-synthetic",
  databaseName: "db_synthetic",
  endpointId: "endpoint-synthetic",
  timelineId: "timeline-synthetic",
  providerResourceId: "resource-synthetic",
};

test("C3C builds and verifies a deterministic synthetic desired-state manifest", () => {
  const a = buildC3CBindingManifest(valid);
  const b = buildC3CBindingManifest({ ...valid });
  assert.equal(a.verdict, "PASS");
  assert.equal(b.verdict, "PASS");
  assert.equal(a.manifest?.manifestId, b.manifest?.manifestId);
  assert.deepEqual(verifyC3CBindingManifest(a.manifest), a);
});

test("C3C manifest changes when a non-secret identity field changes", () => {
  const a = buildC3CBindingManifest(valid);
  const b = buildC3CBindingManifest({ ...valid, endpointId: "endpoint-synthetic-2" });
  assert.notEqual(a.manifest?.manifestId, b.manifest?.manifestId);
});

test("C3C rejects the wrong Railway target", () => {
  assert.equal(buildC3CBindingManifest({ ...valid, railwayServiceId: "other" }).code, "MANIFEST_RAILWAY_TARGET_MISMATCH");
});

test("C3C rejects non-Neon provider and missing lineage", () => {
  assert.equal(buildC3CBindingManifest({ ...valid, provider: "Other" as "Neon" }).code, "MANIFEST_PROVIDER_MISMATCH");
  assert.equal(buildC3CBindingManifest({ ...valid, timelineId: "" }).code, "MANIFEST_LINEAGE_UNPROVED");
});

test("C3C recursively rejects credential-shaped material without echo", () => {
  const contaminated = { ...valid, password: "do-not-echo" } as unknown;
  const receipt = verifyC3CBindingManifest(contaminated);
  assert.equal(receipt.code, "MANIFEST_CREDENTIAL_SHAPED_INPUT");
  assert.equal(JSON.stringify(receipt).includes("do-not-echo"), false);
});

test("C3C rejects URLs/hostnames as identity material", () => {
  assert.equal(buildC3CBindingManifest({ ...valid, endpointId: "postgres://user:pass@example.invalid/db" }).code, "MANIFEST_CREDENTIAL_SHAPED_INPUT");
  assert.equal(buildC3CBindingManifest({ ...valid, endpointId: "db.example.com" }).code, "MANIFEST_CREDENTIAL_SHAPED_INPUT");
});

test("C3C rejects unknown fields and manifest tampering", () => {
  const built = buildC3CBindingManifest(valid);
  assert.equal(built.verdict, "PASS");
  assert.equal(verifyC3CBindingManifest({ ...built.manifest, unexpected: "x" }).code, "MANIFEST_UNKNOWN_FIELD");
  assert.equal(verifyC3CBindingManifest({ ...built.manifest, manifestId: "c3c-tampered" }).code, "MANIFEST_ID_MISMATCH");
});

test("C3C manifest is declaration only and contains no deployment/provenance claims", () => {
  const built = buildC3CBindingManifest(valid);
  assert.equal(built.verdict, "PASS");
  const keys = Object.keys(built.manifest ?? {});
  for (const forbidden of ["deploymentId","snapshotId","bindingRevisionId","provenanceAuthority","structuralReferenceTargetResourceId","databaseUrl"]) {
    assert.equal(keys.includes(forbidden), false);
  }
});
