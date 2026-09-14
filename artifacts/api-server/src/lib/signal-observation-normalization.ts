import { createHash } from "node:crypto";
import type { CategoryContext, MarketProfile, SignalSourceClass, SignalType } from "./market-category-intelligence.js";
import { sourceEligibility, type RefreshPlanItem, type SignalSourceDescriptor } from "./signal-source-registry.js";

export const SIGNAL_OBSERVATION_NORMALIZATION_VERSION = "task68-source-adapter-observation-normalization-v1" as const;

export type AdapterStatus = "success" | "empty" | "partial" | "error";

export type NormalizedMetric = {
  key: string;
  value: number;
  unit: string | null;
};

export type SourceAdapterRequest = {
  version: typeof SIGNAL_OBSERVATION_NORMALIZATION_VERSION;
  requestId: string;
  requestFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceClass: SignalSourceClass;
  collectionMode: SignalSourceDescriptor["collectionMode"];
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: SignalType;
  planId: string | null;
  planFingerprint: string | null;
  safety: ReturnType<typeof signalObservationNormalizationCapability>;
};

export type NormalizedSignalObservation = {
  version: typeof SIGNAL_OBSERVATION_NORMALIZATION_VERSION;
  observationId: string;
  observationFingerprint: string;
  streamId: string;
  requestId: string;
  requestFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceClass: SignalSourceClass;
  trustClass: SignalSourceDescriptor["trustClass"];
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: SignalType;
  observedAt: string;
  normalizedAt: string;
  status: AdapterStatus;
  metrics: NormalizedMetric[];
  diagnostics: string[];
  errorCode: string | null;
  sourceQuality: number;
  completeness: number;
  confidence: number;
  positiveEvidence: boolean;
  safety: ReturnType<typeof signalObservationNormalizationCapability>;
};

export type ObservationBatch = {
  version: typeof SIGNAL_OBSERVATION_NORMALIZATION_VERSION;
  batchId: string;
  batchFingerprint: string;
  marketFingerprint: string;
  categoryFingerprint: string;
  observations: NormalizedSignalObservation[];
  safety: ReturnType<typeof signalObservationNormalizationCapability>;
};

const RESULT_KEYS = new Set([
  "requestFingerprint",
  "sourceId",
  "sourceFingerprint",
  "sourceClass",
  "marketFingerprint",
  "categoryFingerprint",
  "signalType",
  "observedAt",
  "status",
  "metrics",
  "diagnostics",
  "errorCode",
  "completeness",
]);
const METRIC_KEYS = new Set(["key", "value", "unit"]);
const STATUSES = new Set<AdapterStatus>(["success", "empty", "partial", "error"]);
const HEX_64 = /^[0-9a-f]{64}$/;
const PLAN_ID = /^srp-[0-9a-f]{24}$/;
const METRIC_KEY = /^[a-z][a-z0-9_.-]{0,63}$/;
const CODE = /^[a-z0-9][a-z0-9._:-]{0,63}$/;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function plainObject(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`invalid_${name}`);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw new Error(`invalid_${name}`);
  return value as Record<string, unknown>;
}

function assertOnlyKeys(value: Record<string, unknown>, allowed: Set<string>, name: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`unexpected_${name}_field:${key}`);
  }
}

function stringValue(value: unknown, name: string, max = 128): string {
  if (typeof value !== "string") throw new Error(`invalid_${name}`);
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max) throw new Error(`invalid_${name}`);
  return normalized;
}

function fingerprintValue(value: unknown, name: string): string {
  const normalized = stringValue(value, name, 64).toLowerCase();
  if (!HEX_64.test(normalized)) throw new Error(`invalid_${name}`);
  return normalized;
}

function isoTimestamp(value: unknown, name: string): string {
  const raw = stringValue(value, name, 64);
  const milliseconds = Date.parse(raw);
  if (!Number.isFinite(milliseconds)) throw new Error(`invalid_${name}`);
  return new Date(milliseconds).toISOString();
}

function boundedNumber(value: unknown, min: number, max: number, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`invalid_${name}`);
  return value;
}

