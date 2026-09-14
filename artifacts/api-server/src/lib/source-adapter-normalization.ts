import { createHash } from "node:crypto";
import type { CategoryContext, MarketProfile, SignalSourceClass, SignalType } from "./market-category-intelligence.js";
import { sourceEligibility, type CollectionMode, type SignalSourceDescriptor, type TrustClass } from "./signal-source-registry.js";

export const SOURCE_ADAPTER_NORMALIZATION_VERSION = "task68-source-adapter-normalization-v1" as const;

export type ObservationCompleteness = "complete" | "partial";
export type ScalarValue = string | number | boolean | null;

export type SourceAdapterDescriptorInput = {
  key: string;
  name: string;
  adapterVersion: string;
  source: SignalSourceDescriptor;
  signalTypes: SignalType[];
  collectionMode: CollectionMode;
  maxItems: number;
  supportsPartial: boolean;
};

export type SourceAdapterDescriptor = {
  version: typeof SOURCE_ADAPTER_NORMALIZATION_VERSION;
  adapterId: string;
  fingerprint: string;
  key: string;
  name: string;
  adapterVersion: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceClass: SignalSourceClass;
  trustClass: TrustClass;
  signalTypes: SignalType[];
  collectionMode: CollectionMode;
  maxItems: number;
  supportsPartial: boolean;
};

export type AdapterObservationItemInput = {
  key: string;
  subject?: string | null;
  terms?: string[];
  metrics?: Record<string, number>;
  attributes?: Record<string, ScalarValue>;
};

export type AdapterResultInput = {
  adapterFingerprint: string;
  sourceFingerprint: string;
  correlationId: string;
  signalType: SignalType;
  marketFingerprint: string;
  categoryFingerprint: string;
  observedAt: string;
  collectedAt: string;
  completeness: ObservationCompleteness;
  confidence: number;
  provenance: Record<string, ScalarValue>;
  diagnostics?: string[];
  items: AdapterObservationItemInput[];
};

export type NormalizedObservationItem = {
  key: string;
  subject: string | null;
  terms: string[];
  metrics: Record<string, number>;
  attributes: Record<string, ScalarValue>;
};

export type SignalObservationEnvelope = {
  version: typeof SOURCE_ADAPTER_NORMALIZATION_VERSION;
  observationId: string;
  observationFingerprint: string;
  adapterId: string;
  adapterFingerprint: string;
  adapterVersion: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceClass: SignalSourceClass;
  trustClass: TrustClass;
  collectionMode: CollectionMode;
  signalType: SignalType;
  marketFingerprint: string;
  categoryFingerprint: string;
  correlationId: string;
  observedAt: string;
  collectedAt: string;
  completeness: ObservationCompleteness;
  sourceQuality: number;
  confidence: number;
  provenance: Record<string, ScalarValue>;
  diagnostics: string[];
  items: NormalizedObservationItem[];
  safety: ReturnType<typeof sourceAdapterNormalizationCapability>;
};

const SIGNAL_TYPES: SignalType[] = ["analytics", "catalog", "competitor", "entity", "geo_aio", "keyword", "serp", "trend"];
const SIGNAL_TYPE_SET = new Set<string>(SIGNAL_TYPES);
const FORBIDDEN_FIELD_NAMES = new Set([
  "authorization",
  "cookie",
  "cookies",
  "set-cookie",
  "secret",
  "password",
  "apikey",
  "api_key",
  "access_token",
  "refresh_token",
  "id_token",
  "raw",
  "raw_body",
  "raw_html",
  "html",
  "headers",
  "request_headers",
  "response_headers",
  "request_body",
  "response_body",
]);

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function text(value: unknown, max = 160): string {
  if (typeof value !== "string") throw new Error("invalid_text");
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max) throw new Error("invalid_text");
  return normalized;
}

function fingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) throw new Error(`invalid_${field}`);
  return value;
}

function bounded(value: number, min: number, max: number, field: string): number {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`invalid_${field}`);
  return value;
}

function intBounded(value: number, min: number, max: number, field: string): number {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`invalid_${field}`);
  return value;
}

