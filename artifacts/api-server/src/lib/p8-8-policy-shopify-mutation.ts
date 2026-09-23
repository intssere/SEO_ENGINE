import {
  p88W07StableHash,
  type P88W07ExecutionIntent,
} from "./p8-8-policy-single-action-apply.js";

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

export type P88W07ShopifyUserError = Readonly<{
  field: readonly string[];
  message: string;
}>;

export type P88W07ShopifyMutationResult =
  | Readonly<{
      version: typeof P8_8_W07_SHOPIFY_MUTATION_VERSION;
      kind: "accepted";
      purpose: "forward" | "rollback";
      requestId: string | null;
      operationFingerprint: string;
      responseFingerprint: string;
      returnedResourceGid: string;
      returnedRawValue: string | null;
      userErrors: readonly [];
      providerMutationCalled: true;
      providerWriteOutcomeCertain: true;
      retryAllowed: false;
    }>
  | Readonly<{
      version: typeof P8_8_W07_SHOPIFY_MUTATION_VERSION;
      kind: "rejected";
      purpose: "forward" | "rollback";
      requestId: string | null;
      operationFingerprint: string;
      responseFingerprint: string;
      returnedResourceGid: string | null;
      returnedRawValue: string | null;
      userErrors: readonly P88W07ShopifyUserError[];
      providerMutationCalled: true;
      providerWriteOutcomeCertain: true;
      retryAllowed: false;
    }>
  | Readonly<{
      version: typeof P8_8_W07_SHOPIFY_MUTATION_VERSION;
      kind: "uncertain";
      purpose: "forward" | "rollback";
      requestId: string | null;
      operationFingerprint: string;
      responseFingerprint: string | null;
      errorCategory: string;
      providerMutationCalled: true;
      providerWriteOutcomeCertain: false;
      retryAllowed: false;
    }>;

function validShopDomain(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value);
}

function canonicalUserErrors(value: unknown): readonly P88W07ShopifyUserError[] | null {
  if (!Array.isArray(value)) return null;
  const errors: P88W07ShopifyUserError[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (typeof row.message !== "string") return null;
    const field = row.field === null || row.field === undefined
      ? []
      : Array.isArray(row.field) && row.field.every((entry) => typeof entry === "string")
        ? [...row.field] as string[]
        : null;
    if (field === null) return null;
    errors.push(Object.freeze({
      field: Object.freeze(field),
      message: row.message,
    }));
  }
  return Object.freeze(errors.sort((left, right) =>
    (left.field.join(".") + "\u0000" + left.message)
      .localeCompare(right.field.join(".") + "\u0000" + right.message)
  ));
}

function assertCredential(
  intent: P88W07ExecutionIntent,
  credential: P88W07ShopifyWriteCredential,
): void {
  if (
    credential.siteId !== intent.siteId
    || credential.credentialProfileId !== intent.credentialProfileId
    || !validShopDomain(credential.shopDomain)
    || !credential.accessToken.trim()
    || !credential.scopes.includes("write_products")
    || credential.scopes.some(
      (scope) => scope.startsWith("write_") && scope !== "write_products",
    )
  ) {
    throw new Error("p88_w07_shopify_write_credential_invalid");
  }
}

const PRODUCT_SEO_MUTATION =
  "mutation SeoEngineW07ProductSeoWrite($product: ProductUpdateInput!) { "
  + "productUpdate(product: $product) { "
  + "product { id seo { description } } "
  + "userErrors { field message } "
  + "} }";