function normalizedCode(value: unknown, name: string): string {
  const code = stringValue(value, name, 64).toLowerCase();
  if (!CODE.test(code)) throw new Error(`invalid_${name}`);
  return code;
}

function normalizedCodes(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 16) throw new Error("invalid_diagnostics");
  const codes = value.map((item) => normalizedCode(item, "diagnostic"));
  return [...new Set(codes)].sort((a, b) => a.localeCompare(b));
}

function normalizeMetrics(value: unknown): NormalizedMetric[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 64) throw new Error("invalid_metrics");
  const seen = new Set<string>();
  const metrics = value.map((item) => {
    const record = plainObject(item, "metric");
    assertOnlyKeys(record, METRIC_KEYS, "metric");
    const key = stringValue(record.key, "metric_key", 64).toLowerCase();
    if (!METRIC_KEY.test(key)) throw new Error("invalid_metric_key");
    if (seen.has(key)) throw new Error("duplicate_metric_key");
    seen.add(key);
    const metricValue = boundedNumber(record.value, -1_000_000_000_000_000, 1_000_000_000_000_000, "metric_value");
    let unit: string | null = null;
    if (record.unit !== undefined && record.unit !== null) {
      unit = stringValue(record.unit, "metric_unit", 32).toLowerCase();
      if (!/^[a-z0-9%/_.:$-]+$/.test(unit)) throw new Error("invalid_metric_unit");
    }
    return { key, value: metricValue, unit };
  });
  return metrics.sort((a, b) => a.key.localeCompare(b.key));
}

function validatePlanLineage(planId: string | null | undefined, planFingerprint: string | null | undefined): { planId: string | null; planFingerprint: string | null } {
  const hasId = planId !== undefined && planId !== null;
  const hasFingerprint = planFingerprint !== undefined && planFingerprint !== null;
  if (hasId !== hasFingerprint) throw new Error("incomplete_refresh_plan_lineage");
  if (!hasId) return { planId: null, planFingerprint: null };
  const normalizedId = stringValue(planId, "plan_id", 40).toLowerCase();
  const normalizedFingerprint = fingerprintValue(planFingerprint, "plan_fingerprint");
  if (!PLAN_ID.test(normalizedId)) throw new Error("invalid_plan_id");
  return { planId: normalizedId, planFingerprint: normalizedFingerprint };
}

export function buildSourceAdapterRequest(input: {
  source: SignalSourceDescriptor;
  planItem: RefreshPlanItem;
  market: MarketProfile;
  category: CategoryContext;
  planId?: string | null;
  planFingerprint?: string | null;
}): SourceAdapterRequest {
  const { source, planItem, market, category } = input;
  if (planItem.sourceId !== source.sourceId) throw new Error("source_id_mismatch");
  if (planItem.sourceFingerprint !== source.fingerprint) throw new Error("source_fingerprint_mismatch");
  if (planItem.sourceClass !== source.sourceClass) throw new Error("source_class_mismatch");
  const eligibility = sourceEligibility(source, market, category, planItem.signalType);
  if (!eligibility.eligible) throw new Error(`source_not_eligible:${eligibility.blockers.join(",")}`);
  const lineage = validatePlanLineage(input.planId, input.planFingerprint);
  const identity = {
    sourceId: source.sourceId,
    sourceFingerprint: source.fingerprint,
    sourceClass: source.sourceClass,
    collectionMode: source.collectionMode,
    marketFingerprint: market.fingerprint,
    categoryFingerprint: category.fingerprint,
    signalType: planItem.signalType,
    planId: lineage.planId,
    planFingerprint: lineage.planFingerprint,
  };
  const requestFingerprint = hash({ version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION, ...identity });
  return {
    version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
    requestId: `sar-${requestFingerprint.slice(0, 24)}`,
    requestFingerprint,
    ...identity,
    safety: signalObservationNormalizationCapability(),
  };
}

