import { createHash } from "node:crypto";

export const TASK66_MARKET_INTELLIGENCE_VERSION = "task66-market-aware-category-intelligence-v1" as const;

export type MarketDevice = "all" | "desktop" | "mobile" | "tablet";
export type SearchEngine = "google" | "bing" | "other";
export type SignalSourceClass = "first_party" | "external";
export type ReviewDecision = "approved" | "pending" | "rejected";
export type KeywordIntent = "informational" | "commercial" | "transactional" | "navigational" | "local" | "mixed";
export type BrandScope = "brand" | "non_brand" | "mixed";
export type TrendClassification = "insufficient" | "breakout" | "rising" | "stable" | "declining";
export type EvidenceClass = "insufficient" | "exploratory_external_only" | "first_party_only" | "corroborated";

export type MarketProfileInput = {
  country: string;
  region?: string | null;
  language: string;
  searchEngine?: SearchEngine;
  locale?: string | null;
  currency?: string | null;
  device?: MarketDevice;
};

export type MarketProfile = {
  marketId: string;
  fingerprint: string;
  country: string;
  region: string | null;
  language: string;
  searchEngine: SearchEngine;
  locale: string;
  currency: string | null;
  device: MarketDevice;
};

export type CategoryProfileInput = {
  key: string;
  name: string;
  canonicalPath?: string | null;
  parentKey?: string | null;
  labels?: string[];
  intentTopics?: string[];
};

export type CategoryProfile = {
  categoryId: string;
  fingerprint: string;
  key: string;
  name: string;
  canonicalPath: string | null;
  parentKey: string | null;
  labels: string[];
  intentTopics: string[];
};

export type MarketCategoryScope = {
  scopeId: string;
  fingerprint: string;
  marketId: string;
  marketFingerprint: string;
  categoryId: string;
  categoryFingerprint: string;
};

export type KeywordClusterInput = {
  name: string;
  marketId: string;
  categoryId: string;
  terms: string[];
  intent: KeywordIntent;
  brandScope?: BrandScope;
};

export type KeywordCluster = {
  clusterId: string;
  fingerprint: string;
  name: string;
  marketId: string;
  categoryId: string;
  terms: string[];
  intent: KeywordIntent;
  brandScope: BrandScope;
};

export type SignalSourceInput = {
  sourceId: string;
  sourceClass: SignalSourceClass;
  sourceType: string;
  approvedForPlanning?: boolean;
  provenance?: string | null;
};

export type SignalSource = {
  sourceId: string;
  fingerprint: string;
  sourceClass: SignalSourceClass;
  sourceType: string;
  approvedForPlanning: boolean;
  provenance: string | null;
  synthesisEligible: boolean;
};

export type SignalSnapshotInput = {
  source: SignalSource;
  signalKind: string;
  marketId: string;
  categoryId: string;
  clusterId?: string | null;
  competitorFingerprint?: string | null;
  observedAt: string;
  validForHours: number;
  metrics: Record<string, number>;
};

export type SignalSnapshot = {
  snapshotId: string;
  fingerprint: string;
  source: SignalSource;
  signalKind: string;
  marketId: string;
  categoryId: string;
  clusterId: string | null;
  competitorFingerprint: string | null;
  observedAt: string;
  validForHours: number;
  metrics: Record<string, number>;
  synthesisEligible: boolean;
};

export type SnapshotFreshness = {
  state: "fresh" | "stale";
  ageHours: number;
  expiresAt: string;
};

export type CompetitorRelevanceSignals = {
  categoryOverlap: number;
  keywordOverlap: number;
  pageTypeFit: number;
  marketFit: number;
  assortmentOverlap: number;
  freshness: number;
  evidenceCoverage: number;
  sourceConfidence: number;
};

export type CompetitorRelationInput = {
  candidateFingerprint: string;
  domain: string;
  marketId: string;
  categoryId: string;
  reviewDecision: ReviewDecision;
  signals: CompetitorRelevanceSignals;
};

export type CompetitorRelationScore = {
  total: number;
  components: {
    categoryOverlap: number;
    keywordOverlap: number;
    marketFit: number;
    assortmentOverlap: number;
    pageTypeFit: number;
    freshness: number;
    evidenceCoverage: number;
    sourceConfidence: number;
  };
};

