import assert from "node:assert/strict";
import test from "node:test";
import {
  P12_2_L10_13F_RECEIPT,
  assertP122L1013FTransitionReceipt,
  p122L1013FTransitionReceiptFingerprint,
} from "./p12-2-l10-13f-production-app-image-transition-receipt.js";

test("L10.13F records the exact successful Production image transition", () => {
  assert.doesNotThrow(() => assertP122L1013FTransitionReceipt());
  assert.equal(P12_2_L10_13F_RECEIPT.patchId, "fe96638e-8cf4-473e-872e-5fb4e3dc5703");
  assert.equal(P12_2_L10_13F_RECEIPT.deploymentId, "11362736-c4ea-43a0-9e4b-f6627acdee24");
  assert.equal(P12_2_L10_13F_RECEIPT.deploymentSnapshotId, "58a72727-79f4-42bb-a5ac-53fb1e52bffc");
  assert.equal(P12_2_L10_13F_RECEIPT.deploymentAttempts, 1);
  assert.equal(P12_2_L10_13F_RECEIPT.deploymentRetries, 0);
  assert.equal(P12_2_L10_13F_RECEIPT.automaticRollbackUsed, false);
});

test("L10.13F binds old and new immutable image digests", () => {
  assert.equal(
    P12_2_L10_13F_RECEIPT.oldImage,
    "ghcr.io/intssere/seo-engine@sha256:30632cc85de834c5dfb2ee6e34c55cab3e68d799ae69be8dcd8c0efa6fc3b283",
  );
  assert.equal(
    P12_2_L10_13F_RECEIPT.newImage,
    "ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2",
  );
});

test("L10.13F proves protected Production topology and no migration/DB action", () => {
  const r = P12_2_L10_13F_RECEIPT;
  assert.equal(r.healthcheckPath, "/api/healthz");
  assert.equal(r.runtime, "V2");
  assert.equal(r.builder, "DOCKERFILE");
  assert.equal(r.railwayDomainTargetPort, 8080);
  assert.equal(r.customDomainCount, 0);
  assert.equal(r.appAttachedVolumeCount, 0);
  assert.equal(r.postgresServiceState, "live");
  assert.equal(r.postgresDeploymentStatus, "SUCCESS");
  assert.equal(r.migration0010Applied, false);
  assert.equal(r.productionDbReadPerformed, false);
  assert.equal(r.productionDbWritePerformed, false);
});

test("L10.13F transition receipt fingerprint is deterministic", () => {
  assert.match(p122L1013FTransitionReceiptFingerprint(), /^[0-9a-f]{64}$/);
  assert.equal(
    p122L1013FTransitionReceiptFingerprint(),
    p122L1013FTransitionReceiptFingerprint(),
  );
});
