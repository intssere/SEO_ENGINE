import { createHash } from "node:crypto";

export const F19_SCHEMA = "p8-8-w09c3fa-f19-autodeploy-safeguard-v1" as const;
export const F19_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const F19_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const F19_SERVICE_ID = "1e8c1e7d-16f7-4c63-8193-1021bcbe6d90" as const;
export const F19_SERVICE_NAME = "seo-engine-shadow" as const;
export const F19_STAGED_PATCH_ID = "5d9ed802-32c2-4d0a-ac8a-b45a010ca535" as const;
export const F19_AUTHORIZATION_LITERAL = "AUTHORIZE W09-C3F-A-F19 DISABLE PRODUCTION GITHUB AUTODEPLOY — on Railway project 52265e29-921b-4652-ac0d-9da4e5e69936 environment 7f8d920f-f6c6-44f0-b9fe-252cb4f32298 service 1e8c1e7d-16f7-4c63-8193-1021bcbe6d90 (seo-engine-shadow), set GitHub autodeploy enabled=false only; preserve repo intssere/SEO_ENGINE, branch main, service source/config, variables, domain, Postgres reference, volume state, staged patch 5d9ed802-32c2-4d0a-ac8a-b45a010ca535 including AUTH_PUBLIC_ORIGIN, and all other state; no deploy/redeploy, no repo disconnect, no branch change, no source mutation, no variable/domain/database/volume mutation, no Neon/provider/Production DB action, no Production cutover." as const;

export interface F19Evidence {
  schema: typeof F19_SCHEMA;
  projectId: typeof F19_PROJECT_ID;
  environmentId: typeof F19_ENVIRONMENT_ID;
  serviceId: typeof F19_SERVICE_ID;
  serviceName: typeof F19_SERVICE_NAME;
  repo: "intssere/SEO_ENGINE";
  branch: "main";
  autodeployEnabled: true;
  disableControlAvailable: true;
  disableControlName: "serviceAutoDeployTool";
  stagedPatchId: typeof F19_STAGED_PATCH_ID;
  stagedAuthPublicOriginPresent: true;
  manualDeployStillAvailable: true;
  executableAuthorizationLiteral: typeof F19_AUTHORIZATION_LITERAL;
}

export type F19Result =
  | { result: "ready_for_authorization"; packetId: string; literal: typeof F19_AUTHORIZATION_LITERAL }
  | { result: "fail_closed"; code: string };

function hash(value: unknown): string {
  return "f19-autodeploy-" + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function validateF19Evidence(value: unknown): F19Result {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const v = value as Partial<F19Evidence>;
  if (v.schema !== F19_SCHEMA) return { result: "fail_closed", code: "invalid_shape" };
  if (v.projectId !== F19_PROJECT_ID || v.environmentId !== F19_ENVIRONMENT_ID ||
      v.serviceId !== F19_SERVICE_ID || v.serviceName !== F19_SERVICE_NAME) {
    return { result: "fail_closed", code: "identity_mismatch" };
  }
  if (v.repo !== "intssere/SEO_ENGINE" || v.branch !== "main") {
    return { result: "fail_closed", code: "source_mismatch" };
  }
  if (v.autodeployEnabled !== true || v.disableControlAvailable !== true ||
      v.disableControlName !== "serviceAutoDeployTool") {
    return { result: "fail_closed", code: "autodeploy_state_mismatch" };
  }
  if (v.stagedPatchId !== F19_STAGED_PATCH_ID || v.stagedAuthPublicOriginPresent !== true) {
    return { result: "fail_closed", code: "staged_patch_mismatch" };
  }
  if (v.manualDeployStillAvailable !== true) {
    return { result: "fail_closed", code: "manual_deploy_unavailable" };
  }
  if (v.executableAuthorizationLiteral !== F19_AUTHORIZATION_LITERAL) {
    return { result: "fail_closed", code: "authorization_literal_mismatch" };
  }
  return {
    result: "ready_for_authorization",
    packetId: hash(v),
    literal: F19_AUTHORIZATION_LITERAL,
  };
}

export const F19_CERTIFIED_EVIDENCE: F19Evidence = {
  schema: F19_SCHEMA,
  projectId: F19_PROJECT_ID,
  environmentId: F19_ENVIRONMENT_ID,
  serviceId: F19_SERVICE_ID,
  serviceName: F19_SERVICE_NAME,
  repo: "intssere/SEO_ENGINE",
  branch: "main",
  autodeployEnabled: true,
  disableControlAvailable: true,
  disableControlName: "serviceAutoDeployTool",
  stagedPatchId: F19_STAGED_PATCH_ID,
  stagedAuthPublicOriginPresent: true,
  manualDeployStillAvailable: true,
  executableAuthorizationLiteral: F19_AUTHORIZATION_LITERAL,
};
