import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  normalizeBacklinkFixtureBundle,
  type BacklinkProfileInput,
} from "./backlink-fixture-normalization.js";
import {
  buildCompetitorVisibilityGapReport,
  canonicalVisibilityDomain,
  canonicalVisibilityPageKey,
  competitorVisibilityGapPipelineCapability,
  type CompetitorVisibilityPipelineInput,
} from "./competitor-visibility-gap-pipeline.js";
import {
  normalizeCompetitorObservation,
  type CompetitorEvidenceEnvelope,
} from "./competitor-intelligence.js";
import type { SerpRankingProjection } from "./dataforseo-serp-adapter.js";
import {
  buildKeywordMetricProjection,
  type KeywordMetricProjection,
} from "./keyword-metrics-normalization.js";
import {
  normalizeCategoryContext,
  normalizeMarketProfile,
} from "./market-category-intelligence.js";
import {
  buildTrendProjection,
  P5_4_TREND_SCALE,
  type TrendProjection,
} from "./trend-metrics-normalization.js";

const market = normalizeMarketProfile({
  countryCode: "US",
  language: "en-US",
  searchEngine: "google",
  currency: "USD",
  device: "all",
});
const category = normalizeCategoryContext({
  key: "fragrance",
  name: "Fragrance",
  taxonomyPath: ["beauty", "fragrance"],
});
const referenceTime = "2026-09-18T12:00:00.000Z";
const observedAt = "2026-09-18T10:00:00.000Z";

function fingerprint(label: string): string {
  return createHash("sha256").update(label).digest("hex");
}

function serp(
  keyword: string,
  items: Array<{ rank: number; domain: string; url: string }>,
  suffix = "",
): SerpRankingProjection {
  const organicItems = items.map((item) => ({
    rankGroup: item.rank,
    rankAbsolute: item.rank,
    page: Math.max(1, Math.ceil(item.rank / 10)),
    domain: item.domain,
    url: item.url,
  }));
  return {
    version: "p5.2-dataforseo-serp-adapter-v1",
    rankingId: `ranking-${fingerprint(keyword + suffix).slice(0, 12)}`,
    rankingFingerprint: fingerprint(`serp:${keyword}:${suffix}`),
    providerKey: "dataforseo",
    adapterRequestFingerprint: fingerprint(`serp-request:${keyword}:${suffix}`),
    task68RequestFingerprint: fingerprint(`task68:${keyword}:${suffix}`),
    sourceFingerprint: fingerprint("serp-source"),
    marketFingerprint: market.fingerprint,
    categoryFingerprint: category.fingerprint,
    keyword,
    trackedDomain: "owned.test",
    observedAt,
    checkedDepth: 100,
    searchEngineResultsCount: 1000,
    providerItemsCount: organicItems.length,
    organicItems,
    trackedMatches: organicItems.filter(
      (item) => canonicalVisibilityDomain(item.domain) === "owned.test",
    ),
    safety: {} as SerpRankingProjection["safety"],
  };
}

function keywordMetric(
  keyword: string,
  volume: number,
  difficulty: number,
): KeywordMetricProjection {
  return buildKeywordMetricProjection({
    keyword,
    observedAt,
    providerUpdatedAt: "2026-09-17T00:00:00.000Z",
    basis: {
      providerKey: "synthetic",
      providerMethod: "supplied_keyword_metrics_v1",
      sourceFingerprint: fingerprint("keyword-source"),
      marketFingerprint: market.fingerprint,
      categoryFingerprint: category.fingerprint,
      locationCode: 2840,
      languageCode: "en",
      searchNetwork: "google",
      variantScope: "exact_keyword",
      cpcCurrency: "USD",
      cpcBasis: "provider_reported",
    },
    avgMonthlySearchVolume: volume,
    organicDifficultyScore: difficulty,
    organicDifficultyMethod: "synthetic_top10_difficulty",
    cpcAmount: 1.25,
    paidCompetitionRatio: 0.62,
    paidCompetitionIndex: 62,
    paidCompetitionLevel: "medium",
    paidCompetitionBasis: "provider_advertiser_competition",
  });
}

function timestampSeconds(value: string): number {
  return Math.floor(Date.parse(`${value}T00:00:00.000Z`) / 1000);
}

