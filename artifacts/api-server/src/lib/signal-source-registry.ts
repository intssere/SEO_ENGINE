import { createHash } from "node:crypto";
import type { CategoryContext, MarketProfile, SignalSourceClass, SignalType } from "./market-category-intelligence.js";

export const SIGNAL_SOURCE_REGISTRY_VERSION = "task67-signal-source-registry-v1" as const;

export type VolatilityClass = "low" | "medium" | "high" | "very_high";
export type TrustClass = "first_party_authoritative" | "reviewed_external" | "experimental_external";
export type CollectionMode = "provider_api" | "secure_http" | "internal_db" | "manual_import" | "other";
export type FreshnessState = "missing" | "fresh" | "stale" | "critical";

export type FreshnessPolicy = {
  freshForMinutes: number;
  staleAfterMinutes: number;
  criticalAfterMinutes: number;
  volatility: VolatilityClass;
};

export type SignalSourceDescriptorInput = {
  key: string;
  name: string;
  sourceClass: SignalSourceClass;
  signalTypes: SignalType[];
  marketFingerprints?: string[];
  categoryFingerprints?: string[];
  allowAnyMarket?: boolean;
  allowAnyCategory?: boolean;
  trustClass: TrustClass;
  quality: number;
  provenanceComplete: boolean;
  freshness: FreshnessPolicy;
  collectionMode: CollectionMode;
  manuallyReviewed: boolean;
};

export type SignalSourceDescriptor = Omit<SignalSourceDescriptorInput, "signalTypes" | "marketFingerprints" | "categoryFingerprints"> & {
  version: typeof SIGNAL_SOURCE_REGISTRY_VERSION;
  sourceId: string;
  fingerprint: string;
  signalTypes: SignalType[];
  marketFingerprints: string[];
  categoryFingerprints: string[];
};

export type ObservationState = {
  sourceFingerprint: string;
  signalType: SignalType;
  observedAt: string | null;
};

export type RefreshBudget = {
  maxSources: number;
  maxSignalTypesPerSource: number;
  maxTotalRefreshItems: number;
};

export type RefreshNeed = {
  market: MarketProfile;
  category: CategoryContext;
  signalTypes: SignalType[];
  now: string;
};

export type RefreshPlanItem = {
  sourceId: string;
  sourceFingerprint: string;
  sourceClass: SignalSourceClass;
  signalType: SignalType;
  freshnessState: FreshnessState;
  ageMinutes: number | null;
  urgency: number;
  quality: number;
  score: number;
};

export type RefreshPlan = {
  version: typeof SIGNAL_SOURCE_REGISTRY_VERSION;
  planId: string;
  planFingerprint: string;
  generatedAt: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  requestedSignalTypes: SignalType[];
  budget: RefreshBudget;
  selected: RefreshPlanItem[];
  deferred: RefreshPlanItem[];
  blockers: string[];
  safety: ReturnType<typeof signalSourceRegistryCapability>;
};

const SIGNAL_TYPES: SignalType[] = ["analytics", "catalog", "competitor", "entity", "geo_aio", "keyword", "serp", "trend"];
const SIGNAL_TYPE_SET = new Set<string>(SIGNAL_TYPES);
const VOLATILITY_BOOST: Record<VolatilityClass, number> = { low: 0, medium: 5, high: 10, very_high: 15 };
const FRESHNESS_URGENCY: Record<FreshnessState, number> = { fresh: 0, stale: 40, critical: 70, missing: 80 };

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function text(value: unknown, max = 120): string {
  if (typeof value !== "string") throw new Error("invalid_text");
  const result = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!result || result.length > max) throw new Error("invalid_text");
  return result;
}

function uniqueSorted<T extends string>(values: T[], field: string): T[] {
  if (!Array.isArray(values) || values.length === 0) throw new Error(`invalid_${field}`);
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function normalizeFingerprints(values: string[] | undefined): string[] {
  if (!values) return [];
  const normalized = [...new Set(values.map((value) => value.trim().toLowerCase()))].sort();
  if (normalized.some((value) => !/^[0-9a-f]{64}$/.test(value))) throw new Error("invalid_scope_fingerprint");
  return normalized;
}

function bounded(value: number, min: number, max: number, name: string): number {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`invalid_${name}`);
  return value;
}

function intBounded(value: number, min: number, max: number, name: string): number {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`invalid_${name}`);
  return value;
}

function normalizeFreshness(value: FreshnessPolicy): FreshnessPolicy {
  const freshForMinutes = intBounded(value.freshForMinutes, 1, 525600, "fresh_for_minutes");
  const staleAfterMinutes = intBounded(value.staleAfterMinutes, freshForMinutes, 1051200, "stale_after_minutes");
  const criticalAfterMinutes = intBounded(value.criticalAfterMinutes, staleAfterMinutes, 2102400, "critical_after_minutes");
  return { freshForMinutes, staleAfterMinutes, criticalAfterMinutes, volatility: value.volatility };
}

