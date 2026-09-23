import { createHash } from "node:crypto";
import type {
  P88W07WriteCredentialBinding,
} from "./p8-8-policy-single-action-apply.js";

export const P8_8_W07_SHOPIFY_MUTATION_VERSION =
  "p8-8-w07-shopify-product-meta-description-write-v1" as const;
export const P8_8_W07_SHOPIFY_API_VERSION = "2026-07" as const;

export type P88W07ShopifyWriteCredential =
  P88W07WriteCredentialBinding & Readonly<{
    accessToken: string;
  }>;

export type P88W07ShopifyMutationReceipt = Readonly<{
  version: typeof P8_8_W07_SHOPIFY_MUTATION_VERSION;
  phase: "forward" | "rollback";
  status: "accepted" | "rejected" | "ambiguous";
  siteId: string;
  credentialProfileId: string;
  shopDomain: string;
  resourceGid: string;
  field: "meta_description";
  exactValueFingerprint: string;
  providerRequestId: string | null;
  requestFingerprint: string;
  responseFingerprint: string | null;
  errorCategory: string | null;
  userErrorFingerprints: readonly string[];
  providerMutationAttempted: true;
  automaticRetryPerformed: false;
  publicWriteOccurrence: "none" | "possible" | "confirmed";
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

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function validShopDomain(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value);
}

function assertCredential(input: {
  credential: P88W07ShopifyWriteCredential;
  expectedCredentialProfileId: string;
  expectedSiteId: string;
}): void {
  const { credential } = input;
  if (
    credential.writeOnlyForThisOperation !== true
    || credential.credentialProfileId !== input.expectedCredentialProfileId
    || credential.siteId !== input.expectedSiteId
    || !validShopDomain(credential.shopDomain)
    || !credential.accessToken.trim()
    || !credential.scopes.includes("write_products")
  ) {
    throw new Error("p88_w07_shopify_write_credential_invalid");
  }
}

const PRODUCT_META_DESCRIPTION_MUTATION =
  "mutation SeoEngineW07ProductMetaDescription($product: ProductUpdateInput!) { "
  + "productUpdate(product: $product) { "
  + "product { id seo { description } } "
  + "userErrors { field message } "
  + "} }";

