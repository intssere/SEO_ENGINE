import assert from "node:assert/strict";
import test from "node:test";
import {
  MARKET_CATEGORY_INTELLIGENCE_VERSION,
  marketCategoryIntelligenceCapability,
  normalizeCategoryContext,
  normalizeMarketProfile,
  normalizeSignalSnapshot,
  scoreCategoryCompetitorRelevance,
  synthesizeTrendKeywordOpportunity,
} from "./market-category-intelligence.js";

function market() {
  return normalizeMarketProfile({
    countryCode: "US",
    language: "en-US",
    searchEngine: "google",
    searchLocale: "en-us",
    currency: "USD",
    device: "all",
  });
}

function category() {
  return normalizeCategoryContext({
    key: "arabian-fragrance",
    name: "Arabian Fragrance",
    taxonomyPath: ["Fragrance", "Arabian Fragrance"],
  });
}

test("capability is market/category aware but keeps collection and mutation closed", () => {
  const capability = marketCategoryIntelligenceCapability();
  assert.equal(capability.version, MARKET_CATEGORY_INTELLIGENCE_VERSION);
  assert.equal(capability.categoryAware, true);
  assert.equal(capability.marketAware, true);
  assert.equal(capability.firstPartyExternalSeparated, true);
  assert.equal(capability.liveCollectionAuthorized, false);
  assert.equal(capability.evidencePersistenceAuthorized, false);
  assert.equal(capability.targetConfigurationMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.batchEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.automaticTransition, false);
  assert.equal(capability.schemaMutationRequired, false);
});

test("market identity is deterministic and market dimensions change identity", () => {
  const a = market();
  const b = market();
  const mobile = normalizeMarketProfile({ ...a, device: "mobile" });
  assert.equal(a.fingerprint, b.fingerprint);
  assert.equal(a.marketId, b.marketId);
  assert.notEqual(a.fingerprint, mobile.fingerprint);
  assert.match(a.marketId, /^mkt-[0-9a-f]{24}$/);
});

test("category identity is deterministic and category key changes identity", () => {
  const a = category();
  const b = category();
  const designer = normalizeCategoryContext({ key: "designer-fragrance", name: "Designer Fragrance" });
  assert.equal(a.fingerprint, b.fingerprint);
  assert.notEqual(a.fingerprint, designer.fingerprint);
  assert.match(a.categoryId, /^cat-[0-9a-f]{24}$/);
});

test("signal snapshots separate first-party and external provenance", () => {
  const base = {
    source: "google-search-console",
    signalType: "keyword" as const,
    observedAt: "2026-09-14T00:00:00.000Z",
    market: market(),
    category: category(),
    terms: ["lattafa perfume", "arabian fragrance"],
    metrics: { clicks: 12, impressions: 440 },
  };
  const firstParty = normalizeSignalSnapshot({ ...base, sourceClass: "first_party" });
  const external = normalizeSignalSnapshot({ ...base, sourceClass: "external" });
  assert.notEqual(firstParty.fingerprint, external.fingerprint);
  assert.equal(firstParty.sourceClass, "first_party");
  assert.equal(external.sourceClass, "external");
});

test("signal snapshot identity is insensitive to term and metric insertion order", () => {
  const common = {
    sourceClass: "external" as const,
    source: "approved-market-source",
    signalType: "trend" as const,
    observedAt: "2026-09-14T00:00:00Z",
    market: market(),
    category: category(),
  };
  const a = normalizeSignalSnapshot({ ...common, terms: ["lattafa", "oud"], metrics: { velocity: 0.8, demand: 100 } });
  const b = normalizeSignalSnapshot({ ...common, terms: ["oud", "lattafa"], metrics: { demand: 100, velocity: 0.8 } });
  assert.equal(a.fingerprint, b.fingerprint);
  assert.equal(a.snapshotId, b.snapshotId);
});

