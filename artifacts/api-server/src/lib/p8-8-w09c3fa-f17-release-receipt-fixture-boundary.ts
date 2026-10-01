import { createHash } from "node:crypto";

export const F17_SCHEMA = "p8-8-w09c3fa-f17-release-receipt-fixture-boundary-v1" as const;
export const F17_PARENT_MAIN_COMMIT = "df4e1bcbfc59a113b9e6a86beeee06e557500680" as const;
export const F17_PARENT_MAIN_TREE = "cb60442c5260f6850d1609bb718951ba88335a86" as const;

export const F17_RELEASE_SOURCE_COMMIT = "9ba3640d8f50843da8609608124918fa356d552c" as const;
export const F17_RELEASE_SOURCE_TREE = "75b750b59f2de907a121c61907c2f1cfe7364c1f" as const;
export const F17_EXECUTION_COMMIT = "efbbfe3432d98fd79b3f5f856168192cbd79a6e7" as const;
export const F17_EXECUTION_WORKFLOW_BLOB = "43ae0e3b4d4794b8a0bc91bf288efbea99f2abbb" as const;
export const F17_WORKFLOW_RUN_ID = 36827923903 as const;
export const F17_IMAGE_DIGEST =
  "sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22" as const;
export const F17_IMMUTABLE_IMAGE =
  "ghcr.io/intssere/seo-engine@sha256:7399b06c99f251f13429f821a041bf7e460007941292470c93060f3f0d5d9e22" as const;
export const F17_REGISTRY_ATTESTATION_DIGEST =
  "sha256:0673fc4a0aaa55319887e8c7de814955fa46463bc2e106fd2ac638417c5722ad" as const;

export const F17_RAILWAY_PROJECT_ID = "02dc27bb-fe66-4ba3-bc36-a251ff562836" as const;
export const F17_FORBIDDEN_PRODUCTION_ENVIRONMENT_ID =
  "27eadb42-53cd-4158-a1c1-1142c38bc30e" as const;
export const F17_FORBIDDEN_PRODUCTION_SERVICE_NAME = "seo-engine-shadow" as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface F17ReleaseReceiptEvidence {
  schema: typeof F17_SCHEMA;
  parentMainCommit: string;
  parentMainTree: string;
  releaseSourceCommit: string;
  releaseSourceTree: string;
  executionCommit: string;
  executionWorkflowBlob: string;
  workflowRunId: number;
  workflowRunAttempt: 1;
  workflowConclusion: "success";
  totalAuthorizedRuns: 1;
  imageDigest: typeof F17_IMAGE_DIGEST;
  immutableImage: typeof F17_IMMUTABLE_IMAGE;
  provenanceMode: "max";
  sbomPublished: true;
  attestationId: 51725303;
  attestationSubjectDigest: typeof F17_IMAGE_DIGEST;
  rekorUploadConfirmed: true;
  attestationRepositoryUploadConfirmed: true;
  attestationRegistryUploadConfirmed: true;
  registryAttestationDigest: typeof F17_REGISTRY_ATTESTATION_DIGEST;
  registryPushReceiptVerified: true;
  railwayLiveReadBackVerified: false;
  registryPullabilityVerified: false;
  fixtureExecutionAuthorized: false;
}

export interface F17RailwayFixtureAuthorization {
  schema: "p8-8-w09c3fa-f17-railway-fixture-authorization-v1";
  railwayProjectId: string;
  environmentId: string;
  environmentName: string;
  productionEnvironment: false;
  railwayReadBackVerified: true;
  fixtureServiceName: string;
  fixtureServiceAlreadyExists: false;
  existingServiceMutation: false;
  image: typeof F17_IMMUTABLE_IMAGE;
  registryPullabilityVerified: true;
  expectedCanonicalCommit: typeof F17_RELEASE_SOURCE_COMMIT;
  expectedCanonicalTree: typeof F17_RELEASE_SOURCE_TREE;
  healthcheckPath: string;
  expectedHttpStatus: 200;
  maximumDeployments: 1;
  variableMutation: false;
  databaseAttachment: false;
  persistentVolume: false;
  customDomain: false;
  providerCalls: false;
  schedulerWorkerActivation: false;
  productionCutover: false;
  teardownRequired: true;
  teardownScope: "fixture_service_only";
  authorizationGranted: boolean;
}

export type F17Result =
  | { result: "pass"; evidenceId: string; fixtureBoundary: "closed" }
  | { result: "fail_closed"; code: string };

