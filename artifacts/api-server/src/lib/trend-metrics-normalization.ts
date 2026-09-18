import { createHash } from "node:crypto";

export const P5_4_TREND_METRICS_VERSION = "p5.4-trend-metrics-v1" as const;
export const P5_4_TREND_SCALE = "relative_0_100_request_frame" as const;
export const P5_4_TREND_DIRECTION_THRESHOLD = 0.05 as const;
export const P5_4_MAX_TREND_POINTS = 400 as const;

export type TrendDirection = "rising" | "falling" | "flat" | "unavailable";

export type TrendMeasurementBasis = {
  providerKey: string;
  providerMethod: string;
  sourceFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  keywords: string[];
  locationCode: number;
  languageCode: string;
  property: "web";
  providerCategoryCode: 0;
  dateFrom: string;
  dateTo: string;
  scale: typeof P5_4_TREND_SCALE;
};

export type TrendPointInput = {
  dateFrom: string;
  dateTo: string;
  timestamp: number;
  missingData: boolean;
  values: Array<number | null>;
};

export type NormalizedTrendPoint = {
  dateFrom: string;
  dateTo: string;
  timestamp: number;
  missingData: boolean;
  values: Array<number | null>;
};

export type KeywordTrendSummary = {
  keyword: string;
  usablePointCount: number;
  missingPointCount: number;
  zeroInsufficientDataPointCount: number;
  latestRelativeIndex: number | null;
  meanRelativeIndex: number | null;
  peakRelativeIndex: number | null;
  earlyWindowMean: number | null;
  recentWindowMean: number | null;
  signedVelocity: number | null;
  positiveMomentum: number | null;
  volatility: number | null;
  coverageRatio: number;
  direction: TrendDirection;
};

export type TrendProjection = {
  version: typeof P5_4_TREND_METRICS_VERSION;
  projectionId: string;
  projectionFingerprint: string;
  frameFingerprint: string;
  basis: TrendMeasurementBasis;
  observedAt: string;
  points: NormalizedTrendPoint[];
  keywordSummaries: KeywordTrendSummary[];
  semantics: {
    crossFrameComparable: false;
    absoluteSearchVolume: false;
    zeroMeansInsufficientData: true;
    missingDataExcludedFromSummaries: true;
    descriptiveOnly: true;
  };
  safety: ReturnType<typeof trendMetricsCapability>;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const LANGUAGE = /^[a-z]{2,3}$/;
const KEY = /^[a-z0-9][a-z0-9._:-]{0,95}$/;

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
  const keyword = cleanText(value, "keyword", 80).toLowerCase();
  if (keyword.split(" ").length > 10) throw new Error("keyword_word_limit_exceeded");
  return keyword;
}