export async function mutateP88W07ShopifyMetaDescription(input: {
  phase: "forward" | "rollback";
  credential: P88W07ShopifyWriteCredential;
  expectedCredentialProfileId: string;
  expectedSiteId: string;
  resourceGid: string;
  exactValue: string | null;
  fetchImpl: typeof fetch;
}): Promise<P88W07ShopifyMutationReceipt> {
  assertCredential(input);
  if (!/^gid:\/\/shopify\/Product\/[1-9][0-9]*$/.test(input.resourceGid)) {
    throw new Error("p88_w07_shopify_product_gid_invalid");
  }

  const requestPayload = {
    query: PRODUCT_META_DESCRIPTION_MUTATION,
    variables: {
      product: {
        id: input.resourceGid,
        seo: {
          description: input.exactValue,
        },
      },
    },
  };
  const exactValueFingerprint = stableHash({
    purpose: "p8.8_w07_exact_provider_write_value",
    resourceGid: input.resourceGid,
    field: "meta_description",
    value: input.exactValue,
  });
  const requestFingerprint = stableHash({
    version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
    phase: input.phase,
    siteId: input.expectedSiteId,
    credentialProfileId: input.expectedCredentialProfileId,
    shopDomain: input.credential.shopDomain,
    resourceGid: input.resourceGid,
    field: "meta_description",
    exactValueFingerprint,
    operationName: "SeoEngineW07ProductMetaDescription",
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
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      phase: input.phase,
      status: "ambiguous" as const,
      siteId: input.expectedSiteId,
      credentialProfileId: input.expectedCredentialProfileId,
      shopDomain: input.credential.shopDomain,
      resourceGid: input.resourceGid,
      field: "meta_description" as const,
      exactValueFingerprint,
      providerRequestId: null,
      requestFingerprint,
      responseFingerprint: null,
      errorCategory: "shopify_transport_outcome_uncertain",
      userErrorFingerprints: Object.freeze([]) as readonly string[],
      providerMutationAttempted: true as const,
      automaticRetryPerformed: false as const,
      publicWriteOccurrence: "possible" as const,
    });
  }

  const providerRequestId = response.headers.get("x-request-id")?.trim() || null;
  let body: Record<string, unknown>;
  try {
    body = await response.json() as Record<string, unknown>;
  } catch {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      phase: input.phase,
      status: "ambiguous" as const,
      siteId: input.expectedSiteId,
      credentialProfileId: input.expectedCredentialProfileId,
      shopDomain: input.credential.shopDomain,
      resourceGid: input.resourceGid,
      field: "meta_description" as const,
      exactValueFingerprint,
      providerRequestId,
      requestFingerprint,
      responseFingerprint: null,
      errorCategory: "shopify_invalid_response",
      userErrorFingerprints: Object.freeze([]) as readonly string[],
      providerMutationAttempted: true as const,
      automaticRetryPerformed: false as const,
      publicWriteOccurrence: "possible" as const,
    });
  }

  const responseFingerprint = stableHash({
    httpStatus: response.status,
    body,
  });

  if (!response.ok || (Array.isArray(body.errors) && body.errors.length > 0)) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      phase: input.phase,
      status: "ambiguous" as const,
      siteId: input.expectedSiteId,
      credentialProfileId: input.expectedCredentialProfileId,
      shopDomain: input.credential.shopDomain,
      resourceGid: input.resourceGid,
      field: "meta_description" as const,
      exactValueFingerprint,
      providerRequestId,
      requestFingerprint,
      responseFingerprint,
      errorCategory: !response.ok
        ? "shopify_http_" + response.status
        : "shopify_graphql_top_level_error",
      userErrorFingerprints: Object.freeze([]) as readonly string[],
      providerMutationAttempted: true as const,
      automaticRetryPerformed: false as const,
      publicWriteOccurrence: "possible" as const,
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
      phase: input.phase,
      status: "ambiguous" as const,
      siteId: input.expectedSiteId,
      credentialProfileId: input.expectedCredentialProfileId,
      shopDomain: input.credential.shopDomain,
      resourceGid: input.resourceGid,
      field: "meta_description" as const,
      exactValueFingerprint,
      providerRequestId,
      requestFingerprint,
      responseFingerprint,
      errorCategory: "shopify_product_update_payload_missing",
      userErrorFingerprints: Object.freeze([]) as readonly string[],
      providerMutationAttempted: true as const,
      automaticRetryPerformed: false as const,
      publicWriteOccurrence: "possible" as const,
    });
  }

  const rawUserErrors = Array.isArray(payload.userErrors)
    ? payload.userErrors
    : [];
  const userErrorFingerprints = Object.freeze(
    rawUserErrors.map((entry) => stableHash({
      purpose: "p8.8_w07_shopify_user_error",
      field:
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>).field ?? null
          : null,
      message:
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>).message ?? null
          : null,
    })),
  );
  if (userErrorFingerprints.length > 0) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      phase: input.phase,
      status: "rejected" as const,
      siteId: input.expectedSiteId,
      credentialProfileId: input.expectedCredentialProfileId,
      shopDomain: input.credential.shopDomain,
      resourceGid: input.resourceGid,
      field: "meta_description" as const,
      exactValueFingerprint,
      providerRequestId,
      requestFingerprint,
      responseFingerprint,
      errorCategory: "shopify_user_error",
      userErrorFingerprints,
      providerMutationAttempted: true as const,
      automaticRetryPerformed: false as const,
      publicWriteOccurrence: "none" as const,
    });
  }

  const product = payload.product && typeof payload.product === "object"
    ? payload.product as Record<string, unknown>
    : null;
  if (!product || product.id !== input.resourceGid) {
    return Object.freeze({
      version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
      phase: input.phase,
      status: "ambiguous" as const,
      siteId: input.expectedSiteId,
      credentialProfileId: input.expectedCredentialProfileId,
      shopDomain: input.credential.shopDomain,
      resourceGid: input.resourceGid,
      field: "meta_description" as const,
      exactValueFingerprint,
      providerRequestId,
      requestFingerprint,
      responseFingerprint,
      errorCategory: "shopify_product_identity_mismatch",
      userErrorFingerprints,
      providerMutationAttempted: true as const,
      automaticRetryPerformed: false as const,
      publicWriteOccurrence: "possible" as const,
    });
  }

  return Object.freeze({
    version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
    phase: input.phase,
    status: "accepted" as const,
    siteId: input.expectedSiteId,
    credentialProfileId: input.expectedCredentialProfileId,
    shopDomain: input.credential.shopDomain,
    resourceGid: input.resourceGid,
    field: "meta_description" as const,
    exactValueFingerprint,
    providerRequestId,
    requestFingerprint,
    responseFingerprint,
    errorCategory: null,
    userErrorFingerprints,
    providerMutationAttempted: true as const,
    automaticRetryPerformed: false as const,
    publicWriteOccurrence: "confirmed" as const,
  });
}

export function p88W07ShopifyMutationCapability() {
  return Object.freeze({
    version: P8_8_W07_SHOPIFY_MUTATION_VERSION,
    injectedTransportRequired: true,
    globalFetchFallback: false,
    productUpdateOnly: true,
    productMetaDescriptionOnly: true,
    exactValuePreserved: true,
    automaticForwardRetryAllowed: false,
    automaticRollbackRetryAllowed: false,
    task53MutationHelperUsed: false,
    task54PersistentApplyUsed: false,
  });
}