function hash(prefix: string, value: unknown): string {
  return prefix + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function validateF17ReleaseReceipt(value: unknown): F17Result {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { result: "fail_closed", code: "invalid_shape" };
  const v = value as Partial<F17ReleaseReceiptEvidence>;

  if (v.schema !== F17_SCHEMA) return { result: "fail_closed", code: "invalid_shape" };
  if (v.parentMainCommit !== F17_PARENT_MAIN_COMMIT || v.parentMainTree !== F17_PARENT_MAIN_TREE ||
      v.releaseSourceCommit !== F17_RELEASE_SOURCE_COMMIT || v.releaseSourceTree !== F17_RELEASE_SOURCE_TREE) {
    return { result: "fail_closed", code: "lineage_mismatch" };
  }
  if (v.executionCommit !== F17_EXECUTION_COMMIT || v.executionWorkflowBlob !== F17_EXECUTION_WORKFLOW_BLOB ||
      v.workflowRunId !== F17_WORKFLOW_RUN_ID || v.workflowRunAttempt !== 1 || v.workflowConclusion !== "success") {
    return { result: "fail_closed", code: "execution_mismatch" };
  }
  if (v.totalAuthorizedRuns !== 1) return { result: "fail_closed", code: "one_shot_violation" };
  if (v.imageDigest !== F17_IMAGE_DIGEST || v.immutableImage !== F17_IMMUTABLE_IMAGE ||
      v.provenanceMode !== "max" || v.sbomPublished !== true || v.registryPushReceiptVerified !== true) {
    return { result: "fail_closed", code: "image_mismatch" };
  }
  if (v.attestationId !== 51725303 || v.attestationSubjectDigest !== F17_IMAGE_DIGEST ||
      v.rekorUploadConfirmed !== true || v.attestationRepositoryUploadConfirmed !== true ||
      v.attestationRegistryUploadConfirmed !== true || v.registryAttestationDigest !== F17_REGISTRY_ATTESTATION_DIGEST) {
    return { result: "fail_closed", code: "attestation_mismatch" };
  }
  if (v.railwayLiveReadBackVerified !== false || v.registryPullabilityVerified !== false ||
      v.fixtureExecutionAuthorized !== false) {
    return { result: "fail_closed", code: "boundary_unexpectedly_open" };
  }
  return { result: "pass", evidenceId: hash("f17-receipt-", v), fixtureBoundary: "closed" };
}

export function validateF17RailwayFixtureAuthorization(value: unknown): F17Result {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { result: "fail_closed", code: "invalid_shape" };
  const v = value as Partial<F17RailwayFixtureAuthorization>;

  if (v.schema !== "p8-8-w09c3fa-f17-railway-fixture-authorization-v1") return { result: "fail_closed", code: "invalid_shape" };
  if (v.railwayProjectId !== F17_RAILWAY_PROJECT_ID) return { result: "fail_closed", code: "wrong_project" };
  if (typeof v.environmentId !== "string" || !UUID.test(v.environmentId) ||
      v.environmentId === F17_FORBIDDEN_PRODUCTION_ENVIRONMENT_ID ||
      v.productionEnvironment !== false || !v.environmentName ||
      v.environmentName.toLowerCase() === "production") {
    return { result: "fail_closed", code: "production_target" };
  }
  if (v.railwayReadBackVerified !== true) return { result: "fail_closed", code: "unverified_railway_state" };
  if (!v.fixtureServiceName || v.fixtureServiceName === F17_FORBIDDEN_PRODUCTION_SERVICE_NAME ||
      v.fixtureServiceAlreadyExists !== false || v.existingServiceMutation !== false) {
    return { result: "fail_closed", code: "service_boundary_violation" };
  }
  if (v.image !== F17_IMMUTABLE_IMAGE) return { result: "fail_closed", code: "image_mismatch" };
  if (v.registryPullabilityVerified !== true) return { result: "fail_closed", code: "registry_pull_unverified" };
  if (v.expectedCanonicalCommit !== F17_RELEASE_SOURCE_COMMIT || v.expectedCanonicalTree !== F17_RELEASE_SOURCE_TREE) {
    return { result: "fail_closed", code: "source_mismatch" };
  }
  if (!v.healthcheckPath || !v.healthcheckPath.startsWith("/") || v.expectedHttpStatus !== 200) {
    return { result: "fail_closed", code: "healthcheck_invalid" };
  }
  if (v.maximumDeployments !== 1) return { result: "fail_closed", code: "deployment_count_violation" };
  if (v.variableMutation !== false || v.databaseAttachment !== false || v.persistentVolume !== false ||
      v.customDomain !== false || v.providerCalls !== false || v.schedulerWorkerActivation !== false ||
      v.productionCutover !== false) {
    return { result: "fail_closed", code: "side_effect_boundary_violation" };
  }
  if (v.teardownRequired !== true || v.teardownScope !== "fixture_service_only") {
    return { result: "fail_closed", code: "teardown_boundary_violation" };
  }
  if (v.authorizationGranted !== true) return { result: "fail_closed", code: "authorization_missing" };

  return { result: "pass", evidenceId: hash("f17-fixture-", v), fixtureBoundary: "closed" };
}

export const F17_CERTIFIED_RELEASE_RECEIPT: F17ReleaseReceiptEvidence = {
  schema: F17_SCHEMA,
  parentMainCommit: F17_PARENT_MAIN_COMMIT,
  parentMainTree: F17_PARENT_MAIN_TREE,
  releaseSourceCommit: F17_RELEASE_SOURCE_COMMIT,
  releaseSourceTree: F17_RELEASE_SOURCE_TREE,
  executionCommit: F17_EXECUTION_COMMIT,
  executionWorkflowBlob: F17_EXECUTION_WORKFLOW_BLOB,
  workflowRunId: F17_WORKFLOW_RUN_ID,
  workflowRunAttempt: 1,
  workflowConclusion: "success",
  totalAuthorizedRuns: 1,
  imageDigest: F17_IMAGE_DIGEST,
  immutableImage: F17_IMMUTABLE_IMAGE,
  provenanceMode: "max",
  sbomPublished: true,
  attestationId: 51725303,
  attestationSubjectDigest: F17_IMAGE_DIGEST,
  rekorUploadConfirmed: true,
  attestationRepositoryUploadConfirmed: true,
  attestationRegistryUploadConfirmed: true,
  registryAttestationDigest: F17_REGISTRY_ATTESTATION_DIGEST,
  registryPushReceiptVerified: true,
  railwayLiveReadBackVerified: false,
  registryPullabilityVerified: false,
  fixtureExecutionAuthorized: false,
};
