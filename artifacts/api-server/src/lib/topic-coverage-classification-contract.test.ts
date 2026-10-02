import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSiteOwnershipEvidence,
  type SiteOwnershipPageInventory,
  type SiteOwnershipQueryPageObservation,
} from "./site-ownership-evidence-contract.js";
import {
  assertTopicCoverageClassificationIntegrity,
  classifyTopicCoverage,
} from "./topic-coverage-classification-contract.js";
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
): TopicCluster {
  const members = Object.freeze(
    [...keywords].sort().map((keyword, index) => Object.freeze({
      keyword,
      evidenceFingerprint: String(index + 3).repeat(64).slice(0, 64),
      searchVolume: 100 - index,
      intent: "informational" as const,
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

function inventory(
  overrides: Partial<SiteOwnershipPageInventory["pages"][number]> = {},
): SiteOwnershipPageInventory {
  return {
    version: "ugp-6-3a-page-inventory-projection-v1",
    canonicalOrigin: "https://example.com",
    sourceAnalysisFingerprint: "a".repeat(64),
    coverage: "observed_inventory_complete",
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
        title: "Stress Relief Journal",
        h1: "Stress Relief Journal",
        headings: ["Stress Relief Journal"],
        contentFingerprint: "e".repeat(64),
        ...overrides,
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
        title: "Other",
        h1: "Other",
        headings: ["Other"],
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

function ownership(input: {
  rows?: readonly SiteOwnershipQueryPageObservation[];
  pageOverrides?: Partial<SiteOwnershipPageInventory["pages"][number]>;
  market?: SearchMarket;
  partial?: boolean;
}) {
  const projected = inventory(input.pageOverrides);
  return buildSiteOwnershipEvidence({
    pageInventory: {
      ...projected,
      coverage: input.partial ? "partial" : projected.coverage,
    },
    market: input.market ?? MARKET,
    queryPageObservations: input.rows,
  });
}

test("UGP-6.3C classifies material search coverage only when ranking evidence and technical page state both qualify", () => {
  const result = classifyTopicCoverage({
    clustering: clustering([
      cluster("stress relief journal", [
        "stress relief journal",
        "stress relief journal prompts",
      ]),
    ]),
    ownership: ownership({
      rows: [
        observation("stress relief journal", "https://example.com/a"),
      ],
    }),
  });

  assert.equal(
    result.assessments[0]?.state,
    "material_search_coverage_observed",
  );
  assert.equal(result.summary.materialSearchCoverageObserved, 1);
  assert.equal(result.summary.uncoveredClusters, 0);
  assert.equal(
    result.assessments[0]?.pages[0]?.qualifiesMaterialSearchCoverage,
    true,
  );
  assertTopicCoverageClassificationIntegrity(result);
});

test("UGP-6.3C preserves material search presence when technical eligibility is not verified", () => {
  const result = classifyTopicCoverage({
    clustering: clustering([
      cluster("stress relief journal", ["stress relief journal"]),
    ]),
    ownership: ownership({
      rows: [
        observation("stress relief journal", "https://example.com/a"),
      ],
      pageOverrides: {
        indexability: "noindex",
      },
    }),
  });

  assert.equal(
    result.assessments[0]?.state,
    "search_presence_observed_technical_state_unverified",
  );
  assert.equal(
    result.assessments[0]?.pages[0]?.qualifiesMaterialSearchCoverage,
    false,
  );
});

test("UGP-6.3C distinguishes observed search presence below the versioned materiality policy", () => {
  const result = classifyTopicCoverage({
    clustering: clustering([
      cluster("stress relief journal", ["stress relief journal"]),
    ]),
    ownership: ownership({
      rows: [
        observation("stress relief journal", "https://example.com/a", {
          impressions: 9,
          position: 8,
        }),
      ],
    }),
  });

  assert.equal(
    result.assessments[0]?.state,
    "search_presence_observed_below_materiality",
  );
  assert.equal(result.summary.searchPresenceBelowMateriality, 1);
});

test("UGP-6.3C uses exact metadata topic signals only as positive page evidence when search evidence is absent", () => {
  const result = classifyTopicCoverage({
    clustering: clustering([
      cluster("stress relief journal", ["stress relief journal"]),
    ]),
    ownership: ownership({}),
  });

  assert.equal(
    result.assessments[0]?.state,
    "page_topic_signal_observed_without_search_evidence",
  );
  assert.deepEqual(result.assessments[0]?.pages[0]?.metadataSignals, [
    "title",
    "h1",
    "heading",
  ]);
  assert.equal(result.summary.materialSearchCoverageObserved, 0);
  assert.equal(result.summary.uncoveredClusters, 0);
});

test("UGP-6.3C never converts absent matching evidence into uncovered", () => {
  const result = classifyTopicCoverage({
    clustering: clustering([
      cluster("unrepresented topic", ["unrepresented topic"]),
    ]),
    ownership: ownership({
      rows: [
        observation("other query", "https://example.com/b"),
      ],
    }),
  });

  assert.equal(
    result.assessments[0]?.state,
    "no_matching_topic_evidence_in_supplied_scope",
  );
  assert.ok(
    result.assessments[0]?.reasons.includes(
      "absence_is_not_uncovered_due_to_uncertified_whole_site_scope",
    ),
  );
  assert.equal(result.summary.uncoveredClusters, 0);
  assert.equal(result.semantics.declaresUncovered, false);
});

test("UGP-6.3C emits explicit query-page-evidence-not-supplied state when neither search nor metadata signals exist", () => {
  const result = classifyTopicCoverage({
    clustering: clustering([
      cluster("unrepresented topic", ["unrepresented topic"]),
    ]),
    ownership: ownership({}),
  });

  assert.equal(
    result.assessments[0]?.state,
    "query_page_evidence_not_supplied",
  );
  assert.ok(
    result.missingEvidence.includes("query_page_performance_not_supplied"),
  );
  assert.ok(
    result.missingEvidence.includes("whole_site_not_independently_certified"),
  );
});

test("UGP-6.3C preserves partial-crawl uncertainty", () => {
  const result = classifyTopicCoverage({
    clustering: clustering([
      cluster("unrepresented topic", ["unrepresented topic"]),
    ]),
    ownership: ownership({
      rows: [
        observation("other query", "https://example.com/b"),
      ],
      partial: true,
    }),
  });

  assert.ok(result.missingEvidence.includes("crawl_inventory_partial"));
  assert.equal(result.summary.uncoveredClusters, 0);
});

test("UGP-6.3C rejects clustering/ownership market mismatch", () => {
  assert.throws(
    () => classifyTopicCoverage({
      clustering: clustering([
        cluster("stress relief journal", ["stress relief journal"]),
      ], { ...MARKET, device: "mobile" }),
      ownership: ownership({
        rows: [
          observation("stress relief journal", "https://example.com/a"),
        ],
      }),
    }),
    /ugp_topic_coverage_market_mismatch/,
  );
});

test("UGP-6.3C fails closed on ambiguous multi-source query/page evidence", () => {
  assert.throws(
    () => classifyTopicCoverage({
      clustering: clustering([
        cluster("stress relief journal", ["stress relief journal"]),
      ]),
      ownership: ownership({
        rows: [
          observation("stress relief journal", "https://example.com/a"),
          observation("stress relief journal", "https://example.com/a", {
            sourceId: "second-source",
            sourceFingerprint: "9".repeat(64),
          }),
        ],
      }),
    }),
    /ugp_topic_coverage_ambiguous_multi_source_query_page/,
  );
});

test("UGP-6.3C output is invariant to query-page input order", () => {
  const topic = clustering([
    cluster("stress relief journal", [
      "stress relief journal",
      "stress relief journal prompts",
    ]),
  ]);
  const rows = [
    observation("stress relief journal", "https://example.com/a"),
    observation("stress relief journal prompts", "https://example.com/b"),
  ];

  const forward = classifyTopicCoverage({
    clustering: topic,
    ownership: ownership({ rows }),
  });
  const reverse = classifyTopicCoverage({
    clustering: topic,
    ownership: ownership({ rows: [...rows].reverse() }),
  });

  assert.deepEqual(forward, reverse);
  assert.equal(forward.coverageFingerprint, reverse.coverageFingerprint);
});

test("UGP-6.3C rejects tampered topic clustering lineage", () => {
  const topic = clustering([
    cluster("stress relief journal", ["stress relief journal"]),
  ]);

  assert.throws(
    () => classifyTopicCoverage({
      clustering: {
        ...topic,
        clusteringFingerprint: "f".repeat(64),
      },
      ownership: ownership({
        rows: [
          observation("stress relief journal", "https://example.com/a"),
        ],
      }),
    }),
    /ugp_topic_coverage_topic_clustering_integrity_failed/,
  );
});

test("UGP-6.3C integrity guard rejects output mutation and semantics remain permanently non-authorizing", () => {
  const result = classifyTopicCoverage({
    clustering: clustering([
      cluster("stress relief journal", ["stress relief journal"]),
    ]),
    ownership: ownership({
      rows: [
        observation("stress relief journal", "https://example.com/a"),
      ],
    }),
  });

  assert.deepEqual(result.semantics, {
    readOnly: true,
    deterministic: true,
    grantsAuthorization: false,
    grantsProviderWrite: false,
    grantsPublicSiteWrite: false,
    performsNetworkOperation: false,
    performsPersistence: false,
    declaresUncovered: false,
    recommendsRemediation: false,
  });

  assert.throws(
    () => assertTopicCoverageClassificationIntegrity({
      ...result,
      coverageFingerprint: "0".repeat(64),
    }),
    /ugp_topic_coverage_fingerprint_mismatch/,
  );
});
