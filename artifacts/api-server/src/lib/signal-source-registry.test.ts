import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCategoryContext, normalizeMarketProfile } from "./market-category-intelligence.js";
import {
  buildSignalRefreshPlan,
  classifyFreshness,
  normalizeSignalSourceDescriptor,
  signalSourceRegistryCapability,
  sourceEligibility,
} from "./signal-source-registry.js";

const us = normalizeMarketProfile({ countryCode: "US", language: "en-US", currency: "USD", device: "all" });
const gb = normalizeMarketProfile({ countryCode: "GB", language: "en-GB", currency: "GBP", device: "all" });
const arabian = normalizeCategoryContext({ key: "arabian-fragrance", name: "Arabian Fragrance" });
const candles = normalizeCategoryContext({ key: "candles", name: "Candles" });

function externalTrend(overrides: Record<string, unknown> = {}) {
  return normalizeSignalSourceDescriptor({
    key: "reviewed-trend-source",
    name: "Reviewed Trend Source",
    sourceClass: "external",
    signalTypes: ["trend", "keyword"],
    marketFingerprints: [us.fingerprint],
    categoryFingerprints: [arabian.fingerprint],
    trustClass: "reviewed_external",
    quality: 0.85,
    provenanceComplete: true,
    freshness: { freshForMinutes: 60, staleAfterMinutes: 120, criticalAfterMinutes: 360, volatility: "high" },
    collectionMode: "provider_api",
    manuallyReviewed: true,
    ...overrides,
  } as Parameters<typeof normalizeSignalSourceDescriptor>[0]);
}

