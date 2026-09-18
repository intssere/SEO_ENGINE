import { createHash } from "node:crypto";

export const P5_3_KEYWORD_METRICS_VERSION = "p5.3-keyword-metrics-v1" as const;
export const P5_3_MIN_OPPORTUNITY_COHORT = 10 as const;
export const P5_3_MAX_MONTHLY_SERIES = 60 as const;

export type KeywordSearchNetwork = "google" | "google_and_partners" | "provider_unspecified";
export type KeywordVariantScope = "exact_keyword" | "close_variants_included" | "provider_grouped" | "unknown";
export type PaidCompetitionLevel = "low" | "medium" | "high" | null;

export type KeywordMeasurementBasis = {
  providerKey: string;
  providerMethod: string;
  sourceFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  locationCode: number;
  languageCode: string;
  searchNetwork: KeywordSearchNetwork;
  variantScope: KeywordVariantScope;
  cpcCurrency: string;
  cpcBasis: string;
};

export type MonthlySearchVolume = {
  year: number;
  month: number;
  searches: number;
};

export type KeywordMetricProjection = {
  version: typeof P5_3_KEYWORD_METRICS_VERSION;
  projectionId: string;
  projectionFingerprint: string;
  basisFingerprint: string;
  keyword: string;
  observedAt: string;
  providerUpdatedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  basis: KeywordMeasurementBasis;
  searchVolume: {
    avgMonthly: number | null;
    monthly: MonthlySearchVolume[];
  };
  organicDifficulty: {
    score: number | null;
    ratio: number | null;
    method: string;
    target: "organic_top10";
    crossProviderComparable: false;
  };
  paid: {
    cpc: {
      amount: number | null;
      currency: string;
      basis: string;
    };
    competition: {
      ratio: number | null;
      index: number | null;
      level: PaidCompetitionLevel;
      basis: string;
    };
    bidLow: number | null;
    bidHigh: number | null;
  };
  diagnostics: string[];
  safety: ReturnType<typeof keywordMetricsCapability>;
};

export type KeywordOpportunityComponents = {
  demand: number;
  attainability: number;
  commercial: number;
};

export type KeywordOpportunityScore = {
  keyword: string;
  projectionFingerprint: string;
  score: number | null;
  components: KeywordOpportunityComponents | null;
  blockers: string[];
};

export type KeywordOpportunityCohort = {
  version: typeof P5_3_KEYWORD_METRICS_VERSION;
  cohortId: string;
  cohortFingerprint: string;
  basisFingerprint: string;
  eligibleCount: number;
  totalCount: number;
  scores: KeywordOpportunityScore[];
  safety: ReturnType<typeof keywordMetricsCapability>;
};

export type KeywordMetricProjectionInput = {
  keyword: string;
  observedAt: string;
  providerUpdatedAt?: string | null;
  basis: KeywordMeasurementBasis;
  avgMonthlySearchVolume: number | null;
  monthlySearches?: MonthlySearchVolume[] | null;
  organicDifficultyScore: number | null;
  organicDifficultyMethod: string;
  cpcAmount: number | null;
  paidCompetitionRatio: number | null;
  paidCompetitionIndex?: number | null;
  paidCompetitionLevel?: PaidCompetitionLevel;
  paidCompetitionBasis: string;
  bidLow?: number | null;
  bidHigh?: number | null;
  diagnostics?: string[];
};

const HEX_64 = /^[0-9a-f]{64}$/;
const CODE = /^[a-z0-9][a-z0-9._:-]{0,63}$/;
const LANGUAGE = /^[a-z]{2,3}$/;
const CURRENCY = /^[A-Z]{3}$/;
const TEXT_KEY = /^[a-z0-9][a-z0-9._:-]{0,95}$/;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function round6(value: number): number {
  return Number(value.toFixed(6));
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
  return cleanText(value, "keyword", 255).toLowerCase();
}

function canonicalTimestamp(value: unknown, name: string): string {
  const raw = cleanText(value, name, 64);
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) throw new Error(`invalid_${name}`);
  return new Date(ms).toISOString();
}

function optionalTimestamp(value: unknown, name: string): string | null {
  return value == null ? null : canonicalTimestamp(value, name);
}

function boundedIntegerOrNull(value: unknown, min: number, max: number, name: string): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw new Error(`invalid_${name}`);
  return value as number;
}

function boundedNumberOrNull(value: unknown, min: number, max: number, name: string): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`invalid_${name}`);
  return value;
}

function normalizedCode(value: unknown, name: string): string {
  const code = cleanText(value, name, 64).toLowerCase();
  if (!CODE.test(code)) throw new Error(`invalid_${name}`);
  return code;
}

