import { createHash } from "node:crypto";
import {
  P12_2_L10_13D_RECEIPT,
  assertP122L1013DFixtureReceipt,
  p122L1013DFixtureReceiptFingerprint,
} from "./p12-2-l10-13d-fixture-execution-receipt.js";

export const P12_2_L10_13E_SCHEMA =
  "p12-2-l10-13e-production-app-image-transition-v1" as const;

export const P12_2_L10_13E_PACKET_PARENT_MAIN =
  "740a160e6ee6f2ac01b0c78903350dcd90810ee6" as const;
export const P12_2_L10_13E_PACKET_PARENT_TREE =
  "812d9ab9f450f4eb835a866e57ba166e0ae1382a" as const;

export const P12_2_L10_13E_RELEASE_SOURCE_SHA =
  "1ba86a2b9fe18384bb526128db8757c8dd8b680a" as const;
export const P12_2_L10_13E_RELEASE_SOURCE_TREE =
  "47513f433cf4a077bbf338231935e70a1297aad4" as const;
export const P12_2_L10_13E_RELEASE_RUN_ID = 37445409912 as const;
export const P12_2_L10_13E_RELEASE_ATTESTATION_ID = 53124772 as const;

export const P12_2_L10_13E_OLD_IMAGE =
  "ghcr.io/intssere/seo-engine@sha256:30632cc85de834c5dfb2ee6e34c55cab3e68d799ae69be8dcd8c0efa6fc3b283" as const;
export const P12_2_L10_13E_NEW_IMAGE = P12_2_L10_13D_RECEIPT.image;

export const P12_2_L10_13E_PROJECT_ID =
  "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const P12_2_L10_13E_ENVIRONMENT_ID =
  "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const P12_2_L10_13E_SERVICE_ID =
  "1e8c1e7d-16f7-4c63-8193-1021bcbe6d90" as const;
export const P12_2_L10_13E_SERVICE_NAME = "seo-engine-shadow" as const;
export const P12_2_L10_13E_CURRENT_DEPLOYMENT_ID =
  "2a826409-4ba5-4b49-84a9-991aff4351d6" as const;

export const P12_2_L10_13E_DOMAIN_ID =
  "985121f2-2edb-4a27-9e9a-165e306eeb49" as const;
export const P12_2_L10_13E_DOMAIN =
  "seo-engine-shadow-production.up.railway.app" as const;

export interface P122L1013EProductionSnapshot {
  schema: typeof P12_2_L10_13E_SCHEMA;
  packetParentMain: typeof P12_2_L10_13E_PACKET_PARENT_MAIN;
  packetParentTree: typeof P12_2_L10_13E_PACKET_PARENT_TREE;
  releaseSourceSha: typeof P12_2_L10_13E_RELEASE_SOURCE_SHA;
  releaseSourceTree: typeof P12_2_L10_13E_RELEASE_SOURCE_TREE;
  releaseRunId: typeof P12_2_L10_13E_RELEASE_RUN_ID;
  releaseAttestationId: typeof P12_2_L10_13E_RELEASE_ATTESTATION_ID;
  fixtureReceiptFingerprint: string;
  projectId: typeof P12_2_L10_13E_PROJECT_ID;
  environmentId: typeof P12_2_L10_13E_ENVIRONMENT_ID;
  serviceId: typeof P12_2_L10_13E_SERVICE_ID;
  serviceName: typeof P12_2_L10_13E_SERVICE_NAME;
  currentImage: typeof P12_2_L10_13E_OLD_IMAGE;
  targetImage: typeof P12_2_L10_13E_NEW_IMAGE;
  currentDeploymentId: typeof P12_2_L10_13E_CURRENT_DEPLOYMENT_ID;
  currentDeploymentStatus: "SUCCESS";
  currentState: "live";
  environmentStagedChanges: null;
  serviceStagedChangeCount: 0;
  region: "europe-west4-drams3a";
  replicas: 1;
  healthcheckPath: "/api/healthz";
  healthcheckTimeout: 120;
  runtime: "V2";
  builder: "DOCKERFILE";
  buildEnvironment: "V3";
  dockerfilePath: "Dockerfile";
  restartPolicyMaxRetries: 3;
  domainId: typeof P12_2_L10_13E_DOMAIN_ID;
  domain: typeof P12_2_L10_13E_DOMAIN;
  domainTargetPort: 8080;
  customDomainCount: 0;
  attachedVolumeCount: 0;
  pendingWorkCount: 0;
  activeWarningCount: 0;
  activeCriticalCount: 0;
  recentFailureCount: 0;
  forwardDeploymentAttempts: 1;
  forwardDeploymentRetries: 0;
  sourceImageOnlyMutation: true;
  rollbackAuthorized: false;
  variableMutation: false;
  domainMutation: false;
  databaseMutation: false;
  databaseAttachmentMutation: false;
  volumeMutation: false;
  schedulerWorkerActivation: false;
  providerOrPublicSiteWrites: false;
  migration0010ApplyAuthorized: false;
  crawlOrRecoveryExecutionAuthorized: false;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort()
    .map((key) => JSON.stringify(key) + ":" + stableSerialize(object[key]))
    .join(",") + "}";
}

