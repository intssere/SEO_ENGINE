import { createHash } from "node:crypto";
import type { CategoryContext, MarketProfile } from "./market-category-intelligence.js";
import {
  buildP5_1ProviderSelectionReview,
  classifyP5_1ReviewFreshness,
  type ProviderSelectionReview,
} from "./external-search-provider-selection.js";
import type { SignalSourceDescriptor } from "./signal-source-registry.js";
import type { SourceAdapterRequest } from "./signal-observation-normalization.js";

export const P5_2_DATAFORSEO_SERP_ADAPTER_VERSION = "p5.2-dataforseo-serp-adapter-v1" as const;
export const P5_2_DATAFORSEO_SERP_SOURCE_KEY = "dataforseo-google-organic-serp" as const;
export const P5_2_DATAFORSEO_PROVIDER_KEY = "dataforseo" as const;
export const P5_2_DATAFORSEO_TASK_POST_PATH = "/v3/serp/google/organic/task_post" as const;
export const P5_2_DATAFORSEO_ADVANCED_RESULT_PATH_TEMPLATE =
  "/v3/serp/google/organic/task_get/advanced/{task_id}" as const;
export const P5_2_DATAFORSEO_MAX_DEPTH = 100 as const;
export const P5_2_DATAFORSEO_MAX_SUPPLIED_ITEMS = 250 as const;

export type DataForSeoSerpDevice = "desktop" | "mobile";

export type DataForSeoSerpQueryInput = {
  keyword: string;
  locationCode: number;
  languageCode: string;
  device: DataForSeoSerpDevice;
  depth: number;
  trackedDomain: string;
};

export type DataForSeoSerpTaskPayload = {
  keyword: string;
  location_code: number;
  language_code: string;
  device: DataForSeoSerpDevice;
  depth: number;
  priority: 1;
  tag: string;
};

export type DataForSeoSerpRequestContract = {
  version: typeof P5_2_DATAFORSEO_SERP_ADAPTER_VERSION;
  adapterRequestId: string;
  adapterRequestFingerprint: string;
  providerKey: typeof P5_2_DATAFORSEO_PROVIDER_KEY;
  sourceId: string;
  sourceFingerprint: string;
  task68RequestId: string;
  task68RequestFingerprint: string;
  p5_1ReviewFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  keyword: string;
  locationCode: number;
  languageCode: string;
  device: DataForSeoSerpDevice;
  depth: number;
  trackedDomain: string;
  billedPageUnitsUpperBound: number;
  submitEndpointPath: typeof P5_2_DATAFORSEO_TASK_POST_PATH;
  advancedResultEndpointPathTemplate: typeof P5_2_DATAFORSEO_ADVANCED_RESULT_PATH_TEMPLATE;
  payload: DataForSeoSerpTaskPayload;
  safety: ReturnType<typeof dataForSeoSerpAdapterCapability>;
};

export type SerpOrganicRankItem = {
  rankGroup: number;
  rankAbsolute: number;
  page: number;
  domain: string;
  url: string;
};

export type SerpRankingProjection = {
  version: typeof P5_2_DATAFORSEO_SERP_ADAPTER_VERSION;
  rankingId: string;
  rankingFingerprint: string;
  providerKey: typeof P5_2_DATAFORSEO_PROVIDER_KEY;
  adapterRequestFingerprint: string;
  task68RequestFingerprint: string;
  sourceFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  keyword: string;
  trackedDomain: string;
  observedAt: string;
  checkedDepth: number;
  searchEngineResultsCount: number;
  providerItemsCount: number;
  organicItems: SerpOrganicRankItem[];
  trackedMatches: SerpOrganicRankItem[];
  safety: ReturnType<typeof dataForSeoSerpAdapterCapability>;
};

export type Task68CompatibleAdapterResult = {
  requestFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceClass: "external";
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: "serp";
  observedAt: string;
  status: "success" | "empty" | "error";
  metrics: Array<{ key: string; value: number; unit: string | null }>;
  diagnostics: string[];
  errorCode: string | null;
  completeness: number;
};

export type DataForSeoSerpNormalization = {
  version: typeof P5_2_DATAFORSEO_SERP_ADAPTER_VERSION;
  providerStatusCode: number;
  providerTaskStatusCode: number | null;
  ranking: SerpRankingProjection | null;
  adapterResult: Task68CompatibleAdapterResult;
  safety: ReturnType<typeof dataForSeoSerpAdapterCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const SOURCE_ID = /^src-[0-9a-f]{24}$/;
const REQUEST_ID = /^sar-[0-9a-f]{24}$/;
const LANGUAGE_CODE = /^[a-z]{2,3}$/;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function plainObject(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`invalid_${name}`);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw new Error(`invalid_${name}`);
  return value as Record<string, unknown>;
}

