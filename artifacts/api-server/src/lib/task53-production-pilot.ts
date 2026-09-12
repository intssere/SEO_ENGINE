import { createHash } from "node:crypto";
import { executionStateFingerprint, type AuthorizationEnvelope, type ExecutableField } from "./execution-foundation.js";

export const TASK53_VERSION = "controlled_single_action_production_execution_pilot_v1" as const;
export const TASK53_SHOPIFY_API_VERSION = "2025-10" as const;
export const TASK53_REQUIRED_WRITE_SCOPE = "write_products" as const;

export type Task53ResourceKind = "product" | "collection";
export type Task53Resource = { kind: Task53ResourceKind; gid: string };

export type Task53ShopifyCredential = {
  shopDomain: string;
  accessToken: string;
  scopes: string[];
};

export type Task53ProviderState = {
  resource: Task53Resource;
  field: ExecutableField;
  value: string | null;
  fingerprint: string;
  seoTitle: string | null;
  seoDescription: string | null;
  providerRequestId: string | null;
};

export type Task53MutationReceipt = {
  ok: boolean;
  providerRequestId: string | null;
  httpStatus: number;
  errorCategory: string | null;
  userErrors: Array<{ field: string[] | null; message: string }>;
  responseFingerprint: string;
};

export type Task53StorefrontVerification = {
  ok: boolean;
  statusCode: number | null;
  expectedValue: string | null;
  observedValue: string | null;
  expectedFingerprint: string;
  observedFingerprint: string | null;
  errorCategory: string | null;
};

export type Task53Preflight = {
  version: typeof TASK53_VERSION;
  actionId: string;
  planId: string;
  targetUrl: string;
  field: ExecutableField;
  resource: Task53Resource;
  beforeValue: string | null;
  afterValue: string;
  expectedBeforeFingerprint: string;
  observedBeforeFingerprint: string;
  providerStateMatchesApprovedSnapshot: boolean;
  authorizationExpiresAt: string;
  authorizationFresh: boolean;
  requiredWriteScope: typeof TASK53_REQUIRED_WRITE_SCOPE;
  writeScopePresent: boolean;
  publicWriteGateEnabled: boolean;
  priorDeploymentCount: number;
  otherActiveExecutionCount: number;
  preflightFingerprint: string;
  requiredConfirmation: string;
  rollbackIncluded: true;
  readyForLivePilot: boolean;
  blockers: string[];
};

export class Task53ProviderError extends Error {
  constructor(public readonly category: string, public readonly httpStatus: number | null = null) {
    super(category);
    this.name = "Task53ProviderError";
  }
}

const normalize = (value: string | null | undefined) => value == null ? null : value.replace(/\s+/g, " ").trim();
const hash = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");

function validShopDomain(value: string) {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(value.trim());
}

export function assertTask53Resource(resource: Task53Resource) {
  const type = resource.kind === "product" ? "Product" : "Collection";
  if (!new RegExp(`^gid://shopify/${type}/[0-9]+$`).test(resource.gid)) throw new Task53ProviderError("task53_resource_identity_invalid");
}

export function assertTask53TargetUrl(resource: Task53Resource, targetUrl: string) {
  let url: URL;
  try { url = new URL(targetUrl); } catch { throw new Task53ProviderError("task53_target_url_invalid"); }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "diamondshelf.us") throw new Task53ProviderError("task53_target_site_mismatch");
  const expected = resource.kind === "product" ? "/products/" : "/collections/";
  if (!url.pathname.startsWith(expected)) throw new Task53ProviderError("task53_resource_url_kind_mismatch");
}

export function task53RequiredConfirmation(actionId: string, preflightFingerprint: string) {
  return `EXECUTE_AND_ROLLBACK_TASK53:${actionId}:${preflightFingerprint}`;
}

