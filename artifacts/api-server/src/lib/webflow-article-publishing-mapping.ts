import {
  assertArticlePublicationPlanIntegrity,
  type ArticlePublicationPlan,
} from "./article-publishing-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_WEBFLOW_ARTICLE_MAPPING_VERSION =
  "ugp-8-1-webflow-article-mapping-v1" as const;

export const WEBFLOW_API_ORIGIN = "https://api.webflow.com" as const;

export type WebflowArticlePublishingMapping = Readonly<{
  version: typeof UGP_WEBFLOW_ARTICLE_MAPPING_VERSION;
  sourcePlanFingerprint: string;
  sourceOperation: ArticlePublicationPlan["operation"];
  apiOrigin: typeof WEBFLOW_API_ORIGIN;
  method: "POST" | "PATCH";
  path: string;
  requiredProviderScope: "cms:write";
  collectionId: string;
  itemId: string | null;
  body: Readonly<Record<string, unknown>>;
  expectedVerificationStateFingerprint: string;
  fieldBinding: Readonly<{
    bodyFieldSlug: string;
  }>;
  deferredFields: readonly [
    "metaDescription",
    "schemaPlan",
    "mediaPlan",
  ];
  semantics: Readonly<{
    mappingOnly: true;
    deterministic: true;
    connectorProvider: "webflow";
    createUsesStagedDraftEndpoint: true;
    updateUsesStagedEndpoint: true;
    publishUsesDedicatedPublishEndpoint: true;
    performsNetworkOperation: false;
    performsPersistence: false;
    usesCredentials: false;
    executionAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  mappingFingerprint: string;
}>;

const OBJECT_ID = /^[0-9a-f]{24}$/;
const SAFE_FIELD_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_ITEM_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const DEFERRED_FIELDS = Object.freeze([
  "metaDescription",
  "schemaPlan",
  "mediaPlan",
] as const);

const SEMANTICS = Object.freeze({
  mappingOnly: true as const,
  deterministic: true as const,
  connectorProvider: "webflow" as const,
  createUsesStagedDraftEndpoint: true as const,
  updateUsesStagedEndpoint: true as const,
  publishUsesDedicatedPublishEndpoint: true as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  usesCredentials: false as const,
  executionAuthorized: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

function exactObjectId(value: unknown, field: string): string {
  if (typeof value !== "string" || !OBJECT_ID.test(value)) {
    throw new Error("ugp_webflow_article_invalid_" + field);
  }
  return value;
}

function exactFieldSlug(value: unknown): string {
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > 128
    || !SAFE_FIELD_SLUG.test(value)
  ) {
    throw new Error("ugp_webflow_article_invalid_body_field_slug");
  }
  if (value === "name" || value === "slug") {
    throw new Error("ugp_webflow_article_reserved_body_field_slug");
  }
  return value;
}

function exactItemSlug(value: unknown): string {
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > 200
    || !SAFE_ITEM_SLUG.test(value)
  ) {
    throw new Error("ugp_webflow_article_invalid_item_slug");
  }
  return value;
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ugp_webflow_article_invalid_" + field);
  }
  return value as Record<string, unknown>;
}

function exactText(value: unknown, field: string, max: number): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > max
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_webflow_article_invalid_" + field);
  }
  return value;
}

function articlePayload(plan: ArticlePublicationPlan): Readonly<{
  title: string;
  content: string;
}> {
  const artifact = plan.mutationIntent.artifact;
  if (artifact.schemaId !== "ugp.article.publication.v1") {
    throw new Error("ugp_webflow_article_unsupported_artifact_schema");
  }
  const root = asObject(artifact.payload, "artifact_payload");
  const article = asObject(root.article, "article_payload");
  const metadata = asObject(article.metadata, "article_metadata");
  return Object.freeze({
    title: exactText(metadata.title, "article_title", 512),
    content: exactText(article.body, "article_body", 2_000_000),
  });
}

function assertWebflowPlan(plan: ArticlePublicationPlan): void {
  assertArticlePublicationPlanIntegrity(plan);
  if (
    plan.mutationIntent.descriptor.provider !== "webflow"
    || plan.mutationIntent.target.provider !== "webflow"
  ) {
    throw new Error("ugp_webflow_article_webflow_plan_required");
  }
  const connection = plan.mutationIntent.descriptor.registry.connection;
  if (
    !connection
    || connection.connectionId
      !== plan.mutationIntent.descriptor.connectionId
    || connection.connectionMode !== "api"
  ) {
    throw new Error("ugp_webflow_article_api_connection_required");
  }
  if (
    plan.mutationIntent.target.kind !== "article"
    && plan.mutationIntent.target.kind !== "blog_post"
  ) {
    throw new Error("ugp_webflow_article_article_target_required");
  }
  if (
    plan.semantics.executionAuthorized !== false
    || plan.semantics.publicationAuthorized !== false
    || plan.semantics.providerWrites !== false
    || plan.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_webflow_article_unsafe_source_plan");
  }
}

