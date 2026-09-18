import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { normalizeMarketProfile, normalizeCategoryContext } from "./market-category-intelligence.js";
import {
  buildSignalRefreshPlan,
  normalizeSignalSourceDescriptor,
} from "./signal-source-registry.js";
import {
  buildSourceAdapterRequest,
  normalizeAdapterResult,
} from "./signal-observation-normalization.js";
import { buildP5_1ProviderSelectionReview } from "./external-search-provider-selection.js";
import {
  buildKeywordMetricProjection,
  keywordMetricsCapability,
  scoreKeywordOpportunityCohort,
} from "./keyword-metrics-normalization.js";
import {
  buildDataForSeoKeywordRequestContract,
  dataForSeoKeywordAdapterCapability,
  normalizeSuppliedDataForSeoKeywordResult,
  P5_3_DATAFORSEO_KEYWORD_SOURCE_KEY,
} from "./dataforseo-keyword-adapter.js";

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
});

const KEYWORDS = [
  "amber perfume",
  "best perfume",
  "designer fragrance",
  "eau de parfum",
  "floral perfume",
  "luxury fragrance",
  "mens cologne",
  "niche perfume",
  "oud perfume",
  "womens perfume",
];

function source(overrides: Record<string, unknown> = {}) {
  return normalizeSignalSourceDescriptor({
    key: P5_3_DATAFORSEO_KEYWORD_SOURCE_KEY,
    name: "DataForSEO Google Keyword Overview",
    sourceClass: "external",
    signalTypes: ["keyword"],
    marketFingerprints: [market.fingerprint],
    categoryFingerprints: [category.fingerprint],
    trustClass: "reviewed_external",
    quality: 0.9,
    provenanceComplete: true,
    freshness: {
      freshForMinutes: 1440,
      staleAfterMinutes: 43200,
      criticalAfterMinutes: 86400,
      volatility: "medium",
    },
    collectionMode: "provider_api",
    manuallyReviewed: true,
    ...overrides,
  } as Parameters<typeof normalizeSignalSourceDescriptor>[0]);
}

function fixture() {
  const reviewedSource = source();
  const plan = buildSignalRefreshPlan({
    sources: [reviewedSource],
    need: {
      market,
      category,
      signalTypes: ["keyword"],
      now: "2026-09-18T12:00:00.000Z",
    },
    budget: {
      maxSources: 1,
      maxSignalTypesPerSource: 1,
      maxTotalRefreshItems: 1,
    },
  });
  const planItem = plan.selected[0]!;
  const request = buildSourceAdapterRequest({
    source: reviewedSource,
    planItem,
    market,
    category,
    planId: plan.planId,
    planFingerprint: plan.planFingerprint,
  });
  const review = buildP5_1ProviderSelectionReview();
  const contract = buildDataForSeoKeywordRequestContract({
    review,
    source: reviewedSource,
    request,
    market,
    category,
    keywords: [...KEYWORDS].reverse(),
    locationCode: 2840,
    languageCode: "EN",
    now: "2026-09-18T12:00:00.000Z",
  });
  return { reviewedSource, request, review, contract };
}

function providerItem(keyword: string, index: number) {
  return {
    se_type: "google",
    keyword,
    location_code: 2840,
    language_code: "en",
    search_partners: false,
    keyword_info: {
      se_type: "google",
      last_updated_time: "2026-09-01 00:00:00 +00:00",
      competition: Number((0.1 + index * 0.08).toFixed(2)),
      competition_level: index < 3 ? "LOW" : index < 7 ? "MEDIUM" : "HIGH",
      cpc: Number((0.5 + index * 0.4).toFixed(2)),
      search_volume: 100 + index * 100,
      low_top_of_page_bid: Number((0.2 + index * 0.1).toFixed(2)),
      high_top_of_page_bid: Number((1 + index * 0.5).toFixed(2)),
      monthly_searches: [
        { year: 2026, month: 7, search_volume: 90 + index * 100 },
        { year: 2026, month: 8, search_volume: 100 + index * 100 },
      ],
      raw_keyword_info_field: "discard me",
    },
    keyword_properties: {
      keyword_difficulty: 10 + index * 7,
      raw_property: "discard me",
    },
    serp_info: { raw: "discard me" },
    clickstream_keyword_info: { raw: "discard me" },
  };
}

