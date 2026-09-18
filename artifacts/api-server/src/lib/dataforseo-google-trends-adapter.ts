import { createHash } from "node:crypto";
import type { CategoryContext, MarketProfile } from "./market-category-intelligence.js";
import type { SignalSourceDescriptor } from "./signal-source-registry.js";
import type { SourceAdapterRequest } from "./signal-observation-normalization.js";
import {
  buildTrendProjection,
  P5_4_TREND_DIRECTION_THRESHOLD,
  P5_4_TREND_SCALE,
  type TrendProjection,
} from "./trend-metrics-normalization.js";

export const P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION = "p5.4-dataforseo-google-trends-adapter-v1" as const;
export const P5_4_DATAFORSEO_TRENDS_SOURCE_KEY = "dataforseo-google-trends-explore" as const;
export const P5_4_DATAFORSEO_TRENDS_PROVIDER_KEY = "dataforseo" as const;
export const P5_4_DATAFORSEO_TRENDS_METHOD = "dataforseo_google_trends_explore_standard_v1" as const;
export const P5_4_DATAFORSEO_TRENDS_REVIEW_DATE = "2026-09-18" as const;
export const P5_4_DATAFORSEO_TRENDS_TASK_POST_PATH =
  "/v3/keywords_data/google_trends/explore/task_post" as const;
export const P5_4_DATAFORSEO_TRENDS_TASK_GET_PATH_TEMPLATE =
  "/v3/keywords_data/google_trends/explore/task_get/{task_id}" as const;
export const P5_4_DATAFORSEO_TRENDS_MAX_KEYWORDS = 5 as const;

export type DataForSeoGoogleTrendsPayload = {
  keywords: string[];
  location_code: number;
  language_code: string;
  type: "web";
  category_code: 0;
  date_from: string;
  date_to: string;
  item_types: ["google_trends_graph"];
  tag: string;
};

export type DataForSeoGoogleTrendsRequestContract = {
  version: typeof P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION;
  adapterRequestId: string;
  adapterRequestFingerprint: string;
  providerKey: typeof P5_4_DATAFORSEO_TRENDS_PROVIDER_KEY;
  providerMethod: typeof P5_4_DATAFORSEO_TRENDS_METHOD;
  providerReviewDate: typeof P5_4_DATAFORSEO_TRENDS_REVIEW_DATE;
  taskPostPath: typeof P5_4_DATAFORSEO_TRENDS_TASK_POST_PATH;
  taskGetPathTemplate: typeof P5_4_DATAFORSEO_TRENDS_TASK_GET_PATH_TEMPLATE;
  sourceId: string;
  sourceFingerprint: string;
  task68RequestId: string;
  task68RequestFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  keywords: string[];
  locationCode: number;
  languageCode: string;
  dateFrom: string;
  dateTo: string;
  frameDays: number;
  payload: DataForSeoGoogleTrendsPayload;
  safety: ReturnType<typeof dataForSeoGoogleTrendsAdapterCapability>;
};

export type Task68TrendAdapterResult = {
  requestFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceClass: "external";
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: "trend";
  observedAt: string;
  status: "success" | "empty" | "partial" | "error";
  metrics: Array<{ key: string; value: number; unit: string | null }>;
  diagnostics: string[];
  errorCode: string | null;
  completeness: number;
};

export type DataForSeoGoogleTrendsNormalization = {
  version: typeof P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION;
  providerStatusCode: number;
  providerTaskStatusCode: number | null;
  projection: TrendProjection | null;
  adapterResult: Task68TrendAdapterResult;
  safety: ReturnType<typeof dataForSeoGoogleTrendsAdapterCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const SOURCE_ID = /^src-[0-9a-f]{24}$/;
const REQUEST_ID = /^sar-[0-9a-f]{24}$/;
const LANGUAGE = /^[a-z]{2,3}$/;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function round6(value: number): number {
  return Number(value.toFixed(6));
}

function plainObject(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`invalid_${name}`);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw new Error(`invalid_${name}`);
  return value as Record<string, unknown>;
}

function cleanText(value: unknown, name: string, max: number): string {
  if (typeof value !== "string") throw new Error(`invalid_${name}`);
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(`invalid_${name}`);
  }
  return normalized;
}