function trendFrame(keywords: string[], values: number[][], label: string): TrendProjection {
  const dates = ["2026-09-01", "2026-09-05", "2026-09-10", "2026-09-15"];
  return buildTrendProjection({
    basis: {
      providerKey: "synthetic",
      providerMethod: `supplied_trend_${label}_v1`,
      sourceFingerprint: fingerprint(`trend-source:${label}`),
      marketFingerprint: market.fingerprint,
      categoryFingerprint: category.fingerprint,
      keywords,
      locationCode: 2840,
      languageCode: "en",
      property: "web",
      providerCategoryCode: 0,
      dateFrom: dates[0]!,
      dateTo: dates[dates.length - 1]!,
      scale: P5_4_TREND_SCALE,
    },
    observedAt,
    points: dates.map((date, index) => ({
      dateFrom: date,
      dateTo: date,
      timestamp: timestampSeconds(date),
      missingData: false,
      values: values[index]!,
    })),
  });
}

function competitorPage(input: {
  domain: string;
  url: string;
  pageType: string;
  keywordThemes: string[];
  taxonomyLabels: string[];
}): CompetitorEvidenceEnvelope {
  const normalized = normalizeCompetitorObservation(
    {
      source: "synthetic_fixture",
      sourceUrl: input.url,
      competitorDomain: input.domain,
      pageType: input.pageType,
      observedAt,
      confidence: 0.9,
      title: "Synthetic competitor page",
      metaDescription: "Synthetic structural fixture",
      h1: "Synthetic H1",
      wordCount: 900,
      keywordThemes: input.keywordThemes,
      taxonomyLabels: input.taxonomyLabels,
      schemaTypes: ["product"],
      entityTypes: ["brand"],
      internalLinkPatterns: ["collection-to-product"],
    },
    "owned.test",
  );
  assert.equal(normalized.ok, true);
  if (!normalized.ok) throw new Error(normalized.reason);
  return normalized.record;
}

function relation() {
  return { dofollow: true, nofollow: false, sponsored: false, ugc: false };
}

function backlinkProfile(
  targetDomain: string,
  authority: number,
  rows: Array<{ domain: string; authority: number }>,
): BacklinkProfileInput {
  return {
    targetDomain,
    summary: {
      authority,
      referringDomains: rows.length,
      backlinks: rows.length,
      dofollowReferringDomains: rows.length,
      nofollowReferringDomains: 0,
      sponsoredReferringDomains: 0,
      ugcReferringDomains: 0,
      newReferringDomains30d: 0,
      lostReferringDomains30d: 0,
    },
    referringDomains: rows.map((row) => ({
      domain: row.domain,
      authority: row.authority,
      backlinks: 1,
      relations: relation(),
      firstSeenAt: "2026-01-01T00:00:00.000Z",
      lastSeenAt: "2026-09-10T00:00:00.000Z",
      lostAt: null,
      change30d: "unchanged",
      anchorCountBasis: "backlink_count",
      anchors: [{ text: targetDomain, count: 1, classification: "brand" }],
      targetUrls: [`https://${targetDomain}/`],
    })),
  };
}

function backlinkBundle() {
  return normalizeBacklinkFixtureBundle({
    basis: {
      providerKey: "synthetic",
      providerMethod: "supplied_backlink_snapshot_v1",
      sourceFingerprint: fingerprint("backlink-source"),
      marketFingerprint: market.fingerprint,
      categoryFingerprint: category.fingerprint,
      authorityMetric: {
        name: "synthetic_authority",
        min: 0,
        max: 100,
        crossProviderComparable: false,
      },
    },
    observedAt,
    referenceTime,
    owned: backlinkProfile("owned.test", 60, [
      { domain: "shared-source.example", authority: 70 },
    ]),
    competitors: [
      backlinkProfile("www.competitor-a.test", 65, [
        { domain: "a-only.example", authority: 80 },
        { domain: "shared-source.example", authority: 70 },
      ]),
      backlinkProfile("competitor-b.test", 55, [
        { domain: "b-only.example", authority: 60 },
        { domain: "shared-source.example", authority: 70 },
      ]),
    ],
  });
}