export function normalizeAdapterResult(input: {
  request: SourceAdapterRequest;
  source: SignalSourceDescriptor;
  result: unknown;
  normalizedAt: string;
}): NormalizedSignalObservation {
  const { request, source } = input;
  if (request.version !== SIGNAL_OBSERVATION_NORMALIZATION_VERSION) throw new Error("unsupported_request_version");
  if (request.sourceId !== source.sourceId) throw new Error("request_source_id_mismatch");
  if (request.sourceFingerprint !== source.fingerprint) throw new Error("request_source_fingerprint_mismatch");
  if (request.sourceClass !== source.sourceClass) throw new Error("request_source_class_mismatch");

  const result = plainObject(input.result, "adapter_result");
  assertOnlyKeys(result, RESULT_KEYS, "adapter_result");
  if (fingerprintValue(result.requestFingerprint, "request_fingerprint") !== request.requestFingerprint) throw new Error("request_fingerprint_mismatch");
  if (stringValue(result.sourceId, "source_id", 40) !== request.sourceId) throw new Error("source_id_mismatch");
  if (fingerprintValue(result.sourceFingerprint, "source_fingerprint") !== request.sourceFingerprint) throw new Error("source_fingerprint_mismatch");
  if (result.sourceClass !== request.sourceClass) throw new Error("source_class_mismatch");
  if (fingerprintValue(result.marketFingerprint, "market_fingerprint") !== request.marketFingerprint) throw new Error("market_mismatch");
  if (fingerprintValue(result.categoryFingerprint, "category_fingerprint") !== request.categoryFingerprint) throw new Error("category_mismatch");
  if (result.signalType !== request.signalType) throw new Error("signal_type_mismatch");

  const normalizedAt = isoTimestamp(input.normalizedAt, "normalized_at");
  const observedAt = isoTimestamp(result.observedAt, "observed_at");
  if (Date.parse(observedAt) > Date.parse(normalizedAt)) throw new Error("observed_at_in_future");
  if (typeof result.status !== "string" || !STATUSES.has(result.status as AdapterStatus)) throw new Error("invalid_status");
  const status = result.status as AdapterStatus;
  const metrics = normalizeMetrics(result.metrics);
  const diagnostics = normalizedCodes(result.diagnostics);
  const errorCode = result.errorCode === undefined || result.errorCode === null ? null : normalizedCode(result.errorCode, "error_code");

  let completeness: number;
  if (status === "success") {
    if (metrics.length === 0) throw new Error("success_requires_metrics");
    if (errorCode !== null) throw new Error("success_forbids_error_code");
    completeness = result.completeness === undefined ? 1 : boundedNumber(result.completeness, 1, 1, "completeness");
  } else if (status === "empty") {
    if (metrics.length !== 0) throw new Error("empty_forbids_metrics");
    if (errorCode !== null) throw new Error("empty_forbids_error_code");
    completeness = result.completeness === undefined ? 1 : boundedNumber(result.completeness, 1, 1, "completeness");
  } else if (status === "partial") {
    if (metrics.length === 0) throw new Error("partial_requires_metrics");
    if (diagnostics.length === 0) throw new Error("partial_requires_diagnostic");
    if (errorCode !== null) throw new Error("partial_forbids_error_code");
    if (result.completeness === undefined) throw new Error("partial_requires_completeness");
    completeness = boundedNumber(result.completeness, 0.01, 0.99, "completeness");
  } else {
    if (metrics.length !== 0) throw new Error("error_forbids_metrics");
    if (errorCode === null) throw new Error("error_requires_error_code");
    completeness = result.completeness === undefined ? 0 : boundedNumber(result.completeness, 0, 0, "completeness");
  }

  const sourceQuality = source.quality;
  const confidence = status === "error" ? 0 : status === "partial" ? Number((sourceQuality * completeness * 0.9).toFixed(6)) : Number(sourceQuality.toFixed(6));
  const positiveEvidence = (status === "success" || status === "partial") && metrics.length > 0;
  const streamFingerprint = hash({
    version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
    sourceFingerprint: request.sourceFingerprint,
    marketFingerprint: request.marketFingerprint,
    categoryFingerprint: request.categoryFingerprint,
    signalType: request.signalType,
  });
  const streamId = `sos-${streamFingerprint.slice(0, 24)}`;
  const identity = {
    streamId,
    requestId: request.requestId,
    requestFingerprint: request.requestFingerprint,
    sourceId: request.sourceId,
    sourceFingerprint: request.sourceFingerprint,
    sourceClass: request.sourceClass,
    trustClass: source.trustClass,
    marketFingerprint: request.marketFingerprint,
    categoryFingerprint: request.categoryFingerprint,
    signalType: request.signalType,
    observedAt,
    status,
    metrics,
    diagnostics,
    errorCode,
    sourceQuality,
    completeness,
    confidence,
    positiveEvidence,
  };
  const observationFingerprint = hash({ version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION, ...identity });
  return {
    version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
    observationId: `sno-${observationFingerprint.slice(0, 24)}`,
    observationFingerprint,
    ...identity,
    normalizedAt,
    safety: signalObservationNormalizationCapability(),
  };
}

