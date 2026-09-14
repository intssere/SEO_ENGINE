import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCategoryContext, normalizeMarketProfile, type SignalType } from "./market-category-intelligence.js";
import { normalizeSignalSourceDescriptor } from "./signal-source-registry.js";
import {
  normalizeSignalObservation,
  normalizeSourceAdapterDescriptor,
  sourceAdapterNormalizationCapability,
  type AdapterResultInput,
} from "./source-adapter-normalization.js";

const SIGNAL_TYPES: SignalType[] = ["analytics", "catalog", "competitor", "entity", "geo_aio", "keyword", "serp", "trend"];
const us = normalizeMarketProfile({ countryCode: "US", language: "en-US", currency: "USD", device: "all" });
const gb = normalizeMarketProfile({ countryCode: "GB", language: "en-GB", currency: "GBP", device: "all" });
const arabian = normalizeCategoryContext({ key: "arabian-fragrance", name: "Arabian Fragrance" });
const candles = normalizeCategoryContext({ key: "candles", name: "Candles" });

function source(overrides: Record<string, unknown> = {}) {
  return normalizeSignalSourceDescriptor({
    key: "reviewed-market-signal-source",
    name: "Reviewed Market Signal Source",
    sourceClass: "external",
    signalTypes: SIGNAL_TYPES,
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

function adapter(src = source(), overrides: Record<string, unknown> = {}) {
  return normalizeSourceAdapterDescriptor({
    key: "normalized-market-signal-adapter",
    name: "Normalized Market Signal Adapter",
    adapterVersion: "v1",
    source: src,
    signalTypes: SIGNAL_TYPES,
    collectionMode: "provider_api",
    maxItems: 25,
    supportsPartial: true,
    ...overrides,
  } as Parameters<typeof normalizeSourceAdapterDescriptor>[0]);
}

function result(src = source(), ad = adapter(src), signalType: SignalType = "keyword", overrides: Record<string, unknown> = {}): AdapterResultInput {
  return {
    adapterFingerprint: ad.fingerprint,
    sourceFingerprint: src.fingerprint,
    correlationId: "refresh-plan/item-001",
    signalType,
    marketFingerprint: us.fingerprint,
    categoryFingerprint: arabian.fingerprint,
    observedAt: "2026-09-14T10:00:00.000Z",
    collectedAt: "2026-09-14T10:01:00.000Z",
    completeness: "complete",
    confidence: 0.88,
    provenance: { provider: "reviewed-source", method: "bounded-result", verified: true },
    diagnostics: [],
    items: [{ key: "lattafa-khamrah", subject: "Lattafa Khamrah", terms: ["lattafa khamrah"], metrics: { score: 72 }, attributes: { intent: "commercial" } }],
    ...overrides,
  } as AdapterResultInput;
}

function normalize(src = source(), ad = adapter(src), input = result(src, ad)) {
  return normalizeSignalObservation({ adapter: ad, source: src, market: us, category: arabian, result: input, now: "2026-09-14T10:05:00.000Z" });
}

test("capability remains contract-only with every live/persistence/write gate closed", () => {
  const cap = sourceAdapterNormalizationCapability();
  assert.equal(cap.contractAndNormalizationOnly, true);
  assert.equal(cap.networkCollectionAuthorized, false);
  assert.equal(cap.providerEnrollmentAuthorized, false);
  assert.equal(cap.credentialMutationAuthorized, false);
  assert.equal(cap.observationPersistenceAuthorized, false);
  assert.equal(cap.evidencePersistenceAuthorized, false);
  assert.equal(cap.targetConfigurationMutationAuthorized, false);
  assert.equal(cap.schedulerEnabled, false);
  assert.equal(cap.batchEnabled, false);
  assert.equal(cap.autonomousWorkerEnabled, false);
  assert.equal(cap.retryLoopEnabled, false);
  assert.equal(cap.providerWrites, false);
  assert.equal(cap.publicSiteWrites, false);
  assert.equal(cap.task64ExecutionAuthorized, false);
  assert.equal(cap.automaticTransition, false);
  assert.equal(cap.schemaMutationRequired, false);
});

test("adapter identity is deterministic and material descriptor changes alter identity", () => {
  const src = source();
  const a = adapter(src);
  const b = adapter(src);
  const changed = adapter(src, { maxItems: 20 });
  assert.equal(a.fingerprint, b.fingerprint);
  assert.equal(a.adapterId, b.adapterId);
  assert.notEqual(a.fingerprint, changed.fingerprint);
  assert.match(a.adapterId, /^sad-[0-9a-f]{24}$/);
});

test("observation identity is deterministic independent of item, term, metric, attribute, provenance, and diagnostic ordering", () => {
  const src = source();
  const ad = adapter(src);
  const a = result(src, ad, "keyword", {
    provenance: { z: "last", a: "first" },
    diagnostics: ["beta", "alpha"],
    items: [
      { key: "second", subject: "Second", terms: ["B", "a"], metrics: { z: 2, a: 1 }, attributes: { z: true, a: "x" } },
      { key: "first", subject: "First", terms: ["d", "c"], metrics: { y: 4, b: 3 }, attributes: { y: false, b: "q" } },
    ],
  });
  const b = result(src, ad, "keyword", {
    provenance: { a: "first", z: "last" },
    diagnostics: ["alpha", "beta"],
    items: [
      { key: "first", subject: "First", terms: ["c", "d"], metrics: { b: 3, y: 4 }, attributes: { b: "q", y: false } },
      { key: "second", subject: "Second", terms: ["a", "B"], metrics: { a: 1, z: 2 }, attributes: { a: "x", z: true } },
    ],
  });
  const one = normalize(src, ad, a);
  const two = normalize(src, ad, b);
  assert.equal(one.observationFingerprint, two.observationFingerprint);
  assert.equal(one.observationId, two.observationId);
  assert.deepEqual(one.items.map((item) => item.key), ["first", "second"]);
});

test("material evidence changes observation identity", () => {
  const src = source();
  const ad = adapter(src);
  const a = normalize(src, ad, result(src, ad, "trend", { items: [{ key: "trend", subject: "Trend", metrics: { velocity: 10 } }] }));
  const b = normalize(src, ad, result(src, ad, "trend", { items: [{ key: "trend", subject: "Trend", metrics: { velocity: 11 } }] }));
  assert.notEqual(a.observationFingerprint, b.observationFingerprint);
});

test("adapter/source/market/category/signal mismatches fail closed", () => {
  const src = source();
  const ad = adapter(src);
  const base = result(src, ad);
  assert.throws(() => normalize(src, ad, { ...base, adapterFingerprint: "a".repeat(64) }), /adapter_fingerprint_mismatch/);
  assert.throws(() => normalize(src, ad, { ...base, sourceFingerprint: "b".repeat(64) }), /source_fingerprint_mismatch/);
  assert.throws(() => normalize(src, ad, { ...base, marketFingerprint: gb.fingerprint }), /market_fingerprint_mismatch/);
  assert.throws(() => normalize(src, ad, { ...base, categoryFingerprint: candles.fingerprint }), /category_fingerprint_mismatch/);
  const keywordOnly = adapter(src, { signalTypes: ["keyword"] });
  assert.throws(() => normalize(src, keywordOnly, result(src, keywordOnly, "trend")), /adapter_signal_type_mismatch/);
});

test("source market/category eligibility remains enforced after envelope fingerprint checks", () => {
  const wrongMarketSource = source({ marketFingerprints: [gb.fingerprint] });
  const ad = adapter(wrongMarketSource);
  const input = result(wrongMarketSource, ad, "keyword");
  assert.throws(() => normalizeSignalObservation({ adapter: ad, source: wrongMarketSource, market: us, category: arabian, result: input, now: "2026-09-14T10:05:00.000Z" }), /source_ineligible:market_not_supported/);
});

test("confidence and source quality bounds fail closed", () => {
  const src = source();
  const ad = adapter(src);
  assert.throws(() => normalize(src, ad, result(src, ad, "keyword", { confidence: 1.01 })), /invalid_confidence/);
  const tamperedSource = { ...src, quality: 1.1 };
  assert.throws(() => normalizeSignalObservation({ adapter: ad, source: tamperedSource, market: us, category: arabian, result: result(src, ad), now: "2026-09-14T10:05:00.000Z" }), /invalid_source_quality/);
});

test("provenance is required and source provenance must be complete", () => {
  const src = source();
  const ad = adapter(src);
  assert.throws(() => normalize(src, ad, result(src, ad, "keyword", { provenance: {} })), /provenance_required/);
  const incomplete = source({ provenanceComplete: false });
  const incompleteAdapter = adapter(incomplete);
  assert.throws(() => normalizeSignalObservation({ adapter: incompleteAdapter, source: incomplete, market: us, category: arabian, result: result(incomplete, incompleteAdapter), now: "2026-09-14T10:05:00.000Z" }), /source_ineligible:provenance_incomplete/);
});

test("timestamp ordering and future collection fail closed", () => {
  const src = source();
  const ad = adapter(src);
  assert.throws(() => normalize(src, ad, result(src, ad, "keyword", { observedAt: "2026-09-14T10:02:00.000Z", collectedAt: "2026-09-14T10:01:00.000Z" })), /observed_after_collected/);
  assert.throws(() => normalize(src, ad, result(src, ad, "keyword", { collectedAt: "2026-09-14T10:06:00.000Z" })), /collected_at_in_future/);
  assert.throws(() => normalize(src, ad, result(src, ad, "keyword", { observedAt: "bad-date" })), /invalid_observed_at/);
});

test("duplicate normalized keys fail closed", () => {
  const src = source();
  const ad = adapter(src);
  assert.throws(() => normalize(src, ad, result(src, ad, "keyword", {
    items: [
      { key: "Lattafa-Khamrah", subject: "A" },
      { key: "lattafa-khamrah", subject: "B" },
    ],
  })), /duplicate_normalized_item_key/);
});

test("adapter item budget is enforced", () => {
  const src = source();
  const ad = adapter(src, { maxItems: 1 });
  assert.throws(() => normalize(src, ad, result(src, ad, "keyword", {
    items: [{ key: "one", subject: "One" }, { key: "two", subject: "Two" }],
  })), /adapter_item_budget_exceeded/);
});

test("forbidden sensitive/raw fields fail closed even when supplied as runtime extras", () => {
  const src = source();
  const ad = adapter(src);
  const unsafe = result(src, ad) as AdapterResultInput & { authorization?: string };
  unsafe.authorization = "Bearer should-never-be-retained";
  assert.throws(() => normalize(src, ad, unsafe), /forbidden_sensitive_or_raw_field/);
  const unsafeNested = result(src, ad, "keyword", { provenance: { raw_html: "<html>...</html>" } });
  assert.throws(() => normalize(src, ad, unsafeNested), /forbidden_sensitive_or_raw_field/);
});

test("non-finite metrics fail closed", () => {
  const src = source();
  const ad = adapter(src);
  assert.throws(() => normalize(src, ad, result(src, ad, "trend", {
    items: [{ key: "velocity", subject: "Velocity", metrics: { velocity: Number.POSITIVE_INFINITY } }],
  })), /invalid_metric_value/);
});

test("partial results require adapter support and explicit diagnostics", () => {
  const src = source();
  const ad = adapter(src);
  assert.throws(() => normalize(src, ad, result(src, ad, "serp", { completeness: "partial", diagnostics: [] })), /partial_result_requires_diagnostics/);
  const noPartial = adapter(src, { supportsPartial: false });
  assert.throws(() => normalize(src, noPartial, result(src, noPartial, "serp", { completeness: "partial", diagnostics: ["page_budget_reached"] })), /partial_result_not_supported/);
  const valid = normalize(src, ad, result(src, ad, "serp", { completeness: "partial", diagnostics: ["page_budget_reached"] }));
  assert.equal(valid.completeness, "partial");
  assert.deepEqual(valid.diagnostics, ["page_budget_reached"]);
});

test("all eight signal types normalize into the same canonical bounded envelope", () => {
  const src = source();
  const ad = adapter(src);
  for (const signalType of SIGNAL_TYPES) {
    const envelope = normalize(src, ad, result(src, ad, signalType, {
      correlationId: `refresh/${signalType}`,
      items: [{ key: signalType, subject: `${signalType} observation`, terms: [signalType], metrics: { value: 1 }, attributes: { signal_type: signalType } }],
    }));
    assert.equal(envelope.signalType, signalType);
    assert.equal(envelope.items.length, 1);
    assert.match(envelope.observationId, /^obs-[0-9a-f]{24}$/);
    assert.equal(envelope.safety.networkCollectionAuthorized, false);
    assert.equal(envelope.safety.observationPersistenceAuthorized, false);
  }
});

test("collection mode and adapter signal coverage cannot exceed the source descriptor", () => {
  const src = source({ signalTypes: ["keyword"] });
  assert.throws(() => adapter(src, { signalTypes: ["keyword", "trend"] }), /adapter_signal_type_not_supported_by_source/);
  assert.throws(() => adapter(src, { signalTypes: ["keyword"], collectionMode: "secure_http" }), /collection_mode_mismatch/);
});