function fullInput(): CompetitorVisibilityPipelineInput {
  const pages = [
    competitorPage({
      domain: "competitor-a.test",
      url: "https://www.competitor-a.test/oud/",
      pageType: "collection",
      keywordThemes: ["amber perfume", "oud perfume"],
      taxonomyLabels: ["oud"],
    }),
    competitorPage({
      domain: "competitor-b.test",
      url: "https://competitor-b.test/citrus/",
      pageType: "collection",
      keywordThemes: ["amber perfume", "citrus perfume"],
      taxonomyLabels: ["citrus"],
    }),
  ];
  const serpRankings = [
    serp("amber perfume", [
      { rank: 2, domain: "www.competitor-a.test", url: "https://www.competitor-a.test/oud/?src=serp" },
      { rank: 4, domain: "owned.test", url: "https://owned.test/amber" },
      { rank: 9, domain: "competitor-b.test", url: "https://competitor-b.test/citrus/?q=amber" },
      { rank: 11, domain: "unrelated.test", url: "https://unrelated.test/amber" },
    ]),
    serp("oud perfume", [
      { rank: 3, domain: "competitor-a.test", url: "http://competitor-a.test/oud" },
      { rank: 8, domain: "unrelated.test", url: "https://unrelated.test/oud" },
    ]),
    serp("citrus perfume", [
      { rank: 5, domain: "www.competitor-b.test", url: "https://www.competitor-b.test/citrus/" },
    ]),
    serp("vanilla perfume", [
      { rank: 7, domain: "www.owned.test", url: "https://www.owned.test/vanilla/" },
    ]),
  ];
  return {
    market,
    category,
    referenceTime,
    ownedDomain: "www.OWNED.test.",
    ownedSignals: {
      keywordThemes: ["vanilla perfume", "amber perfume"],
      taxonomyLabels: ["fragrance"],
      schemaTypes: ["product"],
      entityTypes: ["brand"],
      internalLinkPatterns: ["collection-to-product"],
    },
    competitors: [
      { domain: "www.competitor-a.test", manuallyReviewed: true },
      { domain: "competitor-b.test", manuallyReviewed: true },
    ],
    serpRankings,
    keywordMetrics: [
      keywordMetric("amber perfume", 1000, 45),
      keywordMetric("oud perfume", 800, 55),
      keywordMetric("citrus perfume", 500, 35),
    ],
    trends: [
      trendFrame(
        ["amber perfume", "oud perfume"],
        [
          [30, 20],
          [40, 30],
          [50, 60],
          [60, 80],
        ],
        "amber-oud",
      ),
      trendFrame(
        ["citrus perfume"],
        [[20], [25], [40], [55]],
        "citrus",
      ),
    ],
    competitorPages: pages,
    backlinks: backlinkBundle(),
  };
}