function canonicalKeyword(value: unknown): string {
  const keyword = cleanText(value, "keyword", 80).toLowerCase();
  if (keyword.split(" ").length > 10) throw new Error("keyword_word_limit_exceeded");
  if (/[<>,|"+=~!:*()[\]{}]/.test(keyword)) throw new Error("unsupported_trend_keyword_character");
  return keyword;
}

function canonicalDate(value: unknown, name: string): string {
  const raw = cleanText(value, name, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error(`invalid_${name}`);
  const milliseconds = Date.parse(`${raw}T00:00:00.000Z`);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().slice(0, 10) !== raw) {
    throw new Error(`invalid_${name}`);
  }
  return raw;
}

function canonicalTimestamp(value: unknown, name: string): string {
  const raw = cleanText(value, name, 64);
  const milliseconds = Date.parse(raw);
  if (!Number.isFinite(milliseconds)) throw new Error(`invalid_${name}`);
  return new Date(milliseconds).toISOString();
}

function boundedInteger(value: unknown, min: number, max: number, name: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`invalid_${name}`);
  }
  return value as number;
}

function normalizeLanguageCode(value: unknown): string {
  const code = cleanText(value, "language_code", 3).toLowerCase();
  if (!LANGUAGE.test(code)) throw new Error("invalid_language_code");
  return code;
}

function normalizeKeywords(values: unknown): string[] {
  if (!Array.isArray(values) || values.length < 1 || values.length > P5_4_DATAFORSEO_TRENDS_MAX_KEYWORDS) {
    throw new Error("invalid_keywords");
  }
  const keywords = values.map(canonicalKeyword);
  const unique = [...new Set(keywords)].sort((a, b) => a.localeCompare(b));
  if (unique.length !== keywords.length) throw new Error("duplicate_keyword");
  return unique;
}

function frameDays(dateFrom: string, dateTo: string): number {
  const from = Date.parse(`${dateFrom}T00:00:00Z`);
  const to = Date.parse(`${dateTo}T00:00:00Z`);
  if (from > to) throw new Error("invalid_date_range");
  return Math.floor((to - from) / 86_400_000) + 1;
}

function validateTask68Lineage(input: {
  source: SignalSourceDescriptor;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
}): void {
  const { source, request, market, category } = input;
  if (source.key !== P5_4_DATAFORSEO_TRENDS_SOURCE_KEY) throw new Error("dataforseo_trends_source_key_required");
  if (source.sourceClass !== "external" || request.sourceClass !== "external") throw new Error("external_source_required");
  if (source.collectionMode !== "provider_api" || request.collectionMode !== "provider_api") {
    throw new Error("provider_api_collection_mode_required");
  }
  if (request.signalType !== "trend" || !source.signalTypes.includes("trend")) throw new Error("trend_signal_required");
  if (!SOURCE_ID.test(request.sourceId) || request.sourceId !== source.sourceId) throw new Error("source_id_mismatch");
  if (!HEX_64.test(request.sourceFingerprint) || request.sourceFingerprint !== source.fingerprint) {
    throw new Error("source_fingerprint_mismatch");
  }
  if (!REQUEST_ID.test(request.requestId) || !HEX_64.test(request.requestFingerprint)) {
    throw new Error("invalid_task68_request_identity");
  }
  if (request.marketFingerprint !== market.fingerprint) throw new Error("market_fingerprint_mismatch");
  if (request.categoryFingerprint !== category.fingerprint) throw new Error("category_fingerprint_mismatch");
  if (market.searchEngine !== "google") throw new Error("google_search_engine_required");
  if (market.device !== "all") throw new Error("all_device_market_required");
}

function contractIdentity(
  contract: Omit<DataForSeoGoogleTrendsRequestContract, "adapterRequestId" | "adapterRequestFingerprint" | "payload" | "safety">,
) {
  return {
    providerKey: contract.providerKey,
    providerMethod: contract.providerMethod,
    providerReviewDate: contract.providerReviewDate,
    taskPostPath: contract.taskPostPath,
    taskGetPathTemplate: contract.taskGetPathTemplate,
    sourceId: contract.sourceId,
    sourceFingerprint: contract.sourceFingerprint,
    task68RequestId: contract.task68RequestId,
    task68RequestFingerprint: contract.task68RequestFingerprint,
    marketFingerprint: contract.marketFingerprint,
    categoryFingerprint: contract.categoryFingerprint,
    keywords: contract.keywords,
    locationCode: contract.locationCode,
    languageCode: contract.languageCode,
    dateFrom: contract.dateFrom,
    dateTo: contract.dateTo,
    frameDays: contract.frameDays,
  };
}