function firstPartyGsc() {
  return normalizeSignalSourceDescriptor({
    key: "gsc-query-evidence",
    name: "Google Search Console Query Evidence",
    sourceClass: "first_party",
    signalTypes: ["keyword", "serp"],
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

test("capability remains pure and all execution/persistence gates closed", () => {
  const cap = signalSourceRegistryCapability();
  assert.equal(cap.registryPlanningOnly, true);
  assert.equal(cap.networkCollectionAuthorized, false);
  assert.equal(cap.providerEnrollmentAuthorized, false);
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
  assert.equal(cap.schemaMutationRequired, false);
});

test("source identity is deterministic and scope changes identity", () => {
  const a = externalTrend();
  const b = externalTrend();
  const changed = externalTrend({ marketFingerprints: [gb.fingerprint] });
  assert.equal(a.fingerprint, b.fingerprint);
  assert.equal(a.sourceId, b.sourceId);
  assert.notEqual(a.fingerprint, changed.fingerprint);
  assert.match(a.sourceId, /^src-[0-9a-f]{24}$/);
});

test("same source can be eligible for one market/category and ineligible for another", () => {
  const source = externalTrend();
  assert.equal(sourceEligibility(source, us, arabian, "trend").eligible, true);
  const wrongMarket = sourceEligibility(source, gb, arabian, "trend");
  assert.equal(wrongMarket.eligible, false);
  assert.ok(wrongMarket.blockers.includes("market_not_supported"));
  const wrongCategory = sourceEligibility(source, us, candles, "trend");
  assert.equal(wrongCategory.eligible, false);
  assert.ok(wrongCategory.blockers.includes("category_not_supported"));
});

test("external source admission requires manual review while first-party can remain eligible", () => {
  const external = externalTrend({ manuallyReviewed: false });
  const externalEligibility = sourceEligibility(external, us, arabian, "keyword");
  assert.equal(externalEligibility.eligible, false);
  assert.ok(externalEligibility.blockers.includes("external_source_manual_review_required"));
  assert.equal(sourceEligibility(firstPartyGsc(), us, arabian, "keyword").eligible, true);
});

test("incomplete provenance fails eligibility", () => {
  const source = externalTrend({ provenanceComplete: false });
  const result = sourceEligibility(source, us, arabian, "trend");
  assert.equal(result.eligible, false);
  assert.ok(result.blockers.includes("provenance_incomplete"));
});

test("freshness transitions fresh to stale to critical and supports missing", () => {
  const policy = externalTrend().freshness;
  const now = "2026-09-14T12:00:00.000Z";
  assert.equal(classifyFreshness(policy, "2026-09-14T11:00:00.000Z", now).state, "fresh");
  assert.equal(classifyFreshness(policy, "2026-09-14T09:30:00.000Z", now).state, "stale");
  assert.equal(classifyFreshness(policy, "2026-09-14T05:00:00.000Z", now).state, "critical");
  assert.equal(classifyFreshness(policy, null, now).state, "missing");
});

test("higher volatility produces higher urgency when freshness state is equal", () => {
  const high = externalTrend();
  const low = normalizeSignalSourceDescriptor({
    ...high,
    key: "slow-source",
    name: "Slow Source",
    freshness: { ...high.freshness, volatility: "low" },
  });
  const now = "2026-09-14T12:00:00.000Z";
  const observations = [
    { sourceFingerprint: high.fingerprint, signalType: "trend" as const, observedAt: "2026-09-14T09:00:00.000Z" },
    { sourceFingerprint: low.fingerprint, signalType: "trend" as const, observedAt: "2026-09-14T09:00:00.000Z" },
  ];
  const plan = buildSignalRefreshPlan({ sources: [low, high], observations, need: { market: us, category: arabian, signalTypes: ["trend"], now }, budget: { maxSources: 2, maxSignalTypesPerSource: 1, maxTotalRefreshItems: 2 } });
  assert.equal(plan.selected.length, 2);
  assert.ok(plan.selected[0]!.urgency > plan.selected[1]!.urgency);
  assert.equal(plan.selected[0]!.sourceFingerprint, high.fingerprint);
});

test("refresh plan is deterministic independent of source insertion order", () => {
  const external = externalTrend();
  const gsc = firstPartyGsc();
  const input = {
    observations: [] as [],
    need: { market: us, category: arabian, signalTypes: ["keyword" as const], now: "2026-09-14T12:00:00.000Z" },
    budget: { maxSources: 2, maxSignalTypesPerSource: 1, maxTotalRefreshItems: 2 },
  };
  const a = buildSignalRefreshPlan({ sources: [external, gsc], ...input });
  const b = buildSignalRefreshPlan({ sources: [gsc, external], ...input });
  assert.equal(a.planFingerprint, b.planFingerprint);
  assert.equal(a.planId, b.planId);
});

test("bounded budgets defer excess refresh items without creating execution", () => {
  const external = externalTrend();
  const gsc = firstPartyGsc();
  const plan = buildSignalRefreshPlan({
    sources: [external, gsc],
    need: { market: us, category: arabian, signalTypes: ["keyword", "serp", "trend"], now: "2026-09-14T12:00:00.000Z" },
    budget: { maxSources: 1, maxSignalTypesPerSource: 1, maxTotalRefreshItems: 1 },
  });
  assert.equal(plan.selected.length, 1);
  assert.ok(plan.deferred.length >= 1);
  assert.equal(plan.safety.networkCollectionAuthorized, false);
  assert.equal(plan.safety.schedulerEnabled, false);
});

test("unsupported coverage produces explicit signal blocker", () => {
  const plan = buildSignalRefreshPlan({
    sources: [externalTrend()],
    need: { market: us, category: arabian, signalTypes: ["analytics"], now: "2026-09-14T12:00:00.000Z" },
    budget: { maxSources: 3, maxSignalTypesPerSource: 2, maxTotalRefreshItems: 4 },
  });
  assert.deepEqual(plan.selected, []);
  assert.ok(plan.blockers.includes("unsupported_coverage:analytics"));
});

test("duplicate source descriptors fail closed", () => {
  const source = externalTrend();
  assert.throws(() => buildSignalRefreshPlan({
    sources: [source, source],
    need: { market: us, category: arabian, signalTypes: ["trend"], now: "2026-09-14T12:00:00.000Z" },
    budget: { maxSources: 2, maxSignalTypesPerSource: 1, maxTotalRefreshItems: 2 },
  }), /duplicate_source_descriptor/);
});

test("duplicate observation states fail closed", () => {
  const source = externalTrend();
  const duplicate = { sourceFingerprint: source.fingerprint, signalType: "trend" as const, observedAt: null };
  assert.throws(() => buildSignalRefreshPlan({
    sources: [source],
    observations: [duplicate, duplicate],
    need: { market: us, category: arabian, signalTypes: ["trend"], now: "2026-09-14T12:00:00.000Z" },
    budget: { maxSources: 1, maxSignalTypesPerSource: 1, maxTotalRefreshItems: 1 },
  }), /duplicate_observation_state/);
});

test("invalid timestamp, quality, and budget fail closed", () => {
  assert.throws(() => externalTrend({ quality: 1.1 }), /invalid_quality/);
  assert.throws(() => classifyFreshness(externalTrend().freshness, "not-a-date", "2026-09-14T12:00:00.000Z"), /invalid_observed_at/);
  assert.throws(() => buildSignalRefreshPlan({
    sources: [externalTrend()],
    need: { market: us, category: arabian, signalTypes: ["trend"], now: "2026-09-14T12:00:00.000Z" },
    budget: { maxSources: 0, maxSignalTypesPerSource: 1, maxTotalRefreshItems: 1 },
  }), /invalid_max_sources/);
});


test("dedicated backlink signal type is accepted without opening execution gates", () => {
  const source = normalizeSignalSourceDescriptor({
    key: "supplied-backlink-fixture",
    name: "Supplied Backlink Fixture",
    sourceClass: "external",
    signalTypes: ["backlink"],
    marketFingerprints: [us.fingerprint],
    categoryFingerprints: [arabian.fingerprint],
    trustClass: "reviewed_external",
    quality: 0.8,
    provenanceComplete: true,
    freshness: { freshForMinutes: 1440, staleAfterMinutes: 10080, criticalAfterMinutes: 43200, volatility: "medium" },
    collectionMode: "manual_import",
    manuallyReviewed: true,
  });
  assert.deepEqual(source.signalTypes, ["backlink"]);
  assert.equal(sourceEligibility(source, us, arabian, "backlink").eligible, true);
  assert.equal(signalSourceRegistryCapability().networkCollectionAuthorized, false);
});
