import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeTrendSeries,
  buildCompetitorRelation,
  createMarketCategoryScope,
  normalizeCategoryProfile,
  normalizeKeywordCluster,
  normalizeMarketProfile,
  normalizeSignalSnapshot,
  normalizeSignalSource,
  rankKeywordOpportunities,
  scoreCompetitorRelation,
  signalSnapshotFreshness,
  synthesizeKeywordOpportunity,
  task66MarketIntelligenceCapability,
  type SignalSnapshot,
} from "./market-intelligence-architecture.js";

const NOW = "2026-09-14T12:00:00.000Z";

function market(overrides: Partial<Parameters<typeof normalizeMarketProfile>[0]> = {}) {
  return normalizeMarketProfile({
    country: "US",
    language: "en",
    locale: "en-US",
    currency: "USD",
    searchEngine: "google",
    device: "all",
    ...overrides,
  });
}

function category(overrides: Partial<Parameters<typeof normalizeCategoryProfile>[0]> = {}) {
  return normalizeCategoryProfile({
    key: "arabian-fragrance",
    name: "Arabian Fragrance",
    canonicalPath: "/collections/arabian-fragrance",
    labels: ["Fragrance", "Middle Eastern"],
    intentTopics: ["lattafa", "arabian perfume"],
    ...overrides,
  });
}

function cluster(overrides: Partial<Parameters<typeof normalizeKeywordCluster>[0]> = {}) {
  const m = market();
  const c = category();
  return normalizeKeywordCluster({
    name: "Arabian fragrance commercial terms",
    marketId: m.marketId,
    categoryId: c.categoryId,
    terms: ["arabian perfume", "lattafa perfume", "middle eastern fragrance"],
    intent: "commercial",
    brandScope: "mixed",
    ...overrides,
  });
}

const gsc = normalizeSignalSource({
  sourceId: "gsc-us",
  sourceClass: "first_party",
  sourceType: "gsc",
  provenance: "verified Search Console property",
});

const trends = normalizeSignalSource({
  sourceId: "trends-us",
  sourceClass: "external",
  sourceType: "google-trends",
  approvedForPlanning: true,
  provenance: "approved external demand source",
});

const unapprovedExternal = normalizeSignalSource({
  sourceId: "unknown-volume-feed",
  sourceClass: "external",
  sourceType: "search-volume",
  approvedForPlanning: false,
});

function snapshot(input: {
  source?: ReturnType<typeof normalizeSignalSource>;
  observedAt?: string;
  validForHours?: number;
  metrics?: Record<string, number>;
  marketId?: string;
  categoryId?: string;
  clusterId?: string | null;
  competitorFingerprint?: string | null;
  signalKind?: string;
} = {}): SignalSnapshot {
  const m = market();
  const c = category();
  const kw = cluster({ marketId: m.marketId, categoryId: c.categoryId });
  return normalizeSignalSnapshot({
    source: input.source ?? gsc,
    signalKind: input.signalKind ?? "keyword-demand",
    marketId: input.marketId ?? m.marketId,
    categoryId: input.categoryId ?? c.categoryId,
    clusterId: input.clusterId === undefined ? kw.clusterId : input.clusterId,
    competitorFingerprint: input.competitorFingerprint ?? null,
    observedAt: input.observedAt ?? "2026-09-14T10:00:00Z",
    validForHours: input.validForHours ?? 48,
    metrics: input.metrics ?? { "demand-index": 60 },
  }, NOW);
}

test("capability is architecture-only and opens no collection, persistence, autonomy, execution, or write gate", () => {
  assert.deepEqual(task66MarketIntelligenceCapability(), {
    version: "task66-market-aware-category-intelligence-v1",
    architectureOnly: true,
    purePlanningOnly: true,
    liveCollectionAuthorized: false,
    externalProviderEnrollmentAuthorized: false,
    evidencePersistenceAuthorized: false,
    targetConfigurationMutationAuthorized: false,
    schedulerEnabled: false,
    batchEnabled: false,
    autonomousWorkerEnabled: false,
    retryLoopEnabled: false,
    publicSiteWrites: false,
    providerWrites: false,
    automaticTransition: false,
    executionAuthorized: false,
    schemaMutationRequired: false,
  });
});

