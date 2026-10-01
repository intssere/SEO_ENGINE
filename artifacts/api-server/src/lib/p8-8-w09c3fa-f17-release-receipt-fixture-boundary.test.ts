import assert from "node:assert/strict";
import test from "node:test";
import {
  F17_CERTIFIED_RELEASE_RECEIPT,
  F17_FORBIDDEN_PRODUCTION_ENVIRONMENT_ID,
  F17_FORBIDDEN_PRODUCTION_SERVICE_NAME,
  F17_IMAGE_DIGEST,
  F17_IMMUTABLE_IMAGE,
  F17_RELEASE_SOURCE_COMMIT,
  F17_RELEASE_SOURCE_TREE,
  F17_RAILWAY_PROJECT_ID,
  validateF17RailwayFixtureAuthorization,
  validateF17ReleaseReceipt,
} from "./p8-8-w09c3fa-f17-release-receipt-fixture-boundary.js";

test("certified F16 receipt passes with fixture boundary closed", () => {
  const first = validateF17ReleaseReceipt(F17_CERTIFIED_RELEASE_RECEIPT);
  const second = validateF17ReleaseReceipt(structuredClone(F17_CERTIFIED_RELEASE_RECEIPT));
  assert.equal(first.result, "pass");
  assert.deepEqual(second, first);
  if (first.result === "pass") {
    assert.match(first.evidenceId, /^f17-receipt-[0-9a-f]{64}$/);
    assert.equal(first.fixtureBoundary, "closed");
  }
});

test("one-shot release count is exact", () => {
  const altered = structuredClone(F17_CERTIFIED_RELEASE_RECEIPT) as any;
  altered.totalAuthorizedRuns = 2;
  assert.deepEqual(validateF17ReleaseReceipt(altered), {
    result: "fail_closed",
    code: "one_shot_violation",
  });
});

test("image digest drift fails closed", () => {
  const altered = structuredClone(F17_CERTIFIED_RELEASE_RECEIPT) as any;
  altered.imageDigest = "sha256:" + "a".repeat(64);
  assert.deepEqual(validateF17ReleaseReceipt(altered), {
    result: "fail_closed",
    code: "image_mismatch",
  });
  assert.match(F17_IMAGE_DIGEST, /^sha256:[0-9a-f]{64}$/);
});

test("attestation drift fails closed", () => {
  const altered = structuredClone(F17_CERTIFIED_RELEASE_RECEIPT) as any;
  altered.attestationId = 1;
  assert.deepEqual(validateF17ReleaseReceipt(altered), {
    result: "fail_closed",
    code: "attestation_mismatch",
  });
});

test("release receipt cannot self-open fixture execution", () => {
  const altered = structuredClone(F17_CERTIFIED_RELEASE_RECEIPT) as any;
  altered.fixtureExecutionAuthorized = true;
  assert.deepEqual(validateF17ReleaseReceipt(altered), {
    result: "fail_closed",
    code: "boundary_unexpectedly_open",
  });
});

function candidate() {
  return {
    schema: "p8-8-w09c3fa-f17-railway-fixture-authorization-v1",
    railwayProjectId: F17_RAILWAY_PROJECT_ID,
    environmentId: "11111111-2222-4333-8444-555555555555",
    environmentName: "f17-disposable",
    productionEnvironment: false,
    railwayReadBackVerified: true,
    fixtureServiceName: "seo-engine-f17-fixture",
    fixtureServiceAlreadyExists: false,
    existingServiceMutation: false,
    image: F17_IMMUTABLE_IMAGE,
    registryPullabilityVerified: true,
    expectedCanonicalCommit: F17_RELEASE_SOURCE_COMMIT,
    expectedCanonicalTree: F17_RELEASE_SOURCE_TREE,
    healthcheckPath: "/health",
    expectedHttpStatus: 200,
    maximumDeployments: 1,
    variableMutation: false,
    databaseAttachment: false,
    persistentVolume: false,
    customDomain: false,
    providerCalls: false,
    schedulerWorkerActivation: false,
    productionCutover: false,
    teardownRequired: true,
    teardownScope: "fixture_service_only",
    authorizationGranted: true,
  } as const;
}

test("fully bounded future fixture packet can pass", () => {
  const result = validateF17RailwayFixtureAuthorization(candidate());
  assert.equal(result.result, "pass");
  if (result.result === "pass") assert.match(result.evidenceId, /^f17-fixture-[0-9a-f]{64}$/);
});

test("Production environment is forbidden", () => {
  const v: any = candidate();
  v.environmentId = F17_FORBIDDEN_PRODUCTION_ENVIRONMENT_ID;
  assert.deepEqual(validateF17RailwayFixtureAuthorization(v), {
    result: "fail_closed",
    code: "production_target",
  });
});

test("existing Production service name is forbidden", () => {
  const v: any = candidate();
  v.fixtureServiceName = F17_FORBIDDEN_PRODUCTION_SERVICE_NAME;
  assert.deepEqual(validateF17RailwayFixtureAuthorization(v), {
    result: "fail_closed",
    code: "service_boundary_violation",
  });
});

test("Railway read-back and registry pullability are mandatory", () => {
  const noRailway: any = candidate();
  noRailway.railwayReadBackVerified = false;
  assert.deepEqual(validateF17RailwayFixtureAuthorization(noRailway), {
    result: "fail_closed",
    code: "unverified_railway_state",
  });

  const noPull: any = candidate();
  noPull.registryPullabilityVerified = false;
  assert.deepEqual(validateF17RailwayFixtureAuthorization(noPull), {
    result: "fail_closed",
    code: "registry_pull_unverified",
  });
});

test("side effects and multiple deployments fail closed", () => {
  const mutation: any = candidate();
  mutation.databaseAttachment = true;
  assert.deepEqual(validateF17RailwayFixtureAuthorization(mutation), {
    result: "fail_closed",
    code: "side_effect_boundary_violation",
  });

  const deployments: any = candidate();
  deployments.maximumDeployments = 2;
  assert.deepEqual(validateF17RailwayFixtureAuthorization(deployments), {
    result: "fail_closed",
    code: "deployment_count_violation",
  });
});

test("teardown and explicit authorization remain mandatory", () => {
  const noTeardown: any = candidate();
  noTeardown.teardownRequired = false;
  assert.deepEqual(validateF17RailwayFixtureAuthorization(noTeardown), {
    result: "fail_closed",
    code: "teardown_boundary_violation",
  });

  const notAuthorized: any = candidate();
  notAuthorized.authorizationGranted = false;
  assert.deepEqual(validateF17RailwayFixtureAuthorization(notAuthorized), {
    result: "fail_closed",
    code: "authorization_missing",
  });
});
