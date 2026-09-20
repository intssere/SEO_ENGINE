import { createHash } from "node:crypto";
import {
  normalizeCategoryContext,
  normalizeMarketProfile,
  type CategoryContext,
  type MarketProfile,
  type SignalType,
} from "./market-category-intelligence.js";
import {
  SIGNAL_SOURCE_REGISTRY_VERSION,
  classifyFreshness,
  normalizeSignalSourceDescriptor,
  signalSourceRegistryCapability,
  type FreshnessState,
  type RefreshPlan,
  type RefreshPlanItem,
  type SignalSourceDescriptor,
} from "./signal-source-registry.js";
import {
  buildSourceAdapterRequest,
  signalObservationNormalizationCapability,
  type SourceAdapterRequest,
} from "./signal-observation-normalization.js";
import {
  READ_SCHEDULER_QUEUE_VERSION,
  evaluateReadSchedule,
  normalizeReadScheduleDefinition,
  readSchedulerQueueCapability,
  type ReadScheduleDefinition,
  type ReadScheduleEvaluation,
} from "./read-scheduler-queue.js";
import {
  P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
  P5_2_DATAFORSEO_PROVIDER_KEY,
  P5_2_DATAFORSEO_SERP_SOURCE_KEY,
  dataForSeoSerpAdapterCapability,
} from "./dataforseo-serp-adapter.js";
import {
  P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION,
  P5_3_DATAFORSEO_KEYWORD_PROVIDER_KEY,
  P5_3_DATAFORSEO_KEYWORD_SOURCE_KEY,
  dataForSeoKeywordAdapterCapability,
} from "./dataforseo-keyword-adapter.js";
import {
  P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION,
  P5_4_DATAFORSEO_TRENDS_PROVIDER_KEY,
  P5_4_DATAFORSEO_TRENDS_SOURCE_KEY,
  dataForSeoGoogleTrendsAdapterCapability,
} from "./dataforseo-google-trends-adapter.js";
import {
  P5_5_SUPPLIED_BACKLINK_ADAPTER_VERSION,
  P5_5_SUPPLIED_BACKLINK_SOURCE_KEY,
  suppliedBacklinkAdapterCapability,
} from "./backlink-supplied-adapter.js";
import {
  buildP5_1ProviderSelectionReview,
  classifyP5_1ReviewFreshness,
} from "./external-search-provider-selection.js";
import {
  buildSourceTelemetryReport,
  sourceTelemetryCapability,
  type RateLimitState,
  type SourceRateLimitSnapshotInput,
  type SourceTelemetryEventInput,
  type SourceTelemetryStreamReport,
} from "./source-telemetry.js";

export const EXTERNAL_INTELLIGENCE_REFRESH_VERSION =
  "p9-4-bounded-external-intelligence-refresh-v1" as const;

export type ExternalIntelligenceAdapterKind =
  | "dataforseo_serp"
  | "dataforseo_keyword"
  | "dataforseo_trend"
  | "supplied_backlink_fixture";

export type ExternalIntelligenceReviewDisposition =
  | "supplied_review_ready"
  | "supplied_review_caution"
  | "deferred_review";

export type ExternalIntelligenceReviewBlocker =
  | "provider_review_stale"
  | "rate_limit_unavailable"
  | "rate_limit_snapshot_stale"
  | "rate_limit_snapshot_critical"
  | "rate_limit_constrained"
  | "rate_limit_exhausted";

export type ExternalIntelligenceTelemetryInput = {
  referenceTime: string;
  events?: SourceTelemetryEventInput[];
  rateLimitSnapshots?: SourceRateLimitSnapshotInput[];
};