function boundedInteger(value: unknown, min: number, max: number, name: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`invalid_${name}`);
  }
  return value as number;
}

function cleanText(value: unknown, name: string, max: number): string {
  if (typeof value !== "string") throw new Error(`invalid_${name}`);
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(`invalid_${name}`);
  }
  return normalized;
}

function canonicalTimestamp(value: unknown, name: string): string {
  const raw = cleanText(value, name, 64);
  const milliseconds = Date.parse(raw);
  if (!Number.isFinite(milliseconds)) throw new Error(`invalid_${name}`);
  return new Date(milliseconds).toISOString();
}

function normalizeKeyword(value: unknown): string {
  return cleanText(value, "keyword", 255);
}

function normalizeLanguageCode(value: unknown): string {
  const languageCode = cleanText(value, "language_code", 3).toLowerCase();
  if (!LANGUAGE_CODE.test(languageCode)) throw new Error("invalid_language_code");
  return languageCode;
}

function normalizeDomain(value: unknown, name = "domain"): string {
  const raw = cleanText(value, name, 253).toLowerCase().replace(/\.$/, "");
  let hostname: string;
  try {
    hostname = new URL(`https://${raw}`).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    throw new Error(`invalid_${name}`);
  }
  if (!hostname || hostname.length > 253 || !hostname.includes(".")) throw new Error(`invalid_${name}`);
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function normalizeHttpUrl(value: unknown): string {
  const raw = cleanText(value, "organic_url", 2048);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("invalid_organic_url");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("invalid_organic_url");
  parsed.hash = "";
  return parsed.toString();
}

function domainMatches(candidate: string, tracked: string): boolean {
  return candidate === tracked || candidate.endsWith(`.${tracked}`);
}

function validateP5_1Review(review: ProviderSelectionReview, now: string): void {
  const canonical = buildP5_1ProviderSelectionReview();
  if (
    review.version !== canonical.version
    || review.fingerprint !== canonical.fingerprint
    || review.reviewId !== canonical.reviewId
  ) {
    throw new Error("p5_1_review_lineage_mismatch");
  }
  if (classifyP5_1ReviewFreshness(review, now) !== "fresh") throw new Error("p5_1_review_stale");
  const selection = review.selections.find((value) => value.role === "dual_purpose_engineering");
  if (!selection || selection.providerKey !== P5_2_DATAFORSEO_PROVIDER_KEY) {
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
  if (source.key !== P5_2_DATAFORSEO_SERP_SOURCE_KEY) throw new Error("dataforseo_serp_source_key_required");
  if (source.sourceClass !== "external" || request.sourceClass !== "external") throw new Error("external_source_required");
  if (source.collectionMode !== "provider_api" || request.collectionMode !== "provider_api") {
    throw new Error("provider_api_collection_mode_required");
  }
  if (request.signalType !== "serp" || !source.signalTypes.includes("serp")) throw new Error("serp_signal_required");
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
}

function requestIdentity(contract: Omit<DataForSeoSerpRequestContract, "adapterRequestId" | "adapterRequestFingerprint" | "payload" | "safety">) {
  return {
    providerKey: contract.providerKey,
    sourceId: contract.sourceId,
    sourceFingerprint: contract.sourceFingerprint,
    task68RequestId: contract.task68RequestId,
    task68RequestFingerprint: contract.task68RequestFingerprint,
    p5_1ReviewFingerprint: contract.p5_1ReviewFingerprint,
    marketFingerprint: contract.marketFingerprint,
    categoryFingerprint: contract.categoryFingerprint,
    keyword: contract.keyword,
    locationCode: contract.locationCode,
    languageCode: contract.languageCode,
    device: contract.device,
    depth: contract.depth,
    trackedDomain: contract.trackedDomain,
    billedPageUnitsUpperBound: contract.billedPageUnitsUpperBound,
    submitEndpointPath: contract.submitEndpointPath,
    advancedResultEndpointPathTemplate: contract.advancedResultEndpointPathTemplate,
  };
}

function validateContract(contract: DataForSeoSerpRequestContract): void {
  if (contract.version !== P5_2_DATAFORSEO_SERP_ADAPTER_VERSION) throw new Error("unsupported_p5_2_adapter_version");
  if (contract.providerKey !== P5_2_DATAFORSEO_PROVIDER_KEY) throw new Error("invalid_provider_key");
  const identity = requestIdentity(contract);
  const fingerprint = hash({ version: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION, ...identity });
  if (fingerprint !== contract.adapterRequestFingerprint) throw new Error("adapter_request_fingerprint_mismatch");
  if (contract.adapterRequestId !== `p52-serp-${fingerprint.slice(0, 20)}`) throw new Error("adapter_request_id_mismatch");
  const expectedTag = `seo-p52-${fingerprint.slice(0, 32)}`;
  const expectedPayload: DataForSeoSerpTaskPayload = {
    keyword: contract.keyword,
    location_code: contract.locationCode,
    language_code: contract.languageCode,
    device: contract.device,
    depth: contract.depth,
    priority: 1,
    tag: expectedTag,
  };
  if (JSON.stringify(contract.payload) !== JSON.stringify(expectedPayload)) throw new Error("provider_payload_mismatch");
}

export function buildDataForSeoSerpRequestContract(input: {
  review: ProviderSelectionReview;
  source: SignalSourceDescriptor;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
  query: DataForSeoSerpQueryInput;
  now: string;
}): DataForSeoSerpRequestContract {
  const now = canonicalTimestamp(input.now, "now");
  validateP5_1Review(input.review, now);
  validateTask68Lineage(input);

  const keyword = normalizeKeyword(input.query.keyword);
  const locationCode = boundedInteger(input.query.locationCode, 1, 2_147_483_647, "location_code");
  const languageCode = normalizeLanguageCode(input.query.languageCode);
  const marketLanguage = input.market.language.split("-")[0]!.toLowerCase();
  if (languageCode !== marketLanguage) throw new Error("language_code_market_mismatch");

  const device = input.query.device;
  if (device !== "desktop" && device !== "mobile") throw new Error("unsupported_device");
  if (input.market.device === "tablet") throw new Error("tablet_market_not_supported");
  if (input.market.device !== "all" && input.market.device !== device) throw new Error("device_market_mismatch");

  const depth = boundedInteger(input.query.depth, 10, P5_2_DATAFORSEO_MAX_DEPTH, "depth");
  if (depth % 10 !== 0) throw new Error("depth_must_use_ten_result_increments");
  const trackedDomain = normalizeDomain(input.query.trackedDomain, "tracked_domain");

  const base = {
    version: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
    providerKey: P5_2_DATAFORSEO_PROVIDER_KEY,
    sourceId: input.source.sourceId,
    sourceFingerprint: input.source.fingerprint,
    task68RequestId: input.request.requestId,
    task68RequestFingerprint: input.request.requestFingerprint,
    p5_1ReviewFingerprint: input.review.fingerprint,
    marketFingerprint: input.market.fingerprint,
    categoryFingerprint: input.category.fingerprint,
    keyword,
    locationCode,
    languageCode,
    device,
    depth,
    trackedDomain,
    billedPageUnitsUpperBound: depth / 10,
    submitEndpointPath: P5_2_DATAFORSEO_TASK_POST_PATH,
    advancedResultEndpointPathTemplate: P5_2_DATAFORSEO_ADVANCED_RESULT_PATH_TEMPLATE,
  } as const;

  const identity = requestIdentity(base);
  const adapterRequestFingerprint = hash({
    version: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
    ...identity,
  });
  const adapterRequestId = `p52-serp-${adapterRequestFingerprint.slice(0, 20)}`;
  const payload: DataForSeoSerpTaskPayload = {
    keyword,
    location_code: locationCode,
    language_code: languageCode,
    device,
    depth,
    priority: 1,
    tag: `seo-p52-${adapterRequestFingerprint.slice(0, 32)}`,
  };

  return {
    ...base,
    adapterRequestId,
    adapterRequestFingerprint,
    payload,
    safety: dataForSeoSerpAdapterCapability(),
  };
}

function task68Base(
  contract: DataForSeoSerpRequestContract,
  request: SourceAdapterRequest,
  observedAt: string,
): Pick<
  Task68CompatibleAdapterResult,
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
  if (request.sourceClass !== "external" || request.signalType !== "serp") throw new Error("task68_serp_external_required");
  return {
    requestFingerprint: request.requestFingerprint,
    sourceId: request.sourceId,
    sourceFingerprint: request.sourceFingerprint,
    sourceClass: "external",
    marketFingerprint: request.marketFingerprint,
    categoryFingerprint: request.categoryFingerprint,
    signalType: "serp",
    observedAt,
  };
}

function errorNormalization(
  contract: DataForSeoSerpRequestContract,
  request: SourceAdapterRequest,
  observedAt: string,
  providerStatusCode: number,
  providerTaskStatusCode: number | null,
  errorCode: string,
): DataForSeoSerpNormalization {
  return {
    version: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
    providerStatusCode,
    providerTaskStatusCode,
    ranking: null,
    adapterResult: {
      ...task68Base(contract, request, observedAt),
      status: "error",
      metrics: [],
      diagnostics: [],
      errorCode,
      completeness: 0,
    },
    safety: dataForSeoSerpAdapterCapability(),
  };
}

function normalizeOrganicItem(value: unknown): SerpOrganicRankItem | null {
  const record = plainObject(value, "provider_item");
  if (record.type !== "organic") return null;

  const rankGroup = boundedInteger(record.rank_group, 1, 10_000, "rank_group");
  const rankAbsolute = boundedInteger(record.rank_absolute, 1, 10_000, "rank_absolute");
  const page = boundedInteger(record.page, 1, 1_000, "rank_page");
  const domain = normalizeDomain(record.domain, "organic_domain");
  const url = normalizeHttpUrl(record.url);
  const urlDomain = normalizeDomain(new URL(url).hostname, "organic_url_domain");
  if (!domainMatches(urlDomain, domain) && !domainMatches(domain, urlDomain)) {
    throw new Error("organic_domain_url_mismatch");
  }
  return { rankGroup, rankAbsolute, page, domain, url };
}

function metric(key: string, value: number, unit: string | null) {
  return { key, value, unit };
}

export function normalizeSuppliedDataForSeoSerpResult(input: {
  contract: DataForSeoSerpRequestContract;
  request: SourceAdapterRequest;
  provided: unknown;
  observedAt: string;
}): DataForSeoSerpNormalization {
  validateContract(input.contract);
  const observedAt = canonicalTimestamp(input.observedAt, "observed_at");
  task68Base(input.contract, input.request, observedAt);

  const envelope = plainObject(input.provided, "dataforseo_response");
  const providerStatusCode = boundedInteger(envelope.status_code, 0, 99_999, "provider_status_code");
  if (providerStatusCode !== 20_000) {
    return errorNormalization(
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
    return errorNormalization(
      input.contract,
      input.request,
      observedAt,
      providerStatusCode,
      null,
      "dataforseo_tasks_error",
    );
  }

  if (!Array.isArray(envelope.tasks) || envelope.tasks.length !== 1) throw new Error("exactly_one_provider_task_required");
  const task = plainObject(envelope.tasks[0], "dataforseo_task");
  const providerTaskStatusCode = boundedInteger(task.status_code, 0, 99_999, "provider_task_status_code");

  if (providerTaskStatusCode === 20_100) {
    return errorNormalization(
      input.contract,
      input.request,
      observedAt,
      providerStatusCode,
      providerTaskStatusCode,
      "dataforseo_task_not_ready",
    );
  }
  if (providerTaskStatusCode !== 20_000) {
    return errorNormalization(
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

  if (normalizeKeyword(result.keyword) !== input.contract.keyword) throw new Error("provider_keyword_mismatch");
  if (boundedInteger(result.location_code, 1, 2_147_483_647, "result_location_code") !== input.contract.locationCode) {
    throw new Error("provider_location_mismatch");
  }
  if (normalizeLanguageCode(result.language_code) !== input.contract.languageCode) throw new Error("provider_language_mismatch");
  if (result.device !== input.contract.device) throw new Error("provider_device_mismatch");

  const searchEngineResultsCount = boundedInteger(result.se_results_count ?? 0, 0, 10_000_000_000, "se_results_count");
  const providerItemsCount = boundedInteger(result.items_count ?? 0, 0, P5_2_DATAFORSEO_MAX_SUPPLIED_ITEMS, "items_count");
  const suppliedItems = result.items ?? [];
  if (!Array.isArray(suppliedItems) || suppliedItems.length > P5_2_DATAFORSEO_MAX_SUPPLIED_ITEMS) {
    throw new Error("provider_items_bound_exceeded");
  }
  if (providerItemsCount !== suppliedItems.length) throw new Error("provider_items_count_mismatch");

  if (suppliedItems.length === 0) {
    return {
      version: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
      providerStatusCode,
      providerTaskStatusCode,
      ranking: null,
      adapterResult: {
        ...task68Base(input.contract, input.request, observedAt),
        status: "empty",
        metrics: [],
        diagnostics: [],
        errorCode: null,
        completeness: 1,
      },
      safety: dataForSeoSerpAdapterCapability(),
    };
  }

  const byAbsoluteRank = new Map<number, SerpOrganicRankItem>();
  for (const supplied of suppliedItems) {
    const organic = normalizeOrganicItem(supplied);
    if (!organic) continue;
    if (organic.rankAbsolute > input.contract.depth) throw new Error("organic_rank_exceeds_requested_depth");
    const existing = byAbsoluteRank.get(organic.rankAbsolute);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(organic)) throw new Error("conflicting_organic_absolute_rank");
      continue;
    }
    byAbsoluteRank.set(organic.rankAbsolute, organic);
  }

  const organicItems = [...byAbsoluteRank.values()].sort(
    (a, b) => a.rankAbsolute - b.rankAbsolute || a.url.localeCompare(b.url),
  );
  const trackedMatches = organicItems.filter((item) => domainMatches(item.domain, input.contract.trackedDomain));
  const rankingIdentity = {
    providerKey: P5_2_DATAFORSEO_PROVIDER_KEY,
    adapterRequestFingerprint: input.contract.adapterRequestFingerprint,
    task68RequestFingerprint: input.request.requestFingerprint,
    sourceFingerprint: input.request.sourceFingerprint,
    marketFingerprint: input.request.marketFingerprint,
    categoryFingerprint: input.request.categoryFingerprint,
    keyword: input.contract.keyword,
    trackedDomain: input.contract.trackedDomain,
    observedAt,
    checkedDepth: input.contract.depth,
    searchEngineResultsCount,
    providerItemsCount,
    organicItems,
    trackedMatches,
  };
  const rankingFingerprint = hash({
    version: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
    ...rankingIdentity,
  });
  const ranking: SerpRankingProjection = {
    version: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
    rankingId: `p52-rank-${rankingFingerprint.slice(0, 20)}`,
    rankingFingerprint,
    ...rankingIdentity,
    safety: dataForSeoSerpAdapterCapability(),
  };

  const metrics = [
    metric("serp.se_results_count", searchEngineResultsCount, "count"),
    metric("serp.provider_items_count", providerItemsCount, "count"),
    metric("serp.organic_items_count", organicItems.length, "count"),
    metric("ranking.checked_depth", input.contract.depth, "rank"),
    metric("ranking.matched_organic_count", trackedMatches.length, "count"),
    metric("ranking.found", trackedMatches.length > 0 ? 1 : 0, "bool"),
    metric("ranking.top10_matches", trackedMatches.filter((item) => item.rankAbsolute <= 10).length, "count"),
    metric("ranking.top20_matches", trackedMatches.filter((item) => item.rankAbsolute <= 20).length, "count"),
  ];
  if (trackedMatches.length > 0) {
    metrics.push(
      metric("ranking.best_absolute_rank", Math.min(...trackedMatches.map((item) => item.rankAbsolute)), "rank"),
      metric("ranking.best_group_rank", Math.min(...trackedMatches.map((item) => item.rankGroup)), "rank"),
      metric("ranking.best_page", Math.min(...trackedMatches.map((item) => item.page)), "page"),
    );
  }

  return {
    version: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
    providerStatusCode,
    providerTaskStatusCode,
    ranking,
    adapterResult: {
      ...task68Base(input.contract, input.request, observedAt),
      status: "success",
      metrics: metrics.sort((a, b) => a.key.localeCompare(b.key)),
      diagnostics: trackedMatches.length === 0 ? ["tracked_domain_not_found"] : [],
      errorCode: null,
      completeness: 1,
    },
    safety: dataForSeoSerpAdapterCapability(),
  };
}

export function dataForSeoSerpAdapterCapability() {
  return Object.freeze({
    version: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
    providerKey: P5_2_DATAFORSEO_PROVIDER_KEY,
    requestContractOnly: true,
    suppliedResultNormalizationOnly: true,
    providerEnrollmentAuthorized: false,
    providerPurchaseAuthorized: false,
    credentialCreationAuthorized: false,
    credentialUseAuthorized: false,
    liveTransportConfigured: false,
    networkRequestAuthorized: false,
    liveEndpointAuthorized: false,
    highPriorityAuthorized: false,
    callbackAuthorized: false,
    pingbackAuthorized: false,
    postbackAuthorized: false,
    pollingAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    task69LiveAuthorizationAuthorized: false,
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