function canonicalTimestamp(value: unknown, name: string): string {
  const raw = cleanText(value, name, 64);
  const milliseconds = Date.parse(raw);
  if (!Number.isFinite(milliseconds)) throw new Error(`invalid_${name}`);
  return new Date(milliseconds).toISOString();
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

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return round6(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function normalizeBasis(input: TrendMeasurementBasis): TrendMeasurementBasis {
  const providerKey = cleanText(input.providerKey, "provider_key", 80).toLowerCase();
  const providerMethod = cleanText(input.providerMethod, "provider_method", 96).toLowerCase();
  if (!KEY.test(providerKey) || !KEY.test(providerMethod)) throw new Error("invalid_provider_basis");
  const sourceFingerprint = cleanText(input.sourceFingerprint, "source_fingerprint", 64).toLowerCase();
  const marketFingerprint = cleanText(input.marketFingerprint, "market_fingerprint", 64).toLowerCase();
  const categoryFingerprint = cleanText(input.categoryFingerprint, "category_fingerprint", 64).toLowerCase();
  if (![sourceFingerprint, marketFingerprint, categoryFingerprint].every((value) => HEX_64.test(value))) {
    throw new Error("invalid_basis_fingerprint");
  }
  if (!Array.isArray(input.keywords) || input.keywords.length < 1 || input.keywords.length > 5) {
    throw new Error("invalid_keywords");
  }
  const keywords = input.keywords.map(canonicalKeyword);
  const sorted = [...new Set(keywords)].sort((a, b) => a.localeCompare(b));
  if (sorted.length !== keywords.length || JSON.stringify(sorted) !== JSON.stringify(keywords)) {
    throw new Error("keywords_must_be_unique_sorted");
  }
  if (!Number.isInteger(input.locationCode) || input.locationCode < 1 || input.locationCode > 2_147_483_647) {
    throw new Error("invalid_location_code");
  }
  const languageCode = cleanText(input.languageCode, "language_code", 3).toLowerCase();
  if (!LANGUAGE.test(languageCode)) throw new Error("invalid_language_code");
  if (input.property !== "web") throw new Error("unsupported_trend_property");
  if (input.providerCategoryCode !== 0) throw new Error("provider_category_must_be_all");
  if (input.scale !== P5_4_TREND_SCALE) throw new Error("unsupported_trend_scale");
  const dateFrom = canonicalDate(input.dateFrom, "date_from");
  const dateTo = canonicalDate(input.dateTo, "date_to");
  if (Date.parse(`${dateFrom}T00:00:00Z`) > Date.parse(`${dateTo}T00:00:00Z`)) {
    throw new Error("invalid_date_range");
  }
  return {
    providerKey,
    providerMethod,
    sourceFingerprint,
    marketFingerprint,
    categoryFingerprint,
    keywords,
    locationCode: input.locationCode,
    languageCode,
    property: "web",
    providerCategoryCode: 0,
    dateFrom,
    dateTo,
    scale: P5_4_TREND_SCALE,
  };
}

function normalizePoints(points: TrendPointInput[], basis: TrendMeasurementBasis): NormalizedTrendPoint[] {
  if (!Array.isArray(points) || points.length === 0 || points.length > P5_4_MAX_TREND_POINTS) {
    throw new Error("invalid_trend_points");
  }
  const lower = Date.parse(`${basis.dateFrom}T00:00:00Z`);
  const upper = Date.parse(`${basis.dateTo}T23:59:59Z`);
  let previousTimestamp = -1;
  let previousDateTo = "";
  return points.map((point) => {
    if (!point || typeof point !== "object" || Array.isArray(point)) throw new Error("invalid_trend_point");
    const dateFrom = canonicalDate(point.dateFrom, "point_date_from");
    const dateTo = canonicalDate(point.dateTo, "point_date_to");
    if (dateFrom > dateTo) throw new Error("invalid_point_date_range");
    if (dateFrom < basis.dateFrom || dateTo > basis.dateTo) throw new Error("point_outside_request_frame");
    if (previousDateTo && dateFrom <= previousDateTo) throw new Error("overlapping_or_unsorted_trend_points");
    previousDateTo = dateTo;
    if (!Number.isInteger(point.timestamp) || point.timestamp < 0 || point.timestamp > 4_102_444_800) {
      throw new Error("invalid_point_timestamp");
    }
    const timestampMilliseconds = point.timestamp * 1000;
    if (timestampMilliseconds < lower || timestampMilliseconds > upper) throw new Error("timestamp_outside_request_frame");
    if (point.timestamp <= previousTimestamp) throw new Error("unsorted_trend_timestamps");
    previousTimestamp = point.timestamp;
    if (typeof point.missingData !== "boolean") throw new Error("invalid_missing_data_flag");
    if (!Array.isArray(point.values) || point.values.length !== basis.keywords.length) {
      throw new Error("trend_value_cardinality_mismatch");
    }
    const values = point.values.map((value) => {
      if (point.missingData) {
        if (value !== null) throw new Error("missing_point_requires_null_values");
        return null;
      }
      if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 100) {
        throw new Error("invalid_relative_trend_value");
      }
      return value as number;
    });
    return { dateFrom, dateTo, timestamp: point.timestamp, missingData: point.missingData, values };
  });
}

function summarizeKeyword(keyword: string, index: number, points: NormalizedTrendPoint[]): KeywordTrendSummary {
  const usable = points
    .filter((point) => !point.missingData)
    .map((point) => point.values[index])
    .filter((value): value is number => value !== null);
  const missingPointCount = points.length - usable.length;
  const zeroInsufficientDataPointCount = usable.filter((value) => value === 0).length;
  const coverageRatio = round6(usable.length / points.length);
  const latestRelativeIndex = usable.length ? usable[usable.length - 1]! : null;
  const meanRelativeIndex = mean(usable);
  const peakRelativeIndex = usable.length ? Math.max(...usable) : null;

  let earlyWindowMean: number | null = null;
  let recentWindowMean: number | null = null;
  let signedVelocity: number | null = null;
  let positiveMomentum: number | null = null;
  let direction: TrendDirection = "unavailable";
  if (usable.length >= 4) {
    const half = Math.floor(usable.length / 2);
    earlyWindowMean = mean(usable.slice(0, half));
    recentWindowMean = mean(usable.slice(usable.length - half));
    signedVelocity = round6(((recentWindowMean ?? 0) - (earlyWindowMean ?? 0)) / 100);
    positiveMomentum = round6(Math.max(0, signedVelocity));
    direction =
      signedVelocity >= P5_4_TREND_DIRECTION_THRESHOLD
        ? "rising"
        : signedVelocity <= -P5_4_TREND_DIRECTION_THRESHOLD
          ? "falling"
          : "flat";
  }

  let volatility: number | null = null;
  if (usable.length >= 2) {
    const changes = usable.slice(1).map((value, offset) => Math.abs(value - usable[offset]!));
    volatility = round6((mean(changes) ?? 0) / 100);
  }

  return {
    keyword,
    usablePointCount: usable.length,
    missingPointCount,
    zeroInsufficientDataPointCount,
    latestRelativeIndex,
    meanRelativeIndex,
    peakRelativeIndex,
    earlyWindowMean,
    recentWindowMean,
    signedVelocity,
    positiveMomentum,
    volatility,
    coverageRatio,
    direction,
  };
}

export function buildTrendProjection(input: {
  basis: TrendMeasurementBasis;
  observedAt: string;
  points: TrendPointInput[];
}): TrendProjection {
  const basis = normalizeBasis(input.basis);
  const observedAt = canonicalTimestamp(input.observedAt, "observed_at");
  if (Date.parse(observedAt) < Date.parse(`${basis.dateTo}T00:00:00Z`)) {
    throw new Error("observed_before_frame_end");
  }
  const frameFingerprint = hash({
    version: P5_4_TREND_METRICS_VERSION,
    basis,
  });
  const points = normalizePoints(input.points, basis);
  const keywordSummaries = basis.keywords.map((keyword, index) => summarizeKeyword(keyword, index, points));
  const identity = {
    frameFingerprint,
    observedAt,
    points,
    keywordSummaries,
  };
  const projectionFingerprint = hash({ version: P5_4_TREND_METRICS_VERSION, ...identity });
  return {
    version: P5_4_TREND_METRICS_VERSION,
    projectionId: `p54-trend-${projectionFingerprint.slice(0, 20)}`,
    projectionFingerprint,
    frameFingerprint,
    basis,
    observedAt,
    points,
    keywordSummaries,
    semantics: {
      crossFrameComparable: false,
      absoluteSearchVolume: false,
      zeroMeansInsufficientData: true,
      missingDataExcludedFromSummaries: true,
      descriptiveOnly: true,
    },
    safety: trendMetricsCapability(),
  };
}

export function trendMetricsCapability() {
  return Object.freeze({
    version: P5_4_TREND_METRICS_VERSION,
    providerNeutralSemantics: true,
    requestFrameBound: true,
    crossFrameComparable: false,
    absoluteSearchVolume: false,
    zeroMeansInsufficientData: true,
    descriptiveOnly: true,
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
