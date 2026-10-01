import assert from "node:assert/strict";
import test from "node:test";
import {
  F19_AUTHORIZATION_LITERAL,
  F19_CERTIFIED_EVIDENCE,
  F19_PROJECT_ID,
  F19_SERVICE_ID,
  validateF19Evidence,
} from "./p8-8-w09c3fa-f19-autodeploy-safeguard.js";

test("F19 evidence is ready for separate authorization", () => {
  const r = validateF19Evidence(F19_CERTIFIED_EVIDENCE);
  assert.equal(r.result, "ready_for_authorization");
  if (r.result === "ready_for_authorization") {
    assert.match(r.packetId, /^f19-autodeploy-[0-9a-f]{64}$/);
    assert.equal(r.literal, F19_AUTHORIZATION_LITERAL);
  }
});

test("exact production identities are pinned", () => {
  assert.equal(F19_CERTIFIED_EVIDENCE.projectId, F19_PROJECT_ID);
  assert.equal(F19_CERTIFIED_EVIDENCE.serviceId, F19_SERVICE_ID);
});

test("current autodeploy state must be enabled before bounded disable", () => {
  const v: any = structuredClone(F19_CERTIFIED_EVIDENCE);
  v.autodeployEnabled = false;
  assert.deepEqual(validateF19Evidence(v), {
    result: "fail_closed",
    code: "autodeploy_state_mismatch",
  });
});

test("staged AUTH_PUBLIC_ORIGIN patch must remain pinned", () => {
  const v: any = structuredClone(F19_CERTIFIED_EVIDENCE);
  v.stagedPatchId = "drift";
  assert.deepEqual(validateF19Evidence(v), {
    result: "fail_closed",
    code: "staged_patch_mismatch",
  });
});
