import { createHash } from "node:crypto";

export const F22_SCHEMA = "p8-8-w09c3fa-f22-auth-origin-apply-packet-v1" as const;
export const F22_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const F22_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const F22_SERVICE_ID = "1e8c1e7d-16f7-4c63-8193-1021bcbe6d90" as const;
export const F22_PATCH_ID = "5d9ed802-32c2-4d0a-ac8a-b45a010ca535" as const;
export const F22_AUTH_PUBLIC_ORIGIN = "https://seo-engine-shadow-production.up.railway.app" as const;

export interface F22Evidence {
  schema: typeof F22_SCHEMA;
  projectId: typeof F22_PROJECT_ID;
  environmentId: typeof F22_ENVIRONMENT_ID;
  serviceId: typeof F22_SERVICE_ID;
  serviceName: "seo-engine-shadow";
  patchId: typeof F22_PATCH_ID;
  patchStatus: "STAGED";
  dashboardChangeCount: 1;
  dashboardVariableCount: 1;
  variableName: "AUTH_PUBLIC_ORIGIN";
  currentValueAbsent: true;
  stagedValue: typeof F22_AUTH_PUBLIC_ORIGIN;
  dashboardRedeployNotice: true;
  separateResourceFieldDiffShown: false;
  autodeployEnabled: false;
  applyAuthorized: false;
  sourceImageTransitionAuthorized: false;
  additionalVariableMutationAuthorized: false;
  domainMutationAuthorized: false;
  databaseVolumeMutationAuthorized: false;
  providerPublicSiteActionAuthorized: false;
  productionCutoverAuthorized: false;
}

export type F22Result =
  | {
      result: "ready_for_explicit_apply_authorization";
      packetId: string;
      authorizationLiteral: string;
    }
  | { result: "fail_closed"; code: string };

function packetId(value: F22Evidence): string {
  return "f22-apply-" + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function validateF22Evidence(value: unknown): F22Result {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const v = value as Partial<F22Evidence>;

  if (
    v.schema !== F22_SCHEMA ||
    v.projectId !== F22_PROJECT_ID ||
    v.environmentId !== F22_ENVIRONMENT_ID ||
    v.serviceId !== F22_SERVICE_ID ||
    v.serviceName !== "seo-engine-shadow"
  ) return { result: "fail_closed", code: "identity_mismatch" };

  if (
    v.patchId !== F22_PATCH_ID ||
    v.patchStatus !== "STAGED" ||
    v.dashboardChangeCount !== 1 ||
    v.dashboardVariableCount !== 1 ||
    v.variableName !== "AUTH_PUBLIC_ORIGIN" ||
    v.currentValueAbsent !== true ||
    v.stagedValue !== F22_AUTH_PUBLIC_ORIGIN ||
    v.dashboardRedeployNotice !== true ||
    v.separateResourceFieldDiffShown !== false
  ) return { result: "fail_closed", code: "dashboard_evidence_mismatch" };

  if (v.autodeployEnabled !== false) {
    return { result: "fail_closed", code: "autodeploy_not_disabled" };
  }

  if (
    v.applyAuthorized !== false ||
    v.sourceImageTransitionAuthorized !== false ||
    v.additionalVariableMutationAuthorized !== false ||
    v.domainMutationAuthorized !== false ||
    v.databaseVolumeMutationAuthorized !== false ||
    v.providerPublicSiteActionAuthorized !== false ||
    v.productionCutoverAuthorized !== false
  ) return { result: "fail_closed", code: "authorization_boundary_open" };

  const authorizationLiteral =
    "AUTHORIZE W09-C3F-A-F22 APPLY AUTH_PUBLIC_ORIGIN PATCH — commit only Railway staged patch " +
    F22_PATCH_ID +
    " in environment " +
    F22_ENVIRONMENT_ID +
    " for service " +
    F22_SERVICE_ID +
    " (seo-engine-shadow), applying exactly one staged variable addition AUTH_PUBLIC_ORIGIN=" +
    F22_AUTH_PUBLIC_ORIGIN +
    " and permitting only the resulting single service redeploy; preserve GitHub autodeploy=false, current GitHub source intssere/SEO_ENGINE main, all unrelated variables/config, domain, Postgres reference, volume state, and all other state; no source/image transition, no additional variable mutation, no domain/database/volume mutation, no Neon/Production DB/provider/public-site action, no scheduler/worker activation, no Production image cutover.";

  return {
    result: "ready_for_explicit_apply_authorization",
    packetId: packetId(v as F22Evidence),
    authorizationLiteral,
  };
}

export const F22_CERTIFIED_EVIDENCE: F22Evidence = {
  schema: F22_SCHEMA,
  projectId: F22_PROJECT_ID,
  environmentId: F22_ENVIRONMENT_ID,
  serviceId: F22_SERVICE_ID,
  serviceName: "seo-engine-shadow",
  patchId: F22_PATCH_ID,
  patchStatus: "STAGED",
  dashboardChangeCount: 1,
  dashboardVariableCount: 1,
  variableName: "AUTH_PUBLIC_ORIGIN",
  currentValueAbsent: true,
  stagedValue: F22_AUTH_PUBLIC_ORIGIN,
  dashboardRedeployNotice: true,
  separateResourceFieldDiffShown: false,
  autodeployEnabled: false,
  applyAuthorized: false,
  sourceImageTransitionAuthorized: false,
  additionalVariableMutationAuthorized: false,
  domainMutationAuthorized: false,
  databaseVolumeMutationAuthorized: false,
  providerPublicSiteActionAuthorized: false,
  productionCutoverAuthorized: false,
};