test("P5.6 capability stays pure, descriptive, default-off, and non-persistent", () => {
  const capability = competitorVisibilityGapPipelineCapability();
  assert.equal(capability.pureCompositionOnly, true);
  assert.equal(capability.manualCompetitorReviewRequired, true);
  assert.equal(capability.opportunityScoringIncluded, false);
  assert.equal(capability.competitorRankingIncluded, false);
  assert.equal(capability.liveCollectionAuthorized, false);
  assert.equal(capability.credentialUseAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.targetRegistrationAuthorized, false);
  assert.equal(capability.task64ExecutionAuthorized, false);
  assert.equal(capability.task70ExecutionAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.observationPersistenceAuthorized, false);
  assert.equal(capability.evidencePersistenceAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("visibility target identity aliases only leading www while preserving other subdomains", () => {
  assert.equal(canonicalVisibilityDomain("WWW.Example.TEST."), "example.test");
  assert.equal(canonicalVisibilityDomain("blog.example.test"), "blog.example.test");
  assert.notEqual(canonicalVisibilityDomain("blog.example.test"), canonicalVisibilityDomain("example.test"));
  assert.equal(
    canonicalVisibilityPageKey("HTTPS://WWW.Example.TEST/Path/?b=2#fragment"),
    "example.test/Path",
  );
  assert.equal(
    canonicalVisibilityPageKey("http://example.test/Path"),
    "example.test/Path",
  );
});

test("full supplied-artifact pipeline produces deterministic descriptive competitor visibility", () => {
  const report = buildCompetitorVisibilityGapReport(fullInput());
  assert.equal(report.ownedDomain, "owned.test");
  assert.deepEqual(report.competitorDomains, ["competitor-a.test", "competitor-b.test"]);
  assert.equal(report.coverage.serpTopicCount, 4);
  assert.equal(report.coverage.keywordMetricTopicCount, 3);
  assert.equal(report.coverage.trendTopicCount, 3);
  assert.equal(report.coverage.competitorPageEvidenceCount, 2);
  assert.equal(report.coverage.backlinkBundleSupplied, true);

  const a = report.competitorVisibility.find((row) => row.domain === "competitor-a.test")!;
  assert.deepEqual(a, {
    domain: "competitor-a.test",
    observedSerpTopicCount: 4,
    visibleTopicCount: 2,
    top10VisibleTopicCount: 2,
    top20VisibleTopicCount: 2,
    bestObservedOrganicRank: 2,
    observedTopicVisibilityRatio: 0.5,
    competitorOnlyVisibleTopicCount: 1,
    sharedOwnedCompetitorVisibleTopicCount: 1,
    pageEvidenceCount: 1,
    visiblePageEvidenceCount: 1,
    semanticDifferencePageCount: 1,
    backlinkAuthority: {
      value: 65,
      providerKey: "synthetic",
      providerMethod: "supplied_backlink_snapshot_v1",
      metricName: "synthetic_authority",
      min: 0,
      max: 100,
      crossProviderComparable: false,
    },
    backlinkGapReferringDomainCount: 1,
    backlinkSharedCoverageReferringDomainCount: 1,
  });

  const b = report.competitorVisibility.find((row) => row.domain === "competitor-b.test")!;
  assert.equal(b.visibleTopicCount, 2);
  assert.equal(b.competitorOnlyVisibleTopicCount, 1);
  assert.equal(b.sharedOwnedCompetitorVisibleTopicCount, 1);
  assert.equal(b.backlinkGapReferringDomainCount, 1);
  assert.equal(b.backlinkSharedCoverageReferringDomainCount, 1);

  assert.equal(report.semantics.observedTopicVisibilityRatioIsMarketShare, false);
  assert.equal(report.semantics.crossSignalOpportunityScoreIncluded, false);
  assert.equal(report.semantics.descriptiveOnly, true);
});

test("page semantic differences use Task #58 structural dimensions and join supplied SERP pages", () => {
  const report = buildCompetitorVisibilityGapReport(fullInput());
  const a = report.pageSemanticGaps.find((row) => row.competitorDomain === "competitor-a.test")!;
  assert.equal(a.pageKey, "competitor-a.test/oud");
  assert.deepEqual(a.semanticDifferences.keywordThemes, ["oud perfume"]);
  assert.deepEqual(a.semanticDifferences.taxonomyLabels, ["oud"]);
  assert.deepEqual(a.semanticDifferences.schemaTypes, []);
  assert.deepEqual(a.semanticDifferences.entityTypes, []);
  assert.deepEqual(a.semanticDifferences.internalLinkPatterns, []);
  assert.equal(a.semanticDifferenceCount, 2);
  assert.equal(a.semanticDifferenceObserved, true);
  assert.equal(a.serpTopicAppearanceCount, 2);
  assert.equal(a.bestObservedOrganicRank, 2);
  assert.deepEqual(a.observedSerpTopics, ["amber perfume", "oud perfume"]);
});

test("topic rows separate SERP and semantic gap states without an opportunity score", () => {
  const report = buildCompetitorVisibilityGapReport(fullInput());
  const amber = report.topicGaps.find((row) => row.topic === "amber perfume")!;
  const oud = report.topicGaps.find((row) => row.topic === "oud perfume")!;
  const citrus = report.topicGaps.find((row) => row.topic === "citrus perfume")!;
  const vanilla = report.topicGaps.find((row) => row.topic === "vanilla perfume")!;

  assert.equal(amber.serpState, "shared");
  assert.equal(amber.semanticState, "shared");
  assert.equal(amber.topicGapObserved, false);
  assert.equal(amber.keywordMetrics?.avgMonthlySearchVolume, 1000);
  assert.equal(amber.keywordMetrics?.organicDifficultyScore, 45);
  assert.equal(amber.keywordMetrics?.organicDifficultyCrossProviderComparable, false);
  assert.equal(amber.trend?.crossFrameComparable, false);
  assert.equal(amber.trend?.direction, "rising");

  assert.equal(oud.serpState, "competitor_only");
  assert.equal(oud.semanticState, "competitor_only");
  assert.equal(oud.serpGapObserved, true);
  assert.equal(oud.semanticGapObserved, true);
  assert.equal(oud.topicGapObserved, true);
  assert.deepEqual(oud.competitorSerpPresence, [{ domain: "competitor-a.test", bestRank: 3 }]);

  assert.equal(citrus.serpState, "competitor_only");
  assert.equal(citrus.semanticState, "competitor_only");
  assert.equal(citrus.topicGapObserved, true);

  assert.equal(vanilla.serpState, "owned_only");
  assert.equal(vanilla.semanticState, "owned_only");
  assert.equal(vanilla.topicGapObserved, false);
  assert.equal(vanilla.keywordMetrics, null);
  assert.equal(vanilla.trend, null);

  assert.equal(Object.prototype.hasOwnProperty.call(oud, "score"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(oud, "recommendation"), false);
});

test("P5.5 link-gap rows are re-projected without changing classification or referring-domain identity", () => {
  const report = buildCompetitorVisibilityGapReport(fullInput());
  assert.deepEqual(
    report.linkGaps.map((row) => [row.referringDomain, row.classification]),
    [
      ["a-only.example", "single_competitor_gap"],
      ["b-only.example", "single_competitor_gap"],
      ["shared-source.example", "shared_coverage"],
    ],
  );
  const shared = report.linkGaps.find((row) => row.referringDomain === "shared-source.example")!;
  assert.equal(shared.ownedPresent, true);
  assert.equal(shared.authority, 70);
  assert.deepEqual(shared.competitorPresence, [
    { domain: "competitor-a.test", present: true },
    { domain: "competitor-b.test", present: true },
  ]);
});

test("missing supplied artifact families remain explicit diagnostics rather than invented zero evidence", () => {
  const report = buildCompetitorVisibilityGapReport({
    market,
    category,
    referenceTime,
    ownedDomain: "owned.test",
    ownedSignals: {},
    competitors: [{ domain: "competitor-a.test", manuallyReviewed: true }],
  });
  assert.deepEqual(report.diagnostics, [
    "backlink_context_unavailable",
    "competitor_page_evidence_unavailable",
    "keyword_metrics_unavailable",
    "owned_keyword_themes_unavailable",
    "serp_visibility_unavailable",
    "trend_context_unavailable",
  ]);
  assert.equal(report.competitorVisibility[0]!.observedSerpTopicCount, 0);
  assert.equal(report.competitorVisibility[0]!.observedTopicVisibilityRatio, 0);
  assert.equal(report.competitorVisibility[0]!.backlinkAuthority, null);
  assert.equal(report.topicGaps.length, 0);
});

test("manual review and competitor cohort boundaries fail closed", () => {
  const input = fullInput();
  (input.competitors[0] as { domain: string; manuallyReviewed: boolean }).manuallyReviewed = false;
  assert.throws(() => buildCompetitorVisibilityGapReport(input), /manual_review_required/);

  const unreviewed = fullInput();
  unreviewed.competitorPages = [
    competitorPage({
      domain: "competitor-c.test",
      url: "https://competitor-c.test/page/",
      pageType: "collection",
      keywordThemes: ["new topic"],
      taxonomyLabels: ["new"],
    }),
  ];
  assert.throws(
    () => buildCompetitorVisibilityGapReport(unreviewed),
    /unreviewed_competitor_page_evidence/,
  );
});

test("exact-keyword artifact joins fail closed on duplicate canonical topics or cross-frame trend duplicates", () => {
  const duplicateSerp = fullInput();
  duplicateSerp.serpRankings = [
    ...(duplicateSerp.serpRankings ?? []),
    serp("  OUD   PERFUME ", [{ rank: 6, domain: "competitor-b.test", url: "https://competitor-b.test/oud" }], "duplicate"),
  ];
  assert.throws(() => buildCompetitorVisibilityGapReport(duplicateSerp), /duplicate_serp_topic/);

  const duplicateTrend = fullInput();
  duplicateTrend.trends = [
    ...(duplicateTrend.trends ?? []),
    trendFrame(["oud perfume"], [[10], [20], [30], [40]], "duplicate-oud"),
  ];
  assert.throws(
    () => buildCompetitorVisibilityGapReport(duplicateTrend),
    /trend_topic_in_multiple_frames/,
  );
});

test("market/category/time lineage mismatches fail closed", () => {
  const wrongMarket = fullInput();
  const projection = structuredClone(wrongMarket.serpRankings![0]!);
  projection.marketFingerprint = fingerprint("wrong-market");
  wrongMarket.serpRankings = [projection];
  assert.throws(() => buildCompetitorVisibilityGapReport(wrongMarket), /serp_market_mismatch/);

  const future = fullInput();
  const futureProjection = structuredClone(future.serpRankings![0]!);
  futureProjection.observedAt = "2026-09-19T00:00:00.000Z";
  future.serpRankings = [futureProjection];
  assert.throws(
    () => buildCompetitorVisibilityGapReport(future),
    /artifact_observed_after_reference_time/,
  );

  const wrongCategory = fullInput();
  const metric = structuredClone(wrongCategory.keywordMetrics![0]!);
  metric.basis.categoryFingerprint = fingerprint("wrong-category");
  wrongCategory.keywordMetrics = [metric];
  assert.throws(() => buildCompetitorVisibilityGapReport(wrongCategory), /keyword_category_mismatch/);
});

test("P5.5 backlink cohort and reference frame must exactly match P5.6", () => {
  const wrongReference = fullInput();
  const bundle = structuredClone(wrongReference.backlinks!);
  bundle.referenceTime = "2026-09-18T11:00:00.000Z";
  wrongReference.backlinks = bundle;
  assert.throws(
    () => buildCompetitorVisibilityGapReport(wrongReference),
    /backlink_reference_time_mismatch/,
  );

  const wrongCohort = fullInput();
  const cohortBundle = structuredClone(wrongCohort.backlinks!);
  cohortBundle.competitors[1]!.targetDomain = "competitor-c.test";
  wrongCohort.backlinks = cohortBundle;
  assert.throws(
    () => buildCompetitorVisibilityGapReport(wrongCohort),
    /backlink_competitor_cohort_mismatch/,
  );
});

test("irrelevant supplied input ordering cannot change the operational report identity", () => {
  const a = fullInput();
  const b = fullInput();
  b.competitors.reverse();
  b.serpRankings!.reverse();
  b.keywordMetrics!.reverse();
  b.trends!.reverse();
  b.competitorPages!.reverse();
  b.ownedSignals.keywordThemes!.reverse();
  b.ownedSignals.taxonomyLabels!.reverse();

  const ra = buildCompetitorVisibilityGapReport(a);
  const rb = buildCompetitorVisibilityGapReport(b);
  assert.equal(ra.reportFingerprint, rb.reportFingerprint);
  assert.equal(ra.reportId, rb.reportId);
  assert.deepEqual(ra.competitorVisibility, rb.competitorVisibility);
  assert.deepEqual(ra.pageSemanticGaps, rb.pageSemanticGaps);
  assert.deepEqual(ra.topicGaps, rb.topicGaps);
  assert.deepEqual(ra.linkGaps, rb.linkGaps);
});

test("duplicate Task #58 evidence fingerprints collapse deterministically", () => {
  const input = fullInput();
  input.competitorPages = [
    input.competitorPages![0]!,
    structuredClone(input.competitorPages![0]!),
    input.competitorPages![1]!,
  ];
  const report = buildCompetitorVisibilityGapReport(input);
  assert.equal(report.coverage.competitorPageEvidenceCount, 2);
  assert.equal(report.lineage.competitorEvidenceFingerprints.length, 2);
});

test("P5.6 implementation contains no transport, secret, DB, execution, persistence, or scheduler path", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./competitor-visibility-gap-pipeline.ts", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /axios|undici|got\(/);
  assert.doesNotMatch(source, /process\.env|DATABASE_URL|postgres\s*(?:from|\()/);
  assert.doesNotMatch(source, /signal-collection-execution|competitor-pilot-execution/);
  assert.doesNotMatch(source, /executeAuthorizedSignalCollectionJob\s*\(/);
  assert.doesNotMatch(source, /setInterval|setTimeout|worker_threads|child_process/);
  assert.doesNotMatch(source, /normalizeSignalSourceDescriptor\s*\(/);
  assert.doesNotMatch(source, /INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM/i);
});
