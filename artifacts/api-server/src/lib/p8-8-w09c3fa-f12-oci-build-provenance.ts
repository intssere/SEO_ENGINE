import { createHash } from "node:crypto";

export const OCI_BUILD_PROVENANCE_SCHEMA = "p8-8-w09c3fa-f12-v1" as const;
export const OCI_BUILD_SOURCE_MODE = "content_addressed_oci_build" as const;

export interface ExpectedOciBuildContext {
  canonicalRepository: string;
  canonicalCommitSha: string;
  canonicalTreeSha: string;
  sourceArtifactSha256: string;
  buildDefinitionPath: string;
  buildDefinitionSha256: string;
}

export interface OciPlatformDescriptor {
  platform: string;
  manifestDigest: string;
}

export interface OciBaseImageDescriptor {
  image: string;
  digest: string;
}

export interface OciBuildProvenanceEvidence {
  schema: typeof OCI_BUILD_PROVENANCE_SCHEMA;
  sourceMode: typeof OCI_BUILD_SOURCE_MODE;
  canonicalRepository: string;
  canonicalCommitSha: string;
  canonicalTreeSha: string;
  sourceArtifactSha256: string;
  buildDefinitionPath: string;
  buildDefinitionSha256: string;
  platformMode: "single_platform" | "multi_platform_index";
  platforms: OciPlatformDescriptor[];
  baseImages: OciBaseImageDescriptor[];
  imageRepository: string;
  buildResultDigest: string;
  registry: "ghcr";
  registryAuthority: "ghcr_registry";
  registryDigest: string;
  attestationAuthority: "github_actions_artifact_attestation";
  attestationKind: "build_provenance";
  attestationSubjectName: string;
  attestationSubjectDigest: string;
  attestedRepository: string;
  attestedCommitSha: string;
  attestedWorkflowRef: string;
}

export type OciBuildProvenanceResult =
  | { result: "pass"; provenanceId: string; immutableImageReference: string }
  | {
      result: "fail_closed";
      code:
        | "invalid_expected_context"
        | "invalid_evidence"
        | "credential_shaped_material"
        | "source_lineage_mismatch"
        | "build_definition_mismatch"
        | "platform_contract_mismatch"
        | "mutable_base_image"
        | "digest_mismatch"
        | "attestation_mismatch";
    };

const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const OCI_DIGEST = /^sha256:[0-9a-f]{64}$/;
const SAFE_REPOSITORY = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,255}$/;
const SAFE_IMAGE = /^[a-z0-9][a-z0-9._:/-]{0,511}$/;
const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]{1,512}$/;
const SAFE_PLATFORM = /^[a-z0-9]+\/[a-z0-9_]+(?:\/[a-z0-9._-]+)?$/;
const SAFE_WORKFLOW_REF = /^[A-Za-z0-9._/-]+@[0-9a-f]{40}$/;
const CREDENTIAL_KEY =
  /(token|secret|password|credential|database[_-]?url|api[_-]?key|private[_-]?key)/i;
const CREDENTIAL_VALUE =
  /(bearer\s+[A-Za-z0-9._~+\/-]+=*|postgres(?:ql)?:\/\/[^\s]+:[^\s]+@|sk-[A-Za-z0-9_-]{16,})/i;

const EXPECTED_KEYS = [
  "canonicalRepository",
  "canonicalCommitSha",
  "canonicalTreeSha",
  "sourceArtifactSha256",
  "buildDefinitionPath",
  "buildDefinitionSha256",
];

const EVIDENCE_KEYS = [
  "schema",
  "sourceMode",
  "canonicalRepository",
  "canonicalCommitSha",
  "canonicalTreeSha",
  "sourceArtifactSha256",
  "buildDefinitionPath",
  "buildDefinitionSha256",
  "platformMode",
  "platforms",
  "baseImages",
  "imageRepository",
  "buildResultDigest",
  "registry",
  "registryAuthority",
  "registryDigest",
  "attestationAuthority",
  "attestationKind",
  "attestationSubjectName",
  "attestationSubjectDigest",
  "attestedRepository",
  "attestedCommitSha",
  "attestedWorkflowRef",
];

