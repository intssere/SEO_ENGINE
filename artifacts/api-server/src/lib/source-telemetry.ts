import { createHash } from "node:crypto";
import {
  P5_1_PROVIDER_REVIEW_VERSION,
  buildP5_1ProviderSelectionReview,
  classifyP5_1ReviewFreshness,
  type ProviderCandidate,
} from "./external-search-provider-selection.js";
import {
  SIGNAL_SOURCE_REGISTRY_VERSION,
  normalizeSignalSourceDescriptor,
  type SignalSourceDescriptor,
} from "./signal-source-registry.js";
import type { SignalType } from "./market-category-intelligence.js";

export const P5_8_SOURCE_TELEMETRY_VERSION = "p5.8-source-telemetry-v1" as const;

export const P5_8_SOURCE_TELEMETRY_BOUNDS = Object.freeze({
  maxSources: 50,
  maxStreams: 200,
  maxEvents: 5000,
  maxRateLimitSnapshots: 2000,
  maxEventsPerStream: 500,
  maxRateLimitSnapshotsPerStream: 200,
});

export type TelemetryStatus = "success" | "partial" | "empty" | "error";
export type RateLimitState =
  | "unavailable"
  | "available"
  | "elevated"
  | "constrained"
  | "exhausted";

export type SourceTelemetryStreamBindingInput = {
  sourceFingerprint: string;
  signalType: SignalType;
  providerKey: ProviderCandidate["key"] | null;
};

export type SourceTelemetryCostInput = {
  amount: number | null;
  currency: string | null;
  billingUnits: number | null;
  billingUnit: string | null;
};

export type SourceTelemetryEventInput = {
  eventId: string;
  sourceFingerprint: string;
  signalType: SignalType;
  observedAt: string;
  status: TelemetryStatus;
  completeness: number;
  cost: SourceTelemetryCostInput | null;
};

export type SourceRateLimitSnapshotInput = {
  snapshotId: string;
  sourceFingerprint: string;
  signalType: SignalType;
  capturedAt: string;
  scope: string;
  limit: number | null;
  remaining: number | null;
  windowSeconds: number | null;
  resetAt: string | null;
};

type NormalizedCost = SourceTelemetryCostInput;

type NormalizedTelemetryEvent = {
  eventId: string;
  eventFingerprint: string;
  sourceFingerprint: string;
  signalType: SignalType;
  observedAt: string;
  status: TelemetryStatus;
  completeness: number;
  confidence: number;
  positiveEvidence: boolean;
  cost: NormalizedCost | null;
};

type NormalizedRateLimitSnapshot = {
  snapshotId: string;
  snapshotFingerprint: string;
  sourceFingerprint: string;
  signalType: SignalType;
  capturedAt: string;
  scope: string;
  limit: number | null;
  remaining: number | null;
  windowSeconds: number | null;
  resetAt: string | null;
  utilization: number | null;
  state: RateLimitState;
};

export type SourceTelemetryProviderMetadata = {
  providerKey: ProviderCandidate["key"];
  providerName: string;
  pricingModel: ProviderCandidate["pricing"]["model"];
  relativeCost: ProviderCandidate["pricing"]["relativeCost"];
  reliabilityEvidenceClass: ProviderCandidate["reliability"]["evidenceClass"];
  reviewedAt: string;
  reReviewAfter: string;
  reviewState: "fresh" | "stale";
  reviewFingerprint: string;
};

export type SourceTelemetryQualitySummary = {
  eventCount: number;
  successCount: number;
  partialCount: number;
  emptyCount: number;
  errorCount: number;
  successRate: number | null;
  usableRate: number | null;
  errorRate: number | null;
  meanCompleteness: number | null;
  meanConfidence: number | null;
  positiveEvidenceCount: number;
  positiveEvidenceRate: number | null;
  configuredSourceQuality: number;
};

export type SourceTelemetryCostSummary = {
  recordedEventCount: number;
  coverageRatio: number | null;
  monetaryEventCount: number;
  monetaryCoverageRatio: number | null;
  totalAmount: number | null;
  currency: string | null;
  billingUnitEventCount: number;
  billingUnitCoverageRatio: number | null;
  totalBillingUnits: number | null;
  billingUnit: string | null;
  costPerUsableObservation: number | null;
};