export type ExternalIntelligenceRefreshCandidate = {
  version: typeof EXTERNAL_INTELLIGENCE_REFRESH_VERSION;
  candidateId: string;
  candidateFingerprint: string;
  lifecycle: "proposed_review";
  adapterKind: ExternalIntelligenceAdapterKind;
  adapterVersion: string;
  adapterCapabilityFingerprint: string;
  providerKey: "dataforseo" | null;
  suppliedResultFoundationStatus: "available";
  liveRuntimeStatus: "unavailable";
  liveRuntimeBlockers: string[];
  reviewDisposition: ExternalIntelligenceReviewDisposition;
  reviewBlockers: ExternalIntelligenceReviewBlocker[];
  reviewDiagnostics: string[];
  scheduleId: string;
  scheduleFingerprint: string;
  intentId: string;
  intentFingerprint: string;
  slotAt: string;
  expiresAt: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceKey: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: SignalType;
  planId: string;
  planFingerprint: string;
  requestId: string;
  requestFingerprint: string;
  telemetry: {
    reportFingerprint: string;
    streamFingerprint: string;
    referenceTime: string;
    providerReviewStateAtEvaluation: "fresh" | "stale" | "not_applicable";
    quality: {
      eventCount: number;
      successRate: number | null;
      usableRate: number | null;
      errorRate: number | null;
      meanCompleteness: number | null;
      meanConfidence: number | null;
    };
    cost: {
      coverageRatio: number | null;
      totalAmount: number | null;
      currency: string | null;
      totalBillingUnits: number | null;
      billingUnit: string | null;
      costPerUsableObservation: number | null;
    };
    rateLimit: {
      state: RateLimitState | "not_applicable";
      capturedAt: string | null;
      freshness: FreshnessState | "unavailable" | "not_applicable";
      latestSnapshotFingerprint: string | null;
    };
  };
  safety: ReturnType<typeof externalIntelligenceRefreshCapability>;
};

type AdapterClassification = {
  adapterKind: ExternalIntelligenceAdapterKind;
  adapterVersion: string;
  adapterCapabilityFingerprint: string;
  providerKey: "dataforseo" | null;
  collectionMode: "provider_api" | "manual_import";
};

const HEX_64 = /^[0-9a-f]{64}$/;
const PLAN_ID = /^srp-[0-9a-f]{24}$/;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key])).join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function taskHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function canonicalTimestamp(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 64) {
    throw new Error("invalid_" + name);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error("invalid_" + name);
  return new Date(milliseconds).toISOString();
}

function exactSafety(actual: unknown, expected: unknown, name: string): void {
  if (stableJson(actual) !== stableJson(expected)) throw new Error(name + "_mismatch");
}

function validateMarket(market: MarketProfile): MarketProfile {
  const rebuilt = normalizeMarketProfile({
    countryCode: market.countryCode,
    language: market.language,
    searchEngine: market.searchEngine,
    searchLocale: market.searchLocale,
    currency: market.currency,
    device: market.device,
  });
  if (stableJson(rebuilt) !== stableJson(market)) throw new Error("market_identity_mismatch");
  return rebuilt;
}

function validateCategory(category: CategoryContext): CategoryContext {
  const rebuilt = normalizeCategoryContext({
    key: category.key,
    name: category.name,
    taxonomyPath: category.taxonomyPath,
  });
  if (stableJson(rebuilt) !== stableJson(category)) throw new Error("category_identity_mismatch");
  return rebuilt;
}

function validateSource(source: SignalSourceDescriptor): SignalSourceDescriptor {
  if (source.version !== SIGNAL_SOURCE_REGISTRY_VERSION) {
    throw new Error("unsupported_source_version");
  }
  const rebuilt = normalizeSignalSourceDescriptor({
    key: source.key,
    name: source.name,
    sourceClass: source.sourceClass,
    signalTypes: source.signalTypes,
    marketFingerprints: source.marketFingerprints,
    categoryFingerprints: source.categoryFingerprints,
    allowAnyMarket: source.allowAnyMarket,
    allowAnyCategory: source.allowAnyCategory,
    trustClass: source.trustClass,
    quality: source.quality,
    provenanceComplete: source.provenanceComplete,
    freshness: source.freshness,
    collectionMode: source.collectionMode,
    manuallyReviewed: source.manuallyReviewed,
  });
  if (stableJson(rebuilt) !== stableJson(source)) throw new Error("source_identity_mismatch");
  if (source.sourceClass !== "external") throw new Error("external_source_required");
  if (
    source.trustClass !== "reviewed_external"
    || !source.provenanceComplete
    || !source.manuallyReviewed
  ) {
    throw new Error("reviewed_external_source_contract_required");
  }
  return rebuilt;
}

