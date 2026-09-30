import { createHash } from "node:crypto";

export const OCI_RELEASE_WORKFLOW_SCHEMA = "p8-8-w09c3fa-f13-workflow-v1" as const;
export const RAILWAY_FIXTURE_AUTH_SCHEMA = "p8-8-w09c3fa-f13-fixture-v1" as const;

export interface OciReleaseWorkflowSpec {
  schema: typeof OCI_RELEASE_WORKFLOW_SCHEMA;
  repository: string;
  sourceCommitSha: string;
  sourceTreeSha: string;
  sourceArtifactSha256: string;
  dockerfilePath: string;
  dockerfileSha256: string;
  workflowPath: string;
  workflowCommitSha: string;
  registry: "ghcr";
  imageRepository: string;
  packageVisibility: "public";
  permissions: {
    contents: "read";
    packages: "write";
    idToken: "write";
    attestations: "write";
  };
  actions: {
    checkout: string;
    setupBuildx: string;
    login: string;
    buildPush: string;
    attest: string;
  };
  platforms: string[];
  tags: string[];
  digestOutputName: "digest";
  push: true;
  provenance: "max";
  sbom: true;
  noLatestTag: true;
  oneShot: true;
}

export interface DisposableRailwayFixtureAuthorization {
  schema: typeof RAILWAY_FIXTURE_AUTH_SCHEMA;
  projectId: string;
  environmentId: string;
  fixtureServiceName: string;
  fixtureServiceMustNotExist: true;
  imageRepository: string;
  imageDigest: string;
  immutableImageReference: string;
  expectedSourceCommitSha: string;
  expectedSourceTreeSha: string;
  expectedF12ProvenanceId: string;
  healthcheckPath: string;
  healthcheckExpectedStatus: 200;
  maxDeployments: 1;
  permitProductionEnvironment: false;
  permitExistingServiceMutation: false;
  permitVariableMutation: false;
  permitDatabaseAttachment: false;
  permitPersistentVolume: false;
  permitCustomDomain: false;
  permitProviderCalls: false;
  permitSchedulerWorkerActivation: false;
  teardownRequired: true;
  teardownScope: "fixture_service_only";
  oneShot: true;
}

export type F13ValidationResult =
  | { result: "pass"; evidenceId: string }
  | { result: "fail_closed"; code:
      | "invalid_shape"
      | "credential_shaped_material"
      | "mutable_action_revision"
      | "permission_mismatch"
      | "mutable_or_unsafe_tag"
      | "platform_contract_mismatch"
      | "fixture_not_isolated"
      | "immutable_image_mismatch"
      | "unsafe_healthcheck"
      | "invalid_lineage" };

const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const OCI_DIGEST = /^sha256:[0-9a-f]{64}$/;
const F12_ID = /^f12-[0-9a-f]{64}$/;
const SAFE_REPO = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,255}$/;
const SAFE_IMAGE = /^[a-z0-9][a-z0-9._:/-]{0,511}$/;
const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]{1,512}$/;
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const ACTION_PIN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}$/;
const PLATFORM = /^[a-z0-9]+\/[a-z0-9_]+(?:\/[a-z0-9._-]+)?$/;
const TAG = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;
const CREDENTIAL_KEY =
  /^(?:token|secret|password|credential|database[_-]?url|api[_-]?key|private[_-]?key)$/i;
const CREDENTIAL_VALUE =
  /(bearer\s+[A-Za-z0-9._~+\/-]+=*|postgres(?:ql)?:\/\/[^\s]+:[^\s]+@|sk-[A-Za-z0-9_-]{16,})/i;

const WORKFLOW_KEYS = [
  "schema","repository","sourceCommitSha","sourceTreeSha","sourceArtifactSha256",
  "dockerfilePath","dockerfileSha256","workflowPath","workflowCommitSha","registry",
  "imageRepository","packageVisibility","permissions","actions","platforms","tags",
  "digestOutputName","push","provenance","sbom","noLatestTag","oneShot",
];

const FIXTURE_KEYS = [
  "schema","projectId","environmentId","fixtureServiceName","fixtureServiceMustNotExist",
  "imageRepository","imageDigest","immutableImageReference","expectedSourceCommitSha",
  "expectedSourceTreeSha","expectedF12ProvenanceId","healthcheckPath",
  "healthcheckExpectedStatus","maxDeployments","permitProductionEnvironment",
  "permitExistingServiceMutation","permitVariableMutation","permitDatabaseAttachment",
  "permitPersistentVolume","permitCustomDomain","permitProviderCalls",
  "permitSchedulerWorkerActivation","teardownRequired","teardownScope","oneShot",
];

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function hasCredentials(value: unknown, key = ""): boolean {
  if (CREDENTIAL_KEY.test(key)) return true;
  if (typeof value === "string") return CREDENTIAL_VALUE.test(value);
  if (Array.isArray(value)) return value.some((item) => hasCredentials(item));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .some(([childKey, child]) => hasCredentials(child, childKey));
  }
  return false;
}

