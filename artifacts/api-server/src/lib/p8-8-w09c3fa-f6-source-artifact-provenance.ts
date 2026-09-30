import { createHash } from "node:crypto";
import {
  SOURCE_ATTESTATION_ISSUER,
  SOURCE_ATTESTATION_SCHEMA,
  sourceAttestationId,
  type SourceAttestation,
} from "./p8-8-w09c3fa-f4-source-attestation.js";

const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH = /^(?!\/)(?!.*\.\.)(?!.*(?:^|\/)\.)(?!.*[~^:?*\\\[\]\s])(?!.+\/$).+$/;
const RAILWAY_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?\/)(?!.*\\)(?!.*\/\/)[^\0]+$/;
const CREDENTIAL_KEY = /(password|passwd|secret|token|authorization|cookie|private.?key|connection.?string|database.?url)/i;
const CREDENTIAL_VALUE = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:bearer|basic)\s+[A-Za-z0-9._~+\/-]+=*|(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s]+|gh[pousr]_[A-Za-z0-9_]+)/i;

export const SOURCE_ARTIFACT_SCHEMA = "p8-8-w09c3fa-f6-v1" as const;
export const SOURCE_ARTIFACT_MODE = "controlled_artifact_upload" as const;
export const MANIFEST_ALGORITHM = "sha256-path-mode-content-v1" as const;

export type SourceManifestEntry = {
  path: string;
  mode: "100644" | "100755" | "120000";
  contentSha256: string;
  size: number;
};

export type SourceArtifactEnvelope = {
  schema: typeof SOURCE_ARTIFACT_SCHEMA;
  sourceMode: typeof SOURCE_ARTIFACT_MODE;
  repository: string;
  commitSha: string;
  treeSha: string;
  sourceBranch: string;
  manifestAlgorithm: typeof MANIFEST_ALGORITHM;
  manifestSha256: string;
  artifactSha256: string;
  sourceAttestation: SourceAttestation;
};

export type RailwayArtifactReceipt = {
  projectId: string;
  environmentId: string;
  serviceId: string;
  deploymentId: string;
  snapshotId: string;
  sourceMode: typeof SOURCE_ARTIFACT_MODE;
  artifactSha256: string;
  manifestSha256: string;
};

export type SourceArtifactContext = {
  expectedRepository: string;
  expectedCommitSha: string;
  expectedTreeSha: string;
  expectedSourceBranch: string;
  expectedProjectId: string;
  expectedEnvironmentId: string;
  expectedServiceId: string;
};

export type SourceArtifactResult =
  | {
      result: "pass";
      code: "ok";
      artifactProvenanceId: string;
      identity: {
        repository: string;
        commitSha: string;
        treeSha: string;
        sourceBranch: string;
        sourceMode: typeof SOURCE_ARTIFACT_MODE;
        manifestSha256: string;
        artifactSha256: string;
        deploymentId: string;
        snapshotId: string;
      };
    }
  | {
      result: "fail_closed";
      code:
        | "invalid_shape"
        | "credential_shaped_material"
        | "invalid_identity"
        | "manifest_mismatch"
        | "artifact_mismatch"
        | "attestation_mismatch"
        | "source_mismatch"
        | "railway_target_mismatch"
        | "receipt_mismatch";
    };

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hasCredentialMaterial(value: unknown, key = ""): boolean {
  if (CREDENTIAL_KEY.test(key)) return true;
  if (typeof value === "string") return CREDENTIAL_VALUE.test(value);
  if (Array.isArray(value)) return value.some((item) => hasCredentialMaterial(item));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([childKey, child]) =>
      hasCredentialMaterial(child, childKey));
  }
  return false;
}

export function sourceManifestSha256(entries: SourceManifestEntry[]): string | null {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  let previous = "";
  const lines: string[] = [];
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry !== "object" ||
      Object.keys(entry).sort().join(",") !== "contentSha256,mode,path,size" ||
      !PATH.test(entry.path) ||
      !["100644", "100755", "120000"].includes(entry.mode) ||
      !SHA256.test(entry.contentSha256) ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      entry.path <= previous
    ) return null;
    previous = entry.path;
    lines.push(JSON.stringify([entry.path, entry.mode, entry.size, entry.contentSha256]));
  }
  return hash(lines.join("\n") + "\n");
}

function exactKeys(raw: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(raw).sort().join(",") === [...keys].sort().join(",");
}

export function sourceArtifactProvenanceId(envelope: SourceArtifactEnvelope, receipt: RailwayArtifactReceipt): string {
  return "f6-" + hash(JSON.stringify({
    schema: envelope.schema,
    sourceMode: envelope.sourceMode,
    repository: envelope.repository,
    commitSha: envelope.commitSha,
    treeSha: envelope.treeSha,
    sourceBranch: envelope.sourceBranch,
    manifestAlgorithm: envelope.manifestAlgorithm,
    manifestSha256: envelope.manifestSha256,
    artifactSha256: envelope.artifactSha256,
    sourceAttestationId: sourceAttestationId(envelope.sourceAttestation),
    projectId: receipt.projectId,
    environmentId: receipt.environmentId,
    serviceId: receipt.serviceId,
    deploymentId: receipt.deploymentId,
    snapshotId: receipt.snapshotId,
  }));
}