function planFingerprintIdentity(plan: RefreshPlan) {
  return {
    generatedAt: plan.generatedAt,
    marketFingerprint: plan.marketFingerprint,
    categoryFingerprint: plan.categoryFingerprint,
    requestedSignalTypes: plan.requestedSignalTypes,
    budget: plan.budget,
    selected: plan.selected.map((value) => ({
      sourceFingerprint: value.sourceFingerprint,
      signalType: value.signalType,
      freshnessState: value.freshnessState,
      ageMinutes: value.ageMinutes,
      urgency: value.urgency,
      quality: value.quality,
    })),
    deferred: plan.deferred.map((value) => ({
      sourceFingerprint: value.sourceFingerprint,
      signalType: value.signalType,
      freshnessState: value.freshnessState,
      ageMinutes: value.ageMinutes,
      urgency: value.urgency,
      quality: value.quality,
    })),
    blockers: plan.blockers,
  };
}

function validatePlan(plan: RefreshPlan): RefreshPlan {
  if (plan.version !== SIGNAL_SOURCE_REGISTRY_VERSION) {
    throw new Error("unsupported_refresh_plan_version");
  }
  if (!PLAN_ID.test(plan.planId) || !HEX_64.test(plan.planFingerprint)) {
    throw new Error("invalid_refresh_plan_identity");
  }
  const expectedFingerprint = taskHash({
    version: SIGNAL_SOURCE_REGISTRY_VERSION,
    ...planFingerprintIdentity(plan),
  });
  const expectedId = "srp-" + expectedFingerprint.slice(0, 24);
  if (plan.planFingerprint !== expectedFingerprint || plan.planId !== expectedId) {
    throw new Error("refresh_plan_identity_mismatch");
  }
  exactSafety(plan.safety, signalSourceRegistryCapability(), "refresh_plan_safety");
  return plan;
}

function selectedItemFor(
  source: SignalSourceDescriptor,
  plan: RefreshPlan,
  request: SourceAdapterRequest,
): RefreshPlanItem {
  const matches = plan.selected.filter((item) =>
    item.sourceId === source.sourceId
    && item.sourceFingerprint === source.fingerprint
    && item.sourceClass === "external"
    && item.signalType === request.signalType,
  );
  if (matches.length !== 1) throw new Error("selected_refresh_item_mismatch");
  return matches[0]!;
}

function validateLineage(input: {
  source: SignalSourceDescriptor;
  plan: RefreshPlan;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
}) {
  const market = validateMarket(input.market);
  const category = validateCategory(input.category);
  const source = validateSource(input.source);
  const plan = validatePlan(input.plan);

  if (plan.marketFingerprint !== market.fingerprint) throw new Error("plan_market_mismatch");
  if (plan.categoryFingerprint !== category.fingerprint) throw new Error("plan_category_mismatch");

  const item = selectedItemFor(source, plan, input.request);
  const rebuiltRequest = buildSourceAdapterRequest({
    source,
    planItem: item,
    market,
    category,
    planId: plan.planId,
    planFingerprint: plan.planFingerprint,
  });
  if (stableJson(rebuiltRequest) !== stableJson(input.request)) {
    throw new Error("adapter_request_identity_mismatch");
  }
  exactSafety(
    input.request.safety,
    signalObservationNormalizationCapability(),
    "adapter_request_safety",
  );
  if (!plan.requestedSignalTypes.includes(input.request.signalType)) {
    throw new Error("request_signal_not_requested");
  }

  return { market, category, source, plan, request: rebuiltRequest, item };
}

