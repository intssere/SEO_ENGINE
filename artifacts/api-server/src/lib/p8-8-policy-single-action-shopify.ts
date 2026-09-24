import { createHash } from "node:crypto";
import type { P88W02ProductTargetBinding } from "./p8-8-governed-proposal-materialization.js";

export const P8_8_W07_SHOPIFY_API_VERSION = "2026-07" as const;
export const P8_8_W07_REQUIRED_WRITE_SCOPE = "write_products" as const;

export type P88W07ShopifyWriteCredential = Readonly<{
  siteId: string;
  credentialProfileId: string;
  shopDomain: string;
  accessToken: string;
  scopes: readonly string[];
}>;

export type P88W07MutationReceipt = Readonly<{
  outcome: "accepted" | "rejected" | "uncertain";
  providerRequestId: string | null;
  httpStatus: number | null;
  errorCategory: string | null;
  userErrors: readonly Readonly<{
    field: readonly string[] | null;
    message: string;
  }>[];
  responseFingerprint: string;
  providerMutationCalled: true;
  automaticRetryPerformed: false;
}>;

export type P88W07StorefrontEvidence = Readonly<{
  outcome: "verified" | "mismatch" | "unavailable";
  statusCode: number | null;
  expectedValue: string | null;
  observedValue: string | null;
  evidenceFingerprint: string;
  errorCategory: string | null;
}>;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function validShopDomain(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value);
}

function assertCredential(input: {
  credential: P88W07ShopifyWriteCredential;
  expectedSiteId: string;
  expectedCredentialProfileId: string;
}): void {
  if (
    input.credential.siteId !== input.expectedSiteId
    || input.credential.credentialProfileId !== input.expectedCredentialProfileId
    || !validShopDomain(input.credential.shopDomain)
    || !input.credential.accessToken.trim()
    || !input.credential.scopes.includes(P8_8_W07_REQUIRED_WRITE_SCOPE)
  ) {
    throw new Error("p88_w07_write_credential_binding_invalid");
  }
}

function boundedUserErrors(value: unknown): Array<{
  field: string[] | null;
  message: string;
}> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((entry) => {
    const object = entry && typeof entry === "object"
      ? entry as Record<string, unknown>
      : {};
    const field = Array.isArray(object.field)
      ? object.field
        .slice(0, 10)
        .filter((part): part is string => typeof part === "string")
      : null;
    const message = typeof object.message === "string"
      ? object.message.slice(0, 500)
      : "shopify_user_error";
    return { field, message };
  });
}

function receipt(input: Omit<P88W07MutationReceipt, "responseFingerprint" | "providerMutationCalled" | "automaticRetryPerformed"> & {
  responseBasis: unknown;
}): P88W07MutationReceipt {
  return Object.freeze({
    outcome: input.outcome,
    providerRequestId: input.providerRequestId,
    httpStatus: input.httpStatus,
    errorCategory: input.errorCategory,
    userErrors: Object.freeze([...input.userErrors]),
    responseFingerprint: hash({
      purpose: "p8.8_w07_shopify_mutation_response",
      outcome: input.outcome,
      providerRequestId: input.providerRequestId,
      httpStatus: input.httpStatus,
      errorCategory: input.errorCategory,
      userErrors: input.userErrors,
      responseBasis: input.responseBasis,
    }),
    providerMutationCalled: true,
    automaticRetryPerformed: false,
  });
}

