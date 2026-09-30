import assert from "node:assert/strict";
import test from "node:test";
import {
  F14_ACTION_PINS,
  F14_BASE_IMAGE_DIGEST,
  F14_CERTIFIED_EVIDENCE,
  F14_PINNED_DOCKERFILE_SHA256,
  validateF14DependencyPins,
} from "./p8-8-w09c3fa-f14-dependency-pins.js";

test("certified F14 dependency evidence passes deterministically", () => {
  const first = validateF14DependencyPins(F14_CERTIFIED_EVIDENCE);
  const second = validateF14DependencyPins(structuredClone(F14_CERTIFIED_EVIDENCE));
  assert.equal(first.result, "pass");
  assert.deepEqual(second, first);
  if (first.result === "pass") assert.match(first.evidenceId, /^f14-[0-9a-f]{64}$/);
});

test("all selected action revisions are exact 40-hex pins", () => {
  assert.equal(F14_ACTION_PINS.length, 5);
  for (const action of F14_ACTION_PINS) {
    assert.match(action.commitSha, /^[0-9a-f]{40}$/);
    assert.match(action.actionBlobSha, /^[0-9a-f]{40}$/);
  }
});

test("base image and Dockerfile identities are immutable", () => {
  assert.match(F14_BASE_IMAGE_DIGEST, /^sha256:[0-9a-f]{64}$/);
  assert.match(F14_PINNED_DOCKERFILE_SHA256, /^[0-9a-f]{64}$/);
});

test("changed action revision fails closed", () => {
  const altered = structuredClone(F14_CERTIFIED_EVIDENCE);
  altered.actions[0]!.commitSha = "a".repeat(40);
  assert.deepEqual(validateF14DependencyPins(altered), {
    result: "fail_closed",
    code: "action_pin_mismatch",
  });
});

test("mutable or changed base image evidence fails closed", () => {
  const altered = structuredClone(F14_CERTIFIED_EVIDENCE);
  altered.baseImages[0]!.digest = "sha256:" + "b".repeat(64);
  assert.deepEqual(validateF14DependencyPins(altered), {
    result: "fail_closed",
    code: "base_image_pin_mismatch",
  });
});

test("workflow source must remain inert and outside GitHub workflows", () => {
  const enabled = structuredClone(F14_CERTIFIED_EVIDENCE);
  enabled.publishingTriggerEnabled = true;
  assert.deepEqual(validateF14DependencyPins(enabled), {
    result: "fail_closed",
    code: "workflow_not_inert",
  });

  const executable = structuredClone(F14_CERTIFIED_EVIDENCE);
  executable.workflowUnderGitHubWorkflows = true;
  assert.deepEqual(validateF14DependencyPins(executable), {
    result: "fail_closed",
    code: "workflow_not_inert",
  });
});

test("build platform, target, args, provenance and SBOM are exact", () => {
  const altered = structuredClone(F14_CERTIFIED_EVIDENCE);
  altered.platform = "linux/arm64" as "linux/amd64";
  assert.deepEqual(validateF14DependencyPins(altered), {
    result: "fail_closed",
    code: "build_contract_mismatch",
  });
});

test("live release execution remains explicitly unauthorized", () => {
  const altered = structuredClone(F14_CERTIFIED_EVIDENCE);
  altered.liveExecutionAuthorized = true;
  assert.deepEqual(validateF14DependencyPins(altered), {
    result: "fail_closed",
    code: "live_execution_requested",
  });
});
