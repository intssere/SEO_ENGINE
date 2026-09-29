import { createHash } from "node:crypto";

export const W09_C3C_MANIFEST_SCHEMA_VERSION = "p8-8-w09c3c-v1" as const;
export const W09_C3C_EXPECTED_RAILWAY_PROJECT_ID = "52265e29-921b-4652-ac0d-9da4e5e69936" as const;
export const W09_C3C_EXPECTED_RAILWAY_ENVIRONMENT_ID = "7f8d920f-f6c6-44f0-b9fe-252cb4f32298" as const;
export const W09_C3C_EXPECTED_RAILWAY_SERVICE_ID = "1e8c1e7d-16f7-4c63-8193-1021bcbe6d90" as const;

export type C3CCode =
  | "MANIFEST_OK" | "MANIFEST_SCHEMA_UNSUPPORTED" | "MANIFEST_UNKNOWN_FIELD"
  | "MANIFEST_CREDENTIAL_SHAPED_INPUT" | "MANIFEST_RAILWAY_TARGET_MISMATCH"
  | "MANIFEST_PROVIDER_MISMATCH" | "MANIFEST_PROVIDER_IDENTITY_UNPROVED"
  | "MANIFEST_LINEAGE_UNPROVED" | "MANIFEST_ID_MISMATCH";

export interface C3CBindingManifest {
  schemaVersion: typeof W09_C3C_MANIFEST_SCHEMA_VERSION;
  railwayProjectId: string;
  railwayEnvironmentId: string;
  railwayServiceId: string;
  provider: "Neon";
  providerProjectId: string;
  branchId: string;
  databaseName: string;
  endpointId: string;
  timelineId: string;
  providerResourceId: string;
  manifestId: string;
}

export interface C3CManifestReceipt {
  verdict: "PASS" | "UNPROVED";
  code: C3CCode;
  manifest?: C3CBindingManifest;
}

const ALLOWED_FIELDS = new Set([
  "schemaVersion","railwayProjectId","railwayEnvironmentId","railwayServiceId",
  "provider","providerProjectId","branchId","databaseName","endpointId","timelineId",
  "providerResourceId","manifestId",
]);

const CREDENTIAL_KEY = /(?:database[_-]?url|connection[_-]?string|username|password|token|secret|credentials|hostname|host|rendered[_-]?value|environment[_-]?vars?)/i;
const CREDENTIAL_VALUE = /(?:[a-z][a-z0-9+.-]*:\/\/|(?:password|token|secret)=|bearer\s+[a-z0-9._~+\/-]+|(?:^|\.)[a-z0-9-]+\.(?:com|net|org|io|app)(?::\d+)?$)/i;

function contaminated(value: unknown, key?: string): boolean {
  if (key && CREDENTIAL_KEY.test(key)) return true;
  if (typeof value === "string") return CREDENTIAL_VALUE.test(value);
  if (Array.isArray(value)) return value.some((item) => contaminated(item));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .some(([childKey, child]) => contaminated(child, childKey));
  }
  return false;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function no(code: C3CCode): C3CManifestReceipt {
  return { verdict: "UNPROVED", code };
}

function canonicalFields(input: Omit<C3CBindingManifest, "manifestId">): string {
  return [
    input.schemaVersion,
    input.railwayProjectId,
    input.railwayEnvironmentId,
    input.railwayServiceId,
    input.provider,
    input.providerProjectId,
    input.branchId,
    input.databaseName,
    input.endpointId,
    input.timelineId,
    input.providerResourceId,
  ].map((value) => JSON.stringify(value)).join("\n");
}

/**
 * Deterministic identifier for reviewed non-secret desired state only.
 * It is not credential-derived and is not evidence that DATABASE_URL resolves
 * to the declared provider resource.
 */
export function deriveC3CManifestId(input: Omit<C3CBindingManifest, "manifestId">): string {
  return `c3c-${createHash("sha256").update(canonicalFields(input), "utf8").digest("hex")}`;
}

