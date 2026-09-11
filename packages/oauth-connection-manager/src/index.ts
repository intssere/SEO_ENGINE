import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

export const SHOPIFY_READ_SCOPES = [
  "read_products",
  "read_content",
  "read_online_store_navigation",
] as const;
export const GOOGLE_READ_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
] as const;

export type OAuthProvider = "shopify" | "google";

export interface OAuthStateRecord {
  provider: OAuthProvider;
  state: string;
  codeVerifier: string | null;
  createdAt: string;
  expiresAt: string;
  returnTo: string;
  shopDomain: string | null;
}

export interface ShopifyOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  shopDomain: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenBundle {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string[];
  tokenType: string | null;
}

export interface EncryptedSecretEnvelope {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface DiscoveredGoogleResources {
  searchConsoleProperties: Array<{ siteUrl: string; permissionLevel: string | null }>;
  ga4Properties: Array<{ propertyId: string; displayName: string | null; account: string | null }>;
  searchConsoleStatus: GoogleDiscoveryStatus;
  ga4Status: GoogleDiscoveryStatus;
}

export interface GoogleDiscoveryStatus {
  ok: boolean;
  httpStatus: number | null;
  category: "ok" | "provider_error" | "network_error" | "invalid_response";
}

function clean(value: string): string {
  return value.trim();
}

function base64Url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

function validShopDomain(shopDomain: string): string {
  const value = clean(shopDomain).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(value)) throw new Error("A permanent *.myshopify.com domain is required.");
  return value;
}

export function createOAuthState(provider: OAuthProvider, options: { returnTo?: string; shopDomain?: string; ttlSeconds?: number; now?: Date } = {}): OAuthStateRecord {
  const now = options.now ?? new Date();
  const ttlSeconds = options.ttlSeconds ?? 600;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 1800) throw new Error("OAuth state TTL must be 60-1800 seconds.");
  const shopDomain = provider === "shopify" ? validShopDomain(options.shopDomain ?? "") : null;
  const verifier = provider === "google" ? base64Url(randomBytes(32)) : null;
  return {
    provider,
    state: base64Url(randomBytes(32)),
    codeVerifier: verifier,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
    returnTo: clean(options.returnTo ?? "/connections"),
    shopDomain,
  };
}

export function assertOAuthState(record: OAuthStateRecord, receivedState: string, provider: OAuthProvider, now: Date = new Date()): void {
  if (record.provider !== provider) throw new Error("OAuth provider mismatch.");
  if (!receivedState || receivedState !== record.state) throw new Error("OAuth state mismatch.");
  if (!Number.isFinite(Date.parse(record.expiresAt)) || now.getTime() >= Date.parse(record.expiresAt)) throw new Error("OAuth state expired.");
}

export function buildShopifyAuthorizationUrl(config: ShopifyOAuthConfig, state: OAuthStateRecord): string {
  if (state.provider !== "shopify" || !state.shopDomain) throw new Error("Shopify OAuth state is required.");
  const shopDomain = validShopDomain(config.shopDomain);
  if (shopDomain !== state.shopDomain) throw new Error("Shopify domain does not match OAuth state.");
  const url = new URL(`https://${shopDomain}/admin/oauth/authorize`);
  url.searchParams.set("client_id", clean(config.clientId));
  url.searchParams.set("scope", SHOPIFY_READ_SCOPES.join(","));
  url.searchParams.set("redirect_uri", clean(config.redirectUri));
  url.searchParams.set("state", state.state);
  return url.toString();
}

export function buildGoogleAuthorizationUrl(config: GoogleOAuthConfig, state: OAuthStateRecord): string {
  if (state.provider !== "google" || !state.codeVerifier) throw new Error("Google OAuth state with PKCE is required.");
  const challenge = base64Url(createHash("sha256").update(state.codeVerifier).digest());
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clean(config.clientId));
  url.searchParams.set("redirect_uri", clean(config.redirectUri));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_READ_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state.state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeShopifyCode(config: ShopifyOAuthConfig, code: string, fetchImpl: typeof fetch = fetch): Promise<TokenBundle> {
  const shopDomain = validShopDomain(config.shopDomain);
  const response = await fetchImpl(`https://${shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clean(config.clientId), client_secret: clean(config.clientSecret), code: clean(code) }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Shopify OAuth token exchange failed with HTTP ${response.status}.`);
  const payload = await response.json() as { access_token?: string; scope?: string };
  if (!payload.access_token) throw new Error("Shopify OAuth response did not contain an access token.");
  return {
    accessToken: payload.access_token,
    refreshToken: null,
    expiresAt: null,
    scopes: (payload.scope ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    tokenType: null,
  };
}

export async function exchangeGoogleCode(config: GoogleOAuthConfig, code: string, state: OAuthStateRecord, fetchImpl: typeof fetch = fetch, now: Date = new Date()): Promise<TokenBundle> {
  if (state.provider !== "google" || !state.codeVerifier) throw new Error("Google OAuth state with PKCE is required.");
  const body = new URLSearchParams({
    client_id: clean(config.clientId),
    client_secret: clean(config.clientSecret),
    code: clean(code),
    code_verifier: state.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: clean(config.redirectUri),
  });
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Google OAuth token exchange failed with HTTP ${response.status}.`);
  const payload = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string };
  if (!payload.access_token) throw new Error("Google OAuth response did not contain an access token.");
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token?.trim() || null,
    expiresAt: Number.isFinite(payload.expires_in) ? new Date(now.getTime() + Number(payload.expires_in) * 1000).toISOString() : null,
    scopes: (payload.scope ?? "").split(/\s+/).filter(Boolean),
    tokenType: payload.token_type?.trim() || null,
  };
}

export async function refreshGoogleAccessToken(config: GoogleOAuthConfig, refreshToken: string, fetchImpl: typeof fetch = fetch, now: Date = new Date()): Promise<TokenBundle> {
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: clean(config.clientId), client_secret: clean(config.clientSecret), refresh_token: clean(refreshToken), grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Google OAuth refresh failed with HTTP ${response.status}.`);
  const payload = await response.json() as { access_token?: string; expires_in?: number; scope?: string; token_type?: string };
  if (!payload.access_token) throw new Error("Google OAuth refresh response did not contain an access token.");
  return {
    accessToken: payload.access_token,
    refreshToken: clean(refreshToken),
    expiresAt: Number.isFinite(payload.expires_in) ? new Date(now.getTime() + Number(payload.expires_in) * 1000).toISOString() : null,
    scopes: (payload.scope ?? "").split(/\s+/).filter(Boolean),
    tokenType: payload.token_type?.trim() || null,
  };
}

