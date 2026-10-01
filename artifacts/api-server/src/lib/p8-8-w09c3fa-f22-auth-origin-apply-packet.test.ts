import assert from "node:assert/strict";
import test from "node:test";
import {
  F22_AUTH_PUBLIC_ORIGIN,
  F22_CERTIFIED_EVIDENCE,
  F22_PATCH_ID,
  validateF22Evidence,
} from "./p8-8-w09c3fa-f22-auth-origin-apply-packet.js";

test("F22 is ready only for separate explicit apply authorization", () => {
  const r = validateF22Evidence(F22_CERTIFIED_EVIDENCE);
  assert.equal(r.result, "ready_for_explicit_apply_authorization");
  if (r.result === "ready_for_explicit_apply_authorization") {
    assert.match(r.packetId, /^f22-apply-[0-9a-f]{64}$/);
    assert.ok(r.authorizationLiteral.includes(F22_PATCH_ID));
    assert.ok(r.authorizationLiteral.includes(F22_AUTH_PUBLIC_ORIGIN));
  }
});

test("dashboard evidence drift fails closed", () => {
  const cases: any[] = [
    { ...F22_CERTIFIED_EVIDENCE, dashboardChangeCount: 2 },
    { ...F22_CERTIFIED_EVIDENCE, variableName: "OTHER" },
    { ...F22_CERTIFIED_EVIDENCE, stagedValue: "https://wrong.example" },
    { ...F22_CERTIFIED_EVIDENCE, currentValueAbsent: false },
    { ...F22_CERTIFIED_EVIDENCE, dashboardRedeployNotice: false },
  ];
  for (const value of cases) {
    assert.deepEqual(validateF22Evidence(value), {
      result: "fail_closed",
      code: "dashboard_evidence_mismatch",
    });
  }
});

test("opening any live authority before explicit authorization fails closed", () => {
  for (const key of [
    "applyAuthorized",
    "sourceImageTransitionAuthorized",
    "additionalVariableMutationAuthorized",
    "domainMutationAuthorized",
    "databaseVolumeMutationAuthorized",
    "providerPublicSiteActionAuthorized",
    "productionCutoverAuthorized",
  ] as const) {
    const v: any = structuredClone(F22_CERTIFIED_EVIDENCE);
    v[key] = true;
    assert.deepEqual(validateF22Evidence(v), {
      result: "fail_closed",
      code: "authorization_boundary_open",
    });
  }
});
