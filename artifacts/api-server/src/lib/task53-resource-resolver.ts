import postgres from "postgres";
import { decodeTask53SecretRef } from "./task53-shopify-credential.js";

export const TASK53_RESOURCE_RESOLVER_VERSION = "task53_read_only_resource_resolver_v1" as const;
export const TASK53_RESOURCE_RESOLVER_API_VERSION = "2026-07" as const;
export const TASK53_RESOURCE_RESOLVER_REQUIRED_SCOPE = "read_products" as const;

export type Task53ResolverKind = "product" | "collection";
export type Task53ResolverTarget = {
  kind: Task53ResolverKind;
  handle: string;
  targetUrl: string;
};
export type Task53ReadOnlyCredential = {
  shopDomain: string;
  accessToken: string;
  scopes: string[];
};
export type Task53ResolverResult = {
  version: typeof TASK53_RESOURCE_RESOLVER_VERSION;
  mode: "read_only";
  admin_api_version: typeof TASK53_RESOURCE_RESOLVER_API_VERSION;
  provider: "shopify";
  required_scope: typeof TASK53_RESOURCE_RESOLVER_REQUIRED_SCOPE;
  provider_write_dispatch_enabled: false;
  database_mutations: 0;
  target_url: string;
  resource: { kind: Task53ResolverKind; handle: string; gid: string };
  seo: { title: string | null; description: string | null };
  provider_request_id: string | null;
};

type OrdinaryShopifyConnectionRow = {
  externalAccountId: string | null;
  secretRef: string | null;
  scopes: string[];
  status: string;
  metadata: Record<string, unknown>;
};

type TokenBundle = {
  accessToken: string;
  scopes: string[];
};

export class Task53ResolverError extends Error {
  constructor(public readonly category: string, public readonly status = 409) {
    super(category);
    this.name = "Task53ResolverError";
  }
}

const shopDomainPattern = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;
const handlePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const normalize = (value: unknown) => typeof value === "string" ? value.replace(/\s+/g, " ").trim() || null : null;
const sortedUnique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();

export function parseTask53ResolverTarget(rawUrl: string): Task53ResolverTarget {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Task53ResolverError("task53_resolver_target_url_invalid", 400);
  }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "diamondshelf.us") {
    throw new Task53ResolverError("task53_resolver_target_site_mismatch", 400);
  }
  if (url.username || url.password || url.port || url.search || url.hash) {
    throw new Task53ResolverError("task53_resolver_target_url_not_canonical", 400);
  }
  const match = url.pathname.match(/^\/(collections|products)\/([^/]+)\/?$/);
  if (!match) throw new Task53ResolverError("task53_resolver_target_path_invalid", 400);
  const handle = match[2]!.toLowerCase();
  if (!handlePattern.test(handle) || match[2] !== handle) {
    throw new Task53ResolverError("task53_resolver_handle_invalid", 400);
  }
  const kind: Task53ResolverKind = match[1] === "products" ? "product" : "collection";
  const plural = kind === "product" ? "products" : "collections";
  return { kind, handle, targetUrl: `https://diamondshelf.us/${plural}/${handle}` };
}

function validShopDomain(value: unknown): value is string {
  return typeof value === "string" && shopDomainPattern.test(value.trim());
}

export function validateTask53ReadOnlyCredential(
  row: Omit<OrdinaryShopifyConnectionRow, "secretRef">,
  bundle: TokenBundle,
): Task53ReadOnlyCredential {
  if (row.status !== "connected") throw new Task53ResolverError("task53_read_only_shopify_connection_not_connected");
  if (row.metadata.connectionMode === "task53_write_products" || row.metadata.readOnly === false) {
    throw new Task53ResolverError("task53_resolver_write_credential_rejected");
  }
  const metadataDomain = validShopDomain(row.metadata.shopDomain) ? row.metadata.shopDomain.trim().toLowerCase() : null;
  const externalDomain = validShopDomain(row.externalAccountId) ? row.externalAccountId.trim().toLowerCase() : null;
  const shopDomain = metadataDomain ?? externalDomain;
  if (!shopDomain) throw new Task53ResolverError("task53_resolver_shop_domain_missing_or_invalid");
  if (metadataDomain && externalDomain && metadataDomain !== externalDomain) {
    throw new Task53ResolverError("task53_resolver_shop_domain_mismatch");
  }
  if (!bundle.accessToken?.trim()) throw new Task53ResolverError("task53_resolver_shopify_access_token_missing");
  const persistedScopes = sortedUnique(row.scopes);
  const tokenScopes = sortedUnique(bundle.scopes);
  if (persistedScopes.join("|") !== tokenScopes.join("|")) {
    throw new Task53ResolverError("task53_resolver_shopify_scope_metadata_mismatch");
  }
  if (!tokenScopes.includes(TASK53_RESOURCE_RESOLVER_REQUIRED_SCOPE)) {
    throw new Task53ResolverError("task53_resolver_read_products_scope_missing");
  }
  if (tokenScopes.some((scope) => scope.startsWith("write_"))) {
    throw new Task53ResolverError("task53_resolver_write_scope_rejected");
  }
  return { shopDomain, accessToken: bundle.accessToken, scopes: tokenScopes };
}

function database() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Task53ResolverError("task53_resolver_database_not_configured", 503);
  return postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 2 });
}

function encryptionKey() {
  const value = process.env.OAUTH_CREDENTIAL_ENCRYPTION_KEY?.trim();
  if (!value) throw new Task53ResolverError("task53_resolver_encryption_key_not_configured", 503);
  return value;
}

