import { createHash } from "node:crypto";

export const P12_2_L10_13D_SCHEMA = "p12-2-l10-13d-compatible-app-image-fixture-v1" as const;
export const P12_2_L10_13D_SOURCE_SHA = "1ba86a2b9fe18384bb526128db8757c8dd8b680a" as const;
export const P12_2_L10_13D_SOURCE_TREE = "47513f433cf4a077bbf338231935e70a1297aad4" as const;
export const P12_2_L10_13D_RELEASE_RUN_ID = 37445409912 as const;
export const P12_2_L10_13D_RELEASE_ATTESTATION_ID = 53124772 as const;
export const P12_2_L10_13D_RELEASE_IMAGE =
  "ghcr.io/intssere/seo-engine@sha256:45cbaecd3e40f3354303b63c30b139ba155e02a753d50ad94eb1a627e25b61c2" as const;

export const P12_2_L10_13D_FIXTURE_PROJECT_ID = "ba649d1b-049e-4100-a141-b91f80f2b9cd" as const;
export const P12_2_L10_13D_FIXTURE_ENVIRONMENT_ID = "9874824f-9baf-4ff2-91f4-83f815ab872b" as const;
export const P12_2_L10_13D_FIXTURE_SERVICE_NAME = "seo-engine-l10-13d-fixture-run" as const;
export const P12_2_L10_13D_HEALTHCHECK_PATH = "/api/healthz" as const;

export const P12_2_L10_13D_PRODUCTION_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L10_13D_PRODUCTION_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L10_13D_PRODUCTION_SERVICE_ID = "1e8c1e7d-16f7-4c63-8193-1021bcbe6d90" as const;
export const P12_2_L10_13D_CURRENT_PRODUCTION_IMAGE =
  "ghcr.io/intssere/seo-engine@sha256:30632cc85de834c5dfb2ee6e34c55cab3e68d799ae69be8dcd8c0efa6fc3b283" as const;
export const P12_2_L10_13D_CURRENT_PRODUCTION_DEPLOYMENT_ID =
  "2a826409-4ba5-4b49-84a9-991aff4351d6" as const;

export interface P122L1013DLiveSnapshot {
  schema: typeof P12_2_L10_13D_SCHEMA;
  sourceSha: typeof P12_2_L10_13D_SOURCE_SHA;
  sourceTree: typeof P12_2_L10_13D_SOURCE_TREE;
  releaseRunId: typeof P12_2_L10_13D_RELEASE_RUN_ID;
  releaseAttestationId: typeof P12_2_L10_13D_RELEASE_ATTESTATION_ID;
  releaseImage: typeof P12_2_L10_13D_RELEASE_IMAGE;
  fixtureProjectId: typeof P12_2_L10_13D_FIXTURE_PROJECT_ID;
  fixtureEnvironmentId: typeof P12_2_L10_13D_FIXTURE_ENVIRONMENT_ID;
  fixtureServiceCount: 0;
  fixtureStagedChanges: null;
  productionProjectId: typeof P12_2_L10_13D_PRODUCTION_PROJECT_ID;
  productionEnvironmentId: typeof P12_2_L10_13D_PRODUCTION_ENVIRONMENT_ID;
  productionServiceId: typeof P12_2_L10_13D_PRODUCTION_SERVICE_ID;
  currentProductionImage: typeof P12_2_L10_13D_CURRENT_PRODUCTION_IMAGE;
  currentProductionDeploymentId: typeof P12_2_L10_13D_CURRENT_PRODUCTION_DEPLOYMENT_ID;
  currentProductionDeploymentStatus: "SUCCESS";
  productionStagedChanges: null;
  healthcheckPath: typeof P12_2_L10_13D_HEALTHCHECK_PATH;
  fixtureDeploymentAttempts: 1;
  fixtureRetries: 0;
  fixtureTeardownRequired: true;
  fixtureVariableMutation: false;
  fixtureDatabaseAttachment: false;
  fixturePersistentVolume: false;
  fixtureDomainMutation: false;
  productionMutation: false;
  productionTransitionAuthorized: false;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort()
    .map((key) => JSON.stringify(key) + ":" + stableSerialize(object[key]))
    .join(",") + "}";
}