export type CompetitorRelation = CompetitorRelationInput & {
  relationId: string;
  fingerprint: string;
  score: CompetitorRelationScore;
  recommendedForAdmission: boolean;
  targetRegistrationAuthorized: false;
};

export type TrendAnalysis = {
  seriesFingerprint: string;
  marketId: string;
  categoryId: string;
  clusterId: string | null;
  sourceFingerprint: string;
  signalKind: string;
  metric: string;
  sampleCount: number;
  current: number | null;
  previous: number | null;
  baseline: number | null;
  shortChangePct: number | null;
  baselineChangePct: number | null;
  momentumIndex: number | null;
  classification: TrendClassification;
};

export type KeywordOpportunity = {
  opportunityId: string;
  fingerprint: string;
  marketId: string;
  categoryId: string;
  clusterId: string;
  score: number;
  confidence: number;
  evidenceClass: EvidenceClass;
  planningReady: boolean;
  firstPartySignalCount: number;
  externalSignalCount: number;
  distinctSourceTypes: number;
  staleSignalsExcluded: number;
  dimensions: {
    firstPartyGap: number;
    demand: number;
    positiveTrend: number;
    competitorGap: number;
    serpGeoGap: number;
    strategicFit: number;
  };
  blockers: string[];
  warnings: string[];
  safety: {
    advisoryOnly: true;
    actionEligible: false;
    automaticTransition: false;
    publicSiteWrites: false;
    providerWrites: false;
    executionAuthorized: false;
  };
};

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function requiredText(value: unknown, field: string, maxLength = 160): string {
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maxLength) throw new Error(`invalid_${field}`);
  return normalized;
}

function optionalText(value: unknown, field: string, maxLength = 160): string | null {
  if (value == null || value === "") return null;
  return requiredText(value, field, maxLength);
}

function normalizedKey(value: unknown, field: string, maxLength = 120): string {
  return requiredText(value, field, maxLength).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizedList(value: unknown, field: string, maxValues = 50): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`invalid_${field}`);
  const result = new Map<string, string>();
  for (const item of value) {
    const normalized = requiredText(item, field, 160);
    const key = normalized.toLowerCase();
    if (!result.has(key)) result.set(key, normalized);
    if (result.size >= maxValues) break;
  }
  return [...result.values()].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

function normalizedLocale(value: string): string {
  const raw = requiredText(value, "locale", 32).replace(/_/g, "-");
  const parts = raw.split("-");
  if (!/^[A-Za-z]{2,3}$/.test(parts[0] ?? "")) throw new Error("invalid_locale");
  if (parts.length > 2) throw new Error("invalid_locale");
  if (parts[1] && !/^[A-Za-z]{2}$/.test(parts[1])) throw new Error("invalid_locale");
  return parts[1] ? `${parts[0]!.toLowerCase()}-${parts[1].toUpperCase()}` : parts[0]!.toLowerCase();
}

function canonicalPath(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const raw = requiredText(value, "canonical_path", 240);
  if (!raw.startsWith("/")) throw new Error("invalid_canonical_path");
  if (raw.includes("?") || raw.includes("#")) throw new Error("invalid_canonical_path");
  const collapsed = raw.replace(/\/{2,}/g, "/");
  return collapsed !== "/" ? collapsed.replace(/\/$/, "") : "/";
}

function bounded01(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`invalid_${field}`);
  return n;
}