test("market identity is deterministic and changes when a selected-market dimension changes", () => {
  const first = market();
  const second = market({ country: "us", language: "EN", locale: "en_us", currency: "usd" });
  assert.equal(first.marketId, second.marketId);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.country, "US");
  assert.equal(first.locale, "en-US");

  const mobile = market({ device: "mobile" });
  assert.notEqual(first.marketId, mobile.marketId);
  assert.notEqual(first.fingerprint, mobile.fingerprint);
});

test("category identity stays stable for descriptor changes while the descriptor fingerprint changes", () => {
  const first = category();
  const second = category({ labels: ["Middle Eastern", "Perfume"], intentTopics: ["oud", "lattafa"] });
  assert.equal(first.categoryId, second.categoryId);
  assert.notEqual(first.fingerprint, second.fingerprint);

  const moved = category({ canonicalPath: "/collections/middle-eastern-fragrance" });
  assert.notEqual(first.categoryId, moved.categoryId);
});

test("market-category scope identity is exact and descriptor revisions change only its scope fingerprint", () => {
  const m = market();
  const firstCategory = category();
  const revisedCategory = category({ labels: ["Arabian", "Perfume"] });
  const first = createMarketCategoryScope(m, firstCategory);
  const revised = createMarketCategoryScope(m, revisedCategory);
  assert.equal(first.scopeId, revised.scopeId);
  assert.notEqual(first.fingerprint, revised.fingerprint);

  const uk = market({ country: "GB", locale: "en-GB", currency: "GBP" });
  assert.notEqual(first.scopeId, createMarketCategoryScope(uk, firstCategory).scopeId);
});

test("keyword clusters canonicalize term order and duplicates but bind intent and category into identity", () => {
  const m = market();
  const c = category();
  const first = normalizeKeywordCluster({
    name: "Arabian demand",
    marketId: m.marketId,
    categoryId: c.categoryId,
    terms: ["Lattafa Perfume", "arabian perfume", "lattafa perfume"],
    intent: "commercial",
  });
  const second = normalizeKeywordCluster({
    name: "Arabian demand",
    marketId: m.marketId,
    categoryId: c.categoryId,
    terms: ["arabian perfume", "lattafa perfume"],
    intent: "commercial",
  });
  assert.equal(first.fingerprint, second.fingerprint);
  assert.deepEqual(first.terms, ["arabian perfume", "lattafa perfume"]);

  const transactional = normalizeKeywordCluster({
    name: "Arabian demand",
    marketId: m.marketId,
    categoryId: c.categoryId,
    terms: first.terms,
    intent: "transactional",
  });
  assert.notEqual(first.clusterId, transactional.clusterId);
});

test("first-party sources are synthesis eligible, external sources require explicit planning approval", () => {
  assert.equal(gsc.synthesisEligible, true);
  assert.equal(gsc.approvedForPlanning, true);
  assert.equal(trends.synthesisEligible, true);
  assert.equal(unapprovedExternal.synthesisEligible, false);
  assert.equal(unapprovedExternal.approvedForPlanning, false);
});

test("signal snapshots are deterministic across metric-key order and preserve provenance lineage", () => {
  const first = snapshot({ metrics: { "demand-index": 70, "competitor-gap-index": 45 } });
  const second = snapshot({ metrics: { "competitor-gap-index": 45, "demand-index": 70 } });
  assert.equal(first.snapshotId, second.snapshotId);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.source.fingerprint, gsc.fingerprint);
});

