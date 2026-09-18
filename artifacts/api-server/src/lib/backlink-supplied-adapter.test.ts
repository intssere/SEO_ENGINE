import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { normalizeCategoryContext, normalizeMarketProfile } from "./market-category-intelligence.js";
import {
  buildSignalRefreshPlan,
  normalizeSignalSourceDescriptor,
} from "./signal-source-registry.js";
import {
  buildSourceAdapterRequest,
  normalizeAdapterResult,
} from "./signal-observation-normalization.js";
import {
  backlinkFixtureCapability,
  canonicalizeBacklinkUrl,
  normalizeBacklinkDomain,
  normalizeBacklinkFixtureBundle,
  type BacklinkFixtureBundleInput,
  type BacklinkProfileInput,
} from "./backlink-fixture-normalization.js";
import {
  P5_5_BASELINE_OWNED_PROFILE,
  P5_5_FIXTURE_OBSERVED_AT,
  P5_5_FIXTURE_REFERENCE_TIME,
  P5_5_FRESHNESS_CHURN_PROFILE,
  P5_5_GAP_COMPETITOR_PROFILES,
  P5_5_GAP_OWNED_PROFILE,
  P5_5_NULL_AUTHORITY_PROFILE,
  P5_5_ZERO_AUTHORITY_PROFILE,
} from "./backlink-fixtures.js";
import {
  buildSuppliedBacklinkRequestContract,
  normalizeSuppliedBacklinkFixture,
  P5_5_SUPPLIED_BACKLINK_SOURCE_KEY,
  suppliedBacklinkAdapterCapability,
} from "./backlink-supplied-adapter.js";

const market = normalizeMarketProfile({
  countryCode: "US",
  language: "en-US",
  searchEngine: "google",
  currency: "USD",
  device: "all",
});
const category = normalizeCategoryContext({ key: "fragrance", name: "Fragrance" });

function source() {
  return normalizeSignalSourceDescriptor({
    key: P5_5_SUPPLIED_BACKLINK_SOURCE_KEY,
    name: "Supplied Backlink Fixture",
    sourceClass: "external",
    signalTypes: ["backlink"],
    marketFingerprints: [market.fingerprint],
    categoryFingerprints: [category.fingerprint],
    trustClass: "reviewed_external",
    quality: 0.86,
    provenanceComplete: true,
    freshness: {
      freshForMinutes: 1440,
      staleAfterMinutes: 10080,
      criticalAfterMinutes: 43200,
      volatility: "medium",
    },
    collectionMode: "manual_import",
    manuallyReviewed: true,
  });
}

function task68Fixture() {
  const src = source();
  const plan = buildSignalRefreshPlan({
    sources: [src],
    need: {
      market,
      category,
      signalTypes: ["backlink"],
      now: P5_5_FIXTURE_REFERENCE_TIME,
    },
    budget: {
      maxSources: 1,
      maxSignalTypesPerSource: 1,
      maxTotalRefreshItems: 1,
    },
  });
  assert.equal(plan.selected.length, 1);
  const request = buildSourceAdapterRequest({
    source: src,
    planItem: plan.selected[0]!,
    market,
    category,
    planId: plan.planId,
    planFingerprint: plan.planFingerprint,
  });
  return { src, plan, request };
}

function basis(sourceFingerprint = "a".repeat(64)) {
  return {
    providerKey: "synthetic",
    providerMethod: "supplied_backlink_snapshot_v1",
    sourceFingerprint,
    marketFingerprint: market.fingerprint,
    categoryFingerprint: category.fingerprint,
    authorityMetric: {
      name: "synthetic_authority",
      min: 0,
      max: 100,
      crossProviderComparable: false as const,
    },
  };
}

function bundle(
  owned: BacklinkProfileInput,
  competitors: BacklinkProfileInput[],
  sourceFingerprint = "a".repeat(64),
): BacklinkFixtureBundleInput {
  return {
    basis: basis(sourceFingerprint),
    observedAt: P5_5_FIXTURE_OBSERVED_AT,
    referenceTime: P5_5_FIXTURE_REFERENCE_TIME,
    owned: structuredClone(owned),
    competitors: structuredClone(competitors),
  };
}

