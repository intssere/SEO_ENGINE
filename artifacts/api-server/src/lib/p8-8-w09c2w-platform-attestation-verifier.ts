import {
  W09_C2N_SCHEMA_VERSION,
  type SanitizedBindingIdentity,
} from "./p8-8-w09c2n-attestation-verifier.js";

export const W09_C2W_SCHEMA_VERSION = "p8-8-w09c2w-v2" as const;

export type PlatformKind = "replit" | "railway";
export type PlatformAttestationVerdict = "PASS" | "UNPROVED";
export type PlatformAttestationCode =
  | "ATTESTATION_OK"
  | "ATTESTATION_SCHEMA_UNSUPPORTED"
  | "ATTESTATION_UNKNOWN_FIELD"
  | "ATTESTATION_CREDENTIAL_SHAPED_INPUT"
  | "ATTESTATION_PROVENANCE_UNAPPROVED"
  | "ATTESTATION_PLATFORM_MISMATCH"
  | "ATTESTATION_PLATFORM_SUBJECT_MISMATCH"
  | "ATTESTATION_DEPLOYMENT_MISMATCH"
  | "ATTESTATION_DEPLOYMENT_NOT_SUCCESS"
  | "ATTESTATION_BINDING_UNPROVED"
  | "ATTESTATION_STALE"
  | "ATTESTATION_PROVIDER_MISSING"
  | "ATTESTATION_PROVIDER_MISMATCH"
  | "ATTESTATION_PROJECT_MISSING"
  | "ATTESTATION_BRANCH_MISSING"
  | "ATTESTATION_DATABASE_MISSING"
  | "ATTESTATION_ENDPOINT_MISSING"
  | "ATTESTATION_LINEAGE_UNPROVED";

export interface VerifyPlatformAttestationContext {
  expectedPlatformKind: PlatformKind;
  expectedPlatformSubjectId: string;
  expectedDeploymentId: string;
  expectedProvider: "Neon";
  approvedProvenanceKinds: readonly string[];
  approvedProvenanceAuthorities: readonly string[];
  observedAt: string;
  maxAgeMs: number;
  lineageContinuityCertified?: boolean;
}

export interface SanitizedPlatformBindingIdentity {
  schemaVersion: typeof W09_C2W_SCHEMA_VERSION;
  provenanceKind: string;
  provenanceAuthority: string;
  platformKind: PlatformKind;
  platformSubjectId: string;
  deploymentId: string;
  deploymentStatus: string;
  publicUrl: string;
  bindingRevisionId: string;
  provider: string;
  providerProjectId: string;
  branchId: string;
  databaseName: string;
  timelineId?: string;
  endpointId: string;
  observedAt: string;
}

export interface PlatformBindingAttestationReceipt {
  verdict: PlatformAttestationVerdict;
  code: PlatformAttestationCode;
  identity?: SanitizedPlatformBindingIdentity;
  freshnessVerdict: "PASS" | "UNPROVED";
  deploymentBindingVerdict: "PASS" | "UNPROVED";
  secretNonObservabilityVerdict: "PASS" | "UNPROVED";
  provenanceVerdict: "PASS" | "UNPROVED";
}

const ALLOWED_FIELDS = new Set([
  "schemaVersion", "provenanceKind", "provenanceAuthority", "platformKind",
  "platformSubjectId", "deploymentId", "deploymentStatus", "publicUrl",
  "bindingRevisionId", "provider", "providerProjectId", "branchId",
  "databaseName", "timelineId", "endpointId", "observedAt",
]);

const CREDENTIAL_KEY = /(?:database[_-]?url|connection[_-]?string|username|password|token|secret|credentials|environment|env(?:ironment)?[_-]?vars?)/i;
const CREDENTIAL_VALUE = /(?:postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|redis:\/\/|(?:password|token|secret)=|bearer\s+[a-z0-9._~+\/-]+)/i;

function unproved(
  code: PlatformAttestationCode,
  flags: Partial<Omit<PlatformBindingAttestationReceipt, "verdict" | "code" | "identity">> = {},
): PlatformBindingAttestationReceipt {
  return {
    verdict: "UNPROVED",
    code,
    freshnessVerdict: flags.freshnessVerdict ?? "UNPROVED",
    deploymentBindingVerdict: flags.deploymentBindingVerdict ?? "UNPROVED",
    secretNonObservabilityVerdict: flags.secretNonObservabilityVerdict ?? "PASS",
    provenanceVerdict: flags.provenanceVerdict ?? "UNPROVED",
  };
}

function containsCredentialShapedInput(value: unknown, key?: string): boolean {
  if (key && CREDENTIAL_KEY.test(key)) return true;
  if (typeof value === "string") return CREDENTIAL_VALUE.test(value);
  if (Array.isArray(value)) return value.some((item) => containsCredentialShapedInput(item));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .some(([childKey, child]) => containsCredentialShapedInput(child, childKey));
  }
  return false;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlatformKind(value: unknown): value is PlatformKind {
  return value === "replit" || value === "railway";
}

