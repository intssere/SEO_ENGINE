import { createHash } from "node:crypto";
import {
  GSC_ACCEPTED_PERMISSION_LEVELS,
  GSC_READONLY_EXTERNAL_ACCOUNT_ID,
  GSC_READONLY_PROFILE,
  GSC_READONLY_SCOPE,
  hasExactGscReadonlyScope,
  isGscPermissionAccepted,
  normalizeTask71GscProperty,
  type GscReadonlyReadiness,
} from "./gsc-readonly.js";

export const GSC_FIRST_LIVE_READ_PURPOSE = "gsc_search_analytics_first_pilot" as const;
export const GSC_PILOT_PACKET_VERSION = "task73-gsc-first-live-read-pilot-v1" as const;
export const GSC_PILOT_MAX_TTL_SECONDS = 30 * 60;
export const GSC_PILOT_RECOMMENDED_DATE_DAYS = 7;
export const GSC_PILOT_MAX_DATE_DAYS = 31;
export const GSC_PILOT_MAX_ROW_LIMIT = 5_000;
export const GSC_PILOT_MAX_PAGES = 2;

export type GscPilotEnvironment = "test" | "production";
export type GscConsentMode = "testing" | "production";
export type GscPilotDimension = "query" | "page";

export type GscPilotOAuthDescriptor = {
  googleProjectId: string;
  oauthClientId: string;
  redirectUri: string;
  allowedRedirectUris: string[];
  consentMode: GscConsentMode;
};

export type GscPilotLineage = {
  task67RefreshPlanFingerprint: string;
  task68AdapterRequestFingerprint: string;
  task69JobId: string;
  task69JobFingerprint: string;
};

export type GscPilotPacketInput = {
  environment: GscPilotEnvironment;
  oauth: GscPilotOAuthDescriptor;
  profile?: string;
  externalAccountId?: string;
  scopes: string[];
  selectedProperty: string;
  permissionLevel: string;
  lineage: GscPilotLineage;
  dimensions?: GscPilotDimension[];
  dateRangeDays?: number;
  rowLimit?: number;
  maxPages?: number;
  issuedAt: string;
  expiresAt: string;
};

export type GscPilotPacket = {
  version: typeof GSC_PILOT_PACKET_VERSION;
  purpose: typeof GSC_FIRST_LIVE_READ_PURPOSE;
  environment: GscPilotEnvironment;
  oauth: {
    googleProjectId: string;
    oauthClientId: string;
    redirectUri: string;
    consentMode: GscConsentMode;
  };
  provider: {
    profile: typeof GSC_READONLY_PROFILE;
    externalAccountId: typeof GSC_READONLY_EXTERNAL_ACCOUNT_ID;
    scopes: readonly [typeof GSC_READONLY_SCOPE];
    selectedProperty: string;
    permissionLevel: string;
    acceptedPermissionLevels: readonly string[];
  };
  lineage: GscPilotLineage;
  queryPolicy: {
    dateRangeDays: number;
    dimensions: readonly GscPilotDimension[];
    rowLimit: number;
    maxPages: number;
    retriesAllowed: false;
    providerWriteAllowed: false;
    dimensionalResultSemantics: "partial";
  };
  issuedAt: string;
  expiresAt: string;
  fingerprint: string;
};

export type GscPilotReadinessInput = {
  task72: GscReadonlyReadiness;
  packet?: GscPilotPacket | null;
  freshTask67Lineage?: boolean;
  freshTask68Lineage?: boolean;
  freshTask69Lineage?: boolean;
  exactTask69AuthorizationPresent?: boolean;
  exactFirstLiveReadAuthorizationPresent?: boolean;
  task70ExecutionGateReady?: boolean;
  conflictingWriteOrAutonomyGateOpen?: boolean;
};

export type GscPilotReadiness = {
  supported: true;
  packetPresent: boolean;
  packetValid: boolean;
  task72Configured: boolean;
  credentialReady: boolean;
  scopeReady: boolean;
  propertyDiscoveryReady: boolean;
  selectedPropertyReady: boolean;
  networkReady: boolean;
  task67LineageReady: boolean;
  task68LineageReady: boolean;
  task69LineageReady: boolean;
  exactTask69AuthorizationPresent: boolean;
  task70ExecutionGateReady: boolean;
  exactFirstLiveReadAuthorizationPresent: boolean;
  conflictingWriteOrAutonomyGateOpen: boolean;
  livePilotReady: boolean;
  providerWrites: false;
  publicSiteWrites: false;
  observationPersistenceAuthorized: false;
  evidencePersistenceAuthorized: false;
  schedulerEnabled: false;
  batchExecutorEnabled: false;
  autonomousWorkerEnabled: false;
  retryLoopEnabled: false;
};

