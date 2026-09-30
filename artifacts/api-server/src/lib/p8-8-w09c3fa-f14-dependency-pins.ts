import { createHash } from "node:crypto";

export const F14_DEPENDENCY_PIN_SCHEMA = "p8-8-w09c3fa-f14-dependency-pins-v1" as const;
export const F14_PARENT_CANONICAL_COMMIT = "1fd9055d08b2891ffdb3d30b1ad774f4ef1d0e9c" as const;
export const F14_PINNED_DOCKERFILE_SHA256 = "406c49b7d8dec8e3c0fb48e0c4b05d4f1f2dce82c1a82535a48a2c2a08f48b40" as const;
export const F14_BASE_IMAGE_DIGEST = "sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6" as const;

export const F14_ACTION_PINS = [
  {
    role: "checkout",
    repository: "actions/checkout",
    release: "v7.0.1",
    commitSha: "3d3c42e5aac5ba805825da76410c181273ba90b1",
    actionBlobSha: "5b0524f730db83f9513c18ab31a6c086c7239076",
    publisher: "github",
  },
  {
    role: "setup_buildx",
    repository: "docker/setup-buildx-action",
    release: "v4.3.0",
    commitSha: "37fe631027851001ddb9b187196cc803df7f5f0e",
    actionBlobSha: "1ea4b62fdb83f1818d5ba23e69e5b0df7652b606",
    publisher: "docker",
  },
  {
    role: "registry_login",
    repository: "docker/login-action",
    release: "v4.6.0",
    commitSha: "dbcb813823bdd20940b903addbd779551569679f",
    actionBlobSha: "6eadfff765e47ed2882bd843fbe9a0193acc069d",
    publisher: "docker",
  },
  {
    role: "build_push",
    repository: "docker/build-push-action",
    release: "v7.4.0",
    commitSha: "c3c9e263c25d99ce0380d002d59b67737d91b0dc",
    actionBlobSha: "7a1a94d46f66694384cb558b6f164027cdc3b667",
    publisher: "docker",
  },
  {
    role: "attest",
    repository: "actions/attest",
    release: "v4.2.2",
    commitSha: "1e69f48acb82d1966a394da916b4c1698aa569d6",
    actionBlobSha: "f3d593f3020cf14b65d2789e3788d015354475e9",
    publisher: "github",
  },
] as const;

export const F14_BASE_IMAGE_PIN = {
  repository: "docker.io/library/node",
  tagAtAcquisition: "24.19.0-bookworm-slim",
  digest: F14_BASE_IMAGE_DIGEST,
  digestKind: "oci_index",
  authority: "docker_hub",
  stages: ["build", "runtime"],
} as const;

export interface F14DependencyPinEvidence {
  schema: typeof F14_DEPENDENCY_PIN_SCHEMA;
  repository: "intssere/SEO_ENGINE";
  parentCanonicalCommitSha: string;
  dockerfilePath: "Dockerfile";
  pinnedDockerfileSha256: string;
  workflowSourcePath: "docs/p8-8-w09c3fa-f14-oci-release.inert.yml";
  workflowUnderGitHubWorkflows: false;
  publishingTriggerEnabled: false;
  platform: "linux/amd64";
  target: "runtime";
  buildArgs: string[];
  provenance: "max";
  sbom: true;
  actions: Array<{
    role: string;
    repository: string;
    release: string;
    commitSha: string;
    actionBlobSha: string;
    publisher: string;
  }>;
  baseImages: Array<{
    repository: string;
    tagAtAcquisition: string;
    digest: string;
    digestKind: string;
    authority: string;
    stages: string[];
  }>;
  allDependenciesImmutable: true;
  liveExecutionAuthorized: false;
}

export type F14ValidationResult =
  | { result: "pass"; evidenceId: string }
  | { result: "fail_closed"; code:
      | "invalid_shape"
      | "lineage_mismatch"
      | "dockerfile_mismatch"
      | "workflow_not_inert"
      | "build_contract_mismatch"
      | "action_pin_mismatch"
      | "base_image_pin_mismatch"
      | "mutable_dependency"
      | "live_execution_requested" };

const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const OCI_DIGEST = /^sha256:[0-9a-f]{64}$/;
const TOP_KEYS = [
  "schema","repository","parentCanonicalCommitSha","dockerfilePath","pinnedDockerfileSha256",
  "workflowSourcePath","workflowUnderGitHubWorkflows","publishingTriggerEnabled","platform",
  "target","buildArgs","provenance","sbom","actions","baseImages","allDependenciesImmutable",
  "liveExecutionAuthorized",
];
const ACTION_KEYS = ["role","repository","release","commitSha","actionBlobSha","publisher"];
const IMAGE_KEYS = ["repository","tagAtAcquisition","digest","digestKind","authority","stages"];
const EXPECTED_BUILD_ARGS = [
  "EXPECTED_CANONICAL_COMMIT",
  "EXPECTED_CANONICAL_TREE",
  "EXPECTED_SOURCE_BRANCH",
] as const;

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...expected].sort().join(",");
}

