import {
  assertArticlePublicationPlanIntegrity,
  type ArticlePublicationPlan,
} from "./article-publishing-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_SHOPIFY_ARTICLE_MAPPING_VERSION =
  "ugp-8-1-shopify-blog-article-mapping-v1" as const;

export const UGP_SHOPIFY_ARTICLE_ADMIN_API_VERSION = "2026-07" as const;

export type ShopifyArticleGraphqlOperation =
  | "articleCreate"
  | "articleUpdate";

export type ShopifyArticlePublishingMapping = Readonly<{
  version: typeof UGP_SHOPIFY_ARTICLE_MAPPING_VERSION;
  sourcePlanFingerprint: string;
  sourceOperation: ArticlePublicationPlan["operation"];
  adminApiVersion: typeof UGP_SHOPIFY_ARTICLE_ADMIN_API_VERSION;
  graphqlOperation: ShopifyArticleGraphqlOperation;
  requiredAnyScopes: readonly ["write_content", "write_online_store_pages"];
  variables: Readonly<Record<string, unknown>>;
  expectedVerificationStateFingerprint: string;
  semantics: Readonly<{
    mappingOnly: true;
    deterministic: true;
    connectorProvider: "shopify";
    createDoesNotPublish: true;
    updatePreservesPublicationState: true;
    publishDoesNotRewriteArticleBody: true;
    performsNetworkOperation: false;
    performsPersistence: false;
    usesCredentials: false;
    executionAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  mappingFingerprint: string;
}>;

const BLOG_GID = /^gid:\/\/shopify\/Blog\/[1-9][0-9]*$/;
const ARTICLE_GID = /^gid:\/\/shopify\/Article\/[1-9][0-9]*$/;
const SAFE_HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_AUTHOR = 160;
const MAX_HANDLE = 255;

const SEMANTICS = Object.freeze({
  mappingOnly: true as const,
  deterministic: true as const,
  connectorProvider: "shopify" as const,
  createDoesNotPublish: true as const,
  updatePreservesPublicationState: true as const,
  publishDoesNotRewriteArticleBody: true as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  usesCredentials: false as const,
  executionAuthorized: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

const REQUIRED_ANY_SCOPES = Object.freeze([
  "write_content",
  "write_online_store_pages",
] as const);

function exactText(value: unknown, field: string, max: number): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > max
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_shopify_article_invalid_" + field);
  }
  return value;
}

function exactBlogGid(value: unknown): string {
  const gid = exactText(value, "blog_gid", 128);
  if (!BLOG_GID.test(gid)) {
    throw new Error("ugp_shopify_article_invalid_blog_gid");
  }
  return gid;
}

function exactArticleGid(value: unknown): string {
  const gid = exactText(value, "article_gid", 128);
  if (!ARTICLE_GID.test(gid)) {
    throw new Error("ugp_shopify_article_invalid_article_gid");
  }
  return gid;
}

function exactHandle(value: unknown): string | null {
  if (value == null) return null;
  const handle = exactText(value, "handle", MAX_HANDLE);
  if (!SAFE_HANDLE.test(handle)) {
    throw new Error("ugp_shopify_article_invalid_handle");
  }
  return handle;
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw new Error("ugp_shopify_article_invalid_" + field);
  }
  return value as Record<string, unknown>;
}

function articlePayload(plan: ArticlePublicationPlan): Readonly<{
  title: string;
  body: string;
}> {
  const artifact = plan.mutationIntent.artifact;
  if (artifact.schemaId !== "ugp.article.publication.v1") {
    throw new Error("ugp_shopify_article_unsupported_artifact_schema");
  }
  const root = asObject(artifact.payload, "artifact_payload");
  const article = asObject(root.article, "article_payload");
  const metadata = asObject(article.metadata, "article_metadata");
  return Object.freeze({
    title: exactText(metadata.title, "article_title", 512),
    body: exactText(article.body, "article_body", 2_000_000),
  });
}

function assertShopifyPlan(plan: ArticlePublicationPlan): void {
  assertArticlePublicationPlanIntegrity(plan);
  if (
    plan.mutationIntent.descriptor.provider !== "shopify"
    || plan.mutationIntent.target.provider !== "shopify"
  ) {
    throw new Error("ugp_shopify_article_shopify_plan_required");
  }
  if (
    plan.mutationIntent.target.kind !== "article"
    && plan.mutationIntent.target.kind !== "blog_post"
  ) {
    throw new Error("ugp_shopify_article_article_target_required");
  }
  if (
    plan.semantics.executionAuthorized !== false
    || plan.semantics.publicationAuthorized !== false
    || plan.semantics.providerWrites !== false
    || plan.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_shopify_article_unsafe_source_plan");
  }
}

