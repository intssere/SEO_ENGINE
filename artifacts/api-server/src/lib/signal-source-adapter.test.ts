import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCategoryContext, normalizeMarketProfile } from "./market-category-intelligence.js";
import { normalizeSignalSourceDescriptor } from "./signal-source-registry.js";
import {
  normalizeSignalObservation,
  normalizeSignalSourceAdapter,
  signalSourceAdapterCapability,
} from "./signal-source-adapter.js";

const us = normalizeMarketProfile({ countryCode: "US", language: "en-US", currency: "USD", device: "all" });
const gb = normalizeMarketProfile({ countryCode: "GB", language: "en-GB", currency: "GBP", device: "all" });
const arabian = normalizeCategoryContext({ key: "arabian-fragrance", name: "Arabian Fragrance" });
const candles = normalizeCategoryContext({ key: "candles", name: "Candles" });

function source(overrides: Record<string, unknown> = {}) {
  return normalizeSignalSourceDescriptor({
    key: "reviewed-keyword-source",
    name: "Reviewed Keyword Source",
    sourceClass: "external",
    signalTypes: ["keyword", "trend"],
    marketFingerprints: [us.fingerprint],
    categoryFingerprints: [arabian.fingerprint],
    trustClass: "reviewed_external",
    quality: 0.9,
    provenanceComplete: true,
    freshness: { freshForMinutes: 60, staleAfterMinutes: 120, criticalAfterMinutes: 360, volatility: "high" },
    collectionMode: "provider_api",
    manuallyReviewed: true,
    ...overrides,
  } as Parameters<typeof normalizeSignalSourceDescriptor>[0]);
}

function firstPartySource() {
  return normalizeSignalSourceDescriptor({
    key: "gsc-query-evidence",
    name: "Google Search Console Query Evidence",
    sourceClass: "first_party",
    signalTypes: ["keyword"],
    allowAnyMarket: true,
    allowAnyCategory: true,
    trustClass: "first_party_authoritative",
    quality: 1,
    provenanceComplete: true,
    freshness: { freshForMinutes: 720, staleAfterMinutes: 1440, criticalAfterMinutes: 4320, volatility: "medium" },
    collectionMode: "provider_api",
    manuallyReviewed: true,
  });
}

function adapterFor(src = source()) {
  return normalizeSignalSourceAdapter({
    key: "keyword-snapshot",
    adapterVersion: "v1",
    source: src,
    market: us,
    category: arabian,
    signalType: "keyword",
    collectionMode: "provider_api",
    operationClass: "read_snapshot",
  });
}

function observationInput(overrides: Record<string, unknown> = {}) {
  const src = source();
  const adapter = adapterFor(src);
  return {
    adapter,
    source: src,
    market: us,
    category: arabian,
    signalType: "keyword" as const,
    observedAt: "2026-09-14T10:00:00.000Z",
    collectedAt: "2026-09-14T10:05:00.000Z",
    payload: {
      dimensions: { device: "Mobile", country: "US" },
      metrics: { impressions: 1200, clicks: 48, ctr: 0.04 },
      terms: ["Arabian Perfume", "lattafa", "arabian perfume"],
      entities: [
        { type: "brand", key: "lattafa", name: "Lattafa" },
        { type: "category", key: "arabian-fragrance", name: "Arabian Fragrance" },
      ],
      provenance: { provider_dataset: "keyword-snapshot", request_class: "aggregate" },
      diagnostics: ["Normalized Aggregate", "normalized aggregate"],
    },
    ...overrides,
  };
}

test("capability remains normalization-only with all execution and persistence gates closed", () => {
  const cap = signalSourceAdapterCapability();
  assert.equal(cap.contractAndNormalizationOnly, true);
  assert.equal(cap.networkCollectionAuthorized, false);
  assert.equal(cap.providerEnrollmentAuthorized, false);
  assert.equal(cap.credentialAccessAuthorized, false);
  assert.equal(cap.credentialMutationAuthorized, false);
  assert.equal(cap.evidencePersistenceAuthorized, false);
  assert.equal(cap.targetConfigurationMutationAuthorized, false);
  assert.equal(cap.schedulerEnabled, false);
  assert.equal(cap.batchEnabled, false);
  assert.equal(cap.autonomousWorkerEnabled, false);
  assert.equal(cap.retryLoopEnabled, false);
  assert.equal(cap.providerWrites, false);
  assert.equal(cap.publicSiteWrites, false);
  assert.equal(cap.automaticTransition, false);
  assert.equal(cap.executionAuthorized, false);
  assert.equal(cap.schemaMutationRequired, false);
});

