import assert from "node:assert/strict";
import test from "node:test";
import {
  finalizeKeywordSerpEvidenceBundle,
  stableEvidenceHash,
  type KeywordSerpEvidenceBundle,
  type NormalizedSearchIntent,
} from "./keyword-serp-evidence-contract.js";
import {
  buildSemanticSimilarityEvidence,
  clusterKeywordSerpEvidence,
  type TopicClusteringCandidate,
} from "./topic-clustering-contract.js";

const MARKET = Object.freeze({
  searchEngine: "google" as const,
  locationCode: 2840,
  languageCode: "en",
  device: "desktop" as const,
});

function evidence(input: {
  keyword: string;
  intent: NormalizedSearchIntent;
  volume: number;
  urls: readonly string[];
  marketLocationCode?: number;
}): KeywordSerpEvidenceBundle {
  const market = Object.freeze({
    ...MARKET,
    locationCode: input.marketLocationCode ?? MARKET.locationCode,
  });
  return finalizeKeywordSerpEvidenceBundle({
    keyword: Object.freeze({
      keyword: input.keyword,
      market,
      searchVolume: input.volume,
      keywordDifficulty: 20,
      cpcUsd: 1,
      paidCompetition: 0.2,
      paidCompetitionLevel: "low" as const,
      intent: input.intent,
      monthlySearches: Object.freeze([]),
    }),
    relatedTopics: Object.freeze([]),
    serp: Object.freeze({
      keyword: input.keyword,
      market,
      features: Object.freeze([]),
      rankingUrls: Object.freeze(input.urls.map((url, index) => Object.freeze({
        rankAbsolute: index + 1,
        rankGroup: index + 1,
        url,
        domain: new URL(url).hostname,
        title: null,
        resultType: "organic",
        isOrganic: true,
      }))),
    }),
    provenance: Object.freeze([Object.freeze({
      provider: "dataforseo" as const,
      providerDataset: "serp_advanced" as const,
      providerTaskId: "fixture-" + input.keyword,
      providerStatusCode: 20000,
      providerStatusMessage: "Ok.",
      providerPath: "v3/serp/google/organic/live/advanced",
      costUsd: 0,
      responseFingerprint: stableEvidenceHash({ keyword: input.keyword }),
    })]),
  });
}

function candidate(
  bundle: KeywordSerpEvidenceBundle,
  categories: readonly string[] = [],
  entities: readonly string[] = [],
): TopicClusteringCandidate {
  return Object.freeze({
    evidence: bundle,
    context: Object.freeze({ categories, entities }),
  });
}

function semantics(
  bundles: readonly KeywordSerpEvidenceBundle[],
  scores: Readonly<Record<string, number>>,
) {
  const out = [];
  for (let left = 0; left < bundles.length; left += 1) {
    for (let right = left + 1; right < bundles.length; right += 1) {
      const leftBundle = bundles[left];
      const rightBundle = bundles[right];
      const key = [leftBundle.keyword.keyword, rightBundle.keyword.keyword]
        .sort()
        .join("|");
      out.push(buildSemanticSimilarityEvidence({
        leftEvidenceFingerprint: leftBundle.evidenceFingerprint,
        rightEvidenceFingerprint: rightBundle.evidenceFingerprint,
        similarity: scores[key] ?? 0,
        modelId: "fixture-semantic-v1",
      }));
    }
  }
  return out;
}

test("UGP-6.2A deterministically clusters related evidence independent of input order", () => {
  const a = evidence({
    keyword: "stress relief journal",
    intent: "informational",
    volume: 720,
    urls: [
      "https://example.com/stress?a=1",
      "https://example.org/journal",
      "https://example.net/prompts",
    ],
  });
  const b = evidence({
    keyword: "stress relief journal prompts",
    intent: "informational",
    volume: 40,
    urls: [
      "https://example.com/stress?b=2",
      "https://example.org/journal/",
      "https://other.test/prompts",
    ],
  });
  const c = evidence({
    keyword: "daily planner printable",
    intent: "transactional",
    volume: 1000,
    urls: [
      "https://shop.test/planner",
      "https://print.test/daily",
      "https://market.test/download",
    ],
  });

  const bundles = [a, b, c];
  const scores = {
    "stress relief journal|stress relief journal prompts": 0.91,
    "daily planner printable|stress relief journal": 0.18,
    "daily planner printable|stress relief journal prompts": 0.20,
  };

  const first = clusterKeywordSerpEvidence({
    candidates: [
      candidate(a, ["journaling"], ["stress"]),
      candidate(b, ["journaling"], ["stress"]),
      candidate(c, ["planners"], ["printable"]),
    ],
    semanticSimilarities: semantics(bundles, scores),
  });

  const second = clusterKeywordSerpEvidence({
    candidates: [
      candidate(c, ["planners"], ["printable"]),
      candidate(b, ["journaling"], ["stress"]),
      candidate(a, ["journaling"], ["stress"]),
    ],
    semanticSimilarities: semantics([c, b, a], scores).reverse(),
  });

  assert.equal(first.clusteringFingerprint, second.clusteringFingerprint);
  assert.deepEqual(first.clusters.map((cluster) => cluster.members.map((m) => m.keyword)), [
    ["daily planner printable"],
    ["stress relief journal", "stress relief journal prompts"],
  ]);
  assert.equal(
    first.clusters.find((cluster) =>
      cluster.members.some((member) => member.keyword === "stress relief journal"),
    )?.representativeKeyword,
    "stress relief journal",
  );
  assert.equal(first.semantics.readOnly, true);
  assert.equal(first.semantics.performsNetworkOperation, false);
  assert.equal(first.semantics.performsPersistence, false);
});

