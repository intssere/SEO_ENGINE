import assert from "node:assert/strict";
import test from "node:test";
import {
  F23_CERTIFIED_EVIDENCE,
  F23_IMAGE,
  validateF23Evidence,
} from "./p8-8-w09c3fa-f23-immutable-image-transition.js";

test("F23 is ready only for separate explicit immutable-image authorization", () => {
  const r = validateF23Evidence(F23_CERTIFIED_EVIDENCE);
  assert.equal(r.result, "ready_for_explicit_image_transition_authorization");
  if (r.result === "ready_for_explicit_image_transition_authorization") {
    assert.match(r.packetId, /^f23-image-transition-[0-9a-f]{64}$/);
    assert.ok(r.authorizationLiteral.includes(F23_IMAGE));
    assert.ok(r.authorizationLiteral.includes("exactly one resulting service deployment"));
  }
});

test("Production preflight drift fails closed", () => {
  const cases: any[] = [
    { ...F23_CERTIFIED_EVIDENCE, autodeployEnabled: true },
    { ...F23_CERTIFIED_EVIDENCE, effectivePendingChangeCount: 1 },
    { ...F23_CERTIFIED_EVIDENCE, authPublicOriginEffective: false },
    { ...F23_CERTIFIED_EVIDENCE, currentSourceBranch: "other" },
  ];
  for (const value of cases) {
    assert.deepEqual(validateF23Evidence(value), {
      result: "fail_closed",
      code: "production_preflight_mismatch",
    });
  }
});

test("release evidence drift fails closed", () => {
  const v: any = structuredClone(F23_CERTIFIED_EVIDENCE);
  v.targetImage = "ghcr.io/intssere/seo-engine:latest";
  assert.deepEqual(validateF23Evidence(v), {
    result: "fail_closed",
    code: "release_evidence_mismatch",
  });
});

test("additional live authority remains closed", () => {
  for (const key of ["transitionAuthorized", "additionalMutationAuthorized"] as const) {
    const v: any = structuredClone(F23_CERTIFIED_EVIDENCE);
    v[key] = true;
    assert.deepEqual(validateF23Evidence(v), {
      result: "fail_closed",
      code: "authorization_boundary_open",
    });
  }
});
