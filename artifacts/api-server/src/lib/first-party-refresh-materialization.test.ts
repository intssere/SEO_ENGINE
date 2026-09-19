import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCategoryContext,
  normalizeMarketProfile,
  type SignalType,
} from "./market-category-intelligence.js";
import {
  buildSignalRefreshPlan,
  normalizeSignalSourceDescriptor,
} from "./signal-source-registry.js";
import { buildSourceAdapterRequest } from "./signal-observation-normalization.js";
import { GSC_SEARCH_ANALYTICS_SOURCE_KEY } from "./gsc-search-analytics-runner.js";
import {
  buildFirstPartyRefreshSchedule,
  firstPartyRefreshMaterializationCapability,
  projectFirstPartyRefreshMaterializationReview,
} from "./first-party-refresh-materialization.js";

const PLAN_AT = "2026-09-19T19:55:00.000Z";
const START_AT = "2026-09-19T20:00:00.000Z";
const DUE_AT = "2026-09-19T20:05:00.000Z";
const MISSED_AT = "2026-09-19T20:35:00.000Z";

function lineageFixture(
  channel: "gsc" | "analytics" | "catalog" = "gsc",
  overrides: {
    sourceKey?: string;
    sourceClass?: "first_party" | "external";
    trustClass?: "first_party_authoritative" | "reviewed_external";
    collectionMode?: "provider_api" | "internal_db";
    provenanceComplete?: boolean;
    manuallyReviewed?: boolean;
    signalTypes?: SignalType[];
  } = {},
) {
  const market = normalizeMarketProfile({
    countryCode: "US",
    language: "en-US",
    currency: "USD",
    device: "all",
  });
  const category = normalizeCategoryContext({
    key: "fragrance",
    name: "Fragrance",
  });
  const signalType: SignalType =
    channel === "gsc" ? "keyword" : channel === "analytics" ? "analytics" : "catalog";
  const source = normalizeSignalSourceDescriptor({
    key:
      overrides.sourceKey
      ?? (channel === "gsc"
        ? GSC_SEARCH_ANALYTICS_SOURCE_KEY
        : channel === "analytics"
          ? "ga4-analytics-read"
          : "shopify-catalog-read"),
    name:
      channel === "gsc"
        ? "Google Search Console Search Analytics"
        : channel === "analytics"
          ? "Google Analytics Read"
          : "Shopify Catalog Read",
    sourceClass: overrides.sourceClass ?? "first_party",
    signalTypes: overrides.signalTypes ?? [signalType],
    marketFingerprints: [market.fingerprint],
    categoryFingerprints: [category.fingerprint],
    trustClass: overrides.trustClass ?? "first_party_authoritative",
    quality: 0.95,
    provenanceComplete: overrides.provenanceComplete ?? true,
    freshness: {
      freshForMinutes: 60,
      staleAfterMinutes: 180,
      criticalAfterMinutes: 720,
      volatility: "high",
    },
    collectionMode: overrides.collectionMode ?? "provider_api",
    manuallyReviewed: overrides.manuallyReviewed ?? true,
  });
  const plan = buildSignalRefreshPlan({
    sources: [source],
    need: {
      market,
      category,
      signalTypes: [signalType],
      now: PLAN_AT,
    },
    budget: {
      maxSources: 1,
      maxSignalTypesPerSource: 1,
      maxTotalRefreshItems: 1,
    },
  });
  assert.equal(plan.selected.length, 1);
  const request = buildSourceAdapterRequest({
    source,
    planItem: plan.selected[0]!,
    market,
    category,
    planId: plan.planId,
    planFingerprint: plan.planFingerprint,
  });
  return { market, category, source, plan, request };
}

function fixture(
  channel: "gsc" | "analytics" | "catalog" = "gsc",
) {
  const lineage = lineageFixture(channel);
  const schedule = buildFirstPartyRefreshSchedule({
    key: "first-party-" + channel,
    ...lineage,
    startAt: START_AT,
    cadenceMinutes: 60,
    dueWindowMinutes: 30,
  });
  return { ...lineage, schedule };
}

