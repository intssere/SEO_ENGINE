import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSiteOwnershipEvidence,
  type SiteOwnershipPageInventory,
  type SiteOwnershipQueryPageObservation,
} from "./site-ownership-evidence-contract.js";
import { detectCannibalization } from "./cannibalization-detection-contract.js";
import { classifyTopicCoverage } from "./topic-coverage-classification-contract.js";
import {
  buildContentOpportunityBusinessRelevanceEvidence,
  buildContentOpportunityModel,
} from "./content-opportunity-model-contract.js";
import {
  assertResearchPlanIntegrity,
  buildResearchPlan,
} from "./research-plan-contract.js";
import {
  stableEvidenceHash,
  type SearchMarket,
} from "./keyword-serp-evidence-contract.js";
import {
  UGP_TOPIC_CLUSTERING_POLICY,
  type TopicCluster,
  type TopicClusteringResult,
} from "./topic-clustering-contract.js";

const MARKET: SearchMarket = {
  searchEngine: "google",
  locationCode: 2840,
  languageCode: "en",
  device: "desktop",
};

const CLOSED_CLUSTERING_SEMANTICS = Object.freeze({
  readOnly: true as const,
  deterministic: true as const,
  grantsAuthorization: false as const,
  grantsProviderWrite: false as const,
  grantsPublicSiteWrite: false as const,
  performsNetworkOperation: false as const,
  performsPersistence: false as const,
});

function cluster(
  representativeKeyword: string,
  keywords: readonly string[],
  intent: "informational" | "commercial" | "transactional" | "navigational" | "unknown" = "informational",
): TopicCluster {
  const members = Object.freeze(
    [...keywords].sort().map((keyword, index) => Object.freeze({
      keyword,
      evidenceFingerprint: String(index + 5).repeat(64).slice(0, 64),
      searchVolume: 100 - index,
      intent,
    })),
  );
  const base = { representativeKeyword, members };
  return Object.freeze({
    clusterFingerprint: stableEvidenceHash({
      purpose: "ugp_topic_cluster",
      version: "ugp-6-2a-deterministic-topic-clustering-v1",
      ...base,
    }),
    ...base,
  });
}

function clustering(topic: TopicCluster): TopicClusteringResult {
  const base = {
    version: "ugp-6-2a-deterministic-topic-clustering-v1" as const,
    market: MARKET,
    policy: UGP_TOPIC_CLUSTERING_POLICY,
    clusters: Object.freeze([topic]),
    pairAssessments: Object.freeze([]),
    semantics: CLOSED_CLUSTERING_SEMANTICS,
  };
  return Object.freeze({
    ...base,
    clusteringFingerprint: stableEvidenceHash({
      purpose: "ugp_topic_clustering_result",
      ...base,
    }),
  });
}

function inventory(input: {
  topicMetadata?: boolean;
  partial?: boolean;
} = {}): SiteOwnershipPageInventory {
  return {
    version: "ugp-6-3a-page-inventory-projection-v1",
    canonicalOrigin: "https://example.com",
    sourceAnalysisFingerprint: "a".repeat(64),
    coverage: input.partial ? "partial" : "observed_inventory_complete",
    wholeSiteCertified: false,
    pages: [
      {
        url: "https://example.com/a",
        analysisPageId: "analysis-a",
        evidenceId: "evidence-a",
        pageFingerprint: "b".repeat(64),
        sourceFingerprint: "c".repeat(64),
        outcome: "success",
        indexability: "indexable",
        canonicalUrl: "https://example.com/a",
        canonicalState: "self",
        title: input.topicMetadata ? "Stress Relief Journal" : "Existing A",
        h1: input.topicMetadata ? "Stress Relief Journal" : "Existing A",
        headings: [input.topicMetadata ? "Stress Relief Journal" : "Existing A"],
        contentFingerprint: "e".repeat(64),
      },
      {
        url: "https://example.com/b",
        analysisPageId: "analysis-b",
        evidenceId: "evidence-b",
        pageFingerprint: "f".repeat(64),
        sourceFingerprint: "1".repeat(64),
        outcome: "success",
        indexability: "indexable",
        canonicalUrl: "https://example.com/b",
        canonicalState: "self",
        title: "Existing B",
        h1: "Existing B",
        headings: ["Existing B"],
        contentFingerprint: "2".repeat(64),
      },
    ],
  };
}

function observation(
  query: string,
  pageUrl: string,
  overrides: Partial<SiteOwnershipQueryPageObservation> = {},
): SiteOwnershipQueryPageObservation {
  return {
    query,
    pageUrl,
    market: MARKET,
    clicks: 3,
    impressions: 25,
    ctr: 0.12,
    position: 8,
    sourceId: "captured-query-page-source",
    sourceFingerprint: "d".repeat(64),
    ...overrides,
  };
}

