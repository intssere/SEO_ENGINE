import assert from "node:assert/strict";
import test from "node:test";
import { stableEvidenceHash } from "./keyword-serp-evidence-contract.js";
import type { ArticleDraftPipelineResult } from "./article-draft-pipeline-contract.js";
import type { ArticleQualityGateResult } from "./article-quality-gate-contract.js";
import {
  buildUniversalSiteIdentity,
  buildUniversalConnectionIdentity,
  buildUniversalResourceLocator,
} from "./universal-site-resource-identity.js";
import { buildUniversalCapabilityRegistry } from "./universal-capability-registry.js";
import { buildUniversalConnectorDescriptor } from "./universal-connector-contract.js";
import {
  assertArticlePublicationPlanIntegrity,
  buildArticlePublicationPlan,
} from "./article-publishing-contract.js";

function draftFixture(): ArticleDraftPipelineResult {
  const draftBase = {
    version: "ugp-7-4-article-draft-pipeline-v1" as const,
    briefId: "1".repeat(64),
    briefFingerprint: "2".repeat(64),
    sourceEvidenceLedgerId: "3".repeat(64),
    sourceEvidenceLedgerFingerprint: "4".repeat(64),
    targetTopic: "connector-neutral publishing",
    status: "draft_complete" as const,
    sections: Object.freeze([]),
    articleBody: "# Connector-neutral publishing\n\nVerified article body.",
    stages: Object.freeze([]),
    finishingAssets: Object.freeze({
      metadata: Object.freeze({
        title: "Connector-Neutral Publishing",
        metaDescription: "Verified publication contract.",
      }),
      schemaPlan: Object.freeze(["Article"]),
      mediaPlan: Object.freeze([]),
    }),
    blockers: Object.freeze([]),
    warnings: Object.freeze([]),
    provenance: Object.freeze({
      contentBriefFingerprint: "2".repeat(64),
      researchPlanFingerprint: "5".repeat(64),
      sourceEvidenceLedgerFingerprint: "4".repeat(64),
      contentOpportunityFingerprint: "6".repeat(64),
      topicClusteringFingerprint: "7".repeat(64),
    }),
    semantics: Object.freeze({
      evidenceBound: true as const,
      stageBased: true as const,
      builtInNetworkTransport: false as const,
      providerAdapterInjected: true as const,
      performsPersistence: false as const,
      publicationAuthorized: false as const,
      executionAuthorized: false as const,
      qualityGatePassed: false as const,
      requiresUGP75QualityGate: true as const,
      deterministicGivenFrozenInputsAndAdapterOutputs: true as const,
    }),
  };
  const draftFingerprint = stableEvidenceHash({
    purpose: "ugp_article_draft_pipeline",
    ...draftBase,
  });
  return Object.freeze({
    ...draftBase,
    draftId: stableEvidenceHash({
      purpose: "ugp_article_draft_pipeline_id",
      version: "ugp-7-4-article-draft-pipeline-v1",
      briefId: draftBase.briefId,
      draftFingerprint,
    }),
    draftFingerprint,
  });
}

function qualityGateFixture(
  draft: ArticleDraftPipelineResult,
  status: "pass" | "blocked" = "pass",
): ArticleQualityGateResult {
  const base = {
    version: "ugp-7-5-article-quality-gate-v1" as const,
    draftId: draft.draftId,
    draftFingerprint: draft.draftFingerprint,
    briefId: draft.briefId,
    briefFingerprint: draft.briefFingerprint,
    sourceEvidenceLedgerId: draft.sourceEvidenceLedgerId,
    sourceEvidenceLedgerFingerprint: draft.sourceEvidenceLedgerFingerprint,
    status,
    approvalEligible: status === "pass",
    checks: Object.freeze([]),
    blockingReasons: Object.freeze(status === "pass" ? [] : ["blocked"]),
    provenance: Object.freeze({
      contentBriefFingerprint: draft.briefFingerprint,
      sourceEvidenceLedgerFingerprint: draft.sourceEvidenceLedgerFingerprint,
      articleDraftFingerprint: draft.draftFingerprint,
      contentOpportunityFingerprint:
        draft.provenance.contentOpportunityFingerprint,
      topicClusteringFingerprint: draft.provenance.topicClusteringFingerprint,
    }),
    semantics: Object.freeze({
      deterministic: true as const,
      failClosed: true as const,
      separateFromGeneration: true as const,
      modelConfidenceIsNotQualityGate: true as const,
      performsNetworkOperation: false as const,
      performsPersistence: false as const,
      publicationAuthorized: false as const,
      executionAuthorized: false as const,
      providerWrites: false as const,
      publicSiteWrites: false as const,
    }),
  };
  const gateFingerprint = stableEvidenceHash({
    purpose: "ugp_article_quality_gate",
    ...base,
  });
  return Object.freeze({
    ...base,
    gateId: stableEvidenceHash({
      purpose: "ugp_article_quality_gate_id",
      version: "ugp-7-5-article-quality-gate-v1",
      draftId: draft.draftId,
      gateFingerprint,
    }),
    gateFingerprint,
  });
}

