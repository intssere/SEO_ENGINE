import { createHash } from "node:crypto";
import {
  assertOAuthState,
  createOAuthState,
  sanitizedConnectionMetadata,
  type GoogleOAuthConfig,
  type OAuthStateRecord,
  type TokenBundle,
} from "./index.js";

export const GSC_READONLY_PROFILE = "gsc_read_only_v1" as const;
export const GSC_READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly" as const;
export const GSC_READONLY_EXTERNAL_ACCOUNT_ID = "google#gsc-read-only-v1" as const;
export const GSC_DISCOVERY_LIMIT = 256;
export const GSC_ACCEPTED_PERMISSION_LEVELS = ["siteRestrictedUser", "siteFullUser"] as const;

export type GscReadonlyState = OAuthStateRecord & { purpose: typeof GSC_READONLY_PROFILE };
export type GscDiscoveredProperty = {
  siteUrl: string;
  permissionLevel: string | null;
  task71Supported: boolean;
  permissionAccepted: boolean;
};
export type GscDiscoveryStatus = {
  ok: boolean;
  category: "ok" | "provider_error" | "network_error" | "invalid_response";
  httpStatus: number | null;
};
export type GscDiscoveryResult = {
  properties: GscDiscoveredProperty[];
  status: GscDiscoveryStatus;
};
export interface GscDiscoveryTransport {
  listSites(): Promise<unknown>;
}
export type GscReadonlyReadinessInput = {
  configured?: boolean;
  credentialReady?: boolean;
  credentialSource?: string | null;
  grantedScopes?: string[];
  discoveredProperties?: GscDiscoveredProperty[];
  selectedProperty?: string | null;
  networkReady?: boolean;
  task70ExecutionEnabled?: boolean;
  liveReadAuthorized?: boolean;
};
export type GscReadonlyReadiness = {
  supported: true;
  profile: typeof GSC_READONLY_PROFILE;
  externalAccountId: typeof GSC_READONLY_EXTERNAL_ACCOUNT_ID;
  requiredScopes: readonly [typeof GSC_READONLY_SCOPE];
  configured: boolean;
  credentialReady: boolean;
  scopeReady: boolean;
  propertyDiscoveryReady: boolean;
  selectedPropertyReady: boolean;
  networkReady: boolean;
  task70ExecutionEnabled: boolean;
  liveReadAuthorized: boolean;
  providerWrites: false;
  publicSiteWrites: false;
  observationPersistenceAuthorized: false;
  evidencePersistenceAuthorized: false;
  schedulerEnabled: false;
  batchExecutorEnabled: false;
  autonomousWorkerEnabled: false;
  retryLoopEnabled: false;
};

const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const ROOT_KEYS = new Set(["siteEntry"]);
const ENTRY_KEYS = new Set(["siteUrl", "permissionLevel"]);

