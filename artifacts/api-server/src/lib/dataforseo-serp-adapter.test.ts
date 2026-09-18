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
  buildDataForSeoSerpRequestContract,
  dataForSeoSerpAdapterCapability,
  normalizeSuppliedDataForSeoSerpResult,
  P5_2_DATAFORSEO_SERP_SOURCE_KEY,
} from "./dataforseo-serp-adapter.js";

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

function source(overrides: Record<string, unknown> = {}) {
  return normalizeSignalSourceDescriptor({
    key: P5_2_DATAFORSEO_SERP_SOURCE_KEY,
    name: "DataForSEO Google Organic SERP",
    sourceClass: "external",
    signalTypes: ["serp"],
    marketFingerprints: [market.fingerprint],
    categoryFingerprints: [category.fingerprint],
    trustClass: "reviewed_external",
    quality: 0.9,
    provenanceComplete: true,
    freshness: {
      freshForMinutes: 60,
      staleAfterMinutes: 180,
      criticalAfterMinutes: 720,
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
      signalTypes: ["serp"],
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
  const contract = buildDataForSeoSerpRequestContract({
    review,
    source: reviewedSource,
    request,
    market,
    category,
    query: {
      keyword: " luxury fragrance ",
      locationCode: 2840,
      languageCode: "EN",
      device: "desktop",
      depth: 20,
      trackedDomain: "www.diamondshelf.us",
    },
    now: "2026-09-18T12:00:00.000Z",
  });
  return { reviewedSource, plan, request, review, contract };
}

function successfulProviderResult() {
  return {
    version: "0.1.fake",
    status_code: 20000,
    status_message: "Ok.",
    tasks_count: 1,
    tasks_error: 0,
    raw_unretained_envelope_field: "discard me",
    tasks: [
      {
        id: "synthetic-task-id",
        status_code: 20000,
        status_message: "Ok.",
        result_count: 1,
        raw_unretained_task_field: "discard me",
        result: [
          {
            keyword: "luxury fragrance",
            location_code: 2840,
            language_code: "en",
            device: "desktop",
            se_results_count: 987654,
            items_count: 4,
            raw_unretained_result_field: "discard me",
            items: [
              {
                type: "paid",
                rank_group: 1,
                rank_absolute: 1,
                page: 1,
                domain: "ads.example",
                url: "https://ads.example/",
              },
              {
                type: "organic",
                rank_group: 1,
                rank_absolute: 3,
                page: 1,
                domain: "diamondshelf.us",
                url: "https://diamondshelf.us/collections/fragrance#tracking",
                title: "discarded title",
                description: "discarded description",
                xpath: "discarded xpath",
              },
              {
                type: "organic",
                rank_group: 2,
                rank_absolute: 5,
                page: 1,
                domain: "shop.diamondshelf.us",
                url: "https://shop.diamondshelf.us/fragrance",
                title: "discarded title two",
              },
              {
                type: "organic",
                rank_group: 3,
                rank_absolute: 7,
                page: 1,
                domain: "competitor.example",
                url: "https://competitor.example/fragrance",
              },
            ],
          },
        ],
      },
    ],
  };
}

test("P5.2 capability keeps all live/provider/runtime boundaries closed", () => {
  const capability = dataForSeoSerpAdapterCapability();
  assert.equal(capability.requestContractOnly, true);
  assert.equal(capability.suppliedResultNormalizationOnly, true);
  assert.equal(capability.providerEnrollmentAuthorized, false);
  assert.equal(capability.providerPurchaseAuthorized, false);
  assert.equal(capability.credentialCreationAuthorized, false);
  assert.equal(capability.credentialUseAuthorized, false);
  assert.equal(capability.liveTransportConfigured, false);
  assert.equal(capability.networkRequestAuthorized, false);
  assert.equal(capability.liveEndpointAuthorized, false);
  assert.equal(capability.highPriorityAuthorized, false);
  assert.equal(capability.callbackAuthorized, false);
  assert.equal(capability.pingbackAuthorized, false);
  assert.equal(capability.postbackAuthorized, false);
  assert.equal(capability.pollingAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.task69LiveAuthorizationAuthorized, false);
  assert.equal(capability.task70ExecutionAuthorized, false);
  assert.equal(capability.observationPersistenceAuthorized, false);
  assert.equal(capability.evidencePersistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.schemaMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.batchEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.publicationAuthorized, false);
  assert.equal(capability.automaticTransition, false);
});

test("request contract is deterministic, bounded, normal-priority and lineage-bound", () => {
  const a = fixture();
  const b = fixture();
  assert.equal(a.contract.adapterRequestFingerprint, b.contract.adapterRequestFingerprint);
  assert.equal(a.contract.adapterRequestId, b.contract.adapterRequestId);
  assert.equal(a.contract.providerKey, "dataforseo");
  assert.equal(a.contract.submitEndpointPath, "/v3/serp/google/organic/task_post");
  assert.equal(
    a.contract.advancedResultEndpointPathTemplate,
    "/v3/serp/google/organic/task_get/advanced/{task_id}",
  );
  assert.equal(a.contract.keyword, "luxury fragrance");
  assert.equal(a.contract.languageCode, "en");
  assert.equal(a.contract.trackedDomain, "diamondshelf.us");
  assert.equal(a.contract.depth, 20);
  assert.equal(a.contract.billedPageUnitsUpperBound, 2);
  assert.deepEqual(a.contract.payload, {
    keyword: "luxury fragrance",
    location_code: 2840,
    language_code: "en",
    device: "desktop",
    depth: 20,
    priority: 1,
    tag: `seo-p52-${a.contract.adapterRequestFingerprint.slice(0, 32)}`,
  });
});

test("request contract rejects stale P5.1 review", () => {
  const base = fixture();
  assert.throws(
    () =>
      buildDataForSeoSerpRequestContract({
        review: base.review,
        source: base.reviewedSource,
        request: base.request,
        market,
        category,
        query: {
          keyword: "luxury fragrance",
          locationCode: 2840,
          languageCode: "en",
          device: "desktop",
          depth: 20,
          trackedDomain: "diamondshelf.us",
        },
        now: "2027-01-01T00:00:00.000Z",
      }),
    /p5_1_review_stale/,
  );
});

test("request contract rejects wrong source key, signal, market language/device, and unsafe depth", () => {
  const base = fixture();
  const wrongKey = source({ key: "other-source" });
  const wrongPlan = buildSignalRefreshPlan({
    sources: [wrongKey],
    need: { market, category, signalTypes: ["serp"], now: "2026-09-18T12:00:00.000Z" },
    budget: { maxSources: 1, maxSignalTypesPerSource: 1, maxTotalRefreshItems: 1 },
  });
  const wrongRequest = buildSourceAdapterRequest({
    source: wrongKey,
    planItem: wrongPlan.selected[0]!,
    market,
    category,
    planId: wrongPlan.planId,
    planFingerprint: wrongPlan.planFingerprint,
  });
  assert.throws(
    () =>
      buildDataForSeoSerpRequestContract({
        review: base.review,
        source: wrongKey,
        request: wrongRequest,
        market,
        category,
        query: {
          keyword: "luxury fragrance",
          locationCode: 2840,
          languageCode: "en",
          device: "desktop",
          depth: 20,
          trackedDomain: "diamondshelf.us",
        },
        now: "2026-09-18T12:00:00.000Z",
      }),
    /dataforseo_serp_source_key_required/,
  );

  assert.throws(
    () =>
      buildDataForSeoSerpRequestContract({
        review: base.review,
        source: base.reviewedSource,
        request: base.request,
        market,
        category,
        query: {
          keyword: "luxury fragrance",
          locationCode: 2840,
          languageCode: "fr",
          device: "desktop",
          depth: 20,
          trackedDomain: "diamondshelf.us",
        },
        now: "2026-09-18T12:00:00.000Z",
      }),
    /language_code_market_mismatch/,
  );

  assert.throws(
    () =>
      buildDataForSeoSerpRequestContract({
        review: base.review,
        source: base.reviewedSource,
        request: base.request,
        market,
        category,
        query: {
          keyword: "luxury fragrance",
          locationCode: 2840,
          languageCode: "en",
          device: "desktop",
          depth: 25,
          trackedDomain: "diamondshelf.us",
        },
        now: "2026-09-18T12:00:00.000Z",
      }),
    /depth_must_use_ten_result_increments/,
  );

  const mobileMarket = normalizeMarketProfile({
    countryCode: "US",
    language: "en-US",
    searchEngine: "google",
    currency: "USD",
    device: "mobile",
  });
  assert.throws(
    () =>
      buildDataForSeoSerpRequestContract({
        review: base.review,
        source: base.reviewedSource,
        request: base.request,
        market: mobileMarket,
        category,
        query: {
          keyword: "luxury fragrance",
          locationCode: 2840,
          languageCode: "en",
          device: "desktop",
          depth: 20,
          trackedDomain: "diamondshelf.us",
        },
        now: "2026-09-18T12:00:00.000Z",
      }),
    /market_fingerprint_mismatch|device_market_mismatch/,
  );
});

test("successful supplied provider result yields bounded ranking projection and Task #68-compatible observation", () => {
  const base = fixture();
  const normalized = normalizeSuppliedDataForSeoSerpResult({
    contract: base.contract,
    request: base.request,
    provided: successfulProviderResult(),
    observedAt: "2026-09-18T12:05:00.000Z",
  });

  assert.equal(normalized.providerStatusCode, 20000);
  assert.equal(normalized.providerTaskStatusCode, 20000);
  assert.ok(normalized.ranking);
  assert.equal(normalized.ranking!.organicItems.length, 3);
  assert.equal(normalized.ranking!.trackedMatches.length, 2);
  assert.equal(normalized.ranking!.trackedMatches[0]!.rankAbsolute, 3);
  assert.equal(normalized.ranking!.trackedMatches[1]!.rankAbsolute, 5);
  assert.equal(normalized.ranking!.organicItems[0]!.url, "https://diamondshelf.us/collections/fragrance");
  assert.equal(normalized.adapterResult.status, "success");
  assert.deepEqual(normalized.adapterResult.diagnostics, []);

  const metrics = new Map(normalized.adapterResult.metrics.map((value) => [value.key, value.value]));
  assert.equal(metrics.get("ranking.found"), 1);
  assert.equal(metrics.get("ranking.best_absolute_rank"), 3);
  assert.equal(metrics.get("ranking.best_group_rank"), 1);
  assert.equal(metrics.get("ranking.best_page"), 1);
  assert.equal(metrics.get("ranking.matched_organic_count"), 2);
  assert.equal(metrics.get("ranking.top10_matches"), 2);
  assert.equal(metrics.get("ranking.top20_matches"), 2);

  const task68Observation = normalizeAdapterResult({
    request: base.request,
    source: base.reviewedSource,
    result: normalized.adapterResult,
    normalizedAt: "2026-09-18T12:06:00.000Z",
  });
  assert.equal(task68Observation.status, "success");
  assert.equal(task68Observation.signalType, "serp");
  assert.equal(task68Observation.sourceFingerprint, base.reviewedSource.fingerprint);
  assert.equal(task68Observation.metrics.length, normalized.adapterResult.metrics.length);

  const serialized = JSON.stringify(normalized);
  assert.doesNotMatch(serialized, /discarded title|discarded description|discarded xpath|discard me/);
});

test("rank_absolute can exceed requested organic depth while rank_group remains bounded", () => {
  const base = fixture();
  const provided = successfulProviderResult();
  const result = (provided.tasks[0]!.result as Array<Record<string, unknown>>)[0]!;
  const items = result.items as Array<Record<string, unknown>>;
  items[1]!.rank_absolute = 23;
  items[1]!.rank_group = 1;

  const normalized = normalizeSuppliedDataForSeoSerpResult({
    contract: base.contract,
    request: base.request,
    provided,
    observedAt: "2026-09-18T12:05:00.000Z",
  });
  assert.equal(normalized.ranking!.trackedMatches[0]!.rankAbsolute, 5);
  assert.equal(normalized.ranking!.trackedMatches[1]!.rankAbsolute, 23);
});

test("no tracked-domain match remains a successful SERP observation with explicit zero-rank evidence", () => {
  const base = fixture();
  const provided = successfulProviderResult();
  const result = (provided.tasks[0]!.result as Array<Record<string, unknown>>)[0]!;
  const items = result.items as Array<Record<string, unknown>>;
  for (const item of items) {
    if (item.type === "organic") {
      item.domain = "competitor.example";
      item.url = "https://competitor.example/page-" + String(item.rank_absolute);
    }
  }
  const normalized = normalizeSuppliedDataForSeoSerpResult({
    contract: base.contract,
    request: base.request,
    provided,
    observedAt: "2026-09-18T12:05:00.000Z",
  });
  assert.equal(normalized.adapterResult.status, "success");
  assert.deepEqual(normalized.adapterResult.diagnostics, ["tracked_domain_not_found"]);
  const metrics = new Map(normalized.adapterResult.metrics.map((value) => [value.key, value.value]));
  assert.equal(metrics.get("ranking.found"), 0);
  assert.equal(metrics.get("ranking.matched_organic_count"), 0);
  assert.equal(metrics.has("ranking.best_absolute_rank"), false);
});

test("empty completed result maps to Task #68 empty semantics", () => {
  const base = fixture();
  const provided = successfulProviderResult();
  const result = (provided.tasks[0]!.result as Array<Record<string, unknown>>)[0]!;
  result.se_results_count = 0;
  result.items_count = 0;
  result.items = [];

  const normalized = normalizeSuppliedDataForSeoSerpResult({
    contract: base.contract,
    request: base.request,
    provided,
    observedAt: "2026-09-18T12:05:00.000Z",
  });
  assert.equal(normalized.ranking, null);
  assert.equal(normalized.adapterResult.status, "empty");
  assert.deepEqual(normalized.adapterResult.metrics, []);

  const task68Observation = normalizeAdapterResult({
    request: base.request,
    source: base.reviewedSource,
    result: normalized.adapterResult,
    normalizedAt: "2026-09-18T12:06:00.000Z",
  });
  assert.equal(task68Observation.status, "empty");
  assert.equal(task68Observation.positiveEvidence, false);
});

test("provider failure and task-not-ready become bounded Task #68 error results", () => {
  const base = fixture();

  const providerFailure = normalizeSuppliedDataForSeoSerpResult({
    contract: base.contract,
    request: base.request,
    provided: { status_code: 50000, tasks_error: 1, tasks: [] },
    observedAt: "2026-09-18T12:05:00.000Z",
  });
  assert.equal(providerFailure.adapterResult.status, "error");
  assert.equal(providerFailure.adapterResult.errorCode, "dataforseo_status_50000");

  const notReady = successfulProviderResult();
  notReady.tasks[0]!.status_code = 20100;
  notReady.tasks[0]!.result = [];
  const notReadyNormalized = normalizeSuppliedDataForSeoSerpResult({
    contract: base.contract,
    request: base.request,
    provided: notReady,
    observedAt: "2026-09-18T12:05:00.000Z",
  });
  assert.equal(notReadyNormalized.adapterResult.status, "error");
  assert.equal(notReadyNormalized.adapterResult.errorCode, "dataforseo_task_not_ready");

  const observation = normalizeAdapterResult({
    request: base.request,
    source: base.reviewedSource,
    result: notReadyNormalized.adapterResult,
    normalizedAt: "2026-09-18T12:06:00.000Z",
  });
  assert.equal(observation.status, "error");
  assert.equal(observation.confidence, 0);
});

test("malformed and conflicting provider ranking data fails closed", () => {
  const base = fixture();

  const countMismatch = successfulProviderResult();
  ((countMismatch.tasks[0]!.result as Array<Record<string, unknown>>)[0]!).items_count = 99;
  assert.throws(
    () =>
      normalizeSuppliedDataForSeoSerpResult({
        contract: base.contract,
        request: base.request,
        provided: countMismatch,
        observedAt: "2026-09-18T12:05:00.000Z",
      }),
    /provider_items_count_mismatch/,
  );

  const excessiveGroupRank = successfulProviderResult();
  const groupItems = ((excessiveGroupRank.tasks[0]!.result as Array<Record<string, unknown>>)[0]!).items as Array<Record<string, unknown>>;
  groupItems[1]!.rank_group = 21;
  assert.throws(
    () =>
      normalizeSuppliedDataForSeoSerpResult({
        contract: base.contract,
        request: base.request,
        provided: excessiveGroupRank,
        observedAt: "2026-09-18T12:05:00.000Z",
      }),
    /organic_group_rank_exceeds_requested_depth/,
  );

  const conflict = successfulProviderResult();
  const conflictResult = (conflict.tasks[0]!.result as Array<Record<string, unknown>>)[0]!;
  const conflictItems = conflictResult.items as Array<Record<string, unknown>>;
  conflictItems.push({
    type: "organic",
    rank_group: 4,
    rank_absolute: 3,
    page: 1,
    domain: "different.example",
    url: "https://different.example/",
  });
  conflictResult.items_count = 5;
  assert.throws(
    () =>
      normalizeSuppliedDataForSeoSerpResult({
        contract: base.contract,
        request: base.request,
        provided: conflict,
        observedAt: "2026-09-18T12:05:00.000Z",
      }),
    /conflicting_organic_absolute_rank/,
  );
});

test("P5.2 module contains no network, environment, DB, scheduler, or source-admission implementation", () => {
  const sourceText = readFileSync(
    fileURLToPath(new URL("./dataforseo-serp-adapter.ts", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /axios|undici|got\(/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres\(|drizzle/);
  assert.doesNotMatch(sourceText, /setInterval|setTimeout|worker_threads|child_process/);
  assert.doesNotMatch(sourceText, /Authorization\s*:|Basic\s+[A-Za-z0-9+/=]+/);
  assert.doesNotMatch(sourceText, /normalizeSignalSourceDescriptor\s*\(/);
  assert.doesNotMatch(sourceText, /executeAuthorizedSignalCollectionJob\s*\(/);
});