function modelFor(input: {
  topic?: TopicCluster;
  rows?: readonly SiteOwnershipQueryPageObservation[];
  omitRows?: boolean;
  topicMetadata?: boolean;
  partial?: boolean;
  relevance?: number;
}) {
  const topic = input.topic ?? cluster(
    "stress relief journal",
    ["stress relief journal"],
  );
  const topicClustering = clustering(topic);
  const ownership = buildSiteOwnershipEvidence({
    pageInventory: inventory({
      topicMetadata: input.topicMetadata,
      partial: input.partial,
    }),
    market: MARKET,
    queryPageObservations: input.omitRows ? undefined : (input.rows ?? []),
  });
  const cannibalization = detectCannibalization({
    clustering: topicClustering,
    ownership,
  });
  const coverage = classifyTopicCoverage({
    clustering: topicClustering,
    ownership,
  });
  const business = buildContentOpportunityBusinessRelevanceEvidence({
    clusterFingerprint: topic.clusterFingerprint,
    relevance: input.relevance ?? 0.9,
    rationaleCode: "core_business_topic",
    sourceId: "business-context-fixture",
    sourceFingerprint: "9".repeat(64),
  });
  return buildContentOpportunityModel({
    clustering: topicClustering,
    cannibalization,
    coverage,
    businessRelevance: [business],
  });
}

test("UGP-7.1 builds a bounded create-candidate research plan without acquiring sources", () => {
  const model = modelFor({
    rows: [observation("unrelated query", "https://example.com/b")],
  });
  const opportunity = model.opportunities[0];
  assert.equal(opportunity?.recommendedAction, "create_candidate");

  const plan = buildResearchPlan({
    opportunityModel: model,
    opportunityId: opportunity.opportunityId,
  });

  assert.equal(plan.recommendedAction, "create_candidate");
  assert.equal(plan.targetTopic, "stress relief journal");
  assert.ok(plan.questions.length >= 7);
  assert.ok(plan.requiredEvidenceClasses.includes("primary_authoritative_sources"));
  assert.ok(plan.requiredEvidenceClasses.includes("existing_site_content"));
  assert.ok(plan.discoveryPlan.some((step) => step.channel === "official_primary_sources"));
  assert.ok(
    plan.questions.some(
      (question) => question.purposeCode === "define_new_content_evidence_boundary",
    ),
  );
  assert.ok(plan.limitations.includes("source_acquisition_not_performed"));
  assert.equal(plan.semantics.performsSourceAcquisition, false);
  assert.equal(plan.semantics.generatesArticleText, false);
  assertResearchPlanIntegrity(plan);
});

test("UGP-7.1 adds refresh-specific research delta questions", () => {
  const model = modelFor({
    rows: [
      observation("stress relief journal", "https://example.com/a", {
        impressions: 9,
      }),
    ],
  });
  const opportunity = model.opportunities[0];
  assert.equal(opportunity?.recommendedAction, "refresh_candidate");

  const plan = buildResearchPlan({
    opportunityModel: model,
    opportunityId: opportunity.opportunityId,
  });

  assert.equal(plan.recommendedAction, "refresh_candidate");
  assert.ok(
    plan.questions.some(
      (question) => question.purposeCode === "identify_refresh_delta",
    ),
  );
  assert.match(plan.objective, /refresh existing coverage/);
});

test("UGP-7.1 adds consolidation-specific overlap research", () => {
  const model = modelFor({
    rows: [
      observation("stress relief journal", "https://example.com/a"),
      observation("stress relief journal", "https://example.com/b"),
    ],
  });
  const opportunity = model.opportunities[0];
  assert.equal(opportunity?.recommendedAction, "consolidate_candidate");

  const plan = buildResearchPlan({
    opportunityModel: model,
    opportunityId: opportunity.opportunityId,
  });

  assert.equal(plan.recommendedAction, "consolidate_candidate");
  assert.ok(
    plan.questions.some(
      (question) => question.purposeCode === "map_consolidation_overlap",
    ),
  );
  assert.ok(
    plan.discoveryPlan.some(
      (step) => step.purposeCode === "map_competing_site_content",
    ),
  );
});

test("UGP-7.1 includes comparison evidence for commercial opportunities", () => {
  const topic = cluster(
    "best stress journal",
    ["best stress journal", "stress journal comparison"],
    "commercial",
  );
  const model = modelFor({
    topic,
    rows: [observation("unrelated query", "https://example.com/b")],
  });
  const opportunity = model.opportunities[0];

  const plan = buildResearchPlan({
    opportunityModel: model,
    opportunityId: opportunity.opportunityId,
  });

  assert.equal(plan.searchIntent, "commercial");
  assert.ok(plan.requiredEvidenceClasses.includes("comparative_evidence"));
  assert.ok(
    plan.questions.some(
      (question) => question.purposeCode === "define_comparison_dimensions",
    ),
  );
  assert.ok(
    plan.discoveryPlan.some(
      (step) => step.purposeCode === "collect_comparative_evidence",
    ),
  );
});