function onlyKeys(record: Record<string, unknown>, allowed: Set<string>, label: string) {
  for (const key of Object.keys(record)) if (!allowed.has(key)) throw new Error(`unexpected_${label}_field:${key}`);
}
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`invalid_${label}`);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw new Error(`invalid_${label}`);
  return value as Record<string, unknown>;
}
function challenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}
function cleanScopeSet(scopes: string[] = []) {
  return [...new Set(scopes.map((scope) => scope.trim()).filter(Boolean))].sort();
}
export function hasExactGscReadonlyScope(scopes: string[] = []): boolean {
  const normalized = cleanScopeSet(scopes);
  return normalized.length === 1 && normalized[0] === GSC_READONLY_SCOPE;
}
export function normalizeTask71GscProperty(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized.startsWith("sc-domain:")) return null;
  const domain = normalized.slice("sc-domain:".length);
  return DOMAIN.test(domain) ? `sc-domain:${domain}` : null;
}
export function isGscPermissionAccepted(value: string | null): boolean {
  return value !== null && (GSC_ACCEPTED_PERMISSION_LEVELS as readonly string[]).includes(value);
}
export function createGscReadonlyState(options: { returnTo?: string; ttlSeconds?: number; now?: Date } = {}): GscReadonlyState {
  return {
    ...createOAuthState("google", {
      returnTo: options.returnTo ?? "/connections?gsc_read_only=1",
      ttlSeconds: options.ttlSeconds,
      now: options.now,
    }),
    purpose: GSC_READONLY_PROFILE,
  };
}
export function assertGscReadonlyState(state: GscReadonlyState, receivedState: string, now = new Date()): void {
  assertOAuthState(state, receivedState, "google", now);
  if (state.purpose !== GSC_READONLY_PROFILE) throw new Error("gsc_oauth_purpose_mismatch");
}
export function buildGscReadonlyAuthorizationUrl(config: GoogleOAuthConfig, state: GscReadonlyState): string {
  if (state.provider !== "google" || state.purpose !== GSC_READONLY_PROFILE || !state.codeVerifier) throw new Error("gsc_oauth_state_required");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId.trim());
  url.searchParams.set("redirect_uri", config.redirectUri.trim());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GSC_READONLY_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "false");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state.state);
  url.searchParams.set("code_challenge", challenge(state.codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}
export function normalizeGscSitesListResponse(value: unknown): GscDiscoveredProperty[] {
  const root = object(value, "gsc_sites_response");
  onlyKeys(root, ROOT_KEYS, "gsc_sites_response");
  if (root.siteEntry === undefined) return [];
  if (!Array.isArray(root.siteEntry) || root.siteEntry.length > GSC_DISCOVERY_LIMIT) throw new Error("invalid_gsc_site_entries");
  const deduped = new Map<string, GscDiscoveredProperty>();
  for (const raw of root.siteEntry) {
    const entry = object(raw, "gsc_site_entry");
    onlyKeys(entry, ENTRY_KEYS, "gsc_site_entry");
    if (typeof entry.siteUrl !== "string") throw new Error("invalid_gsc_site_url");
    const siteUrl = entry.siteUrl.normalize("NFKC").trim();
    if (!siteUrl || siteUrl.length > 2048 || /[\u0000-\u001f\u007f]/.test(siteUrl)) throw new Error("invalid_gsc_site_url");
    const permissionLevel = entry.permissionLevel === undefined || entry.permissionLevel === null
      ? null
      : typeof entry.permissionLevel === "string" && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(entry.permissionLevel.trim())
        ? entry.permissionLevel.trim()
        : (() => { throw new Error("invalid_gsc_permission_level"); })();
    const supported = normalizeTask71GscProperty(siteUrl);
    const normalizedUrl = supported ?? siteUrl;
    deduped.set(`${normalizedUrl}\u0000${permissionLevel ?? ""}`, {
      siteUrl: normalizedUrl,
      permissionLevel,
      task71Supported: supported !== null,
      permissionAccepted: isGscPermissionAccepted(permissionLevel),
    });
  }
  return [...deduped.values()].sort((a, b) => a.siteUrl.localeCompare(b.siteUrl) || (a.permissionLevel ?? "").localeCompare(b.permissionLevel ?? ""));
}
export async function discoverGscProperties(transport: GscDiscoveryTransport): Promise<GscDiscoveryResult> {
  try {
    const payload = await transport.listSites();
    return { properties: normalizeGscSitesListResponse(payload), status: { ok: true, category: "ok", httpStatus: 200 } };
  } catch (error) {
    if (error instanceof GscDiscoveryTransportError) {
      return { properties: [], status: { ok: false, category: error.category, httpStatus: error.httpStatus } };
    }
    return { properties: [], status: { ok: false, category: "invalid_response", httpStatus: null } };
  }
}
export class GscDiscoveryTransportError extends Error {
  constructor(public readonly category: "provider_error" | "network_error", public readonly httpStatus: number | null = null) {
    super(category);
    this.name = "GscDiscoveryTransportError";
  }
}
export function isDiscoveredGscSelection(properties: GscDiscoveredProperty[], selectedProperty: string | null | undefined): boolean {
  if (!selectedProperty) return false;
  const selected = normalizeTask71GscProperty(selectedProperty);
  if (!selected) return false;
  return properties.some((property) => property.siteUrl === selected && property.task71Supported && property.permissionAccepted);
}
export function buildGscReadonlyConnectionMetadata(bundle: TokenBundle, properties: GscDiscoveredProperty[], selectedProperty: string | null = null) {
  return sanitizedConnectionMetadata("google", bundle, {
    connectionMode: "oauth",
    oauthPurpose: GSC_READONLY_PROFILE,
    externalAccountId: GSC_READONLY_EXTERNAL_ACCOUNT_ID,
    readOnly: true,
    requiredScope: GSC_READONLY_SCOPE,
    discoveredSearchConsoleProperties: properties,
    selectedSearchConsoleProperty: isDiscoveredGscSelection(properties, selectedProperty) ? normalizeTask71GscProperty(selectedProperty!) : null,
  });
}
export function assessGscReadonlyReadiness(input: GscReadonlyReadinessInput = {}): GscReadonlyReadiness {
  const scopes = input.grantedScopes ?? [];
  const properties = input.discoveredProperties ?? [];
  const providerCredential = input.credentialSource === "provider_oauth";
  const credentialReady = input.credentialReady === true && providerCredential;
  const scopeReady = hasExactGscReadonlyScope(scopes);
  const propertyDiscoveryReady = properties.some((property) => property.task71Supported && property.permissionAccepted);
  const selectedPropertyReady = scopeReady && propertyDiscoveryReady && isDiscoveredGscSelection(properties, input.selectedProperty);
  return {
    supported: true,
    profile: GSC_READONLY_PROFILE,
    externalAccountId: GSC_READONLY_EXTERNAL_ACCOUNT_ID,
    requiredScopes: [GSC_READONLY_SCOPE],
    configured: input.configured === true,
    credentialReady,
    scopeReady,
    propertyDiscoveryReady,
    selectedPropertyReady,
    networkReady: input.networkReady === true,
    task70ExecutionEnabled: input.task70ExecutionEnabled === true,
    liveReadAuthorized: input.liveReadAuthorized === true,
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
