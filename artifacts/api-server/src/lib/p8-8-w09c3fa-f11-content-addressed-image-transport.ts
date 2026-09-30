export const CONTENT_ADDRESSED_TRANSPORT_SCHEMA = "p8-8-w09c3fa-f11-v1" as const;

export interface ContentAddressedImageTransportEvidence {
  schema: typeof CONTENT_ADDRESSED_TRANSPORT_SCHEMA;
  sourceMode: "content_addressed_oci_image";
  registry: "ghcr" | "dockerhub" | "quay" | "gitlab";
  repository: string;
  imageDigest: string;
  canonicalRepository: string;
  canonicalCommitSha: string;
  canonicalTreeSha: string;
  sourceArtifactSha256: string;
  buildProvenanceDigest: string;
  railwayProjectId: string;
  railwayEnvironmentId: string;
  railwayServiceId: string;
  railwaySourceImage: string;
}

export type ContentAddressedTransportResult =
  | { result: "pass"; immutableImageReference: string }
  | { result: "fail_closed"; code:
      | "invalid_evidence"
      | "mutable_image_reference"
      | "digest_mismatch"
      | "credential_shaped_material" };

const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const OCI_DIGEST = /^sha256:[0-9a-f]{64}$/;
const SAFE = /^[A-Za-z0-9][A-Za-z0-9._:/+@-]{0,511}$/;
const CREDENTIAL_KEY = /(token|secret|password|credential|database[_-]?url|api[_-]?key|private[_-]?key)/i;
const CREDENTIAL_VALUE = /(bearer\s+[A-Za-z0-9._~+\/-]+=*|postgres(?:ql)?:\/\/[^\s]+:[^\s]+@|sk-[A-Za-z0-9_-]{16,})/i;

const KEYS = [
  "schema","sourceMode","registry","repository","imageDigest","canonicalRepository",
  "canonicalCommitSha","canonicalTreeSha","sourceArtifactSha256","buildProvenanceDigest",
  "railwayProjectId","railwayEnvironmentId","railwayServiceId","railwaySourceImage",
];

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

export function evaluateContentAddressedImageTransport(
  value: unknown,
): ContentAddressedTransportResult {
  if (hasCredentials(value)) return { result: "fail_closed", code: "credential_shaped_material" };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { result: "fail_closed", code: "invalid_evidence" };
  }
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).sort().join(",") !== [...KEYS].sort().join(",")) {
    return { result: "fail_closed", code: "invalid_evidence" };
  }
  if (raw.schema !== CONTENT_ADDRESSED_TRANSPORT_SCHEMA ||
      raw.sourceMode !== "content_addressed_oci_image" ||
      !["ghcr","dockerhub","quay","gitlab"].includes(String(raw.registry)) ||
      typeof raw.repository !== "string" || !SAFE.test(raw.repository) ||
      typeof raw.canonicalRepository !== "string" || !SAFE.test(raw.canonicalRepository) ||
      typeof raw.canonicalCommitSha !== "string" || !SHA40.test(raw.canonicalCommitSha) ||
      typeof raw.canonicalTreeSha !== "string" || !SHA40.test(raw.canonicalTreeSha) ||
      typeof raw.sourceArtifactSha256 !== "string" || !SHA256.test(raw.sourceArtifactSha256) ||
      typeof raw.buildProvenanceDigest !== "string" || !OCI_DIGEST.test(raw.buildProvenanceDigest) ||
      typeof raw.imageDigest !== "string" || !OCI_DIGEST.test(raw.imageDigest) ||
      typeof raw.railwayProjectId !== "string" || !SAFE.test(raw.railwayProjectId) ||
      typeof raw.railwayEnvironmentId !== "string" || !SAFE.test(raw.railwayEnvironmentId) ||
      typeof raw.railwayServiceId !== "string" || !SAFE.test(raw.railwayServiceId) ||
      typeof raw.railwaySourceImage !== "string" || !SAFE.test(raw.railwaySourceImage)) {
    return { result: "fail_closed", code: "invalid_evidence" };
  }

  const immutable = `${raw.repository}@${raw.imageDigest}`;
  if (!raw.railwaySourceImage.includes("@sha256:")) {
    return { result: "fail_closed", code: "mutable_image_reference" };
  }
  if (raw.railwaySourceImage !== immutable) {
    return { result: "fail_closed", code: "digest_mismatch" };
  }
  return { result: "pass", immutableImageReference: immutable };
}
