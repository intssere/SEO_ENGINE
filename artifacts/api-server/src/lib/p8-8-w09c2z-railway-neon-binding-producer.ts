import {
  W09_C2W_SCHEMA_VERSION,
  type SanitizedPlatformBindingIdentity,
} from "./p8-8-w09c2w-platform-attestation-verifier.js";

export const W09_C2Z_SCHEMA_VERSION = "p8-8-w09c2z-producer-v1" as const;

export type RailwayNeonProducerCode =
  | "PRODUCER_OK" | "PRODUCER_SCHEMA_UNSUPPORTED" | "PRODUCER_UNKNOWN_FIELD"
  | "PRODUCER_CREDENTIAL_SHAPED_INPUT" | "PRODUCER_RAILWAY_IDENTITY_UNPROVED"
  | "PRODUCER_DEPLOYMENT_NOT_SUCCESS" | "PRODUCER_SNAPSHOT_UNPROVED"
  | "PRODUCER_BINDING_UNPROVED" | "PRODUCER_REFERENCE_UNPROVED"
  | "PRODUCER_PROVIDER_MISMATCH" | "PRODUCER_PROVIDER_IDENTITY_UNPROVED"
  | "PRODUCER_LINEAGE_UNPROVED" | "PRODUCER_CROSS_SIDE_MISMATCH";

export interface RailwayNeonProducerContext {
  expectedRailwayProjectId: string; expectedRailwayEnvironmentId: string;
  expectedRailwayServiceId: string; expectedRailwayDeploymentId: string;
  expectedRailwaySnapshotId: string; expectedProvider: "Neon";
}
export interface RailwayNeonProducerReceipt {
  verdict: "PASS" | "UNPROVED"; code: RailwayNeonProducerCode;
  identity?: SanitizedPlatformBindingIdentity;
}

const ALLOWED_FIELDS = new Set([
  "schemaVersion","provenanceKind","provenanceAuthority","railwayProjectId",
  "railwayEnvironmentId","railwayServiceId","railwayDeploymentId",
  "railwayDeploymentStatus","railwaySnapshotId","railwayPublicUrl",
  "railwayBindingRevisionId","structuralReferenceId",
  "structuralReferenceTargetResourceId","provider","providerProjectId","branchId",
  "databaseName","timelineId","endpointId","providerResourceId","observedAt",
]);
const CREDENTIAL_KEY = /(?:database[_-]?url|connection[_-]?string|username|password|token|secret|credentials|environment[_-]?vars?|rendered[_-]?value)/i;
const CREDENTIAL_VALUE = /(?:postgres(?:ql)?:\/\/|mysql:\/\/|mongodb(?:\+srv)?:\/\/|redis:\/\/|(?:password|token|secret)=|bearer\s+[a-z0-9._~+\/-]+)/i;

function contaminated(value: unknown, key?: string): boolean {
  if (key && CREDENTIAL_KEY.test(key)) return true;
  if (typeof value === "string") return CREDENTIAL_VALUE.test(value);
  if (Array.isArray(value)) return value.some((v) => contaminated(v));
  if (value && typeof value === "object")
    return Object.entries(value as Record<string, unknown>).some(([k,v]) => contaminated(v,k));
  return false;
}
function nonEmpty(v: unknown): v is string { return typeof v === "string" && v.trim().length > 0; }
function no(code: RailwayNeonProducerCode): RailwayNeonProducerReceipt { return { verdict:"UNPROVED", code }; }

/** Pure normalization only: no discovery, I/O, or provenance approval. */
export function produceRailwayNeonBindingIdentity(input: unknown, context: RailwayNeonProducerContext): RailwayNeonProducerReceipt {
  if (!input || typeof input !== "object" || Array.isArray(input)) return no("PRODUCER_SCHEMA_UNSUPPORTED");
  if (contaminated(input)) return no("PRODUCER_CREDENTIAL_SHAPED_INPUT");
  const r=input as Record<string,unknown>;
  if (Object.keys(r).some(k=>!ALLOWED_FIELDS.has(k))) return no("PRODUCER_UNKNOWN_FIELD");
  if (r.schemaVersion!==W09_C2Z_SCHEMA_VERSION) return no("PRODUCER_SCHEMA_UNSUPPORTED");
  const railway=["provenanceKind","provenanceAuthority","railwayProjectId","railwayEnvironmentId","railwayServiceId","railwayDeploymentId","railwayPublicUrl","observedAt"] as const;
  if (railway.some(k=>!nonEmpty(r[k]))) return no("PRODUCER_RAILWAY_IDENTITY_UNPROVED");
  if (r.railwayProjectId!==context.expectedRailwayProjectId || r.railwayEnvironmentId!==context.expectedRailwayEnvironmentId || r.railwayServiceId!==context.expectedRailwayServiceId || r.railwayDeploymentId!==context.expectedRailwayDeploymentId) return no("PRODUCER_RAILWAY_IDENTITY_UNPROVED");
  if (r.railwayDeploymentStatus!=="SUCCESS") return no("PRODUCER_DEPLOYMENT_NOT_SUCCESS");
  if (!nonEmpty(r.railwaySnapshotId) || r.railwaySnapshotId!==context.expectedRailwaySnapshotId) return no("PRODUCER_SNAPSHOT_UNPROVED");
  if (!nonEmpty(r.railwayBindingRevisionId)) return no("PRODUCER_BINDING_UNPROVED");
  if (!nonEmpty(r.structuralReferenceId)||!nonEmpty(r.structuralReferenceTargetResourceId)) return no("PRODUCER_REFERENCE_UNPROVED");
  if (r.provider!==context.expectedProvider) return no("PRODUCER_PROVIDER_MISMATCH");
  const provider=["providerProjectId","branchId","databaseName","endpointId","providerResourceId"] as const;
  if (provider.some(k=>!nonEmpty(r[k]))) return no("PRODUCER_PROVIDER_IDENTITY_UNPROVED");
  if (!nonEmpty(r.timelineId)) return no("PRODUCER_LINEAGE_UNPROVED");
  if (r.structuralReferenceTargetResourceId!==r.providerResourceId) return no("PRODUCER_CROSS_SIDE_MISMATCH");
  return { verdict:"PASS", code:"PRODUCER_OK", identity:{
    schemaVersion:W09_C2W_SCHEMA_VERSION, provenanceKind:r.provenanceKind as string,
    provenanceAuthority:r.provenanceAuthority as string, platformKind:"railway",
    platformSubjectId:r.railwayServiceId as string, deploymentId:r.railwayDeploymentId as string,
    deploymentStatus:"success", publicUrl:r.railwayPublicUrl as string,
    bindingRevisionId:r.railwayBindingRevisionId as string, provider:r.provider as string,
    providerProjectId:r.providerProjectId as string, branchId:r.branchId as string,
    databaseName:r.databaseName as string, timelineId:r.timelineId as string,
    endpointId:r.endpointId as string, observedAt:r.observedAt as string,
  }};
}
