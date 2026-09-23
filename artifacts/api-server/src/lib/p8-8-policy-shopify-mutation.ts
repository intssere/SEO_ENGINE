import { createHash } from "node:crypto";
import type { P88W07ExecutionIntent } from "./p8-8-policy-single-action-apply.js";

export const P8_8_W07_SHOPIFY_MUTATION_VERSION =
  "p8-8-w07-shopify-product-seo-mutation-v1" as const;
export const P8_8_W07_SHOPIFY_API_VERSION = "2026-07" as const;

export type P88W07ShopifyWriteCredential = Readonly<{
  siteId: string;
  credentialProfileId: string;
  shopDomain: string;
  accessToken: string;
  scopes: readonly string[];
}>;

export type P88W07PreparedMutation = Readonly<{
  version: typeof P8_8_W07_SHOPIFY_MUTATION_VERSION;
  direction: "forward" | "rollback";
  siteId: string;
  credentialProfileId: string;
  resourceGid: string;
  field: "meta_description";
  exactValue: string | null;
  expectedStateFingerprint: string;
  operationName: "SeoEngineW07ProductSeoWrite";
  requestBody: string;
  requestFingerprint: string;
}>;

export type P88W07MutationResult = Readonly<{
  version: typeof P8_8_W07_SHOPIFY_MUTATION_VERSION;
  direction: "forward" | "rollback";
  outcome: "accepted" | "rejected" | "uncertain";
  requestFingerprint: string;
  requestId: string | null;
  httpStatus: number | null;
  responseFingerprint: string | null;
  userErrors: readonly Readonly<{
    field: readonly string[];
    message: string;
  }>[];
  providerMutationCalled: true;
  providerWriteOccurrence: "confirmed" | "possible";
  automaticRetryPerformed: false;
}>;

const MUTATION =
  "mutation SeoEngineW07ProductSeoWrite($product: ProductUpdateInput!) { "
  + "productUpdate(product: $product) { "
  + "product { id seo { description } } "
  + "userErrors { field message } "
  + "} }";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stable(nested)]),
    );
  }
  return value;
}

function hash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}

function validShopDomain(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value);
}

function assertCredential(
  credential: P88W07ShopifyWriteCredential,
  prepared: P88W07PreparedMutation,
): void {
  if (
    credential.siteId !== prepared.siteId
    || credential.credentialProfileId !== prepared.credentialProfileId
    || !validShopDomain(credential.shopDomain)
    || !credential.accessToken.trim()
  ) {
    throw new Error("p88_w07_write_credential_binding_invalid");
  }
  if (!credential.scopes.includes("write_products")) {
    throw new Error("p88_w07_write_products_scope_missing");
  }
}

export function prepareP88W07ShopifyMutation(input: {
  intent: P88W07ExecutionIntent;
  direction: "forward" | "rollback";
}): P88W07PreparedMutation {
  const exactValue = input.direction === "forward"
    ? input.intent.state.afterValue
    : input.intent.state.beforeValue;
  const expectedStateFingerprint = input.direction === "forward"
    ? input.intent.state.afterFingerprint
    : input.intent.state.beforeFingerprint;
  const requestBody = JSON.stringify({
    query: MUTATION,
    variables: {
      product: {
        id: input.intent.target.resourceGid,
        seo: {
          description: exactValue,
        },
      },
    },
  });
  const base = {
    version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
    direction: input.direction,
    siteId: input.intent.siteId,
    credentialProfileId: input.intent.credentialProfileId,
    resourceGid: input.intent.target.resourceGid,
    field: "meta_description" as const,
    exactValue,
    expectedStateFingerprint,
    operationName: "SeoEngineW07ProductSeoWrite" as const,
    requestBody,
  };
  return Object.freeze({
    ...base,
    requestFingerprint: hash({
      purpose: "p8.8_w07_shopify_mutation_request",
      ...base,
    }),
  });
}

