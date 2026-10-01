import assert from "node:assert/strict";
import test from "node:test";
import {
  F15_ACTION_PINS,
  F15_CANONICAL_COMMIT,
  F15_CANONICAL_TREE,
  F15_CERTIFIED_PREFLIGHT,
  F15_IMAGE_TAG,
  F15_REQUIRED_AUTHORIZATION_LITERAL,
  validateF15ReleasePreflight,
} from "./p8-8-w09c3fa-f15-release-preflight.js";

test("certified F15 preflight passes deterministically", () => {
  const first = validateF15ReleasePreflight(F15_CERTIFIED_PREFLIGHT);
  const second = validateF15ReleasePreflight(structuredClone(F15_CERTIFIED_PREFLIGHT));
  assert.equal(first.result, "pass");
  assert.deepEqual(second, first);
  if (first.result === "pass") {
    assert.match(first.evidenceId, /^f15-[0-9a-f]{64}$/);
    assert.match(first.authorizationPacketId, /^f15-auth-[0-9a-f]{64}$/);
  }
});

test("canonical merged commit and tree are exact immutable identities", () => {
  assert.match(F15_CANONICAL_COMMIT, /^[0-9a-f]{40}$/);
  assert.match(F15_CANONICAL_TREE, /^[0-9a-f]{40}$/);
  assert.equal(F15_CERTIFIED_PREFLIGHT.sourceBranch, "main");
});

test("release tag is commit-addressed and latest is prohibited", () => {
  assert.equal(F15_IMAGE_TAG, `sha-${F15_CANONICAL_COMMIT}`);
  assert.equal(F15_CERTIFIED_PREFLIGHT.release.latestTagAllowed, false);
});

test("all actions remain exact 40-hex pins", () => {
  assert.equal(F15_ACTION_PINS.length, 5);
  for (const pin of F15_ACTION_PINS) assert.match(pin, /@[0-9a-f]{40}$/);
});

test("lineage drift fails closed", () => {
  const altered = structuredClone(F15_CERTIFIED_PREFLIGHT) as any;
  altered.canonicalCommitSha = "a".repeat(40);
  assert.deepEqual(validateF15ReleasePreflight(altered), {
    result: "fail_closed",
    code: "lineage_mismatch",
  });
});

test("artifact drift fails closed", () => {
  const altered = structuredClone(F15_CERTIFIED_PREFLIGHT) as any;
  altered.f14WorkflowBlobSha = "b".repeat(40);
  assert.deepEqual(validateF15ReleasePreflight(altered), {
    result: "fail_closed",
    code: "artifact_identity_mismatch",
  });
});

test("moving or enabling workflow fails closed", () => {
  const moved = structuredClone(F15_CERTIFIED_PREFLIGHT) as any;
  moved.workflowUnderGitHubWorkflows = true;
  assert.deepEqual(validateF15ReleasePreflight(moved), {
    result: "fail_closed",
    code: "workflow_not_inert",
  });

  const enabled = structuredClone(F15_CERTIFIED_PREFLIGHT) as any;
  enabled.publishingTriggerEnabled = true;
  assert.deepEqual(validateF15ReleasePreflight(enabled), {
    result: "fail_closed",
    code: "workflow_not_inert",
  });
});

test("permission widening fails closed", () => {
  const altered = structuredClone(F15_CERTIFIED_PREFLIGHT) as any;
  altered.permissions.contents = "write";
  assert.deepEqual(validateF15ReleasePreflight(altered), {
    result: "fail_closed",
    code: "permission_mismatch",
  });
});

test("mutable action substitution fails closed", () => {
  const altered = structuredClone(F15_CERTIFIED_PREFLIGHT) as any;
  altered.actionPins[0] = "actions/checkout@v7";
  assert.deepEqual(validateF15ReleasePreflight(altered), {
    result: "fail_closed",
    code: "action_pin_mismatch",
  });
});

test("build-contract widening fails closed", () => {
  const altered = structuredClone(F15_CERTIFIED_PREFLIGHT) as any;
  altered.build.platform = "linux/arm64";
  assert.deepEqual(validateF15ReleasePreflight(altered), {
    result: "fail_closed",
    code: "build_contract_mismatch",
  });
});

test("multi-run, retry, parallel, or latest semantics fail closed", () => {
  for (const mutate of [
    (v: any) => { v.release.oneShotOnly = false; },
    (v: any) => { v.release.automaticRetryAllowed = true; },
    (v: any) => { v.release.parallelReleaseAllowed = true; },
    (v: any) => { v.release.latestTagAllowed = true; },
  ]) {
    const altered = structuredClone(F15_CERTIFIED_PREFLIGHT) as any;
    mutate(altered);
    assert.deepEqual(validateF15ReleasePreflight(altered), {
      result: "fail_closed",
      code: "release_contract_mismatch",
    });
  }
});

test("authorization packet is explicit but remains ungranted", () => {
  assert.match(F15_REQUIRED_AUTHORIZATION_LITERAL, /^AUTHORIZE W09-C3F-A-F16 ONE-SHOT GHCR RELEASE/);
  assert.equal(F15_CERTIFIED_PREFLIGHT.authorization.granted, false);

  const selfAuthorized = structuredClone(F15_CERTIFIED_PREFLIGHT) as any;
  selfAuthorized.authorization.granted = true;
  assert.deepEqual(validateF15ReleasePreflight(selfAuthorized), {
    result: "fail_closed",
    code: "authorization_boundary_violation",
  });
});

test("live execution request fails closed", () => {
  const altered = structuredClone(F15_CERTIFIED_PREFLIGHT) as any;
  altered.liveExecutionRequested = true;
  assert.deepEqual(validateF15ReleasePreflight(altered), {
    result: "fail_closed",
    code: "live_execution_requested",
  });
});
