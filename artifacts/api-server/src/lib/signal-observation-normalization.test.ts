import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCategoryContext, normalizeMarketProfile } from "./market-category-intelligence.js";
import { buildSignalRefreshPlan, normalizeSignalSourceDescriptor } from "./signal-source-registry.js";
import {
  buildObservationBatch,
  buildSourceAdapterRequest,
  normalizeAdapterResult,
  signalObservationNormalizationCapability,
} from "./signal-observation-normalization.js";

const now = "2026-09-14T12:00:00.000Z";
const observedAt = "2026-09-14T11:30:00.000Z";
const us = normalizeMarketProfile({ countryCode: "US", language: "en-US", currency: "USD", device: "all" });
const fragrance = normalizeCategoryContext({ key: "arabian-fragrance", name: "Arabian Fragrance" });
const candles = normalizeCategoryContext({ key: "candles", name: "Candles" });

type MetricInput = { key: string; value: number; unit?: string | null };

function source() {
  return normalizeSignalSourceDescriptor({
    key: "gsc-query-evidence",
    name: "Google Search Console Query Evidence",
    sourceClass: "first_party",
    signalTypes: ["keyword"],
    allowAnyMarket: true,
    allowAnyCategory: true,
    trustClass: "first_party_authoritative",
    quality: 0.95,
    provenanceComplete: true,
    freshness: { freshForMinutes: 720, staleAfterMinutes: 1440, criticalAfterMinutes: 4320, volatility: "medium" },
    collectionMode: "provider_api",
    manuallyReviewed: true,
  });
}

function fixture(category = fragrance) {
  const src = source();
  const plan = buildSignalRefreshPlan({
    sources: [src],
    need: { market: us, category, signalTypes: ["keyword"], now },
    budget: { maxSources: 1, maxSignalTypesPerSource: 1, maxTotalRefreshItems: 1 },
  });
  assert.equal(plan.selected.length, 1);
  const request = buildSourceAdapterRequest({
    source: src,
    planItem: plan.selected[0]!,
    market: us,
    category,
    planId: plan.planId,
    planFingerprint: plan.planFingerprint,
  });
  return { src, plan, request, category };
}

function successResult(f = fixture(), metrics: MetricInput[] = [{ key: "impressions", value: 120, unit: "count" }]) {
  return {
    requestFingerprint: f.request.requestFingerprint,
    sourceId: f.request.sourceId,
    sourceFingerprint: f.request.sourceFingerprint,
    sourceClass: f.request.sourceClass,
    marketFingerprint: f.request.marketFingerprint,
    categoryFingerprint: f.request.categoryFingerprint,
    signalType: f.request.signalType,
    observedAt,
    status: "success",
    metrics,
  };
}

test("capability is contract-only and keeps every execution/persistence gate closed", () => {
  const cap = signalObservationNormalizationCapability();
  assert.equal(cap.contractAndNormalizationOnly, true);
  assert.equal(cap.networkCollectionAuthorized, false);
  assert.equal(cap.transportExecutionAuthorized, false);
  assert.equal(cap.providerEnrollmentAuthorized, false);
  assert.equal(cap.credentialUseAuthorized, false);
  assert.equal(cap.credentialMutationAuthorized, false);
  assert.equal(cap.rawPayloadRetentionAuthorized, false);
  assert.equal(cap.evidencePersistenceAuthorized, false);
  assert.equal(cap.targetConfigurationMutationAuthorized, false);
  assert.equal(cap.schedulerEnabled, false);
  assert.equal(cap.batchExecutorEnabled, false);
  assert.equal(cap.autonomousWorkerEnabled, false);
  assert.equal(cap.retryLoopEnabled, false);
  assert.equal(cap.providerWrites, false);
  assert.equal(cap.publicSiteWrites, false);
  assert.equal(cap.automaticTransition, false);
  assert.equal(cap.schemaMutationRequired, false);
});

test("adapter request identity is deterministic and bound to exact Task #67 lineage", () => {
  const a = fixture();
  const b = fixture();
  assert.equal(a.request.requestFingerprint, b.request.requestFingerprint);
  assert.equal(a.request.requestId, b.request.requestId);
  assert.equal(a.request.sourceFingerprint, a.plan.selected[0]!.sourceFingerprint);
  assert.equal(a.request.sourceId, a.plan.selected[0]!.sourceId);
  assert.equal(a.request.sourceClass, a.plan.selected[0]!.sourceClass);
  assert.equal(a.request.planId, a.plan.planId);
  assert.equal(a.request.planFingerprint, a.plan.planFingerprint);
  assert.match(a.request.requestId, /^sar-[0-9a-f]{24}$/);
});

