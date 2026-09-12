import postgres from "postgres";
import { decryptTokenBundle, type EncryptedSecretEnvelope } from "@seo-engine/oauth-connection-manager";
import { TASK53_REQUIRED_WRITE_SCOPE, type Task53ShopifyCredential } from "./task53-production-pilot.js";

export type Task53ShopifyCapability = {
  connected: boolean;
  shopDomain: string | null;
  scopes: string[];
  writeProductsScopePresent: boolean;
  credentialAvailable: boolean;
};

export class Task53CredentialError extends Error {
  constructor(public readonly category: string) {
    super(category);
    this.name = "Task53CredentialError";
  }
}

const validDomain = (value: string) => /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(value.trim());

export function decodeTask53SecretRef(secretRef: string, encryptionKey: string) {
  if (!secretRef.startsWith("enc:v1:")) throw new Task53CredentialError("shopify_secret_ref_unsupported");
  const encoded = secretRef.slice("enc:v1:".length);
  if (!encoded) throw new Task53CredentialError("shopify_secret_ref_empty");
  let envelope: EncryptedSecretEnvelope;
  try {
    envelope = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as EncryptedSecretEnvelope;
  } catch {
    throw new Task53CredentialError("shopify_secret_ref_invalid");
  }
  try {
    return decryptTokenBundle(envelope, encryptionKey);
  } catch {
    throw new Task53CredentialError("shopify_credential_decryption_failed");
  }
}

function database() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Task53CredentialError("database_not_configured");
  return postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 });
}

function encryptionKey() {
  const value = process.env.OAUTH_CREDENTIAL_ENCRYPTION_KEY?.trim();
  if (!value) throw new Task53CredentialError("credential_encryption_key_not_configured");
  return value;
}

async function connectionRow() {
  const sql = database();
  try {
    const rows = await sql<Array<{
      externalAccountId: string | null;
      secretRef: string | null;
      scopes: string[];
      status: string;
      metadata: Record<string, unknown>;
    }>>`
      SELECT c.external_account_id AS "externalAccountId",c.secret_ref AS "secretRef",c.scopes,c.status,c.metadata
      FROM connections c
      JOIN sites s ON s.id=c.site_id
      WHERE lower(s.domain)='diamondshelf.us' AND s.is_active=true AND c.provider='shopify'
      ORDER BY c.updated_at DESC
      LIMIT 1`;
    return rows[0] ?? null;
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

export async function inspectTask53ShopifyCapability(): Promise<Task53ShopifyCapability> {
  const row = await connectionRow();
  if (!row) return { connected: false, shopDomain: null, scopes: [], writeProductsScopePresent: false, credentialAvailable: false };
  const metadataDomain = typeof row.metadata.shopDomain === "string" ? row.metadata.shopDomain.trim().toLowerCase() : null;
  const externalDomain = row.externalAccountId?.trim().toLowerCase() ?? null;
  const shopDomain = metadataDomain && validDomain(metadataDomain) ? metadataDomain : externalDomain && validDomain(externalDomain) ? externalDomain : null;
  return {
    connected: row.status === "connected",
    shopDomain,
    scopes: [...row.scopes],
    writeProductsScopePresent: row.scopes.includes(TASK53_REQUIRED_WRITE_SCOPE),
    credentialAvailable: Boolean(row.secretRef),
  };
}

export async function loadTask53ShopifyCredential(): Promise<Task53ShopifyCredential> {
  const row = await connectionRow();
  if (!row || row.status !== "connected") throw new Task53CredentialError("shopify_connection_not_connected");
  const metadataDomain = typeof row.metadata.shopDomain === "string" ? row.metadata.shopDomain.trim().toLowerCase() : null;
  const externalDomain = row.externalAccountId?.trim().toLowerCase() ?? null;
  const shopDomain = metadataDomain && validDomain(metadataDomain) ? metadataDomain : externalDomain && validDomain(externalDomain) ? externalDomain : null;
  if (!shopDomain) throw new Task53CredentialError("shopify_domain_missing_or_invalid");
  if (!row.secretRef) throw new Task53CredentialError("shopify_credential_missing");
  const bundle = decodeTask53SecretRef(row.secretRef, encryptionKey());
  if (!bundle.accessToken?.trim()) throw new Task53CredentialError("shopify_access_token_missing");
  const persistedScopes = [...new Set(row.scopes.filter(Boolean))].sort();
  const tokenScopes = [...new Set(bundle.scopes.filter(Boolean))].sort();
  if (persistedScopes.join("|") !== tokenScopes.join("|")) throw new Task53CredentialError("shopify_scope_metadata_mismatch");
  return { shopDomain, accessToken: bundle.accessToken, scopes: tokenScopes };
}