test("UGP-6.2A hard-blocks incompatible intent even with perfect semantic and SERP overlap", () => {
  const a = evidence({
    keyword: "stress journal guide",
    intent: "informational",
    volume: 500,
    urls: ["https://same.test/a", "https://same.test/b"],
  });
  const b = evidence({
    keyword: "buy stress journal",
    intent: "transactional",
    volume: 400,
    urls: ["https://same.test/a", "https://same.test/b"],
  });

  const result = clusterKeywordSerpEvidence({
    candidates: [candidate(a), candidate(b)],
    semanticSimilarities: semantics([a, b], {
      "buy stress journal|stress journal guide": 1,
    }),
  });

  assert.equal(result.clusters.length, 2);
  assert.equal(result.pairAssessments[0].eligible, false);
  assert.deepEqual(result.pairAssessments[0].reasons, ["intent_incompatible"]);
});

test("UGP-6.2A complete-link clustering prevents transitive bridge over-merging", () => {
  const sharedAB = [
    "https://one.test/a",
    "https://two.test/a",
    "https://three.test/a",
  ];
  const a = evidence({
    keyword: "alpha topic",
    intent: "informational",
    volume: 100,
    urls: sharedAB,
  });
  const b = evidence({
    keyword: "beta topic",
    intent: "informational",
    volume: 90,
    urls: sharedAB,
  });
  const c = evidence({
    keyword: "gamma topic",
    intent: "informational",
    volume: 80,
    urls: [
      "https://one.test/a",
      "https://outside.test/c",
      "https://outside2.test/c",
    ],
  });

  const result = clusterKeywordSerpEvidence({
    candidates: [
      candidate(a, ["same"], ["entity"]),
      candidate(b, ["same"], ["entity"]),
      candidate(c, ["same"], ["entity"]),
    ],
    semanticSimilarities: semantics([a, b, c], {
      "alpha topic|beta topic": 0.95,
      "beta topic|gamma topic": 0.95,
      "alpha topic|gamma topic": 0.10,
    }),
  });

  assert.equal(result.clusters.length, 2);
  assert.deepEqual(
    result.clusters.map((cluster) => cluster.members.map((member) => member.keyword)),
    [["alpha topic", "beta topic"], ["gamma topic"]],
  );
});

test("UGP-6.2A requires a complete integrity-checked semantic matrix", () => {
  const a = evidence({
    keyword: "alpha",
    intent: "informational",
    volume: 10,
    urls: ["https://a.test/"],
  });
  const b = evidence({
    keyword: "beta",
    intent: "informational",
    volume: 10,
    urls: ["https://b.test/"],
  });
  const c = evidence({
    keyword: "gamma",
    intent: "informational",
    volume: 10,
    urls: ["https://c.test/"],
  });

  assert.throws(
    () => clusterKeywordSerpEvidence({
      candidates: [candidate(a), candidate(b), candidate(c)],
      semanticSimilarities: semantics([a, b], { "alpha|beta": 0.8 }),
    }),
    /incomplete_semantic_matrix/,
  );

  const broken = {
    ...buildSemanticSimilarityEvidence({
      leftEvidenceFingerprint: a.evidenceFingerprint,
      rightEvidenceFingerprint: b.evidenceFingerprint,
      similarity: 0.8,
      modelId: "fixture-semantic-v1",
    }),
    evidenceFingerprint: "0".repeat(64),
  };

  assert.throws(
    () => clusterKeywordSerpEvidence({
      candidates: [candidate(a), candidate(b)],
      semanticSimilarities: [broken],
    }),
    /semantic_evidence_integrity_failed/,
  );
});

test("UGP-6.2A rejects mixed search markets", () => {
  const a = evidence({
    keyword: "alpha",
    intent: "informational",
    volume: 10,
    urls: ["https://a.test/"],
  });
  const b = evidence({
    keyword: "beta",
    intent: "informational",
    volume: 10,
    urls: ["https://b.test/"],
    marketLocationCode: 2826,
  });

  assert.throws(
    () => clusterKeywordSerpEvidence({
      candidates: [candidate(a), candidate(b)],
      semanticSimilarities: semantics([a, b], { "alpha|beta": 0.8 }),
    }),
    /mixed_market/,
  );
});
