import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSiteOwnershipEvidence,
  type SiteOwnershipPageInventory,
  type SiteOwnershipQueryPageObservation,
} from "./site-ownership-evidence-contract.js";
import {
  detectCannibalization,
} from "./cannibalization-detection-contract.js";
import {
  classifyTopicCoverage,
} from "./topic-coverage-classification-contract.js";
import {
  assertContentOpportunityModelIntegrity,
  buildContentOpportunityBusinessRelevanceEvidence,
  buildContentOpportunityModel,
} from "./content-opportunity-model-contract.js";
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
      evidenceFingerprint: String(index + 4).repeat(64).slice(0, 64),
      searchVolume: 100 - index,
      intent,
    })),
  );
  const base = {
    representativeKeyword,
    members,
  };
  return Object.freeze({
    clusterFingerprint: stableEvidenceHash({
      purpose: "ugp_topic_cluster",
      version: "ugp-6-2a-deterministic-topic-clustering-v1",
      ...base,
    }),
    ...base,
  });
}

function clustering(
  clusters: readonly TopicCluster[],
  market: SearchMarket = MARKET,
): TopicClusteringResult {
  const base = {
    version: "ugp-6-2a-deterministic-topic-clustering-v1" as const,
    market,
    policy: UGP_TOPIC_CLUSTERING_POLICY,
    clusters: Object.freeze([...clusters]),
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
  pageAIndexability?: "indexable" | "noindex" | "http_not_indexable" | "unavailable";
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
        indexability: input.pageAIndexability ?? "indexable",
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

function buildInputs(input: {
  topic?: TopicCluster;
  rows?: readonly SiteOwnershipQueryPageObservation[];
  omitRows?: boolean;
  topicMetadata?: boolean;
  pageAIndexability?: "indexable" | "noindex" | "http_not_indexable" | "unavailable";
  partial?: boolean;
  relevance?: number;
}) {
  const topic = input.topic ?? cluster(
    "stress relief journal",
    ["stress relief journal"],
  );
  const topicClustering = clustering([topic]);
  const ownership = buildSiteOwnershipEvidence({
    pageInventory: inventory({
      topicMetadata: input.topicMetadata,
      pageAIndexability: input.pageAIndexability,
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
  return {
    clustering: topicClustering,
    cannibalization,
    coverage,
    businessRelevance: [business],
  };
}

test("UGP-6.4 protects strong material existing coverage with leave-alone", () => {
  const result = buildContentOpportunityModel(buildInputs({
    rows: [
      observation("stress relief journal", "https://example.com/a"),
    ],
  }));

  assert.equal(result.opportunities[0]?.recommendedAction, "leave_alone");
  assert.equal(
    result.opportunities[0]?.existingCoverage,
    "material_search_coverage_observed",
  );
  assert.equal(
    result.opportunities[0]?.expectedMeasurement.method,
    "ongoing_search_observation",
  );
  assert.equal(result.summary.leave_alone, 1);
  assertContentOpportunityModelIntegrity(result);
});

test("UGP-6.4 chooses consolidation review when material topic competition is observed", () => {
  const result = buildContentOpportunityModel(buildInputs({
    rows: [
      observation("stress relief journal", "https://example.com/a"),
      observation("stress relief journal", "https://example.com/b"),
    ],
  }));

  assert.equal(
    result.opportunities[0]?.recommendedAction,
    "consolidate_candidate",
  );
  assert.equal(
    result.opportunities[0]?.cannibalizationState,
    "exact_query_collision_detected",
  );
  assert.equal(
    result.opportunities[0]?.expectedMeasurement.causalAttribution,
    false,
  );
});

test("UGP-6.4 prefers refresh over a new page when weak search presence already exists", () => {
  const result = buildContentOpportunityModel(buildInputs({
    rows: [
      observation("stress relief journal", "https://example.com/a", {
        impressions: 9,
        position: 8,
      }),
    ],
  }));

  assert.equal(result.opportunities[0]?.recommendedAction, "refresh_candidate");
  assert.equal(
    result.opportunities[0]?.existingCoverage,
    "search_presence_observed_below_materiality",
  );
});

test("UGP-6.4 prefers refresh when an existing exact page-topic metadata signal is observed", () => {
  const result = buildContentOpportunityModel(buildInputs({
    rows: [observation("unrelated query", "https://example.com/b")],
    topicMetadata: true,
  }));

  assert.equal(result.opportunities[0]?.recommendedAction, "refresh_candidate");
  assert.equal(
    result.opportunities[0]?.existingCoverage,
    "page_topic_signal_observed_without_search_evidence",
  );
});

test("UGP-6.4 emits create candidate only inside complete observed inventory with query evidence supplied", () => {
  const result = buildContentOpportunityModel(buildInputs({
    rows: [observation("unrelated query", "https://example.com/b")],
  }));

  assert.equal(result.opportunities[0]?.recommendedAction, "create_candidate");
  assert.equal(
    result.opportunities[0]?.existingCoverage,
    "no_matching_topic_evidence_in_supplied_scope",
  );
  assert.ok(
    result.opportunities[0]?.limitations.includes(
      "whole_site_absence_not_independently_certified",
    ),
  );
  assert.ok(
    result.opportunities[0]?.limitations.includes(
      "whole_site_not_independently_certified",
    ),
  );
});

test("UGP-6.4 defers creation when crawl inventory is partial", () => {
  const result = buildContentOpportunityModel(buildInputs({
    rows: [observation("unrelated query", "https://example.com/b")],
    partial: true,
  }));

  assert.equal(
    result.opportunities[0]?.recommendedAction,
    "defer_insufficient_evidence",
  );
  assert.ok(
    result.opportunities[0]?.limitations.includes("crawl_inventory_partial"),
  );
});

test("UGP-6.4 defers when query-page evidence is not supplied and no page topic signal exists", () => {
  const result = buildContentOpportunityModel(buildInputs({
    omitRows: true,
  }));

  assert.equal(
    result.opportunities[0]?.recommendedAction,
    "defer_insufficient_evidence",
  );
  assert.ok(
    result.opportunities[0]?.limitations.includes(
      "query_page_performance_not_supplied",
    ),
  );
});

test("UGP-6.4 business relevance is an explicit action gate", () => {
  const result = buildContentOpportunityModel(buildInputs({
    rows: [
      observation("stress relief journal", "https://example.com/a"),
      observation("stress relief journal", "https://example.com/b"),
    ],
    relevance: 0.2,
  }));

  assert.equal(result.opportunities[0]?.recommendedAction, "leave_alone");
  assert.deepEqual(result.opportunities[0]?.rationale, [
    "business_relevance_below_action_candidate_threshold",
  ]);
});

test("UGP-6.4 derives content type deterministically from dominant cluster intent", () => {
  const commercial = cluster(
    "best stress journal",
    ["best stress journal", "stress journal comparison"],
    "commercial",
  );
  const result = buildContentOpportunityModel(buildInputs({
    topic: commercial,
    rows: [observation("other query", "https://example.com/b")],
  }));

  assert.equal(result.opportunities[0]?.searchIntent, "commercial");
  assert.equal(
    result.opportunities[0]?.recommendedContentType,
    "comparison_or_category",
  );
});

test("UGP-6.4 rejects incomplete business relevance evidence", () => {
  const input = buildInputs({
    rows: [observation("other query", "https://example.com/b")],
  });
  assert.throws(
    () => buildContentOpportunityModel({
      ...input,
      businessRelevance: [],
    }),
    /ugp_content_opportunity_business_evidence_incomplete/,
  );
});

test("UGP-6.4 rejects cross-contract ownership lineage mismatch", () => {
  const input = buildInputs({
    rows: [observation("other query", "https://example.com/b")],
  });
  assert.throws(
    () => buildContentOpportunityModel({
      ...input,
      coverage: {
        ...input.coverage,
        provenance: {
          ...input.coverage.provenance,
          siteOwnershipEvidenceFingerprint: "8".repeat(64),
        },
        coverageFingerprint: stableEvidenceHash({
          purpose: "ugp_topic_coverage_classification_result",
          ...input.coverage,
          provenance: {
            ...input.coverage.provenance,
            siteOwnershipEvidenceFingerprint: "8".repeat(64),
          },
          coverageFingerprint: undefined,
        }),
      } as any,
    }),
    /ugp_topic_coverage_fingerprint_mismatch|ugp_content_opportunity_ownership_lineage_mismatch/,
  );
});

test("UGP-6.4 output is deterministic and permanently non-authorizing", () => {
  const input = buildInputs({
    rows: [observation("other query", "https://example.com/b")],
  });
  const first = buildContentOpportunityModel(input);
  const second = buildContentOpportunityModel({
    ...input,
    businessRelevance: [...input.businessRelevance].reverse(),
  });

  assert.deepEqual(first, second);
  assert.equal(
    first.opportunityModelFingerprint,
    second.opportunityModelFingerprint,
  );
  assert.deepEqual(first.semantics, {
    readOnly: true,
    deterministic: true,
    evidenceBacked: true,
    grantsAuthorization: false,
    grantsProviderWrite: false,
    grantsPublicSiteWrite: false,
    performsNetworkOperation: false,
    performsPersistence: false,
    publicationAuthorized: false,
    executionAuthorized: false,
    causalAttribution: false,
  });
});

test("UGP-6.4 integrity guard rejects output fingerprint mutation", () => {
  const result = buildContentOpportunityModel(buildInputs({
    rows: [observation("other query", "https://example.com/b")],
  }));

  assert.throws(
    () => assertContentOpportunityModelIntegrity({
      ...result,
      opportunityModelFingerprint: "0".repeat(64),
    }),
    /ugp_content_opportunity_fingerprint_mismatch/,
  );
});