export function buildC3CBindingManifest(
  input: Omit<C3CBindingManifest, "schemaVersion" | "manifestId">,
): C3CManifestReceipt {
  const candidate = { schemaVersion: W09_C3C_MANIFEST_SCHEMA_VERSION, ...input };
  if (contaminated(candidate)) return no("MANIFEST_CREDENTIAL_SHAPED_INPUT");
  if (
    input.railwayProjectId !== W09_C3C_EXPECTED_RAILWAY_PROJECT_ID ||
    input.railwayEnvironmentId !== W09_C3C_EXPECTED_RAILWAY_ENVIRONMENT_ID ||
    input.railwayServiceId !== W09_C3C_EXPECTED_RAILWAY_SERVICE_ID
  ) return no("MANIFEST_RAILWAY_TARGET_MISMATCH");
  if (input.provider !== "Neon") return no("MANIFEST_PROVIDER_MISMATCH");
  if ([input.providerProjectId,input.branchId,input.databaseName,input.endpointId,input.providerResourceId]
    .some((value) => !nonEmpty(value))) return no("MANIFEST_PROVIDER_IDENTITY_UNPROVED");
  if (!nonEmpty(input.timelineId)) return no("MANIFEST_LINEAGE_UNPROVED");

  const base: Omit<C3CBindingManifest, "manifestId"> = candidate;
  const manifest: C3CBindingManifest = { ...base, manifestId: deriveC3CManifestId(base) };
  return { verdict: "PASS", code: "MANIFEST_OK", manifest };
}

export function verifyC3CBindingManifest(input: unknown): C3CManifestReceipt {
  if (!input || typeof input !== "object" || Array.isArray(input)) return no("MANIFEST_SCHEMA_UNSUPPORTED");
  if (contaminated(input)) return no("MANIFEST_CREDENTIAL_SHAPED_INPUT");
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => !ALLOWED_FIELDS.has(key))) return no("MANIFEST_UNKNOWN_FIELD");
  if (record.schemaVersion !== W09_C3C_MANIFEST_SCHEMA_VERSION) return no("MANIFEST_SCHEMA_UNSUPPORTED");
  if (
    record.railwayProjectId !== W09_C3C_EXPECTED_RAILWAY_PROJECT_ID ||
    record.railwayEnvironmentId !== W09_C3C_EXPECTED_RAILWAY_ENVIRONMENT_ID ||
    record.railwayServiceId !== W09_C3C_EXPECTED_RAILWAY_SERVICE_ID
  ) return no("MANIFEST_RAILWAY_TARGET_MISMATCH");
  if (record.provider !== "Neon") return no("MANIFEST_PROVIDER_MISMATCH");

  const providerKeys = ["providerProjectId","branchId","databaseName","endpointId","providerResourceId"] as const;
  if (providerKeys.some((key) => !nonEmpty(record[key]))) return no("MANIFEST_PROVIDER_IDENTITY_UNPROVED");
  if (!nonEmpty(record.timelineId)) return no("MANIFEST_LINEAGE_UNPROVED");
  if (!nonEmpty(record.manifestId)) return no("MANIFEST_ID_MISMATCH");

  const base: Omit<C3CBindingManifest, "manifestId"> = {
    schemaVersion: W09_C3C_MANIFEST_SCHEMA_VERSION,
    railwayProjectId: record.railwayProjectId as string,
    railwayEnvironmentId: record.railwayEnvironmentId as string,
    railwayServiceId: record.railwayServiceId as string,
    provider: "Neon",
    providerProjectId: record.providerProjectId as string,
    branchId: record.branchId as string,
    databaseName: record.databaseName as string,
    endpointId: record.endpointId as string,
    timelineId: record.timelineId as string,
    providerResourceId: record.providerResourceId as string,
  };
  if (record.manifestId !== deriveC3CManifestId(base)) return no("MANIFEST_ID_MISMATCH");
  return { verdict: "PASS", code: "MANIFEST_OK", manifest: { ...base, manifestId: record.manifestId as string } };
}