function expectedPayload(contract: DataForSeoGoogleTrendsRequestContract): DataForSeoGoogleTrendsPayload {
  return {
    keywords: contract.keywords,
    location_code: contract.locationCode,
    language_code: contract.languageCode,
    type: "web",
    category_code: 0,
    date_from: contract.dateFrom,
    date_to: contract.dateTo,
    item_types: ["google_trends_graph"],
    tag: `seo-p54-${contract.adapterRequestFingerprint.slice(0, 32)}`,
  };
}

function validateContract(contract: DataForSeoGoogleTrendsRequestContract): void {
  if (contract.version !== P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION) throw new Error("unsupported_p5_4_adapter_version");
  if (contract.providerKey !== P5_4_DATAFORSEO_TRENDS_PROVIDER_KEY) throw new Error("invalid_provider_key");
  if (contract.providerMethod !== P5_4_DATAFORSEO_TRENDS_METHOD) throw new Error("invalid_provider_method");
  if (contract.providerReviewDate !== P5_4_DATAFORSEO_TRENDS_REVIEW_DATE) throw new Error("provider_review_lineage_mismatch");
  const fingerprint = hash({
    version: P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION,
    ...contractIdentity(contract),
  });
  if (fingerprint !== contract.adapterRequestFingerprint) throw new Error("adapter_request_fingerprint_mismatch");
  if (contract.adapterRequestId !== `p54-trend-${fingerprint.slice(0, 20)}`) throw new Error("adapter_request_id_mismatch");
  if (JSON.stringify(contract.payload) !== JSON.stringify(expectedPayload(contract))) {
    throw new Error("provider_payload_mismatch");
  }
}

export function buildDataForSeoGoogleTrendsRequestContract(input: {
  source: SignalSourceDescriptor;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
  keywords: string[];
  locationCode: number;
  languageCode: string;
  dateFrom: string;
  dateTo: string;
  now: string;
}): DataForSeoGoogleTrendsRequestContract {
  validateTask68Lineage(input);
  const now = canonicalTimestamp(input.now, "now");
  const keywords = normalizeKeywords(input.keywords);
  const locationCode = boundedInteger(input.locationCode, 1, 2_147_483_647, "location_code");
  const languageCode = normalizeLanguageCode(input.languageCode);
  const marketLanguage = input.market.language.split("-")[0]!.toLowerCase();
  if (languageCode !== marketLanguage) throw new Error("language_code_market_mismatch");
  const dateFrom = canonicalDate(input.dateFrom, "date_from");
  const dateTo = canonicalDate(input.dateTo, "date_to");
  const days = frameDays(dateFrom, dateTo);
  if (days < 30 || days > 366) throw new Error("trend_frame_days_out_of_bounds");
  if (Date.parse(`${dateTo}T23:59:59Z`) > Date.parse(now)) throw new Error("trend_frame_ends_in_future");

  const base = {
    version: P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION,
    providerKey: P5_4_DATAFORSEO_TRENDS_PROVIDER_KEY,
    providerMethod: P5_4_DATAFORSEO_TRENDS_METHOD,
    providerReviewDate: P5_4_DATAFORSEO_TRENDS_REVIEW_DATE,
    taskPostPath: P5_4_DATAFORSEO_TRENDS_TASK_POST_PATH,
    taskGetPathTemplate: P5_4_DATAFORSEO_TRENDS_TASK_GET_PATH_TEMPLATE,
    sourceId: input.source.sourceId,
    sourceFingerprint: input.source.fingerprint,
    task68RequestId: input.request.requestId,
    task68RequestFingerprint: input.request.requestFingerprint,
    marketFingerprint: input.market.fingerprint,
    categoryFingerprint: input.category.fingerprint,
    keywords,
    locationCode,
    languageCode,
    dateFrom,
    dateTo,
    frameDays: days,
  } as const;
  const adapterRequestFingerprint = hash({
    version: P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION,
    ...contractIdentity(base),
  });
  const provisional = {
    ...base,
    adapterRequestId: `p54-trend-${adapterRequestFingerprint.slice(0, 20)}`,
    adapterRequestFingerprint,
  };
  const payload: DataForSeoGoogleTrendsPayload = {
    keywords,
    location_code: locationCode,
    language_code: languageCode,
    type: "web",
    category_code: 0,
    date_from: dateFrom,
    date_to: dateTo,
    item_types: ["google_trends_graph"],
    tag: `seo-p54-${adapterRequestFingerprint.slice(0, 32)}`,
  };
  return {
    ...provisional,
    payload,
    safety: dataForSeoGoogleTrendsAdapterCapability(),
  };
}