export function normalizeSignalSourceDescriptor(input: SignalSourceDescriptorInput): SignalSourceDescriptor {
  const key = text(input.key, 80).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(key)) throw new Error("invalid_source_key");
  const name = text(input.name, 120);
  const signalTypes = uniqueSorted(input.signalTypes, "signal_types");
  if (signalTypes.some((value) => !SIGNAL_TYPE_SET.has(value))) throw new Error("invalid_signal_type");
  const marketFingerprints = normalizeFingerprints(input.marketFingerprints);
  const categoryFingerprints = normalizeFingerprints(input.categoryFingerprints);
  const allowAnyMarket = Boolean(input.allowAnyMarket);
  const allowAnyCategory = Boolean(input.allowAnyCategory);
  if (!allowAnyMarket && marketFingerprints.length === 0) throw new Error("market_scope_required");
  if (!allowAnyCategory && categoryFingerprints.length === 0) throw new Error("category_scope_required");
  const quality = bounded(input.quality, 0, 1, "quality");
  if (input.sourceClass === "external" && !input.manuallyReviewed) {
    // Descriptor can still be represented, but eligibility will fail closed.
  }
  const freshness = normalizeFreshness(input.freshness);
  const canonical = {
    key,
    name: name.toLowerCase(),
    sourceClass: input.sourceClass,
    signalTypes,
    marketFingerprints,
    categoryFingerprints,
    allowAnyMarket,
    allowAnyCategory,
    trustClass: input.trustClass,
    quality,
    provenanceComplete: Boolean(input.provenanceComplete),
    freshness,
    collectionMode: input.collectionMode,
    manuallyReviewed: Boolean(input.manuallyReviewed),
  };
  const fingerprint = hash({ version: SIGNAL_SOURCE_REGISTRY_VERSION, ...canonical });
  return {
    version: SIGNAL_SOURCE_REGISTRY_VERSION,
    sourceId: `src-${fingerprint.slice(0, 24)}`,
    fingerprint,
    key,
    name,
    sourceClass: input.sourceClass,
    signalTypes,
    marketFingerprints,
    categoryFingerprints,
    allowAnyMarket,
    allowAnyCategory,
    trustClass: input.trustClass,
    quality,
    provenanceComplete: Boolean(input.provenanceComplete),
    freshness,
    collectionMode: input.collectionMode,
    manuallyReviewed: Boolean(input.manuallyReviewed),
  };
}

export function sourceEligibility(source: SignalSourceDescriptor, market: MarketProfile, category: CategoryContext, signalType: SignalType) {
  const blockers: string[] = [];
  if (!source.signalTypes.includes(signalType)) blockers.push("signal_type_not_supported");
  if (!source.allowAnyMarket && !source.marketFingerprints.includes(market.fingerprint)) blockers.push("market_not_supported");
  if (!source.allowAnyCategory && !source.categoryFingerprints.includes(category.fingerprint)) blockers.push("category_not_supported");
  if (source.sourceClass === "external" && !source.manuallyReviewed) blockers.push("external_source_manual_review_required");
  if (!source.provenanceComplete) blockers.push("provenance_incomplete");
  return { eligible: blockers.length === 0, blockers };
}

export function classifyFreshness(policy: FreshnessPolicy, observedAt: string | null, now: string): { state: FreshnessState; ageMinutes: number | null } {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error("invalid_now");
  if (observedAt === null) return { state: "missing", ageMinutes: null };
  const observedMs = Date.parse(observedAt);
  if (!Number.isFinite(observedMs)) throw new Error("invalid_observed_at");
  if (observedMs > nowMs) throw new Error("observed_at_in_future");
  const ageMinutes = Math.floor((nowMs - observedMs) / 60000);
  const normalized = normalizeFreshness(policy);
  if (ageMinutes < normalized.staleAfterMinutes) return { state: "fresh", ageMinutes };
  if (ageMinutes < normalized.criticalAfterMinutes) return { state: "stale", ageMinutes };
  return { state: "critical", ageMinutes };
}

function normalizeBudget(input: RefreshBudget): RefreshBudget {
  return {
    maxSources: intBounded(input.maxSources, 1, 50, "max_sources"),
    maxSignalTypesPerSource: intBounded(input.maxSignalTypesPerSource, 1, 8, "max_signal_types_per_source"),
    maxTotalRefreshItems: intBounded(input.maxTotalRefreshItems, 1, 200, "max_total_refresh_items"),
  };
}

function observationFor(observations: ObservationState[], sourceFingerprint: string, signalType: SignalType): ObservationState | undefined {
  const matches = observations.filter((value) => value.sourceFingerprint === sourceFingerprint && value.signalType === signalType);
  if (matches.length > 1) throw new Error("duplicate_observation_state");
  return matches[0];
}