test("request construction fails closed on source/item mismatch", () => {
  const f = fixture();
  assert.throws(() => buildSourceAdapterRequest({
    source: f.src,
    planItem: { ...f.plan.selected[0]!, sourceId: "src-000000000000000000000000" },
    market: us,
    category: fragrance,
    planId: f.plan.planId,
    planFingerprint: f.plan.planFingerprint,
  }), /source_id_mismatch/);
  assert.throws(() => buildSourceAdapterRequest({
    source: f.src,
    planItem: f.plan.selected[0]!,
    market: us,
    category: fragrance,
    planId: f.plan.planId,
  }), /incomplete_refresh_plan_lineage/);
});

test("successful observation is deterministic across metric insertion order", () => {
  const f = fixture();
  const a = normalizeAdapterResult({
    request: f.request,
    source: f.src,
    normalizedAt: now,
    result: successResult(f, [
      { key: "clicks", value: 12, unit: "count" },
      { key: "impressions", value: 120, unit: "count" },
    ]),
  });
  const b = normalizeAdapterResult({
    request: f.request,
    source: f.src,
    normalizedAt: now,
    result: successResult(f, [
      { key: "impressions", value: 120, unit: "count" },
      { key: "clicks", value: 12, unit: "count" },
    ]),
  });
  assert.equal(a.observationFingerprint, b.observationFingerprint);
  assert.equal(a.observationId, b.observationId);
  assert.deepEqual(a.metrics.map((value) => value.key), ["clicks", "impressions"]);
  assert.equal(a.status, "success");
  assert.equal(a.positiveEvidence, true);
  assert.equal(a.completeness, 1);
  assert.equal(a.confidence, 0.95);
});

test("empty is a successful no-evidence state distinct from failure", () => {
  const f = fixture();
  const result = { ...successResult(f, []), status: "empty" };
  const observation = normalizeAdapterResult({ request: f.request, source: f.src, result, normalizedAt: now });
  assert.equal(observation.status, "empty");
  assert.deepEqual(observation.metrics, []);
  assert.equal(observation.errorCode, null);
  assert.equal(observation.positiveEvidence, false);
  assert.equal(observation.completeness, 1);
  assert.equal(observation.confidence, 0.95);
});

test("partial requires diagnostics and reduces confidence deterministically", () => {
  const f = fixture();
  const result = {
    ...successResult(f),
    status: "partial",
    diagnostics: ["row_limit"],
    completeness: 0.5,
  };
  const observation = normalizeAdapterResult({ request: f.request, source: f.src, result, normalizedAt: now });
  assert.equal(observation.status, "partial");
  assert.equal(observation.completeness, 0.5);
  assert.equal(observation.confidence, 0.4275);
  assert.equal(observation.positiveEvidence, true);
  assert.throws(() => normalizeAdapterResult({
    request: f.request,
    source: f.src,
    normalizedAt: now,
    result: { ...successResult(f), status: "partial", completeness: 0.5 },
  }), /partial_requires_diagnostic/);
});

test("error is sanitized, carries no evidence, and has zero confidence", () => {
  const f = fixture();
  const result = {
    ...successResult(f, []),
    status: "error",
    errorCode: "provider_timeout",
    diagnostics: ["retryable_transport_error"],
    completeness: 0,
  };
  const observation = normalizeAdapterResult({ request: f.request, source: f.src, result, normalizedAt: now });
  assert.equal(observation.status, "error");
  assert.deepEqual(observation.metrics, []);
  assert.equal(observation.errorCode, "provider_timeout");
  assert.equal(observation.confidence, 0);
  assert.equal(observation.positiveEvidence, false);
});

test("source, market, category, and signal tampering fails closed", () => {
  const f = fixture();
  const base = successResult(f);
  assert.throws(() => normalizeAdapterResult({ request: f.request, source: f.src, normalizedAt: now, result: { ...base, sourceFingerprint: "0".repeat(64) } }), /source_fingerprint_mismatch/);
  assert.throws(() => normalizeAdapterResult({ request: f.request, source: f.src, normalizedAt: now, result: { ...base, marketFingerprint: "0".repeat(64) } }), /market_mismatch/);
  assert.throws(() => normalizeAdapterResult({ request: f.request, source: f.src, normalizedAt: now, result: { ...base, categoryFingerprint: "0".repeat(64) } }), /category_mismatch/);
  assert.throws(() => normalizeAdapterResult({ request: f.request, source: f.src, normalizedAt: now, result: { ...base, signalType: "trend" } }), /signal_type_mismatch/);
});