export function p122L1013ETransitionFingerprint(
  snapshot: P122L1013EProductionSnapshot,
): string {
  return createHash("sha256").update(stableSerialize(snapshot)).digest("hex");
}

export function p122L1013EAuthorizationLiteral(
  snapshot: P122L1013EProductionSnapshot,
): string {
  return `AUTHORIZE:P12_2_L10_13E_PRODUCTION_APP_IMAGE_TRANSITION:${p122L1013ETransitionFingerprint(snapshot)}`;
}

export type P122L1013EValidationResult =
  | {
      result: "ready_for_transition_authorization";
      transitionFingerprint: string;
      authorizationLiteral: string;
    }
  | { result: "fail_closed"; code: string };

export function validateP122L1013EProductionSnapshot(
  value: unknown,
): P122L1013EValidationResult {
  assertP122L1013DFixtureReceipt();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const v = value as Partial<P122L1013EProductionSnapshot>;

  if (
    v.schema !== P12_2_L10_13E_SCHEMA ||
    v.packetParentMain !== P12_2_L10_13E_PACKET_PARENT_MAIN ||
    v.packetParentTree !== P12_2_L10_13E_PACKET_PARENT_TREE ||
    v.releaseSourceSha !== P12_2_L10_13E_RELEASE_SOURCE_SHA ||
    v.releaseSourceTree !== P12_2_L10_13E_RELEASE_SOURCE_TREE ||
    v.releaseRunId !== P12_2_L10_13E_RELEASE_RUN_ID ||
    v.releaseAttestationId !== P12_2_L10_13E_RELEASE_ATTESTATION_ID ||
    v.fixtureReceiptFingerprint !== p122L1013DFixtureReceiptFingerprint()
  ) return { result: "fail_closed", code: "lineage_mismatch" };

  if (
    v.projectId !== P12_2_L10_13E_PROJECT_ID ||
    v.environmentId !== P12_2_L10_13E_ENVIRONMENT_ID ||
    v.serviceId !== P12_2_L10_13E_SERVICE_ID ||
    v.serviceName !== P12_2_L10_13E_SERVICE_NAME ||
    v.currentImage !== P12_2_L10_13E_OLD_IMAGE ||
    v.targetImage !== P12_2_L10_13E_NEW_IMAGE ||
    v.currentDeploymentId !== P12_2_L10_13E_CURRENT_DEPLOYMENT_ID ||
    v.currentDeploymentStatus !== "SUCCESS" ||
    v.currentState !== "live" ||
    v.environmentStagedChanges !== null ||
    v.serviceStagedChangeCount !== 0 ||
    v.pendingWorkCount !== 0
  ) return { result: "fail_closed", code: "production_state_mismatch" };

  if (
    v.region !== "europe-west4-drams3a" ||
    v.replicas !== 1 ||
    v.healthcheckPath !== "/api/healthz" ||
    v.healthcheckTimeout !== 120 ||
    v.runtime !== "V2" ||
    v.builder !== "DOCKERFILE" ||
    v.buildEnvironment !== "V3" ||
    v.dockerfilePath !== "Dockerfile" ||
    v.restartPolicyMaxRetries !== 3 ||
    v.domainId !== P12_2_L10_13E_DOMAIN_ID ||
    v.domain !== P12_2_L10_13E_DOMAIN ||
    v.domainTargetPort !== 8080 ||
    v.customDomainCount !== 0 ||
    v.attachedVolumeCount !== 0 ||
    v.activeWarningCount !== 0 ||
    v.activeCriticalCount !== 0 ||
    v.recentFailureCount !== 0
  ) return { result: "fail_closed", code: "production_config_mismatch" };

  if (
    v.forwardDeploymentAttempts !== 1 ||
    v.forwardDeploymentRetries !== 0 ||
    v.sourceImageOnlyMutation !== true ||
    v.rollbackAuthorized !== false ||
    v.variableMutation !== false ||
    v.domainMutation !== false ||
    v.databaseMutation !== false ||
    v.databaseAttachmentMutation !== false ||
    v.volumeMutation !== false ||
    v.schedulerWorkerActivation !== false ||
    v.providerOrPublicSiteWrites !== false ||
    v.migration0010ApplyAuthorized !== false ||
    v.crawlOrRecoveryExecutionAuthorized !== false
  ) return { result: "fail_closed", code: "transition_boundary_mismatch" };

  const snapshot = v as P122L1013EProductionSnapshot;
  return {
    result: "ready_for_transition_authorization",
    transitionFingerprint: p122L1013ETransitionFingerprint(snapshot),
    authorizationLiteral: p122L1013EAuthorizationLiteral(snapshot),
  };
}