const PLATFORM_KEYS = ["platform", "manifestDigest"];
const BASE_IMAGE_KEYS = ["image", "digest"];

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

function validExpectedContext(value: unknown): value is ExpectedOciBuildContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return exactKeys(raw, EXPECTED_KEYS) &&
    typeof raw.canonicalRepository === "string" &&
    SAFE_REPOSITORY.test(raw.canonicalRepository) &&
    typeof raw.canonicalCommitSha === "string" &&
    SHA40.test(raw.canonicalCommitSha) &&
    typeof raw.canonicalTreeSha === "string" &&
    SHA40.test(raw.canonicalTreeSha) &&
    typeof raw.sourceArtifactSha256 === "string" &&
    SHA256.test(raw.sourceArtifactSha256) &&
    typeof raw.buildDefinitionPath === "string" &&
    SAFE_PATH.test(raw.buildDefinitionPath) &&
    typeof raw.buildDefinitionSha256 === "string" &&
    SHA256.test(raw.buildDefinitionSha256);
}

function validPlatform(value: unknown): value is OciPlatformDescriptor {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return exactKeys(raw, PLATFORM_KEYS) &&
    typeof raw.platform === "string" &&
    SAFE_PLATFORM.test(raw.platform) &&
    typeof raw.manifestDigest === "string" &&
    OCI_DIGEST.test(raw.manifestDigest);
}

function validBaseImage(value: unknown): value is OciBaseImageDescriptor {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return exactKeys(raw, BASE_IMAGE_KEYS) &&
    typeof raw.image === "string" &&
    SAFE_IMAGE.test(raw.image) &&
    typeof raw.digest === "string" &&
    OCI_DIGEST.test(raw.digest);
}

function sortedUnique<T>(values: T[], key: (value: T) => string): boolean {
  const keys = values.map(key);
  return keys.every((item, index) => index === 0 || keys[index - 1]! < item);
}

function canonicalEvidencePayload(evidence: OciBuildProvenanceEvidence): string {
  return JSON.stringify({
    schema: evidence.schema,
    sourceMode: evidence.sourceMode,
    canonicalRepository: evidence.canonicalRepository,
    canonicalCommitSha: evidence.canonicalCommitSha,
    canonicalTreeSha: evidence.canonicalTreeSha,
    sourceArtifactSha256: evidence.sourceArtifactSha256,
    buildDefinitionPath: evidence.buildDefinitionPath,
    buildDefinitionSha256: evidence.buildDefinitionSha256,
    platformMode: evidence.platformMode,
    platforms: evidence.platforms,
    baseImages: evidence.baseImages,
    imageRepository: evidence.imageRepository,
    buildResultDigest: evidence.buildResultDigest,
    registry: evidence.registry,
    registryAuthority: evidence.registryAuthority,
    registryDigest: evidence.registryDigest,
    attestationAuthority: evidence.attestationAuthority,
    attestationKind: evidence.attestationKind,
    attestationSubjectName: evidence.attestationSubjectName,
    attestationSubjectDigest: evidence.attestationSubjectDigest,
    attestedRepository: evidence.attestedRepository,
    attestedCommitSha: evidence.attestedCommitSha,
    attestedWorkflowRef: evidence.attestedWorkflowRef,
  });
}