export function verifySanitizedPlatformBindingAttestation(
  input: unknown,
  context: VerifyPlatformAttestationContext,
): PlatformBindingAttestationReceipt {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return unproved("ATTESTATION_SCHEMA_UNSUPPORTED");
  }
  if (containsCredentialShapedInput(input)) {
    return unproved("ATTESTATION_CREDENTIAL_SHAPED_INPUT", {
      secretNonObservabilityVerdict: "UNPROVED",
    });
  }

  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => !ALLOWED_FIELDS.has(key))) {
    return unproved("ATTESTATION_UNKNOWN_FIELD");
  }
  if (record.schemaVersion !== W09_C2W_SCHEMA_VERSION || !isPlatformKind(record.platformKind)) {
    return unproved("ATTESTATION_SCHEMA_UNSUPPORTED");
  }

  const required = [
    "provenanceKind", "provenanceAuthority", "platformSubjectId", "deploymentId",
    "deploymentStatus", "publicUrl", "bindingRevisionId", "provider",
    "providerProjectId", "branchId", "databaseName", "endpointId", "observedAt",
  ] as const;
  if (required.some((key) => !isNonEmptyString(record[key]))) {
    if (!isNonEmptyString(record.provider)) return unproved("ATTESTATION_PROVIDER_MISSING");
    if (!isNonEmptyString(record.providerProjectId)) return unproved("ATTESTATION_PROJECT_MISSING");
    if (!isNonEmptyString(record.branchId)) return unproved("ATTESTATION_BRANCH_MISSING");
    if (!isNonEmptyString(record.databaseName)) return unproved("ATTESTATION_DATABASE_MISSING");
    if (!isNonEmptyString(record.endpointId)) return unproved("ATTESTATION_ENDPOINT_MISSING");
    if (!isNonEmptyString(record.bindingRevisionId)) return unproved("ATTESTATION_BINDING_UNPROVED");
    return unproved("ATTESTATION_SCHEMA_UNSUPPORTED");
  }

  const provenanceKind = record.provenanceKind as string;
  const provenanceAuthority = record.provenanceAuthority as string;
  if (
    !context.approvedProvenanceKinds.includes(provenanceKind) ||
    !context.approvedProvenanceAuthorities.includes(provenanceAuthority)
  ) {
    return unproved("ATTESTATION_PROVENANCE_UNAPPROVED");
  }
  const provenanceVerdict = "PASS" as const;

  if (record.platformKind !== context.expectedPlatformKind) {
    return unproved("ATTESTATION_PLATFORM_MISMATCH", { provenanceVerdict });
  }
  if (record.platformSubjectId !== context.expectedPlatformSubjectId) {
    return unproved("ATTESTATION_PLATFORM_SUBJECT_MISMATCH", { provenanceVerdict });
  }
  if (record.deploymentId !== context.expectedDeploymentId) {
    return unproved("ATTESTATION_DEPLOYMENT_MISMATCH", { provenanceVerdict });
  }
  if (record.deploymentStatus !== "success") {
    return unproved("ATTESTATION_DEPLOYMENT_NOT_SUCCESS", { provenanceVerdict });
  }

  const observedAtMs = Date.parse(record.observedAt as string);
  const verifierObservedAtMs = Date.parse(context.observedAt);
  if (
    !Number.isFinite(observedAtMs) ||
    !Number.isFinite(verifierObservedAtMs) ||
    context.maxAgeMs < 0 ||
    observedAtMs > verifierObservedAtMs ||
    verifierObservedAtMs - observedAtMs > context.maxAgeMs
  ) {
    return unproved("ATTESTATION_STALE", { provenanceVerdict });
  }
  const freshnessVerdict = "PASS" as const;

  if (record.provider !== context.expectedProvider) {
    return unproved("ATTESTATION_PROVIDER_MISMATCH", { provenanceVerdict, freshnessVerdict });
  }
  if (!isNonEmptyString(record.timelineId) && context.lineageContinuityCertified !== true) {
    return unproved("ATTESTATION_LINEAGE_UNPROVED", { provenanceVerdict, freshnessVerdict });
  }

  const identity: SanitizedPlatformBindingIdentity = {
    schemaVersion: W09_C2W_SCHEMA_VERSION,
    provenanceKind,
    provenanceAuthority,
    platformKind: record.platformKind,
    platformSubjectId: record.platformSubjectId as string,
    deploymentId: record.deploymentId as string,
    deploymentStatus: record.deploymentStatus as string,
    publicUrl: record.publicUrl as string,
    bindingRevisionId: record.bindingRevisionId as string,
    provider: record.provider as string,
    providerProjectId: record.providerProjectId as string,
    branchId: record.branchId as string,
    databaseName: record.databaseName as string,
    ...(isNonEmptyString(record.timelineId) ? { timelineId: record.timelineId } : {}),
    endpointId: record.endpointId as string,
    observedAt: record.observedAt as string,
  };

  return {
    verdict: "PASS",
    code: "ATTESTATION_OK",
    identity,
    freshnessVerdict,
    deploymentBindingVerdict: "PASS",
    secretNonObservabilityVerdict: "PASS",
    provenanceVerdict,
  };
}

/**
 * Converts only an already-sanitized legacy C2N identity into the v2 shape.
 * It performs no discovery and cannot approve provenance.
 */
export function adaptLegacyC2NIdentity(
  legacy: SanitizedBindingIdentity,
): SanitizedPlatformBindingIdentity {
  if (legacy.schemaVersion !== W09_C2N_SCHEMA_VERSION) {
    throw new Error("unsupported legacy attestation schema");
  }
  return {
    schemaVersion: W09_C2W_SCHEMA_VERSION,
    provenanceKind: legacy.provenanceKind,
    provenanceAuthority: legacy.provenanceAuthority,
    platformKind: "replit",
    platformSubjectId: legacy.replId,
    deploymentId: legacy.deploymentId,
    deploymentStatus: legacy.deploymentStatus,
    publicUrl: legacy.publicUrl,
    bindingRevisionId: legacy.bindingRevisionId,
    provider: legacy.provider,
    providerProjectId: legacy.providerProjectId,
    branchId: legacy.branchId,
    databaseName: legacy.databaseName,
    ...(legacy.timelineId ? { timelineId: legacy.timelineId } : {}),
    endpointId: legacy.endpointId,
    observedAt: legacy.observedAt,
  };
}