test("same competitor can score differently by category or market context", () => {
  const strong = scoreCategoryCompetitorRelevance({
    domain: "tripletraders.com",
    marketMatch: 1,
    categoryMatch: 0.95,
    keywordOverlap: 0.9,
    pageTypeMatch: 1,
    entityOverlap: 0.8,
    freshnessDays: 2,
    manuallyReviewed: true,
  });
  const weak = scoreCategoryCompetitorRelevance({
    domain: "tripletraders.com",
    marketMatch: 0.3,
    categoryMatch: 0.2,
    keywordOverlap: 0.1,
    pageTypeMatch: 0.2,
    entityOverlap: 0.1,
    freshnessDays: 2,
    manuallyReviewed: true,
  });
  assert.equal(strong.eligibleForAdmission, true);
  assert.equal(weak.eligibleForAdmission, false);
  assert.ok(strong.score > weak.score);
  assert.ok(weak.blockers.includes("market_relevance_too_low"));
  assert.ok(weak.blockers.includes("category_relevance_too_low"));
});

test("manual review is required for competitor admission", () => {
  const result = scoreCategoryCompetitorRelevance({
    domain: "example-rival.com",
    marketMatch: 1,
    categoryMatch: 1,
    keywordOverlap: 1,
    pageTypeMatch: 1,
    entityOverlap: 1,
    freshnessDays: 0,
    manuallyReviewed: false,
  });
  assert.equal(result.eligibleForAdmission, false);
  assert.ok(result.blockers.includes("manual_review_required"));
});

test("evidence-backed trend/keyword synthesis remains advisory", () => {
  const result = synthesizeTrendKeywordOpportunity({
    market: market(),
    category: category(),
    firstPartySupport: 0.8,
    externalSupport: 0.7,
    competitorGap: 0.9,
    trendVelocity: 0.75,
    intentFit: 0.9,
    confidence: 0.85,
  });
  assert.equal(result.lifecycle, "advisory");
  assert.equal(result.blockers.length, 0);
  assert.equal(result.safety.advisoryOnly, true);
  assert.equal(result.safety.executionAuthorized, false);
  assert.equal(result.safety.automaticTransition, false);
  assert.equal(result.safety.publicSiteWrites, false);
});

test("raw search volume alone can never authorize an opportunity", () => {
  const result = synthesizeTrendKeywordOpportunity({
    market: market(),
    category: category(),
    firstPartySupport: 0,
    externalSupport: 1,
    competitorGap: 1,
    trendVelocity: 1,
    intentFit: 1,
    confidence: 1,
    rawSearchVolumeOnly: true,
  });
  assert.equal(result.lifecycle, "blocked");
  assert.ok(result.blockers.includes("raw_search_volume_is_insufficient_evidence"));
  assert.equal(result.safety.executionAuthorized, false);
});

test("weak unsupported signal is blocked", () => {
  const result = synthesizeTrendKeywordOpportunity({
    market: market(),
    category: category(),
    firstPartySupport: 0,
    externalSupport: 0.2,
    competitorGap: 0.7,
    trendVelocity: 0.8,
    intentFit: 0.8,
    confidence: 0.8,
  });
  assert.equal(result.lifecycle, "blocked");
  assert.ok(result.blockers.includes("insufficient_evidence_support"));
});

test("opportunity identity is deterministic for same market/category evidence dimensions", () => {
  const input = {
    market: market(),
    category: category(),
    firstPartySupport: 0.7,
    externalSupport: 0.6,
    competitorGap: 0.5,
    trendVelocity: 0.4,
    intentFit: 0.8,
    confidence: 0.9,
  };
  const a = synthesizeTrendKeywordOpportunity(input);
  const b = synthesizeTrendKeywordOpportunity(input);
  assert.equal(a.opportunityFingerprint, b.opportunityFingerprint);
});

test("invalid bounded inputs fail closed", () => {
  assert.throws(() => scoreCategoryCompetitorRelevance({
    domain: "bad.example.com",
    marketMatch: 2,
    categoryMatch: 1,
    keywordOverlap: 1,
    pageTypeMatch: 1,
    entityOverlap: 1,
    freshnessDays: 0,
    manuallyReviewed: true,
  }), /invalid_market_match/);
  assert.throws(() => normalizeMarketProfile({ countryCode: "USA", language: "en" }), /invalid_text|invalid_country_code/);
});
