import { createHash } from "node:crypto";
import {
  buildP88W06PolicyPreflight,
  buildP88W06ProviderObservation,
  assertP88W06ExactArtifactLineage,
  p88W06DurableSnapshotIssues,
  type P88W06DurableSnapshot,
  type P88W06LineageInput,
  type P88W06PolicyPreflight,
  type P88W06ProviderObservation,
} from "./p8-8-policy-preflight.js";
import {
  p88W02StateFingerprint,
  type P88W02ProductTargetBinding,
} from "./p8-8-governed-proposal-materialization.js";

export const P8_8_W06_SHOPIFY_READ_VERSION =
  "p8-8-w06-shopify-read-v1" as const;
export const P8_8_W06_SHOPIFY_API_VERSION = "2026-07" as const;
export const P8_8_W06_REQUIRED_READ_SCOPE = "read_products" as const;

export type P88W06ShopifyReadCredential = Readonly<{
  siteId: string;
  shopDomain: string;
  accessToken: string;
  scopes: readonly string[];
  readOnly: true;
}>;

export type P88W06SnapshotReader = {
  readSnapshot(input: {
    siteId: string;
    reservationId: string;
  }): Promise<P88W06DurableSnapshot>;
};

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

function assertReadCredential(
  credential: P88W06ShopifyReadCredential,
  siteId: string,
): void {
  if (
    credential.readOnly !== true
    || credential.siteId !== siteId
    || !validShopDomain(credential.shopDomain)
    || !credential.accessToken.trim()
    || !credential.scopes.includes(P8_8_W06_REQUIRED_READ_SCOPE)
    || credential.scopes.some((scope) => /^write_/.test(scope))
  ) {
    throw new Error("p88_w06_read_credential_not_least_privilege");
  }
}

function requestFingerprint(input: {
  siteId: string;
  shopDomain: string;
  resourceGid: string;
  requestId: string | null;
  httpStatus: number | null;
  outcome: string;
}): string {
  return stableHash({
    version: P8_8_W06_SHOPIFY_READ_VERSION,
    purpose: "p8.8_w06_shopify_read_provenance",
    siteId: input.siteId,
    shopDomain: input.shopDomain,
    resourceGid: input.resourceGid,
    field: "meta_description",
    operationName: "SeoEngineW06ProductSeoRead",
    requestId: input.requestId,
    httpStatus: input.httpStatus,
    outcome: input.outcome,
  });
}

function unavailable(input: {
  siteId: string;
  resourceGid: string;
  requestProvenanceFingerprint: string | null;
  errorCategory: string;
}): P88W06ProviderObservation {
  return buildP88W06ProviderObservation({
    status: "unavailable",
    siteId: input.siteId,
    provider: "shopify",
    resourceKind: "product",
    resourceGid: input.resourceGid,
    field: "meta_description",
    rawValue: null,
    observedBeforeFingerprint: null,
    requestProvenanceFingerprint: input.requestProvenanceFingerprint,
    errorCategory: input.errorCategory,
  });
}

function invalidResponse(input: {
  siteId: string;
  resourceGid: string;
  requestProvenanceFingerprint: string | null;
  errorCategory: string;
}): P88W06ProviderObservation {
  return buildP88W06ProviderObservation({
    status: "invalid_response",
    siteId: input.siteId,
    provider: "shopify",
    resourceKind: "product",
    resourceGid: input.resourceGid,
    field: "meta_description",
    rawValue: null,
    observedBeforeFingerprint: null,
    requestProvenanceFingerprint: input.requestProvenanceFingerprint,
    errorCategory: input.errorCategory,
  });
}

const PRODUCT_SEO_QUERY =
  "query SeoEngineW06ProductSeoRead($id: ID!) { "
  + "node(id: $id) { __typename ... on Product { id seo { description } } } "
  + "}";

