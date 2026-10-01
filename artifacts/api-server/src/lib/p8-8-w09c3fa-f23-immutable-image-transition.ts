import { createHash } from "node:crypto";

export const F23_SCHEMA = "p8-8-w09c3fa-f23-immutable-image-transition-v1" as const;
export const F23_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const F23_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const F23_SERVICE_ID = "1e8c1e7d-16f7-4c63-8193-1021bcbe6d90" as const;
export const F23_IMAGE = "ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22" as const;

export interface F23Evidence {
  schema: typeof F23_SCHEMA;
  projectId: typeof F23_PROJECT_ID;
  environmentId: typeof F23_ENVIRONMENT_ID;
  serviceId: typeof F23_SERVICE_ID;
  serviceName: "seo-engine-shadow";
  currentSourceRepo: "intssere/SEO_ENGINE";
  currentSourceBranch: "main";
  autodeployEnabled: false;
  authPublicOriginEffective: true;
  effectivePendingChangeCount: 0;
  latestGitSourceBuildFailure: "git_identity_unavailable";
  targetImage: typeof F23_IMAGE;
  exactImagePullabilityProven: true;
  imageHealthcheckReadinessProven: true;
  sourceUpdateStagesOnly: true;
  commitTriggersSingleDeployment: true;
  variableMutationRequired: false;
  domainMutationRequired: false;
  postgresMutationRequired: false;
  volumeMutationRequired: false;
  transitionAuthorized: false;
  additionalMutationAuthorized: false;
}

export type F23Result =
  | {
      result: "ready_for_explicit_image_transition_authorization";
      packetId: string;
      authorizationLiteral: string;
    }
  | { result: "fail_closed"; code: string };

function packetId(value: F23Evidence): string {
  return "f23-image-transition-" + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function validateF23Evidence(value: unknown): F23Result {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const v = value as Partial<F23Evidence>;

  if (
    v.schema !== F23_SCHEMA ||
    v.projectId !== F23_PROJECT_ID ||
    v.environmentId !== F23_ENVIRONMENT_ID ||
    v.serviceId !== F23_SERVICE_ID ||
    v.serviceName !== "seo-engine-shadow"
  ) return { result: "fail_closed", code: "identity_mismatch" };

  if (
    v.currentSourceRepo !== "intssere/SEO_ENGINE" ||
    v.currentSourceBranch !== "main" ||
    v.autodeployEnabled !== false ||
    v.authPublicOriginEffective !== true ||
    v.effectivePendingChangeCount !== 0
  ) return { result: "fail_closed", code: "production_preflight_mismatch" };

  if (
    v.latestGitSourceBuildFailure !== "git_identity_unavailable" ||
    v.targetImage !== F23_IMAGE ||
    v.exactImagePullabilityProven !== true ||
    v.imageHealthcheckReadinessProven !== true
  ) return { result: "fail_closed", code: "release_evidence_mismatch" };

  if (
    v.sourceUpdateStagesOnly !== true ||
    v.commitTriggersSingleDeployment !== true ||
    v.variableMutationRequired !== false ||
    v.domainMutationRequired !== false ||
    v.postgresMutationRequired !== false ||
    v.volumeMutationRequired !== false
  ) return { result: "fail_closed", code: "transition_semantics_mismatch" };

  if (v.transitionAuthorized !== false || v.additionalMutationAuthorized !== false) {
    return { result: "fail_closed", code: "authorization_boundary_open" };
  }

  const authorizationLiteral =
    "AUTHORIZE W09-C3F-A-F23 PRODUCTION IMMUTABLE IMAGE TRANSITION — on Railway project " +
    F23_PROJECT_ID +
    " environment " +
    F23_ENVIRONMENT_ID +
    " service " +
    F23_SERVICE_ID +
    " (seo-engine-shadow), replace only the current GitHub source intssere/SEO_ENGINE main with exact image " +
    F23_IMAGE +
    ", stage only that source change, verify no unrelated effective staged changes, then commit exactly that source transition and permit exactly one resulting service deployment; preserve all existing variables including AUTH_PUBLIC_ORIGIN, GitHub autodeploy=false, domain/port, healthcheck, runtime/replica config, Postgres reference, volume state, and all other state; no additional variable/config/domain/database/volume mutation, no Neon/Production DB/provider/public-site action, no scheduler/worker activation, no retry if deployment fails.";

  return {
    result: "ready_for_explicit_image_transition_authorization",
    packetId: packetId(v as F23Evidence),
    authorizationLiteral,
  };
}

export const F23_CERTIFIED_EVIDENCE: F23Evidence = {
  schema: F23_SCHEMA,
  projectId: F23_PROJECT_ID,
  environmentId: F23_ENVIRONMENT_ID,
  serviceId: F23_SERVICE_ID,
  serviceName: "seo-engine-shadow",
  currentSourceRepo: "intssere/SEO_ENGINE",
  currentSourceBranch: "main",
  autodeployEnabled: false,
  authPublicOriginEffective: true,
  effectivePendingChangeCount: 0,
  latestGitSourceBuildFailure: "git_identity_unavailable",
  targetImage: F23_IMAGE,
  exactImagePullabilityProven: true,
  imageHealthcheckReadinessProven: true,
  sourceUpdateStagesOnly: true,
  commitTriggersSingleDeployment: true,
  variableMutationRequired: false,
  domainMutationRequired: false,
  postgresMutationRequired: false,
  volumeMutationRequired: false,
  transitionAuthorized: false,
  additionalMutationAuthorized: false,
};
