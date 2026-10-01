import { createHash } from "node:crypto";

export const F15_PREFLIGHT_SCHEMA = "p8-8-w09c3fa-f15-release-preflight-v1" as const;
export const F15_CANONICAL_COMMIT = "9ba3640d8f50843da8609608124918fa356d552c" as const;
export const F15_CANONICAL_TREE = "75b750b59f2de907a121c61907c2f1cfe7364c1f" as const;
export const F15_F14_WORKFLOW_BLOB = "8dc243e0f0eed1c79c43c331918b63e7e4ba8571" as const;
export const F15_F14_PIN_SOURCE_BLOB = "ebe98055d0c1dbe79e96d7188040b5cea560aaf3" as const;
export const F15_DOCKERFILE_BLOB = "00ecc5a869065183dd6092e2aa88b3a7e6d26c28" as const;
export const F15_IMAGE_REPOSITORY = "ghcr.io/intssere/seo-engine" as const;
export const F15_IMAGE_TAG = "sha-9ba3640d8f50843da8609608124918fa356d552c" as const;
export const F15_AUTHORIZATION_SUBJECT = "W09-C3F-A-F16 one-shot GHCR release" as const;

export const F15_ACTION_PINS = [
  "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  "docker/setup-buildx-action@37fe631027851001ddb9b187196cc803df7f5f0e",
  "docker/login-action@dbcb813823bdd20940b903addbd779551569679f",
  "docker/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc",
  "actions/attest@1e69f48acb82d1966a394da916b4c1698aa569d6",
] as const;

export interface F15ReleasePreflightEvidence {
  schema: typeof F15_PREFLIGHT_SCHEMA;
  repository: "intssere/SEO_ENGINE";
  sourceBranch: "main";
  canonicalCommitSha: string;
  canonicalTreeSha: string;
  f14WorkflowSourcePath: "docs/p8-8-w09c3fa-f14-oci-release.inert.yml";
  f14WorkflowBlobSha: string;
  f14DependencyPinSourcePath: "artifacts/api-server/src/lib/p8-8-w09c3fa-f14-dependency-pins.ts";
  f14DependencyPinSourceBlobSha: string;
  dockerfilePath: "Dockerfile";
  dockerfileBlobSha: string;
  workflowUnderGitHubWorkflows: false;
  publishingTriggerEnabled: false;
  permissions: {
    contents: "read";
    packages: "write";
    idToken: "write";
    attestations: "write";
  };
  actionPins: string[];
  build: {
    platform: "linux/amd64";
    target: "runtime";
    provenance: "max";
    sbom: true;
    buildArgs: [
      "EXPECTED_CANONICAL_COMMIT",
      "EXPECTED_CANONICAL_TREE",
      "EXPECTED_SOURCE_BRANCH",
    ];
  };
  release: {
    registry: "ghcr.io";
    imageRepository: typeof F15_IMAGE_REPOSITORY;
    imageTag: typeof F15_IMAGE_TAG;
    latestTagAllowed: false;
    oneShotOnly: true;
    automaticRetryAllowed: false;
    parallelReleaseAllowed: false;
  };
  authorization: {
    subject: typeof F15_AUTHORIZATION_SUBJECT;
    requiredLiteral: string;
    granted: false;
  };
  liveExecutionRequested: false;
}

export type F15PreflightResult =
  | { result: "pass"; evidenceId: string; authorizationPacketId: string }
  | {
      result: "fail_closed";
      code:
        | "invalid_shape"
        | "lineage_mismatch"
        | "artifact_identity_mismatch"
        | "workflow_not_inert"
        | "permission_mismatch"
        | "action_pin_mismatch"
        | "build_contract_mismatch"
        | "release_contract_mismatch"
        | "authorization_boundary_violation"
        | "live_execution_requested";
    };