test("adapter identity is deterministic and meaningful operation changes identity", () => {
  const src = source();
  const a = adapterFor(src);
  const b = adapterFor(src);
  const changed = normalizeSignalSourceAdapter({
    key: "keyword-snapshot",
    adapterVersion: "v1",
    source: src,
    market: us,
    category: arabian,
    signalType: "keyword",
    collectionMode: "provider_api",
    operationClass: "read_timeseries",
  });
  assert.equal(a.adapterFingerprint, b.adapterFingerprint);
  assert.equal(a.adapterId, b.adapterId);
  assert.notEqual(a.adapterFingerprint, changed.adapterFingerprint);
  assert.match(a.adapterId, /^adp-[0-9a-f]{24}$/);
});

test("adapter construction rejects source market, category, signal, and collection-mode mismatches", () => {
  const src = source();
  assert.throws(() => normalizeSignalSourceAdapter({ key: "x", adapterVersion: "v1", source: src, market: gb, category: arabian, signalType: "keyword", collectionMode: "provider_api", operationClass: "read_snapshot" }), /source_market_mismatch/);
  assert.throws(() => normalizeSignalSourceAdapter({ key: "x", adapterVersion: "v1", source: src, market: us, category: candles, signalType: "keyword", collectionMode: "provider_api", operationClass: "read_snapshot" }), /source_category_mismatch/);
  assert.throws(() => normalizeSignalSourceAdapter({ key: "x", adapterVersion: "v1", source: src, market: us, category: arabian, signalType: "serp", collectionMode: "provider_api", operationClass: "read_snapshot" }), /source_signal_mismatch/);
  assert.throws(() => normalizeSignalSourceAdapter({ key: "x", adapterVersion: "v1", source: src, market: us, category: arabian, signalType: "keyword", collectionMode: "secure_http", operationClass: "read_snapshot" }), /adapter_collection_mode_mismatch/);
});

test("unreviewed external source fails closed before adapter creation", () => {
  const src = source({ manuallyReviewed: false });
  assert.throws(() => adapterFor(src), /external_source_not_reviewed/);
});

test("observation fingerprint is deterministic independent of record and array insertion ordering", () => {
  const base = observationInput();
  const a = normalizeSignalObservation(base);
  const reordered = {
    ...base,
    payload: {
      diagnostics: ["normalized aggregate"],
      provenance: { request_class: "aggregate", provider_dataset: "keyword-snapshot" },
      entities: [
        { type: "category", key: "arabian-fragrance", name: "Arabian Fragrance" },
        { type: "brand", key: "lattafa", name: "Lattafa" },
      ],
      terms: ["lattafa", "arabian perfume"],
      metrics: { ctr: 0.04, clicks: 48, impressions: 1200 },
      dimensions: { country: "US", device: "Mobile" },
    },
  };
  const b = normalizeSignalObservation(reordered);
  assert.equal(a.contentFingerprint, b.contentFingerprint);
  assert.equal(a.observationFingerprint, b.observationFingerprint);
  assert.equal(a.observationId, b.observationId);
});

test("source class, trust, quality, market, category, and signal lineage are preserved", () => {
  const external = normalizeSignalObservation(observationInput());
  assert.equal(external.sourceClass, "external");
  assert.equal(external.trustClass, "reviewed_external");
  assert.equal(external.quality, 0.9);
  assert.equal(external.marketFingerprint, us.fingerprint);
  assert.equal(external.categoryFingerprint, arabian.fingerprint);
  assert.equal(external.signalType, "keyword");

  const src = firstPartySource();
  const adapter = normalizeSignalSourceAdapter({ key: "gsc-query", adapterVersion: "v1", source: src, market: us, category: arabian, signalType: "keyword", collectionMode: "provider_api", operationClass: "read_snapshot" });
  const firstParty = normalizeSignalObservation({ adapter, source: src, market: us, category: arabian, signalType: "keyword", observedAt: "2026-09-14T10:00:00Z", collectedAt: "2026-09-14T10:01:00Z" });
  assert.equal(firstParty.sourceClass, "first_party");
  assert.equal(firstParty.trustClass, "first_party_authoritative");
  assert.equal(firstParty.quality, 1);
});