function hash(prefix: string, value: unknown): string {
  return prefix + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function validateOciReleaseWorkflowSpec(value: unknown): F13ValidationResult {
  if (hasCredentials(value)) {
    return { result: "fail_closed", code: "credential_shaped_material" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const raw = value as Record<string, unknown>;
  if (!exactKeys(raw, WORKFLOW_KEYS)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }

  const permissions = raw.permissions as Record<string, unknown> | undefined;
  const actions = raw.actions as Record<string, unknown> | undefined;
  if (
    raw.schema !== OCI_RELEASE_WORKFLOW_SCHEMA ||
    typeof raw.repository !== "string" || !SAFE_REPO.test(raw.repository) ||
    typeof raw.sourceCommitSha !== "string" || !SHA40.test(raw.sourceCommitSha) ||
    typeof raw.sourceTreeSha !== "string" || !SHA40.test(raw.sourceTreeSha) ||
    typeof raw.sourceArtifactSha256 !== "string" || !SHA256.test(raw.sourceArtifactSha256) ||
    typeof raw.dockerfilePath !== "string" || !SAFE_PATH.test(raw.dockerfilePath) ||
    typeof raw.dockerfileSha256 !== "string" || !SHA256.test(raw.dockerfileSha256) ||
    typeof raw.workflowPath !== "string" || !SAFE_PATH.test(raw.workflowPath) ||
    typeof raw.workflowCommitSha !== "string" || !SHA40.test(raw.workflowCommitSha) ||
    raw.registry !== "ghcr" ||
    typeof raw.imageRepository !== "string" || !SAFE_IMAGE.test(raw.imageRepository) ||
    raw.packageVisibility !== "public" ||
    !permissions || Array.isArray(permissions) ||
    !actions || Array.isArray(actions) ||
    !Array.isArray(raw.platforms) ||
    !Array.isArray(raw.tags) ||
    raw.digestOutputName !== "digest" ||
    raw.push !== true ||
    raw.provenance !== "max" ||
    raw.sbom !== true ||
    raw.noLatestTag !== true ||
    raw.oneShot !== true
  ) {
    return { result: "fail_closed", code: "invalid_shape" };
  }

  if (!exactKeys(permissions, ["contents","packages","idToken","attestations"]) ||
      permissions.contents !== "read" ||
      permissions.packages !== "write" ||
      permissions.idToken !== "write" ||
      permissions.attestations !== "write") {
    return { result: "fail_closed", code: "permission_mismatch" };
  }

  if (!exactKeys(actions, ["checkout","setupBuildx","login","buildPush","attest"]) ||
      Object.values(actions).some((item) => typeof item !== "string" || !ACTION_PIN.test(item))) {
    return { result: "fail_closed", code: "mutable_action_revision" };
  }

  const platforms = raw.platforms as string[];
  if (platforms.length < 1 ||
      platforms.some((item) => !PLATFORM.test(item)) ||
      platforms.some((item, index) => index > 0 && platforms[index - 1]! >= item)) {
    return { result: "fail_closed", code: "platform_contract_mismatch" };
  }

  const tags = raw.tags as string[];
  if (tags.length < 1 ||
      tags.some((item) => !TAG.test(item) || item.toLowerCase() === "latest") ||
      tags.some((item, index) => index > 0 && tags[index - 1]! >= item)) {
    return { result: "fail_closed", code: "mutable_or_unsafe_tag" };
  }

  return { result: "pass", evidenceId: hash("f13-workflow-", raw) };
}

export function validateDisposableRailwayFixtureAuthorization(
  value: unknown,
): F13ValidationResult {
  if (hasCredentials(value)) {
    return { result: "fail_closed", code: "credential_shaped_material" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const raw = value as Record<string, unknown>;
  if (!exactKeys(raw, FIXTURE_KEYS)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }

  if (
    raw.schema !== RAILWAY_FIXTURE_AUTH_SCHEMA ||
    typeof raw.projectId !== "string" || !SAFE_NAME.test(raw.projectId) ||
    typeof raw.environmentId !== "string" || !SAFE_NAME.test(raw.environmentId) ||
    typeof raw.fixtureServiceName !== "string" || !SAFE_NAME.test(raw.fixtureServiceName) ||
    raw.fixtureServiceMustNotExist !== true ||
    typeof raw.imageRepository !== "string" || !SAFE_IMAGE.test(raw.imageRepository) ||
    typeof raw.imageDigest !== "string" || !OCI_DIGEST.test(raw.imageDigest) ||
    typeof raw.immutableImageReference !== "string" ||
    typeof raw.expectedSourceCommitSha !== "string" || !SHA40.test(raw.expectedSourceCommitSha) ||
    typeof raw.expectedSourceTreeSha !== "string" || !SHA40.test(raw.expectedSourceTreeSha) ||
    typeof raw.expectedF12ProvenanceId !== "string" || !F12_ID.test(raw.expectedF12ProvenanceId) ||
    typeof raw.healthcheckPath !== "string" ||
    raw.healthcheckExpectedStatus !== 200 ||
    raw.maxDeployments !== 1 ||
    raw.teardownScope !== "fixture_service_only"
  ) {
    return { result: "fail_closed", code: "invalid_shape" };
  }

  if (!raw.healthcheckPath.startsWith("/") || raw.healthcheckPath.includes("..") ||
      raw.healthcheckPath.includes("?") || raw.healthcheckPath.includes("#")) {
    return { result: "fail_closed", code: "unsafe_healthcheck" };
  }

  const expectedReference = `${raw.imageRepository}@${raw.imageDigest}`;
  if (raw.immutableImageReference !== expectedReference) {
    return { result: "fail_closed", code: "immutable_image_mismatch" };
  }

  if (
    raw.permitProductionEnvironment !== false ||
    raw.permitExistingServiceMutation !== false ||
    raw.permitVariableMutation !== false ||
    raw.permitDatabaseAttachment !== false ||
    raw.permitPersistentVolume !== false ||
    raw.permitCustomDomain !== false ||
    raw.permitProviderCalls !== false ||
    raw.permitSchedulerWorkerActivation !== false ||
    raw.teardownRequired !== true ||
    raw.oneShot !== true
  ) {
    return { result: "fail_closed", code: "fixture_not_isolated" };
  }

  return { result: "pass", evidenceId: hash("f13-fixture-", raw) };
}