function connectorFixture(capabilities = [
  "create.article",
  "update.article",
  "publish.article",
  "preview.change",
  "verify.change",
] as const) {
  const site = buildUniversalSiteIdentity({
    siteId: "site-1",
    canonicalOrigin: "https://example.com",
  });
  const connection = buildUniversalConnectionIdentity({
    site,
    connectionId: "connection-1",
    provider: "wordpress",
    externalAccountId: "account-1",
    connectionMode: "api",
  });
  const registry = buildUniversalCapabilityRegistry({
    site,
    connection,
    provider: "wordpress",
    connectorVersion: "test-v1",
    credentialProfileId: "credential-profile-1",
    capabilities: capabilities.map((capability) => ({
      capability,
      resourceKinds: ["article", "blog_post"] as const,
      verification:
        capability === "verify.change" || capability === "preview.change"
          ? "not_applicable" as const
          : "required" as const,
      rollback:
        capability === "verify.change" || capability === "preview.change"
          ? "not_applicable" as const
          : "supported" as const,
      maxOperationsPerRequest: 10,
      maxPayloadBytes: 100000,
    })),
  });
  const descriptor = buildUniversalConnectorDescriptor({
    connectorId: "connector-1",
    connectorKind: "openapi",
    registry,
  });
  const target = buildUniversalResourceLocator({
    site,
    connection,
    provider: "wordpress",
    kind: "article",
    externalId: "article-123",
    canonicalUrl: "https://example.com/articles/article-123",
  });
  return { descriptor, target };
}

test("UGP-8.1 builds deterministic create/update/publish plans from a passing UGP-7.5 gate", () => {
  const draft = draftFixture();
  const gate = qualityGateFixture(draft);
  const { descriptor, target } = connectorFixture();

  for (const operation of ["create", "update", "publish"] as const) {
    const input = {
      operation,
      descriptor,
      target,
      draft,
      qualityGate: gate,
      expectedStateFingerprint: "8".repeat(64),
      proposedStateFingerprint: "9".repeat(64),
    };
    const first = buildArticlePublicationPlan(input);
    const second = buildArticlePublicationPlan(input);
    assert.deepEqual(first, second);
    assert.equal(first.semantics.publicationAuthorized, false);
    assert.equal(first.semantics.executionAuthorized, false);
    assert.equal(first.semantics.executionRequestConstructed, false);
    assert.equal(first.previewRequest.operation, "preview_mutation");
    assert.equal(first.verification.required, true);
    assertArticlePublicationPlanIntegrity(first);
  }
});

test("UGP-8.1 fails closed when UGP-7.5 is blocked", () => {
  const draft = draftFixture();
  const gate = qualityGateFixture(draft, "blocked");
  const { descriptor, target } = connectorFixture();
  assert.throws(() => buildArticlePublicationPlan({
    operation: "publish",
    descriptor,
    target,
    draft,
    qualityGate: gate,
    expectedStateFingerprint: "8".repeat(64),
    proposedStateFingerprint: "9".repeat(64),
  }), /ugp_article_publishing_quality_gate_not_eligible/);
});

test("UGP-8.1 requires preview and verify capabilities", () => {
  const draft = draftFixture();
  const gate = qualityGateFixture(draft);
  const { descriptor, target } = connectorFixture([
    "publish.article",
    "preview.change",
  ] as const);
  assert.throws(() => buildArticlePublicationPlan({
    operation: "publish",
    descriptor,
    target,
    draft,
    qualityGate: gate,
    expectedStateFingerprint: "8".repeat(64),
    proposedStateFingerprint: "9".repeat(64),
  }), /ugp_article_publishing_capability_not_available:verify.change/);
});

test("UGP-8.1 rejects non-article targets", () => {
  const draft = draftFixture();
  const gate = qualityGateFixture(draft);
  const { descriptor, target } = connectorFixture();
  assert.throws(() => buildArticlePublicationPlan({
    operation: "publish",
    descriptor,
    target: { ...target, kind: "page" },
    draft,
    qualityGate: gate,
    expectedStateFingerprint: "8".repeat(64),
    proposedStateFingerprint: "9".repeat(64),
  }), /ugp_identity_resource_locator_integrity_failed/);
});

test("UGP-8.1 integrity rejects plan fingerprint mutation", () => {
  const draft = draftFixture();
  const gate = qualityGateFixture(draft);
  const { descriptor, target } = connectorFixture();
  const plan = buildArticlePublicationPlan({
    operation: "publish",
    descriptor,
    target,
    draft,
    qualityGate: gate,
    expectedStateFingerprint: "8".repeat(64),
    proposedStateFingerprint: "9".repeat(64),
  });
  assert.throws(() => assertArticlePublicationPlanIntegrity({
    ...plan,
    planFingerprint: "0".repeat(64),
  }), /ugp_article_publishing_fingerprint_mismatch/);
});