export async function mutateP88W07ShopifyProductSeo(input: {
  credential: P88W07ShopifyWriteCredential;
  expectedCredentialProfileId: string;
  target: P88W02ProductTargetBinding;
  value: string | null;
  fetchImpl: typeof fetch;
}): Promise<P88W07MutationReceipt> {
  assertCredential({
    credential: input.credential,
    expectedSiteId: input.target.siteId,
    expectedCredentialProfileId: input.expectedCredentialProfileId,
  });
  if (
    input.target.provider !== "shopify"
    || input.target.domain !== "diamondshelf.us"
    || input.target.resourceKind !== "product"
    || input.target.field !== "meta_description"
    || input.target.actionType !== "update_meta_description"
    || input.target.requiredProviderScope !== "write_products"
  ) {
    throw new Error("p88_w07_shopify_target_scope_invalid");
  }

  const query =
    "mutation SeoEngineW07ProductSeoWrite($product: ProductUpdateInput!) { "
    + "productUpdate(product: $product) { "
    + "product { id } userErrors { field message } } }";
  const variables = {
    product: {
      id: input.target.resourceGid,
      seo: { description: input.value },
    },
  };

  let response: Response;
  try {
    response = await input.fetchImpl(
      "https://" + input.credential.shopDomain
        + "/admin/api/" + P8_8_W07_SHOPIFY_API_VERSION + "/graphql.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Shopify-Access-Token": input.credential.accessToken,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    return receipt({
      outcome: "uncertain",
      providerRequestId: null,
      httpStatus: null,
      errorCategory: "shopify_transport_outcome_uncertain",
      userErrors: [],
      responseBasis: "transport_exception",
    });
  }

  const requestId = response.headers.get("x-request-id")?.trim() || null;
  let body: Record<string, unknown>;
  try {
    body = await response.json() as Record<string, unknown>;
  } catch {
    return receipt({
      outcome: "uncertain",
      providerRequestId: requestId,
      httpStatus: response.status,
      errorCategory: "shopify_invalid_json_outcome_uncertain",
      userErrors: [],
      responseBasis: "invalid_json",
    });
  }

  if (!response.ok || (Array.isArray(body.errors) && body.errors.length > 0)) {
    return receipt({
      outcome: "uncertain",
      providerRequestId: requestId,
      httpStatus: response.status,
      errorCategory: response.ok
        ? "shopify_graphql_outcome_uncertain"
        : "shopify_http_" + response.status + "_outcome_uncertain",
      userErrors: [],
      responseBasis: {
        topLevelErrorCount: Array.isArray(body.errors) ? body.errors.length : 0,
      },
    });
  }

  const data = body.data && typeof body.data === "object"
    ? body.data as Record<string, unknown>
    : null;
  const payload = data?.productUpdate && typeof data.productUpdate === "object"
    ? data.productUpdate as Record<string, unknown>
    : null;
  if (!payload) {
    return receipt({
      outcome: "uncertain",
      providerRequestId: requestId,
      httpStatus: response.status,
      errorCategory: "shopify_product_update_payload_missing",
      userErrors: [],
      responseBasis: "payload_missing",
    });
  }

  const userErrors = boundedUserErrors(payload.userErrors);
  if (userErrors.length > 0) {
    return receipt({
      outcome: "rejected",
      providerRequestId: requestId,
      httpStatus: response.status,
      errorCategory: "shopify_user_error",
      userErrors,
      responseBasis: { userErrors },
    });
  }

  const product = payload.product && typeof payload.product === "object"
    ? payload.product as Record<string, unknown>
    : null;
  if (!product || product.id !== input.target.resourceGid) {
    return receipt({
      outcome: "uncertain",
      providerRequestId: requestId,
      httpStatus: response.status,
      errorCategory: "shopify_product_identity_uncertain",
      userErrors: [],
      responseBasis: { returnedId: product?.id ?? null },
    });
  }

  return receipt({
    outcome: "accepted",
    providerRequestId: requestId,
    httpStatus: response.status,
    errorCategory: null,
    userErrors: [],
    responseBasis: { returnedId: product.id },
  });
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractMetaDescription(html: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (name !== "description") continue;
    const content = tag.match(/\bcontent\s*=\s*["']([\s\S]*?)["']/i)?.[1];
    if (content !== undefined) return decodeHtml(content);
  }
  return null;
}

export async function verifyP88W07StorefrontMetaDescription(input: {
  targetUrl: string;
  expectedValue: string | null;
  fetchImpl: typeof fetch;
}): Promise<P88W07StorefrontEvidence> {
  let url: URL;
  try {
    url = new URL(input.targetUrl);
  } catch {
    return Object.freeze({
      outcome: "unavailable",
      statusCode: null,
      expectedValue: input.expectedValue,
      observedValue: null,
      evidenceFingerprint: hash({
        purpose: "p8.8_w07_storefront",
        errorCategory: "storefront_url_invalid",
      }),
      errorCategory: "storefront_url_invalid",
    });
  }
  if (
    url.protocol !== "https:"
    || url.hostname.toLowerCase() !== "diamondshelf.us"
    || !url.pathname.startsWith("/products/")
  ) {
    throw new Error("p88_w07_storefront_target_scope_invalid");
  }

  let response: Response;
  try {
    response = await input.fetchImpl(url.toString(), {
      method: "GET",
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return Object.freeze({
      outcome: "unavailable",
      statusCode: null,
      expectedValue: input.expectedValue,
      observedValue: null,
      evidenceFingerprint: hash({
        purpose: "p8.8_w07_storefront",
        targetUrl: input.targetUrl,
        errorCategory: "storefront_network_unavailable",
      }),
      errorCategory: "storefront_network_unavailable",
    });
  }

  if (!response.ok) {
    return Object.freeze({
      outcome: "unavailable",
      statusCode: response.status,
      expectedValue: input.expectedValue,
      observedValue: null,
      evidenceFingerprint: hash({
        purpose: "p8.8_w07_storefront",
        targetUrl: input.targetUrl,
        statusCode: response.status,
      }),
      errorCategory: "storefront_http_" + response.status,
    });
  }

  const observedValue = extractMetaDescription(await response.text());
  const outcome = observedValue === input.expectedValue
    ? "verified" as const
    : "mismatch" as const;
  return Object.freeze({
    outcome,
    statusCode: response.status,
    expectedValue: input.expectedValue,
    observedValue,
    evidenceFingerprint: hash({
      purpose: "p8.8_w07_storefront",
      targetUrl: input.targetUrl,
      expectedValue: input.expectedValue,
      observedValue,
      statusCode: response.status,
    }),
    errorCategory: outcome === "verified" ? null : "storefront_state_mismatch",
  });
}
