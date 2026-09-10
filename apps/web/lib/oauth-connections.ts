import { createHmac, timingSafeEqual } from "node:crypto";
import postgres from "postgres";
import {
  decryptTokenBundle,
  encryptTokenBundle,
  sanitizedConnectionMetadata,
  type EncryptedSecretEnvelope,
  type OAuthProvider,
  type OAuthStateRecord,
  type TokenBundle,
} from "@seo-engine/oauth-connection-manager";

export const SHOPIFY_STATE_COOKIE = "seo_oauth_shopify_state";
export const GOOGLE_STATE_COOKIE = "seo_oauth_google_state";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required OAuth runtime configuration: ${name}`);
  return value;
}

export function appOrigin(): string {
  const value = requiredEnv("APP_ORIGIN");
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error("APP_ORIGIN must use HTTPS outside localhost.");
  return url.origin;
}

export function credentialEncryptionKey(): string {
  return requiredEnv("OAUTH_CREDENTIAL_ENCRYPTION_KEY");
}

function stateSigningSecret(): string {
  return process.env.OAUTH_STATE_SIGNING_SECRET?.trim() || credentialEncryptionKey();
}

export function sealOAuthState(record: OAuthStateRecord): string {
  const payload = Buffer.from(JSON.stringify(record), "utf8").toString("base64url");
  const signature = createHmac("sha256", stateSigningSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function openOAuthState(value: string | undefined): OAuthStateRecord {
  if (!value) throw new Error("OAuth state cookie is missing.");
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) throw new Error("OAuth state cookie is malformed.");
  const expected = createHmac("sha256", stateSigningSecret()).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error("OAuth state cookie signature is invalid.");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthStateRecord;
  if (!parsed.state || !parsed.provider || !parsed.expiresAt) throw new Error("OAuth state cookie payload is invalid.");
  return parsed;
}

export function verifyShopifyCallbackHmac(params: URLSearchParams, clientSecret: string): boolean {
  const received = params.get("hmac");
  if (!received || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const message = [...params.entries()]
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const expected = createHmac("sha256", clientSecret).update(message).digest("hex");
  const a = Buffer.from(received, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface StoredConnectionSummary {
  provider: string;
  externalAccountId: string | null;
  status: string;
  scopes: string[];
  metadata: Record<string, unknown>;
  updatedAt: string;
}

function db() {
  const databaseUrl = requiredEnv("DATABASE_URL");
  return postgres(databaseUrl, { max: 1, prepare: false });
}

async function diamondShelfSiteId(sql: ReturnType<typeof postgres>): Promise<string> {
  const rows = await sql<{ id: string }[]>`SELECT id FROM sites WHERE lower(domain) = 'diamondshelf.us' AND is_active = true ORDER BY created_at ASC LIMIT 1`;
  const id = rows[0]?.id;
  if (!id) throw new Error("Diamond Shelf site record is not available in the production database.");
  return id;
}

function serializeEnvelope(bundle: TokenBundle): string {
  const envelope = encryptTokenBundle(bundle, credentialEncryptionKey());
  return `enc:v1:${Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url")}`;
}

function parseEnvelope(secretRef: string): EncryptedSecretEnvelope {
  if (!secretRef.startsWith("enc:v1:")) throw new Error("Unsupported connection secret reference.");
  return JSON.parse(Buffer.from(secretRef.slice("enc:v1:".length), "base64url").toString("utf8")) as EncryptedSecretEnvelope;
}

export async function saveOAuthConnection(input: {
  provider: OAuthProvider;
  externalAccountId: string;
  bundle: TokenBundle;
  metadata?: Record<string, unknown>;
  status?: "pending" | "connected" | "error";
}): Promise<void> {
  const sql = db();
  try {
    const siteId = await diamondShelfSiteId(sql);
    const secretRef = serializeEnvelope(input.bundle);
    const metadata = sanitizedConnectionMetadata(input.provider, input.bundle, input.metadata ?? {});
    const metadataJson = JSON.parse(JSON.stringify(metadata)) as Parameters<typeof sql.json>[0];
    await sql`
      INSERT INTO connections (site_id, provider, external_account_id, secret_ref, scopes, status, metadata)
      VALUES (${siteId}::uuid, ${input.provider}, ${input.externalAccountId}, ${secretRef}, ${input.bundle.scopes}, ${input.status ?? "connected"}, ${sql.json(metadataJson)})
      ON CONFLICT (site_id, provider, external_account_id)
      DO UPDATE SET secret_ref = EXCLUDED.secret_ref, scopes = EXCLUDED.scopes, status = EXCLUDED.status, metadata = EXCLUDED.metadata, updated_at = now()
    `;
  } finally {
    await sql.end({ timeout: 2 });
  }
}

export async function loadOAuthToken(provider: OAuthProvider, externalAccountId: string): Promise<TokenBundle> {
  const sql = db();
  try {
    const siteId = await diamondShelfSiteId(sql);
    const rows = await sql<{ secret_ref: string | null }[]>`
      SELECT secret_ref FROM connections WHERE site_id = ${siteId}::uuid AND provider = ${provider} AND external_account_id = ${externalAccountId} LIMIT 1
    `;
    const secretRef = rows[0]?.secret_ref;
    if (!secretRef) throw new Error("OAuth connection secret is unavailable.");
    return decryptTokenBundle(parseEnvelope(secretRef), credentialEncryptionKey());
  } finally {
    await sql.end({ timeout: 2 });
  }
}

export async function listConnectionSummaries(): Promise<StoredConnectionSummary[]> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return [];
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    const siteRows = await sql<{ id: string }[]>`SELECT id FROM sites WHERE lower(domain) = 'diamondshelf.us' AND is_active = true ORDER BY created_at ASC LIMIT 1`;
    const siteId = siteRows[0]?.id;
    if (!siteId) return [];
    const rows = await sql<{ provider: string; external_account_id: string | null; status: string; scopes: string[]; metadata: Record<string, unknown>; updated_at: string }[]>`
      SELECT provider, external_account_id, status, scopes, metadata, updated_at::text
      FROM connections WHERE site_id = ${siteId}::uuid ORDER BY provider, updated_at DESC
    `;
    return rows.map((row) => ({
      provider: row.provider,
      externalAccountId: row.external_account_id,
      status: row.status,
      scopes: row.scopes,
      metadata: row.metadata,
      updatedAt: row.updated_at,
    }));
  } finally {
    await sql.end({ timeout: 2 });
  }
}

export function shopifyOAuthRuntimeConfig(shopDomain: string) {
  return {
    clientId: requiredEnv("SHOPIFY_OAUTH_CLIENT_ID"),
    clientSecret: requiredEnv("SHOPIFY_OAUTH_CLIENT_SECRET"),
    redirectUri: `${appOrigin()}/api/connections/shopify/callback`,
    shopDomain,
  };
}

export function googleOAuthRuntimeConfig() {
  return {
    clientId: requiredEnv("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: requiredEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
    redirectUri: `${appOrigin()}/api/connections/google/callback`,
  };
}