function boundedIndex(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function percentChange(current: number, previous: number): number {
  return ((current - previous) / Math.max(Math.abs(previous), 1)) * 100;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function metricAverage(snapshots: SignalSnapshot[], metric: string): number | null {
  const values = snapshots
    .map((snapshot) => snapshot.metrics[metric])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return average(values);
}

export function task66MarketIntelligenceCapability() {
  return {
    version: TASK66_MARKET_INTELLIGENCE_VERSION,
    architectureOnly: true,
    purePlanningOnly: true,
    liveCollectionAuthorized: false,
    externalProviderEnrollmentAuthorized: false,
    evidencePersistenceAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    schedulerEnabled: false,
    batchEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    publicSiteWrites: false,
    providerWrites: false,
    automaticTransition: false,
    executionAuthorized: false,
    schemaMutationRequired: false,
  } as const;
}

export function normalizeMarketProfile(input: MarketProfileInput): MarketProfile {
  const country = requiredText(input.country, "country", 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new Error("invalid_country");
  const regionRaw = optionalText(input.region, "region", 24);
  const region = regionRaw ? regionRaw.toUpperCase() : null;
  const language = normalizedLocale(input.language);
  const locale = normalizedLocale(input.locale ?? (language.includes("-") ? language : `${language}-${country}`));
  const searchEngine = input.searchEngine ?? "google";
  if (!["google", "bing", "other"].includes(searchEngine)) throw new Error("invalid_search_engine");
  const device = input.device ?? "all";
  if (!["all", "desktop", "mobile", "tablet"].includes(device)) throw new Error("invalid_device");
  const currencyRaw = optionalText(input.currency, "currency", 3);
  const currency = currencyRaw ? currencyRaw.toUpperCase() : null;
  if (currency && !/^[A-Z]{3}$/.test(currency)) throw new Error("invalid_currency");

  const identity = { country, region, language, searchEngine, locale, currency, device };
  const fingerprint = stableHash({ version: TASK66_MARKET_INTELLIGENCE_VERSION, type: "market", ...identity });
  return { marketId: `mkt-${fingerprint.slice(0, 20)}`, fingerprint, ...identity };
}

export function normalizeCategoryProfile(input: CategoryProfileInput): CategoryProfile {
  const key = normalizedKey(input.key, "category_key");
  const name = requiredText(input.name, "category_name", 120);
  const path = canonicalPath(input.canonicalPath);
  const parentKey = input.parentKey ? normalizedKey(input.parentKey, "parent_key") : null;
  const labels = normalizedList(input.labels, "category_label", 40);
  const intentTopics = normalizedList(input.intentTopics, "intent_topic", 60);
  const identityFingerprint = stableHash({ version: TASK66_MARKET_INTELLIGENCE_VERSION, type: "category_identity", key, canonicalPath: path });
  const fingerprint = stableHash({
    version: TASK66_MARKET_INTELLIGENCE_VERSION,
    type: "category",
    key,
    name: name.toLowerCase(),
    canonicalPath: path,
    parentKey,
    labels: labels.map((item) => item.toLowerCase()),
    intentTopics: intentTopics.map((item) => item.toLowerCase()),
  });
  return { categoryId: `cat-${identityFingerprint.slice(0, 20)}`, fingerprint, key, name, canonicalPath: path, parentKey, labels, intentTopics };
}

export function createMarketCategoryScope(market: MarketProfile, category: CategoryProfile): MarketCategoryScope {
  const identityFingerprint = stableHash({
    version: TASK66_MARKET_INTELLIGENCE_VERSION,
    type: "scope_identity",
    marketId: market.marketId,
    categoryId: category.categoryId,
  });
  const fingerprint = stableHash({
    version: TASK66_MARKET_INTELLIGENCE_VERSION,
    type: "scope",
    marketId: market.marketId,
    marketFingerprint: market.fingerprint,
    categoryId: category.categoryId,
    categoryFingerprint: category.fingerprint,
  });
  return {
    scopeId: `scope-${identityFingerprint.slice(0, 20)}`,
    fingerprint,
    marketId: market.marketId,
    marketFingerprint: market.fingerprint,
    categoryId: category.categoryId,
    categoryFingerprint: category.fingerprint,
  };
}

export function normalizeKeywordCluster(input: KeywordClusterInput): KeywordCluster {
  const name = requiredText(input.name, "cluster_name", 120);
  const marketId = normalizedKey(input.marketId, "market_id", 64);
  const categoryId = normalizedKey(input.categoryId, "category_id", 64);
  const terms = normalizedList(input.terms, "keyword_term", 100).map((item) => item.toLowerCase());
  if (terms.length === 0) throw new Error("keyword_terms_required");
  if (!["informational", "commercial", "transactional", "navigational", "local", "mixed"].includes(input.intent)) throw new Error("invalid_keyword_intent");
  const brandScope = input.brandScope ?? "mixed";
  if (!["brand", "non_brand", "mixed"].includes(brandScope)) throw new Error("invalid_brand_scope");
  const fingerprint = stableHash({
    version: TASK66_MARKET_INTELLIGENCE_VERSION,
    type: "keyword_cluster",
    marketId,
    categoryId,
    name: name.toLowerCase(),
    terms,
    intent: input.intent,
    brandScope,
  });
  return { clusterId: `kwc-${fingerprint.slice(0, 20)}`, fingerprint, name, marketId, categoryId, terms, intent: input.intent, brandScope };
}

export function normalizeSignalSource(input: SignalSourceInput): SignalSource {
  const sourceId = normalizedKey(input.sourceId, "source_id", 80);
  if (!["first_party", "external"].includes(input.sourceClass)) throw new Error("invalid_source_class");
  const sourceType = normalizedKey(input.sourceType, "source_type", 80);
  const approvedForPlanning = input.sourceClass === "first_party" ? true : input.approvedForPlanning === true;
  const provenance = optionalText(input.provenance, "source_provenance", 240);
  const fingerprint = stableHash({
    version: TASK66_MARKET_INTELLIGENCE_VERSION,
    type: "signal_source",
    sourceId,
    sourceClass: input.sourceClass,
    sourceType,
    approvedForPlanning,
    provenance,
  });
  return {
    sourceId,
    fingerprint,
    sourceClass: input.sourceClass,
    sourceType,
    approvedForPlanning,
    provenance,
    synthesisEligible: input.sourceClass === "first_party" || approvedForPlanning,
  };
}

export function normalizeSignalSnapshot(input: SignalSnapshotInput, now = new Date().toISOString()): SignalSnapshot {
  const signalKind = normalizedKey(input.signalKind, "signal_kind", 80);
  const marketId = normalizedKey(input.marketId, "market_id", 64);
  const categoryId = normalizedKey(input.categoryId, "category_id", 64);
  const clusterId = input.clusterId ? normalizedKey(input.clusterId, "cluster_id", 64) : null;
  const competitorFingerprint = input.competitorFingerprint ? requiredText(input.competitorFingerprint, "competitor_fingerprint", 64).toLowerCase() : null;
  if (competitorFingerprint && !/^[0-9a-f]{64}$/.test(competitorFingerprint)) throw new Error("invalid_competitor_fingerprint");
  const nowMs = Date.parse(now);
  const observedMs = Date.parse(input.observedAt);
  if (!Number.isFinite(nowMs) || !Number.isFinite(observedMs) || observedMs > nowMs + 5 * 60_000) throw new Error("invalid_observed_at");
  if (!Number.isInteger(input.validForHours) || input.validForHours < 1 || input.validForHours > 8_760) throw new Error("invalid_valid_for_hours");
  if (!input.metrics || typeof input.metrics !== "object" || Array.isArray(input.metrics)) throw new Error("invalid_metrics");
  const metricEntries = Object.entries(input.metrics)
    .map(([key, value]) => [normalizedKey(key, "metric_key", 80), Number(value)] as const)
    .filter(([, value]) => Number.isFinite(value))
    .sort(([a], [b]) => a.localeCompare(b));
  if (metricEntries.length === 0 || metricEntries.length > 40) throw new Error("invalid_metrics");
  const metrics = Object.fromEntries(metricEntries) as Record<string, number>;
  const observedAt = new Date(observedMs).toISOString();
  const fingerprint = stableHash({
    version: TASK66_MARKET_INTELLIGENCE_VERSION,
    type: "signal_snapshot",
    sourceFingerprint: input.source.fingerprint,
    signalKind,
    marketId,
    categoryId,
    clusterId,
    competitorFingerprint,
    observedAt,
    validForHours: input.validForHours,
    metrics,
  });
  return {
    snapshotId: `sig-${fingerprint.slice(0, 24)}`,
    fingerprint,
    source: input.source,
    signalKind,
    marketId,
    categoryId,
    clusterId,
    competitorFingerprint,
    observedAt,
    validForHours: input.validForHours,
    metrics,
    synthesisEligible: input.source.synthesisEligible,
  };
}

export function signalSnapshotFreshness(snapshot: SignalSnapshot, now = new Date().toISOString()): SnapshotFreshness {
  const nowMs = Date.parse(now);
  const observedMs = Date.parse(snapshot.observedAt);
  if (!Number.isFinite(nowMs) || !Number.isFinite(observedMs) || nowMs < observedMs - 5 * 60_000) throw new Error("invalid_freshness_clock");
  const expiresMs = observedMs + snapshot.validForHours * 3_600_000;
  return {
    state: nowMs <= expiresMs ? "fresh" : "stale",
    ageHours: round(Math.max(0, (nowMs - observedMs) / 3_600_000)),
    expiresAt: new Date(expiresMs).toISOString(),
  };
}

export function scoreCompetitorRelation(signals: CompetitorRelevanceSignals): CompetitorRelationScore {
  const normalized = {
    categoryOverlap: bounded01(signals.categoryOverlap, "category_overlap"),
    keywordOverlap: bounded01(signals.keywordOverlap, "keyword_overlap"),
    pageTypeFit: bounded01(signals.pageTypeFit, "page_type_fit"),
    marketFit: bounded01(signals.marketFit, "market_fit"),
    assortmentOverlap: bounded01(signals.assortmentOverlap, "assortment_overlap"),
    freshness: bounded01(signals.freshness, "freshness"),
    evidenceCoverage: bounded01(signals.evidenceCoverage, "evidence_coverage"),
    sourceConfidence: bounded01(signals.sourceConfidence, "source_confidence"),
  };
  const components = {
    categoryOverlap: normalized.categoryOverlap * 25,
    keywordOverlap: normalized.keywordOverlap * 20,
    marketFit: normalized.marketFit * 15,
    assortmentOverlap: normalized.assortmentOverlap * 15,
    pageTypeFit: normalized.pageTypeFit * 10,
    freshness: normalized.freshness * 5,
    evidenceCoverage: normalized.evidenceCoverage * 5,
    sourceConfidence: normalized.sourceConfidence * 5,
  };
  const roundedComponents = Object.fromEntries(Object.entries(components).map(([key, value]) => [key, round(value)])) as CompetitorRelationScore["components"];
  return { total: round(Object.values(components).reduce((sum, value) => sum + value, 0)), components: roundedComponents };
}

export function buildCompetitorRelation(input: CompetitorRelationInput): CompetitorRelation {
  const candidateFingerprint = requiredText(input.candidateFingerprint, "candidate_fingerprint", 64).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(candidateFingerprint)) throw new Error("invalid_candidate_fingerprint");
  const domain = requiredText(input.domain, "competitor_domain", 253).toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (!domain.includes(".") || domain.includes("/") || domain.includes("@") || domain.includes(":")) throw new Error("invalid_competitor_domain");
  const marketId = normalizedKey(input.marketId, "market_id", 64);
  const categoryId = normalizedKey(input.categoryId, "category_id", 64);
  if (!["approved", "pending", "rejected"].includes(input.reviewDecision)) throw new Error("invalid_review_decision");
  const score = scoreCompetitorRelation(input.signals);
  const identityFingerprint = stableHash({ version: TASK66_MARKET_INTELLIGENCE_VERSION, type: "competitor_relation_identity", candidateFingerprint, marketId, categoryId });
  const fingerprint = stableHash({
    version: TASK66_MARKET_INTELLIGENCE_VERSION,
    type: "competitor_relation",
    candidateFingerprint,
    domain,
    marketId,
    categoryId,
    reviewDecision: input.reviewDecision,
    signals: input.signals,
    score,
  });
  return {
    ...input,
    candidateFingerprint,
    domain,
    marketId,
    categoryId,
    relationId: `rel-${identityFingerprint.slice(0, 20)}`,
    fingerprint,
    score,
    recommendedForAdmission: input.reviewDecision === "approved" && score.total >= 60,
    targetRegistrationAuthorized: false,
  };
}

function sameSeriesIdentity(left: SignalSnapshot, right: SignalSnapshot): boolean {
  return left.marketId === right.marketId
    && left.categoryId === right.categoryId
    && left.clusterId === right.clusterId
    && left.source.fingerprint === right.source.fingerprint
    && left.signalKind === right.signalKind;
}

export function analyzeTrendSeries(input: {
  snapshots: SignalSnapshot[];
  metric: string;
  now?: string;
}): TrendAnalysis {
  const metric = normalizedKey(input.metric, "trend_metric", 80);
  const sorted = [...input.snapshots].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) || a.fingerprint.localeCompare(b.fingerprint));
  const reference = sorted[0];
  if (!reference) {
    return {
      seriesFingerprint: stableHash({ version: TASK66_MARKET_INTELLIGENCE_VERSION, type: "trend_series", metric, snapshots: [] }),
      marketId: "",
      categoryId: "",
      clusterId: null,
      sourceFingerprint: "",
      signalKind: "",
      metric,
      sampleCount: 0,
      current: null,
      previous: null,
      baseline: null,
      shortChangePct: null,
      baselineChangePct: null,
      momentumIndex: null,
      classification: "insufficient",
    };
  }
  if (!sorted.every((snapshot) => sameSeriesIdentity(reference, snapshot))) throw new Error("mixed_trend_series_scope");
  const now = input.now ?? new Date().toISOString();
  const usable = sorted.filter((snapshot) => snapshot.synthesisEligible && signalSnapshotFreshness(snapshot, now).state === "fresh" && Number.isFinite(snapshot.metrics[metric]));
  const values = usable.map((snapshot) => snapshot.metrics[metric]!);
  const current = values.at(-1) ?? null;
  const previous = values.at(-2) ?? null;
  const baseline = values.length >= 2 ? average(values.slice(0, -1)) : null;
  const shortChangePct = current != null && previous != null ? round(percentChange(current, previous)) : null;
  const baselineChangePct = current != null && baseline != null ? round(percentChange(current, baseline)) : null;
  const momentumIndex = shortChangePct != null && baselineChangePct != null
    ? round(Math.max(-100, Math.min(100, shortChangePct * 0.6 + baselineChangePct * 0.4)))
    : null;
  let classification: TrendClassification = "insufficient";
  if (values.length >= 3 && shortChangePct != null && baselineChangePct != null) {
    if (shortChangePct >= 50 && baselineChangePct >= 30) classification = "breakout";
    else if (shortChangePct >= 10 && baselineChangePct >= 5) classification = "rising";
    else if (shortChangePct <= -10 && baselineChangePct <= -5) classification = "declining";
    else classification = "stable";
  }
  const seriesFingerprint = stableHash({
    version: TASK66_MARKET_INTELLIGENCE_VERSION,
    type: "trend_series",
    marketId: reference.marketId,
    categoryId: reference.categoryId,
    clusterId: reference.clusterId,
    sourceFingerprint: reference.source.fingerprint,
    signalKind: reference.signalKind,
    metric,
    snapshotFingerprints: usable.map((snapshot) => snapshot.fingerprint),
  });
  return {
    seriesFingerprint,
    marketId: reference.marketId,
    categoryId: reference.categoryId,
    clusterId: reference.clusterId,
    sourceFingerprint: reference.source.fingerprint,
    signalKind: reference.signalKind,
    metric,
    sampleCount: values.length,
    current,
    previous,
    baseline: baseline == null ? null : round(baseline),
    shortChangePct,
    baselineChangePct,
    momentumIndex,
    classification,
  };
}