function task68Base(
  contract: DataForSeoGoogleTrendsRequestContract,
  request: SourceAdapterRequest,
  observedAt: string,
): Pick<
  Task68TrendAdapterResult,
  | "requestFingerprint"
  | "sourceId"
  | "sourceFingerprint"
  | "sourceClass"
  | "marketFingerprint"
  | "categoryFingerprint"
  | "signalType"
  | "observedAt"
> {
  if (contract.task68RequestFingerprint !== request.requestFingerprint) throw new Error("task68_request_fingerprint_mismatch");
  if (contract.task68RequestId !== request.requestId) throw new Error("task68_request_id_mismatch");
  if (contract.sourceId !== request.sourceId || contract.sourceFingerprint !== request.sourceFingerprint) {
    throw new Error("task68_source_lineage_mismatch");
  }
  if (contract.marketFingerprint !== request.marketFingerprint || contract.categoryFingerprint !== request.categoryFingerprint) {
    throw new Error("task68_scope_lineage_mismatch");
  }
  if (request.sourceClass !== "external" || request.signalType !== "trend") throw new Error("task68_trend_external_required");
  return {
    requestFingerprint: request.requestFingerprint,
    sourceId: request.sourceId,
    sourceFingerprint: request.sourceFingerprint,
    sourceClass: "external",
    marketFingerprint: request.marketFingerprint,
    categoryFingerprint: request.categoryFingerprint,
    signalType: "trend",
    observedAt,
  };
}

function errorResult(
  contract: DataForSeoGoogleTrendsRequestContract,
  request: SourceAdapterRequest,
  observedAt: string,
  providerStatusCode: number,
  providerTaskStatusCode: number | null,
  errorCode: string,
): DataForSeoGoogleTrendsNormalization {
  return {
    version: P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION,
    providerStatusCode,
    providerTaskStatusCode,
    projection: null,
    adapterResult: {
      ...task68Base(contract, request, observedAt),
      status: "error",
      metrics: [],
      diagnostics: [],
      errorCode,
      completeness: 0,
    },
    safety: dataForSeoGoogleTrendsAdapterCapability(),
  };
}

function metric(key: string, value: number, unit: string | null) {
  return { key, value, unit };
}

function exactKeywordArray(value: unknown, expected: string[], name: string): void {
  if (!Array.isArray(value) || value.length !== expected.length) throw new Error(`invalid_${name}`);
  const normalized = value.map(canonicalKeyword);
  if (JSON.stringify(normalized) !== JSON.stringify(expected)) throw new Error(`${name}_mismatch`);
}

