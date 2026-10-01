import { createHash } from "node:crypto";

export const F18_SCHEMA = "p8-8-w09c3fa-f18-live-fixture-preflight-v1" as const;

export const F18_PARENT_MAIN_COMMIT = "e4c696be88d63093c101d0efcb5faabadb4eb5ce" as const;
export const F18_PARENT_MAIN_TREE = "779812dff9f6454837cab86183446a648e10b712" as const;

export const F18_RAILWAY_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const F18_PRODUCTION_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const F18_PRODUCTION_SERVICE_ID = "1e8c1e7d-16f7-4c63-8193-1021bcbe6d90" as const;
export const F18_PRODUCTION_SERVICE_NAME = "seo-engine-shadow" as const;
export const F18_POSTGRES_SERVICE_ID = "b69e0633-7ab9-40ab-85f3-c9edd6acb031" as const;
export const F18_POSTGRES_VOLUME_ID = "5e7f09d1-c436-4a49-9526-c3150d0e820a" as const;
export const F18_STAGED_PATCH_ID = "5d9ed802-32c2-4d0a-ac8a-b45a010ca535" as const;
export const F18_PRODUCTION_DOMAIN = "seo-engine-shadow-production.up.railway.app" as const;
export const F18_HEALTHCHECK_PATH = "/api/healthz" as const;

export const F18_IMMUTABLE_IMAGE =
  "ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22" as const;

export const F18_LATEST_OBSERVED_MAIN_DEPLOYMENT_ID =
  "c4ed6319-8c02-416a-b8bf-4dbb1dd18454" as const;

export type F18Blocker =
  | "no_non_production_environment"
  | "registry_pullability_unverified"
  | "main_merge_triggers_production_deployment";

export interface F18LiveSnapshot {
  schema: typeof F18_SCHEMA;
  parentMainCommit: typeof F18_PARENT_MAIN_COMMIT;
  parentMainTree: typeof F18_PARENT_MAIN_TREE;
  railwayProjectId: typeof F18_RAILWAY_PROJECT_ID;
  railwayReadBackVerified: true;
  environments: Array<{
    id: string;
    name: string;
  }>;
  productionEnvironmentId: typeof F18_PRODUCTION_ENVIRONMENT_ID;
  productionServiceId: typeof F18_PRODUCTION_SERVICE_ID;
  productionServiceName: typeof F18_PRODUCTION_SERVICE_NAME;
  postgresServiceId: typeof F18_POSTGRES_SERVICE_ID;
  postgresVolumeId: typeof F18_POSTGRES_VOLUME_ID;
  productionDomain: typeof F18_PRODUCTION_DOMAIN;
  stagedPatchId: typeof F18_STAGED_PATCH_ID;
  stagedAuthPublicOriginPresent: true;
  productionSourceRepository: "intssere/SEO_ENGINE";
  productionSourceBranch: "main";
  checkSuitesEnabled: true;
  mainMergeAutoDeployObserved: true;
  latestObservedMainDeploymentId: typeof F18_LATEST_OBSERVED_MAIN_DEPLOYMENT_ID;
  latestObservedMainDeploymentStatus: "FAILED";
  healthcheckPath: typeof F18_HEALTHCHECK_PATH;
  immutableImage: typeof F18_IMMUTABLE_IMAGE;
  registryPullabilityVerified: false;
  executableAuthorizationLiteral: null;
}

export interface F18FutureFixturePacket {
  schema: "p8-8-w09c3fa-f18-one-shot-fixture-packet-v1";
  railwayProjectId: typeof F18_RAILWAY_PROJECT_ID;
  environmentId: string;
  environmentName: string;
  productionEnvironment: false;
  environmentReadBackVerified: true;
  fixtureServiceName: string;
  fixtureServiceAbsentVerified: true;
  image: typeof F18_IMMUTABLE_IMAGE;
  registryPullabilityVerified: true;
  healthcheckPath: typeof F18_HEALTHCHECK_PATH;
  expectedHttpStatus: 200;
  maximumDeployments: 1;
  maximumTeardownAttempts: 1;
  variableMutation: false;
  databaseAttachment: false;
  persistentVolume: false;
  customDomain: false;
  providerCalls: false;
  schedulerWorkerActivation: false;
  productionServiceMutation: false;
  stagedPatchMutation: false;
  productionCutover: false;
  teardownRequired: true;
  teardownScope: "fixture_service_only";
  exactAuthorizationLiteral: string;
  authorizationGranted: true;
}