function assertOpportunityScope(cluster: KeywordCluster, snapshots: SignalSnapshot[]): void {
  for (const snapshot of snapshots) {
    if (snapshot.marketId !== cluster.marketId || snapshot.categoryId !== cluster.categoryId) throw new Error("mixed_market_or_category_scope");
    if (snapshot.clusterId && snapshot.clusterId !== cluster.clusterId) throw new Error("mixed_keyword_cluster_scope");
  }
}

export function synthesizeKeywordOpportunity(input: {
  cluster: KeywordCluster;
  snapshots: SignalSnapshot[];
  now?: string;
}): KeywordOpportunity {
  assertOpportunityScope(input.cluster, input.snapshots);
  const now = input.now ?? new Date().toISOString();
  const freshEligible: SignalSnapshot[] = [];
  let staleSignalsExcluded = 0;
  for (const snapshot of input.snapshots) {
    if (!snapshot.synthesisEligible) continue;
    if (signalSnapshotFreshness(snapshot, now).state === "stale") {
      staleSignalsExcluded += 1;
      continue;
    }
    freshEligible.push(snapshot);
  }
  const firstParty = freshEligible.filter((snapshot) => snapshot.source.sourceClass === "first_party");
  const external = freshEligible.filter((snapshot) => snapshot.source.sourceClass === "external");
  const distinctSourceTypes = new Set(freshEligible.map((snapshot) => snapshot.source.sourceType)).size;

  const firstPartyGap = boundedIndex(metricAverage(firstParty, "performance-gap-index") ?? 0);
  const demand = boundedIndex(metricAverage(freshEligible, "demand-index") ?? 0);
  const rawTrend = metricAverage(freshEligible, "trend-momentum-index") ?? -100;
  const positiveTrend = boundedIndex(50 + Math.max(-100, Math.min(100, rawTrend)) / 2);
  const competitorGap = boundedIndex(metricAverage(freshEligible, "competitor-gap-index") ?? 0);
  const serp = metricAverage(freshEligible, "serp-gap-index");
  const geo = metricAverage(freshEligible, "geo-gap-index");
  const serpGeoValues = [serp, geo].filter((value): value is number => value != null);
  const serpGeoGap = boundedIndex(average(serpGeoValues) ?? 0);
  const strategicFit = boundedIndex(metricAverage(freshEligible, "strategic-fit-index") ?? 0);

  const dimensions = { firstPartyGap, demand, positiveTrend, competitorGap, serpGeoGap, strategicFit };
  const score = round(
    firstPartyGap * 0.30
      + demand * 0.20
      + positiveTrend * 0.15
      + competitorGap * 0.20
      + serpGeoGap * 0.10
      + strategicFit * 0.05,
  );

  let evidenceClass: EvidenceClass = "insufficient";
  if (firstParty.length > 0 && external.length > 0 && distinctSourceTypes >= 2) evidenceClass = "corroborated";
  else if (firstParty.length > 0) evidenceClass = "first_party_only";
  else if (external.length > 0) evidenceClass = "exploratory_external_only";

  const blockers: string[] = [];
  if (firstParty.length === 0) blockers.push("first_party_signal_required_for_action");
  if (external.length === 0) blockers.push("approved_external_signal_required_for_corroboration");
  if (distinctSourceTypes < 2) blockers.push("multi_source_corroboration_required");
  blockers.push("task66_does_not_authorize_execution");

  const warnings: string[] = [];
  if (staleSignalsExcluded > 0) warnings.push("stale_signals_excluded");
  if (evidenceClass === "exploratory_external_only") warnings.push("external_demand_is_not_sufficient_for_action");

  const confidence = round(Math.min(1,
    0.15
      + (firstParty.length > 0 ? 0.25 : 0)
      + (external.length > 0 ? 0.20 : 0)
      + Math.min(3, distinctSourceTypes) * 0.10
      + Math.min(5, freshEligible.length) * 0.04,
  ));
  const planningReady = evidenceClass === "corroborated";
  const fingerprint = stableHash({
    version: TASK66_MARKET_INTELLIGENCE_VERSION,
    type: "keyword_opportunity",
    clusterFingerprint: input.cluster.fingerprint,
    signalFingerprints: freshEligible.map((snapshot) => snapshot.fingerprint).sort(),
    dimensions,
    score,
    evidenceClass,
  });
  return {
    opportunityId: `kwo-${fingerprint.slice(0, 24)}`,
    fingerprint,
    marketId: input.cluster.marketId,
    categoryId: input.cluster.categoryId,
    clusterId: input.cluster.clusterId,
    score,
    confidence,
    evidenceClass,
    planningReady,
    firstPartySignalCount: firstParty.length,
    externalSignalCount: external.length,
    distinctSourceTypes,
    staleSignalsExcluded,
    dimensions,
    blockers,
    warnings,
    safety: {
      advisoryOnly: true,
      actionEligible: false,
      automaticTransition: false,
      publicSiteWrites: false,
      providerWrites: false,
      executionAuthorized: false,
    },
  };
}

export function rankKeywordOpportunities(opportunities: KeywordOpportunity[]): KeywordOpportunity[] {
  return [...opportunities].sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.opportunityId.localeCompare(b.opportunityId));
}