export type SourceTelemetryRateLimitSummary = {
  snapshotCount: number;
  latestSnapshotFingerprint: string | null;
  capturedAt: string | null;
  scope: string | null;
  limit: number | null;
  remaining: number | null;
  windowSeconds: number | null;
  resetAt: string | null;
  utilization: number | null;
  state: RateLimitState;
};

export type SourceTelemetryStreamReport = {
  streamId: string;
  streamFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceKey: string;
  sourceName: string;
  sourceClass: SignalSourceDescriptor["sourceClass"];
  trustClass: SignalSourceDescriptor["trustClass"];
  collectionMode: SignalSourceDescriptor["collectionMode"];
  signalType: SignalType;
  provider: SourceTelemetryProviderMetadata | null;
  quality: SourceTelemetryQualitySummary;
  cost: SourceTelemetryCostSummary;
  rateLimit: SourceTelemetryRateLimitSummary;
  eventSetFingerprint: string;
  rateLimitSetFingerprint: string;
  diagnostics: Array<
    | "no_events"
    | "cost_unavailable"
    | "cost_partial_coverage"
    | "rate_limit_unavailable"
    | "provider_review_stale"
  >;
};

export type SourceTelemetryDiagnostic = {
  streamId: string;
  code: SourceTelemetryStreamReport["diagnostics"][number];
};

export type SourceTelemetryReport = {
  version: typeof P5_8_SOURCE_TELEMETRY_VERSION;
  reportId: string;
  reportFingerprint: string;
  referenceTime: string;
  providerReviewVersion: typeof P5_1_PROVIDER_REVIEW_VERSION;
  providerReviewFingerprint: string;
  providerReviewState: "fresh" | "stale";
  sourceCount: number;
  streamCount: number;
  streams: SourceTelemetryStreamReport[];
  diagnostics: SourceTelemetryDiagnostic[];
  safety: ReturnType<typeof sourceTelemetryCapability>;
};

const STATUS_SET = new Set<TelemetryStatus>(["success", "partial", "empty", "error"]);
const FINGERPRINT = /^[0-9a-f]{64}$/;
const CURRENCY = /^[A-Z]{3}$/;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function round6(value: number): number {
  return Number(value.toFixed(6));
}

function text(value: unknown, field: string, max = 120): string {
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max) throw new Error(`invalid_${field}`);
  return normalized;
}

function fingerprint(value: unknown, field: string): string {
  const normalized = text(value, field, 64).toLowerCase();
  if (!FINGERPRINT.test(normalized)) throw new Error(`invalid_${field}`);
  return normalized;
}

function timestamp(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`invalid_${field}`);
  return new Date(parsed).toISOString();
}

function bounded(value: unknown, min: number, max: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`invalid_${field}`);
  }
  return value;
}

function intBounded(value: unknown, min: number, max: number, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`invalid_${field}`);
  }
  return value;
}

function optionalPair<T, U>(
  first: T | null,
  second: U | null,
  field: string,
): void {
  if ((first === null) !== (second === null)) throw new Error(`invalid_${field}`);
}

function validateSourceIdentity(source: SignalSourceDescriptor): SignalSourceDescriptor {
  if (source.version !== SIGNAL_SOURCE_REGISTRY_VERSION) throw new Error("unsupported_source_descriptor_version");
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
  if (rebuilt.fingerprint !== source.fingerprint || rebuilt.sourceId !== source.sourceId) {
    throw new Error("source_descriptor_identity_mismatch");
  }
  return rebuilt;
}

function streamKey(sourceFingerprint: string, signalType: SignalType): string {
  return `${sourceFingerprint}:${signalType}`;
}

function normalizeCost(value: SourceTelemetryCostInput | null): NormalizedCost | null {
  if (value === null) return null;
  optionalPair(value.amount, value.currency, "cost_amount_currency_pair");
  optionalPair(value.billingUnits, value.billingUnit, "billing_units_unit_pair");
  if (value.amount === null && value.billingUnits === null) throw new Error("empty_cost_record");

  const amount = value.amount === null
    ? null
    : round6(bounded(value.amount, 0, 1_000_000_000, "cost_amount"));
  const currency = value.currency === null ? null : text(value.currency, "cost_currency", 3).toUpperCase();
  if (currency !== null && !CURRENCY.test(currency)) throw new Error("invalid_cost_currency");

  const billingUnits = value.billingUnits === null
    ? null
    : round6(bounded(value.billingUnits, 0, 1_000_000_000_000, "billing_units"));
  const billingUnit = value.billingUnit === null
    ? null
    : text(value.billingUnit, "billing_unit", 48).toLowerCase();

  return { amount, currency, billingUnits, billingUnit };
}

