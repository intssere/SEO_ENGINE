import assert from "node:assert/strict";
import test from "node:test";
import {
  MANIFEST_ALGORITHM,
  SOURCE_ARTIFACT_MODE,
  SOURCE_ARTIFACT_SCHEMA,
  sourceManifestSha256,
  verifySourceArtifactProvenance,
  type SourceManifestEntry,
} from "./p8-8-w09c3fa-f6-source-artifact-provenance.js";
import {
  SOURCE_ATTESTATION_ISSUER,
  SOURCE_ATTESTATION_SCHEMA,
} from "./p8-8-w09c3fa-f4-source-attestation.js";

const COMMIT = "a".repeat(40);
const TREE = "b".repeat(40);
const ARTIFACT = "c".repeat(64);
const MANIFEST: SourceManifestEntry[] = [
  { path: "Dockerfile", mode: "100644", size: 12, contentSha256: "d".repeat(64) },
  { path: "package.json", mode: "100644", size: 34, contentSha256: "e".repeat(64) },
];
const MANIFEST_SHA = sourceManifestSha256(MANIFEST)!;
const ATTESTATION = {
  schema: SOURCE_ATTESTATION_SCHEMA,
  repository: "intssere/SEO_ENGINE",
  commitSha: COMMIT,
  treeSha: TREE,
  sourceBranch: "main",
  issuedFrom: SOURCE_ATTESTATION_ISSUER,
};
const ENVELOPE = {
  schema: SOURCE_ARTIFACT_SCHEMA,
  sourceMode: SOURCE_ARTIFACT_MODE,
  repository: "intssere/SEO_ENGINE",
  commitSha: COMMIT,
  treeSha: TREE,
  sourceBranch: "main",
  manifestAlgorithm: MANIFEST_ALGORITHM,
  manifestSha256: MANIFEST_SHA,
  artifactSha256: ARTIFACT,
  sourceAttestation: ATTESTATION,
};
const RECEIPT = {
  projectId: "project-1",
  environmentId: "environment-1",
  serviceId: "service-1",
  deploymentId: "deployment-1",
  snapshotId: "snapshot-1",
  sourceMode: SOURCE_ARTIFACT_MODE,
  artifactSha256: ARTIFACT,
  manifestSha256: MANIFEST_SHA,
};
const CONTEXT = {
  expectedRepository: "intssere/SEO_ENGINE",
  expectedCommitSha: COMMIT,
  expectedTreeSha: TREE,
  expectedSourceBranch: "main",
  expectedProjectId: "project-1",
  expectedEnvironmentId: "environment-1",
  expectedServiceId: "service-1",
};

test("canonical manifest identity is deterministic and order is strict", () => {
  assert.match(MANIFEST_SHA, /^[0-9a-f]{64}$/);
  assert.equal(sourceManifestSha256(MANIFEST), sourceManifestSha256(MANIFEST.map((x) => ({ ...x }))));
  assert.equal(sourceManifestSha256([...MANIFEST].reverse()), null);
  assert.equal(sourceManifestSha256([...MANIFEST, { ...MANIFEST[1] }]), null);
});

test("admits exact detached source artifact provenance and Railway receipt", () => {
  const result = verifySourceArtifactProvenance(MANIFEST, ENVELOPE, RECEIPT, CONTEXT);
  assert.equal(result.result, "pass");
  if (result.result === "pass") {
    assert.match(result.artifactProvenanceId, /^f6-[0-9a-f]{64}$/);
    assert.equal(result.identity.treeSha, TREE);
    assert.equal(result.identity.deploymentId, "deployment-1");
  }
});

test("rejects manifest and artifact receipt mismatch", () => {
  const changed = MANIFEST.map((entry, index) => index ? entry : { ...entry, size: 13 });
  assert.deepEqual(verifySourceArtifactProvenance(changed, ENVELOPE, RECEIPT, CONTEXT),
    { result: "fail_closed", code: "manifest_mismatch" });
  assert.deepEqual(verifySourceArtifactProvenance(MANIFEST, ENVELOPE, { ...RECEIPT, artifactSha256: "f".repeat(64) }, CONTEXT),
    { result: "fail_closed", code: "artifact_mismatch" });
});

test("rejects cross-source attestation replay and source mismatch", () => {
  assert.deepEqual(
    verifySourceArtifactProvenance(MANIFEST, {
      ...ENVELOPE,
      sourceAttestation: { ...ATTESTATION, treeSha: "f".repeat(40) },
    }, RECEIPT, CONTEXT),
    { result: "fail_closed", code: "attestation_mismatch" },
  );
  assert.deepEqual(
    verifySourceArtifactProvenance(MANIFEST, ENVELOPE, RECEIPT, { ...CONTEXT, expectedCommitSha: "f".repeat(40) }),
    { result: "fail_closed", code: "source_mismatch" },
  );
});

test("rejects wrong Railway target and source-mode confusion", () => {
  assert.deepEqual(
    verifySourceArtifactProvenance(MANIFEST, ENVELOPE, RECEIPT, { ...CONTEXT, expectedServiceId: "other-service" }),
    { result: "fail_closed", code: "railway_target_mismatch" },
  );
  assert.deepEqual(
    verifySourceArtifactProvenance(MANIFEST, { ...ENVELOPE, sourceMode: "github_triggered" }, RECEIPT, CONTEXT),
    { result: "fail_closed", code: "invalid_identity" },
  );
});

test("rejects unknown and credential-shaped material", () => {
  assert.deepEqual(
    verifySourceArtifactProvenance(MANIFEST, { ...ENVELOPE, note: "extra" }, RECEIPT, CONTEXT),
    { result: "fail_closed", code: "invalid_shape" },
  );
  assert.deepEqual(
    verifySourceArtifactProvenance(MANIFEST, ENVELOPE, { ...RECEIPT, databaseUrl: "postgresql://user:pass@example.invalid/db" }, CONTEXT),
    { result: "fail_closed", code: "credential_shaped_material" },
  );
});