test("metric and primitive records are canonicalized deterministically", () => {
  const input = observationInput();
  input.payload.metrics = { Z_SCORE: -0, clicks: 48, CTR: 0.04 };
  input.payload.dimensions = { Device: " Mobile  Search ", country: "US" };
  const result = normalizeSignalObservation(input);
  assert.deepEqual(Object.keys(result.metrics), ["clicks", "ctr", "z_score"]);
  assert.equal(result.metrics.z_score, 0);
  assert.deepEqual(Object.keys(result.dimensions), ["country", "device"]);
  assert.equal(result.dimensions.device, "Mobile Search");
});

test("duplicate canonical record keys and entity keys fail closed", () => {
  const duplicateDimension = observationInput();
  duplicateDimension.payload.dimensions = { Query: "a", query: "b" };
  assert.throws(() => normalizeSignalObservation(duplicateDimension), /duplicate_dimensions_key/);

  const duplicateEntity = observationInput();
  duplicateEntity.payload.entities = [
    { type: "brand", key: "lattafa", name: "Lattafa" },
    { type: "BRAND", key: "LATTAFA", name: "Lattafa duplicate" },
  ];
  assert.throws(() => normalizeSignalObservation(duplicateEntity), /duplicate_entity_key/);
});

test("invalid timestamps and non-finite or unbounded metrics fail closed", () => {
  assert.throws(() => normalizeSignalObservation(observationInput({ observedAt: "not-a-date" })), /invalid_observed_at/);
  assert.throws(() => normalizeSignalObservation(observationInput({ observedAt: "2026-09-14T11:00:00Z", collectedAt: "2026-09-14T10:00:00Z" })), /observed_after_collected/);

  const nan = observationInput();
  nan.payload.metrics = { score: Number.NaN };
  assert.throws(() => normalizeSignalObservation(nan), /invalid_metric_value/);

  const huge = observationInput();
  huge.payload.metrics = { score: 1e16 };
  assert.throws(() => normalizeSignalObservation(huge), /invalid_metric_value/);
});

test("bounded payload limits reject oversized arrays and records", () => {
  const tooManyTerms = observationInput();
  tooManyTerms.payload.terms = Array.from({ length: 101 }, (_, index) => `term-${index}`);
  assert.throws(() => normalizeSignalObservation(tooManyTerms), /invalid_terms/);

  const tooManyMetrics = observationInput();
  tooManyMetrics.payload.metrics = Object.fromEntries(Array.from({ length: 65 }, (_, index) => [`m${index}`, index]));
  assert.throws(() => normalizeSignalObservation(tooManyMetrics), /too_many_metrics/);
});

test("raw-body, header, token, credential, password, and secret-like fields are rejected", () => {
  for (const forbiddenKey of ["rawBody", "response_headers", "access_token", "api_key", "password", "client_secret"]) {
    const input = observationInput();
    (input.payload.provenance as Record<string, unknown>)[forbiddenKey] = "do-not-retain";
    assert.throws(() => normalizeSignalObservation(input), /forbidden_sensitive_field/);
  }
});

test("adapter lineage tampering fails closed", () => {
  const input = observationInput();
  input.adapter = { ...input.adapter, quality: 0.1 };
  assert.throws(() => normalizeSignalObservation(input), /adapter_source_lineage_mismatch/);

  const otherMarket = { ...input, market: gb };
  assert.throws(() => normalizeSignalObservation(otherMarket), /source_market_mismatch|adapter_market_mismatch/);
});

test("identical normalized payload and lineage produce identical fingerprints", () => {
  const a = normalizeSignalObservation(observationInput());
  const b = normalizeSignalObservation(observationInput());
  assert.equal(a.observationFingerprint, b.observationFingerprint);
  assert.equal(a.contentFingerprint, b.contentFingerprint);
});

test("meaningful content or lineage changes change fingerprints", () => {
  const base = normalizeSignalObservation(observationInput());
  const changedMetricInput = observationInput();
  changedMetricInput.payload.metrics.clicks = 49;
  const changedMetric = normalizeSignalObservation(changedMetricInput);
  assert.notEqual(base.contentFingerprint, changedMetric.contentFingerprint);
  assert.notEqual(base.observationFingerprint, changedMetric.observationFingerprint);

  const changedTime = normalizeSignalObservation(observationInput({ collectedAt: "2026-09-14T10:06:00.000Z" }));
  assert.equal(base.contentFingerprint, changedTime.contentFingerprint);
  assert.notEqual(base.observationFingerprint, changedTime.observationFingerprint);
});

test("unknown payload fields fail closed and cannot become implicit normalized evidence", () => {
  const input = observationInput();
  (input.payload as unknown as Record<string, unknown>).opaque = "unexpected";
  assert.throws(() => normalizeSignalObservation(input), /unsupported_payload_field/);
});