function normalizeCompleteness(status: TelemetryStatus, value: unknown): number {
  if (status === "success" || status === "empty") return bounded(value, 1, 1, "completeness");
  if (status === "partial") return round6(bounded(value, 0.01, 0.99, "completeness"));
  return bounded(value, 0, 0, "completeness");
}

function normalizeEvent(
  input: SourceTelemetryEventInput,
  source: SignalSourceDescriptor,
  referenceTime: string,
): NormalizedTelemetryEvent {
  const eventId = text(input.eventId, "event_id", 100);
  const sourceFingerprint = fingerprint(input.sourceFingerprint, "source_fingerprint");
  if (sourceFingerprint !== source.fingerprint) throw new Error("event_source_mismatch");
  if (!source.signalTypes.includes(input.signalType)) throw new Error("event_signal_type_not_supported");
  if (!STATUS_SET.has(input.status)) throw new Error("invalid_telemetry_status");

  const observedAt = timestamp(input.observedAt, "event_observed_at");
  if (Date.parse(observedAt) > Date.parse(referenceTime)) throw new Error("event_observed_at_in_future");

  const completeness = normalizeCompleteness(input.status, input.completeness);
  const confidence = input.status === "error"
    ? 0
    : input.status === "partial"
      ? round6(source.quality * completeness * 0.9)
      : round6(source.quality);
  const positiveEvidence = input.status === "success" || input.status === "partial";
  const cost = normalizeCost(input.cost);

  const identity = {
    eventId,
    sourceFingerprint,
    signalType: input.signalType,
    observedAt,
    status: input.status,
    completeness,
    confidence,
    positiveEvidence,
    cost,
  };
  return {
    ...identity,
    eventFingerprint: hash({ version: P5_8_SOURCE_TELEMETRY_VERSION, kind: "event", ...identity }),
  };
}

function rateLimitState(limit: number | null, remaining: number | null): {
  utilization: number | null;
  state: RateLimitState;
} {
  if (limit === null || remaining === null) return { utilization: null, state: "unavailable" };
  const utilization = round6((limit - remaining) / limit);
  if (remaining === 0) return { utilization, state: "exhausted" };
  if (utilization >= 0.85) return { utilization, state: "constrained" };
  if (utilization >= 0.5) return { utilization, state: "elevated" };
  return { utilization, state: "available" };
}

function normalizeRateLimitSnapshot(
  input: SourceRateLimitSnapshotInput,
  source: SignalSourceDescriptor,
  referenceTime: string,
): NormalizedRateLimitSnapshot {
  const snapshotId = text(input.snapshotId, "snapshot_id", 100);
  const sourceFingerprint = fingerprint(input.sourceFingerprint, "source_fingerprint");
  if (sourceFingerprint !== source.fingerprint) throw new Error("rate_limit_source_mismatch");
  if (!source.signalTypes.includes(input.signalType)) throw new Error("rate_limit_signal_type_not_supported");
  const capturedAt = timestamp(input.capturedAt, "rate_limit_captured_at");
  if (Date.parse(capturedAt) > Date.parse(referenceTime)) throw new Error("rate_limit_captured_at_in_future");
  const scope = text(input.scope, "rate_limit_scope", 120);

  const capacityAbsent = input.limit === null && input.remaining === null && input.windowSeconds === null;
  const capacityPresent = input.limit !== null && input.remaining !== null && input.windowSeconds !== null;
  if (!capacityAbsent && !capacityPresent) throw new Error("incomplete_rate_limit_capacity");

  let limit: number | null = null;
  let remaining: number | null = null;
  let windowSeconds: number | null = null;
  let resetAt: string | null = null;
  if (capacityPresent) {
    limit = intBounded(input.limit, 1, 1_000_000_000, "rate_limit_limit");
    remaining = intBounded(input.remaining, 0, limit, "rate_limit_remaining");
    windowSeconds = intBounded(input.windowSeconds, 1, 31_536_000, "rate_limit_window_seconds");
    resetAt = input.resetAt === null ? null : timestamp(input.resetAt, "rate_limit_reset_at");
    if (resetAt !== null && Date.parse(resetAt) < Date.parse(capturedAt)) {
      throw new Error("rate_limit_reset_before_capture");
    }
  } else if (input.resetAt !== null) {
    throw new Error("rate_limit_reset_without_capacity");
  }

  const derived = rateLimitState(limit, remaining);
  const identity = {
    snapshotId,
    sourceFingerprint,
    signalType: input.signalType,
    capturedAt,
    scope,
    limit,
    remaining,
    windowSeconds,
    resetAt,
    utilization: derived.utilization,
    state: derived.state,
  };
  return {
    ...identity,
    snapshotFingerprint: hash({ version: P5_8_SOURCE_TELEMETRY_VERSION, kind: "rate_limit", ...identity }),
  };
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : round6(numerator / denominator);
}

