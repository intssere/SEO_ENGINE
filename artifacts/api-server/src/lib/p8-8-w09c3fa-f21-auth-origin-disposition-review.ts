import { createHash } from "node:crypto";

export const F21_SCHEMA = "p8-8-w09c3fa-f21-auth-origin-disposition-review-v1" as const;
export const F21_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const F21_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const F21_SERVICE_ID = "1e8c1e7d-16f7-4c63-8193-1021bcbe6d90" as const;
export const F21_PATCH_ID = "5d9ed802-32c2-4d0a-ac8a-b45a010ca535" as const;
export const F21_PUBLIC_ORIGIN = "https://seo-engine-shadow-production.up.railway.app" as const;

export interface F21Evidence {
  schema: typeof F21_SCHEMA;
  projectId: typeof F21_PROJECT_ID;
  environmentId: typeof F21_ENVIRONMENT_ID;
  serviceId: typeof F21_SERVICE_ID;
  serviceName: "seo-engine-shadow";
  patchId: typeof F21_PATCH_ID;
  patchStatus: "STAGED";
  stagedVariables: readonly ["AUTH_PUBLIC_ORIGIN"];
  currentPublicOrigin: typeof F21_PUBLIC_ORIGIN;
  autodeployEnabled: false;
  exactResourceUpdateDiffVisible: false;
  currentAuthPublicOriginValueVisible: false;
  stagedAuthPublicOriginValueVisible: false;
  applyWouldTriggerDeployment: true;
  discardWouldLeaveCurrentRuntimeUnchanged: true;
  applyAuthorized: false;
  discardAuthorized: false;
  sourceMutationAuthorized: false;
  productionCutoverAuthorized: false;
}

export type F21Result =
  | {
      result: "blocked_value_unverified";
      packetId: string;
      blockers: readonly [
        "staged_auth_public_origin_value_not_visible",
        "exact_resource_update_diff_not_visible"
      ];
    }
  | { result: "fail_closed"; code: string };

function packetId(value: F21Evidence): string {
  return "f21-disposition-" + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function validateF21Evidence(value: unknown): F21Result {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const v = value as Partial<F21Evidence>;

  if (
    v.schema !== F21_SCHEMA ||
    v.projectId !== F21_PROJECT_ID ||
    v.environmentId !== F21_ENVIRONMENT_ID ||
    v.serviceId !== F21_SERVICE_ID ||
    v.serviceName !== "seo-engine-shadow"
  ) return { result: "fail_closed", code: "identity_mismatch" };

  if (
    v.patchId !== F21_PATCH_ID ||
    v.patchStatus !== "STAGED" ||
    !Array.isArray(v.stagedVariables) ||
    v.stagedVariables.length !== 1 ||
    v.stagedVariables[0] !== "AUTH_PUBLIC_ORIGIN"
  ) return { result: "fail_closed", code: "patch_state_mismatch" };

  if (v.currentPublicOrigin !== F21_PUBLIC_ORIGIN) {
    return { result: "fail_closed", code: "public_origin_mismatch" };
  }
  if (v.autodeployEnabled !== false) {
    return { result: "fail_closed", code: "autodeploy_not_disabled" };
  }

  if (
    v.applyAuthorized !== false ||
    v.discardAuthorized !== false ||
    v.sourceMutationAuthorized !== false ||
    v.productionCutoverAuthorized !== false
  ) return { result: "fail_closed", code: "authorization_boundary_open" };

  if (
    v.exactResourceUpdateDiffVisible !== false ||
    v.currentAuthPublicOriginValueVisible !== false ||
    v.stagedAuthPublicOriginValueVisible !== false
  ) return { result: "fail_closed", code: "visibility_state_mismatch" };

  if (
    v.applyWouldTriggerDeployment !== true ||
    v.discardWouldLeaveCurrentRuntimeUnchanged !== true
  ) return { result: "fail_closed", code: "operation_semantics_mismatch" };

  return {
    result: "blocked_value_unverified",
    packetId: packetId(v as F21Evidence),
    blockers: [
      "staged_auth_public_origin_value_not_visible",
      "exact_resource_update_diff_not_visible",
    ],
  };
}

export const F21_CERTIFIED_EVIDENCE: F21Evidence = {
  schema: F21_SCHEMA,
  projectId: F21_PROJECT_ID,
  environmentId: F21_ENVIRONMENT_ID,
  serviceId: F21_SERVICE_ID,
  serviceName: "seo-engine-shadow",
  patchId: F21_PATCH_ID,
  patchStatus: "STAGED",
  stagedVariables: ["AUTH_PUBLIC_ORIGIN"],
  currentPublicOrigin: F21_PUBLIC_ORIGIN,
  autodeployEnabled: false,
  exactResourceUpdateDiffVisible: false,
  currentAuthPublicOriginValueVisible: false,
  stagedAuthPublicOriginValueVisible: false,
  applyWouldTriggerDeployment: true,
  discardWouldLeaveCurrentRuntimeUnchanged: true,
  applyAuthorized: false,
  discardAuthorized: false,
  sourceMutationAuthorized: false,
  productionCutoverAuthorized: false,
};
