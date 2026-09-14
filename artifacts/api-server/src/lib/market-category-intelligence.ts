import { createHash } from "node:crypto";

export const MARKET_CATEGORY_INTELLIGENCE_VERSION = "task66-market-category-intelligence-v1" as const;

export type MarketProfileInput = {
  countryCode: string;
  language: string;
  searchEngine?: "google" | "bing" | "other";
  searchLocale?: string | null;
  currency?: string | null;
  device?: "all" | "desktop" | "mobile" | "tablet";
};

export type MarketProfile = {
  version: typeof MARKET_CATEGORY_INTELLIGENCE_VERSION;
  marketId: string;
  fingerprint: string;
  countryCode: string;
  language: string;
  searchEngine: "google" | "bing" | "other";
  searchLocale: string | null;
  currency: string | null;
  device: "all" | "desktop" | "mobile" | "tablet";
};

export type CategoryContextInput = {
  key: string;
  name: string;
  taxonomyPath?: string[];
};

export type CategoryContext = {
  version: typeof MARKET_CATEGORY_INTELLIGENCE_VERSION;
  categoryId: string;
  fingerprint: string;
  key: string;
  name: string;
  taxonomyPath: string[];
};

export type SignalSourceClass = "first_party" | "external";
export type SignalType = "keyword" | "trend" | "serp" | "entity" | "competitor" | "analytics" | "catalog" | "geo_aio";

export type SignalSnapshotInput = {
  sourceClass: SignalSourceClass;
  source: string;
  signalType: SignalType;
  observedAt: string;
  market: MarketProfile;
  category: CategoryContext;
  terms?: string[];
  metrics?: Record<string, number>;
  provenance?: Record<string, string | number | boolean | null>;
};

export type SignalSnapshot = {
  version: typeof MARKET_CATEGORY_INTELLIGENCE_VERSION;
  snapshotId: string;
  fingerprint: string;
  sourceClass: SignalSourceClass;
  source: string;
  signalType: SignalType;
  observedAt: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  terms: string[];
  metrics: Record<string, number>;
  provenance: Record<string, string | number | boolean | null>;
};

export type CategoryCompetitorRelevanceInput = {
  domain: string;
  marketMatch: number;
  categoryMatch: number;
  keywordOverlap: number;
  pageTypeMatch: number;
  entityOverlap: number;
  freshnessDays: number | null;
  manuallyReviewed: boolean;
};

export type CategoryCompetitorRelevance = {
  score: number;
  components: {
    category: number;
    keyword: number;
    pageType: number;
    entity: number;
    market: number;
    freshness: number;
  };
  eligibleForAdmission: boolean;
  blockers: string[];
};

export type OpportunitySynthesisInput = {
  market: MarketProfile;
  category: CategoryContext;
  firstPartySupport: number;
  externalSupport: number;
  competitorGap: number;
  trendVelocity: number;
  intentFit: number;
  confidence: number;
  rawSearchVolumeOnly?: boolean;
};

export type OpportunitySynthesis = {
  version: typeof MARKET_CATEGORY_INTELLIGENCE_VERSION;
  opportunityFingerprint: string;
  score: number;
  components: {
    firstParty: number;
    external: number;
    competitorGap: number;
    trendVelocity: number;
    intentFit: number;
    confidence: number;
  };
  lifecycle: "advisory" | "blocked";
  blockers: string[];
  safety: {
    advisoryOnly: true;
    automaticTransition: false;
    executionAuthorized: false;
    persistenceAuthorized: false;
    schedulerEnabled: false;
    autonomousWorkerEnabled: false;
    publicSiteWrites: false;
    providerWrites: false;
    schemaMutationRequired: false;
  };
};

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function cleanText(value: unknown, max = 120): string {
  if (typeof value !== "string") throw new Error("invalid_text");
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max) throw new Error("invalid_text");
  return normalized;
}

function bounded01(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`invalid_${field}`);
  return value;
}

function sortedUnique(values: string[] | undefined): string[] {
  if (!values) return [];
  return [...new Set(values.map((value) => cleanText(value).toLowerCase()))].sort((a, b) => a.localeCompare(b));
}

