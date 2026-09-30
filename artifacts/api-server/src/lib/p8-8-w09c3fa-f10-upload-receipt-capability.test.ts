import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateRailwayUploadReceiptCapability,
  RAILWAY_UPLOAD_RECEIPT_CAPABILITY_SCHEMA,
} from "./p8-8-w09c3fa-f10-upload-receipt-capability.js";

const common = {
  schema: RAILWAY_UPLOAD_RECEIPT_CAPABILITY_SCHEMA,
  authority: "railway" as const,
  deploymentId: "deployment-1",
  snapshotId: "snapshot-1",
};

test("absence fails closed", () => {
  assert.deepEqual(evaluateRailwayUploadReceiptCapability(null), {
    result: "fail_closed", code: "capability_absent",
  });
});

test("Railway authoritative archive digest capability passes structurally", () => {
  assert.deepEqual(evaluateRailwayUploadReceiptCapability({
    ...common,
    capability: "archive_digest",
    digestAlgorithm: "sha256",
    digest: "a".repeat(64),
    canonicalization: "railway-source-archive-v1",
  }), { result: "pass", capability: "archive_digest" });
});

test("Railway authoritative source manifest capability passes structurally", () => {
  assert.deepEqual(evaluateRailwayUploadReceiptCapability({
    ...common,
    capability: "source_manifest",
    manifestDigestAlgorithm: "sha256",
    manifestDigest: "b".repeat(64),
    manifestFormat: "railway-source-manifest-v1",
  }), { result: "pass", capability: "source_manifest" });
});

test("Railway authoritative source artifact resource capability passes structurally", () => {
  assert.deepEqual(evaluateRailwayUploadReceiptCapability({
    ...common,
    capability: "source_artifact_resource",
    resourceId: "artifact-1",
    resourceDigestAlgorithm: "sha256",
    resourceDigest: "c".repeat(64),
  }), { result: "pass", capability: "source_artifact_resource" });
});

test("self-asserted/non-Railway authority fails closed", () => {
  assert.deepEqual(evaluateRailwayUploadReceiptCapability({
    ...common,
    authority: "seo-engine",
    capability: "archive_digest",
    digestAlgorithm: "sha256",
    digest: "a".repeat(64),
    canonicalization: "railway-source-archive-v1",
  }), { result: "fail_closed", code: "non_railway_authority" });
});

test("unknown fields, weak digest, or credentials fail closed", () => {
  assert.deepEqual(evaluateRailwayUploadReceiptCapability({
    ...common,
    capability: "archive_digest",
    digestAlgorithm: "sha256",
    digest: "a".repeat(64),
    canonicalization: "railway-source-archive-v1",
    claimedByRunner: true,
  }), { result: "fail_closed", code: "invalid_capability" });

  assert.deepEqual(evaluateRailwayUploadReceiptCapability({
    ...common,
    capability: "archive_digest",
    digestAlgorithm: "sha256",
    digest: "abc",
    canonicalization: "railway-source-archive-v1",
  }), { result: "fail_closed", code: "invalid_capability" });

  assert.deepEqual(evaluateRailwayUploadReceiptCapability({
    ...common,
    capability: "archive_digest",
    digestAlgorithm: "sha256",
    digest: "a".repeat(64),
    canonicalization: "railway-source-archive-v1",
    token: "secret-value",
  }), { result: "fail_closed", code: "credential_shaped_material" });
});