function normalizedDiagnostics(values: string[] | undefined): string[] {
  if (!values) return [];
  if (!Array.isArray(values) || values.length > 16) throw new Error("invalid_diagnostics");
  return [...new Set(values.map((value) => normalizedCode(value, "diagnostic")))].sort((a, b) => a.localeCompare(b));
}

function normalizeBasis(input: KeywordMeasurementBasis): KeywordMeasurementBasis {
  const providerKey = cleanText(input.providerKey, "provider_key", 80).toLowerCase();
  const providerMethod = cleanText(input.providerMethod, "provider_method", 96).toLowerCase();
  if (!TEXT_KEY.test(providerKey) || !TEXT_KEY.test(providerMethod)) throw new Error("invalid_provider_basis");
  const sourceFingerprint = cleanText(input.sourceFingerprint, "source_fingerprint", 64).toLowerCase();
  const marketFingerprint = cleanText(input.marketFingerprint, "market_fingerprint", 64).toLowerCase();
  const categoryFingerprint = cleanText(input.categoryFingerprint, "category_fingerprint", 64).toLowerCase();
  if (![sourceFingerprint, marketFingerprint, categoryFingerprint].every((value) => HEX_64.test(value))) {
    throw new Error("invalid_basis_fingerprint");
  }
  if (!Number.isInteger(input.locationCode) || input.locationCode < 1 || input.locationCode > 2_147_483_647) {
    throw new Error("invalid_location_code");
  }
  const languageCode = cleanText(input.languageCode, "language_code", 3).toLowerCase();
  if (!LANGUAGE.test(languageCode)) throw new Error("invalid_language_code");
  if (!["google", "google_and_partners", "provider_unspecified"].includes(input.searchNetwork)) {
    throw new Error("invalid_search_network");
  }
  if (!["exact_keyword", "close_variants_included", "provider_grouped", "unknown"].includes(input.variantScope)) {
    throw new Error("invalid_variant_scope");
  }
  const cpcCurrency = cleanText(input.cpcCurrency, "cpc_currency", 3).toUpperCase();
  if (!CURRENCY.test(cpcCurrency)) throw new Error("invalid_cpc_currency");
  const cpcBasis = cleanText(input.cpcBasis, "cpc_basis", 96).toLowerCase();
  if (!TEXT_KEY.test(cpcBasis)) throw new Error("invalid_cpc_basis");
  return {
    providerKey,
    providerMethod,
    sourceFingerprint,
    marketFingerprint,
    categoryFingerprint,
    locationCode: input.locationCode,
    languageCode,
    searchNetwork: input.searchNetwork,
    variantScope: input.variantScope,
    cpcCurrency,
    cpcBasis,
  };
}

function normalizeMonthly(values: MonthlySearchVolume[] | null | undefined): MonthlySearchVolume[] {
  if (values == null) return [];
  if (!Array.isArray(values) || values.length > P5_3_MAX_MONTHLY_SERIES) throw new Error("invalid_monthly_searches");
  const seen = new Set<string>();
  const result = values.map((value) => {
    if (!value || typeof value !== "object") throw new Error("invalid_monthly_search");
    const year = boundedIntegerOrNull(value.year, 2000, 2200, "monthly_year");
    const month = boundedIntegerOrNull(value.month, 1, 12, "monthly_month");
    const searches = boundedIntegerOrNull(value.searches, 0, 1_000_000_000_000, "monthly_search_volume");
    if (year == null || month == null || searches == null) throw new Error("invalid_monthly_search");
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (seen.has(key)) throw new Error("duplicate_monthly_search");
    seen.add(key);
    return { year, month, searches };
  });
  return result.sort((a, b) => a.year - b.year || a.month - b.month);
}

function periodBounds(monthly: MonthlySearchVolume[]): { periodStart: string | null; periodEnd: string | null } {
  if (monthly.length === 0) return { periodStart: null, periodEnd: null };
  const first = monthly[0]!;
  const last = monthly[monthly.length - 1]!;
  return {
    periodStart: `${first.year}-${String(first.month).padStart(2, "0")}`,
    periodEnd: `${last.year}-${String(last.month).padStart(2, "0")}`,
  };
}