function sortedUnique(values: string[] | undefined, maxItems: number, field: string, itemMax = 160): string[] {
  if (!values) return [];
  if (!Array.isArray(values) || values.length > maxItems) throw new Error(`invalid_${field}`);
  return [...new Set(values.map((value) => text(value, itemMax).toLowerCase()))].sort((a, b) => a.localeCompare(b));
}

function safeKey(value: string, field: string): string {
  const normalized = text(value, 96).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._:/-]*$/.test(normalized)) throw new Error(`invalid_${field}`);
  if (isForbiddenFieldName(normalized)) throw new Error("forbidden_sensitive_or_raw_field");
  return normalized;
}

function isForbiddenFieldName(value: string): boolean {
  const lower = value.toLowerCase();
  return FORBIDDEN_FIELD_NAMES.has(lower)
    || lower.startsWith("raw_")
    || lower.endsWith("_secret")
    || lower.endsWith("_token")
    || lower.endsWith("_password")
    || lower.endsWith("_cookie")
    || lower.endsWith("_headers")
    || lower.endsWith("_body");
}

function assertNoForbiddenFields(value: unknown, depth = 0): void {
  if (depth > 8) throw new Error("input_too_deep");
  if (Array.isArray(value)) {
    for (const item of value) assertNoForbiddenFields(item, depth + 1);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (isForbiddenFieldName(key)) throw new Error("forbidden_sensitive_or_raw_field");
    assertNoForbiddenFields(nested, depth + 1);
  }
}

function normalizeScalar(value: ScalarValue, field: string): ScalarValue {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`invalid_${field}_value`);
    return value;
  }
  return text(value, 240);
}

function normalizeScalarRecord(value: Record<string, ScalarValue>, maxEntries: number, field: string): Record<string, ScalarValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`invalid_${field}`);
  const keys = Object.keys(value);
  if (keys.length > maxEntries) throw new Error(`invalid_${field}`);
  const result: Record<string, ScalarValue> = {};
  for (const rawKey of keys.sort((a, b) => a.localeCompare(b))) {
    const key = safeKey(rawKey, `${field}_key`);
    if (Object.prototype.hasOwnProperty.call(result, key)) throw new Error(`duplicate_${field}_key`);
    result[key] = normalizeScalar(value[rawKey]!, field);
  }
  return result;
}

function normalizeNumericRecord(value: Record<string, number> | undefined): Record<string, number> {
  if (!value) return {};
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_metrics");
  const keys = Object.keys(value);
  if (keys.length > 24) throw new Error("invalid_metrics");
  const result: Record<string, number> = {};
  for (const rawKey of keys.sort((a, b) => a.localeCompare(b))) {
    const key = safeKey(rawKey, "metric_key");
    if (Object.prototype.hasOwnProperty.call(result, key)) throw new Error("duplicate_metric_key");
    const metric = value[rawKey]!;
    if (!Number.isFinite(metric)) throw new Error("invalid_metric_value");
    result[key] = metric;
  }
  return result;
}

function normalizeSignalTypes(values: SignalType[], source: SignalSourceDescriptor): SignalType[] {
  if (!Array.isArray(values) || values.length === 0 || values.length > SIGNAL_TYPES.length) throw new Error("invalid_signal_types");
  const normalized = [...new Set(values)].sort((a, b) => a.localeCompare(b));
  if (normalized.some((value) => !SIGNAL_TYPE_SET.has(value))) throw new Error("invalid_signal_type");
  if (normalized.some((value) => !source.signalTypes.includes(value))) throw new Error("adapter_signal_type_not_supported_by_source");
  return normalized;
}

function parseTimestamp(value: string, field: string): { iso: string; ms: number } {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`invalid_${field}`);
  return { iso: new Date(ms).toISOString(), ms };
}