export function buildSignalRefreshPlan(input: {
  sources: SignalSourceDescriptor[];
  observations?: ObservationState[];
  need: RefreshNeed;
  budget: RefreshBudget;
}): RefreshPlan {
  const generatedMs = Date.parse(input.need.now);
  if (!Number.isFinite(generatedMs)) throw new Error("invalid_now");
  const generatedAt = new Date(generatedMs).toISOString();
  const requestedSignalTypes = uniqueSorted(input.need.signalTypes, "requested_signal_types");
  if (requestedSignalTypes.some((value) => !SIGNAL_TYPE_SET.has(value))) throw new Error("invalid_signal_type");
  const budget = normalizeBudget(input.budget);
  const byFingerprint = new Map<string, SignalSourceDescriptor>();
  for (const source of input.sources) {
    if (byFingerprint.has(source.fingerprint)) throw new Error("duplicate_source_descriptor");
    byFingerprint.set(source.fingerprint, source);
  }
  const observations = input.observations ?? [];
  const candidates: RefreshPlanItem[] = [];
  const blockers = new Set<string>();
  for (const signalType of requestedSignalTypes) {
    let eligibleCount = 0;
    for (const source of [...byFingerprint.values()].sort((a, b) => a.fingerprint.localeCompare(b.fingerprint))) {
      const eligibility = sourceEligibility(source, input.need.market, input.need.category, signalType);
      if (!eligibility.eligible) continue;
      eligibleCount += 1;
      const observation = observationFor(observations, source.fingerprint, signalType);
      const freshness = classifyFreshness(source.freshness, observation?.observedAt ?? null, generatedAt);
      const firstPartyBoost = source.sourceClass === "first_party" ? 5 : 0;
      const trustBoost = source.trustClass === "first_party_authoritative" ? 5 : source.trustClass === "reviewed_external" ? 3 : 0;
      const urgency = Math.min(100, FRESHNESS_URGENCY[freshness.state] + VOLATILITY_BOOST[source.freshness.volatility]);
      const quality = Math.round(source.quality * 100);
      const score = urgency * 1000 + quality * 10 + firstPartyBoost + trustBoost;
      candidates.push({
        sourceId: source.sourceId,
        sourceFingerprint: source.fingerprint,
        sourceClass: source.sourceClass,
        signalType,
        freshnessState: freshness.state,
        ageMinutes: freshness.ageMinutes,
        urgency,
        quality,
        score,
      });
    }
    if (eligibleCount === 0) blockers.add(`unsupported_coverage:${signalType}`);
  }

  candidates.sort((a, b) => b.score - a.score || a.sourceFingerprint.localeCompare(b.sourceFingerprint) || a.signalType.localeCompare(b.signalType));
  const selected: RefreshPlanItem[] = [];
  const deferred: RefreshPlanItem[] = [];
  const selectedSources = new Set<string>();
  const signalCountBySource = new Map<string, number>();
  for (const item of candidates) {
    const existingCount = signalCountBySource.get(item.sourceFingerprint) ?? 0;
    const wouldAddSource = !selectedSources.has(item.sourceFingerprint);
    const withinSourceBudget = !wouldAddSource || selectedSources.size < budget.maxSources;
    const withinTypeBudget = existingCount < budget.maxSignalTypesPerSource;
    const withinTotalBudget = selected.length < budget.maxTotalRefreshItems;
    if (withinSourceBudget && withinTypeBudget && withinTotalBudget) {
      selected.push(item);
      selectedSources.add(item.sourceFingerprint);
      signalCountBySource.set(item.sourceFingerprint, existingCount + 1);
    } else {
      deferred.push(item);
    }
  }

  const identity = {
    generatedAt,
    marketFingerprint: input.need.market.fingerprint,
    categoryFingerprint: input.need.category.fingerprint,
    requestedSignalTypes,
    budget,
    selected: selected.map((value) => ({ sourceFingerprint: value.sourceFingerprint, signalType: value.signalType, freshnessState: value.freshnessState, ageMinutes: value.ageMinutes, urgency: value.urgency, quality: value.quality })),
    deferred: deferred.map((value) => ({ sourceFingerprint: value.sourceFingerprint, signalType: value.signalType, freshnessState: value.freshnessState, ageMinutes: value.ageMinutes, urgency: value.urgency, quality: value.quality })),
    blockers: [...blockers].sort(),
  };
  const planFingerprint = hash({ version: SIGNAL_SOURCE_REGISTRY_VERSION, ...identity });
  return {
    version: SIGNAL_SOURCE_REGISTRY_VERSION,
    planId: `srp-${planFingerprint.slice(0, 24)}`,
    planFingerprint,
    ...identity,
    safety: signalSourceRegistryCapability(),
  };
}

export function signalSourceRegistryCapability() {
  return Object.freeze({
    version: SIGNAL_SOURCE_REGISTRY_VERSION,
    registryPlanningOnly: true,
    networkCollectionAuthorized: false,
    providerEnrollmentAuthorized: false,
    credentialMutationAuthorized: false,
    evidencePersistenceAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    schedulerEnabled: false,
    batchEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransition: false,
    schemaMutationRequired: false,
  });
}