function exactSignalContract(
  source: SignalSourceDescriptor,
  signalType: SignalType,
  collectionMode: "provider_api" | "manual_import",
): void {
  if (
    source.signalTypes.length !== 1
    || source.signalTypes[0] !== signalType
    || source.collectionMode !== collectionMode
  ) {
    throw new Error("external_adapter_source_contract_mismatch");
  }
}

function classifyAdapter(
  source: SignalSourceDescriptor,
  signalType: SignalType,
): AdapterClassification {
  if (source.key === P5_2_DATAFORSEO_SERP_SOURCE_KEY && signalType === "serp") {
    exactSignalContract(source, "serp", "provider_api");
    const capability = dataForSeoSerpAdapterCapability();
    return {
      adapterKind: "dataforseo_serp",
      adapterVersion: P5_2_DATAFORSEO_SERP_ADAPTER_VERSION,
      adapterCapabilityFingerprint: stableHash(capability),
      providerKey: P5_2_DATAFORSEO_PROVIDER_KEY,
      collectionMode: "provider_api",
    };
  }
  if (source.key === P5_3_DATAFORSEO_KEYWORD_SOURCE_KEY && signalType === "keyword") {
    exactSignalContract(source, "keyword", "provider_api");
    const capability = dataForSeoKeywordAdapterCapability();
    return {
      adapterKind: "dataforseo_keyword",
      adapterVersion: P5_3_DATAFORSEO_KEYWORD_ADAPTER_VERSION,
      adapterCapabilityFingerprint: stableHash(capability),
      providerKey: P5_3_DATAFORSEO_KEYWORD_PROVIDER_KEY,
      collectionMode: "provider_api",
    };
  }
  if (source.key === P5_4_DATAFORSEO_TRENDS_SOURCE_KEY && signalType === "trend") {
    exactSignalContract(source, "trend", "provider_api");
    const capability = dataForSeoGoogleTrendsAdapterCapability();
    return {
      adapterKind: "dataforseo_trend",
      adapterVersion: P5_4_DATAFORSEO_TRENDS_ADAPTER_VERSION,
      adapterCapabilityFingerprint: stableHash(capability),
      providerKey: P5_4_DATAFORSEO_TRENDS_PROVIDER_KEY,
      collectionMode: "provider_api",
    };
  }
  if (source.key === P5_5_SUPPLIED_BACKLINK_SOURCE_KEY && signalType === "backlink") {
    exactSignalContract(source, "backlink", "manual_import");
    const capability = suppliedBacklinkAdapterCapability();
    return {
      adapterKind: "supplied_backlink_fixture",
      adapterVersion: P5_5_SUPPLIED_BACKLINK_ADAPTER_VERSION,
      adapterCapabilityFingerprint: stableHash(capability),
      providerKey: null,
      collectionMode: "manual_import",
    };
  }
  throw new Error("unsupported_external_intelligence_adapter");
}

function lineageFingerprints(input: {
  source: SignalSourceDescriptor;
  plan: RefreshPlan;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
  adapter: AdapterClassification;
}) {
  const scopeFingerprint = stableHash({
    version: EXTERNAL_INTELLIGENCE_REFRESH_VERSION,
    purpose: "external_intelligence_refresh_scope",
    sourceId: input.source.sourceId,
    sourceFingerprint: input.source.fingerprint,
    sourceKey: input.source.key,
    marketFingerprint: input.market.fingerprint,
    categoryFingerprint: input.category.fingerprint,
    signalType: input.request.signalType,
  });
  const upstreamLineageFingerprint = stableHash({
    version: EXTERNAL_INTELLIGENCE_REFRESH_VERSION,
    purpose: "external_intelligence_refresh_upstream_lineage",
    planId: input.plan.planId,
    planFingerprint: input.plan.planFingerprint,
    requestId: input.request.requestId,
    requestFingerprint: input.request.requestFingerprint,
    adapterKind: input.adapter.adapterKind,
    adapterVersion: input.adapter.adapterVersion,
    adapterCapabilityFingerprint: input.adapter.adapterCapabilityFingerprint,
  });
  return { scopeFingerprint, upstreamLineageFingerprint };
}

