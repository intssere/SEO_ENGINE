import { createHash } from "node:crypto";
import type { CategoryContext, MarketProfile, SignalSourceClass, SignalType } from "./market-category-intelligence.js";
import type { CollectionMode, SignalSourceDescriptor, TrustClass } from "./signal-source-registry.js";

export const SIGNAL_SOURCE_ADAPTER_VERSION = "task68-source-adapter-observation-v1" as const;

export type AdapterOperationClass =
  | "read_snapshot"
  | "read_timeseries"
  | "read_rankings"
  | "read_entities"
  | "read_catalog";

export type SignalSourceAdapterInput = {
  key: string;
  adapterVersion: string;
  source: SignalSourceDescriptor;
  market: MarketProfile;
  category: CategoryContext;
  signalType: SignalType;
  collectionMode: CollectionMode;
  operationClass: AdapterOperationClass;
};

export type SignalSourceAdapter = {
  version: typeof SIGNAL_SOURCE_ADAPTER_VERSION;
  adapterId: string;
  adapterFingerprint: string;
  key: string;
  adapterVersion: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceClass: SignalSourceClass;
  trustClass: TrustClass;
  quality: number;
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: SignalType;
  collectionMode: CollectionMode;
  operationClass: AdapterOperationClass;
  safety: ReturnType<typeof signalSourceAdapterCapability>;
};

export type ObservationPrimitive = string | number | boolean | null;

export type ObservationEntityInput = {
  type: string;
  key: string;
  name?: string | null;
};

export type NormalizedObservationEntity = {
  type: string;
  key: string;
  name: string | null;
};

export type SignalObservationPayloadInput = {
  dimensions?: Record<string, ObservationPrimitive>;
  metrics?: Record<string, number>;
  terms?: string[];
  entities?: ObservationEntityInput[];
  provenance?: Record<string, ObservationPrimitive>;
  diagnostics?: string[];
};

export type NormalizeSignalObservationInput = {
  adapter: SignalSourceAdapter;
  source: SignalSourceDescriptor;
  market: MarketProfile;
  category: CategoryContext;
  signalType: SignalType;
  observedAt: string;
  collectedAt: string;
  payload?: SignalObservationPayloadInput;
};

export type SignalObservation = {
  version: typeof SIGNAL_SOURCE_ADAPTER_VERSION;
  observationId: string;
  observationFingerprint: string;
  contentFingerprint: string;
  adapterId: string;
  adapterFingerprint: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceClass: SignalSourceClass;
  trustClass: TrustClass;
  quality: number;
  marketFingerprint: string;
  categoryFingerprint: string;
  signalType: SignalType;
  observedAt: string;
  collectedAt: string;
  dimensions: Record<string, ObservationPrimitive>;
  metrics: Record<string, number>;
  terms: string[];
  entities: NormalizedObservationEntity[];
  provenance: Record<string, ObservationPrimitive>;
  diagnostics: string[];
  safety: ReturnType<typeof signalSourceAdapterCapability>;
};

const SIGNAL_TYPES = new Set<SignalType>(["analytics", "catalog", "competitor", "entity", "geo_aio", "keyword", "serp", "trend"]);
const COLLECTION_MODES = new Set<CollectionMode>(["provider_api", "secure_http", "internal_db", "manual_import", "other"]);
const OPERATION_CLASSES = new Set<AdapterOperationClass>(["read_snapshot", "read_timeseries", "read_rankings", "read_entities", "read_catalog"]);
const FORBIDDEN_KEY = /(?:authorization|cookie|credential|password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|bearer|raw[_-]?(?:body|response|html)|response[_-]?body|request[_-]?headers?|response[_-]?headers?)/i;

const MAX_DIMENSIONS = 64;
const MAX_METRICS = 64;
const MAX_TERMS = 100;
const MAX_ENTITIES = 100;
const MAX_PROVENANCE = 64;
const MAX_DIAGNOSTICS = 32;
const MAX_METRIC_ABS = 1_000_000_000_000_000;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function objectRecord(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`invalid_${name}`);
  return value as Record<string, unknown>;
}

function cleanText(value: unknown, max: number, field: string, lower = false): string {
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max) throw new Error(`invalid_${field}`);
  return lower ? normalized.toLowerCase() : normalized;
}

function canonicalKey(value: string, field: string): string {
  const normalized = cleanText(value, 64, field, true).replace(/\s+/g, "_");
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(normalized)) throw new Error(`invalid_${field}`);
  if (FORBIDDEN_KEY.test(normalized)) throw new Error("forbidden_sensitive_field");
  return normalized;
}

function requireFingerprint(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) throw new Error(`invalid_${field}`);
  return normalized;
}

function isoTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`invalid_${field}`);
  return new Date(parsed).toISOString();
}

function rejectForbiddenKeysDeep(value: unknown, depth = 0): void {
  if (depth > 6) throw new Error("payload_nesting_too_deep");
  if (Array.isArray(value)) {
    for (const item of value) rejectForbiddenKeysDeep(item, depth + 1);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEY.test(key)) throw new Error("forbidden_sensitive_field");
    rejectForbiddenKeysDeep(nested, depth + 1);
  }
}