function sortedNumericRecord(value: Record<string, number> | undefined): Record<string, number> {
  const result: Record<string, number> = {};
  for (const key of Object.keys(value ?? {}).sort()) {
    if (!/^[a-zA-Z0-9._-]{1,64}$/.test(key)) throw new Error("invalid_metric_key");
    const metric = value![key]!;
    if (!Number.isFinite(metric)) throw new Error("invalid_metric_value");
    result[key] = metric;
  }
  return result;
}

function sortedProvenance(value: SignalSnapshotInput["provenance"]): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {};
  for (const key of Object.keys(value ?? {}).sort()) {
    if (!/^[a-zA-Z0-9._-]{1,64}$/.test(key)) throw new Error("invalid_provenance_key");
    const raw = value![key]!;
    if (raw === null || typeof raw === "number" || typeof raw === "boolean") {
      result[key] = raw;
    } else {
      result[key] = cleanText(raw, 240);
    }
  }
  return result;
}

export function normalizeMarketProfile(input: MarketProfileInput): MarketProfile {
  const countryCode = cleanText(input.countryCode, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error("invalid_country_code");
  const language = cleanText(input.language, 35).toLowerCase();
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(language)) throw new Error("invalid_language");
  const searchEngine = input.searchEngine ?? "google";
  const searchLocale = input.searchLocale == null ? null : cleanText(input.searchLocale, 35).toLowerCase();
  const currency = input.currency == null ? null : cleanText(input.currency, 3).toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) throw new Error("invalid_currency");
  const device = input.device ?? "all";
  const identity = { countryCode, language, searchEngine, searchLocale, currency, device };
  const fingerprint = stableHash({ version: MARKET_CATEGORY_INTELLIGENCE_VERSION, ...identity });
  return {
    version: MARKET_CATEGORY_INTELLIGENCE_VERSION,
    marketId: `mkt-${fingerprint.slice(0, 24)}`,
    fingerprint,
    ...identity,
  };
}

export function normalizeCategoryContext(input: CategoryContextInput): CategoryContext {
  const key = cleanText(input.key, 80).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(key)) throw new Error("invalid_category_key");
  const name = cleanText(input.name, 120);
  const taxonomyPath = sortedUnique(input.taxonomyPath);
  const fingerprint = stableHash({ version: MARKET_CATEGORY_INTELLIGENCE_VERSION, key, name: name.toLowerCase(), taxonomyPath });
  return {
    version: MARKET_CATEGORY_INTELLIGENCE_VERSION,
    categoryId: `cat-${fingerprint.slice(0, 24)}`,
    fingerprint,
    key,
    name,
    taxonomyPath,
  };
}

export function normalizeSignalSnapshot(input: SignalSnapshotInput): SignalSnapshot {
  const source = cleanText(input.source, 120);
  const observedMs = Date.parse(input.observedAt);
  if (!Number.isFinite(observedMs)) throw new Error("invalid_observed_at");
  const observedAt = new Date(observedMs).toISOString();
  const terms = sortedUnique(input.terms);
  const metrics = sortedNumericRecord(input.metrics);
  const provenance = sortedProvenance(input.provenance);
  const identity = {
    sourceClass: input.sourceClass,
    source: source.toLowerCase(),
    signalType: input.signalType,
    observedAt,
    marketFingerprint: input.market.fingerprint,
    categoryFingerprint: input.category.fingerprint,
    terms,
    metrics,
    provenance,
  };
  const fingerprint = stableHash({ version: MARKET_CATEGORY_INTELLIGENCE_VERSION, ...identity });
  return {
    version: MARKET_CATEGORY_INTELLIGENCE_VERSION,
    snapshotId: `sig-${fingerprint.slice(0, 24)}`,
    fingerprint,
    ...identity,
    source,
  };
}