export function buildTask53Preflight(input: {
  actionId: string;
  envelope: AuthorizationEnvelope;
  resource: Task53Resource;
  providerState: Task53ProviderState;
  credentialScopes: string[];
  publicWriteGateEnabled: boolean;
  priorDeploymentCount: number;
  otherActiveExecutionCount: number;
  now: string;
}): Task53Preflight {
  assertTask53Resource(input.resource);
  assertTask53TargetUrl(input.resource, input.envelope.target.url);
  const now = Date.parse(input.now);
  const expiresAt = Date.parse(input.envelope.authorization.expiresAt);
  const authorizationFresh = Number.isFinite(now) && Number.isFinite(expiresAt) && now < expiresAt && input.envelope.authorization.executionAuthorized === true;
  const providerStateMatchesApprovedSnapshot = input.providerState.fingerprint === input.envelope.expectedCurrentState.fingerprint;
  const writeScopePresent = input.credentialScopes.includes(TASK53_REQUIRED_WRITE_SCOPE);
  const blockers: string[] = [];
  if (!authorizationFresh) blockers.push("authorization_expired_or_invalid");
  if (!providerStateMatchesApprovedSnapshot) blockers.push("provider_state_changed_since_approval");
  if (!writeScopePresent) blockers.push("shopify_write_products_scope_missing");
  if (!input.publicWriteGateEnabled) blockers.push("public_site_write_gate_disabled");
  if (input.priorDeploymentCount > 0) blockers.push("duplicate_provider_execution_blocked");
  if (input.otherActiveExecutionCount > 0) blockers.push("another_site_execution_is_active");
  const fingerprint = hash({
    version: TASK53_VERSION,
    actionId: input.actionId,
    planId: input.envelope.planId,
    resource: input.resource,
    targetUrl: input.envelope.target.url,
    field: input.envelope.target.field,
    before: input.envelope.expectedCurrentState,
    after: input.envelope.proposedState,
    authorizationFingerprint: input.envelope.envelopeFingerprint,
    observedBeforeFingerprint: input.providerState.fingerprint,
    rollbackIncluded: true,
  });
  return {
    version: TASK53_VERSION,
    actionId: input.actionId,
    planId: input.envelope.planId,
    targetUrl: input.envelope.target.url,
    field: input.envelope.target.field,
    resource: input.resource,
    beforeValue: input.envelope.expectedCurrentState.value,
    afterValue: input.envelope.proposedState.value,
    expectedBeforeFingerprint: input.envelope.expectedCurrentState.fingerprint,
    observedBeforeFingerprint: input.providerState.fingerprint,
    providerStateMatchesApprovedSnapshot,
    authorizationExpiresAt: input.envelope.authorization.expiresAt,
    authorizationFresh,
    requiredWriteScope: TASK53_REQUIRED_WRITE_SCOPE,
    writeScopePresent,
    publicWriteGateEnabled: input.publicWriteGateEnabled,
    priorDeploymentCount: input.priorDeploymentCount,
    otherActiveExecutionCount: input.otherActiveExecutionCount,
    preflightFingerprint: fingerprint,
    requiredConfirmation: task53RequiredConfirmation(input.actionId, fingerprint),
    rollbackIncluded: true,
    readyForLivePilot: blockers.length === 0,
    blockers,
  };
}

function task53Query(resource: Task53Resource) {
  const fragment = resource.kind === "product"
    ? "... on Product { id seo { title description } }"
    : "... on Collection { id seo { title description } }";
  return `query SeoEngineTask53PreRead($id: ID!) { node(id: $id) { __typename ${fragment} } }`;
}

