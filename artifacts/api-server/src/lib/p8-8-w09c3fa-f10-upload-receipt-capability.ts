export const RAILWAY_UPLOAD_RECEIPT_CAPABILITY_SCHEMA = "p8-8-w09c3fa-f10-v1" as const;

export type RailwayUploadReceiptCapability =
  | {
      schema: typeof RAILWAY_UPLOAD_RECEIPT_CAPABILITY_SCHEMA;
      authority: "railway";
      capability: "archive_digest";
      digestAlgorithm: "sha256";
      digest: string;
      canonicalization: string;
      deploymentId: string;
      snapshotId: string;
    }
  | {
      schema: typeof RAILWAY_UPLOAD_RECEIPT_CAPABILITY_SCHEMA;
      authority: "railway";
      capability: "source_manifest";
      manifestDigestAlgorithm: "sha256";
      manifestDigest: string;
      manifestFormat: string;
      deploymentId: string;
      snapshotId: string;
    }
  | {
      schema: typeof RAILWAY_UPLOAD_RECEIPT_CAPABILITY_SCHEMA;
      authority: "railway";
      capability: "source_artifact_resource";
      resourceId: string;
      resourceDigestAlgorithm: "sha256";
      resourceDigest: string;
      deploymentId: string;
      snapshotId: string;
    };

export type RailwayUploadReceiptCapabilityResult =
  | { result: "pass"; capability: RailwayUploadReceiptCapability["capability"] }
  | {
      result: "fail_closed";
      code:
        | "capability_absent"
        | "invalid_capability"
        | "non_railway_authority"
        | "credential_shaped_material";
    };

const SHA256 = /^[0-9a-f]{64}$/;
const SAFE = /^[A-Za-z0-9][A-Za-z0-9._:/+-]{0,255}$/;
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

export function evaluateRailwayUploadReceiptCapability(
  value: unknown,
): RailwayUploadReceiptCapabilityResult {
  if (value === null || value === undefined) {
    return { result: "fail_closed", code: "capability_absent" };
  }
  if (containsCredentialMaterial(value)) {
    return { result: "fail_closed", code: "credential_shaped_material" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_capability" };
  }

  const raw = value as Record<string, unknown>;
  if (raw.authority !== "railway") {
    return { result: "fail_closed", code: "non_railway_authority" };
  }
  if (
    raw.schema !== RAILWAY_UPLOAD_RECEIPT_CAPABILITY_SCHEMA ||
    typeof raw.deploymentId !== "string" || !SAFE.test(raw.deploymentId) ||
    typeof raw.snapshotId !== "string" || !SAFE.test(raw.snapshotId)
  ) return { result: "fail_closed", code: "invalid_capability" };

  if (raw.capability === "archive_digest") {
    if (!exactKeys(raw, ["schema","authority","capability","digestAlgorithm","digest","canonicalization","deploymentId","snapshotId"]) ||
        raw.digestAlgorithm !== "sha256" ||
        typeof raw.digest !== "string" || !SHA256.test(raw.digest) ||
        typeof raw.canonicalization !== "string" || !SAFE.test(raw.canonicalization)) {
      return { result: "fail_closed", code: "invalid_capability" };
    }
    return { result: "pass", capability: "archive_digest" };
  }

  if (raw.capability === "source_manifest") {
    if (!exactKeys(raw, ["schema","authority","capability","manifestDigestAlgorithm","manifestDigest","manifestFormat","deploymentId","snapshotId"]) ||
        raw.manifestDigestAlgorithm !== "sha256" ||
        typeof raw.manifestDigest !== "string" || !SHA256.test(raw.manifestDigest) ||
        typeof raw.manifestFormat !== "string" || !SAFE.test(raw.manifestFormat)) {
      return { result: "fail_closed", code: "invalid_capability" };
    }
    return { result: "pass", capability: "source_manifest" };
  }

  if (raw.capability === "source_artifact_resource") {
    if (!exactKeys(raw, ["schema","authority","capability","resourceId","resourceDigestAlgorithm","resourceDigest","deploymentId","snapshotId"]) ||
        typeof raw.resourceId !== "string" || !SAFE.test(raw.resourceId) ||
        raw.resourceDigestAlgorithm !== "sha256" ||
        typeof raw.resourceDigest !== "string" || !SHA256.test(raw.resourceDigest)) {
      return { result: "fail_closed", code: "invalid_capability" };
    }
    return { result: "pass", capability: "source_artifact_resource" };
  }

  return { result: "fail_closed", code: "invalid_capability" };
}