export async function readP88W06ShopifyProductSeo(input: {
  credential: P88W06ShopifyReadCredential;
  target: P88W02ProductTargetBinding;
  fetchImpl: typeof fetch;
}): Promise<P88W06ProviderObservation> {
  assertReadCredential(input.credential, input.target.siteId);
  if (
    input.target.provider !== "shopify"
    || input.target.domain !== "diamondshelf.us"
    || input.target.resourceKind !== "product"
    || input.target.field !== "meta_description"
  ) {
    throw new Error("p88_w06_shopify_read_target_scope_invalid");
  }

  let response: Response;
  try {
    response = await input.fetchImpl(
      "https://" + input.credential.shopDomain
        + "/admin/api/" + P8_8_W06_SHOPIFY_API_VERSION + "/graphql.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Shopify-Access-Token": input.credential.accessToken,
        },
        body: JSON.stringify({
          query: PRODUCT_SEO_QUERY,
          variables: { id: input.target.resourceGid },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    return unavailable({
      siteId: input.target.siteId,
      resourceGid: input.target.resourceGid,
      requestProvenanceFingerprint: null,
      errorCategory: "shopify_network_unavailable",
    });
  }

  const requestId = response.headers.get("x-request-id")?.trim() || null;
  const provenance = requestFingerprint({
    siteId: input.target.siteId,
    shopDomain: input.credential.shopDomain,
    resourceGid: input.target.resourceGid,
    requestId,
    httpStatus: response.status,
    outcome: response.ok ? "response_received" : "http_unavailable",
  });

  if (!response.ok) {
    return unavailable({
      siteId: input.target.siteId,
      resourceGid: input.target.resourceGid,
      requestProvenanceFingerprint: provenance,
      errorCategory: "shopify_http_" + response.status,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await response.json() as Record<string, unknown>;
  } catch {
    return invalidResponse({
      siteId: input.target.siteId,
      resourceGid: input.target.resourceGid,
      requestProvenanceFingerprint: provenance,
      errorCategory: "shopify_invalid_json",
    });
  }

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    return invalidResponse({
      siteId: input.target.siteId,
      resourceGid: input.target.resourceGid,
      requestProvenanceFingerprint: provenance,
      errorCategory: "shopify_graphql_error",
    });
  }

  const data = body.data && typeof body.data === "object"
    ? body.data as Record<string, unknown>
    : null;
  const node = data?.node && typeof data.node === "object"
    ? data.node as Record<string, unknown>
    : null;

  if (
    !node
    || node.__typename !== "Product"
    || node.id !== input.target.resourceGid
  ) {
    return buildP88W06ProviderObservation({
      status: "identity_mismatch",
      siteId: input.target.siteId,
      provider: "shopify",
      resourceKind: "product",
      resourceGid: input.target.resourceGid,
      field: "meta_description",
      rawValue: null,
      observedBeforeFingerprint: null,
      requestProvenanceFingerprint: provenance,
      errorCategory: "shopify_product_identity_mismatch",
    });
  }

  if (!node.seo || typeof node.seo !== "object") {
    return invalidResponse({
      siteId: input.target.siteId,
      resourceGid: input.target.resourceGid,
      requestProvenanceFingerprint: provenance,
      errorCategory: "shopify_seo_shape_invalid",
    });
  }

  const seo = node.seo as Record<string, unknown>;
  if (seo.description !== null && typeof seo.description !== "string") {
    return invalidResponse({
      siteId: input.target.siteId,
      resourceGid: input.target.resourceGid,
      requestProvenanceFingerprint: provenance,
      errorCategory: "shopify_meta_description_type_invalid",
    });
  }

  const rawValue = seo.description as string | null;
  return buildP88W06ProviderObservation({
    status: "observed",
    siteId: input.target.siteId,
    provider: "shopify",
    resourceKind: "product",
    resourceGid: input.target.resourceGid,
    field: "meta_description",
    rawValue,
    observedBeforeFingerprint: p88W02StateFingerprint({
      target: input.target,
      value: rawValue,
      purpose: "before",
    }),
    requestProvenanceFingerprint: requestFingerprint({
      siteId: input.target.siteId,
      shopDomain: input.credential.shopDomain,
      resourceGid: input.target.resourceGid,
      requestId,
      httpStatus: response.status,
      outcome: "observed",
    }),
    errorCategory: null,
  });
}

export async function runP88W06PolicyPreflight(input: {
  lineage: P88W06LineageInput;
  snapshotReader: P88W06SnapshotReader;
  credential: P88W06ShopifyReadCredential;
  fetchImpl: typeof fetch;
}): Promise<P88W06PolicyPreflight> {
  assertP88W06ExactArtifactLineage(input.lineage);
  const siteId = input.lineage.w05ClaimReceipt.siteId;
  const reservationId = input.lineage.w04Receipt.reservationId;

  const preSnapshot = await input.snapshotReader.readSnapshot({
    siteId,
    reservationId,
  });

  const preIssues = p88W06DurableSnapshotIssues(
    preSnapshot,
    input.lineage,
  );
  if (preIssues.length > 0) {
    const observation = unavailable({
      siteId,
      resourceGid: input.lineage.w05ClaimReceipt.target.resourceGid,
      requestProvenanceFingerprint: null,
      errorCategory: "durable_preflight_uncertain",
    });
    return buildP88W06PolicyPreflight({
      lineage: input.lineage,
      preSnapshot,
      finalSnapshot: preSnapshot,
      providerObservation: observation,
    });
  }

  const observation = await readP88W06ShopifyProductSeo({
    credential: input.credential,
    target: input.lineage.w02Materialization.target,
    fetchImpl: input.fetchImpl,
  });

  const finalSnapshot = await input.snapshotReader.readSnapshot({
    siteId,
    reservationId,
  });

  return buildP88W06PolicyPreflight({
    lineage: input.lineage,
    preSnapshot,
    finalSnapshot,
    providerObservation: observation,
  });
}

export function p88W06ShopifyReadCapability() {
  return Object.freeze({
    version: P8_8_W06_SHOPIFY_READ_VERSION,
    injectedTransportRequired: true,
    globalFetchFallback: false,
    readProductsScopeRequired: true,
    writeScopesRejected: true,
    productOnly: true,
    metaDescriptionOnly: true,
    graphQlQueryOnly: true,
    providerNetworkReadMayBePerformed: true,
    providerDispatchAuthorized: false,
    providerWritePerformed: false,
    publicSiteWritePerformed: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    rollbackWritePerformed: false,
  });
}