export function buildExternalIntelligenceRefreshSchedule(input: {
  key: string;
  source: SignalSourceDescriptor;
  plan: RefreshPlan;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
  startAt: string;
  cadenceMinutes: number;
  dueWindowMinutes: number;
  paused?: boolean;
}): ReadScheduleDefinition {
  const lineage = validateLineage(input);
  const adapter = classifyAdapter(lineage.source, lineage.request.signalType);
  const fingerprints = lineageFingerprints({ ...lineage, adapter });

  return normalizeReadScheduleDefinition({
    key: input.key,
    workClass: "signal_refresh",
    scopeFingerprint: fingerprints.scopeFingerprint,
    upstreamLineageFingerprint: fingerprints.upstreamLineageFingerprint,
    startAt: input.startAt,
    cadenceMinutes: input.cadenceMinutes,
    dueWindowMinutes: input.dueWindowMinutes,
    paused: input.paused,
  });
}

function exactBoundSchedule(input: {
  schedule: ReadScheduleDefinition;
  source: SignalSourceDescriptor;
  plan: RefreshPlan;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
}) {
  const expected = buildExternalIntelligenceRefreshSchedule({
    key: input.schedule.key,
    source: input.source,
    plan: input.plan,
    request: input.request,
    market: input.market,
    category: input.category,
    startAt: input.schedule.startAt,
    cadenceMinutes: input.schedule.cadenceMinutes,
    dueWindowMinutes: input.schedule.dueWindowMinutes,
    paused: input.schedule.paused,
  });
  if (stableJson(expected) !== stableJson(input.schedule)) {
    throw new Error("external_refresh_schedule_lineage_mismatch");
  }
  exactSafety(input.schedule.safety, readSchedulerQueueCapability(), "read_schedule_safety");
  return expected;
}

function buildTelemetry(input: {
  source: SignalSourceDescriptor;
  signalType: SignalType;
  adapter: AdapterClassification;
  telemetry: ExternalIntelligenceTelemetryInput;
}) {
  const report = buildSourceTelemetryReport({
    sources: [input.source],
    bindings: [{
      sourceFingerprint: input.source.fingerprint,
      signalType: input.signalType,
      providerKey: input.adapter.providerKey,
    }],
    events: input.telemetry.events ?? [],
    rateLimitSnapshots: input.telemetry.rateLimitSnapshots ?? [],
    referenceTime: input.telemetry.referenceTime,
  });
  exactSafety(report.safety, sourceTelemetryCapability(), "source_telemetry_safety");
  if (report.streamCount !== 1 || report.streams.length !== 1) {
    throw new Error("external_refresh_exactly_one_telemetry_stream_required");
  }
  const stream = report.streams[0]!;
  if (
    stream.sourceId !== input.source.sourceId
    || stream.sourceFingerprint !== input.source.fingerprint
    || stream.sourceKey !== input.source.key
    || stream.signalType !== input.signalType
  ) {
    throw new Error("external_refresh_telemetry_stream_lineage_mismatch");
  }
  if (input.adapter.providerKey === null) {
    if (stream.provider !== null) throw new Error("manual_import_provider_metadata_mismatch");
  } else if (
    stream.provider?.providerKey !== input.adapter.providerKey
    || stream.provider.reviewFingerprint !== report.providerReviewFingerprint
  ) {
    throw new Error("external_refresh_provider_telemetry_mismatch");
  }
  return { report, stream };
}