test("P5.5 capabilities keep every live/runtime gate closed", () => {
  const fixtureCap = backlinkFixtureCapability();
  assert.equal(fixtureCap.deterministicNormalization, true);
  assert.equal(fixtureCap.suppliedFixturesOnly, true);
  assert.equal(fixtureCap.crossProviderAuthorityComparable, false);
  assert.equal(fixtureCap.opportunityScoringIncluded, false);
  assert.equal(fixtureCap.liveCollectionAuthorized, false);
  assert.equal(fixtureCap.sourceRegistryAdmissionAuthorized, false);
  assert.equal(fixtureCap.task70ExecutionAuthorized, false);
  assert.equal(fixtureCap.databaseWritesAuthorized, false);
  assert.equal(fixtureCap.schedulerEnabled, false);
  assert.equal(fixtureCap.publicationAuthorized, false);

  const adapterCap = suppliedBacklinkAdapterCapability();
  assert.equal(adapterCap.manualImportContractOnly, true);
  assert.equal(adapterCap.networkRequestAuthorized, false);
  assert.equal(adapterCap.credentialUseAuthorized, false);
  assert.equal(adapterCap.liveProviderTransportAuthorized, false);
  assert.equal(adapterCap.task70ExecutionAuthorized, false);
  assert.equal(adapterCap.publicationAuthorized, false);
});

test("domain identity is canonical, deterministic, and does not collapse subdomains", () => {
  assert.equal(normalizeBacklinkDomain("Example.TEST."), "example.test");
  assert.equal(normalizeBacklinkDomain("HTTPS://Example.TEST/path", { allowUrl: true }), "example.test");
  assert.equal(normalizeBacklinkDomain("www.example.test"), "www.example.test");
  assert.equal(normalizeBacklinkDomain("blog.example.test"), "blog.example.test");
  assert.notEqual(normalizeBacklinkDomain("www.example.test"), normalizeBacklinkDomain("example.test"));
  assert.throws(() => normalizeBacklinkDomain("https://example.test/path"), /invalid_domain/);
  assert.throws(() => normalizeBacklinkDomain("localhost"), /invalid_domain/);
  assert.throws(() => normalizeBacklinkDomain("127.0.0.1"), /invalid_domain/);
});

test("URL canonicalization removes fragments and sorts query parameters without changing path semantics", () => {
  assert.equal(
    canonicalizeBacklinkUrl("HTTPS://Example.TEST:443/Path/?b=2&a=2&a=1#section"),
    "https://example.test/Path/?a=1&a=2&b=2",
  );
  assert.equal(canonicalizeBacklinkUrl("http://www.example.test"), "http://www.example.test/");
  assert.throws(() => canonicalizeBacklinkUrl("ftp://example.test/file"), /invalid_url/);
});

test("baseline fixture normalizes authority, anchors, URLs, and freshness deterministically", () => {
  const normalized = normalizeBacklinkFixtureBundle(
    bundle(P5_5_BASELINE_OWNED_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]),
  );
  assert.equal(normalized.owned.targetDomain, "example.test");
  assert.equal(normalized.owned.summary.authority, 58);
  assert.equal(normalized.owned.summary.referringDomains, 5);
  assert.equal(normalized.owned.summary.backlinks, 9);

  const beauty = normalized.owned.referringDomains.find((row) => row.domain === "beautyjournal.example")!;
  assert.equal(beauty.freshnessState, "fresh");
  assert.deepEqual(beauty.targetUrls, [
    "https://example.test/",
    "https://example.test/collections/fragrance?a=1&b=2",
  ]);

  const perfume = normalized.owned.referringDomains.find((row) => row.domain === "perfumeweekly.example")!;
  const shopping = normalized.owned.referringDomains.find((row) => row.domain === "shoppingforum.example")!;
  const style = normalized.owned.referringDomains.find((row) => row.domain === "styleedit.example")!;
  const coupon = normalized.owned.referringDomains.find((row) => row.domain === "couponwire.example")!;
  assert.equal(perfume.freshnessState, "recent");
  assert.equal(shopping.freshnessState, "aging");
  assert.equal(style.freshnessState, "stale");
  assert.equal(coupon.freshnessState, "unavailable");

  assert.equal(style.anchors.length, 1);
  assert.equal(style.anchors[0]!.identityText, "niche perfume");
  assert.equal(style.anchors[0]!.count, 2);
});