export function buildObservationBatch(input: {
  observations: NormalizedSignalObservation[];
  maxObservations?: number;
}): ObservationBatch {
  const maxObservations = input.maxObservations ?? 100;
  if (!Number.isInteger(maxObservations) || maxObservations < 1 || maxObservations > 500) throw new Error("invalid_max_observations");
  if (!Array.isArray(input.observations) || input.observations.length === 0 || input.observations.length > maxObservations) throw new Error("invalid_observations");

  const byFingerprint = new Map<string, NormalizedSignalObservation>();
  const byStreamTime = new Map<string, string>();
  let marketFingerprint: string | null = null;
  let categoryFingerprint: string | null = null;
  for (const observation of input.observations) {
    if (observation.version !== SIGNAL_OBSERVATION_NORMALIZATION_VERSION) throw new Error("unsupported_observation_version");
    if (marketFingerprint === null) marketFingerprint = observation.marketFingerprint;
    if (categoryFingerprint === null) categoryFingerprint = observation.categoryFingerprint;
    if (observation.marketFingerprint !== marketFingerprint) throw new Error("mixed_market_scope");
    if (observation.categoryFingerprint !== categoryFingerprint) throw new Error("mixed_category_scope");
    const conflictKey = `${observation.streamId}:${observation.observedAt}`;
    const existingFingerprint = byStreamTime.get(conflictKey);
    if (existingFingerprint && existingFingerprint !== observation.observationFingerprint) throw new Error("conflicting_observation_same_timestamp");
    byStreamTime.set(conflictKey, observation.observationFingerprint);
    if (!byFingerprint.has(observation.observationFingerprint)) byFingerprint.set(observation.observationFingerprint, observation);
  }

  const observations = [...byFingerprint.values()].sort(
    (a, b) => a.observedAt.localeCompare(b.observedAt) || a.streamId.localeCompare(b.streamId) || a.observationFingerprint.localeCompare(b.observationFingerprint),
  );
  const identity = {
    marketFingerprint: marketFingerprint!,
    categoryFingerprint: categoryFingerprint!,
    observationFingerprints: observations.map((value) => value.observationFingerprint),
  };
  const batchFingerprint = hash({ version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION, ...identity });
  return {
    version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
    batchId: `sob-${batchFingerprint.slice(0, 24)}`,
    batchFingerprint,
    marketFingerprint: marketFingerprint!,
    categoryFingerprint: categoryFingerprint!,
    observations,
    safety: signalObservationNormalizationCapability(),
  };
}

export function signalObservationNormalizationCapability() {
  return Object.freeze({
    version: SIGNAL_OBSERVATION_NORMALIZATION_VERSION,
    contractAndNormalizationOnly: true,
    networkCollectionAuthorized: false,
    transportExecutionAuthorized: false,
    providerEnrollmentAuthorized: false,
    credentialUseAuthorized: false,
    credentialMutationAuthorized: false,
    rawPayloadRetentionAuthorized: false,
    evidencePersistenceAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    schedulerEnabled: false,
    batchExecutorEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    automaticTransition: false,
    schemaMutationRequired: false,
  });
}