test("malformed and future observation timestamps fail closed", () => {
  const f = fixture();
  assert.throws(() => normalizeAdapterResult({ request: f.request, source: f.src, normalizedAt: now, result: { ...successResult(f), observedAt: "not-a-date" } }), /invalid_observed_at/);
  assert.throws(() => normalizeAdapterResult({ request: f.request, source: f.src, normalizedAt: now, result: { ...successResult(f), observedAt: "2026-09-14T12:00:01.000Z" } }), /observed_at_in_future/);
});

test("metric duplicates, malformed keys, and out-of-range values fail closed", () => {
  const f = fixture();
  assert.throws(() => normalizeAdapterResult({
    request: f.request,
    source: f.src,
    normalizedAt: now,
    result: successResult(f, [{ key: "clicks", value: 1 }, { key: "Clicks", value: 2 }]),
  }), /duplicate_metric_key/);
  assert.throws(() => normalizeAdapterResult({ request: f.request, source: f.src, normalizedAt: now, result: successResult(f, [{ key: "bad key", value: 1 }]) }), /invalid_metric_key/);
  assert.throws(() => normalizeAdapterResult({ request: f.request, source: f.src, normalizedAt: now, result: successResult(f, [{ key: "clicks", value: 1e20 }]) }), /invalid_metric_value/);
});

test("raw payload or unknown provider-copy fields are rejected rather than ignored", () => {
  const f = fixture();
  assert.throws(() => normalizeAdapterResult({
    request: f.request,
    source: f.src,
    normalizedAt: now,
    result: { ...successResult(f), rawPayload: "provider body" },
  }), /unexpected_adapter_result_field:rawPayload/);
  assert.throws(() => normalizeAdapterResult({
    request: f.request,
    source: f.src,
    normalizedAt: now,
    result: { ...successResult(f), metrics: [{ key: "clicks", value: 1, rawText: "copy" }] },
  }), /unexpected_metric_field:rawText/);
});

test("exact duplicate observations collapse deterministically", () => {
  const f = fixture();
  const observation = normalizeAdapterResult({ request: f.request, source: f.src, result: successResult(f), normalizedAt: now });
  const batch = buildObservationBatch({ observations: [observation, observation] });
  assert.equal(batch.observations.length, 1);
  assert.equal(batch.observations[0]!.observationFingerprint, observation.observationFingerprint);
});

test("same stream and observation time with conflicting content fails closed", () => {
  const f = fixture();
  const a = normalizeAdapterResult({ request: f.request, source: f.src, result: successResult(f, [{ key: "impressions", value: 100 }]), normalizedAt: now });
  const b = normalizeAdapterResult({ request: f.request, source: f.src, result: successResult(f, [{ key: "impressions", value: 101 }]), normalizedAt: now });
  assert.equal(a.streamId, b.streamId);
  assert.equal(a.observedAt, b.observedAt);
  assert.notEqual(a.observationFingerprint, b.observationFingerprint);
  assert.throws(() => buildObservationBatch({ observations: [a, b] }), /conflicting_observation_same_timestamp/);
});

test("batch identity is deterministic independent of input order and bounded", () => {
  const f = fixture();
  const first = normalizeAdapterResult({ request: f.request, source: f.src, result: successResult(f, [{ key: "impressions", value: 100 }]), normalizedAt: now });
  const second = normalizeAdapterResult({
    request: f.request,
    source: f.src,
    normalizedAt: now,
    result: { ...successResult(f, [{ key: "impressions", value: 110 }]), observedAt: "2026-09-14T11:45:00.000Z" },
  });
  const a = buildObservationBatch({ observations: [first, second] });
  const b = buildObservationBatch({ observations: [second, first] });
  assert.equal(a.batchFingerprint, b.batchFingerprint);
  assert.equal(a.batchId, b.batchId);
  assert.throws(() => buildObservationBatch({ observations: [first, second], maxObservations: 1 }), /invalid_observations/);
});

test("batch construction fails closed instead of mixing category scopes", () => {
  const a = fixture(fragrance);
  const b = fixture(candles);
  const first = normalizeAdapterResult({ request: a.request, source: a.src, result: successResult(a), normalizedAt: now });
  const second = normalizeAdapterResult({ request: b.request, source: b.src, result: successResult(b), normalizedAt: now });
  assert.throws(() => buildObservationBatch({ observations: [first, second] }), /mixed_category_scope/);
});