function normalizePrimitive(value: unknown, field: string): ObservationPrimitive {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Math.abs(value) > MAX_METRIC_ABS) throw new Error(`invalid_${field}`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === "string") return cleanText(value, 240, field);
  throw new Error(`invalid_${field}`);
}

function normalizePrimitiveRecord(value: unknown, field: string, maxEntries: number): Record<string, ObservationPrimitive> {
  if (value === undefined) return {};
  const input = objectRecord(value, field);
  const entries = Object.entries(input);
  if (entries.length > maxEntries) throw new Error(`too_many_${field}`);
  const result: Record<string, ObservationPrimitive> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = canonicalKey(rawKey, `${field}_key`);
    if (Object.prototype.hasOwnProperty.call(result, key)) throw new Error(`duplicate_${field}_key`);
    result[key] = normalizePrimitive(rawValue, `${field}_value`);
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function normalizeMetrics(value: unknown): Record<string, number> {
  if (value === undefined) return {};
  const input = objectRecord(value, "metrics");
  const entries = Object.entries(input);
  if (entries.length > MAX_METRICS) throw new Error("too_many_metrics");
  const result: Record<string, number> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = canonicalKey(rawKey, "metric_key");
    if (Object.prototype.hasOwnProperty.call(result, key)) throw new Error("duplicate_metric_key");
    if (typeof rawValue !== "number" || !Number.isFinite(rawValue) || Math.abs(rawValue) > MAX_METRIC_ABS) throw new Error("invalid_metric_value");
    result[key] = Object.is(rawValue, -0) ? 0 : rawValue;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function normalizeTerms(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_TERMS) throw new Error("invalid_terms");
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of value) {
    const term = cleanText(raw, 160, "term", true);
    if (seen.has(term)) continue;
    seen.add(term);
    result.push(term);
  }
  return result.sort((a, b) => a.localeCompare(b));
}

function normalizeEntities(value: unknown): NormalizedObservationEntity[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_ENTITIES) throw new Error("invalid_entities");
  const result: NormalizedObservationEntity[] = [];
  const identities = new Set<string>();
  for (const raw of value) {
    const entity = objectRecord(raw, "entity");
    const allowed = new Set(["type", "key", "name"]);
    for (const key of Object.keys(entity)) {
      if (!allowed.has(key)) throw new Error("unsupported_entity_field");
      if (FORBIDDEN_KEY.test(key)) throw new Error("forbidden_sensitive_field");
    }
    const type = canonicalKey(cleanText(entity.type, 64, "entity_type", true), "entity_type");
    const key = cleanText(entity.key, 160, "entity_key", true);
    const name = entity.name == null ? null : cleanText(entity.name, 200, "entity_name");
    const identity = `${type}:${key}`;
    if (identities.has(identity)) throw new Error("duplicate_entity_key");
    identities.add(identity);
    result.push({ type, key, name });
  }
  return result.sort((a, b) => a.type.localeCompare(b.type) || a.key.localeCompare(b.key));
}

function normalizeDiagnostics(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_DIAGNOSTICS) throw new Error("invalid_diagnostics");
  const result = new Set<string>();
  for (const raw of value) result.add(cleanText(raw, 200, "diagnostic", true));
  return [...result].sort((a, b) => a.localeCompare(b));
}

function validateSourceLineage(source: SignalSourceDescriptor, market: MarketProfile, category: CategoryContext, signalType: SignalType): void {
  requireFingerprint(source.fingerprint, "source_fingerprint");
  requireFingerprint(market.fingerprint, "market_fingerprint");
  requireFingerprint(category.fingerprint, "category_fingerprint");
  if (!SIGNAL_TYPES.has(signalType)) throw new Error("invalid_signal_type");
  if (!source.signalTypes.includes(signalType)) throw new Error("source_signal_mismatch");
  if (!source.allowAnyMarket && !source.marketFingerprints.includes(market.fingerprint)) throw new Error("source_market_mismatch");
  if (!source.allowAnyCategory && !source.categoryFingerprints.includes(category.fingerprint)) throw new Error("source_category_mismatch");
  if (source.sourceClass === "external" && !source.manuallyReviewed) throw new Error("external_source_not_reviewed");
  if (!source.provenanceComplete) throw new Error("source_provenance_incomplete");
}

