import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSiteOwnershipEvidence,
  type SiteOwnershipQueryPageObservation,
} from "./site-ownership-evidence-contract.js";
import {
  assertCannibalizationDetectionIntegrity,
  detectCannibalization,
} from "./cannibalization-detection-contract.js";
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
      evidenceFingerprint: String(index + 1).repeat(64).slice(0, 64),
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

function ownership(
  observations: readonly SiteOwnershipQueryPageObservation[],
  market: SearchMarket = MARKET,
) {
  return buildSiteOwnershipEvidence({
    pageInventory: {
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
          title: "A",
          h1: "A",
          headings: ["A"],
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
          title: "B",
          h1: "B",
          headings: ["B"],
          contentFingerprint: "2".repeat(64),
        },
      ],
    },
    market,
    queryPageObservations: observations,
  });
}

test("UGP-6.3B detects an exact-query collision when two material pages rank for one cluster member query", () => {
  const result = detectCannibalization({
    clustering: clustering([
      cluster("stress relief journal", [
        "stress relief journal",
        "stress relief journal prompts",
      ]),
    ]),
    ownership: ownership([
      observation("stress relief journal", "https://example.com/a"),
      observation("stress relief journal", "https://example.com/b"),
    ]),
  });

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0]?.classification, "exact_query_collision");
  assert.equal(
    result.clusterAssessments[0]?.state,
    "exact_query_collision_detected",
  );
  assert.deepEqual(
    result.clusterAssessments[0]?.exactQueryCollisions[0]?.pageUrls,
    ["https://example.com/a", "https://example.com/b"],
  );
  assertCannibalizationDetectionIntegrity(result);
});

test("UGP-6.3B detects topic-page dispersion when separate member queries materially rank different pages", () => {
  const result = detectCannibalization({
    clustering: clustering([
      cluster("stress relief journal", [
        "stress relief journal",
        "stress relief journal prompts",
      ]),
    ]),
    ownership: ownership([
      observation("stress relief journal", "https://example.com/a"),
      observation("stress relief journal prompts", "https://example.com/b"),
    ]),
  });

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0]?.classification, "topic_page_dispersion");
  assert.equal(
    result.clusterAssessments[0]?.state,
    "topic_page_dispersion_detected",
  );
  assert.equal(result.clusterAssessments[0]?.exactQueryCollisions.length, 0);
});

test("UGP-6.3B ignores low-materiality secondary rows below impressions or beyond position policy", () => {
  for (const weak of [
    { impressions: 9, position: 8 },
    { impressions: 25, position: 21 },
  ]) {
    const result = detectCannibalization({
      clustering: clustering([
        cluster("stress relief journal", ["stress relief journal"]),
      ]),
      ownership: ownership([
        observation("stress relief journal", "https://example.com/a"),
        observation("stress relief journal", "https://example.com/b", weak),
      ]),
    });
    assert.equal(result.findings.length, 0);
    assert.equal(
      result.clusterAssessments[0]?.state,
      "no_material_collision_observed_in_supplied_evidence",
    );
  }
});

test("UGP-6.3B preserves explicit missing query-page evidence instead of claiming no cannibalization", () => {
  const result = detectCannibalization({
    clustering: clustering([
      cluster("stress relief journal", ["stress relief journal"]),
    ]),
    ownership: ownership([]),
  });

  assert.equal(result.findings.length, 0);
  assert.equal(
    result.clusterAssessments[0]?.state,
    "query_page_evidence_not_supplied",
  );
  assert.ok(result.missingEvidence.includes("query_page_performance_not_supplied"));
  assert.ok(result.missingEvidence.includes("whole_site_not_independently_certified"));
});

test("UGP-6.3B distinguishes supplied evidence with no matching cluster query", () => {
  const result = detectCannibalization({
    clustering: clustering([
      cluster("stress relief journal", ["stress relief journal"]),
    ]),
    ownership: ownership([
      observation("unrelated query", "https://example.com/a"),
    ]),
  });
  assert.equal(
    result.clusterAssessments[0]?.state,
    "no_matching_cluster_query_evidence",
  );
  assert.equal(result.findings.length, 0);
});

test("UGP-6.3B fails closed on clustering/ownership market mismatch", () => {
  assert.throws(
    () => detectCannibalization({
      clustering: clustering([
        cluster("stress relief journal", ["stress relief journal"]),
      ], { ...MARKET, device: "mobile" }),
      ownership: ownership([
        observation("stress relief journal", "https://example.com/a"),
      ]),
    }),
    /ugp_cannibalization_market_mismatch/,
  );
});

test("UGP-6.3B fails closed on ambiguous multi-source evidence for one query/page identity", () => {
  assert.throws(
    () => detectCannibalization({
      clustering: clustering([
        cluster("stress relief journal", ["stress relief journal"]),
      ]),
      ownership: ownership([
        observation("stress relief journal", "https://example.com/a"),
        observation("stress relief journal", "https://example.com/a", {
          sourceId: "second-source",
          sourceFingerprint: "9".repeat(64),
        }),
      ]),
    }),
    /ugp_cannibalization_ambiguous_multi_source_query_page/,
  );
});

test("UGP-6.3B output is invariant to supplied query-page observation order", () => {
  const rows = [
    observation("stress relief journal", "https://example.com/a"),
    observation("stress relief journal prompts", "https://example.com/b"),
  ];
  const topic = clustering([
    cluster("stress relief journal", [
      "stress relief journal",
      "stress relief journal prompts",
    ]),
  ]);
  const forward = detectCannibalization({
    clustering: topic,
    ownership: ownership(rows),
  });
  const reverse = detectCannibalization({
    clustering: topic,
    ownership: ownership([...rows].reverse()),
  });
  assert.deepEqual(forward, reverse);
  assert.equal(
    forward.cannibalizationFingerprint,
    reverse.cannibalizationFingerprint,
  );
});

test("UGP-6.3B rejects tampered topic-clustering lineage", () => {
  const topic = clustering([
    cluster("stress relief journal", ["stress relief journal"]),
  ]);
  assert.throws(
    () => detectCannibalization({
      clustering: {
        ...topic,
        clusteringFingerprint: "f".repeat(64),
      },
      ownership: ownership([
        observation("stress relief journal", "https://example.com/a"),
      ]),
    }),
    /ugp_cannibalization_topic_clustering_integrity_failed/,
  );
});

test("UGP-6.3B integrity guard rejects output mutation and semantics remain closed", () => {
  const result = detectCannibalization({
    clustering: clustering([
      cluster("stress relief journal", ["stress relief journal"]),
    ]),
    ownership: ownership([
      observation("stress relief journal", "https://example.com/a"),
    ]),
  });
  assert.deepEqual(result.semantics, {
    readOnly: true,
    deterministic: true,
    grantsAuthorization: false,
    grantsProviderWrite: false,
    grantsPublicSiteWrite: false,
    performsNetworkOperation: false,
    performsPersistence: false,
    recommendsRemediation: false,
  });
  assert.throws(
    () => assertCannibalizationDetectionIntegrity({
      ...result,
      cannibalizationFingerprint: "0".repeat(64),
    }),
    /ugp_cannibalization_fingerprint_mismatch/,
  );
});