export async function discoverGoogleResources(accessToken: string, fetchImpl: typeof fetch = fetch): Promise<DiscoveredGoogleResources> {
  const headers = { Authorization: `Bearer ${clean(accessToken)}`, Accept: "application/json" };
  const discover = async <T>(url: string): Promise<{ payload: T | null; status: GoogleDiscoveryStatus }> => {
    try {
      const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(15_000) });
      if (!response.ok) return { payload: null, status: { ok: false, httpStatus: response.status, category: "provider_error" } };
      try {
        return { payload: await response.json() as T, status: { ok: true, httpStatus: response.status, category: "ok" } };
      } catch {
        return { payload: null, status: { ok: false, httpStatus: response.status, category: "invalid_response" } };
      }
    } catch {
      return { payload: null, status: { ok: false, httpStatus: null, category: "network_error" } };
    }
  };
  const [gscResult, ga4Result] = await Promise.all([
    discover<{ siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }> }>("https://www.googleapis.com/webmasters/v3/sites"),
    discover<{ accountSummaries?: Array<{ account?: string; propertySummaries?: Array<{ property?: string; displayName?: string }> }> }>("https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200"),
  ]);
  const gsc = gscResult.payload ?? {};
  const ga4 = ga4Result.payload ?? {};
  return {
    searchConsoleProperties: (gsc.siteEntry ?? []).flatMap((entry) => entry.siteUrl ? [{ siteUrl: entry.siteUrl, permissionLevel: entry.permissionLevel?.trim() || null }] : []),
    ga4Properties: (ga4.accountSummaries ?? []).flatMap((account) => (account.propertySummaries ?? []).flatMap((property) => {
      const match = property.property?.match(/^properties\/(\d+)$/);
      return match ? [{ propertyId: match[1]!, displayName: property.displayName?.trim() || null, account: account.account?.trim() || null }] : [];
    })),
    searchConsoleStatus: gscResult.status,
    ga4Status: ga4Result.status,
  };
}

export function autoMatchDiamondShelf(resources: DiscoveredGoogleResources): { gscSiteUrl: string | null; ga4PropertyId: string | null; needsConfirmation: boolean } {
  const gscMatches = resources.searchConsoleProperties.filter((entry) => entry.siteUrl.replace(/\/$/, "").toLowerCase() === "https://diamondshelf.us");
  const ga4Matches = resources.ga4Properties.filter((entry) => /diamond\s*shelf/i.test(entry.displayName ?? ""));
  return {
    gscSiteUrl: gscMatches.length === 1 ? gscMatches[0]!.siteUrl : null,
    ga4PropertyId: ga4Matches.length === 1 ? ga4Matches[0]!.propertyId : null,
    needsConfirmation: gscMatches.length !== 1 || ga4Matches.length !== 1,
  };
}

function credentialEncryptionKey(secret: string): Buffer {
  const value = clean(secret);
  if (value.length < 32) throw new Error("Credential encryption key must be at least 32 characters.");
  const decoded = Buffer.from(value, "base64");
  return decoded.length === 32 ? decoded : createHash("sha256").update(value, "utf8").digest();
}

export function encryptTokenBundle(bundle: TokenBundle, base64Key: string): EncryptedSecretEnvelope {
  const key = credentialEncryptionKey(base64Key);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(bundle), "utf8"), cipher.final()]);
  return { version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
}

export function decryptTokenBundle(envelope: EncryptedSecretEnvelope, base64Key: string): TokenBundle {
  if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") throw new Error("Unsupported credential envelope.");
  const key = credentialEncryptionKey(base64Key);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]).toString("utf8")) as TokenBundle;
}

export function sanitizedConnectionMetadata(provider: OAuthProvider, bundle: TokenBundle, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { provider, scopes: [...bundle.scopes], expiresAt: bundle.expiresAt, tokenType: bundle.tokenType, hasRefreshToken: Boolean(bundle.refreshToken), ...extra };
}