export async function mutateP88W07ShopifyProductSeo(input: {
  intent: P88W07ExecutionIntent;
  credential: P88W07ShopifyWriteCredential;
  purpose: "forward" | "rollback";
  fetchImpl: typeof fetch;
}): Promise<P88W07ShopifyMutationResult> {
  assertCredential(input.intent, input.credential);
  const exactValue = input.purpose === "forward"
    ? input.intent.state.afterValue
    : input.intent.state.beforeValue;

  const variables = {
    product: {
      id: input.intent.target.resourceGid,
      seo: {
        description: exactValue,
      },
    },
  };
  const operationFingerprint = p88W07StableHash({
    version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
    purpose: input.purpose,
    shopDomain: input.credential.shopDomain,
    operationName: "SeoEngineW07ProductSeoWrite",
    resourceGid: input.intent.target.resourceGid,
    field: input.intent.target.field,
    exactValue,
    variables,
  });

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
        body: JSON.stringify({
          query: PRODUCT_SEO_MUTATION,
          variables,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      kind: "uncertain",
      purpose: input.purpose,
      requestId: null,
      operationFingerprint,
      responseFingerprint: null,
      errorCategory: "shopify_transport_uncertain",
      providerMutationCalled: true,
      providerWriteOutcomeCertain: false,
      retryAllowed: false,
    });
  }

  const requestId = response.headers.get("x-request-id")?.trim() || null;
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      kind: "uncertain",
      purpose: input.purpose,
      requestId,
      operationFingerprint,
      responseFingerprint: null,
      errorCategory: response.ok
        ? "shopify_invalid_json_after_mutation"
        : "shopify_http_response_uncertain",
      providerMutationCalled: true,
      providerWriteOutcomeCertain: false,
      retryAllowed: false,
    });
  }

  const responseFingerprint = p88W07StableHash({
    version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
    purpose: input.purpose,
    requestId,
    httpStatus: response.status,
    body,
  });

  if (!response.ok) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      kind: "uncertain",
      purpose: input.purpose,
      requestId,
      operationFingerprint,
      responseFingerprint,
      errorCategory: "shopify_http_" + response.status + "_outcome_uncertain",
      providerMutationCalled: true,
      providerWriteOutcomeCertain: false,
      retryAllowed: false,
    });
  }

  if (!body || typeof body !== "object") {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      kind: "uncertain",
      purpose: input.purpose,
      requestId,
      operationFingerprint,
      responseFingerprint,
      errorCategory: "shopify_invalid_graphql_shape",
      providerMutationCalled: true,
      providerWriteOutcomeCertain: false,
      retryAllowed: false,
    });
  }

  const root = body as Record<string, unknown>;
  if (Array.isArray(root.errors) && root.errors.length > 0) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      kind: "uncertain",
      purpose: input.purpose,
      requestId,
      operationFingerprint,
      responseFingerprint,
      errorCategory: "shopify_top_level_graphql_error",
      providerMutationCalled: true,
      providerWriteOutcomeCertain: false,
      retryAllowed: false,
    });
  }

  const data = root.data && typeof root.data === "object"
    ? root.data as Record<string, unknown>
    : null;
  const payload = data?.productUpdate && typeof data.productUpdate === "object"
    ? data.productUpdate as Record<string, unknown>
    : null;
  if (!payload) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      kind: "uncertain",
      purpose: input.purpose,
      requestId,
      operationFingerprint,
      responseFingerprint,
      errorCategory: "shopify_product_update_payload_missing",
      providerMutationCalled: true,
      providerWriteOutcomeCertain: false,
      retryAllowed: false,
    });
  }

  const userErrors = canonicalUserErrors(payload.userErrors);
  if (userErrors === null) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      kind: "uncertain",
      purpose: input.purpose,
      requestId,
      operationFingerprint,
      responseFingerprint,
      errorCategory: "shopify_user_errors_shape_invalid",
      providerMutationCalled: true,
      providerWriteOutcomeCertain: false,
      retryAllowed: false,
    });
  }

  const product = payload.product && typeof payload.product === "object"
    ? payload.product as Record<string, unknown>
    : null;
  const returnedResourceGid =
    product && typeof product.id === "string" ? product.id : null;
  const seo = product?.seo && typeof product.seo === "object"
    ? product.seo as Record<string, unknown>
    : null;
  const returnedRawValue =
    seo && (seo.description === null || typeof seo.description === "string")
      ? seo.description as string | null
      : null;

  if (userErrors.length > 0) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      kind: "rejected",
      purpose: input.purpose,
      requestId,
      operationFingerprint,
      responseFingerprint,
      returnedResourceGid,
      returnedRawValue,
      userErrors,
      providerMutationCalled: true,
      providerWriteOutcomeCertain: true,
      retryAllowed: false,
    });
  }

  if (returnedResourceGid !== input.intent.target.resourceGid || !seo) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      kind: "uncertain",
      purpose: input.purpose,
      requestId,
      operationFingerprint,
      responseFingerprint,
      errorCategory: "shopify_product_identity_or_seo_response_uncertain",
      providerMutationCalled: true,
      providerWriteOutcomeCertain: false,
      retryAllowed: false,
    });
  }

  return Object.freeze({
    version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
    kind: "accepted",
    purpose: input.purpose,
    requestId,
    operationFingerprint,
    responseFingerprint,
    returnedResourceGid,
    returnedRawValue,
    userErrors: Object.freeze([]) as readonly [],
    providerMutationCalled: true,
    providerWriteOutcomeCertain: true,
    retryAllowed: false,
  });
}

export function p88W07ShopifyMutationCapability() {
  return Object.freeze({
    version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
    apiVersion: P8_8_W07_SHOPIFY_API_VERSION,
    injectedTransportRequired: true,
    globalFetchFallback: false,
    exactCredentialProfileRequired: true,
    writeProductsScopeRequired: true,
    unrelatedWriteScopesRejected: true,
    productUpdateOnly: true,
    productSeoDescriptionOnly: true,
    exactW02BytesPreserved: true,
    automaticRetryAllowed: false,
    task53MutationHelperUsed: false,
    task54ExecutionUsed: false,
  });
}
