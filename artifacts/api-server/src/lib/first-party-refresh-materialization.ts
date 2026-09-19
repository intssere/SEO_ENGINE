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
  normalizeSignalSourceDescriptor,
  signalSourceRegistryCapability,
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
import { GSC_SEARCH_ANALYTICS_SOURCE_KEY } from "./gsc-search-analytics-runner.js";

export const FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION =
  "p9-2-first-party-refresh-materialization-v1" as const;

export type FirstPartyRefreshChannel =
  | "gsc_search_analytics"
  | "analytics"
  | "catalog";

export type RunnerFoundationStatus =
  | "runner_foundation_available"
  | "runner_foundation_unavailable";

export type FirstPartyRefreshCandidate = {
  version: typeof FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION;
  candidateId: string;
  candidateFingerprint: string;
  lifecycle: "proposed_review";
  channel: FirstPartyRefreshChannel;
  runnerFoundationStatus: RunnerFoundationStatus;
  blockers: string[];
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
  safety: ReturnType<typeof firstPartyRefreshMaterializationCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const PLAN_ID = /^srp-[0-9a-f]{24}$/;

function stableJson(value: unknown): string {
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
  exactSafety(source.safety ?? signalSourceRegistryCapability(), signalSourceRegistryCapability(), "source_safety");
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
    && item.sourceClass === source.sourceClass
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

  if (source.sourceClass !== "first_party") throw new Error("first_party_source_required");
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

function classifyChannel(
  source: SignalSourceDescriptor,
  signalType: SignalType,
): {
  channel: FirstPartyRefreshChannel;
  runnerFoundationStatus: RunnerFoundationStatus;
  blockers: string[];
} {
  if (
    source.trustClass !== "first_party_authoritative"
    || !source.provenanceComplete
    || !source.manuallyReviewed
    || source.collectionMode !== "provider_api"
  ) throw new Error("first_party_refresh_source_contract_mismatch");

  if (source.key === GSC_SEARCH_ANALYTICS_SOURCE_KEY) {
    if (signalType !== "keyword" || !source.signalTypes.includes("keyword")) {
      throw new Error("gsc_source_contract_mismatch");
    }
    return {
      channel: "gsc_search_analytics",
      runnerFoundationStatus: "runner_foundation_available",
      blockers: [],
    };
  }

  if (signalType === "analytics") {
    return {
      channel: "analytics",
      runnerFoundationStatus: "runner_foundation_unavailable",
      blockers: ["task70_compatible_analytics_runner_unavailable"],
    };
  }
  if (signalType === "catalog") {
    return {
      channel: "catalog",
      runnerFoundationStatus: "runner_foundation_unavailable",
      blockers: ["task70_compatible_catalog_runner_unavailable"],
    };
  }
  throw new Error("unsupported_first_party_refresh_channel");
}

function lineageFingerprints(input: {
  source: SignalSourceDescriptor;
  plan: RefreshPlan;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
}) {
  const scopeFingerprint = stableHash({
    version: FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION,
    purpose: "first_party_refresh_scope",
    sourceId: input.source.sourceId,
    sourceFingerprint: input.source.fingerprint,
    sourceKey: input.source.key,
    marketFingerprint: input.market.fingerprint,
    categoryFingerprint: input.category.fingerprint,
    signalType: input.request.signalType,
  });
  const upstreamLineageFingerprint = stableHash({
    version: FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION,
    purpose: "first_party_refresh_upstream_lineage",
    planId: input.plan.planId,
    planFingerprint: input.plan.planFingerprint,
    requestId: input.request.requestId,
    requestFingerprint: input.request.requestFingerprint,
  });
  return { scopeFingerprint, upstreamLineageFingerprint };
}

export function buildFirstPartyRefreshSchedule(input: {
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
  classifyChannel(lineage.source, lineage.request.signalType);
  const fingerprints = lineageFingerprints(lineage);
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
  const expected = buildFirstPartyRefreshSchedule({
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
    throw new Error("first_party_refresh_schedule_lineage_mismatch");
  }
  exactSafety(input.schedule.safety, readSchedulerQueueCapability(), "read_schedule_safety");
  return expected;
}

export function projectFirstPartyRefreshMaterializationReview(input: {
  schedule: ReadScheduleDefinition;
  source: SignalSourceDescriptor;
  plan: RefreshPlan;
  request: SourceAdapterRequest;
  market: MarketProfile;
  category: CategoryContext;
  now: string;
  lastMaterializedSlotAt?: string | null;
}) {
  const lineage = validateLineage(input);
  const schedule = exactBoundSchedule({ ...input, ...lineage });
  if (schedule.version !== READ_SCHEDULER_QUEUE_VERSION || schedule.workClass !== "signal_refresh") {
    throw new Error("signal_refresh_schedule_required");
  }
  const classification = classifyChannel(lineage.source, lineage.request.signalType);
  const evaluation = evaluateReadSchedule({
    schedule,
    now: input.now,
    lastMaterializedSlotAt: input.lastMaterializedSlotAt,
  });
  const safety = firstPartyRefreshMaterializationCapability();

  let candidate: FirstPartyRefreshCandidate | null = null;
  if (evaluation.status === "due") {
    if (!evaluation.intent) throw new Error("due_schedule_intent_missing");
    exactSafety(evaluation.intent.safety, readSchedulerQueueCapability(), "read_intent_safety");
    const identity = {
      lifecycle: "proposed_review" as const,
      channel: classification.channel,
      runnerFoundationStatus: classification.runnerFoundationStatus,
      blockers: classification.blockers,
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
      safety,
    };
    const candidateFingerprint = stableHash({
      version: FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION,
      purpose: "first_party_refresh_materialization_review",
      ...identity,
    });
    candidate = {
      version: FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION,
      candidateId: "fpr-" + candidateFingerprint.slice(0, 24),
      candidateFingerprint,
      ...identity,
    };
  }

  const projectionFingerprint = stableHash({
    version: FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION,
    evaluation,
    classification,
    candidate,
    safety,
  });

  return {
    version: FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION,
    projectionFingerprint,
    evaluation: evaluation as ReadScheduleEvaluation,
    channel: classification.channel,
    runnerFoundationStatus: classification.runnerFoundationStatus,
    blockers: classification.blockers,
    candidate,
    safety,
  };
}

export function firstPartyRefreshMaterializationCapability() {
  return Object.freeze({
    version: FIRST_PARTY_REFRESH_MATERIALIZATION_VERSION,
    architectureOnly: true as const,
    deterministicProjectionOnly: true as const,
    firstPartyReadOnly: true as const,
    materializationReviewOnly: true as const,
    runnerFoundationAvailabilityIsRuntimeReadiness: false as const,
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
    credentialUseAuthorized: false as const,
    oauthUseAuthorized: false as const,
    providerNetworkReadAuthorized: false as const,
    observationPersistenceAuthorized: false as const,
    evidencePersistenceAuthorized: false as const,
    productionDbWriteAuthorized: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    task53ExecutionAuthorized: false as const,
    task54ExecutionAuthorized: false as const,
    automaticTransition: false as const,
    publicationAuthorized: false as const,
  });
}