test("P9.2 deterministically binds exact GSC Task 67/68 lineage to P9.1", () => {
  const one = fixture("gsc");
  const two = fixture("gsc");
  assert.deepEqual(one.schedule, two.schedule);
  assert.equal(one.schedule.workClass, "signal_refresh");
  assert.match(one.schedule.scopeFingerprint, /^[0-9a-f]{64}$/);
  assert.match(one.schedule.upstreamLineageFingerprint, /^[0-9a-f]{64}$/);

  const review = projectFirstPartyRefreshMaterializationReview({
    ...one,
    now: DUE_AT,
  });
  assert.equal(review.evaluation.status, "due");
  assert.equal(review.channel, "gsc_search_analytics");
  assert.equal(review.runnerFoundationStatus, "runner_foundation_available");
  assert.deepEqual(review.blockers, []);
  assert.ok(review.candidate);
  assert.equal(review.candidate?.lifecycle, "proposed_review");
  assert.equal(review.candidate?.runnerFoundationStatus, "runner_foundation_available");
  assert.equal(review.candidate?.requestFingerprint, one.request.requestFingerprint);
  assert.equal(review.candidate?.planFingerprint, one.plan.planFingerprint);
  assert.equal(review.candidate?.intentFingerprint, review.evaluation.intent?.intentFingerprint);
});

test("runner foundation availability never becomes runtime readiness or authority", () => {
  const values = fixture("gsc");
  const review = projectFirstPartyRefreshMaterializationReview({
    ...values,
    now: DUE_AT,
  });
  const safety = review.safety;
  assert.equal(safety.architectureOnly, true);
  assert.equal(safety.deterministicProjectionOnly, true);
  assert.equal(safety.firstPartyReadOnly, true);
  assert.equal(safety.materializationReviewOnly, true);
  assert.equal(safety.runnerFoundationAvailabilityIsRuntimeReadiness, false);
  for (const key of [
    "wallClockAccess",
    "timerActivated",
    "schedulerActivated",
    "durableEnqueueAuthorized",
    "queueReservationAuthorized",
    "workerEnabled",
    "batchExecutorEnabled",
    "retryLoopEnabled",
    "task69PacketMaterializationAuthorized",
    "task70ExecutionAuthorized",
    "credentialUseAuthorized",
    "oauthUseAuthorized",
    "providerNetworkReadAuthorized",
    "observationPersistenceAuthorized",
    "evidencePersistenceAuthorized",
    "productionDbWriteAuthorized",
    "providerWrites",
    "publicSiteWrites",
    "task53ExecutionAuthorized",
    "task54ExecutionAuthorized",
    "automaticTransition",
    "publicationAuthorized",
  ] as const) {
    assert.equal(safety[key], false, key);
  }
  assert.deepEqual(safety, firstPartyRefreshMaterializationCapability());
});

test("analytics and catalog remain explicit runner-foundation gaps", () => {
  for (const channel of ["analytics", "catalog"] as const) {
    const values = fixture(channel);
    const review = projectFirstPartyRefreshMaterializationReview({
      ...values,
      now: DUE_AT,
    });
    assert.equal(review.evaluation.status, "due");
    assert.equal(review.channel, channel);
    assert.equal(review.runnerFoundationStatus, "runner_foundation_unavailable");
    assert.deepEqual(
      review.blockers,
      [
        channel === "analytics"
          ? "task70_compatible_analytics_runner_unavailable"
          : "task70_compatible_catalog_runner_unavailable",
      ],
    );
    assert.equal(review.candidate?.runnerFoundationStatus, "runner_foundation_unavailable");
    assert.deepEqual(review.candidate?.blockers, review.blockers);
    assert.equal(review.safety.task70ExecutionAuthorized, false);
  }
});

test("non-due states produce no materialization-review candidate", () => {
  const due = fixture("gsc");
  const pausedSchedule = buildFirstPartyRefreshSchedule({
    key: "paused-gsc",
    source: due.source,
    plan: due.plan,
    request: due.request,
    market: due.market,
    category: due.category,
    startAt: START_AT,
    cadenceMinutes: 60,
    dueWindowMinutes: 30,
    paused: true,
  });
  const paused = projectFirstPartyRefreshMaterializationReview({
    ...due,
    schedule: pausedSchedule,
    now: DUE_AT,
  });
  assert.equal(paused.evaluation.status, "paused");
  assert.equal(paused.candidate, null);

  const missed = projectFirstPartyRefreshMaterializationReview({
    ...due,
    now: MISSED_AT,
  });
  assert.equal(missed.evaluation.status, "missed");
  assert.equal(missed.candidate, null);

  const materialized = projectFirstPartyRefreshMaterializationReview({
    ...due,
    now: DUE_AT,
    lastMaterializedSlotAt: START_AT,
  });
  assert.equal(materialized.evaluation.status, "already_materialized");
  assert.equal(materialized.candidate, null);
});

