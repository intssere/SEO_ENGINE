import { createHmac, timingSafeEqual } from "node:crypto";
import postgres from "postgres";
import { createOAuthState, buildGoogleAuthorizationUrl, buildShopifyAuthorizationUrl, assertOAuthState, exchangeGoogleCode, exchangeShopifyCode, discoverGoogleResources, autoMatchDiamondShelf, encryptTokenBundle, sanitizedConnectionMetadata, type OAuthStateRecord, type OAuthProvider } from "@seo-engine/oauth-connection-manager";

export const GOOGLE_STATE_COOKIE = "seo_oauth_google_state";
export const SHOPIFY_STATE_COOKIE = "seo_oauth_shopify_state";
const required = (name: string) => { const v = process.env[name]?.trim(); if (!v) throw new Error(`Missing required OAuth runtime configuration: ${name}`); return v; };
export const origin = () => { const u = new URL(required("APP_ORIGIN")); if (u.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(u.hostname)) throw new Error("APP_ORIGIN must use HTTPS outside localhost."); return u.origin; };
const signingSecret = () => process.env.OAUTH_STATE_SIGNING_SECRET?.trim() || required("OAUTH_CREDENTIAL_ENCRYPTION_KEY");
export function seal(state: OAuthStateRecord) { const payload = Buffer.from(JSON.stringify(state)).toString("base64url"); return `${payload}.${createHmac("sha256", signingSecret()).update(payload).digest("base64url")}`; }
export function open(value: string | undefined): OAuthStateRecord { if (!value) throw new Error("OAuth state cookie is missing."); const [payload, signature] = value.split("."); if (!payload || !signature) throw new Error("OAuth state cookie is malformed."); const expected = createHmac("sha256", signingSecret()).update(payload).digest(); const got = Buffer.from(signature, "base64url"); if (got.length !== expected.length || !timingSafeEqual(got, expected)) throw new Error("OAuth state cookie signature is invalid."); return JSON.parse(Buffer.from(payload, "base64url").toString()) as OAuthStateRecord; }
const db = () => postgres(required("DATABASE_URL"), { max: 1, prepare: false });
export function startUrl(provider: OAuthProvider, shop?: string) {
  const state = createOAuthState(provider, { shopDomain: shop, returnTo: "/connections" });
  if (provider === "google") return { state, url: buildGoogleAuthorizationUrl({ clientId: required("GOOGLE_OAUTH_CLIENT_ID"), clientSecret: required("GOOGLE_OAUTH_CLIENT_SECRET"), redirectUri: `${origin()}/api/connections/google/callback` }, state) };
  return { state, url: buildShopifyAuthorizationUrl({ clientId: required("SHOPIFY_OAUTH_CLIENT_ID"), clientSecret: required("SHOPIFY_OAUTH_CLIENT_SECRET"), redirectUri: `${origin()}/api/connections/shopify/callback`, shopDomain: shop ?? "" }, state) };
}
export async function save(provider: OAuthProvider, externalAccountId: string, bundle: { accessToken: string; refreshToken: string | null; expiresAt: string | null; scopes: string[]; tokenType: string | null }, metadata: Record<string, unknown> = {}, status = "connected") {
  const sql = db();
  try { const sites = await sql<{ id: string }[]>`SELECT id FROM sites WHERE lower(domain)='diamondshelf.us' AND is_active=true ORDER BY created_at LIMIT 1`; if (!sites[0]) throw new Error("Diamond Shelf site record is not available."); const envelope = encryptTokenBundle(bundle, required("OAUTH_CREDENTIAL_ENCRYPTION_KEY")); const secretRef = `enc:v1:${Buffer.from(JSON.stringify(envelope)).toString("base64url")}`; const clean = JSON.parse(JSON.stringify(sanitizedConnectionMetadata(provider, bundle, metadata))); await sql`INSERT INTO connections(site_id,provider,external_account_id,secret_ref,scopes,status,metadata) VALUES(${sites[0].id}::uuid,${provider},${externalAccountId},${secretRef},${bundle.scopes},${status},${sql.json(clean)}) ON CONFLICT(site_id,provider,external_account_id) DO UPDATE SET secret_ref=EXCLUDED.secret_ref,scopes=EXCLUDED.scopes,status=EXCLUDED.status,metadata=EXCLUDED.metadata,updated_at=now()`; } finally { await sql.end({ timeout: 2 }); }
}
export async function list(): Promise<Array<{ provider: string; status: string; metadata: Record<string, unknown> }>> { const sql = db(); try { return await sql<{ provider: string; status: string; metadata: Record<string, unknown> }[]>`SELECT c.provider,c.status,c.metadata FROM connections c JOIN sites s ON s.id=c.site_id WHERE lower(s.domain)='diamondshelf.us' ORDER BY c.provider,c.updated_at DESC`; } finally { await sql.end({ timeout: 2 }); } }
export async function selectGoogleProperties(gscSiteUrl: string, ga4PropertyId: string) {
  const sql = db();
  try {
    const rows = await sql<{ id: string; metadata: Record<string, unknown> }[]>`SELECT c.id,c.metadata FROM connections c JOIN sites s ON s.id=c.site_id WHERE lower(s.domain)='diamondshelf.us' AND c.provider='google' AND c.external_account_id='google' ORDER BY c.updated_at DESC LIMIT 1`;
    const row = rows[0]; if (!row) throw new Error("Google connection is not available.");
    const gsc = Array.isArray(row.metadata.discoveredSearchConsoleProperties) ? row.metadata.discoveredSearchConsoleProperties as Array<{ siteUrl?: string }> : [];
    const ga4 = Array.isArray(row.metadata.discoveredGa4Properties) ? row.metadata.discoveredGa4Properties as Array<{ propertyId?: string }> : [];
    if (!gsc.some((x) => x.siteUrl?.replace(/\/$/, "").toLowerCase() === gscSiteUrl.replace(/\/$/, "").toLowerCase()) || !ga4.some((x) => x.propertyId === ga4PropertyId)) throw new Error("Selected Google properties were not discovered.");
    await sql`UPDATE connections SET status='connected',metadata=${sql.json({ ...row.metadata, gscSiteUrl, ga4PropertyId, needsConfirmation: false })},updated_at=now() WHERE id=${row.id}::uuid`;
  } finally { await sql.end({ timeout: 2 }); }
}
export { assertOAuthState, exchangeGoogleCode, exchangeShopifyCode, discoverGoogleResources, autoMatchDiamondShelf };