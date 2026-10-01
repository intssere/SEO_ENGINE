import assert from "node:assert/strict";
import test from "node:test";
import {
  F18_CERTIFIED_EXECUTION_RECEIPT,
  F18_EXECUTION_DEPLOYMENT_ID,
  F18_EXECUTION_IMAGE,
  F18_EXECUTION_SERVICE_ID,
  F18_TEARDOWN_PATCH_ID,
  validateF18ExecutionReceipt,
} from "./p8-8-w09c3fa-f18-execution-receipt.js";

test("F18 execution receipt certifies pull and healthcheck but blocks completion on teardown", () => {
  const result = validateF18ExecutionReceipt(F18_CERTIFIED_EXECUTION_RECEIPT);
  assert.equal(result.result, "partial_pass_teardown_blocked");
  if (result.result === "partial_pass_teardown_blocked") {
    assert.match(result.receiptId, /^f18-execution-[0-9a-f]{64}$/);
    assert.equal(result.pullability, "proven");
    assert.equal(result.healthcheck, "proven");
    assert.equal(result.teardown, "awaiting_user_2fa");
  }
});

test("exact deployment identity is pinned", () => {
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.deploymentId, F18_EXECUTION_DEPLOYMENT_ID);
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.serviceId, F18_EXECUTION_SERVICE_ID);
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.image, F18_EXECUTION_IMAGE);
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.deploymentAttempts, 1);
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.deploymentRetryCount, 0);
});

test("successful deployment is the pullability and healthcheck proof", () => {
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.deploymentStatus, "SUCCESS");
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.exactDigestPullabilityProven, true);
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.http200HealthcheckProven, true);
});

test("teardown is exactly service scoped and pending 2FA", () => {
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.teardownPatchId, F18_TEARDOWN_PATCH_ID);
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.teardownPatchChangeCount, 1);
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.teardownScope, "service_id_only");
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.teardownCommitBlockedBy2FA, true);
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.teardownCommitted, false);
  assert.equal(F18_CERTIFIED_EXECUTION_RECEIPT.fixtureComplete, false);
});

test("a second deployment attempt fails closed", () => {
  const v: any = structuredClone(F18_CERTIFIED_EXECUTION_RECEIPT);
  v.deploymentAttempts = 2;
  assert.deepEqual(validateF18ExecutionReceipt(v), {
    result: "fail_closed",
    code: "one_shot_deployment_mismatch",
  });
});

test("claiming teardown completion before 2FA fails closed", () => {
  const v: any = structuredClone(F18_CERTIFIED_EXECUTION_RECEIPT);
  v.teardownCommitted = true;
  v.serviceStillPresentPending2FA = false;
  v.fixtureComplete = true;
  assert.deepEqual(validateF18ExecutionReceipt(v), {
    result: "fail_closed",
    code: "teardown_state_mismatch",
  });
});