test("signal snapshots reject future observations and freshness expires deterministically", () => {
  assert.throws(() => snapshot({ observedAt: "2026-09-14T12:06:00Z" }), /invalid_observed_at/);
  const fresh = snapshot({ observedAt: "2026-09-14T10:00:00Z", validForHours: 3 });
  assert.equal(signalSnapshotFreshness(fresh, "2026-09-14T12:30:00Z").state, "fresh");
  const stale = signalSnapshotFreshness(fresh, "2026-09-14T13:00:01Z");
  assert.equal(stale.state, "stale");
  assert.equal(stale.expiresAt, "2026-09-14T13:00:00.000Z");
});

test("competitor relevance scoring is category/market specific and never authorizes registration", () => {
  const m = market();
  const c = category();
  const strongSignals = {
    categoryOverlap: 0.95,
    keywordOverlap: 0.9,
    pageTypeFit: 1,
    marketFit: 1,
    assortmentOverlap: 0.85,
    freshness: 1,
    evidenceCoverage: 0.9,
    sourceConfidence: 0.95,
  };
  const weakSignals = { ...strongSignals, categoryOverlap: 0.1, keywordOverlap: 0.1, assortmentOverlap: 0.1, marketFit: 0.2 };
  assert.ok(scoreCompetitorRelation(strongSignals).total > scoreCompetitorRelation(weakSignals).total);

  const approved = buildCompetitorRelation({
    candidateFingerprint: "a".repeat(64),
    domain: "tripletraders.com",
    marketId: m.marketId,
    categoryId: c.categoryId,
    reviewDecision: "approved",
    signals: strongSignals,
  });
  assert.equal(approved.recommendedForAdmission, true);
  assert.equal(approved.targetRegistrationAuthorized, false);

  const pending = buildCompetitorRelation({ ...approved, reviewDecision: "pending", signals: strongSignals });
  assert.equal(pending.recommendedForAdmission, false);
  assert.equal(pending.targetRegistrationAuthorized, false);
});

test("the same competitor candidate gets a different relation identity for a different category", () => {
  const m = market();
  const fragrance = category();
  const candles = category({ key: "candles", name: "Candles", canonicalPath: "/collections/candles", labels: ["Home fragrance"] });
  const signals = {
    categoryOverlap: 0.8,
    keywordOverlap: 0.7,
    pageTypeFit: 1,
    marketFit: 1,
    assortmentOverlap: 0.7,
    freshness: 1,
    evidenceCoverage: 0.8,
    sourceConfidence: 0.9,
  };
  const candidateFingerprint = "b".repeat(64);
  const fragranceRelation = buildCompetitorRelation({ candidateFingerprint, domain: "example-retailer.com", marketId: m.marketId, categoryId: fragrance.categoryId, reviewDecision: "approved", signals });
  const candleRelation = buildCompetitorRelation({ candidateFingerprint, domain: "example-retailer.com", marketId: m.marketId, categoryId: candles.categoryId, reviewDecision: "approved", signals: { ...signals, categoryOverlap: 0.2 } });
  assert.notEqual(fragranceRelation.relationId, candleRelation.relationId);
  assert.notEqual(fragranceRelation.fingerprint, candleRelation.fingerprint);
});

function trendSnapshot(value: number, observedAt: string): SignalSnapshot {
  return snapshot({
    source: trends,
    observedAt,
    validForHours: 240,
    signalKind: "trend-demand",
    metrics: { interest: value },
  });
}