const SHA40 = /^[0-9a-f]{40}$/;
const TOP_KEYS = [
  "schema","repository","sourceBranch","canonicalCommitSha","canonicalTreeSha",
  "f14WorkflowSourcePath","f14WorkflowBlobSha","f14DependencyPinSourcePath",
  "f14DependencyPinSourceBlobSha","dockerfilePath","dockerfileBlobSha",
  "workflowUnderGitHubWorkflows","publishingTriggerEnabled","permissions",
  "actionPins","build","release","authorization","liveExecutionRequested",
];
const PERMISSION_KEYS = ["contents","packages","idToken","attestations"];
const BUILD_KEYS = ["platform","target","provenance","sbom","buildArgs"];
const RELEASE_KEYS = [
  "registry","imageRepository","imageTag","latestTagAllowed","oneShotOnly",
  "automaticRetryAllowed","parallelReleaseAllowed",
];
const AUTH_KEYS = ["subject","requiredLiteral","granted"];
const EXPECTED_AUTH_LITERAL =
  "AUTHORIZE W09-C3F-A-F16 ONE-SHOT GHCR RELEASE — source main@9ba3640d8f50843da8609608124918fa356d552c tree 75b750b59f2de907a121c61907c2f1cfe7364c1f; publish exactly ghcr.io/intssere/seo-engine:sha-9ba3640d8f50843da8609608124918fa356d552c with the F14 pinned workflow/dependencies, linux/amd64 runtime target, provenance=max and SBOM; exactly one release attempt, no automatic retry, no latest tag, no Railway/Neon/Production/provider mutation.";

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...expected].sort().join(",");
}

function digest(prefix: string, value: unknown): string {
  return prefix + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function validateF15ReleasePreflight(value: unknown): F15PreflightResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  const raw = value as Record<string, unknown>;
  if (!exactKeys(raw, TOP_KEYS) ||
      raw.schema !== F15_PREFLIGHT_SCHEMA ||
      raw.repository !== "intssere/SEO_ENGINE" ||
      raw.sourceBranch !== "main" ||
      typeof raw.canonicalCommitSha !== "string" ||
      typeof raw.canonicalTreeSha !== "string" ||
      !SHA40.test(raw.canonicalCommitSha) ||
      !SHA40.test(raw.canonicalTreeSha)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }

  if (raw.canonicalCommitSha !== F15_CANONICAL_COMMIT ||
      raw.canonicalTreeSha !== F15_CANONICAL_TREE) {
    return { result: "fail_closed", code: "lineage_mismatch" };
  }

  if (
    raw.f14WorkflowSourcePath !== "docs/p8-8-w09c3fa-f14-oci-release.inert.yml" ||
    raw.f14WorkflowBlobSha !== F15_F14_WORKFLOW_BLOB ||
    raw.f14DependencyPinSourcePath !== "artifacts/api-server/src/lib/p8-8-w09c3fa-f14-dependency-pins.ts" ||
    raw.f14DependencyPinSourceBlobSha !== F15_F14_PIN_SOURCE_BLOB ||
    raw.dockerfilePath !== "Dockerfile" ||
    raw.dockerfileBlobSha !== F15_DOCKERFILE_BLOB
  ) {
    return { result: "fail_closed", code: "artifact_identity_mismatch" };
  }

  if (raw.workflowUnderGitHubWorkflows !== false || raw.publishingTriggerEnabled !== false) {
    return { result: "fail_closed", code: "workflow_not_inert" };
  }

  if (!raw.permissions || typeof raw.permissions !== "object" || Array.isArray(raw.permissions) ||
      !exactKeys(raw.permissions as Record<string, unknown>, PERMISSION_KEYS)) {
    return { result: "fail_closed", code: "permission_mismatch" };
  }
  const permissions = raw.permissions as Record<string, unknown>;
  if (permissions.contents !== "read" || permissions.packages !== "write" ||
      permissions.idToken !== "write" || permissions.attestations !== "write") {
    return { result: "fail_closed", code: "permission_mismatch" };
  }

  if (!Array.isArray(raw.actionPins) ||
      raw.actionPins.length !== F15_ACTION_PINS.length ||
      raw.actionPins.some((pin, index) => pin !== F15_ACTION_PINS[index])) {
    return { result: "fail_closed", code: "action_pin_mismatch" };
  }

  if (!raw.build || typeof raw.build !== "object" || Array.isArray(raw.build) ||
      !exactKeys(raw.build as Record<string, unknown>, BUILD_KEYS)) {
    return { result: "fail_closed", code: "build_contract_mismatch" };
  }
  const build = raw.build as Record<string, unknown>;
  const expectedArgs = ["EXPECTED_CANONICAL_COMMIT","EXPECTED_CANONICAL_TREE","EXPECTED_SOURCE_BRANCH"];
  if (build.platform !== "linux/amd64" || build.target !== "runtime" ||
      build.provenance !== "max" || build.sbom !== true ||
      !Array.isArray(build.buildArgs) ||
      build.buildArgs.length !== expectedArgs.length ||
      build.buildArgs.some((item, index) => item !== expectedArgs[index])) {
    return { result: "fail_closed", code: "build_contract_mismatch" };
  }

  if (!raw.release || typeof raw.release !== "object" || Array.isArray(raw.release) ||
      !exactKeys(raw.release as Record<string, unknown>, RELEASE_KEYS)) {
    return { result: "fail_closed", code: "release_contract_mismatch" };
  }
  const release = raw.release as Record<string, unknown>;
  if (release.registry !== "ghcr.io" ||
      release.imageRepository !== F15_IMAGE_REPOSITORY ||
      release.imageTag !== F15_IMAGE_TAG ||
      release.latestTagAllowed !== false ||
      release.oneShotOnly !== true ||
      release.automaticRetryAllowed !== false ||
      release.parallelReleaseAllowed !== false) {
    return { result: "fail_closed", code: "release_contract_mismatch" };
  }

  if (!raw.authorization || typeof raw.authorization !== "object" || Array.isArray(raw.authorization) ||
      !exactKeys(raw.authorization as Record<string, unknown>, AUTH_KEYS)) {
    return { result: "fail_closed", code: "authorization_boundary_violation" };
  }
  const authorization = raw.authorization as Record<string, unknown>;
  if (authorization.subject !== F15_AUTHORIZATION_SUBJECT ||
      authorization.requiredLiteral !== EXPECTED_AUTH_LITERAL ||
      authorization.granted !== false) {
    return { result: "fail_closed", code: "authorization_boundary_violation" };
  }

  if (raw.liveExecutionRequested !== false) {
    return { result: "fail_closed", code: "live_execution_requested" };
  }

  return {
    result: "pass",
    evidenceId: digest("f15-", raw),
    authorizationPacketId: digest("f15-auth-", {
      source: [raw.canonicalCommitSha, raw.canonicalTreeSha],
      workflow: raw.f14WorkflowBlobSha,
      dependencyPins: raw.f14DependencyPinSourceBlobSha,
      dockerfile: raw.dockerfileBlobSha,
      release: raw.release,
      authorization: raw.authorization,
    }),
  };
}