export function evaluateOciBuildProvenance(
  expected: unknown,
  value: unknown,
): OciBuildProvenanceResult {
  if (hasCredentials(expected) || hasCredentials(value)) {
    return { result: "fail_closed", code: "credential_shaped_material" };
  }
  if (!validExpectedContext(expected)) {
    return { result: "fail_closed", code: "invalid_expected_context" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_evidence" };
  }

  const raw = value as Record<string, unknown>;
  if (!exactKeys(raw, EVIDENCE_KEYS) ||
      raw.schema !== OCI_BUILD_PROVENANCE_SCHEMA ||
      raw.sourceMode !== OCI_BUILD_SOURCE_MODE ||
      raw.platformMode !== "single_platform" && raw.platformMode !== "multi_platform_index" ||
      !Array.isArray(raw.platforms) ||
      !raw.platforms.every(validPlatform) ||
      !Array.isArray(raw.baseImages) ||
      !raw.baseImages.every(validBaseImage) ||
      typeof raw.canonicalRepository !== "string" ||
      typeof raw.canonicalCommitSha !== "string" ||
      typeof raw.canonicalTreeSha !== "string" ||
      typeof raw.sourceArtifactSha256 !== "string" ||
      typeof raw.buildDefinitionPath !== "string" ||
      typeof raw.buildDefinitionSha256 !== "string" ||
      typeof raw.imageRepository !== "string" ||
      !SAFE_IMAGE.test(raw.imageRepository) ||
      typeof raw.buildResultDigest !== "string" ||
      !OCI_DIGEST.test(raw.buildResultDigest) ||
      raw.registry !== "ghcr" ||
      raw.registryAuthority !== "ghcr_registry" ||
      typeof raw.registryDigest !== "string" ||
      !OCI_DIGEST.test(raw.registryDigest) ||
      raw.attestationAuthority !== "github_actions_artifact_attestation" ||
      raw.attestationKind !== "build_provenance" ||
      typeof raw.attestationSubjectName !== "string" ||
      typeof raw.attestationSubjectDigest !== "string" ||
      !OCI_DIGEST.test(raw.attestationSubjectDigest) ||
      typeof raw.attestedRepository !== "string" ||
      typeof raw.attestedCommitSha !== "string" ||
      typeof raw.attestedWorkflowRef !== "string" ||
      !SAFE_WORKFLOW_REF.test(raw.attestedWorkflowRef)) {
    return { result: "fail_closed", code: "invalid_evidence" };
  }

  const evidence = raw as unknown as OciBuildProvenanceEvidence;

  if (evidence.canonicalRepository !== expected.canonicalRepository ||
      evidence.canonicalCommitSha !== expected.canonicalCommitSha ||
      evidence.canonicalTreeSha !== expected.canonicalTreeSha ||
      evidence.sourceArtifactSha256 !== expected.sourceArtifactSha256) {
    return { result: "fail_closed", code: "source_lineage_mismatch" };
  }

  if (evidence.buildDefinitionPath !== expected.buildDefinitionPath ||
      evidence.buildDefinitionSha256 !== expected.buildDefinitionSha256) {
    return { result: "fail_closed", code: "build_definition_mismatch" };
  }

  if (evidence.platforms.length < 1 ||
      !sortedUnique(evidence.platforms, (item) => item.platform) ||
      new Set(evidence.platforms.map((item) => item.manifestDigest)).size !== evidence.platforms.length ||
      (evidence.platformMode === "single_platform" && evidence.platforms.length !== 1) ||
      (evidence.platformMode === "multi_platform_index" && evidence.platforms.length < 2)) {
    return { result: "fail_closed", code: "platform_contract_mismatch" };
  }

  if (!sortedUnique(evidence.baseImages, (item) => item.image) ||
      evidence.baseImages.some((item) => item.image.includes("@sha256:") || item.image.includes(":latest"))) {
    return { result: "fail_closed", code: "mutable_base_image" };
  }

  if (evidence.buildResultDigest !== evidence.registryDigest) {
    return { result: "fail_closed", code: "digest_mismatch" };
  }

  if (evidence.attestationSubjectName !== evidence.imageRepository ||
      evidence.attestationSubjectDigest !== evidence.registryDigest ||
      evidence.attestedRepository !== evidence.canonicalRepository ||
      evidence.attestedCommitSha !== evidence.canonicalCommitSha) {
    return { result: "fail_closed", code: "attestation_mismatch" };
  }

  const provenanceId = "f12-" + createHash("sha256")
    .update(canonicalEvidencePayload(evidence))
    .digest("hex");

  return {
    result: "pass",
    provenanceId,
    immutableImageReference: `${evidence.imageRepository}@${evidence.registryDigest}`,
  };
}
