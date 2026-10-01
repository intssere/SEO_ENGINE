import assert from "node:assert/strict";
import test from "node:test";
import {
  F21_CERTIFIED_EVIDENCE,
  F21_PUBLIC_ORIGIN,
  validateF21Evidence,
} from "./p8-8-w09c3fa-f21-auth-origin-disposition-review.js";

test("F21 remains blocked until staged auth origin is visibly verified", () => {
  const r = validateF21Evidence(F21_CERTIFIED_EVIDENCE);
  assert.equal(r.result, "blocked_value_unverified");
  if (r.result === "blocked_value_unverified") {
    assert.match(r.packetId, /^f21-disposition-[0-9a-f]{64}$/);
    assert.deepEqual(r.blockers, [
      "staged_auth_public_origin_value_not_visible",
      "exact_resource_update_diff_not_visible",
    ]);
  }
});

test("current Railway public origin is exact", () => {
  assert.equal(
    F21_CERTIFIED_EVIDENCE.currentPublicOrigin,
    F21_PUBLIC_ORIGIN,
  );
});

test("no apply or discard authorization is open", () => {
  for (const key of [
    "applyAuthorized",
    "discardAuthorized",
    "sourceMutationAuthorized",
    "productionCutoverAuthorized",
  ] as const) {
    const v: any = structuredClone(F21_CERTIFIED_EVIDENCE);
    v[key] = true;
    assert.deepEqual(validateF21Evidence(v), {
      result: "fail_closed",
      code: "authorization_boundary_open",
    });
  }
});

test("visibility claims must remain fail-closed until independently proven", () => {
  for (const key of [
    "exactResourceUpdateDiffVisible",
    "currentAuthPublicOriginValueVisible",
    "stagedAuthPublicOriginValueVisible",
  ] as const) {
    const v: any = structuredClone(F21_CERTIFIED_EVIDENCE);
    v[key] = true;
    assert.deepEqual(validateF21Evidence(v), {
      result: "fail_closed",
      code: "visibility_state_mismatch",
    });
  }
});
