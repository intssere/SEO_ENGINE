import { createHash } from "node:crypto";

export const F18_EXECUTION_RECEIPT_SCHEMA = "p8-8-w09c3fa-f18-execution-receipt-v1" as const;

export const F18_EXECUTION_PROJECT_ID = "ba649d1b-049e-4100-a141-b91f80f2b9cd" as const;
export const F18_EXECUTION_ENVIRONMENT_ID = "9874824f-9baf-4ff2-91f4-83f815ab872b" as const;
export const F18_EXECUTION_SERVICE_ID = "2689d14a-e183-4c63-ab6e-a853704303f4" as const;
export const F18_EXECUTION_SERVICE_NAME = "seo-engine-f18-fixture-run" as const;
export const F18_EXECUTION_DEPLOYMENT_ID = "3941a426-ee94-46ce-a98e-d61a080c857e" as const;
export const F18_EXECUTION_IMAGE =
  "ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22" as const;
export const F18_EXECUTION_HEALTHCHECK = "/api/healthz" as const;
export const F18_TEARDOWN_PATCH_ID = "6302e817-5b83-48d1-8036-3979b5944a59" as const;

export interface F18ExecutionReceiptEvidence {
  schema: typeof F18_EXECUTION_RECEIPT_SCHEMA;
  projectId: typeof F18_EXECUTION_PROJECT_ID;
  environmentId: typeof F18_EXECUTION_ENVIRONMENT_ID;
  serviceId: typeof F18_EXECUTION_SERVICE_ID;
  serviceName: typeof F18_EXECUTION_SERVICE_NAME;
  deploymentId: typeof F18_EXECUTION_DEPLOYMENT_ID;
  deploymentAttempts: 1;
  deploymentStatus: "SUCCESS";
  deploymentRetryCount: 0;
  image: typeof F18_EXECUTION_IMAGE;
  healthcheckPath: typeof F18_EXECUTION_HEALTHCHECK;
  exactDigestPullabilityProven: true;
  http200HealthcheckProven: true;
  variableMutation: false;
  databaseAttachment: false;
  persistentVolume: false;
  domainMutation: false;
  githubSourceMutation: false;
  providerCalls: false;
  schedulerWorkerActivation: false;
  productionSeoEngineMutation: false;
  stagedAuthPublicOriginMutation: false;
  neonProductionDbAccess: false;
  productionCutover: false;
  teardownRequested: true;
  teardownServiceId: typeof F18_EXECUTION_SERVICE_ID;
  teardownPatchId: typeof F18_TEARDOWN_PATCH_ID;
  teardownPatchChangeCount: 1;
  teardownScope: "service_id_only";
  teardownCommitAttempted: true;
  teardownCommitBlockedBy2FA: true;
  teardownCommitted: true;
  serviceStillPresentPending2FA: false;
  fixtureComplete: true;
  completionBlocker: null;
}

export type F18ExecutionReceiptResult =
  | {
      result: "pass";
      receiptId: string;
      pullability: "proven";
      healthcheck: "proven";
      teardown: "completed";
    }
  | { result: "fail_closed"; code: string };

function hash(value: unknown): string {
  return "f18-execution-" + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function validateF18ExecutionReceipt(value: unknown): F18ExecutionReceiptResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const v = value as Partial<F18ExecutionReceiptEvidence>;

  if (v.schema !== F18_EXECUTION_RECEIPT_SCHEMA) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  if (
    v.projectId !== F18_EXECUTION_PROJECT_ID ||
    v.environmentId !== F18_EXECUTION_ENVIRONMENT_ID ||
    v.serviceId !== F18_EXECUTION_SERVICE_ID ||
    v.serviceName !== F18_EXECUTION_SERVICE_NAME
  ) {
    return { result: "fail_closed", code: "fixture_identity_mismatch" };
  }
  if (
    v.deploymentId !== F18_EXECUTION_DEPLOYMENT_ID ||
    v.deploymentAttempts !== 1 ||
    v.deploymentStatus !== "SUCCESS" ||
    v.deploymentRetryCount !== 0
  ) {
    return { result: "fail_closed", code: "one_shot_deployment_mismatch" };
  }
  if (
    v.image !== F18_EXECUTION_IMAGE ||
    v.healthcheckPath !== F18_EXECUTION_HEALTHCHECK ||
    v.exactDigestPullabilityProven !== true ||
    v.http200HealthcheckProven !== true
  ) {
    return { result: "fail_closed", code: "release_verification_mismatch" };
  }
  if (
    v.variableMutation !== false ||
    v.databaseAttachment !== false ||
    v.persistentVolume !== false ||
    v.domainMutation !== false ||
    v.githubSourceMutation !== false ||
    v.providerCalls !== false ||
    v.schedulerWorkerActivation !== false ||
    v.productionSeoEngineMutation !== false ||
    v.stagedAuthPublicOriginMutation !== false ||
    v.neonProductionDbAccess !== false ||
    v.productionCutover !== false
  ) {
    return { result: "fail_closed", code: "side_effect_boundary_violation" };
  }
  if (
    v.teardownRequested !== true ||
    v.teardownServiceId !== F18_EXECUTION_SERVICE_ID ||
    v.teardownPatchId !== F18_TEARDOWN_PATCH_ID ||
    v.teardownPatchChangeCount !== 1 ||
    v.teardownScope !== "service_id_only"
  ) {
    return { result: "fail_closed", code: "teardown_identity_mismatch" };
  }
  if (
    v.teardownCommitAttempted !== true ||
    v.teardownCommitBlockedBy2FA !== true ||
    v.teardownCommitted !== true ||
    v.serviceStillPresentPending2FA !== false ||
    v.fixtureComplete !== true ||
    v.completionBlocker !== null
  ) {
    return { result: "fail_closed", code: "teardown_state_mismatch" };
  }

  return {
    result: "pass",
    receiptId: hash(v),
    pullability: "proven",
    healthcheck: "proven",
    teardown: "completed",
  };
}

export const F18_CERTIFIED_EXECUTION_RECEIPT: F18ExecutionReceiptEvidence = {
  schema: F18_EXECUTION_RECEIPT_SCHEMA,
  projectId: F18_EXECUTION_PROJECT_ID,
  environmentId: F18_EXECUTION_ENVIRONMENT_ID,
  serviceId: F18_EXECUTION_SERVICE_ID,
  serviceName: F18_EXECUTION_SERVICE_NAME,
  deploymentId: F18_EXECUTION_DEPLOYMENT_ID,
  deploymentAttempts: 1,
  deploymentStatus: "SUCCESS",
  deploymentRetryCount: 0,
  image: F18_EXECUTION_IMAGE,
  healthcheckPath: F18_EXECUTION_HEALTHCHECK,
  exactDigestPullabilityProven: true,
  http200HealthcheckProven: true,
  variableMutation: false,
  databaseAttachment: false,
  persistentVolume: false,
  domainMutation: false,
  githubSourceMutation: false,
  providerCalls: false,
  schedulerWorkerActivation: false,
  productionSeoEngineMutation: false,
  stagedAuthPublicOriginMutation: false,
  neonProductionDbAccess: false,
  productionCutover: false,
  teardownRequested: true,
  teardownServiceId: F18_EXECUTION_SERVICE_ID,
  teardownPatchId: F18_TEARDOWN_PATCH_ID,
  teardownPatchChangeCount: 1,
  teardownScope: "service_id_only",
  teardownCommitAttempted: true,
  teardownCommitBlockedBy2FA: true,
  teardownCommitted: true,
  serviceStillPresentPending2FA: false,
  fixtureComplete: true,
  completionBlocker: null,
};