test("material lineage changes alter schedule identity", () => {
  const one = fixture("gsc");
  const twoMarket = normalizeMarketProfile({
    countryCode: "GB",
    language: "en-GB",
    currency: "GBP",
    device: "all",
  });
  const source = normalizeSignalSourceDescriptor({
    key: GSC_SEARCH_ANALYTICS_SOURCE_KEY,
    name: "Google Search Console Search Analytics",
    sourceClass: "first_party",
    signalTypes: ["keyword"],
    marketFingerprints: [twoMarket.fingerprint],
    categoryFingerprints: [one.category.fingerprint],
    trustClass: "first_party_authoritative",
    quality: 0.95,
    provenanceComplete: true,
    freshness: {
      freshForMinutes: 60,
      staleAfterMinutes: 180,
      criticalAfterMinutes: 720,
      volatility: "high",
    },
    collectionMode: "provider_api",
    manuallyReviewed: true,
  });
  const plan = buildSignalRefreshPlan({
    sources: [source],
    need: {
      market: twoMarket,
      category: one.category,
      signalTypes: ["keyword"],
      now: PLAN_AT,
    },
    budget: { maxSources: 1, maxSignalTypesPerSource: 1, maxTotalRefreshItems: 1 },
  });
  const request = buildSourceAdapterRequest({
    source,
    planItem: plan.selected[0]!,
    market: twoMarket,
    category: one.category,
    planId: plan.planId,
    planFingerprint: plan.planFingerprint,
  });
  const two = buildFirstPartyRefreshSchedule({
    key: "first-party-gsc",
    source,
    plan,
    request,
    market: twoMarket,
    category: one.category,
    startAt: START_AT,
    cadenceMinutes: 60,
    dueWindowMinutes: 30,
  });
  assert.notEqual(one.schedule.scopeFingerprint, two.scopeFingerprint);
  assert.notEqual(one.schedule.upstreamLineageFingerprint, two.upstreamLineageFingerprint);
  assert.notEqual(one.schedule.scheduleFingerprint, two.scheduleFingerprint);
});

test("source, plan, request and schedule tampering fail closed", () => {
  const values = fixture("gsc");

  assert.throws(
    () => projectFirstPartyRefreshMaterializationReview({
      ...values,
      plan: { ...values.plan, planFingerprint: "f".repeat(64) },
      now: DUE_AT,
    }),
    /refresh_plan_identity_mismatch/,
  );

  assert.throws(
    () => projectFirstPartyRefreshMaterializationReview({
      ...values,
      request: { ...values.request, requestFingerprint: "e".repeat(64) },
      now: DUE_AT,
    }),
    /adapter_request_identity_mismatch/,
  );

  assert.throws(
    () => projectFirstPartyRefreshMaterializationReview({
      ...values,
      schedule: { ...values.schedule, scopeFingerprint: "d".repeat(64) },
      now: DUE_AT,
    }),
    /first_party_refresh_schedule_lineage_mismatch/,
  );
});

test("external, unsupported and malformed GSC source contracts fail closed", () => {
  const external = lineageFixture("analytics", {
    sourceClass: "external",
    trustClass: "reviewed_external",
  });
  assert.throws(
    () => buildFirstPartyRefreshSchedule({
      key: "external-analytics",
      ...external,
      startAt: START_AT,
      cadenceMinutes: 60,
      dueWindowMinutes: 30,
    }),
    /first_party_source_required/,
  );

  const unsupported = lineageFixture("gsc", {
    sourceKey: "other-first-party-keyword-source",
  });
  assert.throws(
    () => buildFirstPartyRefreshSchedule({
      key: "unsupported",
      ...unsupported,
      startAt: START_AT,
      cadenceMinutes: 60,
      dueWindowMinutes: 30,
    }),
    /unsupported_first_party_refresh_channel/,
  );

  const malformedGsc = lineageFixture("analytics", {
    sourceKey: GSC_SEARCH_ANALYTICS_SOURCE_KEY,
    signalTypes: ["analytics"],
  });
  assert.throws(
    () => buildFirstPartyRefreshSchedule({
      key: "malformed-gsc",
      ...malformedGsc,
      startAt: START_AT,
      cadenceMinutes: 60,
      dueWindowMinutes: 30,
    }),
    /gsc_source_contract_mismatch/,
  );
});

test("P9.2 does not mutate supplied lineage objects", () => {
  const values = fixture("gsc");
  const snapshots = {
    source: structuredClone(values.source),
    plan: structuredClone(values.plan),
    request: structuredClone(values.request),
    market: structuredClone(values.market),
    category: structuredClone(values.category),
    schedule: structuredClone(values.schedule),
  };
  projectFirstPartyRefreshMaterializationReview({
    ...values,
    now: DUE_AT,
  });
  assert.deepEqual(values.source, snapshots.source);
  assert.deepEqual(values.plan, snapshots.plan);
  assert.deepEqual(values.request, snapshots.request);
  assert.deepEqual(values.market, snapshots.market);
  assert.deepEqual(values.category, snapshots.category);
  assert.deepEqual(values.schedule, snapshots.schedule);
});