export function buildKeywordMetricProjection(input: KeywordMetricProjectionInput): KeywordMetricProjection {
  const keyword = canonicalKeyword(input.keyword);
  const observedAt = canonicalTimestamp(input.observedAt, "observed_at");
  const providerUpdatedAt = optionalTimestamp(input.providerUpdatedAt, "provider_updated_at");
  if (providerUpdatedAt && Date.parse(providerUpdatedAt) > Date.parse(observedAt)) {
    throw new Error("provider_updated_at_in_future");
  }
  const basis = normalizeBasis(input.basis);
  const basisFingerprint = hash({ version: P5_3_KEYWORD_METRICS_VERSION, basis });
  const monthly = normalizeMonthly(input.monthlySearches);
  const { periodStart, periodEnd } = periodBounds(monthly);
  const avgMonthly = boundedIntegerOrNull(input.avgMonthlySearchVolume, 0, 1_000_000_000_000, "avg_monthly_search_volume");
  const difficulty = boundedIntegerOrNull(input.organicDifficultyScore, 0, 100, "organic_difficulty");
  const cpc = boundedNumberOrNull(input.cpcAmount, 0, 1_000_000, "cpc");
  const competitionRatio = boundedNumberOrNull(input.paidCompetitionRatio, 0, 1, "paid_competition_ratio");
  const competitionIndex = boundedIntegerOrNull(input.paidCompetitionIndex ?? null, 0, 100, "paid_competition_index");
  if (competitionRatio != null && competitionIndex != null && Math.abs(competitionRatio * 100 - competitionIndex) > 1.000001) {
    throw new Error("paid_competition_ratio_index_mismatch");
  }
  const level = input.paidCompetitionLevel ?? null;
  if (level !== null && !["low", "medium", "high"].includes(level)) throw new Error("invalid_paid_competition_level");
  const bidLow = boundedNumberOrNull(input.bidLow ?? null, 0, 1_000_000, "bid_low");
  const bidHigh = boundedNumberOrNull(input.bidHigh ?? null, 0, 1_000_000, "bid_high");
  if (bidLow != null && bidHigh != null && bidLow > bidHigh) throw new Error("invalid_bid_range");
  const organicDifficultyMethod = cleanText(input.organicDifficultyMethod, "organic_difficulty_method", 96).toLowerCase();
  if (!TEXT_KEY.test(organicDifficultyMethod)) throw new Error("invalid_organic_difficulty_method");
  const paidCompetitionBasis = cleanText(input.paidCompetitionBasis, "paid_competition_basis", 96).toLowerCase();
  if (!TEXT_KEY.test(paidCompetitionBasis)) throw new Error("invalid_paid_competition_basis");
  const diagnostics = normalizedDiagnostics(input.diagnostics);

  const identity = {
    basisFingerprint,
    keyword,
    observedAt,
    providerUpdatedAt,
    periodStart,
    periodEnd,
    searchVolume: { avgMonthly, monthly },
    organicDifficulty: {
      score: difficulty,
      ratio: difficulty == null ? null : round6(difficulty / 100),
      method: organicDifficultyMethod,
      target: "organic_top10" as const,
      crossProviderComparable: false as const,
    },
    paid: {
      cpc: { amount: cpc, currency: basis.cpcCurrency, basis: basis.cpcBasis },
      competition: { ratio: competitionRatio, index: competitionIndex, level, basis: paidCompetitionBasis },
      bidLow,
      bidHigh,
    },
    diagnostics,
  };
  const projectionFingerprint = hash({ version: P5_3_KEYWORD_METRICS_VERSION, ...identity });
  return {
    version: P5_3_KEYWORD_METRICS_VERSION,
    projectionId: `p53-kw-${projectionFingerprint.slice(0, 20)}`,
    projectionFingerprint,
    ...identity,
    basis,
    safety: keywordMetricsCapability(),
  };
}

function midrankPercentiles<T>(items: T[], value: (item: T) => number): Map<T, number> {
  const sorted = [...items].sort((a, b) => value(a) - value(b));
  const result = new Map<T, number>();
  if (sorted.length === 1) {
    result.set(sorted[0]!, 50);
    return result;
  }
  let index = 0;
  while (index < sorted.length) {
    const current = value(sorted[index]!);
    let end = index;
    while (end + 1 < sorted.length && value(sorted[end + 1]!) === current) end += 1;
    const averageRankOneBased = ((index + 1) + (end + 1)) / 2;
    const percentile = round6(((averageRankOneBased - 1) / (sorted.length - 1)) * 100);
    for (let i = index; i <= end; i += 1) result.set(sorted[i]!, percentile);
    index = end + 1;
  }
  return result;
}

function missingMetricBlockers(projection: KeywordMetricProjection): string[] {
  const blockers: string[] = [];
  if (projection.searchVolume.avgMonthly == null) blockers.push("search_volume_missing");
  if (projection.organicDifficulty.score == null) blockers.push("organic_difficulty_missing");
  if (projection.paid.cpc.amount == null && projection.paid.competition.ratio == null) {
    blockers.push("commercial_signal_missing");
  }
  return blockers;
}

