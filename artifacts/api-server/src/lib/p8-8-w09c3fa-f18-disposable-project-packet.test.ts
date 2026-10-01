import assert from "node:assert/strict";
import test from "node:test";
import {
  F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE,
  F18_FIXTURE_AUTHORIZATION_LITERAL,
  F18_FIXTURE_ENVIRONMENT_ID,
  F18_FIXTURE_IMAGE,
  F18_FIXTURE_PROJECT_ID,
  validateF18DisposableProjectEvidence,
} from "./p8-8-w09c3fa-f18-disposable-project-packet.js";

test("disposable project evidence is ready for separate authorization", () => {
  const result = validateF18DisposableProjectEvidence(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE);
  assert.equal(result.result, "ready_for_authorization");
  if (result.result === "ready_for_authorization") {
    assert.match(result.packetId, /^f18-fixture-ready-[0-9a-f]{64}$/);
    assert.equal(result.literal, F18_FIXTURE_AUTHORIZATION_LITERAL);
  }
});

test("target is exact isolated project and environment", () => {
  assert.equal(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE.projectId, F18_FIXTURE_PROJECT_ID);
  assert.equal(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE.environmentId, F18_FIXTURE_ENVIRONMENT_ID);
  assert.equal(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE.serviceCount, 0);
  assert.equal(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE.deploymentCount, 0);
});

test("fixture image is exact digest reference", () => {
  assert.equal(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE.exactImage, F18_FIXTURE_IMAGE);
  assert.match(F18_FIXTURE_IMAGE, /@sha256:[0-9a-f]{64}$/);
});

test("registry preverification remains false and one-shot deployment is the bounded proof", () => {
  assert.equal(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE.registryPullabilityPreverified, false);
  assert.equal(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE.readOnlyRegistryProbeAvailable, false);
  assert.equal(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE.atomicImageAndHealthcheckCreateAvailable, true);
  assert.equal(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE.atomicCreateTriggersOneInitialDeployment, true);
});

test("exact service-only teardown must be available", () => {
  assert.equal(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE.exactServiceDeletionAvailable, true);
  assert.equal(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE.serviceDeletionScope, "service_id_only");
});

test("non-empty fixture project fails closed", () => {
  const v: any = structuredClone(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE);
  v.serviceCount = 1;
  assert.deepEqual(validateF18DisposableProjectEvidence(v), {
    result: "fail_closed",
    code: "fixture_not_empty",
  });
});

test("missing teardown capability fails closed", () => {
  const v: any = structuredClone(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE);
  v.exactServiceDeletionAvailable = false;
  assert.deepEqual(validateF18DisposableProjectEvidence(v), {
    result: "fail_closed",
    code: "teardown_unavailable",
  });
});

test("authorization literal drift fails closed", () => {
  const v: any = structuredClone(F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE);
  v.executableAuthorizationLiteral += " drift";
  assert.deepEqual(validateF18DisposableProjectEvidence(v), {
    result: "fail_closed",
    code: "authorization_literal_mismatch",
  });
});