export function normalizeSignalSourceAdapter(input: SignalSourceAdapterInput): SignalSourceAdapter {
  const key = canonicalKey(input.key, "adapter_key");
  const adapterVersion = cleanText(input.adapterVersion, 80, "adapter_version", true);
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(adapterVersion)) throw new Error("invalid_adapter_version");
  if (!COLLECTION_MODES.has(input.collectionMode)) throw new Error("invalid_collection_mode");
  if (!OPERATION_CLASSES.has(input.operationClass)) throw new Error("invalid_operation_class");
  validateSourceLineage(input.source, input.market, input.category, input.signalType);
  if (input.collectionMode !== input.source.collectionMode) throw new Error("adapter_collection_mode_mismatch");

  const identity = {
    key,
    adapterVersion,
    sourceFingerprint: input.source.fingerprint,
    marketFingerprint: input.market.fingerprint,
    categoryFingerprint: input.category.fingerprint,
    signalType: input.signalType,
    collectionMode: input.collectionMode,
    operationClass: input.operationClass,
  };
  const adapterFingerprint = hash({ version: SIGNAL_SOURCE_ADAPTER_VERSION, ...identity });
  return {
    version: SIGNAL_SOURCE_ADAPTER_VERSION,
    adapterId: `adp-${adapterFingerprint.slice(0, 24)}`,
    adapterFingerprint,
    ...identity,
    sourceId: input.source.sourceId,
    sourceClass: input.source.sourceClass,
    trustClass: input.source.trustClass,
    quality: input.source.quality,
    safety: signalSourceAdapterCapability(),
  };
}

export function normalizeSignalObservation(inputValue: NormalizeSignalObservationInput | unknown): SignalObservation {
  const input = objectRecord(inputValue, "observation") as unknown as NormalizeSignalObservationInput;
  const payloadUnknown = (input as unknown as Record<string, unknown>).payload;
  if (payloadUnknown !== undefined) rejectForbiddenKeysDeep(payloadUnknown);

  validateSourceLineage(input.source, input.market, input.category, input.signalType);
  requireFingerprint(input.adapter.adapterFingerprint, "adapter_fingerprint");
  if (input.adapter.version !== SIGNAL_SOURCE_ADAPTER_VERSION) throw new Error("adapter_version_mismatch");
  if (input.adapter.sourceFingerprint !== input.source.fingerprint) throw new Error("adapter_source_mismatch");
  if (input.adapter.marketFingerprint !== input.market.fingerprint) throw new Error("adapter_market_mismatch");
  if (input.adapter.categoryFingerprint !== input.category.fingerprint) throw new Error("adapter_category_mismatch");
  if (input.adapter.signalType !== input.signalType) throw new Error("adapter_signal_mismatch");
  if (input.adapter.collectionMode !== input.source.collectionMode) throw new Error("adapter_collection_mode_mismatch");
  if (input.adapter.sourceClass !== input.source.sourceClass || input.adapter.trustClass !== input.source.trustClass || input.adapter.quality !== input.source.quality) {
    throw new Error("adapter_source_lineage_mismatch");
  }

  const observedAt = isoTimestamp(input.observedAt, "observed_at");
  const collectedAt = isoTimestamp(input.collectedAt, "collected_at");
  if (Date.parse(observedAt) > Date.parse(collectedAt)) throw new Error("observed_after_collected");

  const payload = payloadUnknown === undefined ? {} : objectRecord(payloadUnknown, "payload");
  const allowedPayloadKeys = new Set(["dimensions", "metrics", "terms", "entities", "provenance", "diagnostics"]);
  for (const key of Object.keys(payload)) if (!allowedPayloadKeys.has(key)) throw new Error("unsupported_payload_field");

  const dimensions = normalizePrimitiveRecord(payload.dimensions, "dimensions", MAX_DIMENSIONS);
  const metrics = normalizeMetrics(payload.metrics);
  const terms = normalizeTerms(payload.terms);
  const entities = normalizeEntities(payload.entities);
  const provenance = normalizePrimitiveRecord(payload.provenance, "provenance", MAX_PROVENANCE);
  const diagnostics = normalizeDiagnostics(payload.diagnostics);

  const content = { dimensions, metrics, terms, entities };
  const contentFingerprint = hash(content);
  const lineage = {
    adapterFingerprint: input.adapter.adapterFingerprint,
    sourceFingerprint: input.source.fingerprint,
    sourceClass: input.source.sourceClass,
    trustClass: input.source.trustClass,
    quality: input.source.quality,
    marketFingerprint: input.market.fingerprint,
    categoryFingerprint: input.category.fingerprint,
    signalType: input.signalType,
  };
  const observationFingerprint = hash({
    version: SIGNAL_SOURCE_ADAPTER_VERSION,
    ...lineage,
    observedAt,
    collectedAt,
    contentFingerprint,
    provenance,
    diagnostics,
  });

  return {
    version: SIGNAL_SOURCE_ADAPTER_VERSION,
    observationId: `obs-${observationFingerprint.slice(0, 24)}`,
    observationFingerprint,
    contentFingerprint,
    adapterId: input.adapter.adapterId,
    ...lineage,
    sourceId: input.source.sourceId,
    observedAt,
    collectedAt,
    dimensions,
    metrics,
    terms,
    entities,
    provenance,
    diagnostics,
    safety: signalSourceAdapterCapability(),
  };
}

export function signalSourceAdapterCapability() {
  return Object.freeze({
    version: SIGNAL_SOURCE_ADAPTER_VERSION,
    contractAndNormalizationOnly: true,
    networkCollectionAuthorized: false,
    providerEnrollmentAuthorized: false,
    credentialAccessAuthorized: false,
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
    executionAuthorized: false,
    schemaMutationRequired: false,
  });
}
