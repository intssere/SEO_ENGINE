import { createHash } from "node:crypto";

export const RAILWAY_TRANSPORT_RECEIPT_SCHEMA = "p8-8-w09c3fa-f9-v1" as const;
export const RAILWAY_TRANSPORT_MODE = "railway_cli_up" as const;

export type RailwayTransportIntent = {
  schema: typeof RAILWAY_TRANSPORT_RECEIPT_SCHEMA;
  transportMode: typeof RAILWAY_TRANSPORT_MODE;
  projectId: string;
  environmentId: string;
  serviceId: string;
  manifestSha256: string;
  artifactSha256: string;
  inventorySha256: string;
  entryCount: number;
  gitignoreEnabled: boolean;
  railwayignorePresent: boolean;
  pathAsRoot: boolean;
};

export type RailwayDeploymentReceipt = {
  schema: typeof RAILWAY_TRANSPORT_RECEIPT_SCHEMA;
  transportMode: typeof RAILWAY_TRANSPORT_MODE;
  projectId: string;
  environmentId: string;
  serviceId: string;
  deploymentId: string;
  snapshotId: string;
  sourceAssociation: "deployment_snapshot";
};

export type RailwayTransportVerification =
  | {
      result: "pass";
      evidenceId: string;
      proofScope: "deployment_snapshot_only";
      artifactReceiptProven: false;
    }
  | {
      result: "fail_closed";
      code:
        | "invalid_shape"
        | "credential_shaped_material"
        | "invalid_identity"
        | "target_mismatch"
        | "artifact_receipt_unproved";
    };

const SHA256 = /^[0-9a-f]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const CREDENTIAL_KEY = /(token|secret|password|credential|database[_-]?url|api[_-]?key|private[_-]?key)/i;
const CREDENTIAL_VALUE = /(bearer\s+[A-Za-z0-9._~+\/-]+=*|postgres(?:ql)?:\/\/[^\s]+:[^\s]+@|sk-[A-Za-z0-9_-]{16,})/i;

function exactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  return Object.keys(value).sort().join(",") === [...expected].sort().join(",");
}

function containsCredentialMaterial(value: unknown, key = ""): boolean {
  if (CREDENTIAL_KEY.test(key)) return true;
  if (typeof value === "string") return CREDENTIAL_VALUE.test(value);
  if (Array.isArray(value)) return value.some((item) => containsCredentialMaterial(item));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .some(([childKey, child]) => containsCredentialMaterial(child, childKey));
  }
  return false;
}

function validIntent(value: unknown): value is RailwayTransportIntent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return exactKeys(raw, [
    "schema","transportMode","projectId","environmentId","serviceId",
    "manifestSha256","artifactSha256","inventorySha256","entryCount",
    "gitignoreEnabled","railwayignorePresent","pathAsRoot",
  ]) &&
    raw.schema === RAILWAY_TRANSPORT_RECEIPT_SCHEMA &&
    raw.transportMode === RAILWAY_TRANSPORT_MODE &&
    typeof raw.projectId === "string" && ID.test(raw.projectId) &&
    typeof raw.environmentId === "string" && ID.test(raw.environmentId) &&
    typeof raw.serviceId === "string" && ID.test(raw.serviceId) &&
    typeof raw.manifestSha256 === "string" && SHA256.test(raw.manifestSha256) &&
    typeof raw.artifactSha256 === "string" && SHA256.test(raw.artifactSha256) &&
    typeof raw.inventorySha256 === "string" && SHA256.test(raw.inventorySha256) &&
    Number.isSafeInteger(raw.entryCount) && (raw.entryCount as number) > 0 &&
    typeof raw.gitignoreEnabled === "boolean" &&
    typeof raw.railwayignorePresent === "boolean" &&
    typeof raw.pathAsRoot === "boolean";
}

function validReceipt(value: unknown): value is RailwayDeploymentReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return exactKeys(raw, [
    "schema","transportMode","projectId","environmentId","serviceId",
    "deploymentId","snapshotId","sourceAssociation",
  ]) &&
    raw.schema === RAILWAY_TRANSPORT_RECEIPT_SCHEMA &&
    raw.transportMode === RAILWAY_TRANSPORT_MODE &&
    typeof raw.projectId === "string" && ID.test(raw.projectId) &&
    typeof raw.environmentId === "string" && ID.test(raw.environmentId) &&
    typeof raw.serviceId === "string" && ID.test(raw.serviceId) &&
    typeof raw.deploymentId === "string" && ID.test(raw.deploymentId) &&
    typeof raw.snapshotId === "string" && ID.test(raw.snapshotId) &&
    raw.sourceAssociation === "deployment_snapshot";
}

export function verifyRailwayTransportReceipt(
  intent: unknown,
  receipt: unknown,
): RailwayTransportVerification {
  if (containsCredentialMaterial(intent) || containsCredentialMaterial(receipt)) {
    return { result: "fail_closed", code: "credential_shaped_material" };
  }
  if (!validIntent(intent) || !validReceipt(receipt)) {
    return { result: "fail_closed", code: "invalid_shape" };
  }
  if (
    intent.projectId !== receipt.projectId ||
    intent.environmentId !== receipt.environmentId ||
    intent.serviceId !== receipt.serviceId
  ) return { result: "fail_closed", code: "target_mismatch" };

  // Railway's documented/available deployment receipt proves a deployment/snapshot
  // was created for the target, but exposes no authoritative digest or manifest of
  // the exact uploaded source archive. Therefore artifact identity cannot pass here.
  return { result: "fail_closed", code: "artifact_receipt_unproved" };
}

export function deploymentSnapshotEvidenceId(receipt: RailwayDeploymentReceipt): string {
  return "f9-" + createHash("sha256").update(JSON.stringify([
    receipt.schema,
    receipt.transportMode,
    receipt.projectId,
    receipt.environmentId,
    receipt.serviceId,
    receipt.deploymentId,
    receipt.snapshotId,
    receipt.sourceAssociation,
  ])).digest("hex");
}