export async function sendP88W07ShopifyMutation(input: {
  prepared: P88W07PreparedMutation;
  credential: P88W07ShopifyWriteCredential;
  fetchImpl: typeof fetch;
}): Promise<P88W07MutationResult> {
  assertCredential(input.credential, input.prepared);

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
        body: input.prepared.requestBody,
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      direction: input.prepared.direction,
      outcome: "uncertain" as const,
      requestFingerprint: input.prepared.requestFingerprint,
      requestId: null,
      httpStatus: null,
      responseFingerprint: null,
      userErrors: Object.freeze([]),
      providerMutationCalled: true as const,
      providerWriteOccurrence: "possible" as const,
      automaticRetryPerformed: false as const,
    });
  }

  const requestId = response.headers.get("x-request-id")?.trim() || null;
  if (!response.ok) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      direction: input.prepared.direction,
      outcome: "uncertain" as const,
      requestFingerprint: input.prepared.requestFingerprint,
      requestId,
      httpStatus: response.status,
      responseFingerprint: hash({
        purpose: "p8.8_w07_shopify_mutation_http_error",
        status: response.status,
        requestId,
      }),
      userErrors: Object.freeze([]),
      providerMutationCalled: true as const,
      providerWriteOccurrence: "possible" as const,
      automaticRetryPerformed: false as const,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await response.json() as Record<string, unknown>;
  } catch {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      direction: input.prepared.direction,
      outcome: "uncertain" as const,
      requestFingerprint: input.prepared.requestFingerprint,
      requestId,
      httpStatus: response.status,
      responseFingerprint: hash({
        purpose: "p8.8_w07_shopify_mutation_invalid_json",
        status: response.status,
        requestId,
      }),
      userErrors: Object.freeze([]),
      providerMutationCalled: true as const,
      providerWriteOccurrence: "possible" as const,
      automaticRetryPerformed: false as const,
    });
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      direction: input.prepared.direction,
      outcome: "uncertain" as const,
      requestFingerprint: input.prepared.requestFingerprint,
      requestId,
      httpStatus: response.status,
      responseFingerprint: hash({
        purpose: "p8.8_w07_shopify_mutation_graphql_error",
        requestId,
        errors: body.errors,
      }),
      userErrors: Object.freeze([]),
      providerMutationCalled: true as const,
      providerWriteOccurrence: "possible" as const,
      automaticRetryPerformed: false as const,
    });
  }

  const data = body.data && typeof body.data === "object"
    ? body.data as Record<string, unknown>
    : null;
  const payload = data?.productUpdate && typeof data.productUpdate === "object"
    ? data.productUpdate as Record<string, unknown>
    : null;
  if (!payload) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      direction: input.prepared.direction,
      outcome: "uncertain" as const,
      requestFingerprint: input.prepared.requestFingerprint,
      requestId,
      httpStatus: response.status,
      responseFingerprint: hash({
        purpose: "p8.8_w07_shopify_mutation_payload_missing",
        requestId,
      }),
      userErrors: Object.freeze([]),
      providerMutationCalled: true as const,
      providerWriteOccurrence: "possible" as const,
      automaticRetryPerformed: false as const,
    });
  }

  const rawErrors = Array.isArray(payload.userErrors)
    ? payload.userErrors
    : null;
  if (!rawErrors) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      direction: input.prepared.direction,
      outcome: "uncertain" as const,
      requestFingerprint: input.prepared.requestFingerprint,
      requestId,
      httpStatus: response.status,
      responseFingerprint: hash({
        purpose: "p8.8_w07_shopify_mutation_user_errors_invalid",
        requestId,
      }),
      userErrors: Object.freeze([]),
      providerMutationCalled: true as const,
      providerWriteOccurrence: "possible" as const,
      automaticRetryPerformed: false as const,
    });
  }

  const userErrors = rawErrors.map((entry) => {
    const object = entry && typeof entry === "object"
      ? entry as Record<string, unknown>
      : {};
    return Object.freeze({
      field: Object.freeze(
        Array.isArray(object.field)
          ? object.field.filter((value): value is string => typeof value === "string")
          : [],
      ),
      message: typeof object.message === "string"
        ? object.message
        : "unknown_user_error",
    });
  });
  const responseFingerprint = hash({
    purpose: "p8.8_w07_shopify_mutation_response",
    requestId,
    status: response.status,
    userErrors,
    productId:
      payload.product && typeof payload.product === "object"
        ? (payload.product as Record<string, unknown>).id ?? null
        : null,
  });

  if (userErrors.length > 0) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      direction: input.prepared.direction,
      outcome: "rejected" as const,
      requestFingerprint: input.prepared.requestFingerprint,
      requestId,
      httpStatus: response.status,
      responseFingerprint,
      userErrors: Object.freeze(userErrors),
      providerMutationCalled: true as const,
      providerWriteOccurrence: "possible" as const,
      automaticRetryPerformed: false as const,
    });
  }

  const product = payload.product && typeof payload.product === "object"
    ? payload.product as Record<string, unknown>
    : null;
  if (!product || product.id !== input.prepared.resourceGid) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      direction: input.prepared.direction,
      outcome: "uncertain" as const,
      requestFingerprint: input.prepared.requestFingerprint,
      requestId,
      httpStatus: response.status,
      responseFingerprint,
      userErrors: Object.freeze([]),
      providerMutationCalled: true as const,
      providerWriteOccurrence: "possible" as const,
      automaticRetryPerformed: false as const,
    });
  }

  return Object.freeze({
    version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
    direction: input.prepared.direction,
    outcome: "accepted" as const,
    requestFingerprint: input.prepared.requestFingerprint,
    requestId,
    httpStatus: response.status,
    responseFingerprint,
    userErrors: Object.freeze([]),
    providerMutationCalled: true as const,
    providerWriteOccurrence: "confirmed" as const,
    automaticRetryPerformed: false as const,
  });
}

export function p88W07ShopifyMutationCapability() {
  return Object.freeze({
    version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
    productOnly: true,
    metaDescriptionOnly: true,
    exactW02Bytes: true,
    injectedTransportRequired: true,
    globalFetchFallback: false,
    automaticRetryAllowed: false,
    task53MutationHelperUsed: false,
    task54ExecutionHelperUsed: false,
    mutationRequiresDurableDispatchFence: true,
    liveExecutionDefaultOff: true,
  });
}