function rateLimitFreshness(
  source: SignalSourceDescriptor,
  stream: SourceTelemetryStreamReport,
  now: string,
  providerKey: "dataforseo" | null,
): FreshnessState | "unavailable" | "not_applicable" {
  if (providerKey === null) return "not_applicable";
  if (stream.rateLimit.capturedAt === null) return "unavailable";
  return classifyFreshness(source.freshness, stream.rateLimit.capturedAt, now).state;
}

function reviewDecision(input: {
  source: SignalSourceDescriptor;
  adapter: AdapterClassification;
  stream: SourceTelemetryStreamReport;
  now: string;
}) {
  const reviewBlockers: ExternalIntelligenceReviewBlocker[] = [];
  const reviewDiagnostics = new Set<string>(input.stream.diagnostics);
  let providerReviewStateAtEvaluation: "fresh" | "stale" | "not_applicable" =
    "not_applicable";
  const freshness = rateLimitFreshness(
    input.source,
    input.stream,
    input.now,
    input.adapter.providerKey,
  );

  if (input.adapter.providerKey !== null) {
    const review = buildP5_1ProviderSelectionReview();
    providerReviewStateAtEvaluation = classifyP5_1ReviewFreshness(review, input.now);
    if (providerReviewStateAtEvaluation === "stale") {
      reviewBlockers.push("provider_review_stale");
    }

    if (input.stream.rateLimit.state === "unavailable" || freshness === "unavailable") {
      reviewBlockers.push("rate_limit_unavailable");
    } else if (freshness === "stale") {
      reviewBlockers.push("rate_limit_snapshot_stale");
    } else if (freshness === "critical") {
      reviewBlockers.push("rate_limit_snapshot_critical");
    }

    if (input.stream.rateLimit.state === "constrained") {
      reviewBlockers.push("rate_limit_constrained");
    } else if (input.stream.rateLimit.state === "exhausted") {
      reviewBlockers.push("rate_limit_exhausted");
    } else if (input.stream.rateLimit.state === "elevated") {
      reviewDiagnostics.add("rate_limit_elevated");
    }
  } else {
    reviewDiagnostics.add("manual_import_no_live_provider_rate_limit");
  }

  const blockers = [...new Set(reviewBlockers)].sort();
  const diagnostics = [...reviewDiagnostics].sort();
  const reviewDisposition: ExternalIntelligenceReviewDisposition =
    blockers.length > 0
      ? "deferred_review"
      : diagnostics.includes("rate_limit_elevated")
        ? "supplied_review_caution"
        : "supplied_review_ready";

  return {
    reviewDisposition,
    reviewBlockers: blockers,
    reviewDiagnostics: diagnostics,
    providerReviewStateAtEvaluation,
    rateLimitFreshness: freshness,
  };
}

function liveRuntimeBlockers(adapter: AdapterClassification): string[] {
  if (adapter.collectionMode === "manual_import") {
    return [
      "manual_import_only",
      "live_provider_transport_not_authorized",
      "task70_execution_not_authorized",
    ];
  }
  return [
    "provider_enrollment_not_authorized",
    "credential_use_not_authorized",
    "live_network_not_authorized",
    "task70_compatible_external_runner_unavailable",
  ];
}