export type F18PreflightResult =
  | {
      result: "blocked";
      evidenceId: string;
      blockers: F18Blocker[];
      executableAuthorizationLiteral: null;
    }
  | { result: "fail_closed"; code: string };

export type F18PacketResult =
  | { result: "pass"; packetId: string }
  | { result: "fail_closed"; code: string };

function hash(prefix: string, value: unknown): string {
  return prefix + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function validateF18LivePreflight(value: unknown): F18PreflightResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const v = value as Partial<F18LiveSnapshot>;

  if (v.schema !== F18_SCHEMA) return { result: "fail_closed", code: "invalid_shape" };
  if (v.parentMainCommit !== F18_PARENT_MAIN_COMMIT || v.parentMainTree !== F18_PARENT_MAIN_TREE) {
    return { result: "fail_closed", code: "lineage_mismatch" };
  }
  if (v.railwayProjectId !== F18_RAILWAY_PROJECT_ID || v.railwayReadBackVerified !== true) {
    return { result: "fail_closed", code: "railway_identity_mismatch" };
  }
  if (!Array.isArray(v.environments) || v.environments.length !== 1 ||
      v.environments[0]?.id !== F18_PRODUCTION_ENVIRONMENT_ID ||
      v.environments[0]?.name !== "production") {
    return { result: "fail_closed", code: "environment_snapshot_mismatch" };
  }
  if (v.productionEnvironmentId !== F18_PRODUCTION_ENVIRONMENT_ID ||
      v.productionServiceId !== F18_PRODUCTION_SERVICE_ID ||
      v.productionServiceName !== F18_PRODUCTION_SERVICE_NAME ||
      v.postgresServiceId !== F18_POSTGRES_SERVICE_ID ||
      v.postgresVolumeId !== F18_POSTGRES_VOLUME_ID ||
      v.productionDomain !== F18_PRODUCTION_DOMAIN) {
    return { result: "fail_closed", code: "protected_resource_mismatch" };
  }
  if (v.stagedPatchId !== F18_STAGED_PATCH_ID || v.stagedAuthPublicOriginPresent !== true) {
    return { result: "fail_closed", code: "staged_patch_mismatch" };
  }
  if (v.productionSourceRepository !== "intssere/SEO_ENGINE" ||
      v.productionSourceBranch !== "main" ||
      v.checkSuitesEnabled !== true ||
      v.mainMergeAutoDeployObserved !== true ||
      v.latestObservedMainDeploymentId !== F18_LATEST_OBSERVED_MAIN_DEPLOYMENT_ID ||
      v.latestObservedMainDeploymentStatus !== "FAILED") {
    return { result: "fail_closed", code: "auto_deploy_hazard_mismatch" };
  }
  if (v.healthcheckPath !== F18_HEALTHCHECK_PATH || v.immutableImage !== F18_IMMUTABLE_IMAGE) {
    return { result: "fail_closed", code: "fixture_contract_mismatch" };
  }
  if (v.registryPullabilityVerified !== false || v.executableAuthorizationLiteral !== null) {
    return { result: "fail_closed", code: "premature_authorization" };
  }

  return {
    result: "blocked",
    evidenceId: hash("f18-preflight-", v),
    blockers: [
      "no_non_production_environment",
      "registry_pullability_unverified",
      "main_merge_triggers_production_deployment",
    ],
    executableAuthorizationLiteral: null,
  };
}