test("null authority and explicit zero authority remain distinct evidence states", () => {
  const normalized = normalizeBacklinkFixtureBundle(
    bundle(P5_5_NULL_AUTHORITY_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]),
  );
  assert.equal(normalized.owned.summary.authority, null);
  assert.equal(normalized.competitors[0]!.summary.authority, 0);
  assert.equal(normalized.owned.validationState, "valid_with_unavailable_fields");
  assert.equal(normalized.competitors[0]!.validationState, "valid");
});

test("timestamp ordering and future provider timestamps fail closed", () => {
  const badOrder = bundle(P5_5_FRESHNESS_CHURN_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]);
  badOrder.owned.referringDomains[0]!.firstSeenAt = "2026-09-15T00:00:00.000Z";
  badOrder.owned.referringDomains[0]!.lastSeenAt = "2026-09-10T00:00:00.000Z";
  assert.throws(() => normalizeBacklinkFixtureBundle(badOrder), /first_seen_after_last_seen/);

  const future = bundle(P5_5_FRESHNESS_CHURN_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]);
  future.owned.referringDomains[0]!.lastSeenAt = "2026-09-19T00:00:00.000Z";
  assert.throws(() => normalizeBacklinkFixtureBundle(future), /provider_timestamp_after_observation/);

  const badReference = bundle(P5_5_FRESHNESS_CHURN_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]);
  badReference.referenceTime = "2026-09-17T00:00:00.000Z";
  assert.throws(() => normalizeBacklinkFixtureBundle(badReference), /observed_after_reference_time/);
});

test("summary totals are recomputed from normalized rows and contradictions fail closed", () => {
  const wrongDomains = bundle(P5_5_BASELINE_OWNED_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]);
  wrongDomains.owned.summary.referringDomains = 4;
  assert.throws(() => normalizeBacklinkFixtureBundle(wrongDomains), /referring_domain_total_mismatch/);

  const wrongBacklinks = bundle(P5_5_BASELINE_OWNED_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]);
  wrongBacklinks.owned.summary.backlinks = 10;
  assert.throws(() => normalizeBacklinkFixtureBundle(wrongBacklinks), /backlink_total_mismatch/);

  const wrongNofollow = bundle(P5_5_BASELINE_OWNED_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]);
  wrongNofollow.owned.summary.nofollowReferringDomains = 1;
  assert.throws(() => normalizeBacklinkFixtureBundle(wrongNofollow), /nofollow_referring_domain_total_mismatch/);
});

test("new/lost totals require complete explicit change evidence", () => {
  const baseline = bundle(P5_5_BASELINE_OWNED_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]);
  baseline.owned.summary.newReferringDomains30d = 1;
  assert.throws(
    () => normalizeBacklinkFixtureBundle(baseline),
    /new_lost_totals_require_complete_change_evidence/,
  );

  const churn = normalizeBacklinkFixtureBundle(
    bundle(P5_5_FRESHNESS_CHURN_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]),
  );
  assert.equal(churn.owned.summary.newReferringDomains30d, 1);
  assert.equal(churn.owned.summary.lostReferringDomains30d, 1);
});

test("anchor identity merges equivalent rows but conflicting classification fails closed", () => {
  const normalized = normalizeBacklinkFixtureBundle(
    bundle(P5_5_BASELINE_OWNED_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]),
  );
  const style = normalized.owned.referringDomains.find((row) => row.domain === "styleedit.example")!;
  assert.deepEqual(
    style.anchors.map((anchor) => [anchor.identityText, anchor.count, anchor.classification]),
    [["niche perfume", 2, "exact"]],
  );

  const conflict = bundle(P5_5_BASELINE_OWNED_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]);
  const row = conflict.owned.referringDomains.find((item) => item.domain.toLowerCase().startsWith("beautyjournal"))!;
  row.anchors.push({ text: "diamond shelf", count: 1, classification: "generic" });
  row.anchorCountBasis = "provider_aggregate";
  assert.throws(() => normalizeBacklinkFixtureBundle(conflict), /anchor_classification_conflict/);
});

