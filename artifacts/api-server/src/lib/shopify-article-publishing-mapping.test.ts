import assert from "node:assert/strict";
import test from "node:test";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import {
  buildUniversalCapabilityRegistry,
  type UniversalCapabilityName,
} from "./universal-capability-registry.js";
import {
  buildUniversalConnectorArtifact,
  buildUniversalConnectorDescriptor,
  buildUniversalMutationIntent,
  buildUniversalPreviewMutationRequest,
} from "./universal-connector-contract.js";
import {
  buildUniversalConnectionIdentity,
  buildUniversalResourceLocator,
  buildUniversalSiteIdentity,
} from "./universal-site-resource-identity.js";
import type { ArticlePublicationPlan } from "./article-publishing-contract.js";
import {
  assertShopifyArticlePublishingMappingIntegrity,
  mapArticlePublicationPlanToShopify,
} from "./shopify-article-publishing-mapping.js";

function planFixture(
  operation: "create" | "update" | "publish",
): ArticlePublicationPlan {
  const site = buildUniversalSiteIdentity({
    siteId: "shopify-site",
    canonicalOrigin: "https://store.example",
  });
  const connection = buildUniversalConnectionIdentity({
    site,
    connectionId: "shopify-connection",
    provider: "shopify",
    externalAccountId: "example.myshopify.com",
    connectionMode: "admin_graphql",
  });
  const capabilities: readonly UniversalCapabilityName[] = [
    "create.article",
    "update.article",
    "publish.article",
    "preview.change",
    "verify.change",
  ];
  const registry = buildUniversalCapabilityRegistry({
    site,
    connection,
    provider: "shopify",
    connectorVersion: "shopify-article-mapping-test-v1",
    credentialProfileId: "shopify-content-profile",
    capabilities: capabilities.map((capability) => ({
      capability,
      resourceKinds: ["article", "blog_post"] as const,
      verification:
        capability === "preview.change" || capability === "verify.change"
          ? "not_applicable" as const
          : "required" as const,
      rollback:
        capability === "preview.change" || capability === "verify.change"
          ? "not_applicable" as const
          : "supported" as const,
      maxOperationsPerRequest: 10,
      maxPayloadBytes: 4_000_000,
    })),
  });
  const descriptor = buildUniversalConnectorDescriptor({
    connectorId: "shopify-content-connector",
    connectorKind: "native_api",
    registry,
  });
  const target = buildUniversalResourceLocator({
    site,
    connection,
    provider: "shopify",
    kind: "blog_post",
    externalId:
      operation === "create"
        ? "planned:article"
        : "gid://shopify/Article/456",
    canonicalUrl:
      "https://store.example/blogs/news/connector-neutral-publishing",
  });
  const artifact = buildUniversalConnectorArtifact({
    schemaId: "ugp.article.publication.v1",
    payload: {
      article: {
        draftId: "1".repeat(64),
        draftFingerprint: "2".repeat(64),
        qualityGateId: "3".repeat(64),
        qualityGateFingerprint: "4".repeat(64),
        targetTopic: "connector-neutral publishing",
        body: "<h1>Connector-neutral publishing</h1><p>Verified body.</p>",
        metadata: {
          title: "Connector-Neutral Publishing",
          metaDescription: "A verified article.",
        },
        schemaPlan: ["Article"],
        mediaPlan: [],
      },
      publication: {
        operation,
        qualityGatePassed: true,
        approvalEligible: true,
      },
      provenance: {
        contentBriefFingerprint: "5".repeat(64),
        sourceEvidenceLedgerFingerprint: "6".repeat(64),
        articleDraftFingerprint: "2".repeat(64),
        articleQualityGateFingerprint: "4".repeat(64),
        contentOpportunityFingerprint: "7".repeat(64),
        topicClusteringFingerprint: "8".repeat(64),
      },
    },
  });
  const capability: ArticlePublicationPlan["capability"] =
    operation === "create"
      ? "create.article"
      : operation === "update"
        ? "update.article"
        : "publish.article";
  const mutationIntent = buildUniversalMutationIntent({
    descriptor,
    capability,
    target,
    artifact,
    expectedStateFingerprint: "9".repeat(64),
    proposedStateFingerprint: "a".repeat(64),
  });
  const previewRequest = buildUniversalPreviewMutationRequest({
    mutation: mutationIntent,
  });
  const base = {
    version: "ugp-8-1-connector-neutral-article-publishing-v1" as const,
    operation,
    capability,
    descriptorFingerprint: descriptor.descriptorFingerprint,
    targetLocatorFingerprint: target.resourceLocatorFingerprint,
    draftId: "1".repeat(64),
    draftFingerprint: "2".repeat(64),
    qualityGateId: "3".repeat(64),
    qualityGateFingerprint: "4".repeat(64),
    artifactFingerprint: artifact.artifactFingerprint,
    mutationIntent,
    previewRequest,
    verification: Object.freeze({
      required: true as const,
      capability: "verify.change" as const,
      expectedStateFingerprint: "a".repeat(64),
    }),
    provenance: Object.freeze({
      contentBriefFingerprint: "5".repeat(64),
      sourceEvidenceLedgerFingerprint: "6".repeat(64),
      articleDraftFingerprint: "2".repeat(64),
      articleQualityGateFingerprint: "4".repeat(64),
      contentOpportunityFingerprint: "7".repeat(64),
      topicClusteringFingerprint: "8".repeat(64),
    }),
    semantics: Object.freeze({
      deterministic: true as const,
      connectorNeutral: true as const,
      qualityGateRequired: true as const,
      previewRequiredBeforeExecution: true as const,
      verificationRequiredAfterExecution: true as const,
      authorizationReferenceRequiredForExecution: true as const,
      executionRequestConstructed: false as const,
      performsNetworkOperation: false as const,
      performsPersistence: false as const,
      publicationAuthorized: false as const,
      executionAuthorized: false as const,
      providerWrites: false as const,
      publicSiteWrites: false as const,
    }),
  };
  return Object.freeze({
    ...base,
    planFingerprint: stableEvidenceHash({
      purpose: "ugp_article_publication_plan",
      ...base,
    }),
  });
}

