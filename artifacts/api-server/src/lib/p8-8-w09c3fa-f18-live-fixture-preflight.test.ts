import assert from "node:assert/strict";
import test from "node:test";
import {
  F18_CERTIFIED_LIVE_SNAPSHOT,
  F18_HEALTHCHECK_PATH,
  F18_IMMUTABLE_IMAGE,
  F18_PRODUCTION_ENVIRONMENT_ID,
  F18_PRODUCTION_SERVICE_NAME,
  F18_RAILWAY_PROJECT_ID,
  validateF18FutureFixturePacket,
  validateF18LivePreflight,
} from "./p8-8-w09c3fa-f18-live-fixture-preflight.js";

test("certified F18 live snapshot is deterministically blocked", () => {
  const first = validateF18LivePreflight(F18_CERTIFIED_LIVE_SNAPSHOT);
  const second = validateF18LivePreflight(structuredClone(F18_CERTIFIED_LIVE_SNAPSHOT));
  assert.equal(first.result, "blocked");
  assert.deepEqual(second, first);
  if (first.result === "blocked") {
    assert.match(first.evidenceId, /^f18-preflight-[0-9a-f]{64}$/);
    assert.deepEqual(first.blockers, [
      "no_non_production_environment",
      "registry_pullability_unverified",
      "main_merge_triggers_production_deployment",
    ]);
    assert.equal(first.executableAuthorizationLiteral, null);
  }
});

test("live snapshot cannot self-authorize", () => {
  const v: any = structuredClone(F18_CERTIFIED_LIVE_SNAPSHOT);
  v.executableAuthorizationLiteral = "AUTHORIZE ANYTHING";
  assert.deepEqual(validateF18LivePreflight(v), {
    result: "fail_closed",
    code: "premature_authorization",
  });
});

test("environment snapshot drift fails closed", () => {
  const v: any = structuredClone(F18_CERTIFIED_LIVE_SNAPSHOT);
  v.environments.push({ id: "11111111-2222-4333-8444-555555555555", name: "staging" });
  assert.deepEqual(validateF18LivePreflight(v), {
    result: "fail_closed",
    code: "environment_snapshot_mismatch",
  });
});

function futurePacket() {
  return {
    schema: "p8-8-w09c3fa-f18-one-shot-fixture-packet-v1",
    railwayProjectId: F18_RAILWAY_PROJECT_ID,
    environmentId: "11111111-2222-4333-8444-555555555555",
    environmentName: "f18-fixture",
    productionEnvironment: false,
    environmentReadBackVerified: true,
    fixtureServiceName: "seo-engine-f18-fixture",
    fixtureServiceAbsentVerified: true,
    image: F18_IMMUTABLE_IMAGE,
    registryPullabilityVerified: true,
    healthcheckPath: F18_HEALTHCHECK_PATH,
    expectedHttpStatus: 200,
    maximumDeployments: 1,
    maximumTeardownAttempts: 1,
    variableMutation: false,
    databaseAttachment: false,
    persistentVolume: false,
    customDomain: false,
    providerCalls: false,
    schedulerWorkerActivation: false,
    productionServiceMutation: false,
    stagedPatchMutation: false,
    productionCutover: false,
    teardownRequired: true,
    teardownScope: "fixture_service_only",
    exactAuthorizationLiteral:
      "AUTHORIZE W09-C3F-A-F18 ONE-SHOT RAILWAY FIXTURE — exact future packet",
    authorizationGranted: true,
  } as const;
}

test("fully proven future packet can pass", () => {
  const result = validateF18FutureFixturePacket(futurePacket());
  assert.equal(result.result, "pass");
  if (result.result === "pass") assert.match(result.packetId, /^f18-packet-[0-9a-f]{64}$/);
});

test("Production environment is forbidden", () => {
  const v: any = futurePacket();
  v.environmentId = F18_PRODUCTION_ENVIRONMENT_ID;
  assert.deepEqual(validateF18FutureFixturePacket(v), {
    result: "fail_closed",
    code: "non_production_environment_unverified",
  });
});

test("Production service name is forbidden", () => {
  const v: any = futurePacket();
  v.fixtureServiceName = F18_PRODUCTION_SERVICE_NAME;
  assert.deepEqual(validateF18FutureFixturePacket(v), {
    result: "fail_closed",
    code: "fixture_service_boundary_violation",
  });
});

test("digest pullability must be proven", () => {
  const v: any = futurePacket();
  v.registryPullabilityVerified = false;
  assert.deepEqual(validateF18FutureFixturePacket(v), {
    result: "fail_closed",
    code: "image_pullability_unverified",
  });
});

test("deployment and teardown are exactly one-shot", () => {
  const v: any = futurePacket();
  v.maximumDeployments = 2;
  assert.deepEqual(validateF18FutureFixturePacket(v), {
    result: "fail_closed",
    code: "one_shot_violation",
  });

  const t: any = futurePacket();
  t.maximumTeardownAttempts = 2;
  assert.deepEqual(validateF18FutureFixturePacket(t), {
    result: "fail_closed",
    code: "one_shot_violation",
  });
});

test("Production and staged-patch mutation are prohibited", () => {
  for (const key of ["productionServiceMutation", "stagedPatchMutation", "databaseAttachment", "persistentVolume"]) {
    const v: any = futurePacket();
    v[key] = true;
    assert.deepEqual(validateF18FutureFixturePacket(v), {
      result: "fail_closed",
      code: "side_effect_boundary_violation",
    });
  }
});
