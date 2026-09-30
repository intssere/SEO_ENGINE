import assert from "node:assert/strict";
import test from "node:test";
import {
  deploymentSnapshotEvidenceId,
  RAILWAY_TRANSPORT_RECEIPT_SCHEMA,
  RAILWAY_TRANSPORT_MODE,
  verifyRailwayTransportReceipt,
  type RailwayDeploymentReceipt,
  type RailwayTransportIntent,
} from "./p8-8-w09c3fa-f9-railway-transport-receipt.js";

const intent: RailwayTransportIntent = {
  schema: RAILWAY_TRANSPORT_RECEIPT_SCHEMA,
  transportMode: RAILWAY_TRANSPORT_MODE,
  projectId: "project-1",
  environmentId: "env-1",
  serviceId: "service-1",
  manifestSha256: "a".repeat(64),
  artifactSha256: "b".repeat(64),
  inventorySha256: "c".repeat(64),
  entryCount: 3,
  gitignoreEnabled: false,
  railwayignorePresent: false,
  pathAsRoot: true,
};

const receipt: RailwayDeploymentReceipt = {
  schema: RAILWAY_TRANSPORT_RECEIPT_SCHEMA,
  transportMode: RAILWAY_TRANSPORT_MODE,
  projectId: "project-1",
  environmentId: "env-1",
  serviceId: "service-1",
  deploymentId: "deployment-1",
  snapshotId: "snapshot-1",
  sourceAssociation: "deployment_snapshot",
};

test("deployment/snapshot receipt alone fails closed for artifact identity", () => {
  assert.deepEqual(
    verifyRailwayTransportReceipt(intent, receipt),
    { result: "fail_closed", code: "artifact_receipt_unproved" },
  );
});

test("target mismatch fails before any artifact claim", () => {
  assert.deepEqual(
    verifyRailwayTransportReceipt(intent, { ...receipt, serviceId: "other-service" }),
    { result: "fail_closed", code: "target_mismatch" },
  );
});

test("unknown fields and malformed hashes fail closed", () => {
  assert.deepEqual(
    verifyRailwayTransportReceipt({ ...intent, archiveDigest: "d".repeat(64) }, receipt),
    { result: "fail_closed", code: "invalid_shape" },
  );
  assert.deepEqual(
    verifyRailwayTransportReceipt({ ...intent, artifactSha256: "ABC" }, receipt),
    { result: "fail_closed", code: "invalid_shape" },
  );
});

test("credential-shaped material is rejected recursively", () => {
  assert.deepEqual(
    verifyRailwayTransportReceipt({ ...intent, token: "secret-value" }, receipt),
    { result: "fail_closed", code: "credential_shaped_material" },
  );
});

test("deployment/snapshot evidence identity is deterministic but not artifact proof", () => {
  assert.equal(deploymentSnapshotEvidenceId(receipt), deploymentSnapshotEvidenceId({ ...receipt }));
  assert.match(deploymentSnapshotEvidenceId(receipt), /^f9-[0-9a-f]{64}$/);
});