export function mapArticlePublicationPlanToShopify(input: {
  plan: ArticlePublicationPlan;
  blogId: string;
  articleId?: string | null;
  authorName?: string | null;
  handle?: string | null;
}): ShopifyArticlePublishingMapping {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_shopify_article_invalid_input");
  }

  assertShopifyPlan(input.plan);
  const blogId = exactBlogGid(input.blogId);
  const article = articlePayload(input.plan);
  const handle = exactHandle(input.handle ?? null);
  const authorName = input.authorName == null
    ? null
    : exactText(input.authorName, "author_name", MAX_AUTHOR);

  let graphqlOperation: ShopifyArticleGraphqlOperation;
  let variables: Readonly<Record<string, unknown>>;

  if (input.plan.operation === "create") {
    if (input.articleId != null) {
      throw new Error("ugp_shopify_article_create_rejects_article_id");
    }
    if (authorName === null) {
      throw new Error("ugp_shopify_article_create_requires_author");
    }
    graphqlOperation = "articleCreate";
    variables = Object.freeze({
      article: Object.freeze({
        blogId,
        title: article.title,
        body: article.body,
        author: Object.freeze({ name: authorName }),
        ...(handle === null ? {} : { handle }),
        isPublished: false,
      }),
    });
  } else {
    const articleId = exactArticleGid(input.articleId);
    const targetExternalId = input.plan.mutationIntent.target.externalId;
    if (
      targetExternalId !== null
      && ARTICLE_GID.test(targetExternalId)
      && targetExternalId !== articleId
    ) {
      throw new Error("ugp_shopify_article_target_article_id_mismatch");
    }

    graphqlOperation = "articleUpdate";
    if (input.plan.operation === "update") {
      variables = Object.freeze({
        id: articleId,
        article: Object.freeze({
          blogId,
          title: article.title,
          body: article.body,
          ...(authorName === null
            ? {}
            : { author: Object.freeze({ name: authorName }) }),
          ...(handle === null ? {} : { handle }),
        }),
      });
    } else if (input.plan.operation === "publish") {
      if (authorName !== null || handle !== null) {
        throw new Error(
          "ugp_shopify_article_publish_rejects_content_mutation_fields",
        );
      }
      variables = Object.freeze({
        id: articleId,
        article: Object.freeze({
          isPublished: true,
        }),
      });
    } else {
      throw new Error("ugp_shopify_article_invalid_operation");
    }
  }

  const base = {
    version: UGP_SHOPIFY_ARTICLE_MAPPING_VERSION,
    sourcePlanFingerprint: input.plan.planFingerprint,
    sourceOperation: input.plan.operation,
    adminApiVersion: UGP_SHOPIFY_ARTICLE_ADMIN_API_VERSION,
    graphqlOperation,
    requiredAnyScopes: REQUIRED_ANY_SCOPES,
    variables,
    expectedVerificationStateFingerprint:
      input.plan.verification.expectedStateFingerprint,
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    mappingFingerprint: stableEvidenceHash({
      purpose: "ugp_shopify_article_publishing_mapping",
      ...base,
    }),
  });
}

export function assertShopifyArticlePublishingMappingIntegrity(
  mapping: ShopifyArticlePublishingMapping,
): void {
  if (
    !mapping
    || mapping.version !== UGP_SHOPIFY_ARTICLE_MAPPING_VERSION
    || mapping.adminApiVersion !== UGP_SHOPIFY_ARTICLE_ADMIN_API_VERSION
  ) {
    throw new Error("ugp_shopify_article_mapping_version_invalid");
  }
  if (
    mapping.semantics.mappingOnly !== true
    || mapping.semantics.deterministic !== true
    || mapping.semantics.connectorProvider !== "shopify"
    || mapping.semantics.createDoesNotPublish !== true
    || mapping.semantics.updatePreservesPublicationState !== true
    || mapping.semantics.publishDoesNotRewriteArticleBody !== true
    || mapping.semantics.performsNetworkOperation !== false
    || mapping.semantics.performsPersistence !== false
    || mapping.semantics.usesCredentials !== false
    || mapping.semantics.executionAuthorized !== false
    || mapping.semantics.providerWrites !== false
    || mapping.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_shopify_article_mapping_unsafe_semantics");
  }
  if (
    mapping.requiredAnyScopes.length !== 2
    || mapping.requiredAnyScopes[0] !== "write_content"
    || mapping.requiredAnyScopes[1] !== "write_online_store_pages"
  ) {
    throw new Error("ugp_shopify_article_mapping_scope_drift");
  }
  const { mappingFingerprint, ...base } = mapping;
  const expected = stableEvidenceHash({
    purpose: "ugp_shopify_article_publishing_mapping",
    ...base,
  });
  if (mappingFingerprint !== expected) {
    throw new Error("ugp_shopify_article_mapping_fingerprint_mismatch");
  }
}