function successfulProviderResult(keywords = KEYWORDS) {
  const items = keywords.map((keyword, index) => providerItem(keyword, index));
  return {
    version: "0.1.fake",
    status_code: 20000,
    status_message: "Ok.",
    tasks_count: 1,
    tasks_error: 0,
    raw_envelope: "discard me",
    tasks: [
      {
        id: "synthetic-task",
        status_code: 20000,
        status_message: "Ok.",
        result_count: 1,
        raw_task: "discard me",
        result: [
          {
            se_type: "google",
            location_code: 2840,
            language_code: "en",
            items_count: items.length,
            items,
            raw_result: "discard me",
          },
        ],
      },
    ],
  };
}

function neutralProjection(index: number, overrides: Record<string, unknown> = {}) {
  const keyword = `keyword ${String(index).padStart(2, "0")}`;
  return buildKeywordMetricProjection({
    keyword,
    observedAt: "2026-09-18T12:00:00.000Z",
    providerUpdatedAt: "2026-09-01T00:00:00.000Z",
    basis: {
      providerKey: "provider-a",
      providerMethod: "method-v1",
      sourceFingerprint: "a".repeat(64),
      marketFingerprint: "b".repeat(64),
      categoryFingerprint: "c".repeat(64),
      locationCode: 2840,
      languageCode: "en",
      searchNetwork: "google",
      variantScope: "unknown",
      cpcCurrency: "USD",
      cpcBasis: "provider_cpc",
    },
    avgMonthlySearchVolume: 100 * index,
    monthlySearches: [
      { year: 2026, month: 7, searches: 90 * index },
      { year: 2026, month: 8, searches: 100 * index },
    ],
    organicDifficultyScore: 10 * index,
    organicDifficultyMethod: "provider_top10",
    cpcAmount: index,
    paidCompetitionRatio: Number((index / 10).toFixed(2)),
    paidCompetitionIndex: index * 10,
    paidCompetitionLevel: index <= 3 ? "low" : index <= 7 ? "medium" : "high",
    paidCompetitionBasis: "paid_serp",
    bidLow: index / 2,
    bidHigh: index,
    ...(overrides as object),
  } as Parameters<typeof buildKeywordMetricProjection>[0]);
}