export async function loadTask53ReadOnlyShopifyCredential(): Promise<Task53ReadOnlyCredential> {
  const sql = database();
  try {
    const rows = await sql<OrdinaryShopifyConnectionRow[]>`
      SELECT c.external_account_id AS "externalAccountId",c.secret_ref AS "secretRef",c.scopes,c.status,c.metadata
      FROM connections c
      JOIN sites s ON s.id=c.site_id
      WHERE lower(s.domain)='diamondshelf.us'
        AND s.is_active=true
        AND c.provider='shopify'
        AND c.status='connected'
        AND COALESCE(c.metadata->>'connectionMode','') <> 'task53_write_products'
      ORDER BY c.updated_at DESC
      LIMIT 1`;
    const row = rows[0];
    if (!row) throw new Task53ResolverError("task53_read_only_shopify_connection_not_found");
    if (!row.secretRef) throw new Task53ResolverError("task53_resolver_shopify_credential_missing");
    const bundle = decodeTask53SecretRef(row.secretRef, encryptionKey());
    return validateTask53ReadOnlyCredential(row, { accessToken: bundle.accessToken, scopes: bundle.scopes });
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

export function task53ResolverOperation(target: Task53ResolverTarget) {
  if (target.kind === "collection") {
    return {
      operationName: "SeoEngineTask53ResolveCollection",
      query: "query SeoEngineTask53ResolveCollection($identifier: CollectionIdentifierInput!) { collectionByIdentifier(identifier: $identifier) { id handle seo { title description } } }",
      variables: { identifier: { handle: target.handle } },
      payloadKey: "collectionByIdentifier" as const,
    };
  }
  return {
    operationName: "SeoEngineTask53ResolveProduct",
    query: "query SeoEngineTask53ResolveProduct($identifier: ProductIdentifierInput!) { productByIdentifier(identifier: $identifier) { id handle seo { title description } } }",
    variables: { identifier: { handle: target.handle } },
    payloadKey: "productByIdentifier" as const,
  };
}

function assertResolvedGid(kind: Task53ResolverKind, gid: string) {
  const type = kind === "product" ? "Product" : "Collection";
  if (!new RegExp(`^gid://shopify/${type}/[0-9]+$`).test(gid)) {
    throw new Task53ResolverError("task53_resolver_resource_identity_invalid", 502);
  }
}

export async function resolveTask53ShopifyResource(
  rawUrl: string,
  options: { credential?: Task53ReadOnlyCredential; fetchImpl?: typeof fetch } = {},
): Promise<Task53ResolverResult> {
  const target = parseTask53ResolverTarget(rawUrl);
  const credential = options.credential ?? await loadTask53ReadOnlyShopifyCredential();
  if (!shopDomainPattern.test(credential.shopDomain) || credential.scopes.some((scope) => scope.startsWith("write_"))) {
    throw new Task53ResolverError("task53_resolver_credential_not_read_only");
  }
  if (!credential.scopes.includes(TASK53_RESOURCE_RESOLVER_REQUIRED_SCOPE)) {
    throw new Task53ResolverError("task53_resolver_read_products_scope_missing");
  }
  const operation = task53ResolverOperation(target);
  if (/\bmutation\b/i.test(operation.query)) throw new Task53ResolverError("task53_resolver_non_read_operation_blocked", 500);
  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(`https://${credential.shopDomain}/admin/api/${TASK53_RESOURCE_RESOLVER_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Shopify-Access-Token": credential.accessToken,
      },
      body: JSON.stringify({ query: operation.query, variables: operation.variables, operationName: operation.operationName }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof Error && /timeout/i.test(`${error.name} ${error.message}`)) {
      throw new Task53ResolverError("task53_resolver_shopify_timeout", 502);
    }
    throw new Task53ResolverError("task53_resolver_shopify_network_error", 502);
  }
  const providerRequestId = response.headers.get("x-request-id")?.trim() || null;
  let body: Record<string, unknown>;
  try {
    body = await response.json() as Record<string, unknown>;
  } catch {
    throw new Task53ResolverError("task53_resolver_shopify_invalid_json", 502);
  }
  if (!response.ok) throw new Task53ResolverError(`task53_resolver_shopify_http_${response.status}`, 502);
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    throw new Task53ResolverError("task53_resolver_shopify_graphql_error", 502);
  }
  const data = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data as Record<string, unknown> : null;
  const resolved = data?.[operation.payloadKey];
  if (!resolved || typeof resolved !== "object" || Array.isArray(resolved)) {
    throw new Task53ResolverError("task53_resolver_resource_not_found", 404);
  }
  const resource = resolved as Record<string, unknown>;
  const gid = typeof resource.id === "string" ? resource.id.trim() : "";
  const handle = typeof resource.handle === "string" ? resource.handle.trim().toLowerCase() : "";
  if (handle !== target.handle) throw new Task53ResolverError("task53_resolver_provider_handle_mismatch", 502);
  assertResolvedGid(target.kind, gid);
  const seo = resource.seo && typeof resource.seo === "object" && !Array.isArray(resource.seo) ? resource.seo as Record<string, unknown> : {};
  return {
    version: TASK53_RESOURCE_RESOLVER_VERSION,
    mode: "read_only",
    admin_api_version: TASK53_RESOURCE_RESOLVER_API_VERSION,
    provider: "shopify",
    required_scope: TASK53_RESOURCE_RESOLVER_REQUIRED_SCOPE,
    provider_write_dispatch_enabled: false,
    database_mutations: 0,
    target_url: target.targetUrl,
    resource: { kind: target.kind, handle: target.handle, gid },
    seo: { title: normalize(seo.title), description: normalize(seo.description) },
    provider_request_id: providerRequestId,
  };
}
