import assert from "node:assert/strict";
import test from "node:test";
import {
  F20_CERTIFIED_EVIDENCE,
  F20_IMAGE,
  validateF20Evidence,
} from "./p8-8-w09c3fa-f20-production-image-transition-preflight.js";

test("F20 remains blocked while unrelated staged patch exists", () => {
  const r = validateF20Evidence(F20_CERTIFIED_EVIDENCE);
  assert.equal(r.result, "blocked_unrelated_staged_changes");
  if (r.result === "blocked_unrelated_staged_changes") {
    assert.match(r.packetId, /^f20-preflight-[0-9a-f]{64}$/);
    assert.deepEqual(r.blockers, ["unrelated_staged_environment_patch"]);
  }
});

test("exact immutable image is pinned", () => {
  assert.equal(
    F20_CERTIFIED_EVIDENCE.targetImage,
    F20_IMAGE,
  );
  assert.match(F20_IMAGE, /@sha256:[0-9a-f]{64}$/);
});

test("opening any live authorization fails closed", () => {
  for (const key of [
    "productionCutoverAuthorized",
    "sourceMutationAuthorized",
    "stagedPatchMutationAuthorized",
  ] as const) {
    const v: any = structuredClone(F20_CERTIFIED_EVIDENCE);
    v[key] = true;
    assert.deepEqual(validateF20Evidence(v), {
      result: "fail_closed",
      code: "authorization_boundary_open",
    });
  }
});

test("removing staged-patch evidence without fresh live revalidation fails closed", () => {
  const v: any = structuredClone(F20_CERTIFIED_EVIDENCE);
  v.unrelatedStagedPatchPresent = false;
  v.unrelatedStagedVariables = [];
  assert.deepEqual(validateF20Evidence(v), {
    result: "fail_closed",
    code: "staged_patch_state_mismatch",
  });
});

test("source or image drift fails closed", () => {
  const source: any = structuredClone(F20_CERTIFIED_EVIDENCE);
  source.currentSource.branch = "other";
  assert.deepEqual(validateF20Evidence(source), {
    result: "fail_closed",
    code: "source_mismatch",
  });

  const image: any = structuredClone(F20_CERTIFIED_EVIDENCE);
  image.targetImage = "ghcr.io/intssere/seo-engine:latest";
  assert.deepEqual(validateF20Evidence(image), {
    result: "fail_closed",
    code: "image_mismatch",
  });
});
