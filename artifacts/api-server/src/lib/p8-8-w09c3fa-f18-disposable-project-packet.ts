import { createHash } from "node:crypto";

export const F18_FIXTURE_PACKET_SCHEMA = "p8-8-w09c3fa-f18-disposable-project-packet-v1" as const;
export const F18_FIXTURE_PROJECT_ID = "ba649d1b-049e-4100-a141-b91f80f2b9cd" as const;
export const F18_FIXTURE_PROJECT_NAME = "seo-engine-f18-fixture" as const;
export const F18_FIXTURE_ENVIRONMENT_ID = "9874824f-9baf-4ff2-91f4-83f815ab872b" as const;
export const F18_FIXTURE_ENVIRONMENT_NAME = "production" as const;
export const F18_FIXTURE_SERVICE_NAME = "seo-engine-f18-fixture-run" as const;
export const F18_FIXTURE_IMAGE =
  "ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22" as const;
export const F18_FIXTURE_HEALTHCHECK = "/api/healthz" as const;
export const F18_FIXTURE_AUTHORIZATION_LITERAL = "AUTHORIZE W09-C3F-A-F18 ONE-SHOT RAILWAY FIXTURE — target disposable project ba649d1b-049e-4100-a141-b91f80f2b9cd environment 9874824f-9baf-4ff2-91f4-83f815ab872b; create exactly one service named seo-engine-f18-fixture-run from ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22 with healthcheck /api/healthz in the atomic create operation; exactly one deployment attempt and no retry; observe the deployment to terminal state; if and only if Railway reports SUCCESS treat exact-digest pullability and HTTP-200 healthcheck as proven; regardless of success or failure delete exactly the created service by returned service ID using removeServiceTool; no variables, database, volume, domain, GitHub source, provider calls, scheduler/worker activation, Production SEO ENGINE mutation, staged AUTH_PUBLIC_ORIGIN mutation, Neon/Production DB access, or Production cutover." as const;

export interface F18DisposableProjectEvidence {
  schema: typeof F18_FIXTURE_PACKET_SCHEMA;
  projectId: typeof F18_FIXTURE_PROJECT_ID;
  projectName: typeof F18_FIXTURE_PROJECT_NAME;
  projectPrivate: true;
  workspaceId: "59f3284e-8f24-4948-895a-489377ee95ea";
  environmentId: typeof F18_FIXTURE_ENVIRONMENT_ID;
  environmentName: typeof F18_FIXTURE_ENVIRONMENT_NAME;
  isolatedDisposableProject: true;
  serviceCount: 0;
  deploymentCount: 0;
  bucketsCount: 0;
  stagedChanges: null;
  effectivePendingChangeCount: 0;
  productionSeoEngineUntouched: true;
  exactImage: typeof F18_FIXTURE_IMAGE;
  registryPullabilityPreverified: false;
  readOnlyRegistryProbeAvailable: false;
  atomicImageAndHealthcheckCreateAvailable: true;
  atomicCreateTriggersOneInitialDeployment: true;
  exactServiceDeletionAvailable: true;
  serviceDeletionScope: "service_id_only";
  executableAuthorizationLiteral: typeof F18_FIXTURE_AUTHORIZATION_LITERAL;
}

export type F18DisposableProjectResult =
  | { result: "ready_for_authorization"; packetId: string; literal: typeof F18_FIXTURE_AUTHORIZATION_LITERAL }
  | { result: "fail_closed"; code: string };

function hash(value: unknown): string {
  return "f18-fixture-ready-" + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function validateF18DisposableProjectEvidence(value: unknown): F18DisposableProjectResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const v = value as Partial<F18DisposableProjectEvidence>;
  if (v.schema !== F18_FIXTURE_PACKET_SCHEMA) return { result: "fail_closed", code: "invalid_shape" };
  if (v.projectId !== F18_FIXTURE_PROJECT_ID || v.projectName !== F18_FIXTURE_PROJECT_NAME ||
      v.projectPrivate !== true || v.workspaceId !== "59f3284e-8f24-4948-895a-489377ee95ea") {
    return { result: "fail_closed", code: "project_identity_mismatch" };
  }
  if (v.environmentId !== F18_FIXTURE_ENVIRONMENT_ID ||
      v.environmentName !== F18_FIXTURE_ENVIRONMENT_NAME ||
      v.isolatedDisposableProject !== true) {
    return { result: "fail_closed", code: "environment_identity_mismatch" };
  }
  if (v.serviceCount !== 0 || v.deploymentCount !== 0 || v.bucketsCount !== 0 ||
      v.stagedChanges !== null || v.effectivePendingChangeCount !== 0) {
    return { result: "fail_closed", code: "fixture_not_empty" };
  }
  if (v.productionSeoEngineUntouched !== true) {
    return { result: "fail_closed", code: "production_boundary_violation" };
  }
  if (v.exactImage !== F18_FIXTURE_IMAGE) return { result: "fail_closed", code: "image_mismatch" };
  if (v.registryPullabilityPreverified !== false || v.readOnlyRegistryProbeAvailable !== false) {
    return { result: "fail_closed", code: "registry_probe_state_mismatch" };
  }
  if (v.atomicImageAndHealthcheckCreateAvailable !== true ||
      v.atomicCreateTriggersOneInitialDeployment !== true) {
    return { result: "fail_closed", code: "atomic_create_unavailable" };
  }
  if (v.exactServiceDeletionAvailable !== true || v.serviceDeletionScope !== "service_id_only") {
    return { result: "fail_closed", code: "teardown_unavailable" };
  }
  if (v.executableAuthorizationLiteral !== F18_FIXTURE_AUTHORIZATION_LITERAL) {
    return { result: "fail_closed", code: "authorization_literal_mismatch" };
  }
  return {
    result: "ready_for_authorization",
    packetId: hash(v),
    literal: F18_FIXTURE_AUTHORIZATION_LITERAL,
  };
}

export const F18_CERTIFIED_DISPOSABLE_PROJECT_EVIDENCE: F18DisposableProjectEvidence = {
  schema: F18_FIXTURE_PACKET_SCHEMA,
  projectId: F18_FIXTURE_PROJECT_ID,
  projectName: F18_FIXTURE_PROJECT_NAME,
  projectPrivate: true,
  workspaceId: "59f3284e-8f24-4948-895a-489377ee95ea",
  environmentId: F18_FIXTURE_ENVIRONMENT_ID,
  environmentName: F18_FIXTURE_ENVIRONMENT_NAME,
  isolatedDisposableProject: true,
  serviceCount: 0,
  deploymentCount: 0,
  bucketsCount: 0,
  stagedChanges: null,
  effectivePendingChangeCount: 0,
  productionSeoEngineUntouched: true,
  exactImage: F18_FIXTURE_IMAGE,
  registryPullabilityPreverified: false,
  readOnlyRegistryProbeAvailable: false,
  atomicImageAndHealthcheckCreateAvailable: true,
  atomicCreateTriggersOneInitialDeployment: true,
  exactServiceDeletionAvailable: true,
  serviceDeletionScope: "service_id_only",
  executableAuthorizationLiteral: F18_FIXTURE_AUTHORIZATION_LITERAL,
};