export const P12_2_L10_13E_CERTIFIED_PRODUCTION_SNAPSHOT:
  P122L1013EProductionSnapshot = {
    schema: P12_2_L10_13E_SCHEMA,
    packetParentMain: P12_2_L10_13E_PACKET_PARENT_MAIN,
    packetParentTree: P12_2_L10_13E_PACKET_PARENT_TREE,
    releaseSourceSha: P12_2_L10_13E_RELEASE_SOURCE_SHA,
    releaseSourceTree: P12_2_L10_13E_RELEASE_SOURCE_TREE,
    releaseRunId: P12_2_L10_13E_RELEASE_RUN_ID,
    releaseAttestationId: P12_2_L10_13E_RELEASE_ATTESTATION_ID,
    fixtureReceiptFingerprint: p122L1013DFixtureReceiptFingerprint(),
    projectId: P12_2_L10_13E_PROJECT_ID,
    environmentId: P12_2_L10_13E_ENVIRONMENT_ID,
    serviceId: P12_2_L10_13E_SERVICE_ID,
    serviceName: P12_2_L10_13E_SERVICE_NAME,
    currentImage: P12_2_L10_13E_OLD_IMAGE,
    targetImage: P12_2_L10_13E_NEW_IMAGE,
    currentDeploymentId: P12_2_L10_13E_CURRENT_DEPLOYMENT_ID,
    currentDeploymentStatus: "SUCCESS",
    currentState: "live",
    environmentStagedChanges: null,
    serviceStagedChangeCount: 0,
    region: "europe-west4-drams3a",
    replicas: 1,
    healthcheckPath: "/api/healthz",
    healthcheckTimeout: 120,
    runtime: "V2",
    builder: "DOCKERFILE",
    buildEnvironment: "V3",
    dockerfilePath: "Dockerfile",
    restartPolicyMaxRetries: 3,
    domainId: P12_2_L10_13E_DOMAIN_ID,
    domain: P12_2_L10_13E_DOMAIN,
    domainTargetPort: 8080,
    customDomainCount: 0,
    attachedVolumeCount: 0,
    pendingWorkCount: 0,
    activeWarningCount: 0,
    activeCriticalCount: 0,
    recentFailureCount: 0,
    forwardDeploymentAttempts: 1,
    forwardDeploymentRetries: 0,
    sourceImageOnlyMutation: true,
    rollbackAuthorized: false,
    variableMutation: false,
    domainMutation: false,
    databaseMutation: false,
    databaseAttachmentMutation: false,
    volumeMutation: false,
    schedulerWorkerActivation: false,
    providerOrPublicSiteWrites: false,
    migration0010ApplyAuthorized: false,
    crawlOrRecoveryExecutionAuthorized: false,
  };