export function verifySourceArtifactProvenance(
  manifest: unknown,
  envelopeInput: unknown,
  receiptInput: unknown,
  context: SourceArtifactContext,
): SourceArtifactResult {
  if (!Array.isArray(manifest) || !envelopeInput || typeof envelopeInput !== "object" || Array.isArray(envelopeInput) ||
      !receiptInput || typeof receiptInput !== "object" || Array.isArray(receiptInput)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  if (hasCredentialMaterial(manifest) || hasCredentialMaterial(envelopeInput) || hasCredentialMaterial(receiptInput)) {
    return { result: "fail_closed", code: "credential_shaped_material" };
  }
  const envelopeRaw = envelopeInput as Record<string, unknown>;
  const receiptRaw = receiptInput as Record<string, unknown>;
  if (!exactKeys(envelopeRaw, ["schema","sourceMode","repository","commitSha","treeSha","sourceBranch","manifestAlgorithm","manifestSha256","artifactSha256","sourceAttestation"]) ||
      !exactKeys(receiptRaw, ["projectId","environmentId","serviceId","deploymentId","snapshotId","sourceMode","artifactSha256","manifestSha256"])) {
    return { result: "fail_closed", code: "invalid_shape" };
  }

  const envelope = envelopeRaw as SourceArtifactEnvelope;
  const receipt = receiptRaw as RailwayArtifactReceipt;
  if (
    envelope.schema !== SOURCE_ARTIFACT_SCHEMA ||
    envelope.sourceMode !== SOURCE_ARTIFACT_MODE ||
    envelope.manifestAlgorithm !== MANIFEST_ALGORITHM ||
    !REPOSITORY.test(envelope.repository) ||
    !SHA40.test(envelope.commitSha) ||
    !SHA40.test(envelope.treeSha) ||
    !BRANCH.test(envelope.sourceBranch) ||
    !SHA256.test(envelope.manifestSha256) ||
    !SHA256.test(envelope.artifactSha256) ||
    receipt.sourceMode !== SOURCE_ARTIFACT_MODE ||
    ![receipt.projectId, receipt.environmentId, receipt.serviceId, receipt.deploymentId, receipt.snapshotId].every((id) => typeof id === "string" && RAILWAY_ID.test(id)) ||
    !SHA256.test(receipt.artifactSha256) ||
    !SHA256.test(receipt.manifestSha256)
  ) return { result: "fail_closed", code: "invalid_identity" };

  const manifestSha = sourceManifestSha256(manifest as SourceManifestEntry[]);
  if (!manifestSha || manifestSha !== envelope.manifestSha256) {
    return { result: "fail_closed", code: "manifest_mismatch" };
  }
  if (receipt.manifestSha256 !== envelope.manifestSha256) {
    return { result: "fail_closed", code: "receipt_mismatch" };
  }
  if (receipt.artifactSha256 !== envelope.artifactSha256) {
    return { result: "fail_closed", code: "artifact_mismatch" };
  }

  const att = envelope.sourceAttestation;
  if (!att || typeof att !== "object" ||
      att.schema !== SOURCE_ATTESTATION_SCHEMA ||
      att.issuedFrom !== SOURCE_ATTESTATION_ISSUER ||
      att.repository !== envelope.repository ||
      att.commitSha !== envelope.commitSha ||
      att.treeSha !== envelope.treeSha ||
      att.sourceBranch !== envelope.sourceBranch) {
    return { result: "fail_closed", code: "attestation_mismatch" };
  }

  if (envelope.repository !== context.expectedRepository ||
      envelope.commitSha !== context.expectedCommitSha ||
      envelope.treeSha !== context.expectedTreeSha ||
      envelope.sourceBranch !== context.expectedSourceBranch) {
    return { result: "fail_closed", code: "source_mismatch" };
  }
  if (receipt.projectId !== context.expectedProjectId ||
      receipt.environmentId !== context.expectedEnvironmentId ||
      receipt.serviceId !== context.expectedServiceId) {
    return { result: "fail_closed", code: "railway_target_mismatch" };
  }

  return {
    result: "pass",
    code: "ok",
    artifactProvenanceId: sourceArtifactProvenanceId(envelope, receipt),
    identity: {
      repository: envelope.repository,
      commitSha: envelope.commitSha,
      treeSha: envelope.treeSha,
      sourceBranch: envelope.sourceBranch,
      sourceMode: SOURCE_ARTIFACT_MODE,
      manifestSha256: envelope.manifestSha256,
      artifactSha256: envelope.artifactSha256,
      deploymentId: receipt.deploymentId,
      snapshotId: receipt.snapshotId,
    },
  };
}
