import { createHash } from "node:crypto";
import type { CategoryContext, MarketProfile } from "./market-category-intelligence.js";
import {
  buildP5_1ProviderSelectionReview,
  classifyP5_1ReviewFreshness,
  type ProviderSelectionReview,
} from "./external-search-provider-selection.js";
import type { SignalSourceDescriptor } from "./signal-source-registry.js";
import type { SourceAdapterRequest } from "./signal-observation-normalization.js";
import {
  buildKeywordMetricProjection,
  scoreKeywordOpportunityCohort,
  type KeywordMetricProjection,
  type KeywordOpportunityCohort,
  type MonthlySearchVolume,
} from "./keyword-metrics-normalization.js";

export const P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION = "p5.3-dataforseo-keyword-adapter-v1" as const;
export const P5_3_DATAFORSEO_KEYWORD_SOURCE_KEY = "dataforseo-google-keyword-overview" as const;
export const P5_3_DATAFORSEO_KEYWORD_PROVIDER_KEY = "dataforseo" as const;
export const P5_3_DATAFORSEO_KEYWORD_METHOD = "dataforseo_labs_google_keyword_overview_v1" as const;
export const P5_3_DATAFORSEO_KEYWORD_ENDPOINT_REFERENCE =
  "/v3/dataforseo_labs/google/keyword_overview/live" as const;
export const P5_3_DATAFORSEO_KEYWORD_MAX_KEYWORDS = 50 as const;

export type DataForSeoKeywordRequestPayload = {
  keywords: string[];
  location_code: number;
  language_code: string;
  include_clickstream_data: false;
  include_serp_info: false;
};

export type DataForSeoKeywordRequestContract = {
  version: typeof P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION;
  adapterRequestId: string;
  adapterRequestFingerprint: string;
  providerKey: typeof P5_3_DATAFORSEO_KEYWORD_PROVIDER_KEY;
  providerMethod: typeof P5_3_DATAFORSEO_KEYWORD_METHOD;
  providerEndpointReference: typeof P5_3_DATAFORSEO_KEYWORD_ENDPOINT_REFERENCE;
  p5_1ReviewFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  task68RequestId: string;
  task68RequestFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  locationCode: number;
  languageCode: string;
  keywords: string[];
  payload: DataForSeoKeywordRequestPayload;
  safety: ReturnType<typeof dataForSeoKeywordAdapterCapability>;
};

export type Task68KeywordAdapterResult = {
  requestFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceClass: "external";
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: "keyword";
  observedAt: string;
  status: "success" | "empty" | "partial" | "error";
  metrics: Array<{ key: string; value: number; unit: string | null }>;
  diagnostics: string[];
  errorCode: string | null;
  completeness: number;
};

export type DataForSeoKeywordNormalization = {
  version: typeof P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION;
  providerStatusCode: number;
  providerTaskStatusCode: number | null;
  projections: KeywordMetricProjection[];
  opportunity: KeywordOpportunityCohort | null;
  adapterResult: Task68KeywordAdapterResult;
  safety: ReturnType<typeof dataForSeoKeywordAdapterCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const SOURCE_ID = /^src-[0-9a-f]{24}$/;
const REQUEST_ID = /^sar-[0-9a-f]{24}$/;
const LANGUAGE = /^[a-z]{2,3}$/;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
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
  return keyword;
}

function canonicalTimestamp(value: unknown, name: string): string {
  const raw = cleanText(value, name, 64);
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) throw new Error(`invalid_${name}`);
  return new Date(ms).toISOString();
}

function boundedInteger(value: unknown, min: number, max: number, name: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw new Error(`invalid_${name}`);
  return value as number;
}

function nullableInteger(value: unknown, min: number, max: number, name: string): number | null {
  if (value == null) return null;
  return boundedInteger(value, min, max, name);
}

function nullableNumber(value: unknown, min: number, max: number, name: string): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`invalid_${name}`);
  return value;
}

function normalizeLanguageCode(value: unknown): string {
  const code = cleanText(value, "language_code", 3).toLowerCase();
  if (!LANGUAGE.test(code)) throw new Error("invalid_language_code");
  return code;
}

function validateP5_1Review(review: ProviderSelectionReview, now: string): void {
  const canonical = buildP5_1ProviderSelectionReview();
  if (
    review.version !== canonical.version
    || review.reviewId !== canonical.reviewId
    || review.fingerprint !== canonical.fingerprint
  ) {
    throw new Error("p5_1_review_lineage_mismatch");
  }
  if (classifyP5_1ReviewFreshness(review, now) !== "fresh") throw new Error("p5_1_review_stale");
  const selected = review.selections.find((value) => value.role === "dual_purpose_engineering");
  if (!selected || selected.providerKey !== P5_3_DATAFORSEO_KEYWORD_PROVIDER_KEY) {
    throw new Error("p5_1_dataforseo_selection_required");
  }
}