test("UGP-7.1 includes definitions/background evidence for informational opportunities", () => {
  const model = modelFor({
    rows: [observation("unrelated query", "https://example.com/b")],
  });
  const opportunity = model.opportunities[0];

  const plan = buildResearchPlan({
    opportunityModel: model,
    opportunityId: opportunity.opportunityId,
  });

  assert.ok(plan.requiredEvidenceClasses.includes("definitions_and_background"));
  assert.ok(
    plan.questions.some(
      (question) => question.purposeCode === "establish_background",
    ),
  );
  assert.ok(
    plan.discoveryPlan.some(
      (step) => step.channel === "standards_or_regulatory_sources",
    ),
  );
});

test("UGP-7.1 rejects leave-alone opportunities", () => {
  const model = modelFor({
    rows: [observation("stress relief journal", "https://example.com/a")],
  });
  const opportunity = model.opportunities[0];
  assert.equal(opportunity?.recommendedAction, "leave_alone");

  assert.throws(
    () => buildResearchPlan({
      opportunityModel: model,
      opportunityId: opportunity.opportunityId,
    }),
    /ugp_research_plan_opportunity_not_research_eligible/,
  );
});

test("UGP-7.1 rejects defer-insufficient-evidence opportunities", () => {
  const model = modelFor({ omitRows: true });
  const opportunity = model.opportunities[0];
  assert.equal(opportunity?.recommendedAction, "defer_insufficient_evidence");

  assert.throws(
    () => buildResearchPlan({
      opportunityModel: model,
      opportunityId: opportunity.opportunityId,
    }),
    /ugp_research_plan_opportunity_not_research_eligible/,
  );
});

test("UGP-7.1 rejects unknown opportunity identity", () => {
  const model = modelFor({
    rows: [observation("unrelated query", "https://example.com/b")],
  });

  assert.throws(
    () => buildResearchPlan({
      opportunityModel: model,
      opportunityId: "0".repeat(64),
    }),
    /ugp_research_plan_opportunity_not_found/,
  );
});

test("UGP-7.1 output is deterministic for the same certified opportunity", () => {
  const model = modelFor({
    rows: [observation("unrelated query", "https://example.com/b")],
  });
  const opportunity = model.opportunities[0];

  const first = buildResearchPlan({
    opportunityModel: model,
    opportunityId: opportunity.opportunityId,
  });
  const second = buildResearchPlan({
    opportunityModel: model,
    opportunityId: opportunity.opportunityId,
  });

  assert.deepEqual(first, second);
  assert.equal(first.planFingerprint, second.planFingerprint);
  assert.equal(first.planId, second.planId);
});

test("UGP-7.1 preserves exact certified upstream lineage", () => {
  const model = modelFor({
    rows: [observation("unrelated query", "https://example.com/b")],
  });
  const opportunity = model.opportunities[0];

  const plan = buildResearchPlan({
    opportunityModel: model,
    opportunityId: opportunity.opportunityId,
  });

  assert.equal(
    plan.provenance.contentOpportunityModelFingerprint,
    model.opportunityModelFingerprint,
  );
  assert.equal(
    plan.provenance.contentOpportunityFingerprint,
    opportunity.opportunityFingerprint,
  );
  assert.equal(
    plan.provenance.coverageAssessmentFingerprint,
    opportunity.evidence.coverageAssessmentFingerprint,
  );
  assert.equal(
    plan.provenance.cannibalizationAssessmentFingerprint,
    opportunity.evidence.cannibalizationAssessmentFingerprint,
  );
});

test("UGP-7.1 integrity guard rejects plan mutation", () => {
  const model = modelFor({
    rows: [observation("unrelated query", "https://example.com/b")],
  });
  const opportunity = model.opportunities[0];
  const plan = buildResearchPlan({
    opportunityModel: model,
    opportunityId: opportunity.opportunityId,
  });

  assert.throws(
    () => assertResearchPlanIntegrity({
      ...plan,
      planFingerprint: "0".repeat(64),
    }),
    /ugp_research_plan_fingerprint_mismatch/,
  );
});

test("UGP-7.1 semantics remain planning-only and non-authorizing", () => {
  const model = modelFor({
    rows: [observation("unrelated query", "https://example.com/b")],
  });
  const opportunity = model.opportunities[0];
  const plan = buildResearchPlan({
    opportunityModel: model,
    opportunityId: opportunity.opportunityId,
  });

  assert.deepEqual(plan.semantics, {
    readOnly: true,
    deterministic: true,
    planningOnly: true,
    performsNetworkOperation: false,
    performsSourceAcquisition: false,
    performsPersistence: false,
    generatesArticleText: false,
    generatesClaims: false,
    verifiesClaims: false,
    grantsAuthorization: false,
    publicationAuthorized: false,
    executionAuthorized: false,
  });
});