test("trend analysis classifies breakout, rising, declining, and insufficient series deterministically", () => {
  const breakout = analyzeTrendSeries({ snapshots: [trendSnapshot(10, "2026-09-11T12:00:00Z"), trendSnapshot(15, "2026-09-12T12:00:00Z"), trendSnapshot(40, "2026-09-13T12:00:00Z")], metric: "interest", now: NOW });
  assert.equal(breakout.classification, "breakout");
  assert.equal(breakout.sampleCount, 3);

  const rising = analyzeTrendSeries({ snapshots: [trendSnapshot(100, "2026-09-11T12:00:00Z"), trendSnapshot(110, "2026-09-12T12:00:00Z"), trendSnapshot(125, "2026-09-13T12:00:00Z")], metric: "interest", now: NOW });
  assert.equal(rising.classification, "rising");

  const declining = analyzeTrendSeries({ snapshots: [trendSnapshot(100, "2026-09-11T12:00:00Z"), trendSnapshot(90, "2026-09-12T12:00:00Z"), trendSnapshot(70, "2026-09-13T12:00:00Z")], metric: "interest", now: NOW });
  assert.equal(declining.classification, "declining");

  const insufficient = analyzeTrendSeries({ snapshots: [trendSnapshot(10, "2026-09-12T12:00:00Z"), trendSnapshot(20, "2026-09-13T12:00:00Z")], metric: "interest", now: NOW });
  assert.equal(insufficient.classification, "insufficient");
});

test("trend analysis fails closed when market/category/cluster/source scopes are mixed", () => {
  const us = trendSnapshot(10, "2026-09-12T12:00:00Z");
  const uk = market({ country: "GB", locale: "en-GB", currency: "GBP" });
  const mixed = snapshot({
    source: trends,
    marketId: uk.marketId,
    categoryId: us.categoryId,
    clusterId: us.clusterId,
    observedAt: "2026-09-13T12:00:00Z",
    validForHours: 240,
    signalKind: "trend-demand",
    metrics: { interest: 20 },
  });
  assert.throws(() => analyzeTrendSeries({ snapshots: [us, mixed], metric: "interest", now: NOW }), /mixed_trend_series_scope/);
});

test("unapproved external data is excluded from opportunity synthesis", () => {
  const kw = cluster();
  const externalOnly = snapshot({
    source: unapprovedExternal,
    clusterId: kw.clusterId,
    metrics: { "demand-index": 95, "competitor-gap-index": 90 },
  });
  const result = synthesizeKeywordOpportunity({ cluster: kw, snapshots: [externalOnly], now: NOW });
  assert.equal(result.evidenceClass, "insufficient");
  assert.equal(result.externalSignalCount, 0);
  assert.equal(result.planningReady, false);
  assert.equal(result.safety.actionEligible, false);
  assert.equal(result.safety.executionAuthorized, false);
});

test("approved external-only demand stays exploratory and cannot become action eligible", () => {
  const kw = cluster();
  const externalOnly = snapshot({
    source: trends,
    clusterId: kw.clusterId,
    metrics: { "demand-index": 95, "trend-momentum-index": 80, "competitor-gap-index": 90 },
  });
  const result = synthesizeKeywordOpportunity({ cluster: kw, snapshots: [externalOnly], now: NOW });
  assert.equal(result.evidenceClass, "exploratory_external_only");
  assert.equal(result.planningReady, false);
  assert.ok(result.blockers.includes("first_party_signal_required_for_action"));
  assert.ok(result.warnings.includes("external_demand_is_not_sufficient_for_action"));
  assert.equal(result.safety.actionEligible, false);
});

test("corroborated first-party plus approved external evidence becomes planning-ready but never execution-ready", () => {
  const kw = cluster();
  const firstParty = snapshot({
    source: gsc,
    clusterId: kw.clusterId,
    metrics: {
      "performance-gap-index": 75,
      "demand-index": 65,
      "competitor-gap-index": 55,
      "serp-gap-index": 60,
      "strategic-fit-index": 90,
    },
  });
  const external = snapshot({
    source: trends,
    clusterId: kw.clusterId,
    signalKind: "external-market-demand",
    metrics: {
      "demand-index": 85,
      "trend-momentum-index": 70,
      "competitor-gap-index": 80,
      "geo-gap-index": 50,
    },
  });
  const result = synthesizeKeywordOpportunity({ cluster: kw, snapshots: [firstParty, external], now: NOW });
  assert.equal(result.evidenceClass, "corroborated");
  assert.equal(result.planningReady, true);
  assert.equal(result.firstPartySignalCount, 1);
  assert.equal(result.externalSignalCount, 1);
  assert.ok(result.score > 0);
  assert.equal(result.safety.advisoryOnly, true);
  assert.equal(result.safety.actionEligible, false);
  assert.equal(result.safety.automaticTransition, false);
  assert.equal(result.safety.publicSiteWrites, false);
  assert.equal(result.safety.providerWrites, false);
  assert.equal(result.safety.executionAuthorized, false);
  assert.ok(result.blockers.includes("task66_does_not_authorize_execution"));
});