export function scoreKeywordOpportunityCohort(
  projections: KeywordMetricProjection[],
): KeywordOpportunityCohort {
  if (!Array.isArray(projections) || projections.length === 0 || projections.length > 500) {
    throw new Error("invalid_keyword_opportunity_cohort");
  }
  const basisFingerprint = projections[0]!.basisFingerprint;
  if (!HEX_64.test(basisFingerprint)) throw new Error("invalid_basis_fingerprint");
  const keywordSet = new Set<string>();
  const projectionSet = new Set<string>();
  for (const projection of projections) {
    if (projection.version !== P5_3_KEYWORD_METRICS_VERSION) throw new Error("unsupported_keyword_metrics_version");
    if (projection.basisFingerprint !== basisFingerprint) throw new Error("heterogeneous_keyword_opportunity_cohort");
    if (keywordSet.has(projection.keyword)) throw new Error("duplicate_keyword_in_cohort");
    if (projectionSet.has(projection.projectionFingerprint)) throw new Error("duplicate_projection_in_cohort");
    keywordSet.add(projection.keyword);
    projectionSet.add(projection.projectionFingerprint);
  }

  const eligible = projections.filter((projection) => missingMetricBlockers(projection).length === 0);
  const insufficientCohort = eligible.length < P5_3_MIN_OPPORTUNITY_COHORT;

  let volumePercentiles = new Map<KeywordMetricProjection, number>();
  let difficultyPercentiles = new Map<KeywordMetricProjection, number>();
  let cpcPercentiles = new Map<KeywordMetricProjection, number>();
  let competitionPercentiles = new Map<KeywordMetricProjection, number>();

  if (!insufficientCohort) {
    volumePercentiles = midrankPercentiles(eligible, (projection) => projection.searchVolume.avgMonthly!);
    difficultyPercentiles = midrankPercentiles(eligible, (projection) => projection.organicDifficulty.score!);
    const cpcEligible = eligible.filter((projection) => projection.paid.cpc.amount != null);
    const competitionEligible = eligible.filter((projection) => projection.paid.competition.ratio != null);
    if (cpcEligible.length) cpcPercentiles = midrankPercentiles(cpcEligible, (projection) => projection.paid.cpc.amount!);
    if (competitionEligible.length) {
      competitionPercentiles = midrankPercentiles(competitionEligible, (projection) => projection.paid.competition.ratio!);
    }
  }

  const scores = [...projections]
    .sort((a, b) => a.keyword.localeCompare(b.keyword))
    .map((projection): KeywordOpportunityScore => {
      const blockers = missingMetricBlockers(projection);
      if (insufficientCohort) blockers.push("insufficient_comparison_cohort");
      const uniqueBlockers = [...new Set(blockers)].sort();
      if (uniqueBlockers.length) {
        return {
          keyword: projection.keyword,
          projectionFingerprint: projection.projectionFingerprint,
          score: null,
          components: null,
          blockers: uniqueBlockers,
        };
      }
      const demand = volumePercentiles.get(projection)!;
      const difficultyPercentile = difficultyPercentiles.get(projection)!;
      const attainability = round6(100 - difficultyPercentile);
      const commercialSignals = [
        cpcPercentiles.get(projection),
        competitionPercentiles.get(projection),
      ].filter((value): value is number => value != null);
      if (commercialSignals.length === 0) throw new Error("commercial_percentile_missing");
      const commercial = round6(commercialSignals.reduce((sum, value) => sum + value, 0) / commercialSignals.length);
      const score = round6(0.45 * demand + 0.35 * attainability + 0.20 * commercial);
      return {
        keyword: projection.keyword,
        projectionFingerprint: projection.projectionFingerprint,
        score,
        components: { demand, attainability, commercial },
        blockers: [],
      };
    });

  const identity = {
    basisFingerprint,
    minimumEligibleCount: P5_3_MIN_OPPORTUNITY_COHORT,
    weights: { demand: 0.45, attainability: 0.35, commercial: 0.20 },
    eligibleProjectionFingerprints: eligible.map((value) => value.projectionFingerprint).sort(),
    totalProjectionFingerprints: projections.map((value) => value.projectionFingerprint).sort(),
    scores,
  };
  const cohortFingerprint = hash({ version: P5_3_KEYWORD_METRICS_VERSION, ...identity });
  return {
    version: P5_3_KEYWORD_METRICS_VERSION,
    cohortId: `p53-cohort-${cohortFingerprint.slice(0, 20)}`,
    cohortFingerprint,
    basisFingerprint,
    eligibleCount: eligible.length,
    totalCount: projections.length,
    scores,
    safety: keywordMetricsCapability(),
  };
}

export function keywordMetricsCapability() {
  return Object.freeze({
    version: P5_3_KEYWORD_METRICS_VERSION,
    providerNeutralSemantics: true,
    nullDistinctFromZero: true,
    paidCompetitionDistinctFromOrganicDifficulty: true,
    crossProviderDifficultyComparable: false,
    implicitCurrencyConversionAuthorized: false,
    fabricatedCpcAuthorized: false,
    opportunityCohortRelativeOnly: true,
    confidenceFoldedIntoOpportunityScore: false,
    liveCollectionAuthorized: false,
    providerEnrollmentAuthorized: false,
    credentialUseAuthorized: false,
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
