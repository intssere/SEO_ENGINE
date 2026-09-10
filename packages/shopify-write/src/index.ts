export const SHOPIFY_ADMIN_API_VERSION = "2026-07" as const;

export type SafetyDisposition = "auto" | "approval" | "blocked";
export type SupportedShopifyWriteAction = "metadata.title" | "metadata.description" | "image.alt";

export interface ShopifyWriteConfig {
  shopDomain: string;
  accessToken: string;
  grantedScopes: readonly string[];
  publicSiteWritesEnabled?: boolean;
  apiVersion?: string;
}

export interface ApprovalProof {
  decision: "approved" | "rejected";
  actorId: string;
  approvalId: string;
}

export interface ExecutionAuthorization {
  planRiskLevel: SafetyDisposition;
  actionDisposition: SafetyDisposition;
  approval?: ApprovalProof | null;
}

export interface ProductSeoWrite {
  actionType: "metadata.title" | "metadata.description";
  productId: string;
  value: string;
}

export interface ImageAltWrite {
  actionType: "image.alt";
  fileId: string;
  value: string;
}

export type ShopifyWriteAction = ProductSeoWrite | ImageAltWrite;

export interface PreparedShopifyMutation {
  actionType: SupportedShopifyWriteAction;
  operationName: "SeoEngineProductSeoUpdate" | "SeoEngineFileAltUpdate";
  query: string;
  variables: Record<string, unknown>;
  requiredScopes: string[];
}

export interface ShopifyWriteResult {
  ok: true;
  actionType: SupportedShopifyWriteAction;
  operationName: PreparedShopifyMutation["operationName"];
  resourceId: string;
  apiVersion: string;
}

interface GraphqlError { message: string }
interface UserError { field?: string[] | null; message: string; code?: string | null }
interface GraphqlEnvelope<T> { data?: T; errors?: GraphqlError[] }

interface ProductUpdateData {
  productUpdate: {
    product: { id: string; seo: { title: string | null; description: string | null } } | null;
    userErrors: UserError[];
  };
}

interface FileUpdateData {
  fileUpdate: {
    files: Array<{ id: string; alt: string | null }>;
    userErrors: UserError[];
  };
}

const PRODUCT_SEO_UPDATE = `#graphql
mutation SeoEngineProductSeoUpdate($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product { id seo { title description } }
    userErrors { field message }
  }
}`;

const FILE_ALT_UPDATE = `#graphql
mutation SeoEngineFileAltUpdate($files: [FileUpdateInput!]!) {
  fileUpdate(files: $files) {
    files { id alt }
    userErrors { field message code }
  }
}`;

export function normalizeShopDomain(input: string): string {
  const value = input.trim().toLowerCase().replace(/^https?:\/\//, "");
  const host = value.split("/")[0]?.split(":")[0] ?? "";
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host)) {
    throw new Error("Shopify shop domain must be a valid *.myshopify.com hostname.");
  }
  return host;
}

function assertGid(value: string, type: "Product" | "MediaImage" | "GenericFile"): void {
  const allowed = type === "Product" ? /^gid:\/\/shopify\/Product\/\d+$/ : /^gid:\/\/shopify\/(MediaImage|GenericFile)\/\d+$/;
  if (!allowed.test(value)) throw new Error(`Invalid Shopify ${type} GID.`);
}

function assertText(value: string, field: string): string {
  const clean = value.trim();
  if (!clean) throw new Error(`${field} cannot be empty.`);
  if (clean.length > 5000) throw new Error(`${field} exceeds connector safety limit.`);
  return clean;
}

export function assertExecutionAuthorized(config: ShopifyWriteConfig, authorization: ExecutionAuthorization): void {
  if (process.env.PUBLIC_SITE_WRITES_ENABLED !== "true" || config.publicSiteWritesEnabled !== true) {
    throw new Error("Public site writes are disabled by the global kill switch.");
  }
  if (authorization.planRiskLevel === "blocked" || authorization.actionDisposition === "blocked") {
    throw new Error("Blocked action plans/actions can never execute.");
  }
  const requiresApproval = authorization.planRiskLevel === "approval" || authorization.actionDisposition === "approval";
  if (requiresApproval) {
    const approval = authorization.approval;
    if (!approval || approval.decision !== "approved" || !approval.actorId.trim() || !approval.approvalId.trim()) {
      throw new Error("Explicit approval proof is required before this action can execute.");
    }
  }
}

