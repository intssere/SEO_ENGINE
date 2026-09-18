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
import {
  buildTrendProjection,
  trendMetricsCapability,
  P5_4_TREND_SCALE,
} from "./trend-metrics-normalization.js";
import {
  buildDataForSeoGoogleTrendsRequestContract,
  dataForSeoGoogleTrendsAdapterCapability,
  normalizeSuppliedDataForSeoGoogleTrendsResult,
  P5_4_DATAFORSEO_TRENDS_SOURCE_KEY,
} from "./dataforseo-google-trends-adapter.js";

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

const KEYWORDS = ["luxury fragrance", "niche perfume", "oud perfume"];

function source(overrides: Record<string, unknown> = {}) {
  return normalizeSignalSourceDescriptor({
    key: P5_4_DATAFORSEO_TRENDS_SOURCE_KEY,
    name: "DataForSEO Google Trends Explore",
    sourceClass: "external",
    signalTypes: ["trend"],
    marketFingerprints: [market.fingerprint],
    categoryFingerprints: [category.fingerprint],
    trustClass: "reviewed_external",
    quality: 0.88,
    provenanceComplete: true,
    freshness: {
      freshForMinutes: 1440,
      staleAfterMinutes: 10080,
      criticalAfterMinutes: 43200,
      volatility: "high",
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
      signalTypes: ["trend"],
      now: "2026-09-18T12:00:00.000Z",
    },
    budget: {
      maxSources: 1,
      maxSignalTypesPerSource: 1,
      maxTotalRefreshItems: 1,
    },
  });
  const request = buildSourceAdapterRequest({
    source: reviewedSource,
    planItem: plan.selected[0]!,
    market,
    category,
    planId: plan.planId,
    planFingerprint: plan.planFingerprint,
  });
  const contract = buildDataForSeoGoogleTrendsRequestContract({
    source: reviewedSource,
    request,
    market,
    category,
    keywords: [...KEYWORDS].reverse(),
    locationCode: 2840,
    languageCode: "EN",
    dateFrom: "2026-01-01",
    dateTo: "2026-06-30",
    now: "2026-09-18T12:00:00.000Z",
  });
  return { reviewedSource, request, contract };
}

const MONTHS = [
  ["2026-01-01", "2026-01-31"],
  ["2026-02-01", "2026-02-28"],
  ["2026-03-01", "2026-03-31"],
  ["2026-04-01", "2026-04-30"],
  ["2026-05-01", "2026-05-31"],
  ["2026-06-01", "2026-06-30"],
] as const;

function graphPoints() {
  const values = [
    [20, 80, 0],
    [30, 70, 50],
    [40, 60, 100],
    [50, 50, 50],
    [60, 40, 50],
    [70, 30, 50],
  ];
  return MONTHS.map(([dateFrom, dateTo], index) => ({
    date_from: dateFrom,
    date_to: dateTo,
    timestamp: Math.floor(Date.parse(`${dateFrom}T00:00:00Z`) / 1000),
    missing_data: false,
    values: values[index],
    raw_point_field: "discard me",
  }));
}

function successfulProviderResult() {
  return {
    version: "0.1.fake",
    status_code: 20000,
    status_message: "Ok.",
    tasks_count: 1,
    tasks_error: 0,
    raw_envelope: "discard me",
    tasks: [
      {
        id: "synthetic-task-id",
        status_code: 20000,
        status_message: "Ok.",
        result_count: 1,
        raw_task: "discard me",
        result: [
          {
            keywords: [...KEYWORDS].sort(),
            location_code: 2840,
            language_code: "en",
            check_url: "https://trends.google.com/example",
            datetime: "2026-07-01 00:00:00 +00:00",
            items_count: 1,
            raw_result: "discard me",
            items: [
              {
                position: 1,
                type: "google_trends_graph",
                title: "Interest over time",
                keywords: [...KEYWORDS].sort(),
                data: graphPoints(),
                averages: [45, 55, 42],
                raw_graph: "discard me",
              },
            ],
          },
        ],
      },
    ],
  };
}