test("freshness/churn fixture covers deterministic freshness buckets", () => {
  const normalized = normalizeBacklinkFixtureBundle(
    bundle(P5_5_FRESHNESS_CHURN_PROFILE, [P5_5_ZERO_AUTHORITY_PROFILE]),
  );
  const states = Object.fromEntries(
    normalized.owned.referringDomains.map((row) => [row.domain, row.freshnessState]),
  );
  assert.deepEqual(states, {
    "aging.example": "aging",
    "fresh.example": "fresh",
    "recent.example": "recent",
    "stale.example": "stale",
  });
});

test("competitor gap fixture yields exact descriptive classifications without opportunity scoring", () => {
  const normalized = normalizeBacklinkFixtureBundle(
    bundle(P5_5_GAP_OWNED_PROFILE, P5_5_GAP_COMPETITOR_PROFILES),
  );
  const classes = Object.fromEntries(
    normalized.gapCandidates.map((candidate) => [candidate.referringDomain, candidate.classification]),
  );
  assert.equal(classes["owned-only.example"], "owned_exclusive");
  assert.equal(classes["shared-owned.example"], "shared_coverage");
  assert.equal(classes["single-a.example"], "single_competitor_gap");
  assert.equal(classes["editorial-b.example"], "shared_competitor_gap");
  assert.equal(classes["editorial-a.example"], "universal_competitor_gap");
  assert.deepEqual(normalized.summary, {
    uniqueObservedReferringDomains: 5,
    ownedExclusiveCount: 1,
    sharedCoverageCount: 1,
    gapCandidateCount: 3,
    singleCompetitorGapCount: 1,
    sharedCompetitorGapCount: 1,
    universalCompetitorGapCount: 1,
    averageGapCompetitorCoverageRatio: 0.666667,
  });
});

test("equivalent input ordering produces the same bundle identity", () => {
  const a = bundle(P5_5_GAP_OWNED_PROFILE, P5_5_GAP_COMPETITOR_PROFILES);
  const b = bundle(P5_5_GAP_OWNED_PROFILE, P5_5_GAP_COMPETITOR_PROFILES);
  b.owned.referringDomains.reverse();
  b.competitors.reverse();
  for (const profile of b.competitors) profile.referringDomains.reverse();
  for (const row of b.owned.referringDomains) {
    row.anchors.reverse();
    row.targetUrls.reverse();
  }
  const na = normalizeBacklinkFixtureBundle(a);
  const nb = normalizeBacklinkFixtureBundle(b);
  assert.equal(na.bundleFingerprint, nb.bundleFingerprint);
  assert.equal(na.bundleId, nb.bundleId);
});

test("conflicting authority for the same referring domain fails instead of inventing an aggregate", () => {
  const input = bundle(P5_5_GAP_OWNED_PROFILE, P5_5_GAP_COMPETITOR_PROFILES);
  const competitor = input.competitors.find((profile) => profile.targetDomain === "competitor-b.test")!;
  competitor.referringDomains.find((row) => row.domain === "editorial-a.example")!.authority = 81;
  assert.throws(() => normalizeBacklinkFixtureBundle(input), /conflicting_referring_domain_authority/);
});

