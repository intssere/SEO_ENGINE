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
  assertWebflowArticlePublishingMappingIntegrity,
  mapArticlePublicationPlanToWebflow,
} from "./webflow-article-publishing-mapping.js";

const COLLECTION_ID = "580e63fc8c9a982ac9b8b745";
const ITEM_ID = "643fd856d66b6528195ee2ca";

function planFixture(
  operation: "create" | "update" | "publish",
): ArticlePublicationPlan {
  const site = buildUniversalSiteIdentity({
    siteId: "webflow-site",
    canonicalOrigin: "https://example.test",
  });
  const connection = buildUniversalConnectionIdentity({
    site,
    connectionId: "webflow-connection",
    provider: "webflow",
    externalAccountId: "6ab94b0baca74bd07f84a09e",
    connectionMode: "api",
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
    provider: "webflow",
    connectorVersion: "webflow-article-mapping-test-v1",
    credentialProfileId: "webflow-cms-profile",
    capabilities: capabilities.map((capability) => ({
      capability,
      resourceKinds: ["article", "blog_post"] as const,
      requiredProviderScopes: capability === "preview.change"
        || capability === "verify.change"
        ? []
        : ["cms:write"],
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
    connectorId: "webflow-content-connector",
    connectorKind: "native_api",
    registry,
  });
  const target = buildUniversalResourceLocator({
    site,
    connection,
    provider: "webflow",
    kind: "article",
    externalId: operation === "create" ? "planned:article" : ITEM_ID,
    canonicalUrl: "https://example.test/blog/connector-neutral-publishing",
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

test("UGP-8.1 Webflow create maps to staged draft insert", () => {
  const mapping = mapArticlePublicationPlanToWebflow({
    plan: planFixture("create"),
    collectionId: COLLECTION_ID,
    slug: "connector-neutral-publishing",
    bodyFieldSlug: "body",
  });
  assert.equal(mapping.method, "POST");
  assert.equal(
    mapping.path,
    `/v2/collections/${COLLECTION_ID}/items/insert`,
  );
  assert.deepEqual(mapping.body, {
    items: [{
      isDraft: true,
      fieldData: {
        name: "Connector-Neutral Publishing",
        slug: "connector-neutral-publishing",
        body: "<h1>Connector-neutral publishing</h1><p>Verified body.</p>",
      },
    }],
  });
  assert.equal(mapping.requiredProviderScope, "cms:write");
  assertWebflowArticlePublishingMappingIntegrity(mapping);
});

test("UGP-8.1 Webflow update maps to staged item PATCH", () => {
  const mapping = mapArticlePublicationPlanToWebflow({
    plan: planFixture("update"),
    collectionId: COLLECTION_ID,
    itemId: ITEM_ID,
    bodyFieldSlug: "body",
  });
  assert.equal(mapping.method, "PATCH");
  assert.equal(
    mapping.path,
    `/v2/collections/${COLLECTION_ID}/items/${ITEM_ID}`,
  );
  assert.equal("isDraft" in mapping.body, false);
  assert.deepEqual(mapping.body, {
    fieldData: {
      name: "Connector-Neutral Publishing",
      body: "<h1>Connector-neutral publishing</h1><p>Verified body.</p>",
    },
  });
  assertWebflowArticlePublishingMappingIntegrity(mapping);
});

test("UGP-8.1 Webflow publish maps to dedicated publish endpoint", () => {
  const mapping = mapArticlePublicationPlanToWebflow({
    plan: planFixture("publish"),
    collectionId: COLLECTION_ID,
    itemId: ITEM_ID,
    bodyFieldSlug: "body",
  });
  assert.equal(mapping.method, "POST");
  assert.equal(
    mapping.path,
    `/v2/collections/${COLLECTION_ID}/items/publish`,
  );
  assert.deepEqual(mapping.body, { itemIds: [ITEM_ID] });
  assert.equal(mapping.semantics.publishUsesDedicatedPublishEndpoint, true);
  assertWebflowArticlePublishingMappingIntegrity(mapping);
});

test("UGP-8.1 Webflow create requires exact slug and rejects item identity", () => {
  assert.throws(() => mapArticlePublicationPlanToWebflow({
    plan: planFixture("create"),
    collectionId: COLLECTION_ID,
    itemId: ITEM_ID,
    slug: "connector-neutral-publishing",
    bodyFieldSlug: "body",
  }), /ugp_webflow_article_create_rejects_item_id/);

  assert.throws(() => mapArticlePublicationPlanToWebflow({
    plan: planFixture("create"),
    collectionId: COLLECTION_ID,
    bodyFieldSlug: "body",
  }), /ugp_webflow_article_invalid_item_slug/);
});

test("UGP-8.1 Webflow update fails closed on target item identity mismatch", () => {
  assert.throws(() => mapArticlePublicationPlanToWebflow({
    plan: planFixture("update"),
    collectionId: COLLECTION_ID,
    itemId: "643fd856d66b6528195ee2cb",
    bodyFieldSlug: "body",
  }), /ugp_webflow_article_target_item_id_mismatch/);
});

test("UGP-8.1 Webflow publish rejects content mutation fields", () => {
  assert.throws(() => mapArticlePublicationPlanToWebflow({
    plan: planFixture("publish"),
    collectionId: COLLECTION_ID,
    itemId: ITEM_ID,
    slug: "changed-during-publish",
    bodyFieldSlug: "body",
  }), /ugp_webflow_article_publish_rejects_content_mutation_fields/);
});

test("UGP-8.1 Webflow body field binding is explicit and fail closed", () => {
  assert.throws(() => mapArticlePublicationPlanToWebflow({
    plan: planFixture("create"),
    collectionId: COLLECTION_ID,
    slug: "connector-neutral-publishing",
    bodyFieldSlug: "name",
  }), /ugp_webflow_article_reserved_body_field_slug/);
});

test("UGP-8.1 Webflow mapping records deferred fields transparently", () => {
  const mapping = mapArticlePublicationPlanToWebflow({
    plan: planFixture("create"),
    collectionId: COLLECTION_ID,
    slug: "connector-neutral-publishing",
    bodyFieldSlug: "body",
  });
  assert.deepEqual(mapping.deferredFields, [
    "metaDescription",
    "schemaPlan",
    "mediaPlan",
  ]);
});

test("UGP-8.1 Webflow mapping integrity detects tampering", () => {
  const mapping = mapArticlePublicationPlanToWebflow({
    plan: planFixture("publish"),
    collectionId: COLLECTION_ID,
    itemId: ITEM_ID,
    bodyFieldSlug: "body",
  });
  assert.throws(() => assertWebflowArticlePublishingMappingIntegrity({
    ...mapping,
    mappingFingerprint: "0".repeat(64),
  }), /ugp_webflow_article_mapping_fingerprint_mismatch/);
});
