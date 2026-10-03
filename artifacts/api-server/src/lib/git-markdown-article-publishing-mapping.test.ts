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
  assertGitMarkdownArticlePublishingMappingIntegrity,
  mapArticlePublicationPlanToGitMarkdown,
} from "./git-markdown-article-publishing-mapping.js";

const BASE_SHA = "a".repeat(40);
const BLOB_SHA = "b".repeat(40);
const FILE_PATH = "content/articles/connector-neutral-publishing.mdx";

function planFixture(
  operation: "create" | "update" | "publish",
): ArticlePublicationPlan {
  const site = buildUniversalSiteIdentity({
    siteId: "git-site",
    canonicalOrigin: "https://example.test",
  });
  const connection = buildUniversalConnectionIdentity({
    site,
    connectionId: "github-content",
    provider: "github",
    externalAccountId: "owner/repo",
    connectionMode: "git",
  });
  const articleCapabilities: readonly UniversalCapabilityName[] = [
    "create.article",
    "update.article",
    "publish.article",
    "preview.change",
    "verify.change",
  ];
  const registry = buildUniversalCapabilityRegistry({
    site,
    connection,
    provider: "github",
    connectorVersion: "git-markdown-article-test-v1",
    credentialProfileId: "github-content-profile",
    capabilities: [
      ...articleCapabilities.map((capability) => ({
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
      {
        capability: "git.branch" as const,
        resourceKinds: ["page"] as const,
        verification: "required" as const,
        rollback: "unsupported" as const,
        maxOperationsPerRequest: 10,
        maxPayloadBytes: 4_000_000,
      },
      {
        capability: "git.commit" as const,
        resourceKinds: ["page"] as const,
        verification: "required" as const,
        rollback: "supported" as const,
        maxOperationsPerRequest: 10,
        maxPayloadBytes: 4_000_000,
      },
      {
        capability: "git.pull_request" as const,
        resourceKinds: ["page"] as const,
        verification: "required" as const,
        rollback: "unsupported" as const,
        maxOperationsPerRequest: 10,
        maxPayloadBytes: 4_000_000,
      },
      {
        capability: "read.metadata" as const,
        resourceKinds: ["page"] as const,
        verification: "not_applicable" as const,
        rollback: "not_applicable" as const,
        maxOperationsPerRequest: 10,
        maxPayloadBytes: 4_000_000,
      },
    ],
  });
  const descriptor = buildUniversalConnectorDescriptor({
    connectorId: "git-markdown-content",
    connectorKind: "git",
    registry,
  });
  const target = buildUniversalResourceLocator({
    site,
    connection,
    provider: "github",
    kind: "article",
    externalId: operation === "create" ? "planned:article" : FILE_PATH,
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
        body: "# Connector-neutral publishing\n\nVerified body.",
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

const binding = Object.freeze({
  titleField: "title",
  descriptionField: "description",
  publicationField: "draft",
  draftValue: true,
  publishedValue: false,
});

function common(operation: "create" | "update" | "publish") {
  return {
    plan: planFixture(operation),
    format: "mdx" as const,
    repository: "owner/repo",
    defaultBranch: "main",
    baseCommitSha: BASE_SHA,
    workingBranch: "seo/article-connector-neutral-publishing",
    filePath: FILE_PATH,
    framework: "Next.js",
    contentSource: "MDX",
    detectionEvidencePaths: ["package.json", "content/articles/example.mdx"],
    frontmatterBinding: binding,
  };
}

test("UGP-8.1 Git Markdown create produces draft PR-only file plan", () => {
  const mapping = mapArticlePublicationPlanToGitMarkdown({
    ...common("create"),
    expectedBlobSha: null,
  });
  assert.equal(mapping.publicationValue, true);
  assert.equal(mapping.controlledGitPlan.change.pullRequestRequired, true);
  assert.equal(mapping.controlledGitPlan.change.directDefaultBranchWrite, false);
  assert.match(mapping.fileContent, /^---\ntitle:/);
  assert.match(mapping.fileContent, /\ndraft: true\n---\n/);
  assertGitMarkdownArticlePublishingMappingIntegrity(mapping);
});

test("UGP-8.1 Git Markdown update preserves supplied publication state", () => {
  const mapping = mapArticlePublicationPlanToGitMarkdown({
    ...common("update"),
    expectedBlobSha: BLOB_SHA,
    currentPublicationValue: false,
  });
  assert.equal(mapping.publicationValue, false);
  assert.equal(
    mapping.controlledGitPlan.change.patches[0]?.expectedBlobSha,
    BLOB_SHA,
  );
  assertGitMarkdownArticlePublishingMappingIntegrity(mapping);
});

test("UGP-8.1 Git Markdown publish uses explicit published binding", () => {
  const mapping = mapArticlePublicationPlanToGitMarkdown({
    ...common("publish"),
    expectedBlobSha: BLOB_SHA,
    currentPublicationValue: true,
  });
  assert.equal(mapping.publicationValue, false);
  assert.match(mapping.fileContent, /\ndraft: false\n---\n/);
  assert.equal(mapping.semantics.directDefaultBranchWrite, false);
  assertGitMarkdownArticlePublishingMappingIntegrity(mapping);
});

test("UGP-8.1 Git Markdown create requires absent blob", () => {
  assert.throws(() => mapArticlePublicationPlanToGitMarkdown({
    ...common("create"),
    expectedBlobSha: BLOB_SHA,
  }), /ugp_git_markdown_article_create_requires_absent_blob/);
});

test("UGP-8.1 Git Markdown update requires observed publication state", () => {
  assert.throws(() => mapArticlePublicationPlanToGitMarkdown({
    ...common("update"),
    expectedBlobSha: BLOB_SHA,
  }), /ugp_git_markdown_article_update_requires_publication_state/);
});

test("UGP-8.1 Git Markdown rejects default branch working target", () => {
  assert.throws(() => mapArticlePublicationPlanToGitMarkdown({
    ...common("create"),
    expectedBlobSha: null,
    workingBranch: "main",
  }), /ugp_git_default_branch_write_denied/);
});

test("UGP-8.1 Git Markdown rejects target path drift", () => {
  assert.throws(() => mapArticlePublicationPlanToGitMarkdown({
    ...common("update"),
    expectedBlobSha: BLOB_SHA,
    currentPublicationValue: true,
    filePath: "content/articles/other.mdx",
  }), /ugp_git_markdown_article_target_file_path_mismatch/);
});

test("UGP-8.1 Git Markdown rejects format/path mismatch", () => {
  assert.throws(() => mapArticlePublicationPlanToGitMarkdown({
    ...common("create"),
    expectedBlobSha: null,
    format: "md",
  }), /ugp_git_markdown_article_format_path_mismatch/);
});

test("UGP-8.1 Git Markdown integrity detects tampering", () => {
  const mapping = mapArticlePublicationPlanToGitMarkdown({
    ...common("publish"),
    expectedBlobSha: BLOB_SHA,
    currentPublicationValue: true,
  });
  assert.throws(() => assertGitMarkdownArticlePublishingMappingIntegrity({
    ...mapping,
    mappingFingerprint: "0".repeat(64),
  }), /ugp_git_markdown_article_mapping_fingerprint_mismatch/);
});