export const GSC_PILOT_PROVIDER_INTERACTION_PLAN = [
  "oauth_client_config_binding",
  "google_oauth_consent",
  "gsc_sites_list_discovery",
  "gsc_property_selection_binding",
  "task70_gate_deployment",
  "task69_exact_job_authorization",
  "gsc_first_search_analytics_read",
  "observation_evidence_persistence",
] as const;

function assertBoundedText(value: string, label: string, max = 512): string {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) throw new Error(`invalid_${label}`);
  return normalized;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function assertTimestampRange(issuedAt: string, expiresAt: string): void {
  const issued = Date.parse(issuedAt);
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || expires <= issued) throw new Error("invalid_pilot_time_range");
  if ((expires - issued) / 1000 > GSC_PILOT_MAX_TTL_SECONDS) throw new Error("pilot_ttl_exceeds_limit");
}

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
}

function assertRedirectContract(environment: GscPilotEnvironment, descriptor: GscPilotOAuthDescriptor): string {
  const redirectUri = assertBoundedText(descriptor.redirectUri, "redirect_uri", 2048);
  const allowed = descriptor.allowedRedirectUris.map((value) => assertBoundedText(value, "allowed_redirect_uri", 2048));
  if (!allowed.includes(redirectUri)) throw new Error("redirect_uri_not_allowlisted");
  let parsed: URL;
  try { parsed = new URL(redirectUri); } catch { throw new Error("invalid_redirect_uri"); }
  if (environment === "production") {
    if (parsed.protocol !== "https:") throw new Error("production_redirect_requires_https");
    if (isLocalHost(parsed.hostname)) throw new Error("production_redirect_cannot_be_localhost");
    if (descriptor.consentMode !== "production") throw new Error("production_requires_production_consent_mode");
  }
  return redirectUri;
}

function normalizeDimensions(dimensions: GscPilotDimension[] | undefined): GscPilotDimension[] {
  const values = dimensions ?? ["query"];
  if (!values.length || values.length > 2) throw new Error("invalid_pilot_dimensions");
  const deduped = [...new Set(values)];
  if (deduped.some((value) => value !== "query" && value !== "page")) throw new Error("invalid_pilot_dimensions");
  if (!deduped.includes("query")) throw new Error("pilot_query_dimension_required");
  return deduped.sort();
}

function assertLineage(lineage: GscPilotLineage): GscPilotLineage {
  return {
    task67RefreshPlanFingerprint: assertBoundedText(lineage.task67RefreshPlanFingerprint, "task67_refresh_plan_fingerprint", 256),
    task68AdapterRequestFingerprint: assertBoundedText(lineage.task68AdapterRequestFingerprint, "task68_adapter_request_fingerprint", 256),
    task69JobId: assertBoundedText(lineage.task69JobId, "task69_job_id", 256),
    task69JobFingerprint: assertBoundedText(lineage.task69JobFingerprint, "task69_job_fingerprint", 256),
  };
}

export function buildGscPilotPacket(input: GscPilotPacketInput): GscPilotPacket {
  if ((input.profile ?? GSC_READONLY_PROFILE) !== GSC_READONLY_PROFILE) throw new Error("gsc_profile_mismatch");
  if ((input.externalAccountId ?? GSC_READONLY_EXTERNAL_ACCOUNT_ID) !== GSC_READONLY_EXTERNAL_ACCOUNT_ID) throw new Error("gsc_external_account_mismatch");
  if (!hasExactGscReadonlyScope(input.scopes)) throw new Error("gsc_scope_mismatch");
  const selectedProperty = normalizeTask71GscProperty(input.selectedProperty);
  if (!selectedProperty) throw new Error("unsupported_gsc_property");
  if (!isGscPermissionAccepted(input.permissionLevel)) throw new Error("gsc_permission_not_accepted");

  const redirectUri = assertRedirectContract(input.environment, input.oauth);
  const googleProjectId = assertBoundedText(input.oauth.googleProjectId, "google_project_id", 256);
  const oauthClientId = assertBoundedText(input.oauth.oauthClientId, "oauth_client_id", 512);
  if (oauthClientId.toLowerCase().includes("secret")) throw new Error("oauth_client_id_looks_like_secret");
  assertTimestampRange(input.issuedAt, input.expiresAt);

  const queryPolicy = {
    dateRangeDays: input.dateRangeDays ?? GSC_PILOT_RECOMMENDED_DATE_DAYS,
    dimensions: normalizeDimensions(input.dimensions),
    rowLimit: input.rowLimit ?? GSC_PILOT_MAX_ROW_LIMIT,
    maxPages: input.maxPages ?? GSC_PILOT_MAX_PAGES,
    retriesAllowed: false as const,
    providerWriteAllowed: false as const,
    dimensionalResultSemantics: "partial" as const,
  };
  if (!Number.isInteger(queryPolicy.dateRangeDays) || queryPolicy.dateRangeDays < 1 || queryPolicy.dateRangeDays > GSC_PILOT_MAX_DATE_DAYS) throw new Error("invalid_pilot_date_range");
  if (!Number.isInteger(queryPolicy.rowLimit) || queryPolicy.rowLimit < 1 || queryPolicy.rowLimit > GSC_PILOT_MAX_ROW_LIMIT) throw new Error("invalid_pilot_row_limit");
  if (!Number.isInteger(queryPolicy.maxPages) || queryPolicy.maxPages < 1 || queryPolicy.maxPages > GSC_PILOT_MAX_PAGES) throw new Error("invalid_pilot_page_limit");

  const packetWithoutFingerprint = {
    version: GSC_PILOT_PACKET_VERSION,
    purpose: GSC_FIRST_LIVE_READ_PURPOSE,
    environment: input.environment,
    oauth: { googleProjectId, oauthClientId, redirectUri, consentMode: input.oauth.consentMode },
    provider: {
      profile: GSC_READONLY_PROFILE,
      externalAccountId: GSC_READONLY_EXTERNAL_ACCOUNT_ID,
      scopes: [GSC_READONLY_SCOPE] as const,
      selectedProperty,
      permissionLevel: input.permissionLevel,
      acceptedPermissionLevels: [...GSC_ACCEPTED_PERMISSION_LEVELS] as readonly string[],
    },
    lineage: assertLineage(input.lineage),
    queryPolicy,
    issuedAt: new Date(input.issuedAt).toISOString(),
    expiresAt: new Date(input.expiresAt).toISOString(),
  };
  return { ...packetWithoutFingerprint, fingerprint: sha256(packetWithoutFingerprint) };
}