test("provider-neutral capability preserves semantic boundaries and all live gates closed", () => {
  const capability = keywordMetricsCapability();
  assert.equal(capability.providerNeutralSemantics, true);
  assert.equal(capability.nullDistinctFromZero, true);
  assert.equal(capability.paidCompetitionDistinctFromOrganicDifficulty, true);
  assert.equal(capability.crossProviderDifficultyComparable, false);
  assert.equal(capability.implicitCurrencyConversionAuthorized, false);
  assert.equal(capability.fabricatedCpcAuthorized, false);
  assert.equal(capability.opportunityCohortRelativeOnly, true);
  assert.equal(capability.confidenceFoldedIntoOpportunityScore, false);
  assert.equal(capability.liveCollectionAuthorized, false);
  assert.equal(capability.task70ExecutionAuthorized, false);
  assert.equal(capability.observationPersistenceAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("provider-neutral projection preserves zero distinctly from missing data", () => {
  const zero = buildKeywordMetricProjection({
    keyword: "zero keyword",
    observedAt: "2026-09-18T12:00:00.000Z",
    basis: {
      providerKey: "provider-a",
      providerMethod: "method-v1",
      sourceFingerprint: "a".repeat(64),
      marketFingerprint: "b".repeat(64),
      categoryFingerprint: "c".repeat(64),
      locationCode: 2840,
      languageCode: "en",
      searchNetwork: "google",
      variantScope: "unknown",
      cpcCurrency: "USD",
      cpcBasis: "provider_cpc",
    },
    avgMonthlySearchVolume: 0,
    monthlySearches: [{ year: 2026, month: 8, searches: 0 }],
    organicDifficultyScore: 0,
    organicDifficultyMethod: "provider_top10",
    cpcAmount: 0,
    paidCompetitionRatio: 0,
    paidCompetitionIndex: 0,
    paidCompetitionLevel: "low",
    paidCompetitionBasis: "paid_serp",
    bidLow: 0,
    bidHigh: 0,
  });
  const missing = buildKeywordMetricProjection({
    keyword: "missing keyword",
    observedAt: "2026-09-18T12:00:00.000Z",
    basis: zero.basis,
    avgMonthlySearchVolume: null,
    monthlySearches: null,
    organicDifficultyScore: null,
    organicDifficultyMethod: "provider_top10",
    cpcAmount: null,
    paidCompetitionRatio: null,
    paidCompetitionIndex: null,
    paidCompetitionLevel: null,
    paidCompetitionBasis: "paid_serp",
    bidLow: null,
    bidHigh: null,
  });
  assert.equal(zero.searchVolume.avgMonthly, 0);
  assert.equal(zero.organicDifficulty.score, 0);
  assert.equal(zero.paid.cpc.amount, 0);
  assert.equal(zero.paid.competition.ratio, 0);
  assert.equal(missing.searchVolume.avgMonthly, null);
  assert.equal(missing.organicDifficulty.score, null);
  assert.equal(missing.paid.cpc.amount, null);
  assert.equal(missing.paid.competition.ratio, null);
});

test("opportunity scoring uses homogeneous mid-rank percentiles and 45/35/20 weights", () => {
  const projections = Array.from({ length: 10 }, (_, index) => neutralProjection(index + 1));
  const cohort = scoreKeywordOpportunityCohort(projections);
  assert.equal(cohort.eligibleCount, 10);
  assert.equal(cohort.totalCount, 10);
  assert.equal(cohort.scores.every((value) => value.score != null), true);

  const low = cohort.scores.find((value) => value.keyword === "keyword 01")!;
  const high = cohort.scores.find((value) => value.keyword === "keyword 10")!;
  assert.deepEqual(low.components, { demand: 0, attainability: 100, commercial: 0 });
  assert.equal(low.score, 35);
  assert.deepEqual(high.components, { demand: 100, attainability: 0, commercial: 100 });
  assert.equal(high.score, 65);

  const tied = projections.map((projection, index) =>
    index < 2
      ? buildKeywordMetricProjection({
          keyword: projection.keyword,
          observedAt: projection.observedAt,
          providerUpdatedAt: projection.providerUpdatedAt,
          basis: projection.basis,
          avgMonthlySearchVolume: 500,
          monthlySearches: projection.searchVolume.monthly,
          organicDifficultyScore: projection.organicDifficulty.score,
          organicDifficultyMethod: projection.organicDifficulty.method,
          cpcAmount: projection.paid.cpc.amount,
          paidCompetitionRatio: projection.paid.competition.ratio,
          paidCompetitionIndex: projection.paid.competition.index,
          paidCompetitionLevel: projection.paid.competition.level,
          paidCompetitionBasis: projection.paid.competition.basis,
          bidLow: projection.paid.bidLow,
          bidHigh: projection.paid.bidHigh,
        })
      : projection,
  );
  const tiedScores = scoreKeywordOpportunityCohort(tied).scores;
  const one = tiedScores.find((value) => value.keyword === "keyword 01")!;
  const two = tiedScores.find((value) => value.keyword === "keyword 02")!;
  assert.equal(one.components!.demand, two.components!.demand);
});

test("opportunity scoring fails closed on heterogeneous basis and insufficient eligible cohort", () => {
  const nine = Array.from({ length: 9 }, (_, index) => neutralProjection(index + 1));
  const insufficient = scoreKeywordOpportunityCohort(nine);
  assert.equal(insufficient.scores.every((value) => value.score === null), true);
  assert.equal(
    insufficient.scores.every((value) => value.blockers.includes("insufficient_comparison_cohort")),
    true,
  );

  const mixed = Array.from({ length: 10 }, (_, index) => neutralProjection(index + 1));
  mixed[9] = buildKeywordMetricProjection({
    keyword: mixed[9]!.keyword,
    observedAt: mixed[9]!.observedAt,
    basis: { ...mixed[9]!.basis, providerMethod: "other-method" },
    avgMonthlySearchVolume: mixed[9]!.searchVolume.avgMonthly,
    monthlySearches: mixed[9]!.searchVolume.monthly,
    organicDifficultyScore: mixed[9]!.organicDifficulty.score,
    organicDifficultyMethod: mixed[9]!.organicDifficulty.method,
    cpcAmount: mixed[9]!.paid.cpc.amount,
    paidCompetitionRatio: mixed[9]!.paid.competition.ratio,
    paidCompetitionIndex: mixed[9]!.paid.competition.index,
    paidCompetitionLevel: mixed[9]!.paid.competition.level,
    paidCompetitionBasis: mixed[9]!.paid.competition.basis,
    bidLow: mixed[9]!.paid.bidLow,
    bidHigh: mixed[9]!.paid.bidHigh,
  });
  assert.throws(() => scoreKeywordOpportunityCohort(mixed), /heterogeneous_keyword_opportunity_cohort/);
});

test("missing metrics block only the affected keyword when at least ten others remain eligible", () => {
  const complete = Array.from({ length: 10 }, (_, index) => neutralProjection(index + 1));
  const incomplete = buildKeywordMetricProjection({
    keyword: "keyword 11",
    observedAt: "2026-09-18T12:00:00.000Z",
    basis: complete[0]!.basis,
    avgMonthlySearchVolume: 5000,
    monthlySearches: [],
    organicDifficultyScore: null,
    organicDifficultyMethod: "provider_top10",
    cpcAmount: 5,
    paidCompetitionRatio: 0.5,
    paidCompetitionIndex: 50,
    paidCompetitionLevel: "medium",
    paidCompetitionBasis: "paid_serp",
  });
  const cohort = scoreKeywordOpportunityCohort([...complete, incomplete]);
  assert.equal(cohort.eligibleCount, 10);
  assert.equal(cohort.scores.filter((value) => value.score != null).length, 10);
  const blocked = cohort.scores.find((value) => value.keyword === "keyword 11")!;
  assert.equal(blocked.score, null);
  assert.deepEqual(blocked.blockers, ["organic_difficulty_missing"]);
});

test("DataForSEO request contract is deterministic, sorted, bounded, and transport-disabled", () => {
  const a = fixture();
  const b = fixture();
  assert.equal(a.contract.adapterRequestFingerprint, b.contract.adapterRequestFingerprint);
  assert.deepEqual(a.contract.keywords, [...KEYWORDS].sort());
  assert.equal(a.contract.locationCode, 2840);
  assert.equal(a.contract.languageCode, "en");
  assert.equal(a.contract.providerEndpointReference, "/v3/dataforseo_labs/google/keyword_overview/live");
  assert.deepEqual(a.contract.payload, {
    keywords: [...KEYWORDS].sort(),
    location_code: 2840,
    language_code: "en",
    include_clickstream_data: false,
    include_serp_info: false,
  });
  const capability = dataForSeoKeywordAdapterCapability();
  assert.equal(capability.providerEndpointReferenceOnly, true);
  assert.equal(capability.suppliedResultNormalizationOnly, true);
  assert.equal(capability.liveEndpointExecutionAuthorized, false);
  assert.equal(capability.networkRequestAuthorized, false);
  assert.equal(capability.credentialUseAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.task70ExecutionAuthorized, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("DataForSEO request rejects stale review and non-all-device market", () => {
  const base = fixture();
  assert.throws(
    () =>
      buildDataForSeoKeywordRequestContract({
        review: base.review,
        source: base.reviewedSource,
        request: base.request,
        market,
        category,
        keywords: KEYWORDS,
        locationCode: 2840,
        languageCode: "en",
        now: "2027-01-01T00:00:00.000Z",
      }),
    /p5_1_review_stale/,
  );

  const desktopMarket = normalizeMarketProfile({
    countryCode: "US",
    language: "en-US",
    searchEngine: "google",
    currency: "USD",
    device: "desktop",
  });
  assert.throws(
    () =>
      buildDataForSeoKeywordRequestContract({
        review: base.review,
        source: base.reviewedSource,
        request: base.request,
        market: desktopMarket,
        category,
        keywords: KEYWORDS,
        locationCode: 2840,
        languageCode: "en",
        now: "2026-09-18T12:00:00.000Z",
      }),
    /market_fingerprint_mismatch|all_device_market_required/,
  );
});

test("successful supplied DataForSEO result normalizes rich keyword projections, opportunity and Task #68 summary", () => {
  const base = fixture();
  const normalized = normalizeSuppliedDataForSeoKeywordResult({
    contract: base.contract,
    request: base.request,
    provided: successfulProviderResult([...base.contract.keywords]),
    observedAt: "2026-09-18T12:05:00.000Z",
  });

  assert.equal(normalized.providerStatusCode, 20000);
  assert.equal(normalized.providerTaskStatusCode, 20000);
  assert.equal(normalized.projections.length, 10);
  assert.equal(normalized.opportunity!.eligibleCount, 10);
  assert.equal(normalized.opportunity!.scores.filter((value) => value.score != null).length, 10);
  assert.equal(normalized.adapterResult.status, "success");
  assert.equal(normalized.adapterResult.completeness, 1);

  const first = normalized.projections[0]!;
  assert.equal(first.basis.searchNetwork, "google");
  assert.equal(first.basis.variantScope, "unknown");
  assert.equal(first.paid.cpc.currency, "USD");
  assert.equal(first.paid.cpc.basis, "dataforseo_high_top_page_bid_derived");
  assert.equal(first.paid.competition.basis, "google_ads_paid_serp");
  assert.equal(first.organicDifficulty.crossProviderComparable, false);
  assert.equal(first.periodStart, "2026-07");
  assert.equal(first.periodEnd, "2026-08");

  const observation = normalizeAdapterResult({
    request: base.request,
    source: base.reviewedSource,
    result: normalized.adapterResult,
    normalizedAt: "2026-09-18T12:06:00.000Z",
  });
  assert.equal(observation.status, "success");
  assert.equal(observation.signalType, "keyword");
  assert.equal(observation.metrics.length, normalized.adapterResult.metrics.length);

  const serialized = JSON.stringify(normalized);
  assert.doesNotMatch(serialized, /discard me/);
  assert.doesNotMatch(serialized, /raw_keyword_info_field|raw_property|clickstream_keyword_info|serp_info/);
});

test("DataForSEO mapping preserves explicit zero values without converting them to missing", () => {
  const base = fixture();
  const provided = successfulProviderResult([...base.contract.keywords]);
  const first = (provided.tasks[0]!.result[0]!.items as Array<Record<string, unknown>>)[0]!;
  const info = first.keyword_info as Record<string, unknown>;
  const props = first.keyword_properties as Record<string, unknown>;
  info.search_volume = 0;
  info.cpc = 0;
  info.competition = 0;
  info.low_top_of_page_bid = 0;
  info.high_top_of_page_bid = 0;
  info.monthly_searches = [{ year: 2026, month: 8, search_volume: 0 }];
  props.keyword_difficulty = 0;

  const normalized = normalizeSuppliedDataForSeoKeywordResult({
    contract: base.contract,
    request: base.request,
    provided,
    observedAt: "2026-09-18T12:05:00.000Z",
  });
  const projection = normalized.projections.find((value) => value.keyword === first.keyword)!;
  assert.equal(projection.searchVolume.avgMonthly, 0);
  assert.equal(projection.organicDifficulty.score, 0);
  assert.equal(projection.paid.cpc.amount, 0);
  assert.equal(projection.paid.competition.ratio, 0);
  assert.equal(projection.paid.bidLow, 0);
  assert.equal(projection.paid.bidHigh, 0);
});

test("omitted provider keyword becomes explicit missing projection and partial Task #68 result", () => {
  const base = fixture();
  const returned = base.contract.keywords.slice(0, 9);
  const provided = successfulProviderResult(returned);
  const normalized = normalizeSuppliedDataForSeoKeywordResult({
    contract: base.contract,
    request: base.request,
    provided,
    observedAt: "2026-09-18T12:05:00.000Z",
  });
  assert.equal(normalized.projections.length, 10);
  const omittedKeyword = base.contract.keywords[9]!;
  const omitted = normalized.projections.find((value) => value.keyword === omittedKeyword)!;
  assert.equal(omitted.searchVolume.avgMonthly, null);
  assert.equal(omitted.organicDifficulty.score, null);
  assert.equal(omitted.paid.cpc.amount, null);
  assert.deepEqual(omitted.diagnostics, ["provider_keyword_omitted"]);
  assert.equal(normalized.adapterResult.status, "partial");
  assert.equal(normalized.adapterResult.completeness, 0.9);
  assert.deepEqual(normalized.adapterResult.diagnostics, ["provider_keywords_omitted"]);
  assert.equal(normalized.opportunity!.eligibleCount, 9);
  assert.equal(normalized.opportunity!.scores.every((value) => value.score === null), true);

  const observation = normalizeAdapterResult({
    request: base.request,
    source: base.reviewedSource,
    result: normalized.adapterResult,
    normalizedAt: "2026-09-18T12:06:00.000Z",
  });
  assert.equal(observation.status, "partial");
});

test("all provider keywords omitted maps to empty while retaining missing-data projections", () => {
  const base = fixture();
  const provided = successfulProviderResult([]);
  const normalized = normalizeSuppliedDataForSeoKeywordResult({
    contract: base.contract,
    request: base.request,
    provided,
    observedAt: "2026-09-18T12:05:00.000Z",
  });
  assert.equal(normalized.projections.length, 10);
  assert.equal(normalized.projections.every((value) => value.searchVolume.avgMonthly === null), true);
  assert.equal(normalized.adapterResult.status, "empty");
  assert.deepEqual(normalized.adapterResult.metrics, []);
  const observation = normalizeAdapterResult({
    request: base.request,
    source: base.reviewedSource,
    result: normalized.adapterResult,
    normalizedAt: "2026-09-18T12:06:00.000Z",
  });
  assert.equal(observation.status, "empty");
});

test("provider failures are bounded Task #68 errors", () => {
  const base = fixture();
  const normalized = normalizeSuppliedDataForSeoKeywordResult({
    contract: base.contract,
    request: base.request,
    provided: { status_code: 50000, tasks_error: 1, tasks: [] },
    observedAt: "2026-09-18T12:05:00.000Z",
  });
  assert.equal(normalized.adapterResult.status, "error");
  assert.equal(normalized.adapterResult.errorCode, "dataforseo_status_50000");
  const observation = normalizeAdapterResult({
    request: base.request,
    source: base.reviewedSource,
    result: normalized.adapterResult,
    normalizedAt: "2026-09-18T12:06:00.000Z",
  });
  assert.equal(observation.status, "error");
  assert.equal(observation.confidence, 0);
});

test("malformed provider scope and inconsistent paid competition fail closed", () => {
  const base = fixture();

  const mixedNetwork = successfulProviderResult([...base.contract.keywords]);
  const mixedItems = mixedNetwork.tasks[0]!.result[0]!.items as Array<Record<string, unknown>>;
  mixedItems[0]!.search_partners = true;
  assert.throws(
    () =>
      normalizeSuppliedDataForSeoKeywordResult({
        contract: base.contract,
        request: base.request,
        provided: mixedNetwork,
        observedAt: "2026-09-18T12:05:00.000Z",
      }),
    /mixed_search_network_scope/,
  );

  const inconsistent = successfulProviderResult([...base.contract.keywords]);
  const first = (inconsistent.tasks[0]!.result[0]!.items as Array<Record<string, unknown>>)[0]!;
  (first.keyword_info as Record<string, unknown>).competition_index = 99;
  assert.throws(
    () =>
      normalizeSuppliedDataForSeoKeywordResult({
        contract: base.contract,
        request: base.request,
        provided: inconsistent,
        observedAt: "2026-09-18T12:05:00.000Z",
      }),
    /paid_competition_ratio_index_mismatch/,
  );
});

test("P5.3 source contains no transport, credentials, DB, scheduler, source admission, or Task #70 execution", () => {
  const files = [
    "./keyword-metrics-normalization.ts",
    "./dataforseo-keyword-adapter.ts",
  ];
  for (const file of files) {
    const sourceText = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
    assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
    assert.doesNotMatch(sourceText, /axios|undici|got\(/);
    assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres\(|drizzle/);
    assert.doesNotMatch(sourceText, /setInterval|setTimeout|worker_threads|child_process/);
    assert.doesNotMatch(sourceText, /Authorization\s*:|Basic\s+[A-Za-z0-9+/=]+/);
    assert.doesNotMatch(sourceText, /normalizeSignalSourceDescriptor\s*\(/);
    assert.doesNotMatch(sourceText, /executeAuthorizedSignalCollectionJob\s*\(/);
  }
});
