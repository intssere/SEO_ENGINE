import {
  assertArticlePublicationPlanIntegrity,
  type ArticlePublicationPlan,
} from "./article-publishing-contract.js";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";

export const UGP_WORDPRESS_ARTICLE_MAPPING_VERSION =
  "ugp-8-1-wordpress-article-mapping-v1" as const;

export type WordPressArticlePublishingMapping = Readonly<{
  version: typeof UGP_WORDPRESS_ARTICLE_MAPPING_VERSION;
  sourcePlanFingerprint: string;
  sourceOperation: ArticlePublicationPlan["operation"];
  method: "POST";
  route: string;
  body: Readonly<Record<string, unknown>>;
  authenticationRequired: true;
  authorizationEvaluatedByProviderAtExecution: true;
  deferredCoreUnsupportedFields: readonly [
    "metaDescription",
    "schemaPlan",
    "mediaPlan",
  ];
  expectedVerificationStateFingerprint: string;
  semantics: Readonly<{
    mappingOnly: true;
    deterministic: true;
    connectorProvider: "wordpress";
    createCreatesDraftOnly: true;
    updatePreservesPublicationState: true;
    publishChangesStatusOnly: true;
    performsNetworkOperation: false;
    performsPersistence: false;
    usesCredentials: false;
    executionAuthorized: false;
    providerWrites: false;
    publicSiteWrites: false;
  }>;
  mappingFingerprint: string;
}>;

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG = 200;
const MAX_TITLE = 512;

const DEFERRED_FIELDS = Object.freeze([
  "metaDescription",
  "schemaPlan",
  "mediaPlan",
] as const);

const SEMANTICS = Object.freeze({
  mappingOnly: true as const,
  deterministic: true as const,
  connectorProvider: "wordpress" as const,
  createCreatesDraftOnly: true as const,
  updatePreservesPublicationState: true as const,
  publishChangesStatusOnly: true as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
  usesCredentials: false as const,
  executionAuthorized: false as const,
  providerWrites: false as const,
  publicSiteWrites: false as const,
});

function exactText(value: unknown, field: string, max: number): string {
  if (
    typeof value !== "string"
    || value !== value.trim()
    || value.length < 1
    || value.length > max
    || /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("ugp_wordpress_article_invalid_" + field);
  }
  return value;
}

function exactSlug(value: unknown): string | null {
  if (value == null) return null;
  const slug = exactText(value, "slug", MAX_SLUG);
  if (!SAFE_SLUG.test(slug)) {
    throw new Error("ugp_wordpress_article_invalid_slug");
  }
  return slug;
}

function exactPostId(value: unknown): number {
  const id = typeof value === "string" && /^[1-9][0-9]*$/.test(value)
    ? Number(value)
    : value;
  if (!Number.isSafeInteger(id) || Number(id) < 1) {
    throw new Error("ugp_wordpress_article_invalid_post_id");
  }
  return Number(id);
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ugp_wordpress_article_invalid_" + field);
  }
  return value as Record<string, unknown>;
}

function articlePayload(plan: ArticlePublicationPlan): Readonly<{
  title: string;
  content: string;
}> {
  const artifact = plan.mutationIntent.artifact;
  if (artifact.schemaId !== "ugp.article.publication.v1") {
    throw new Error("ugp_wordpress_article_unsupported_artifact_schema");
  }
  const root = asObject(artifact.payload, "artifact_payload");
  const article = asObject(root.article, "article_payload");
  const metadata = asObject(article.metadata, "article_metadata");
  return Object.freeze({
    title: exactText(metadata.title, "article_title", MAX_TITLE),
    content: exactText(article.body, "article_body", 2_000_000),
  });
}

function assertWordPressPlan(plan: ArticlePublicationPlan): void {
  assertArticlePublicationPlanIntegrity(plan);
  if (
    plan.mutationIntent.descriptor.provider !== "wordpress"
    || plan.mutationIntent.target.provider !== "wordpress"
  ) {
    throw new Error("ugp_wordpress_article_wordpress_plan_required");
  }
  if (
    plan.mutationIntent.target.kind !== "article"
    && plan.mutationIntent.target.kind !== "blog_post"
  ) {
    throw new Error("ugp_wordpress_article_article_target_required");
  }
  if (
    plan.semantics.executionAuthorized !== false
    || plan.semantics.publicationAuthorized !== false
    || plan.semantics.providerWrites !== false
    || plan.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_wordpress_article_unsafe_source_plan");
  }
}