function normalizeItem(input: AdapterObservationItemInput): NormalizedObservationItem {
  assertNoForbiddenFields(input);
  const key = safeKey(input.key, "item_key");
  const subject = input.subject == null ? null : text(input.subject, 240);
  const terms = sortedUnique(input.terms, 32, "terms", 160);
  const metrics = normalizeNumericRecord(input.metrics);
  const attributes = normalizeScalarRecord(input.attributes ?? {}, 24, "attributes");
  if (subject === null && terms.length === 0 && Object.keys(metrics).length === 0 && Object.keys(attributes).length === 0) {
    throw new Error("empty_observation_item");
  }
  return { key, subject, terms, metrics, attributes };
}

export function normalizeSourceAdapterDescriptor(input: SourceAdapterDescriptorInput): SourceAdapterDescriptor {
  assertNoForbiddenFields(input);
  const key = safeKey(input.key, "adapter_key");
  const name = text(input.name, 120);
  const adapterVersion = text(input.adapterVersion, 80).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(adapterVersion)) throw new Error("invalid_adapter_version");
  fingerprint(input.source.fingerprint, "source_fingerprint");
  const signalTypes = normalizeSignalTypes(input.signalTypes, input.source);
  if (input.collectionMode !== input.source.collectionMode) throw new Error("collection_mode_mismatch");
  const maxItems = intBounded(input.maxItems, 1, 500, "max_items");
  const canonical = {
    key,
    name: name.toLowerCase(),
    adapterVersion,
    sourceFingerprint: input.source.fingerprint,
    sourceClass: input.source.sourceClass,
    trustClass: input.source.trustClass,
    signalTypes,
    collectionMode: input.collectionMode,
    maxItems,
    supportsPartial: Boolean(input.supportsPartial),
  };
  const adapterFingerprint = hash({ version: SOURCE_ADAPTER_NORMALIZATION_VERSION, ...canonical });
  return {
    version: SOURCE_ADAPTER_NORMALIZATION_VERSION,
    adapterId: `sad-${adapterFingerprint.slice(0, 24)}`,
    fingerprint: adapterFingerprint,
    key,
    name,
    adapterVersion,
    sourceId: input.source.sourceId,
    sourceFingerprint: input.source.fingerprint,
    sourceClass: input.source.sourceClass,
    trustClass: input.source.trustClass,
    signalTypes,
    collectionMode: input.collectionMode,
    maxItems,
    supportsPartial: Boolean(input.supportsPartial),
  };
}