function validateTask68Lineage(input: {
  source: SignalSourceDescriptor;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
}): void {
  const { source, request, market, category } = input;
  if (source.key !== P5_3_DATAFORSEO_KEYWORD_SOURCE_KEY) throw new Error("dataforseo_keyword_source_key_required");
  if (source.sourceClass !== "external" || request.sourceClass !== "external") throw new Error("external_source_required");
  if (source.collectionMode !== "provider_api" || request.collectionMode !== "provider_api") {
    throw new Error("provider_api_collection_mode_required");
  }
  if (request.signalType !== "keyword" || !source.signalTypes.includes("keyword")) throw new Error("keyword_signal_required");
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

function normalizeKeywords(values: unknown): string[] {
  if (!Array.isArray(values) || values.length < 1 || values.length > P5_3_DATAFORSEO_KEYWORD_MAX_KEYWORDS) {
    throw new Error("invalid_keywords");
  }
  const keywords = values.map(canonicalKeyword);
  const unique = [...new Set(keywords)].sort((a, b) => a.localeCompare(b));
  if (unique.length !== keywords.length) throw new Error("duplicate_keyword");
  return unique;
}

function contractIdentity(contract: Omit<DataForSeoKeywordRequestContract, "adapterRequestId" | "adapterRequestFingerprint" | "payload" | "safety">) {
  return {
    providerKey: contract.providerKey,
    providerMethod: contract.providerMethod,
    providerEndpointReference: contract.providerEndpointReference,
    p5_1ReviewFingerprint: contract.p5_1ReviewFingerprint,
    sourceId: contract.sourceId,
    sourceFingerprint: contract.sourceFingerprint,
    task68RequestId: contract.task68RequestId,
    task68RequestFingerprint: contract.task68RequestFingerprint,
    marketFingerprint: contract.marketFingerprint,
    categoryFingerprint: contract.categoryFingerprint,
    locationCode: contract.locationCode,
    languageCode: contract.languageCode,
    keywords: contract.keywords,
  };
}

function validateContract(contract: DataForSeoKeywordRequestContract): void {
  if (contract.version !== P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION) throw new Error("unsupported_p5_3_adapter_version");
  if (contract.providerKey !== P5_3_DATAFORSEO_KEYWORD_PROVIDER_KEY) throw new Error("invalid_provider_key");
  if (contract.providerMethod !== P5_3_DATAFORSEO_KEYWORD_METHOD) throw new Error("invalid_provider_method");
  if (contract.providerEndpointReference !== P5_3_DATAFORSEO_KEYWORD_ENDPOINT_REFERENCE) {
    throw new Error("invalid_provider_endpoint_reference");
  }
  const fingerprint = hash({
    version: P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION,
    ...contractIdentity(contract),
  });
  if (fingerprint !== contract.adapterRequestFingerprint) throw new Error("adapter_request_fingerprint_mismatch");
  if (contract.adapterRequestId !== `p53-keyword-${fingerprint.slice(0, 20)}`) throw new Error("adapter_request_id_mismatch");
  const expectedPayload: DataForSeoKeywordRequestPayload = {
    keywords: contract.keywords,
    location_code: contract.locationCode,
    language_code: contract.languageCode,
    include_clickstream_data: false,
    include_serp_info: false,
  };
  if (JSON.stringify(contract.payload) !== JSON.stringify(expectedPayload)) throw new Error("provider_payload_mismatch");
}

export function buildDataForSeoKeywordRequestContract(input: {
  review: ProviderSelectionReview;
  source: SignalSourceDescriptor;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
  keywords: string[];
  locationCode: number;
  languageCode: string;
  now: string;
}): DataForSeoKeywordRequestContract {
  const now = canonicalTimestamp(input.now, "now");
  validateP5_1Review(input.review, now);
  validateTask68Lineage(input);

  const keywords = normalizeKeywords(input.keywords);
  const locationCode = boundedInteger(input.locationCode, 1, 2_147_483_647, "location_code");
  const languageCode = normalizeLanguageCode(input.languageCode);
  const marketLanguage = input.market.language.split("-")[0]!.toLowerCase();
  if (languageCode !== marketLanguage) throw new Error("language_code_market_mismatch");

  const base = {
    version: P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION,
    providerKey: P5_3_DATAFORSEO_KEYWORD_PROVIDER_KEY,
    providerMethod: P5_3_DATAFORSEO_KEYWORD_METHOD,
    providerEndpointReference: P5_3_DATAFORSEO_KEYWORD_ENDPOINT_REFERENCE,
    p5_1ReviewFingerprint: input.review.fingerprint,
    sourceId: input.source.sourceId,
    sourceFingerprint: input.source.fingerprint,
    task68RequestId: input.request.requestId,
    task68RequestFingerprint: input.request.requestFingerprint,
    marketFingerprint: input.market.fingerprint,
    categoryFingerprint: input.category.fingerprint,
    locationCode,
    languageCode,
    keywords,
  } as const;
  const adapterRequestFingerprint = hash({
    version: P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION,
    ...contractIdentity(base),
  });
  return {
    ...base,
    adapterRequestId: `p53-keyword-${adapterRequestFingerprint.slice(0, 20)}`,
    adapterRequestFingerprint,
    payload: {
      keywords,
      location_code: locationCode,
      language_code: languageCode,
      include_clickstream_data: false,
      include_serp_info: false,
    },
    safety: dataForSeoKeywordAdapterCapability(),
  };
}

function task68Base(
  contract: DataForSeoKeywordRequestContract,
  request: SourceAdapterRequest,
  observedAt: string,
): Pick<
  Task68KeywordAdapterResult,
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
  if (request.sourceClass !== "external" || request.signalType !== "keyword") throw new Error("task68_keyword_external_required");
  return {
    requestFingerprint: request.requestFingerprint,
    sourceId: request.sourceId,
    sourceFingerprint: request.sourceFingerprint,
    sourceClass: "external",
    marketFingerprint: request.marketFingerprint,
    categoryFingerprint: request.categoryFingerprint,
    signalType: "keyword",
    observedAt,
  };
}