export const F15_CERTIFIED_PREFLIGHT: F15ReleasePreflightEvidence = {
  schema: F15_PREFLIGHT_SCHEMA,
  repository: "intssere/SEO_ENGINE",
  sourceBranch: "main",
  canonicalCommitSha: F15_CANONICAL_COMMIT,
  canonicalTreeSha: F15_CANONICAL_TREE,
  f14WorkflowSourcePath: "docs/p8-8-w09c3fa-f14-oci-release.inert.yml",
  f14WorkflowBlobSha: F15_F14_WORKFLOW_BLOB,
  f14DependencyPinSourcePath: "artifacts/api-server/src/lib/p8-8-w09c3fa-f14-dependency-pins.ts",
  f14DependencyPinSourceBlobSha: F15_F14_PIN_SOURCE_BLOB,
  dockerfilePath: "Dockerfile",
  dockerfileBlobSha: F15_DOCKERFILE_BLOB,
  workflowUnderGitHubWorkflows: false,
  publishingTriggerEnabled: false,
  permissions: {
    contents: "read",
    packages: "write",
    idToken: "write",
    attestations: "write",
  },
  actionPins: [...F15_ACTION_PINS],
  build: {
    platform: "linux/amd64",
    target: "runtime",
    provenance: "max",
    sbom: true,
    buildArgs: ["EXPECTED_CANONICAL_COMMIT","EXPECTED_CANONICAL_TREE","EXPECTED_SOURCE_BRANCH"],
  },
  release: {
    registry: "ghcr.io",
    imageRepository: F15_IMAGE_REPOSITORY,
    imageTag: F15_IMAGE_TAG,
    latestTagAllowed: false,
    oneShotOnly: true,
    automaticRetryAllowed: false,
    parallelReleaseAllowed: false,
  },
  authorization: {
    subject: F15_AUTHORIZATION_SUBJECT,
    requiredLiteral: EXPECTED_AUTH_LITERAL,
    granted: false,
  },
  liveExecutionRequested: false,
};

export const F15_REQUIRED_AUTHORIZATION_LITERAL = EXPECTED_AUTH_LITERAL;