export function normalizeSignalObservation(input: {
  adapter: SourceAdapterDescriptor;
  source: SignalSourceDescriptor;
  market: MarketProfile;
  category: CategoryContext;
  result: AdapterResultInput;
  now: string;
}): SignalObservationEnvelope {
  assertNoForbiddenFields(input.result);
  const nowTimestamp = parseTimestamp(input.now, "now");
  const adapterFingerprint = fingerprint(input.result.adapterFingerprint, "adapter_fingerprint");
  const sourceFingerprint = fingerprint(input.result.sourceFingerprint, "source_fingerprint");
  const marketFingerprint = fingerprint(input.result.marketFingerprint, "market_fingerprint");
  const categoryFingerprint = fingerprint(input.result.categoryFingerprint, "category_fingerprint");
  if (adapterFingerprint !== input.adapter.fingerprint) throw new Error("adapter_fingerprint_mismatch");
  if (sourceFingerprint !== input.source.fingerprint || input.adapter.sourceFingerprint !== input.source.fingerprint) throw new Error("source_fingerprint_mismatch");
  if (marketFingerprint !== input.market.fingerprint) throw new Error("market_fingerprint_mismatch");
  if (categoryFingerprint !== input.category.fingerprint) throw new Error("category_fingerprint_mismatch");
  if (!SIGNAL_TYPE_SET.has(input.result.signalType)) throw new Error("invalid_signal_type");
  if (!input.adapter.signalTypes.includes(input.result.signalType)) throw new Error("adapter_signal_type_mismatch");
  const eligibility = sourceEligibility(input.source, input.market, input.category, input.result.signalType);
  if (!eligibility.eligible) throw new Error(`source_ineligible:${eligibility.blockers.join(",")}`);
  if (input.adapter.collectionMode !== input.source.collectionMode) throw new Error("collection_mode_mismatch");

  const observed = parseTimestamp(input.result.observedAt, "observed_at");
  const collected = parseTimestamp(input.result.collectedAt, "collected_at");
  if (observed.ms > collected.ms) throw new Error("observed_after_collected");
  if (collected.ms > nowTimestamp.ms) throw new Error("collected_at_in_future");

  const completeness = input.result.completeness;
  if (completeness !== "complete" && completeness !== "partial") throw new Error("invalid_completeness");
  const diagnostics = sortedUnique(input.result.diagnostics, 20, "diagnostics", 240);
  if (completeness === "partial") {
    if (!input.adapter.supportsPartial) throw new Error("partial_result_not_supported");
    if (diagnostics.length === 0) throw new Error("partial_result_requires_diagnostics");
  }

  const confidence = bounded(input.result.confidence, 0, 1, "confidence");
  const provenance = normalizeScalarRecord(input.result.provenance, 24, "provenance");
  if (Object.keys(provenance).length === 0) throw new Error("provenance_required");
  if (!input.source.provenanceComplete) throw new Error("source_provenance_incomplete");
  bounded(input.source.quality, 0, 1, "source_quality");

  if (!Array.isArray(input.result.items) || input.result.items.length === 0) throw new Error("items_required");
  if (input.result.items.length > input.adapter.maxItems) throw new Error("adapter_item_budget_exceeded");
  const byKey = new Map<string, NormalizedObservationItem>();
  for (const rawItem of input.result.items) {
    const item = normalizeItem(rawItem);
    if (byKey.has(item.key)) throw new Error("duplicate_normalized_item_key");
    byKey.set(item.key, item);
  }
  const items = [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  const correlationId = text(input.result.correlationId, 160).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._:/-]*$/.test(correlationId)) throw new Error("invalid_correlation_id");

  const identity = {
    adapterFingerprint: input.adapter.fingerprint,
    adapterVersion: input.adapter.adapterVersion,
    sourceFingerprint: input.source.fingerprint,
    sourceClass: input.source.sourceClass,
    trustClass: input.source.trustClass,
    collectionMode: input.source.collectionMode,
    signalType: input.result.signalType,
    marketFingerprint: input.market.fingerprint,
    categoryFingerprint: input.category.fingerprint,
    correlationId,
    observedAt: observed.iso,
    collectedAt: collected.iso,
    completeness,
    sourceQuality: input.source.quality,
    confidence,
    provenance,
    diagnostics,
    items,
  };
  const observationFingerprint = hash({ version: SOURCE_ADAPTER_NORMALIZATION_VERSION, ...identity });
  return {
    version: SOURCE_ADAPTER_NORMALIZATION_VERSION,
    observationId: `obs-${observationFingerprint.slice(0, 24)}`,
    observationFingerprint,
    adapterId: input.adapter.adapterId,
    adapterFingerprint: input.adapter.fingerprint,
    adapterVersion: input.adapter.adapterVersion,
    sourceId: input.source.sourceId,
    sourceFingerprint: input.source.fingerprint,
    sourceClass: input.source.sourceClass,
    trustClass: input.source.trustClass,
    collectionMode: input.source.collectionMode,
    signalType: input.result.signalType,
    marketFingerprint: input.market.fingerprint,
    categoryFingerprint: input.category.fingerprint,
    correlationId,
    observedAt: observed.iso,
    collectedAt: collected.iso,
    completeness,
    sourceQuality: input.source.quality,
    confidence,
    provenance,
    diagnostics,
    items,
    safety: sourceAdapterNormalizationCapability(),
  };
}

export function sourceAdapterNormalizationCapability() {
  return Object.freeze({
    version: SOURCE_ADAPTER_NORMALIZATION_VERSION,
    contractAndNormalizationOnly: true,
    networkCollectionAuthorized: false,
    providerEnrollmentAuthorized: false,
    credentialMutationAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    schedulerEnabled: false,
    batchEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    providerWrites: false,
    publicSiteWrites: false,
    task64ExecutionAuthorized: false,
    automaticTransition: false,
    schemaMutationRequired: false,
  });
}