export function mapArticlePublicationPlanToWordPress(input: {
  plan: ArticlePublicationPlan;
  postId?: number | string | null;
  slug?: string | null;
}): WordPressArticlePublishingMapping {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_wordpress_article_invalid_input");
  }

  assertWordPressPlan(input.plan);
  const article = articlePayload(input.plan);
  const slug = exactSlug(input.slug ?? null);

  let route: string;
  let body: Readonly<Record<string, unknown>>;

  if (input.plan.operation === "create") {
    if (input.postId != null) {
      throw new Error("ugp_wordpress_article_create_rejects_post_id");
    }
    route = "/wp-json/wp/v2/posts";
    body = Object.freeze({
      title: article.title,
      content: article.content,
      ...(slug === null ? {} : { slug }),
      status: "draft",
    });
  } else {
    const postId = exactPostId(input.postId);
    const targetExternalId = input.plan.mutationIntent.target.externalId;
    if (
      targetExternalId !== null
      && /^[1-9][0-9]*$/.test(targetExternalId)
      && Number(targetExternalId) !== postId
    ) {
      throw new Error("ugp_wordpress_article_target_post_id_mismatch");
    }
    route = `/wp-json/wp/v2/posts/${postId}`;

    if (input.plan.operation === "update") {
      body = Object.freeze({
        title: article.title,
        content: article.content,
        ...(slug === null ? {} : { slug }),
      });
    } else if (input.plan.operation === "publish") {
      if (slug !== null) {
        throw new Error(
          "ugp_wordpress_article_publish_rejects_content_mutation_fields",
        );
      }
      body = Object.freeze({ status: "publish" });
    } else {
      throw new Error("ugp_wordpress_article_invalid_operation");
    }
  }

  const base = {
    version: UGP_WORDPRESS_ARTICLE_MAPPING_VERSION,
    sourcePlanFingerprint: input.plan.planFingerprint,
    sourceOperation: input.plan.operation,
    method: "POST" as const,
    route,
    body,
    authenticationRequired: true as const,
    authorizationEvaluatedByProviderAtExecution: true as const,
    deferredCoreUnsupportedFields: DEFERRED_FIELDS,
    expectedVerificationStateFingerprint:
      input.plan.verification.expectedStateFingerprint,
    semantics: SEMANTICS,
  };

  return Object.freeze({
    ...base,
    mappingFingerprint: stableEvidenceHash({
      purpose: "ugp_wordpress_article_publishing_mapping",
      ...base,
    }),
  });
}

export function assertWordPressArticlePublishingMappingIntegrity(
  mapping: WordPressArticlePublishingMapping,
): void {
  if (
    !mapping
    || mapping.version !== UGP_WORDPRESS_ARTICLE_MAPPING_VERSION
    || mapping.method !== "POST"
    || !/^\/wp-json\/wp\/v2\/posts(?:\/[1-9][0-9]*)?$/.test(mapping.route)
  ) {
    throw new Error("ugp_wordpress_article_mapping_shape_invalid");
  }
  if (
    mapping.authenticationRequired !== true
    || mapping.authorizationEvaluatedByProviderAtExecution !== true
    || mapping.semantics.mappingOnly !== true
    || mapping.semantics.deterministic !== true
    || mapping.semantics.connectorProvider !== "wordpress"
    || mapping.semantics.createCreatesDraftOnly !== true
    || mapping.semantics.updatePreservesPublicationState !== true
    || mapping.semantics.publishChangesStatusOnly !== true
    || mapping.semantics.performsNetworkOperation !== false
    || mapping.semantics.performsPersistence !== false
    || mapping.semantics.usesCredentials !== false
    || mapping.semantics.executionAuthorized !== false
    || mapping.semantics.providerWrites !== false
    || mapping.semantics.publicSiteWrites !== false
  ) {
    throw new Error("ugp_wordpress_article_mapping_unsafe_semantics");
  }
  if (
    mapping.deferredCoreUnsupportedFields.length !== 3
    || mapping.deferredCoreUnsupportedFields[0] !== "metaDescription"
    || mapping.deferredCoreUnsupportedFields[1] !== "schemaPlan"
    || mapping.deferredCoreUnsupportedFields[2] !== "mediaPlan"
  ) {
    throw new Error("ugp_wordpress_article_mapping_deferred_field_drift");
  }

  const { mappingFingerprint, ...base } = mapping;
  const expected = stableEvidenceHash({
    purpose: "ugp_wordpress_article_publishing_mapping",
    ...base,
  });
  if (mappingFingerprint !== expected) {
    throw new Error("ugp_wordpress_article_mapping_fingerprint_mismatch");
  }
}
