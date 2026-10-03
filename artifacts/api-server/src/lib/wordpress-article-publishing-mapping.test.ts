import assert from "node:assert/strict";
import test from "node:test";
import type { ArticlePublicationPlan } from "./article-publishing-contract.js";
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
import {
  assertWordPressArticlePublishingMappingIntegrity,
  mapArticlePublicationPlanToWordPress,
} from "./wordpress-article-publishing-mapping.js";

function planFixture(
  operation: "create" | "update" | "publish",
): ArticlePublicationPlan {
  const site = buildUniversalSiteIdentity({
    siteId: "wordpress-site",
    canonicalOrigin: "https://example.test",
  });
  const connection = buildUniversalConnectionIdentity({
    site,
    connectionId: "wordpress-connection",
    provider: "wordpress",
    externalAccountId: "example.test",
    connectionMode: "rest_api",
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
    provider: "wordpress",
    connectorVersion: "wordpress-article-mapping-test-v1",
    credentialProfileId: "wordpress-content-profile",
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
    connectorId: "wordpress-content-connector",
    connectorKind: "native_api",
    registry,
  });
  const target = buildUniversalResourceLocator({
    site,
    connection,
    provider: "wordpress",
    kind: "article",
    externalId: operation === "create" ? "planned:article" : "456",
    canonicalUrl: "https://example.test/connector-neutral-publishing/",
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

test("UGP-8.1 WordPress create maps to draft-only post creation", () => {
  const mapping = mapArticlePublicationPlanToWordPress({
    plan: planFixture("create"),
    slug: "connector-neutral-publishing",
  });
  assert.equal(mapping.method, "POST");
  assert.equal(mapping.route, "/wp-json/wp/v2/posts");
  assert.deepEqual(mapping.body, {
    title: "Connector-Neutral Publishing",
    content: "<h1>Connector-neutral publishing</h1><p>Verified body.</p>",
    slug: "connector-neutral-publishing",
    status: "draft",
  });
  assert.equal(mapping.semantics.executionAuthorized, false);
  assertWordPressArticlePublishingMappingIntegrity(mapping);
});

test("UGP-8.1 WordPress update preserves publication state", () => {
  const mapping = mapArticlePublicationPlanToWordPress({
    plan: planFixture("update"),
    postId: 456,
  });
  assert.equal(mapping.route, "/wp-json/wp/v2/posts/456");
  assert.equal("status" in mapping.body, false);
  assert.equal(mapping.body.title, "Connector-Neutral Publishing");
  assert.equal(
    mapping.body.content,
    "<h1>Connector-neutral publishing</h1><p>Verified body.</p>",
  );
  assertWordPressArticlePublishingMappingIntegrity(mapping);
});

test("UGP-8.1 WordPress publish maps to status-only update", () => {
  const mapping = mapArticlePublicationPlanToWordPress({
    plan: planFixture("publish"),
    postId: "456",
  });
  assert.equal(mapping.route, "/wp-json/wp/v2/posts/456");
  assert.deepEqual(mapping.body, { status: "publish" });
  assert.equal(mapping.semantics.publishChangesStatusOnly, true);
  assertWordPressArticlePublishingMappingIntegrity(mapping);
});

test("UGP-8.1 WordPress create rejects an existing post id", () => {
  assert.throws(() => mapArticlePublicationPlanToWordPress({
    plan: planFixture("create"),
    postId: 456,
  }), /ugp_wordpress_article_create_rejects_post_id/);
});

test("UGP-8.1 WordPress update fails closed on target identity mismatch", () => {
  assert.throws(() => mapArticlePublicationPlanToWordPress({
    plan: planFixture("update"),
    postId: 789,
  }), /ugp_wordpress_article_target_post_id_mismatch/);
});

test("UGP-8.1 WordPress publish rejects content mutation fields", () => {
  assert.throws(() => mapArticlePublicationPlanToWordPress({
    plan: planFixture("publish"),
    postId: 456,
    slug: "changed-during-publish",
  }), /ugp_wordpress_article_publish_rejects_content_mutation_fields/);
});

test("UGP-8.1 WordPress mapping records unmapped core fields explicitly", () => {
  const mapping = mapArticlePublicationPlanToWordPress({
    plan: planFixture("create"),
  });
  assert.deepEqual(mapping.deferredCoreUnsupportedFields, [
    "metaDescription",
    "schemaPlan",
    "mediaPlan",
  ]);
});

test("UGP-8.1 WordPress mapping integrity detects tampering", () => {
  const mapping = mapArticlePublicationPlanToWordPress({
    plan: planFixture("publish"),
    postId: 456,
  });
  assert.throws(() => assertWordPressArticlePublishingMappingIntegrity({
    ...mapping,
    mappingFingerprint: "0".repeat(64),
  }), /ugp_wordpress_article_mapping_fingerprint_mismatch/);
});