function telemetryProjection(input: {
  reportFingerprint: string;
  stream: SourceTelemetryStreamReport;
  providerReviewStateAtEvaluation: "fresh" | "stale" | "not_applicable";
  rateLimitFreshness: FreshnessState | "unavailable" | "not_applicable";
}) {
  return {
    reportFingerprint: input.reportFingerprint,
    streamFingerprint: input.stream.streamFingerprint,
    referenceTime: "",
    providerReviewStateAtEvaluation: input.providerReviewStateAtEvaluation,
    quality: {
      eventCount: input.stream.quality.eventCount,
      successRate: input.stream.quality.successRate,
      usableRate: input.stream.quality.usableRate,
      errorRate: input.stream.quality.errorRate,
      meanCompleteness: input.stream.quality.meanCompleteness,
      meanConfidence: input.stream.quality.meanConfidence,
    },
    cost: {
      coverageRatio: input.stream.cost.coverageRatio,
      totalAmount: input.stream.cost.totalAmount,
      currency: input.stream.cost.currency,
      totalBillingUnits: input.stream.cost.totalBillingUnits,
      billingUnit: input.stream.cost.billingUnit,
      costPerUsableObservation: input.stream.cost.costPerUsableObservation,
    },
    rateLimit: {
      state: input.stream.provider === null
        ? "not_applicable" as const
        : input.stream.rateLimit.state,
      capturedAt: input.stream.rateLimit.capturedAt,
      freshness: input.rateLimitFreshness,
      latestSnapshotFingerprint: input.stream.rateLimit.latestSnapshotFingerprint,
    },
  };
}

export function projectExternalIntelligenceRefreshReview(input: {
  schedule: ReadScheduleDefinition;
  source: SignalSourceDescriptor;
  plan: RefreshPlan;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
  telemetry: ExternalIntelligenceTelemetryInput;
  now: string;
  lastMaterializedSlotAt?: string | null;
}) {
  const lineage = validateLineage(input);
  const adapter = classifyAdapter(lineage.source, lineage.request.signalType);
  const schedule = exactBoundSchedule({ ...input, ...lineage });
  if (schedule.version !== READ_SCHEDULER_QUEUE_VERSION || schedule.workClass !== "signal_refresh") {
    throw new Error("signal_refresh_schedule_required");
  }

  const checkedAt = canonicalTimestamp(input.now, "external_refresh_now");
  const telemetry = buildTelemetry({
    source: lineage.source,
    signalType: lineage.request.signalType,
    adapter,
    telemetry: input.telemetry,
  });
  if (Date.parse(telemetry.report.referenceTime) > Date.parse(checkedAt)) {
    throw new Error("telemetry_reference_time_in_future");
  }

  const evaluation = evaluateReadSchedule({
    schedule,
    now: checkedAt,
    lastMaterializedSlotAt: input.lastMaterializedSlotAt,
  });
  const decision = reviewDecision({
    source: lineage.source,
    adapter,
    stream: telemetry.stream,
    now: checkedAt,
  });
  const safety = externalIntelligenceRefreshCapability();

  const telemetryFacts = telemetryProjection({
    reportFingerprint: telemetry.report.reportFingerprint,
    stream: telemetry.stream,
    providerReviewStateAtEvaluation: decision.providerReviewStateAtEvaluation,
    rateLimitFreshness: decision.rateLimitFreshness,
  });
  telemetryFacts.referenceTime = telemetry.report.referenceTime;

  let candidate: ExternalIntelligenceRefreshCandidate | null = null;
  if (evaluation.status === "due") {
    if (!evaluation.intent) throw new Error("due_external_refresh_intent_missing");
    exactSafety(evaluation.intent.safety, readSchedulerQueueCapability(), "read_intent_safety");
    const identity = {
      lifecycle: "proposed_review" as const,
      adapterKind: adapter.adapterKind,
      adapterVersion: adapter.adapterVersion,
      adapterCapabilityFingerprint: adapter.adapterCapabilityFingerprint,
      providerKey: adapter.providerKey,
      suppliedResultFoundationStatus: "available" as const,
      liveRuntimeStatus: "unavailable" as const,
      liveRuntimeBlockers: liveRuntimeBlockers(adapter),
      reviewDisposition: decision.reviewDisposition,
      reviewBlockers: decision.reviewBlockers,
      reviewDiagnostics: decision.reviewDiagnostics,
      scheduleId: schedule.scheduleId,
      scheduleFingerprint: schedule.scheduleFingerprint,
      intentId: evaluation.intent.intentId,
      intentFingerprint: evaluation.intent.intentFingerprint,
      slotAt: evaluation.intent.slotAt,
      expiresAt: evaluation.intent.expiresAt,
      sourceId: lineage.source.sourceId,
      sourceFingerprint: lineage.source.fingerprint,
      sourceKey: lineage.source.key,
      marketFingerprint: lineage.market.fingerprint,
      categoryFingerprint: lineage.category.fingerprint,
      signalType: lineage.request.signalType,
      planId: lineage.plan.planId,
      planFingerprint: lineage.plan.planFingerprint,
      requestId: lineage.request.requestId,
      requestFingerprint: lineage.request.requestFingerprint,
      telemetry: telemetryFacts,
      safety,
    };
    const candidateFingerprint = stableHash({
      version: EXTERNAL_INTELLIGENCE_REFRESH_VERSION,
      purpose: "external_intelligence_refresh_review",
      ...identity,
    });
    candidate = {
      version: EXTERNAL_INTELLIGENCE_REFRESH_VERSION,
      candidateId: "eir-" + candidateFingerprint.slice(0, 24),
      candidateFingerprint,
      ...identity,
    };
  }

  const projectionFingerprint = stableHash({
    version: EXTERNAL_INTELLIGENCE_REFRESH_VERSION,
    evaluation,
    adapter,
    telemetryReportFingerprint: telemetry.report.reportFingerprint,
    telemetryStreamFingerprint: telemetry.stream.streamFingerprint,
    decision,
    candidate,
    safety,
  });

  return {
    version: EXTERNAL_INTELLIGENCE_REFRESH_VERSION,
    projectionFingerprint,
    evaluation: evaluation as ReadScheduleEvaluation,
    adapter,
    telemetryReportFingerprint: telemetry.report.reportFingerprint,
    telemetryStreamFingerprint: telemetry.stream.streamFingerprint,
    reviewDisposition: decision.reviewDisposition,
    reviewBlockers: decision.reviewBlockers,
    reviewDiagnostics: decision.reviewDiagnostics,
    candidate,
    safety,
  };
}