test("UGP-8.1 Shopify create mapping creates an unpublished article only", () => {
  const mapping = mapArticlePublicationPlanToShopify({
    plan: planFixture("create"),
    blogId: "gid://shopify/Blog/123",
    authorName: "SEO ENGINE",
    handle: "connector-neutral-publishing",
  });
  assert.equal(mapping.graphqlOperation, "articleCreate");
  const article = (mapping.variables.article ?? {}) as Record<string, unknown>;
  assert.equal(article.isPublished, false);
  assert.equal(article.title, "Connector-Neutral Publishing");
  assert.equal(article.body, "<h1>Connector-neutral publishing</h1><p>Verified body.</p>");
  assert.equal(mapping.semantics.executionAuthorized, false);
  assertShopifyArticlePublishingMappingIntegrity(mapping);
});

test("UGP-8.1 Shopify update mapping preserves publication state", () => {
  const mapping = mapArticlePublicationPlanToShopify({
    plan: planFixture("update"),
    blogId: "gid://shopify/Blog/123",
    articleId: "gid://shopify/Article/456",
    authorName: "SEO ENGINE",
  });
  assert.equal(mapping.graphqlOperation, "articleUpdate");
  const article = (mapping.variables.article ?? {}) as Record<string, unknown>;
  assert.equal("isPublished" in article, false);
  assert.equal(article.title, "Connector-Neutral Publishing");
  assert.equal(article.body, "<h1>Connector-neutral publishing</h1><p>Verified body.</p>");
  assertShopifyArticlePublishingMappingIntegrity(mapping);
});

test("UGP-8.1 Shopify publish mapping changes only publication state", () => {
  const mapping = mapArticlePublicationPlanToShopify({
    plan: planFixture("publish"),
    blogId: "gid://shopify/Blog/123",
    articleId: "gid://shopify/Article/456",
  });
  assert.equal(mapping.graphqlOperation, "articleUpdate");
  assert.deepEqual(mapping.variables, {
    id: "gid://shopify/Article/456",
    article: { isPublished: true },
  });
  assert.equal(mapping.semantics.publishDoesNotRewriteArticleBody, true);
  assertShopifyArticlePublishingMappingIntegrity(mapping);
});

test("UGP-8.1 Shopify create fails closed without an author", () => {
  assert.throws(() => mapArticlePublicationPlanToShopify({
    plan: planFixture("create"),
    blogId: "gid://shopify/Blog/123",
  }), /ugp_shopify_article_create_requires_author/);
});

test("UGP-8.1 Shopify update fails closed on article identity mismatch", () => {
  assert.throws(() => mapArticlePublicationPlanToShopify({
    plan: planFixture("update"),
    blogId: "gid://shopify/Blog/123",
    articleId: "gid://shopify/Article/789",
  }), /ugp_shopify_article_target_article_id_mismatch/);
});

test("UGP-8.1 Shopify publish rejects content mutation fields", () => {
  assert.throws(() => mapArticlePublicationPlanToShopify({
    plan: planFixture("publish"),
    blogId: "gid://shopify/Blog/123",
    articleId: "gid://shopify/Article/456",
    handle: "changed-during-publish",
  }), /ugp_shopify_article_publish_rejects_content_mutation_fields/);
});

test("UGP-8.1 Shopify mapping integrity detects tampering", () => {
  const mapping = mapArticlePublicationPlanToShopify({
    plan: planFixture("publish"),
    blogId: "gid://shopify/Blog/123",
    articleId: "gid://shopify/Article/456",
  });
  assert.throws(() => assertShopifyArticlePublishingMappingIntegrity({
    ...mapping,
    mappingFingerprint: "0".repeat(64),
  }), /ugp_shopify_article_mapping_fingerprint_mismatch/);
});