test("provider-neutral trend capability encodes request-frame semantics and keeps live gates closed", () => {
  const capability = trendMetricsCapability();
  assert.equal(capability.providerNeutralSemantics, true);
  assert.equal(capability.requestFrameBound, true);
  assert.equal(capability.crossFrameComparable, false);
  assert.equal(capability.absoluteSearchVolume, false);
  assert.equal(capability.zeroMeansInsufficientData, true);
  assert.equal(capability.descriptiveOnly, true);
  assert.equal(capability.liveCollectionAuthorized, false);
  assert.equal(capability.providerEnrollmentAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.task70ExecutionAuthorized, false);
  assert.equal(capability.observationPersistenceAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("trend projection computes frame-relative rising/falling/flat velocity and volatility", () => {
  const projection = buildTrendProjection({
    basis: {
      providerKey: "dataforseo",
      providerMethod: "google_trends_explore_standard",
      sourceFingerprint: "a".repeat(64),
      marketFingerprint: "b".repeat(64),
      categoryFingerprint: "c".repeat(64),
      keywords: [...KEYWORDS].sort(),
      locationCode: 2840,
      languageCode: "en",
      property: "web",
      providerCategoryCode: 0,
      dateFrom: "2026-01-01",
      dateTo: "2026-06-30",
      scale: P5_4_TREND_SCALE,
    },
    observedAt: "2026-07-01T00:00:00.000Z",
    points: graphPoints().map((point) => ({
      dateFrom: point.date_from,
      dateTo: point.date_to,
      timestamp: point.timestamp,
      missingData: point.missing_data,
      values: point.values,
    })),
  });

  assert.equal(projection.semantics.crossFrameComparable, false);
  assert.equal(projection.semantics.absoluteSearchVolume, false);
  assert.equal(projection.semantics.zeroMeansInsufficientData, true);

  const luxury = projection.keywordSummaries.find((value) => value.keyword === "luxury fragrance")!;
  const niche = projection.keywordSummaries.find((value) => value.keyword === "niche perfume")!;
  const oud = projection.keywordSummaries.find((value) => value.keyword === "oud perfume")!;

  assert.equal(luxury.earlyWindowMean, 30);
  assert.equal(luxury.recentWindowMean, 60);
  assert.equal(luxury.signedVelocity, 0.3);
  assert.equal(luxury.positiveMomentum, 0.3);
  assert.equal(luxury.direction, "rising");
  assert.equal(niche.signedVelocity, -0.3);
  assert.equal(niche.positiveMomentum, 0);
  assert.equal(niche.direction, "falling");
  assert.equal(oud.direction, "flat");
  assert.equal(oud.zeroInsufficientDataPointCount, 1);
  assert.equal(oud.coverageRatio, 1);
  assert.equal(luxury.volatility, 0.1);
});

test("trend frames are not silently comparable across changed dates or terms", () => {
  const common = {
    providerKey: "dataforseo",
    providerMethod: "google_trends_explore_standard",
    sourceFingerprint: "a".repeat(64),
    marketFingerprint: "b".repeat(64),
    categoryFingerprint: "c".repeat(64),
    locationCode: 2840,
    languageCode: "en",
    property: "web" as const,
    providerCategoryCode: 0 as const,
    scale: P5_4_TREND_SCALE,
  };
  const one = buildTrendProjection({
    basis: {
      ...common,
      keywords: [...KEYWORDS].sort(),
      dateFrom: "2026-01-01",
      dateTo: "2026-06-30",
    },
    observedAt: "2026-07-01T00:00:00.000Z",
    points: graphPoints().map((point) => ({
      dateFrom: point.date_from,
      dateTo: point.date_to,
      timestamp: point.timestamp,
      missingData: point.missing_data,
      values: point.values,
    })),
  });
  const two = buildTrendProjection({
    basis: {
      ...common,
      keywords: ["luxury fragrance"],
      dateFrom: "2026-01-01",
      dateTo: "2026-06-30",
    },
    observedAt: "2026-07-01T00:00:00.000Z",
    points: graphPoints().map((point) => ({
      dateFrom: point.date_from,
      dateTo: point.date_to,
      timestamp: point.timestamp,
      missingData: point.missing_data,
      values: [point.values[0]!],
    })),
  });
  assert.notEqual(one.frameFingerprint, two.frameFingerprint);
  assert.equal(one.semantics.crossFrameComparable, false);
  assert.equal(two.semantics.crossFrameComparable, false);
});

test("missing graph points require null values and are excluded from summaries", () => {
  const points = graphPoints().map((point) => ({
    dateFrom: point.date_from,
    dateTo: point.date_to,
    timestamp: point.timestamp,
    missingData: point.missing_data,
    values: point.values as Array<number | null>,
  }));
  points[2] = { ...points[2]!, missingData: true, values: [null, null, null] };
  const projection = buildTrendProjection({
    basis: {
      providerKey: "dataforseo",
      providerMethod: "google_trends_explore_standard",
      sourceFingerprint: "a".repeat(64),
      marketFingerprint: "b".repeat(64),
      categoryFingerprint: "c".repeat(64),
      keywords: [...KEYWORDS].sort(),
      locationCode: 2840,
      languageCode: "en",
      property: "web",
      providerCategoryCode: 0,
      dateFrom: "2026-01-01",
      dateTo: "2026-06-30",
      scale: P5_4_TREND_SCALE,
    },
    observedAt: "2026-07-01T00:00:00.000Z",
    points,
  });
  assert.equal(projection.keywordSummaries[0]!.usablePointCount, 5);
  assert.equal(projection.keywordSummaries[0]!.missingPointCount, 1);
  assert.equal(projection.keywordSummaries[0]!.coverageRatio, 0.833333);

  const malformed = [...points];
  malformed[2] = { ...malformed[2]!, missingData: true, values: [1, null, null] };
  assert.throws(
    () =>
      buildTrendProjection({
        basis: projection.basis,
        observedAt: "2026-07-01T00:00:00.000Z",
        points: malformed,
      }),
    /missing_point_requires_null_values/,
  );
});

test("DataForSEO Standard request contract is deterministic, bounded and callback-free", () => {
  const a = fixture();
  const b = fixture();
  assert.equal(a.contract.adapterRequestFingerprint, b.contract.adapterRequestFingerprint);
  assert.deepEqual(a.contract.keywords, [...KEYWORDS].sort());
  assert.equal(a.contract.frameDays, 181);
  assert.equal(a.contract.taskPostPath, "/v3/keywords_data/google_trends/explore/task_post");
  assert.equal(
    a.contract.taskGetPathTemplate,
    "/v3/keywords_data/google_trends/explore/task_get/{task_id}",
  );
  assert.deepEqual(a.contract.payload, {
    keywords: [...KEYWORDS].sort(),
    location_code: 2840,
    language_code: "en",
    type: "web",
    category_code: 0,
    date_from: "2026-01-01",
    date_to: "2026-06-30",
    item_types: ["google_trends_graph"],
    tag: `seo-p54-${a.contract.adapterRequestFingerprint.slice(0, 32)}`,
  });
  assert.equal("postback_url" in a.contract.payload, false);
  assert.equal("pingback_url" in a.contract.payload, false);
});

test("request contract rejects unsupported scope and unsafe date windows", () => {
  const base = fixture();
  assert.throws(
    () =>
      buildDataForSeoGoogleTrendsRequestContract({
        source: base.reviewedSource,
        request: base.request,
        market,
        category,
        keywords: KEYWORDS,
        locationCode: 2840,
        languageCode: "en",
        dateFrom: "2026-06-01",
        dateTo: "2026-06-15",
        now: "2026-09-18T12:00:00.000Z",
      }),
    /trend_frame_days_out_of_bounds/,
  );
  assert.throws(
    () =>
      buildDataForSeoGoogleTrendsRequestContract({
        source: base.reviewedSource,
        request: base.request,
        market,
        category,
        keywords: KEYWORDS,
        locationCode: 2840,
        languageCode: "fr",
        dateFrom: "2026-01-01",
        dateTo: "2026-06-30",
        now: "2026-09-18T12:00:00.000Z",
      }),
    /language_code_market_mismatch/,
  );
  assert.throws(
    () =>
      buildDataForSeoGoogleTrendsRequestContract({
        source: base.reviewedSource,
        request: base.request,
        market,
        category,
        keywords: KEYWORDS,
        locationCode: 2840,
        languageCode: "en",
        dateFrom: "2026-01-01",
        dateTo: "2026-12-31",
        now: "2026-09-18T12:00:00.000Z",
      }),
    /trend_frame_ends_in_future/,
  );
});

test("successful supplied Google Trends result yields rich projection and Task #68 trend observation", () => {
  const base = fixture();
  const normalized = normalizeSuppliedDataForSeoGoogleTrendsResult({
    contract: base.contract,
    request: base.request,
    provided: successfulProviderResult(),
    observedAt: "2026-07-01T00:00:00.000Z",
  });

  assert.equal(normalized.providerStatusCode, 20000);
  assert.equal(normalized.providerTaskStatusCode, 20000);
  assert.ok(normalized.projection);
  assert.equal(normalized.projection!.points.length, 6);
  assert.equal(normalized.projection!.keywordSummaries.length, 3);
  assert.equal(normalized.adapterResult.status, "success");
  assert.equal(normalized.adapterResult.completeness, 1);

  const metrics = new Map(normalized.adapterResult.metrics.map((value) => [value.key, value.value]));
  assert.equal(metrics.get("trend.requested_keyword_count"), 3);
  assert.equal(metrics.get("trend.graph_point_count"), 6);
  assert.equal(metrics.get("trend.rising_keyword_count"), 1);
  assert.equal(metrics.get("trend.falling_keyword_count"), 1);
  assert.equal(metrics.get("trend.flat_keyword_count"), 1);
  assert.equal(metrics.get("trend.avg_coverage_ratio"), 1);
  assert.equal(metrics.get("trend.avg_positive_momentum"), 0.1);

  const observation = normalizeAdapterResult({
    request: base.request,
    source: base.reviewedSource,
    result: normalized.adapterResult,
    normalizedAt: "2026-07-01T00:01:00.000Z",
  });
  assert.equal(observation.status, "success");
  assert.equal(observation.signalType, "trend");
  assert.equal(observation.metrics.length, normalized.adapterResult.metrics.length);

  const serialized = JSON.stringify(normalized);
  assert.doesNotMatch(serialized, /discard me|check_url|Interest over time|averages/);
});

test("missing supplied graph point yields partial Task #68 observation with exact coverage", () => {
  const base = fixture();
  const provided = successfulProviderResult();
  const graph = provided.tasks[0]!.result[0]!.items[0]!;
  const graphData = graph.data as Array<Record<string, unknown>>;
  graphData[2] = {
    ...graphData[2],
    missing_data: true,
    values: [null, null, null],
  };
  const normalized = normalizeSuppliedDataForSeoGoogleTrendsResult({
    contract: base.contract,
    request: base.request,
    provided,
    observedAt: "2026-07-01T00:00:00.000Z",
  });
  assert.equal(normalized.adapterResult.status, "partial");
  assert.equal(normalized.adapterResult.completeness, 0.833333);
  assert.ok(normalized.adapterResult.diagnostics.includes("missing_trend_points"));

  const observation = normalizeAdapterResult({
    request: base.request,
    source: base.reviewedSource,
    result: normalized.adapterResult,
    normalizedAt: "2026-07-01T00:01:00.000Z",
  });
  assert.equal(observation.status, "partial");
  assert.equal(observation.completeness, 0.833333);
});

test("zero trend index remains explicit insufficient-data evidence rather than null/missing", () => {
  const base = fixture();
  const normalized = normalizeSuppliedDataForSeoGoogleTrendsResult({
    contract: base.contract,
    request: base.request,
    provided: successfulProviderResult(),
    observedAt: "2026-07-01T00:00:00.000Z",
  });
  const oud = normalized.projection!.keywordSummaries.find((value) => value.keyword === "oud perfume")!;
  assert.equal(oud.zeroInsufficientDataPointCount, 1);
  assert.equal(oud.usablePointCount, 6);
  assert.equal(oud.missingPointCount, 0);
  assert.ok(normalized.adapterResult.diagnostics.includes("zero_index_means_insufficient_data"));
});

test("provider failure and not-ready statuses become bounded Task #68 errors", () => {
  const base = fixture();
  const providerFailure = normalizeSuppliedDataForSeoGoogleTrendsResult({
    contract: base.contract,
    request: base.request,
    provided: { status_code: 50000, tasks_error: 1, tasks: [] },
    observedAt: "2026-07-01T00:00:00.000Z",
  });
  assert.equal(providerFailure.adapterResult.status, "error");
  assert.equal(providerFailure.adapterResult.errorCode, "dataforseo_status_50000");

  const notReady = successfulProviderResult();
  notReady.tasks[0]!.status_code = 20100;
  notReady.tasks[0]!.result = [];
  const pending = normalizeSuppliedDataForSeoGoogleTrendsResult({
    contract: base.contract,
    request: base.request,
    provided: notReady,
    observedAt: "2026-07-01T00:00:00.000Z",
  });
  assert.equal(pending.adapterResult.status, "error");
  assert.equal(pending.adapterResult.errorCode, "dataforseo_task_not_ready");

  const observation = normalizeAdapterResult({
    request: base.request,
    source: base.reviewedSource,
    result: pending.adapterResult,
    normalizedAt: "2026-07-01T00:01:00.000Z",
  });
  assert.equal(observation.status, "error");
  assert.equal(observation.confidence, 0);
});

test("malformed provider graph cardinality and unexpected item types fail closed", () => {
  const base = fixture();
  const wrongCardinality = successfulProviderResult();
  wrongCardinality.tasks[0]!.result[0]!.items[0]!.data[0]!.values = [20, 80];
  assert.throws(
    () =>
      normalizeSuppliedDataForSeoGoogleTrendsResult({
        contract: base.contract,
        request: base.request,
        provided: wrongCardinality,
        observedAt: "2026-07-01T00:00:00.000Z",
      }),
    /trend_value_cardinality_mismatch/,
  );

  const wrongType = successfulProviderResult();
  wrongType.tasks[0]!.result[0]!.items[0]!.type = "google_trends_map";
  assert.throws(
    () =>
      normalizeSuppliedDataForSeoGoogleTrendsResult({
        contract: base.contract,
        request: base.request,
        provided: wrongType,
        observedAt: "2026-07-01T00:00:00.000Z",
      }),
    /google_trends_graph_required/,
  );
});

test("P5.4 source contains no transport, credentials, DB, scheduler, callbacks, source admission, or Task #70 execution", () => {
  const files = [
    "./trend-metrics-normalization.ts",
    "./dataforseo-google-trends-adapter.ts",
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
    assert.doesNotMatch(sourceText, /postback_url|pingback_url/);
  }
  const capability = dataForSeoGoogleTrendsAdapterCapability();
  assert.equal(capability.standardTaskContractOnly, true);
  assert.equal(capability.liveEndpointAuthorized, false);
  assert.equal(capability.networkRequestAuthorized, false);
  assert.equal(capability.officialGoogleTrendsAlphaEnrollmentAuthorized, false);
  assert.equal(capability.callbackAuthorized, false);
  assert.equal(capability.pingbackAuthorized, false);
  assert.equal(capability.postbackAuthorized, false);
  assert.equal(capability.pollingAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.task70ExecutionAuthorized, false);
  assert.equal(capability.publicationAuthorized, false);
});
