import { createHash } from "node:crypto";

export const F20_SCHEMA = "p8-8-w09c3fa-f20-production-image-transition-preflight-v1" as const;
export const F20_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const F20_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const F20_SERVICE_ID = "1e8c1e7d-16f7-4c63-8193-1021bcbe6d90" as const;
export const F20_STAGED_PATCH_ID = "5d9ed802-32c2-4d0a-ac8a-b45a010ca535" as const;
export const F20_IMAGE = "ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22" as const;

export interface F20Evidence {
  schema: typeof F20_SCHEMA;
  projectId: typeof F20_PROJECT_ID;
  environmentId: typeof F20_ENVIRONMENT_ID;
  serviceId: typeof F20_SERVICE_ID;
  serviceName: "seo-engine-shadow";
  currentSource: { repo: "intssere/SEO_ENGINE"; branch: "main" };
  autodeployEnabled: false;
  targetImage: typeof F20_IMAGE;
  exactDigestPullabilityProven: true;
  healthcheckPath: "/api/healthz";
  healthcheckReadinessProven: true;
  imageTransitionCapabilityAvailable: true;
  transitionTool: "updateServiceTool";
  sourceUpdateStagesOnly: true;
  commitAppliesAllStagedEnvironmentChanges: true;
  unrelatedStagedPatchPresent: true;
  unrelatedStagedPatchId: typeof F20_STAGED_PATCH_ID;
  unrelatedStagedVariables: readonly ["AUTH_PUBLIC_ORIGIN"];
  productionCutoverAuthorized: false;
  sourceMutationAuthorized: false;
  stagedPatchMutationAuthorized: false;
}

export type F20Result =
  | {
      result: "blocked_unrelated_staged_changes";
      packetId: string;
      blockers: readonly ["unrelated_staged_environment_patch"];
    }
  | { result: "fail_closed"; code: string };

function packetId(value: F20Evidence): string {
  return "f20-preflight-" + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function validateF20Evidence(value: unknown): F20Result {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const v = value as Partial<F20Evidence>;
  if (
    v.schema !== F20_SCHEMA ||
    v.projectId !== F20_PROJECT_ID ||
    v.environmentId !== F20_ENVIRONMENT_ID ||
    v.serviceId !== F20_SERVICE_ID ||
    v.serviceName !== "seo-engine-shadow"
  ) return { result: "fail_closed", code: "identity_mismatch" };

  if (v.currentSource?.repo !== "intssere/SEO_ENGINE" || v.currentSource?.branch !== "main") {
    return { result: "fail_closed", code: "source_mismatch" };
  }
  if (v.autodeployEnabled !== false) return { result: "fail_closed", code: "autodeploy_not_disabled" };
  if (v.targetImage !== F20_IMAGE) return { result: "fail_closed", code: "image_mismatch" };
  if (v.exactDigestPullabilityProven !== true || v.healthcheckReadinessProven !== true) {
    return { result: "fail_closed", code: "fixture_proof_missing" };
  }
  if (
    v.imageTransitionCapabilityAvailable !== true ||
    v.transitionTool !== "updateServiceTool" ||
    v.sourceUpdateStagesOnly !== true ||
    v.commitAppliesAllStagedEnvironmentChanges !== true
  ) return { result: "fail_closed", code: "transition_capability_mismatch" };

  if (
    v.productionCutoverAuthorized !== false ||
    v.sourceMutationAuthorized !== false ||
    v.stagedPatchMutationAuthorized !== false
  ) return { result: "fail_closed", code: "authorization_boundary_open" };

  if (
    v.unrelatedStagedPatchPresent !== true ||
    v.unrelatedStagedPatchId !== F20_STAGED_PATCH_ID ||
    !Array.isArray(v.unrelatedStagedVariables) ||
    v.unrelatedStagedVariables.length !== 1 ||
    v.unrelatedStagedVariables[0] !== "AUTH_PUBLIC_ORIGIN"
  ) return { result: "fail_closed", code: "staged_patch_state_mismatch" };

  return {
    result: "blocked_unrelated_staged_changes",
    packetId: packetId(v as F20Evidence),
    blockers: ["unrelated_staged_environment_patch"],
  };
}

export const F20_CERTIFIED_EVIDENCE: F20Evidence = {
  schema: F20_SCHEMA,
  projectId: F20_PROJECT_ID,
  environmentId: F20_ENVIRONMENT_ID,
  serviceId: F20_SERVICE_ID,
  serviceName: "seo-engine-shadow",
  currentSource: { repo: "intssere/SEO_ENGINE", branch: "main" },
  autodeployEnabled: false,
  targetImage: F20_IMAGE,
  exactDigestPullabilityProven: true,
  healthcheckPath: "/api/healthz",
  healthcheckReadinessProven: true,
  imageTransitionCapabilityAvailable: true,
  transitionTool: "updateServiceTool",
  sourceUpdateStagesOnly: true,
  commitAppliesAllStagedEnvironmentChanges: true,
  unrelatedStagedPatchPresent: true,
  unrelatedStagedPatchId: F20_STAGED_PATCH_ID,
  unrelatedStagedVariables: ["AUTH_PUBLIC_ORIGIN"],
  productionCutoverAuthorized: false,
  sourceMutationAuthorized: false,
  stagedPatchMutationAuthorized: false,
};