test("stale signals are excluded and surfaced as a warning", () => {
  const kw = cluster();
  const fresh = snapshot({ source: gsc, clusterId: kw.clusterId, metrics: { "performance-gap-index": 50 }, observedAt: "2026-09-14T10:00:00Z", validForHours: 8 });
  const stale = snapshot({ source: trends, clusterId: kw.clusterId, metrics: { "demand-index": 100 }, observedAt: "2026-09-10T10:00:00Z", validForHours: 24 });
  const result = synthesizeKeywordOpportunity({ cluster: kw, snapshots: [fresh, stale], now: NOW });
  assert.equal(result.staleSignalsExcluded, 1);
  assert.equal(result.externalSignalCount, 0);
  assert.ok(result.warnings.includes("stale_signals_excluded"));
});

test("opportunity synthesis fails closed instead of mixing markets, categories, or keyword clusters", () => {
  const kw = cluster();
  const uk = market({ country: "GB", locale: "en-GB", currency: "GBP" });
  const wrongMarket = snapshot({ source: gsc, marketId: uk.marketId, categoryId: kw.categoryId, clusterId: kw.clusterId });
  assert.throws(() => synthesizeKeywordOpportunity({ cluster: kw, snapshots: [wrongMarket], now: NOW }), /mixed_market_or_category_scope/);

  const otherCluster = normalizeKeywordCluster({
    name: "Gift intent",
    marketId: kw.marketId,
    categoryId: kw.categoryId,
    terms: ["arabian perfume gift"],
    intent: "transactional",
  });
  const wrongCluster = snapshot({ source: gsc, marketId: kw.marketId, categoryId: kw.categoryId, clusterId: otherCluster.clusterId });
  assert.throws(() => synthesizeKeywordOpportunity({ cluster: kw, snapshots: [wrongCluster], now: NOW }), /mixed_keyword_cluster_scope/);
});

test("opportunity ranking is deterministic and uses score then confidence then stable identity", () => {
  const kw = cluster();
  const weak = synthesizeKeywordOpportunity({
    cluster: kw,
    snapshots: [snapshot({ source: gsc, clusterId: kw.clusterId, metrics: { "performance-gap-index": 20, "demand-index": 20 } })],
    now: NOW,
  });
  const strongerCluster = normalizeKeywordCluster({
    name: "Oud commercial",
    marketId: kw.marketId,
    categoryId: kw.categoryId,
    terms: ["oud perfume"],
    intent: "commercial",
  });
  const strong = synthesizeKeywordOpportunity({
    cluster: strongerCluster,
    snapshots: [
      snapshot({ source: gsc, clusterId: strongerCluster.clusterId, metrics: { "performance-gap-index": 90, "demand-index": 80, "competitor-gap-index": 80 } }),
      snapshot({ source: trends, clusterId: strongerCluster.clusterId, signalKind: "external", metrics: { "demand-index": 90, "trend-momentum-index": 80 } }),
    ],
    now: NOW,
  });
  const ranked = rankKeywordOpportunities([weak, strong]);
  assert.equal(ranked[0]?.opportunityId, strong.opportunityId);
  assert.equal(rankKeywordOpportunities([strong, weak])[0]?.opportunityId, strong.opportunityId);
});
