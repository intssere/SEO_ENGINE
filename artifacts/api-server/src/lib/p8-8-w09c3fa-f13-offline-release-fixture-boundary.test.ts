import assert from "node:assert/strict";
import test from "node:test";
import {
  OCI_RELEASE_WORKFLOW_SCHEMA,
  RAILWAY_FIXTURE_AUTH_SCHEMA,
  validateDisposableRailwayFixtureAuthorization,
  validateOciReleaseWorkflowSpec,
} from "./p8-8-w09c3fa-f13-offline-release-fixture-boundary.js";

const sha40 = (c: string) => c.repeat(40);
const sha256 = (c: string) => c.repeat(64);
const digest = (c: string) => "sha256:" + sha256(c);

const workflow = {
  schema: OCI_RELEASE_WORKFLOW_SCHEMA,
  repository: "intssere/SEO_ENGINE",
  sourceCommitSha: sha40("1"),
  sourceTreeSha: sha40("2"),
  sourceArtifactSha256: sha256("3"),
  dockerfilePath: "Dockerfile",
  dockerfileSha256: sha256("4"),
  workflowPath: ".github/workflows/oci-release.yml",
  workflowCommitSha: sha40("5"),
  registry: "ghcr" as const,
  imageRepository: "ghcr.io/intssere/seo-engine",
  packageVisibility: "public" as const,
  permissions: {
    contents: "read" as const,
    packages: "write" as const,
    idToken: "write" as const,
    attestations: "write" as const,
  },
  actions: {
    checkout: "actions/checkout@" + sha40("a"),
    setupBuildx: "docker/setup-buildx-action@" + sha40("b"),
    login: "docker/login-action@" + sha40("c"),
    buildPush: "docker/build-push-action@" + sha40("d"),
    attest: "actions/attest@" + sha40("e"),
  },
  platforms: ["linux/amd64"],
  tags: ["sha-" + sha40("1")],
  digestOutputName: "digest" as const,
  push: true as const,
  provenance: "max" as const,
  sbom: true as const,
  noLatestTag: true as const,
  oneShot: true as const,
};

test("exact offline workflow specification passes deterministically", () => {
  const first = validateOciReleaseWorkflowSpec(workflow);
  const second = validateOciReleaseWorkflowSpec(structuredClone(workflow));
  assert.equal(first.result, "pass");
  assert.deepEqual(second, first);
  if (first.result === "pass") assert.match(first.evidenceId, /^f13-workflow-[0-9a-f]{64}$/);
});

test("mutable action revisions fail closed", () => {
  assert.deepEqual(validateOciReleaseWorkflowSpec({
    ...workflow,
    actions: { ...workflow.actions, checkout: "actions/checkout@v4" },
  }), { result: "fail_closed", code: "mutable_action_revision" });
});

test("permissions are exact least-privilege contract", () => {
  assert.deepEqual(validateOciReleaseWorkflowSpec({
    ...workflow,
    permissions: { ...workflow.permissions, contents: "write" },
  }), { result: "fail_closed", code: "permission_mismatch" });
});

test("latest or unsorted tags and platforms fail closed", () => {
  assert.deepEqual(validateOciReleaseWorkflowSpec({
    ...workflow,
    tags: ["latest"],
  }), { result: "fail_closed", code: "mutable_or_unsafe_tag" });
  assert.deepEqual(validateOciReleaseWorkflowSpec({
    ...workflow,
    platforms: ["linux/arm64", "linux/amd64"],
  }), { result: "fail_closed", code: "platform_contract_mismatch" });
});

const fixture = {
  schema: RAILWAY_FIXTURE_AUTH_SCHEMA,
  projectId: "fixture-project",
  environmentId: "fixture-env",
  fixtureServiceName: "seo-engine-f13-fixture",
  fixtureServiceMustNotExist: true as const,
  imageRepository: "ghcr.io/intssere/seo-engine",
  imageDigest: digest("f"),
  immutableImageReference: "ghcr.io/intssere/seo-engine@" + digest("f"),
  expectedSourceCommitSha: sha40("1"),
  expectedSourceTreeSha: sha40("2"),
  expectedF12ProvenanceId: "f12-" + sha256("6"),
  healthcheckPath: "/api/healthz",
  healthcheckExpectedStatus: 200 as const,
  maxDeployments: 1 as const,
  permitProductionEnvironment: false as const,
  permitExistingServiceMutation: false as const,
  permitVariableMutation: false as const,
  permitDatabaseAttachment: false as const,
  permitPersistentVolume: false as const,
  permitCustomDomain: false as const,
  permitProviderCalls: false as const,
  permitSchedulerWorkerActivation: false as const,
  teardownRequired: true as const,
  teardownScope: "fixture_service_only" as const,
  oneShot: true as const,
};

test("strictly isolated disposable fixture authorization passes", () => {
  const result = validateDisposableRailwayFixtureAuthorization(fixture);
  assert.equal(result.result, "pass");
  if (result.result === "pass") assert.match(result.evidenceId, /^f13-fixture-[0-9a-f]{64}$/);
});

test("fixture must use exact immutable image reference", () => {
  assert.deepEqual(validateDisposableRailwayFixtureAuthorization({
    ...fixture,
    immutableImageReference: "ghcr.io/intssere/seo-engine:latest",
  }), { result: "fail_closed", code: "immutable_image_mismatch" });
});

test("any broadened live capability fails fixture isolation", () => {
  assert.deepEqual(validateDisposableRailwayFixtureAuthorization({
    ...fixture,
    permitVariableMutation: true,
  }), { result: "fail_closed", code: "fixture_not_isolated" });
  assert.deepEqual(validateDisposableRailwayFixtureAuthorization({
    ...fixture,
    permitProductionEnvironment: true,
  }), { result: "fail_closed", code: "fixture_not_isolated" });
});

test("unsafe healthcheck and credential-shaped fields fail closed", () => {
  assert.deepEqual(validateDisposableRailwayFixtureAuthorization({
    ...fixture,
    healthcheckPath: "/api/../admin",
  }), { result: "fail_closed", code: "unsafe_healthcheck" });
  assert.deepEqual(validateDisposableRailwayFixtureAuthorization({
    ...fixture,
    token: "secret",
  }), { result: "fail_closed", code: "credential_shaped_material" });
});