export function validateF18FutureFixturePacket(value: unknown): F18PacketResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const v = value as Partial<F18FutureFixturePacket>;

  if (v.schema !== "p8-8-w09c3fa-f18-one-shot-fixture-packet-v1") {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  if (v.railwayProjectId !== F18_RAILWAY_PROJECT_ID) return { result: "fail_closed", code: "wrong_project" };
  if (!v.environmentId || v.environmentId === F18_PRODUCTION_ENVIRONMENT_ID ||
      !v.environmentName || v.environmentName.toLowerCase() === "production" ||
      v.productionEnvironment !== false || v.environmentReadBackVerified !== true) {
    return { result: "fail_closed", code: "non_production_environment_unverified" };
  }
  if (!v.fixtureServiceName || v.fixtureServiceName === F18_PRODUCTION_SERVICE_NAME ||
      v.fixtureServiceAbsentVerified !== true) {
    return { result: "fail_closed", code: "fixture_service_boundary_violation" };
  }
  if (v.image !== F18_IMMUTABLE_IMAGE || v.registryPullabilityVerified !== true) {
    return { result: "fail_closed", code: "image_pullability_unverified" };
  }
  if (v.healthcheckPath !== F18_HEALTHCHECK_PATH || v.expectedHttpStatus !== 200) {
    return { result: "fail_closed", code: "healthcheck_mismatch" };
  }
  if (v.maximumDeployments !== 1 || v.maximumTeardownAttempts !== 1) {
    return { result: "fail_closed", code: "one_shot_violation" };
  }
  if (v.variableMutation !== false || v.databaseAttachment !== false ||
      v.persistentVolume !== false || v.customDomain !== false ||
      v.providerCalls !== false || v.schedulerWorkerActivation !== false ||
      v.productionServiceMutation !== false || v.stagedPatchMutation !== false ||
      v.productionCutover !== false) {
    return { result: "fail_closed", code: "side_effect_boundary_violation" };
  }
  if (v.teardownRequired !== true || v.teardownScope !== "fixture_service_only") {
    return { result: "fail_closed", code: "teardown_boundary_violation" };
  }
  if (!v.exactAuthorizationLiteral ||
      !v.exactAuthorizationLiteral.startsWith("AUTHORIZE W09-C3F-A-F18 ONE-SHOT RAILWAY FIXTURE") ||
      v.authorizationGranted !== true) {
    return { result: "fail_closed", code: "authorization_missing" };
  }
  return { result: "pass", packetId: hash("f18-packet-", v) };
}

export const F18_CERTIFIED_LIVE_SNAPSHOT: F18LiveSnapshot = {
  schema: F18_SCHEMA,
  parentMainCommit: F18_PARENT_MAIN_COMMIT,
  parentMainTree: F18_PARENT_MAIN_TREE,
  railwayProjectId: F18_RAILWAY_PROJECT_ID,
  railwayReadBackVerified: true,
  environments: [{ id: F18_PRODUCTION_ENVIRONMENT_ID, name: "production" }],
  productionEnvironmentId: F18_PRODUCTION_ENVIRONMENT_ID,
  productionServiceId: F18_PRODUCTION_SERVICE_ID,
  productionServiceName: F18_PRODUCTION_SERVICE_NAME,
  postgresServiceId: F18_POSTGRES_SERVICE_ID,
  postgresVolumeId: F18_POSTGRES_VOLUME_ID,
  productionDomain: F18_PRODUCTION_DOMAIN,
  stagedPatchId: F18_STAGED_PATCH_ID,
  stagedAuthPublicOriginPresent: true,
  productionSourceRepository: "intssere/SEO_ENGINE",
  productionSourceBranch: "main",
  checkSuitesEnabled: true,
  mainMergeAutoDeployObserved: true,
  latestObservedMainDeploymentId: F18_LATEST_OBSERVED_MAIN_DEPLOYMENT_ID,
  latestObservedMainDeploymentStatus: "FAILED",
  healthcheckPath: F18_HEALTHCHECK_PATH,
  immutableImage: F18_IMMUTABLE_IMAGE,
  registryPullabilityVerified: false,
  executableAuthorizationLiteral: null,
};