function assertScopes(granted: readonly string[], prepared: PreparedShopifyMutation): void {
  if (prepared.actionType === "image.alt") {
    if (!granted.includes("write_files") && !granted.includes("write_themes")) {
      throw new Error("image.alt requires write_files or write_themes scope.");
    }
    return;
  }
  if (!granted.includes("write_products")) throw new Error(`${prepared.actionType} requires write_products scope.`);
}

export function prepareShopifyMutation(action: ShopifyWriteAction): PreparedShopifyMutation {
  const value = assertText(action.value, "Proposed value");
  if (action.actionType === "metadata.title" || action.actionType === "metadata.description") {
    assertGid(action.productId, "Product");
    const seo = action.actionType === "metadata.title" ? { title: value } : { description: value };
    return {
      actionType: action.actionType,
      operationName: "SeoEngineProductSeoUpdate",
      query: PRODUCT_SEO_UPDATE,
      variables: { product: { id: action.productId, seo } },
      requiredScopes: ["write_products"],
    };
  }
  assertGid(action.fileId, "MediaImage");
  return {
    actionType: "image.alt",
    operationName: "SeoEngineFileAltUpdate",
    query: FILE_ALT_UPDATE,
    variables: { files: [{ id: action.fileId, alt: value }] },
    requiredScopes: ["write_files", "write_themes"],
  };
}

function userErrorMessage(errors: UserError[]): string {
  return errors.map((error) => error.message).join("; ");
}

export async function executeShopifyWrite(
  config: ShopifyWriteConfig,
  authorization: ExecutionAuthorization,
  action: ShopifyWriteAction,
  fetchImpl: typeof fetch = fetch,
): Promise<ShopifyWriteResult> {
  assertExecutionAuthorized(config, authorization);
  const prepared = prepareShopifyMutation(action);
  assertScopes(config.grantedScopes, prepared);

  const shopDomain = normalizeShopDomain(config.shopDomain);
  const accessToken = config.accessToken.trim();
  if (!accessToken) throw new Error("Shopify Admin API access token is required.");
  const apiVersion = config.apiVersion ?? SHOPIFY_ADMIN_API_VERSION;

  const response = await fetchImpl(`https://${shopDomain}/admin/api/${encodeURIComponent(apiVersion)}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
    body: JSON.stringify({ query: prepared.query, variables: prepared.variables }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Shopify Admin API write failed with HTTP ${response.status}.`);

  if (prepared.actionType === "image.alt") {
    const payload = await response.json() as GraphqlEnvelope<FileUpdateData>;
    if (payload.errors?.length) throw new Error(`Shopify GraphQL error: ${payload.errors.map((e) => e.message).join("; ")}`);
    const result = payload.data?.fileUpdate;
    if (!result) throw new Error("Shopify fileUpdate response did not include data.");
    if (result.userErrors.length) throw new Error(`Shopify fileUpdate rejected change: ${userErrorMessage(result.userErrors)}`);
    const resource = result.files[0];
    if (!resource) throw new Error("Shopify fileUpdate returned no updated file.");
    return { ok: true, actionType: prepared.actionType, operationName: prepared.operationName, resourceId: resource.id, apiVersion };
  }

  const payload = await response.json() as GraphqlEnvelope<ProductUpdateData>;
  if (payload.errors?.length) throw new Error(`Shopify GraphQL error: ${payload.errors.map((e) => e.message).join("; ")}`);
  const result = payload.data?.productUpdate;
  if (!result) throw new Error("Shopify productUpdate response did not include data.");
  if (result.userErrors.length) throw new Error(`Shopify productUpdate rejected change: ${userErrorMessage(result.userErrors)}`);
  if (!result.product) throw new Error("Shopify productUpdate returned no updated product.");
  return { ok: true, actionType: prepared.actionType, operationName: prepared.operationName, resourceId: result.product.id, apiVersion };
}

export function unsupportedShopifyAction(actionType: string): never {
  throw new Error(`Shopify write action ${actionType} is not implemented in V1 and fails closed.`);
}