export function mapArticlePublicationPlanToWebflow(input: {
  plan: ArticlePublicationPlan;
  collectionId: string;
  itemId?: string | null;
  slug?: string | null;
  bodyFieldSlug: string;
}): WebflowArticlePublishingMapping {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_webflow_article_invalid_input");
  }

  assertWebflowPlan(input.plan);

  const collectionId = exactObjectId(input.collectionId, "collection_id");
  const bodyFieldSlug = exactFieldSlug(input.bodyFieldSlug);
  const article = articlePayload(input.plan);

  let method: "POST" | "PATCH";
  let path: string;
  let itemId: string | null = null;
  let body: Readonly<Record<string, unknown>>;

  if (input.plan.operation === "create") {
    if (input.itemId != null) {
      throw new Error("ugp_webflow_article_create_rejects_item_id");
    }
    const slug = exactItemSlug(input.slug);
    method = "POST";
    path = `/v2/collections/${collectionId}/items/insert`;
    body = Object.freeze({
      items: [
        Object.freeze({
          isDraft: true,
          fieldData: Object.freeze({
            name: article.title,
            slug,
            [bodyFieldSlug]: article.content,
          }),
        }),
      ],
    });
  } else {
    itemId = exactObjectId(input.itemId, "item_id");
    const targetExternalId = input.plan.mutationIntent.target.externalId;
    if (
      targetExternalId !== null
      && OBJECT_ID.test(targetExternalId)
      && targetExternalId !== itemId
    ) {
      throw new Error("ugp_webflow_article_target_item_id_mismatch");
    }

    if (input.plan.operation === "update") {
      method = "PATCH";
      path = `/v2/collections/${collectionId}/items/${itemId}`;
      const slug = input.slug == null ? null : exactItemSlug(input.slug);
      body = Object.freeze({
        fieldData: Object.freeze({
          name: article.title,
          ...(slug === null ? {} : { slug }),
          [bodyFieldSlug]: article.content,
        }),
      });
    } else if (input.plan.operation === "publish") {
      if (input.slug != null) {
        throw new Error(
          "ugp_webflow_article_publish_rejects_content_mutation_fields",
        );
      }
      method = "POST";
      path = `/v2/collections/${collectionId}/items/publish`;
      body = Object.freeze({
        itemIds: Object.freeze([itemId]),
      });
    } else {
      throw new Error("ugp_webflow_article_invalid_operation");
    }
  }

  const base = {
    version: UGP_WEBFLOW_ARTICLE_MAPPING_VERSION,
    sourcePlanFingerprint: input.plan.planFingerprint,
    sourceOperation: input.plan.operation,
    apiOrigin: WEBFLOW_API_ORIGIN,
    method,
    path,
    requiredProviderScope: "cms:write" as const,
    collectionId,
    itemId,
    body,
    expectedVerificationStateFingerprint:
      input.plan.verification.expectedStateFingerprint,
    fieldBinding: Object.freeze({ bodyFieldSlug }),
    deferredFields: DEFERRED_FIELDS,
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    mappingFingerprint: stableEvidenceHash({
      purpose: "ugp_webflow_article_publishing_mapping",
      ...base,
    }),
  });
}

export function assertWebflowArticlePublishingMappingIntegrity(
  mapping: WebflowArticlePublishingMapping,
): void {
  if (
    !mapping
    || mapping.version !== UGP_WEBFLOW_ARTICLE_MAPPING_VERSION
    || mapping.apiOrigin !== WEBFLOW_API_ORIGIN
    || mapping.requiredProviderScope !== "cms:write"
    || !OBJECT_ID.test(mapping.collectionId)
  ) {
    throw new Error("ugp_webflow_article_mapping_shape_invalid");
  }

  const createPath =
    mapping.path === `/v2/collections/${mapping.collectionId}/items/insert`;
  const publishPath =
    mapping.path === `/v2/collections/${mapping.collectionId}/items/publish`;
  const updatePath =
    mapping.itemId !== null
    && OBJECT_ID.test(mapping.itemId)
    && mapping.path
      === `/v2/collections/${mapping.collectionId}/items/${mapping.itemId}`;

  if (
    (createPath && mapping.method !== "POST")
    || (publishPath && mapping.method !== "POST")
    || (updatePath && mapping.method !== "PATCH")
    || (!createPath && !publishPath && !updatePath)
  ) {
    throw new Error("ugp_webflow_article_mapping_route_invalid");
  }

  if (
    mapping.semantics.mappingOnly !== true
    || mapping.semantics.deterministic !== true
    || mapping.semantics.connectorProvider !== "webflow"
    || mapping.semantics.createUsesStagedDraftEndpoint !== true
    || mapping.semantics.updateUsesStagedEndpoint !== true
    || mapping.semantics.publishUsesDedicatedPublishEndpoint !== true
    || mapping.semantics.performsNetworkOperation !== false
    || mapping.semantics.performsPersistence !== false
    || mapping.semantics.usesCredentials !== false
    || mapping.semantics.executionAuthorized !== false
    || mapping.semantics.providerWrites !== false
    || mapping.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_webflow_article_mapping_unsafe_semantics");
  }

  exactFieldSlug(mapping.fieldBinding.bodyFieldSlug);

  if (
    mapping.deferredFields.length !== 3
    || mapping.deferredFields[0] !== "metaDescription"
    || mapping.deferredFields[1] !== "schemaPlan"
    || mapping.deferredFields[2] !== "mediaPlan"
  ) {
    throw new Error("ugp_webflow_article_mapping_deferred_field_drift");
  }

  const { mappingFingerprint, ...base } = mapping;
  const expected = stableEvidenceHash({
    purpose: "ugp_webflow_article_publishing_mapping",
    ...base,
  });
  if (mappingFingerprint !== expected) {
    throw new Error("ugp_webflow_article_mapping_fingerprint_mismatch");
  }
}