function mean(values: number[]): number | null {
  return values.length === 0 ? null : round6(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function qualitySummary(
  source: SignalSourceDescriptor,
  events: NormalizedTelemetryEvent[],
): SourceTelemetryQualitySummary {
  const successCount = events.filter((event) => event.status === "success").length;
  const partialCount = events.filter((event) => event.status === "partial").length;
  const emptyCount = events.filter((event) => event.status === "empty").length;
  const errorCount = events.filter((event) => event.status === "error").length;
  const positiveEvidenceCount = events.filter((event) => event.positiveEvidence).length;
  return {
    eventCount: events.length,
    successCount,
    partialCount,
    emptyCount,
    errorCount,
    successRate: ratio(successCount, events.length),
    usableRate: ratio(successCount + partialCount, events.length),
    errorRate: ratio(errorCount, events.length),
    meanCompleteness: mean(events.map((event) => event.completeness)),
    meanConfidence: mean(events.map((event) => event.confidence)),
    positiveEvidenceCount,
    positiveEvidenceRate: ratio(positiveEvidenceCount, events.length),
    configuredSourceQuality: round6(source.quality),
  };
}

function oneOrNull(values: string[], field: string): string | null {
  const unique = [...new Set(values)].sort();
  if (unique.length > 1) throw new Error(`mixed_${field}`);
  return unique[0] ?? null;
}

function costSummary(
  events: NormalizedTelemetryEvent[],
  quality: SourceTelemetryQualitySummary,
): SourceTelemetryCostSummary {
  const recorded = events.filter((event) => event.cost !== null);
  const monetary = recorded.filter((event) => event.cost!.amount !== null);
  const unitEvents = recorded.filter((event) => event.cost!.billingUnits !== null);
  const currency = oneOrNull(monetary.map((event) => event.cost!.currency!), "cost_currency");
  const billingUnit = oneOrNull(unitEvents.map((event) => event.cost!.billingUnit!), "billing_unit");
  const totalAmount = monetary.length === 0
    ? null
    : round6(monetary.reduce((sum, event) => sum + event.cost!.amount!, 0));
  const totalBillingUnits = unitEvents.length === 0
    ? null
    : round6(unitEvents.reduce((sum, event) => sum + event.cost!.billingUnits!, 0));

  const monetaryCoverageComplete = events.length > 0 && monetary.length === events.length;
  const usableCount = quality.successCount + quality.partialCount;
  const costPerUsableObservation = monetaryCoverageComplete && usableCount > 0 && totalAmount !== null
    ? round6(totalAmount / usableCount)
    : null;

  return {
    recordedEventCount: recorded.length,
    coverageRatio: ratio(recorded.length, events.length),
    monetaryEventCount: monetary.length,
    monetaryCoverageRatio: ratio(monetary.length, events.length),
    totalAmount,
    currency,
    billingUnitEventCount: unitEvents.length,
    billingUnitCoverageRatio: ratio(unitEvents.length, events.length),
    totalBillingUnits,
    billingUnit,
    costPerUsableObservation,
  };
}

function rateLimitSummary(
  snapshots: NormalizedRateLimitSnapshot[],
): SourceTelemetryRateLimitSummary {
  const latest = [...snapshots].sort(
    (a, b) => b.capturedAt.localeCompare(a.capturedAt)
      || a.snapshotFingerprint.localeCompare(b.snapshotFingerprint),
  )[0];
  if (!latest) {
    return {
      snapshotCount: 0,
      latestSnapshotFingerprint: null,
      capturedAt: null,
      scope: null,
      limit: null,
      remaining: null,
      windowSeconds: null,
      resetAt: null,
      utilization: null,
      state: "unavailable",
    };
  }
  return {
    snapshotCount: snapshots.length,
    latestSnapshotFingerprint: latest.snapshotFingerprint,
    capturedAt: latest.capturedAt,
    scope: latest.scope,
    limit: latest.limit,
    remaining: latest.remaining,
    windowSeconds: latest.windowSeconds,
    resetAt: latest.resetAt,
    utilization: latest.utilization,
    state: latest.state,
  };
}

function providerMetadata(
  providerKey: ProviderCandidate["key"] | null,
  referenceTime: string,
): SourceTelemetryProviderMetadata | null {
  if (providerKey === null) return null;
  const review = buildP5_1ProviderSelectionReview();
  const candidate = review.candidates.find((value) => value.key === providerKey);
  if (!candidate) throw new Error("provider_not_in_p5_1_review");
  return {
    providerKey,
    providerName: candidate.name,
    pricingModel: candidate.pricing.model,
    relativeCost: candidate.pricing.relativeCost,
    reliabilityEvidenceClass: candidate.reliability.evidenceClass,
    reviewedAt: review.reviewedAt,
    reReviewAfter: review.reReviewAfter,
    reviewState: classifyP5_1ReviewFreshness(review, referenceTime),
    reviewFingerprint: review.fingerprint,
  };
}

function streamDiagnostics(
  quality: SourceTelemetryQualitySummary,
  cost: SourceTelemetryCostSummary,
  rateLimit: SourceTelemetryRateLimitSummary,
  provider: SourceTelemetryProviderMetadata | null,
): SourceTelemetryStreamReport["diagnostics"] {
  const diagnostics = new Set<SourceTelemetryStreamReport["diagnostics"][number]>();
  if (quality.eventCount === 0) diagnostics.add("no_events");
  if (cost.recordedEventCount === 0) diagnostics.add("cost_unavailable");
  else if (cost.recordedEventCount < quality.eventCount) diagnostics.add("cost_partial_coverage");
  if (rateLimit.state === "unavailable") diagnostics.add("rate_limit_unavailable");
  if (provider?.reviewState === "stale") diagnostics.add("provider_review_stale");
  return [...diagnostics].sort();
}

function validateCounts(input: {
  sources: SignalSourceDescriptor[];
  bindings: SourceTelemetryStreamBindingInput[];
  events: SourceTelemetryEventInput[];
  rateLimitSnapshots: SourceRateLimitSnapshotInput[];
}) {
  if (!Array.isArray(input.sources) || input.sources.length < 1 || input.sources.length > P5_8_SOURCE_TELEMETRY_BOUNDS.maxSources) {
    throw new Error("invalid_telemetry_source_count");
  }
  if (!Array.isArray(input.bindings) || input.bindings.length < 1 || input.bindings.length > P5_8_SOURCE_TELEMETRY_BOUNDS.maxStreams) {
    throw new Error("invalid_telemetry_stream_count");
  }
  if (!Array.isArray(input.events) || input.events.length > P5_8_SOURCE_TELEMETRY_BOUNDS.maxEvents) {
    throw new Error("invalid_telemetry_event_count");
  }
  if (!Array.isArray(input.rateLimitSnapshots) || input.rateLimitSnapshots.length > P5_8_SOURCE_TELEMETRY_BOUNDS.maxRateLimitSnapshots) {
    throw new Error("invalid_rate_limit_snapshot_count");
  }
}

export function buildSourceTelemetryReport(input: {
  sources: SignalSourceDescriptor[];
  bindings: SourceTelemetryStreamBindingInput[];
  events?: SourceTelemetryEventInput[];
  rateLimitSnapshots?: SourceRateLimitSnapshotInput[];
  referenceTime: string;
}): SourceTelemetryReport {
  const eventsInput = input.events ?? [];
  const rateLimitInput = input.rateLimitSnapshots ?? [];
  validateCounts({
    sources: input.sources,
    bindings: input.bindings,
    events: eventsInput,
    rateLimitSnapshots: rateLimitInput,
  });

  const referenceTime = timestamp(input.referenceTime, "reference_time");
  const review = buildP5_1ProviderSelectionReview();
  if (review.version !== P5_1_PROVIDER_REVIEW_VERSION || !FINGERPRINT.test(review.fingerprint)) {
    throw new Error("invalid_p5_1_provider_review");
  }
  const providerReviewState = classifyP5_1ReviewFreshness(review, referenceTime);

  const sources = input.sources.map(validateSourceIdentity);
  const sourceByFingerprint = new Map<string, SignalSourceDescriptor>();
  for (const source of sources) {
    if (sourceByFingerprint.has(source.fingerprint)) throw new Error("duplicate_telemetry_source");
    sourceByFingerprint.set(source.fingerprint, source);
  }

  const normalizedBindings = input.bindings.map((binding) => {
    const sourceFingerprint = fingerprint(binding.sourceFingerprint, "binding_source_fingerprint");
    const source = sourceByFingerprint.get(sourceFingerprint);
    if (!source) throw new Error("binding_source_not_found");
    if (!source.signalTypes.includes(binding.signalType)) throw new Error("binding_signal_type_not_supported");
    if (binding.providerKey !== null && !review.candidates.some((candidate) => candidate.key === binding.providerKey)) {
      throw new Error("binding_provider_not_in_p5_1_review");
    }
    const key = streamKey(sourceFingerprint, binding.signalType);
    return {
      key,
      sourceFingerprint,
      signalType: binding.signalType,
      providerKey: binding.providerKey,
    };
  }).sort((a, b) => a.key.localeCompare(b.key));

  const bindingByKey = new Map<string, typeof normalizedBindings[number]>();
  for (const binding of normalizedBindings) {
    if (bindingByKey.has(binding.key)) throw new Error("duplicate_telemetry_stream_binding");
    bindingByKey.set(binding.key, binding);
  }

  const seenEventIds = new Set<string>();
  const seenEventFingerprints = new Set<string>();
  const eventsByStream = new Map<string, NormalizedTelemetryEvent[]>();
  for (const raw of eventsInput) {
    const sourceFingerprint = fingerprint(raw.sourceFingerprint, "event_source_fingerprint");
    const key = streamKey(sourceFingerprint, raw.signalType);
    const binding = bindingByKey.get(key);
    if (!binding) throw new Error("event_stream_binding_not_found");
    const source = sourceByFingerprint.get(sourceFingerprint)!;
    const event = normalizeEvent(raw, source, referenceTime);
    if (seenEventIds.has(event.eventId)) throw new Error("duplicate_telemetry_event_id");
    if (seenEventFingerprints.has(event.eventFingerprint)) throw new Error("duplicate_telemetry_event_fingerprint");
    seenEventIds.add(event.eventId);
    seenEventFingerprints.add(event.eventFingerprint);
    const rows = eventsByStream.get(key) ?? [];
    rows.push(event);
    if (rows.length > P5_8_SOURCE_TELEMETRY_BOUNDS.maxEventsPerStream) throw new Error("telemetry_events_per_stream_exceeded");
    eventsByStream.set(key, rows);
  }

  const seenSnapshotIds = new Set<string>();
  const seenSnapshotFingerprints = new Set<string>();
  const snapshotsByStream = new Map<string, NormalizedRateLimitSnapshot[]>();
  for (const raw of rateLimitInput) {
    const sourceFingerprint = fingerprint(raw.sourceFingerprint, "rate_limit_source_fingerprint");
    const key = streamKey(sourceFingerprint, raw.signalType);
    const binding = bindingByKey.get(key);
    if (!binding) throw new Error("rate_limit_stream_binding_not_found");
    const source = sourceByFingerprint.get(sourceFingerprint)!;
    const snapshot = normalizeRateLimitSnapshot(raw, source, referenceTime);
    if (seenSnapshotIds.has(snapshot.snapshotId)) throw new Error("duplicate_rate_limit_snapshot_id");
    if (seenSnapshotFingerprints.has(snapshot.snapshotFingerprint)) throw new Error("duplicate_rate_limit_snapshot_fingerprint");
    seenSnapshotIds.add(snapshot.snapshotId);
    seenSnapshotFingerprints.add(snapshot.snapshotFingerprint);
    const rows = snapshotsByStream.get(key) ?? [];
    rows.push(snapshot);
    if (rows.length > P5_8_SOURCE_TELEMETRY_BOUNDS.maxRateLimitSnapshotsPerStream) {
      throw new Error("rate_limit_snapshots_per_stream_exceeded");
    }
    snapshotsByStream.set(key, rows);
  }

  const streams: SourceTelemetryStreamReport[] = normalizedBindings.map((binding) => {
    const source = sourceByFingerprint.get(binding.sourceFingerprint)!;
    const events = [...(eventsByStream.get(binding.key) ?? [])].sort(
      (a, b) => a.observedAt.localeCompare(b.observedAt)
        || a.eventFingerprint.localeCompare(b.eventFingerprint),
    );
    const snapshots = [...(snapshotsByStream.get(binding.key) ?? [])].sort(
      (a, b) => a.capturedAt.localeCompare(b.capturedAt)
        || a.snapshotFingerprint.localeCompare(b.snapshotFingerprint),
    );
    const quality = qualitySummary(source, events);
    const cost = costSummary(events, quality);
    const rateLimit = rateLimitSummary(snapshots);
    const provider = providerMetadata(binding.providerKey, referenceTime);
    const diagnostics = streamDiagnostics(quality, cost, rateLimit, provider);
    const eventSetFingerprint = hash({
      version: P5_8_SOURCE_TELEMETRY_VERSION,
      kind: "event_set",
      fingerprints: events.map((event) => event.eventFingerprint),
    });
    const rateLimitSetFingerprint = hash({
      version: P5_8_SOURCE_TELEMETRY_VERSION,
      kind: "rate_limit_set",
      fingerprints: snapshots.map((snapshot) => snapshot.snapshotFingerprint),
    });
    const streamIdentity = {
      sourceFingerprint: source.fingerprint,
      signalType: binding.signalType,
      providerKey: binding.providerKey,
      eventSetFingerprint,
      rateLimitSetFingerprint,
    };
    const streamFingerprint = hash({
      version: P5_8_SOURCE_TELEMETRY_VERSION,
      kind: "stream",
      ...streamIdentity,
    });

    return {
      streamId: `stl-${streamFingerprint.slice(0, 24)}`,
      streamFingerprint,
      sourceId: source.sourceId,
      sourceFingerprint: source.fingerprint,
      sourceKey: source.key,
      sourceName: source.name,
      sourceClass: source.sourceClass,
      trustClass: source.trustClass,
      collectionMode: source.collectionMode,
      signalType: binding.signalType,
      provider,
      quality,
      cost,
      rateLimit,
      eventSetFingerprint,
      rateLimitSetFingerprint,
      diagnostics,
    };
  });

  const diagnostics = streams
    .flatMap((stream) => stream.diagnostics.map((code) => ({ streamId: stream.streamId, code })))
    .sort((a, b) => a.streamId.localeCompare(b.streamId) || a.code.localeCompare(b.code));

  const identity = {
    referenceTime,
    providerReviewVersion: review.version,
    providerReviewFingerprint: review.fingerprint,
    providerReviewState,
    sourceFingerprints: sources.map((source) => source.fingerprint).sort(),
    streams: streams.map((stream) => ({
      streamFingerprint: stream.streamFingerprint,
      quality: stream.quality,
      cost: stream.cost,
      rateLimit: stream.rateLimit,
      provider: stream.provider,
      diagnostics: stream.diagnostics,
    })),
    diagnostics,
  };
  const reportFingerprint = hash({ version: P5_8_SOURCE_TELEMETRY_VERSION, ...identity });

  return {
    version: P5_8_SOURCE_TELEMETRY_VERSION,
    reportId: `str-${reportFingerprint.slice(0, 24)}`,
    reportFingerprint,
    referenceTime,
    providerReviewVersion: review.version,
    providerReviewFingerprint: review.fingerprint,
    providerReviewState,
    sourceCount: sources.length,
    streamCount: streams.length,
    streams,
    diagnostics,
    safety: sourceTelemetryCapability(),
  };
}

export function sourceTelemetryCapability() {
  return Object.freeze({
    version: P5_8_SOURCE_TELEMETRY_VERSION,
    deterministicReportingOnly: true,
    suppliedTelemetryOnly: true,
    providerReviewJoinOnly: true,
    liveProviderReadsAuthorized: false,
    providerCredentialUseAuthorized: false,
    providerCredentialMutationAuthorized: false,
    sourceRegistryAdmissionAuthorized: false,
    refreshPlanReorderingEnabled: false,
    rateLimitEnforcementEnabled: false,
    task64ExecutionAuthorized: false,
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
