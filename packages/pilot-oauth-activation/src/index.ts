export const DIAMOND_SHELF_DOMAIN = "diamondshelf.us";

export interface OAuthActivationEnv {
  appOrigin?: string;
  shopifyClientId?: string;
  shopifyClientSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  credentialEncryptionKey?: string;
  stateSigningSecret?: string;
  publicSiteWritesEnabled?: string;
}

export interface OAuthRegistrationManifest {
  appOrigin: string;
  shopifyRedirectUri: string;
  googleRedirectUri: string;
  shopifyScopes: string[];
  googleScopes: string[];
}

export interface OAuthActivationReadiness {
  status: "blocked" | "ready";
  blockers: string[];
  platformCredentialsConfigured: boolean;
  encryptionConfigured: boolean;
  stateSigningConfigured: boolean;
  readOnlyGateLocked: boolean;
  registrationManifest: OAuthRegistrationManifest | null;
  liveConnectionAuthorized: false;
}

export const SHOPIFY_READ_ONLY_SCOPES = [
  "read_products",
  "read_content",
  "read_online_store_navigation",
] as const;

export const GOOGLE_READ_ONLY_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
] as const;

function nonEmpty(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function normalizeOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !local) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function buildOAuthRegistrationManifest(appOrigin: string): OAuthRegistrationManifest {
  const normalized = normalizeOrigin(appOrigin);
  if (!normalized) throw new Error("A valid HTTPS APP_ORIGIN is required outside localhost.");
  return {
    appOrigin: normalized,
    shopifyRedirectUri: `${normalized}/api/connections/shopify/callback`,
    googleRedirectUri: `${normalized}/api/connections/google/callback`,
    shopifyScopes: [...SHOPIFY_READ_ONLY_SCOPES],
    googleScopes: [...GOOGLE_READ_ONLY_SCOPES],
  };
}

export function assessOAuthActivationReadiness(env: OAuthActivationEnv): OAuthActivationReadiness {
  const blockers: string[] = [];
  const origin = normalizeOrigin(env.appOrigin);
  if (!origin) blockers.push("APP_ORIGIN must be configured as HTTPS outside localhost.");

  const platformCredentialsConfigured = [
    env.shopifyClientId,
    env.shopifyClientSecret,
    env.googleClientId,
    env.googleClientSecret,
  ].every(nonEmpty);
  if (!platformCredentialsConfigured) blockers.push("Shopify and Google OAuth application credentials are required.");

  const encryptionConfigured = nonEmpty(env.credentialEncryptionKey) && (env.credentialEncryptionKey?.trim().length ?? 0) >= 32;
  if (!encryptionConfigured) blockers.push("OAuth credential encryption key must be configured and at least 32 characters.");

  const stateSigningConfigured = nonEmpty(env.stateSigningSecret) || encryptionConfigured;
  if (!stateSigningConfigured) blockers.push("OAuth state signing protection is not configured.");

  const readOnlyGateLocked = env.publicSiteWritesEnabled?.trim().toLowerCase() !== "true";
  if (!readOnlyGateLocked) blockers.push("PUBLIC_SITE_WRITES_ENABLED must remain false during OAuth activation.");

  return {
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers,
    platformCredentialsConfigured,
    encryptionConfigured,
    stateSigningConfigured,
    readOnlyGateLocked,
    registrationManifest: origin ? buildOAuthRegistrationManifest(origin) : null,
    liveConnectionAuthorized: false,
  };
}

export function envFromProcess(env: NodeJS.ProcessEnv = process.env): OAuthActivationEnv {
  return {
    appOrigin: env.APP_ORIGIN,
    shopifyClientId: env.SHOPIFY_OAUTH_CLIENT_ID,
    shopifyClientSecret: env.SHOPIFY_OAUTH_CLIENT_SECRET,
    googleClientId: env.GOOGLE_OAUTH_CLIENT_ID,
    googleClientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    credentialEncryptionKey: env.OAUTH_CREDENTIAL_ENCRYPTION_KEY,
    stateSigningSecret: env.OAUTH_STATE_SIGNING_SECRET,
    publicSiteWritesEnabled: env.PUBLIC_SITE_WRITES_ENABLED,
  };
}