function errorResult(
  contract: DataForSeoKeywordRequestContract,
  request: SourceAdapterRequest,
  observedAt: string,
  providerStatusCode: number,
  providerTaskStatusCode: number | null,
  errorCode: string,
): DataForSeoKeywordNormalization {
  return {
    version: P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION,
    providerStatusCode,
    providerTaskStatusCode,
    projections: [],
    opportunity: null,
    adapterResult: {
      ...task68Base(contract, request, observedAt),
      status: "error",
      metrics: [],
      diagnostics: [],
      errorCode,
      completeness: 0,
    },
    safety: dataForSeoKeywordAdapterCapability(),
  };
}

function metric(key: string, value: number, unit: string | null) {
  return { key, value, unit };
}

function providerTimestamp(value: unknown): string | null {
  if (value == null) return null;
  const raw = cleanText(value, "provider_updated_at", 64);
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T").replace(" +00:00", "Z");
  return canonicalTimestamp(normalized, "provider_updated_at");
}

function monthlySearches(value: unknown): MonthlySearchVolume[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 60) throw new Error("invalid_provider_monthly_searches");
  return value.map((entry) => {
    const record = plainObject(entry, "provider_monthly_search");
    return {
      year: boundedInteger(record.year, 2000, 2200, "provider_monthly_year"),
      month: boundedInteger(record.month, 1, 12, "provider_monthly_month"),
      searches: boundedInteger(record.search_volume, 0, 1_000_000_000_000, "provider_monthly_search_volume"),
    };
  });
}

function competitionLevel(value: unknown): "low" | "medium" | "high" | null {
  if (value == null) return null;
  const normalized = cleanText(value, "competition_level", 12).toLowerCase();
  if (!["low", "medium", "high"].includes(normalized)) throw new Error("invalid_competition_level");
  return normalized as "low" | "medium" | "high";
}

type ParsedProviderItem = {
  keyword: string;
  searchPartners: boolean;
  providerUpdatedAt: string | null;
  searchVolume: number | null;
  monthly: MonthlySearchVolume[];
  difficulty: number | null;
  cpc: number | null;
  competition: number | null;
  competitionIndex: number | null;
  competitionLevel: "low" | "medium" | "high" | null;
  bidLow: number | null;
  bidHigh: number | null;
};