function mutationSpec(resource: Task53Resource, field: ExecutableField, value: string | null) {
  const seo = field === "title" ? { title: normalize(value) } : { description: normalize(value) };
  if (resource.kind === "product") {
    return {
      operationName: "SeoEngineTask53ProductUpdate",
      query: "mutation SeoEngineTask53ProductUpdate($product: ProductUpdateInput!) { productUpdate(product: $product) { product { id seo { title description } } userErrors { field message } } }",
      variables: { product: { id: resource.gid, seo } },
      payloadKey: "productUpdate" as const,
    };
  }
  return {
    operationName: "SeoEngineTask53CollectionUpdate",
    query: "mutation SeoEngineTask53CollectionUpdate($collection: CollectionUpdateInput!) { collectionUpdate(collection: $collection) { collection { id seo { title description } } userErrors { field message } } }",
    variables: { collection: { id: resource.gid, seo } },
    payloadKey: "collectionUpdate" as const,
  };
}

async function shopifyGraphql(credential: Task53ShopifyCredential, query: string, variables: Record<string, unknown>, fetchImpl: typeof fetch) {
  if (!validShopDomain(credential.shopDomain)) throw new Task53ProviderError("shopify_domain_invalid");
  if (!credential.accessToken.trim()) throw new Task53ProviderError("shopify_access_token_missing");
  let response: Response;
  try {
    response = await fetchImpl(`https://${credential.shopDomain}/admin/api/${TASK53_SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Shopify-Access-Token": credential.accessToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof Error && /timeout/i.test(error.name + error.message)) throw new Task53ProviderError("shopify_timeout");
    throw new Task53ProviderError("shopify_network_error");
  }
  const requestId = response.headers.get("x-request-id")?.trim() || null;
  let body: Record<string, unknown>;
  try { body = await response.json() as Record<string, unknown>; } catch { throw new Task53ProviderError("shopify_invalid_json", response.status); }
  if (!response.ok) throw new Task53ProviderError(`shopify_http_${response.status}`, response.status);
  const errors = Array.isArray(body.errors) ? body.errors : [];
  if (errors.length > 0) throw new Task53ProviderError("shopify_graphql_error", response.status);
  return { body, requestId, status: response.status };
}

export async function readTask53ShopifyState(input: {
  credential: Task53ShopifyCredential;
  resource: Task53Resource;
  field: ExecutableField;
  fetchImpl?: typeof fetch;
}): Promise<Task53ProviderState> {
  assertTask53Resource(input.resource);
  const result = await shopifyGraphql(input.credential, task53Query(input.resource), { id: input.resource.gid }, input.fetchImpl ?? fetch);
  const data = result.body.data && typeof result.body.data === "object" ? result.body.data as Record<string, unknown> : {};
  const node = data.node && typeof data.node === "object" ? data.node as Record<string, unknown> : null;
  if (!node) throw new Task53ProviderError("shopify_resource_not_found", result.status);
  const expectedType = input.resource.kind === "product" ? "Product" : "Collection";
  if (node.__typename !== expectedType || node.id !== input.resource.gid) throw new Task53ProviderError("shopify_resource_identity_mismatch", result.status);
  const seo = node.seo && typeof node.seo === "object" ? node.seo as Record<string, unknown> : {};
  const seoTitle = typeof seo.title === "string" ? normalize(seo.title) : null;
  const seoDescription = typeof seo.description === "string" ? normalize(seo.description) : null;
  const value = input.field === "title" ? seoTitle : seoDescription;
  return {
    resource: input.resource,
    field: input.field,
    value,
    fingerprint: executionStateFingerprint(input.field, value),
    seoTitle,
    seoDescription,
    providerRequestId: result.requestId,
  };
}

export async function mutateTask53ShopifyState(input: {
  credential: Task53ShopifyCredential;
  resource: Task53Resource;
  field: ExecutableField;
  value: string | null;
  fetchImpl?: typeof fetch;
}): Promise<Task53MutationReceipt> {
  assertTask53Resource(input.resource);
  if (!input.credential.scopes.includes(TASK53_REQUIRED_WRITE_SCOPE)) throw new Task53ProviderError("shopify_write_products_scope_missing");
  const spec = mutationSpec(input.resource, input.field, input.value);
  const result = await shopifyGraphql(input.credential, spec.query, spec.variables, input.fetchImpl ?? fetch);
  const data = result.body.data && typeof result.body.data === "object" ? result.body.data as Record<string, unknown> : {};
  const payload = data[spec.payloadKey] && typeof data[spec.payloadKey] === "object" ? data[spec.payloadKey] as Record<string, unknown> : {};
  const rawUserErrors = Array.isArray(payload.userErrors) ? payload.userErrors : [];
  const userErrors = rawUserErrors.map((item) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      field: Array.isArray(row.field) ? row.field.filter((v): v is string => typeof v === "string") : null,
      message: typeof row.message === "string" ? row.message : "Shopify mutation error",
    };
  });
  const resourceValue = payload[input.resource.kind] ?? payload.product ?? payload.collection ?? null;
  const ok = userErrors.length === 0 && Boolean(resourceValue);
  return {
    ok,
    providerRequestId: result.requestId,
    httpStatus: result.status,
    errorCategory: ok ? null : "shopify_user_error",
    userErrors,
    responseFingerprint: hash({ requestId: result.requestId, status: result.status, ok, userErrors, resource: input.resource, field: input.field }),
  };
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractStorefrontField(html: string, field: ExecutableField) {
  if (field === "title") {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? normalize(decodeHtml(match[1]!.replace(/<[^>]+>/g, ""))) : null;
  }
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (name !== "description") continue;
    const content = tag.match(/\bcontent\s*=\s*["']([\s\S]*?)["']/i)?.[1];
    if (content !== undefined) return normalize(decodeHtml(content));
  }
  return null;
}

export async function verifyTask53Storefront(input: {
  url: string;
  field: ExecutableField;
  expectedValue: string | null;
  fetchImpl?: typeof fetch;
}): Promise<Task53StorefrontVerification> {
  let url: URL;
  try { url = new URL(input.url); } catch {
    return { ok: false, statusCode: null, expectedValue: normalize(input.expectedValue), observedValue: null, expectedFingerprint: executionStateFingerprint(input.field, normalize(input.expectedValue)), observedFingerprint: null, errorCategory: "storefront_url_invalid" };
  }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "diamondshelf.us") {
    return { ok: false, statusCode: null, expectedValue: normalize(input.expectedValue), observedValue: null, expectedFingerprint: executionStateFingerprint(input.field, normalize(input.expectedValue)), observedFingerprint: null, errorCategory: "storefront_site_mismatch" };
  }
  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(url.toString(), { method: "GET", headers: { Accept: "text/html" }, signal: AbortSignal.timeout(15_000) });
  } catch {
    return { ok: false, statusCode: null, expectedValue: normalize(input.expectedValue), observedValue: null, expectedFingerprint: executionStateFingerprint(input.field, normalize(input.expectedValue)), observedFingerprint: null, errorCategory: "storefront_network_error" };
  }
  if (!response.ok) {
    return { ok: false, statusCode: response.status, expectedValue: normalize(input.expectedValue), observedValue: null, expectedFingerprint: executionStateFingerprint(input.field, normalize(input.expectedValue)), observedFingerprint: null, errorCategory: `storefront_http_${response.status}` };
  }
  const html = await response.text();
  const observedValue = extractStorefrontField(html, input.field);
  const expectedValue = normalize(input.expectedValue);
  const expectedFingerprint = executionStateFingerprint(input.field, expectedValue);
  const observedFingerprint = executionStateFingerprint(input.field, observedValue);
  return {
    ok: expectedFingerprint === observedFingerprint,
    statusCode: response.status,
    expectedValue,
    observedValue,
    expectedFingerprint,
    observedFingerprint,
    errorCategory: expectedFingerprint === observedFingerprint ? null : "storefront_state_mismatch",
  };
}

export function task53AuditFingerprint(value: unknown) {
  return hash(value);
}