export function externalIntelligenceRefreshCapability() {
  return Object.freeze({
    version: EXTERNAL_INTELLIGENCE_REFRESH_VERSION,
    architectureOnly: true as const,
    deterministicProjectionOnly: true as const,
    externalReadReviewOnly: true as const,
    suppliedInputsOnly: true as const,
    telemetryReviewOnly: true as const,
    sourceRefreshPlanReorderingEnabled: false as const,
    qualityTelemetryChangesRefreshOrder: false as const,
    costTelemetryChangesRefreshOrder: false as const,
    rateLimitTelemetryIsExecutionAuthorization: false as const,
    suppliedAdapterFoundationIsLiveRunner: false as const,
    orderingImpliesPriority: false as const,
    wallClockAccess: false as const,
    timerActivated: false as const,
    schedulerActivated: false as const,
    durableEnqueueAuthorized: false as const,
    queueReservationAuthorized: false as const,
    workerEnabled: false as const,
    batchExecutorEnabled: false as const,
    retryLoopEnabled: false as const,
    task69PacketMaterializationAuthorized: false as const,
    task70ExecutionAuthorized: false as const,
    providerEnrollmentAuthorized: false as const,
    providerPurchaseAuthorized: false as const,
    credentialCreationAuthorized: false as const,
    credentialUseAuthorized: false as const,
    oauthUseAuthorized: false as const,
    providerNetworkReadAuthorized: false as const,
    liveEndpointExecutionAuthorized: false as const,
    pollingAuthorized: false as const,
    observationPersistenceAuthorized: false as const,
    evidencePersistenceAuthorized: false as const,
    productionDbReadAuthorized: false as const,
    productionDbWriteAuthorized: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    task53ExecutionAuthorized: false as const,
    task54ExecutionAuthorized: false as const,
    automaticTransition: false as const,
    publicationAuthorized: false as const,
  });
}