function parseProviderItem(value: unknown, contract: DataForSeoKeywordRequestContract): ParsedProviderItem {
  const item = plainObject(value, "provider_keyword_item");
  if (item.se_type !== "google") throw new Error("provider_search_engine_mismatch");
  const keyword = canonicalKeyword(item.keyword);
  if (!contract.keywords.includes(keyword)) throw new Error("unexpected_provider_keyword");
  if (boundedInteger(item.location_code, 1, 2_147_483_647, "item_location_code") !== contract.locationCode) {
    throw new Error("provider_location_mismatch");
  }
  if (normalizeLanguageCode(item.language_code) !== contract.languageCode) throw new Error("provider_language_mismatch");
  if (typeof item.search_partners !== "boolean") throw new Error("invalid_search_partners");

  const keywordInfo = item.keyword_info == null ? null : plainObject(item.keyword_info, "keyword_info");
  const keywordProperties = item.keyword_properties == null ? null : plainObject(item.keyword_properties, "keyword_properties");

  return {
    keyword,
    searchPartners: item.search_partners,
    providerUpdatedAt: keywordInfo ? providerTimestamp(keywordInfo.last_updated_time) : null,
    searchVolume: keywordInfo ? nullableInteger(keywordInfo.search_volume, 0, 1_000_000_000_000, "search_volume") : null,
    monthly: keywordInfo ? monthlySearches(keywordInfo.monthly_searches) : [],
    difficulty: keywordProperties
      ? nullableInteger(keywordProperties.keyword_difficulty, 0, 100, "keyword_difficulty")
      : null,
    cpc: keywordInfo ? nullableNumber(keywordInfo.cpc, 0, 1_000_000, "cpc") : null,
    competition: keywordInfo ? nullableNumber(keywordInfo.competition, 0, 1, "competition") : null,
    competitionIndex: keywordInfo
      ? nullableInteger(keywordInfo.competition_index, 0, 100, "competition_index")
      : null,
    competitionLevel: keywordInfo ? competitionLevel(keywordInfo.competition_level) : null,
    bidLow: keywordInfo ? nullableNumber(keywordInfo.low_top_of_page_bid, 0, 1_000_000, "bid_low") : null,
    bidHigh: keywordInfo ? nullableNumber(keywordInfo.high_top_of_page_bid, 0, 1_000_000, "bid_high") : null,
  };
}