test("supplied backlink adapter is deterministic and round-trips through Task #68", () => {
  const f = task68Fixture();
  const authorityBasis = {
    providerKey: "synthetic",
    providerMethod: "supplied_backlink_snapshot_v1",
    metricName: "synthetic_authority",
    min: 0,
    max: 100,
    crossProviderComparable: false as const,
  };
  const a = buildSuppliedBacklinkRequestContract({
    source: f.src,
    request: f.request,
    market,
    category,
    ownedDomain: "OWNED.TEST.",
    competitorDomains: ["competitor-c.test", "competitor-a.test", "competitor-b.test"],
    authorityBasis,
  });
  const b = buildSuppliedBacklinkRequestContract({
    source: f.src,
    request: f.request,
    market,
    category,
    ownedDomain: "owned.test",
    competitorDomains: ["competitor-a.test", "competitor-b.test", "competitor-c.test"],
    authorityBasis,
  });
  assert.equal(a.adapterRequestFingerprint, b.adapterRequestFingerprint);

  const provided = bundle(P5_5_GAP_OWNED_PROFILE, P5_5_GAP_COMPETITOR_PROFILES, f.src.fingerprint);
  const normalized = normalizeSuppliedBacklinkFixture({
    contract: a,
    request: f.request,
    provided,
  });
  assert.equal(normalized.bundle.summary.gapCandidateCount, 3);
  assert.equal(normalized.adapterResult.status, "success");
  assert.equal(normalized.adapterResult.signalType, "backlink");
  const metrics = new Map(normalized.adapterResult.metrics.map((item) => [item.key, item.value]));
  assert.equal(metrics.get("backlink.owned_authority"), 61);
  assert.equal(metrics.get("backlink.owned_referring_domain_count"), 2);
  assert.equal(metrics.get("backlink.gap_candidate_count"), 3);
  assert.equal(metrics.get("backlink.universal_competitor_gap_count"), 1);
  assert.equal(metrics.get("backlink.avg_gap_competitor_coverage_ratio"), 0.666667);

  const observation = normalizeAdapterResult({
    request: f.request,
    source: f.src,
    result: normalized.adapterResult,
    normalizedAt: P5_5_FIXTURE_REFERENCE_TIME,
  });
  assert.equal(observation.status, "success");
  assert.equal(observation.signalType, "backlink");
  assert.equal(observation.completeness, 1);
  assert.equal(observation.confidence, 0.86);
});

test("adapter rejects fixture basis or target lineage mismatch", () => {
  const f = task68Fixture();
  const authorityBasis = {
    providerKey: "synthetic",
    providerMethod: "supplied_backlink_snapshot_v1",
    metricName: "synthetic_authority",
    min: 0,
    max: 100,
    crossProviderComparable: false as const,
  };
  const contract = buildSuppliedBacklinkRequestContract({
    source: f.src,
    request: f.request,
    market,
    category,
    ownedDomain: "owned.test",
    competitorDomains: ["competitor-a.test", "competitor-b.test", "competitor-c.test"],
    authorityBasis,
  });
  const badBasis = bundle(P5_5_GAP_OWNED_PROFILE, P5_5_GAP_COMPETITOR_PROFILES, f.src.fingerprint);
  badBasis.basis.providerMethod = "other_method";
  assert.throws(
    () => normalizeSuppliedBacklinkFixture({ contract, request: f.request, provided: badBasis }),
    /fixture_basis_lineage_mismatch/,
  );

  const badTarget = bundle(P5_5_GAP_OWNED_PROFILE, P5_5_GAP_COMPETITOR_PROFILES, f.src.fingerprint);
  badTarget.owned.targetDomain = "different.test";
  assert.throws(
    () => normalizeSuppliedBacklinkFixture({ contract, request: f.request, provided: badTarget }),
    /owned_domain_mismatch/,
  );
});

test("P5.5 modules contain no provider transport, credentials, DB, worker, Task #70 execution, or source admission", () => {
  const files = [
    "./backlink-fixture-normalization.ts",
    "./backlink-fixtures.ts",
    "./backlink-supplied-adapter.ts",
  ];
  for (const file of files) {
    const sourceText = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
    assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
    assert.doesNotMatch(sourceText, /axios|undici|got\(/);
    assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres\(|drizzle/);
    assert.doesNotMatch(sourceText, /setInterval|setTimeout|worker_threads|child_process/);
    assert.doesNotMatch(sourceText, /Authorization\s*:|Basic\s+[A-Za-z0-9+/=]+/);
    assert.doesNotMatch(sourceText, /normalizeSignalSourceDescriptor\s*\(/);
    assert.doesNotMatch(sourceText, /executeAuthorizedSignalCollectionJob\s*\(/);
  }
});