export function normalizeSuppliedDataForSeoGoogleTrendsResult(input: {
  contract: DataForSeoGoogleTrendsRequestContract;
  request: SourceAdapterRequest;
  provided: unknown;
  observedAt: string;
}): DataForSeoGoogleTrendsNormalization {
  validateContract(input.contract);
  const observedAt = canonicalTimestamp(input.observedAt, "observed_at");
  task68Base(input.contract, input.request, observedAt);

  const envelope = plainObject(input.provided, "dataforseo_response");
  const providerStatusCode = boundedInteger(envelope.status_code, 0, 99_999, "provider_status_code");
  if (providerStatusCode !== 20_000) {
    return errorResult(
      input.contract,
      input.request,
      observedAt,
      providerStatusCode,
      null,
      `dataforseo_status_${providerStatusCode}`,
    );
  }
  const tasksError = boundedInteger(envelope.tasks_error ?? 0, 0, 1_000, "tasks_error");
  if (tasksError > 0) {
    return errorResult(input.contract, input.request, observedAt, providerStatusCode, null, "dataforseo_tasks_error");
  }
  if (!Array.isArray(envelope.tasks) || envelope.tasks.length !== 1) throw new Error("exactly_one_provider_task_required");
  const task = plainObject(envelope.tasks[0], "dataforseo_task");
  const providerTaskStatusCode = boundedInteger(task.status_code, 0, 99_999, "provider_task_status_code");
  if (providerTaskStatusCode === 20_100) {
    return errorResult(
      input.contract,
      input.request,
      observedAt,
      providerStatusCode,
      providerTaskStatusCode,
      "dataforseo_task_not_ready",
    );
  }
  if (providerTaskStatusCode !== 20_000) {
    return errorResult(
      input.contract,
      input.request,
      observedAt,
      providerStatusCode,
      providerTaskStatusCode,
      `dataforseo_task_status_${providerTaskStatusCode}`,
    );
  }
  if (!Array.isArray(task.result) || task.result.length !== 1) throw new Error("exactly_one_provider_result_required");
  const result = plainObject(task.result[0], "dataforseo_result");
  exactKeywordArray(result.keywords, input.contract.keywords, "result_keywords");
  if (boundedInteger(result.location_code, 1, 2_147_483_647, "result_location_code") !== input.contract.locationCode) {
    throw new Error("provider_location_mismatch");
  }
  if (normalizeLanguageCode(result.language_code) !== input.contract.languageCode) throw new Error("provider_language_mismatch");

  const itemsCount = boundedInteger(result.items_count ?? 0, 0, 16, "items_count");
  const items = result.items ?? [];
  if (!Array.isArray(items) || items.length > 16) throw new Error("invalid_provider_items");
  if (itemsCount !== items.length) throw new Error("provider_items_count_mismatch");
  if (items.length === 0) {
    return {
      version: P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION,
      providerStatusCode,
      providerTaskStatusCode,
      projection: null,
      adapterResult: {
        ...task68Base(input.contract, input.request, observedAt),
        status: "empty",
        metrics: [],
        diagnostics: ["trend_graph_absent"],
        errorCode: null,
        completeness: 1,
      },
      safety: dataForSeoGoogleTrendsAdapterCapability(),
    };
  }
  if (items.length !== 1) throw new Error("exactly_one_trend_graph_required");
  const graph = plainObject(items[0], "google_trends_graph");
  if (graph.type !== "google_trends_graph") throw new Error("google_trends_graph_required");
  exactKeywordArray(graph.keywords, input.contract.keywords, "graph_keywords");
  if (!Array.isArray(graph.data) || graph.data.length === 0 || graph.data.length > 400) {
    throw new Error("invalid_graph_data");
  }

  const points = graph.data.map((value) => {
    const point = plainObject(value, "trend_graph_point");
    if (typeof point.missing_data !== "boolean") throw new Error("invalid_missing_data_flag");
    if (!Array.isArray(point.values) || point.values.length !== input.contract.keywords.length) {
      throw new Error("trend_value_cardinality_mismatch");
    }
    return {
      dateFrom: canonicalDate(point.date_from, "point_date_from"),
      dateTo: canonicalDate(point.date_to, "point_date_to"),
      timestamp: boundedInteger(point.timestamp, 0, 4_102_444_800, "point_timestamp"),
      missingData: point.missing_data,
      values: point.values.map((item) => {
        if (item === null) return null;
        return boundedInteger(item, 0, 100, "relative_trend_value");
      }),
    };
  });

  const projection = buildTrendProjection({
    basis: {
      providerKey: P5_4_DATAFORSEO_TRENDS_PROVIDER_KEY,
      providerMethod: P5_4_DATAFORSEO_TRENDS_METHOD,
      sourceFingerprint: input.contract.sourceFingerprint,
      marketFingerprint: input.contract.marketFingerprint,
      categoryFingerprint: input.contract.categoryFingerprint,
      keywords: input.contract.keywords,
      locationCode: input.contract.locationCode,
      languageCode: input.contract.languageCode,
      property: "web",
      providerCategoryCode: 0,
      dateFrom: input.contract.dateFrom,
      dateTo: input.contract.dateTo,
      scale: P5_4_TREND_SCALE,
    },
    observedAt,
    points,
  });

  const summaries = projection.keywordSummaries;
  const usableTotal = summaries.reduce((sum, summary) => sum + summary.usablePointCount, 0);
  if (usableTotal === 0) {
    return {
      version: P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION,
      providerStatusCode,
      providerTaskStatusCode,
      projection,
      adapterResult: {
        ...task68Base(input.contract, input.request, observedAt),
        status: "empty",
        metrics: [],
        diagnostics: ["trend_data_unavailable"],
        errorCode: null,
        completeness: 1,
      },
      safety: dataForSeoGoogleTrendsAdapterCapability(),
    };
  }

  const avgCoverage = round6(
    summaries.reduce((sum, summary) => sum + summary.coverageRatio, 0) / summaries.length,
  );
  const velocityScored = summaries.filter((summary) => summary.signedVelocity !== null);
  const risingCount = velocityScored.filter(
    (summary) => summary.signedVelocity! >= P5_4_TREND_DIRECTION_THRESHOLD,
  ).length;
  const fallingCount = velocityScored.filter(
    (summary) => summary.signedVelocity! <= -P5_4_TREND_DIRECTION_THRESHOLD,
  ).length;
  const flatCount = velocityScored.length - risingCount - fallingCount;
  const zeroInsufficientCount = summaries.reduce(
    (sum, summary) => sum + summary.zeroInsufficientDataPointCount,
    0,
  );

  const metrics = [
    metric("trend.requested_keyword_count", input.contract.keywords.length, "count"),
    metric("trend.graph_point_count", projection.points.length, "count"),
    metric("trend.avg_coverage_ratio", avgCoverage, "ratio"),
    metric("trend.rising_keyword_count", risingCount, "count"),
    metric("trend.falling_keyword_count", fallingCount, "count"),
    metric("trend.flat_keyword_count", flatCount, "count"),
    metric("trend.velocity_scored_keyword_count", velocityScored.length, "count"),
    metric("trend.velocity_unavailable_keyword_count", summaries.length - velocityScored.length, "count"),
    metric("trend.zero_insufficient_data_point_count", zeroInsufficientCount, "count"),
  ];

  if (velocityScored.length > 0) {
    metrics.push(
      metric(
        "trend.avg_positive_momentum",
        round6(
          velocityScored.reduce((sum, summary) => sum + summary.positiveMomentum!, 0) / velocityScored.length,
        ),
        "ratio",
      ),
      metric(
        "trend.avg_signed_velocity",
        round6(
          velocityScored.reduce((sum, summary) => sum + summary.signedVelocity!, 0) / velocityScored.length,
        ),
        "ratio",
      ),
    );
  }

  const partial = avgCoverage < 1;
  const diagnostics: string[] = [];
  if (partial) diagnostics.push("missing_trend_points");
  if (velocityScored.length < summaries.length) diagnostics.push("velocity_unavailable_for_some_keywords");
  if (zeroInsufficientCount > 0) diagnostics.push("zero_index_means_insufficient_data");

  return {
    version: P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION,
    providerStatusCode,
    providerTaskStatusCode,
    projection,
    adapterResult: {
      ...task68Base(input.contract, input.request, observedAt),
      status: partial ? "partial" : "success",
      metrics: metrics.sort((a, b) => a.key.localeCompare(b.key)),
      diagnostics: [...new Set(diagnostics)].sort(),
      errorCode: null,
      completeness: partial ? avgCoverage : 1,
    },
    safety: dataForSeoGoogleTrendsAdapterCapability(),
  };
}