export function p122L1013DFixturePacketFingerprint(value: P122L1013DLiveSnapshot): string {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

export function p122L1013DFixtureAuthorizationLiteral(value: P122L1013DLiveSnapshot): string {
  return `AUTHORIZE:P12_2_L10_13D_APP_IMAGE_FIXTURE:${p122L1013DFixturePacketFingerprint(value)}`;
}

export type P122L1013DResult =
  | {
      result: "ready_for_fixture_authorization";
      packetFingerprint: string;
      authorizationLiteral: string;
    }
  | { result: "fail_closed"; code: string };

export function validateP122L1013DLiveSnapshot(value: unknown): P122L1013DResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const v = value as Partial<P122L1013DLiveSnapshot>;
  if (
    v.schema !== P12_2_L10_13D_SCHEMA ||
    v.sourceSha !== P12_2_L10_13D_SOURCE_SHA ||
    v.sourceTree !== P12_2_L10_13D_SOURCE_TREE ||
    v.releaseRunId !== P12_2_L10_13D_RELEASE_RUN_ID ||
    v.releaseAttestationId !== P12_2_L10_13D_RELEASE_ATTESTATION_ID ||
    v.releaseImage !== P12_2_L10_13D_RELEASE_IMAGE
  ) return { result: "fail_closed", code: "release_identity_mismatch" };

  if (
    v.fixtureProjectId !== P12_2_L10_13D_FIXTURE_PROJECT_ID ||
    v.fixtureEnvironmentId !== P12_2_L10_13D_FIXTURE_ENVIRONMENT_ID ||
    v.fixtureServiceCount !== 0 ||
    v.fixtureStagedChanges !== null
  ) return { result: "fail_closed", code: "fixture_not_empty" };

  if (
    v.productionProjectId !== P12_2_L10_13D_PRODUCTION_PROJECT_ID ||
    v.productionEnvironmentId !== P12_2_L10_13D_PRODUCTION_ENVIRONMENT_ID ||
    v.productionServiceId !== P12_2_L10_13D_PRODUCTION_SERVICE_ID ||
    v.currentProductionImage !== P12_2_L10_13D_CURRENT_PRODUCTION_IMAGE ||
    v.currentProductionDeploymentId !== P12_2_L10_13D_CURRENT_PRODUCTION_DEPLOYMENT_ID ||
    v.currentProductionDeploymentStatus !== "SUCCESS" ||
    v.productionStagedChanges !== null
  ) return { result: "fail_closed", code: "production_snapshot_mismatch" };

  if (
    v.healthcheckPath !== P12_2_L10_13D_HEALTHCHECK_PATH ||
    v.fixtureDeploymentAttempts !== 1 ||
    v.fixtureRetries !== 0 ||
    v.fixtureTeardownRequired !== true ||
    v.fixtureVariableMutation !== false ||
    v.fixtureDatabaseAttachment !== false ||
    v.fixturePersistentVolume !== false ||
    v.fixtureDomainMutation !== false ||
    v.productionMutation !== false ||
    v.productionTransitionAuthorized !== false
  ) return { result: "fail_closed", code: "fixture_boundary_mismatch" };

  const snapshot = v as P122L1013DLiveSnapshot;
  return {
    result: "ready_for_fixture_authorization",
    packetFingerprint: p122L1013DFixturePacketFingerprint(snapshot),
    authorizationLiteral: p122L1013DFixtureAuthorizationLiteral(snapshot),
  };
}

export const P12_2_L10_13D_CERTIFIED_LIVE_SNAPSHOT: P122L1013DLiveSnapshot = {
  schema: P12_2_L10_13D_SCHEMA,
  sourceSha: P12_2_L10_13D_SOURCE_SHA,
  sourceTree: P12_2_L10_13D_SOURCE_TREE,
  releaseRunId: P12_2_L10_13D_RELEASE_RUN_ID,
  releaseAttestationId: P12_2_L10_13D_RELEASE_ATTESTATION_ID,
  releaseImage: P12_2_L10_13D_RELEASE_IMAGE,
  fixtureProjectId: P12_2_L10_13D_FIXTURE_PROJECT_ID,
  fixtureEnvironmentId: P12_2_L10_13D_FIXTURE_ENVIRONMENT_ID,
  fixtureServiceCount: 0,
  fixtureStagedChanges: null,
  productionProjectId: P12_2_L10_13D_PRODUCTION_PROJECT_ID,
  productionEnvironmentId: P12_2_L10_13D_PRODUCTION_ENVIRONMENT_ID,
  productionServiceId: P12_2_L10_13D_PRODUCTION_SERVICE_ID,
  currentProductionImage: P12_2_L10_13D_CURRENT_PRODUCTION_IMAGE,
  currentProductionDeploymentId: P12_2_L10_13D_CURRENT_PRODUCTION_DEPLOYMENT_ID,
  currentProductionDeploymentStatus: "SUCCESS",
  productionStagedChanges: null,
  healthcheckPath: P12_2_L10_13D_HEALTHCHECK_PATH,
  fixtureDeploymentAttempts: 1,
  fixtureRetries: 0,
  fixtureTeardownRequired: true,
  fixtureVariableMutation: false,
  fixtureDatabaseAttachment: false,
  fixturePersistentVolume: false,
  fixtureDomainMutation: false,
  productionMutation: false,
  productionTransitionAuthorized: false,
};