export function isGscPilotPacketValid(packet: GscPilotPacket, now = new Date()): boolean {
  try {
    if (packet.version !== GSC_PILOT_PACKET_VERSION || packet.purpose !== GSC_FIRST_LIVE_READ_PURPOSE) return false;
    if (packet.provider.profile !== GSC_READONLY_PROFILE || packet.provider.externalAccountId !== GSC_READONLY_EXTERNAL_ACCOUNT_ID) return false;
    if (!hasExactGscReadonlyScope([...packet.provider.scopes])) return false;
    if (!normalizeTask71GscProperty(packet.provider.selectedProperty) || !isGscPermissionAccepted(packet.provider.permissionLevel)) return false;
    if (Date.parse(packet.expiresAt) <= now.getTime()) return false;
    const { fingerprint, ...rest } = packet;
    return /^[a-f0-9]{64}$/.test(fingerprint) && sha256(rest) === fingerprint;
  } catch {
    return false;
  }
}

export function assessGscPilotReadiness(input: GscPilotReadinessInput): GscPilotReadiness {
  const packetPresent = Boolean(input.packet);
  const packetValid = input.packet ? isGscPilotPacketValid(input.packet) : false;
  const task67LineageReady = input.freshTask67Lineage === true;
  const task68LineageReady = input.freshTask68Lineage === true;
  const task69LineageReady = input.freshTask69Lineage === true;
  const exactTask69AuthorizationPresent = input.exactTask69AuthorizationPresent === true;
  const task70ExecutionGateReady = input.task70ExecutionGateReady === true;
  const exactFirstLiveReadAuthorizationPresent = input.exactFirstLiveReadAuthorizationPresent === true;
  const conflictingWriteOrAutonomyGateOpen = input.conflictingWriteOrAutonomyGateOpen === true;
  const livePilotReady = packetValid
    && input.task72.configured
    && input.task72.credentialReady
    && input.task72.scopeReady
    && input.task72.propertyDiscoveryReady
    && input.task72.selectedPropertyReady
    && input.task72.networkReady
    && task67LineageReady
    && task68LineageReady
    && task69LineageReady
    && exactTask69AuthorizationPresent
    && task70ExecutionGateReady
    && exactFirstLiveReadAuthorizationPresent
    && !conflictingWriteOrAutonomyGateOpen;

  return {
    supported: true,
    packetPresent,
    packetValid,
    task72Configured: input.task72.configured,
    credentialReady: input.task72.credentialReady,
    scopeReady: input.task72.scopeReady,
    propertyDiscoveryReady: input.task72.propertyDiscoveryReady,
    selectedPropertyReady: input.task72.selectedPropertyReady,
    networkReady: input.task72.networkReady,
    task67LineageReady,
    task68LineageReady,
    task69LineageReady,
    exactTask69AuthorizationPresent,
    task70ExecutionGateReady,
    exactFirstLiveReadAuthorizationPresent,
    conflictingWriteOrAutonomyGateOpen,
    livePilotReady,
    providerWrites: false,
    publicSiteWrites: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    schedulerEnabled: false,
    batchExecutorEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
  };
}