export function dataForSeoGoogleTrendsAdapterCapability() {
  return Object.freeze({
    version: P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION,
    providerKey: P5_4_DATAFORSEO_TRENDS_PROVIDER_KEY,
    providerMethod: P5_4_DATAFORSEO_TRENDS_METHOD,
    providerReviewDate: P5_4_DATAFORSEO_TRENDS_REVIEW_DATE,
    standardTaskContractOnly: true,
    suppliedResultNormalizationOnly: true,
    liveEndpointAuthorized: false,
    providerEnrollmentAuthorized: false,
    providerPurchaseAuthorized: false,
    credentialCreationAuthorized: false,
    credentialUseAuthorized: false,
    networkRequestAuthorized: false,
    providerSdkAuthorized: false,
    officialGoogleTrendsAlphaEnrollmentAuthorized: false,
    callbackAuthorized: false,
    pingbackAuthorized: false,
    postbackAuthorized: false,
    pollingAuthorized: false,
    relatedTopicsAuthorized: false,
    relatedQueriesAuthorized: false,
    mapDataAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    task70ExecutionAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    databaseReadsAuthorized: false,
    databaseWritesAuthorized: false,
    schemaMutationAuthorized: false,
    schedulerEnabled: false,
    batchEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    publicationAuthorized: false,
    automaticTransition: false,
  });
}