export function normalizeSuppliedDataForSeoKeywordResult(input: {
  contract: DataForSeoKeywordRequestContract;
  request: SourceAdapterRequest;
  provided: unknown;
  observedAt: string;
}): DataForSeoKeywordNormalization {
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
  if (result.se_type !== "google") throw new Error("provider_search_engine_mismatch");
  if (boundedInteger(result.location_code, 1, 2_147_483_647, "result_location_code") !== input.contract.locationCode) {
    throw new Error("provider_location_mismatch");
  }
  if (normalizeLanguageCode(result.language_code) !== input.contract.languageCode) throw new Error("provider_language_mismatch");
  const itemsCount = boundedInteger(result.items_count ?? 0, 0, P5_3_DATAFORSEO_KEYWORD_MAX_KEYWORDS, "items_count");
  const items = result.items ?? [];
  if (!Array.isArray(items) || items.length > P5_3_DATAFORSEO_KEYWORD_MAX_KEYWORDS) throw new Error("provider_items_bound_exceeded");
  if (itemsCount !== items.length) throw new Error("provider_items_count_mismatch");

  const parsed = items.map((item) => parseProviderItem(item, input.contract));
  const byKeyword = new Map<string, ParsedProviderItem>();
  for (const item of parsed) {
    if (byKeyword.has(item.keyword)) throw new Error("duplicate_provider_keyword");
    byKeyword.set(item.keyword, item);
  }

  const networkValues = new Set(parsed.map((item) => item.searchPartners));
  if (networkValues.size > 1) throw new Error("mixed_search_network_scope");
  const searchNetwork =
    parsed.length === 0
      ? "provider_unspecified" as const
      : parsed[0]!.searchPartners
        ? "google_and_partners" as const
        : "google" as const;

  const projections = input.contract.keywords.map((keyword) => {
    const item = byKeyword.get(keyword);
    const diagnostics: string[] = [];
    if (!item) diagnostics.push("provider_keyword_omitted");
    return buildKeywordMetricProjection({
      keyword,
      observedAt,
      providerUpdatedAt: item?.providerUpdatedAt ?? null,
      basis: {
        providerKey: P5_3_DATAFORSEO_KEYWORD_PROVIDER_KEY,
        providerMethod: P5_3_DATAFORSEO_KEYWORD_METHOD,
        sourceFingerprint: input.contract.sourceFingerprint,
        marketFingerprint: input.contract.marketFingerprint,
        categoryFingerprint: input.contract.categoryFingerprint,
        locationCode: input.contract.locationCode,
        languageCode: input.contract.languageCode,
        searchNetwork,
        variantScope: "unknown",
        cpcCurrency: "USD",
        cpcBasis: "dataforseo_high_top_page_bid_derived",
      },
      avgMonthlySearchVolume: item?.searchVolume ?? null,
      monthlySearches: item?.monthly ?? [],
      organicDifficultyScore: item?.difficulty ?? null,
      organicDifficultyMethod: "dataforseo_labs_top10_logarithmic",
      cpcAmount: item?.cpc ?? null,
      paidCompetitionRatio: item?.competition ?? null,
      paidCompetitionIndex: item?.competitionIndex ?? null,
      paidCompetitionLevel: item?.competitionLevel ?? null,
      paidCompetitionBasis: "google_ads_paid_serp",
      bidLow: item?.bidLow ?? null,
      bidHigh: item?.bidHigh ?? null,
      diagnostics,
    });
  });

  const opportunity = scoreKeywordOpportunityCohort(projections);
  const returnedCount = parsed.length;
  const volumeAvailable = projections.filter((value) => value.searchVolume.avgMonthly != null).length;
  const difficultyAvailable = projections.filter((value) => value.organicDifficulty.score != null).length;
  const cpcAvailable = projections.filter((value) => value.paid.cpc.amount != null).length;
  const competitionAvailable = projections.filter((value) => value.paid.competition.ratio != null).length;
  const zeroVolumeCount = projections.filter((value) => value.searchVolume.avgMonthly === 0).length;
  const scored = opportunity.scores.filter((value) => value.score != null);
  const omittedCount = input.contract.keywords.length - returnedCount;

  if (returnedCount === 0) {
    return {
      version: P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION,
      providerStatusCode,
      providerTaskStatusCode,
      projections,
      opportunity,
      adapterResult: {
        ...task68Base(input.contract, input.request, observedAt),
        status: "empty",
        metrics: [],
        diagnostics: ["provider_keywords_omitted"],
        errorCode: null,
        completeness: 1,
      },
      safety: dataForSeoKeywordAdapterCapability(),
    };
  }

  const metrics = [
    metric("keyword.requested_count", input.contract.keywords.length, "count"),
    metric("keyword.returned_count", returnedCount, "count"),
    metric("keyword.volume_available_count", volumeAvailable, "count"),
    metric("keyword.difficulty_available_count", difficultyAvailable, "count"),
    metric("keyword.cpc_available_count", cpcAvailable, "count"),
    metric("keyword.competition_available_count", competitionAvailable, "count"),
    metric("keyword.zero_volume_count", zeroVolumeCount, "count"),
    metric("keyword.metric_opportunity.cohort_size", opportunity.eligibleCount, "count"),
    metric("keyword.metric_opportunity.scored_count", scored.length, "count"),
  ];
  if (scored.length > 0) {
    metrics.push(
      metric(
        "keyword.metric_opportunity.avg_score",
        Number((scored.reduce((sum, value) => sum + value.score!, 0) / scored.length).toFixed(6)),
        "score",
      ),
    );
  }

  const partial = omittedCount > 0;
  return {
    version: P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION,
    providerStatusCode,
    providerTaskStatusCode,
    projections,
    opportunity,
    adapterResult: {
      ...task68Base(input.contract, input.request, observedAt),
      status: partial ? "partial" : "success",
      metrics: metrics.sort((a, b) => a.key.localeCompare(b.key)),
      diagnostics: partial ? ["provider_keywords_omitted"] : [],
      errorCode: null,
      completeness: partial
        ? Number((returnedCount / input.contract.keywords.length).toFixed(6))
        : 1,
    },
    safety: dataForSeoKeywordAdapterCapability(),
  };
}

export function dataForSeoKeywordAdapterCapability() {
  return Object.freeze({
    version: P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION,
    providerKey: P5_3_DATAFORSEO_KEYWORD_PROVIDER_KEY,
    providerMethod: P5_3_DATAFORSEO_KEYWORD_METHOD,
    providerEndpointReferenceOnly: true,
    suppliedResultNormalizationOnly: true,
    liveEndpointExecutionAuthorized: false,
    providerEnrollmentAuthorized: false,
    providerPurchaseAuthorized: false,
    credentialCreationAuthorized: false,
    credentialUseAuthorized: false,
    networkRequestAuthorized: false,
    providerSdkAuthorized: false,
    clickstreamRequestAuthorized: false,
    serpExpansionRequestAuthorized: false,
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
    pollingAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    publicationAuthorized: false,
    automaticTransition: false,
  });
}