function stableHash(value: unknown): string {
  return "f14-" + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function validateF14DependencyPins(value: unknown): F14ValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const raw = value as Record<string, unknown>;
  if (!exactKeys(raw, TOP_KEYS)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  if (
    raw.schema !== F14_DEPENDENCY_PIN_SCHEMA ||
    raw.repository !== "intssere/SEO_ENGINE" ||
    typeof raw.parentCanonicalCommitSha !== "string" ||
    !SHA40.test(raw.parentCanonicalCommitSha)
  ) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  if (raw.parentCanonicalCommitSha !== F14_PARENT_CANONICAL_COMMIT) {
    return { result: "fail_closed", code: "lineage_mismatch" };
  }
  if (
    raw.dockerfilePath !== "Dockerfile" ||
    raw.pinnedDockerfileSha256 !== F14_PINNED_DOCKERFILE_SHA256 ||
    typeof raw.pinnedDockerfileSha256 !== "string" ||
    !SHA256.test(raw.pinnedDockerfileSha256)
  ) {
    return { result: "fail_closed", code: "dockerfile_mismatch" };
  }
  if (
    raw.workflowSourcePath !== "docs/p8-8-w09c3fa-f14-oci-release.inert.yml" ||
    raw.workflowUnderGitHubWorkflows !== false ||
    raw.publishingTriggerEnabled !== false
  ) {
    return { result: "fail_closed", code: "workflow_not_inert" };
  }
  if (
    raw.platform !== "linux/amd64" ||
    raw.target !== "runtime" ||
    raw.provenance !== "max" ||
    raw.sbom !== true ||
    !Array.isArray(raw.buildArgs) ||
    raw.buildArgs.length !== EXPECTED_BUILD_ARGS.length ||
    raw.buildArgs.some((item, index) => item !== EXPECTED_BUILD_ARGS[index])
  ) {
    return { result: "fail_closed", code: "build_contract_mismatch" };
  }
  if (!Array.isArray(raw.actions) || raw.actions.length !== F14_ACTION_PINS.length) {
    return { result: "fail_closed", code: "action_pin_mismatch" };
  }
  for (let index = 0; index < F14_ACTION_PINS.length; index += 1) {
    const observed = raw.actions[index];
    const expected = F14_ACTION_PINS[index];
    if (!observed || typeof observed !== "object" || Array.isArray(observed) ||
        !exactKeys(observed as Record<string, unknown>, ACTION_KEYS)) {
      return { result: "fail_closed", code: "action_pin_mismatch" };
    }
    const action = observed as Record<string, unknown>;
    if (
      action.role !== expected.role ||
      action.repository !== expected.repository ||
      action.release !== expected.release ||
      action.commitSha !== expected.commitSha ||
      action.actionBlobSha !== expected.actionBlobSha ||
      action.publisher !== expected.publisher ||
      typeof action.commitSha !== "string" || !SHA40.test(action.commitSha) ||
      typeof action.actionBlobSha !== "string" || !SHA40.test(action.actionBlobSha)
    ) {
      return { result: "fail_closed", code: "action_pin_mismatch" };
    }
  }
  if (!Array.isArray(raw.baseImages) || raw.baseImages.length !== 1) {
    return { result: "fail_closed", code: "base_image_pin_mismatch" };
  }
  const observedImage = raw.baseImages[0];
  if (!observedImage || typeof observedImage !== "object" || Array.isArray(observedImage) ||
      !exactKeys(observedImage as Record<string, unknown>, IMAGE_KEYS)) {
    return { result: "fail_closed", code: "base_image_pin_mismatch" };
  }
  const image = observedImage as Record<string, unknown>;
  if (
    image.repository !== F14_BASE_IMAGE_PIN.repository ||
    image.tagAtAcquisition !== F14_BASE_IMAGE_PIN.tagAtAcquisition ||
    image.digest !== F14_BASE_IMAGE_PIN.digest ||
    image.digestKind !== F14_BASE_IMAGE_PIN.digestKind ||
    image.authority !== F14_BASE_IMAGE_PIN.authority ||
    !Array.isArray(image.stages) ||
    image.stages.length !== 2 ||
    image.stages[0] !== "build" ||
    image.stages[1] !== "runtime" ||
    typeof image.digest !== "string" ||
    !OCI_DIGEST.test(image.digest)
  ) {
    return { result: "fail_closed", code: "base_image_pin_mismatch" };
  }
  if (raw.allDependenciesImmutable !== true) {
    return { result: "fail_closed", code: "mutable_dependency" };
  }
  if (raw.liveExecutionAuthorized !== false) {
    return { result: "fail_closed", code: "live_execution_requested" };
  }
  return { result: "pass", evidenceId: stableHash(raw) };
}

export const F14_CERTIFIED_EVIDENCE: F14DependencyPinEvidence = {
  schema: F14_DEPENDENCY_PIN_SCHEMA,
  repository: "intssere/SEO_ENGINE",
  parentCanonicalCommitSha: F14_PARENT_CANONICAL_COMMIT,
  dockerfilePath: "Dockerfile",
  pinnedDockerfileSha256: F14_PINNED_DOCKERFILE_SHA256,
  workflowSourcePath: "docs/p8-8-w09c3fa-f14-oci-release.inert.yml",
  workflowUnderGitHubWorkflows: false,
  publishingTriggerEnabled: false,
  platform: "linux/amd64",
  target: "runtime",
  buildArgs: [...EXPECTED_BUILD_ARGS],
  provenance: "max",
  sbom: true,
  actions: F14_ACTION_PINS.map((item) => ({ ...item })),
  baseImages: [{
    ...F14_BASE_IMAGE_PIN,
    stages: [...F14_BASE_IMAGE_PIN.stages],
  }],
  allDependenciesImmutable: true,
  liveExecutionAuthorized: false,
};