export function scoreCategoryCompetitorRelevance(input: CategoryCompetitorRelevanceInput): CategoryCompetitorRelevance {
  const category = Math.round(bounded01(input.categoryMatch, "category_match") * 30);
  const keyword = Math.round(bounded01(input.keywordOverlap, "keyword_overlap") * 25);
  const pageType = Math.round(bounded01(input.pageTypeMatch, "page_type_match") * 15);
  const entity = Math.round(bounded01(input.entityOverlap, "entity_overlap") * 10);
  const market = Math.round(bounded01(input.marketMatch, "market_match") * 10);
  if (input.freshnessDays != null && (!Number.isInteger(input.freshnessDays) || input.freshnessDays < 0)) throw new Error("invalid_freshness_days");
  const freshness = input.freshnessDays == null ? 5 : input.freshnessDays <= 7 ? 10 : input.freshnessDays <= 30 ? 8 : input.freshnessDays <= 90 ? 5 : input.freshnessDays <= 365 ? 2 : 0;
  const blockers: string[] = [];
  if (!input.manuallyReviewed) blockers.push("manual_review_required");
  if (market < 5) blockers.push("market_relevance_too_low");
  if (category < 15) blockers.push("category_relevance_too_low");
  const score = category + keyword + pageType + entity + market + freshness;
  return {
    score,
    components: { category, keyword, pageType, entity, market, freshness },
    eligibleForAdmission: blockers.length === 0,
    blockers,
  };
}

export function synthesizeTrendKeywordOpportunity(input: OpportunitySynthesisInput): OpportunitySynthesis {
  const firstParty = Math.round(bounded01(input.firstPartySupport, "first_party_support") * 30);
  const external = Math.round(bounded01(input.externalSupport, "external_support") * 15);
  const competitorGap = Math.round(bounded01(input.competitorGap, "competitor_gap") * 20);
  const trendVelocity = Math.round(bounded01(input.trendVelocity, "trend_velocity") * 15);
  const intentFit = Math.round(bounded01(input.intentFit, "intent_fit") * 10);
  const confidence = Math.round(bounded01(input.confidence, "confidence") * 10);
  const blockers: string[] = [];
  if (input.rawSearchVolumeOnly) blockers.push("raw_search_volume_is_insufficient_evidence");
  if (firstParty === 0 && external < 8) blockers.push("insufficient_evidence_support");
  if (confidence < 5) blockers.push("confidence_too_low");
  const score = firstParty + external + competitorGap + trendVelocity + intentFit + confidence;
  const fingerprint = stableHash({
    version: MARKET_CATEGORY_INTELLIGENCE_VERSION,
    marketFingerprint: input.market.fingerprint,
    categoryFingerprint: input.category.fingerprint,
    components: { firstParty, external, competitorGap, trendVelocity, intentFit, confidence },
    rawSearchVolumeOnly: Boolean(input.rawSearchVolumeOnly),
  });
  return {
    version: MARKET_CATEGORY_INTELLIGENCE_VERSION,
    opportunityFingerprint: fingerprint,
    score,
    components: { firstParty, external, competitorGap, trendVelocity, intentFit, confidence },
    lifecycle: blockers.length ? "blocked" : "advisory",
    blockers,
    safety: {
      advisoryOnly: true,
      automaticTransition: false,
      executionAuthorized: false,
      persistenceAuthorized: false,
      schedulerEnabled: false,
      autonomousWorkerEnabled: false,
      publicSiteWrites: false,
      providerWrites: false,
      schemaMutationRequired: false,
    },
  };
}

export function marketCategoryIntelligenceCapability() {
  return Object.freeze({
    version: MARKET_CATEGORY_INTELLIGENCE_VERSION,
    categoryAware: true,
    marketAware: true,
    firstPartyExternalSeparated: true,
    trendVelocitySupported: true,
    keywordIntentSupported: true,
    competitorRelevanceScoringSupported: true,
    advisoryOnly: true,
    liveCollectionAuthorized: false,
    evidencePersistenceAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    schedulerEnabled: false,
    batchEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    publicSiteWrites: false,
    providerWrites: false,
    automaticTransition: false,
    schemaMutationRequired: false,
  });
}
