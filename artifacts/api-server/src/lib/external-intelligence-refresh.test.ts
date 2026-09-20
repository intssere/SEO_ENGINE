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
import {
  P5_2_DATAFORSEO_SERP_SOURCE_KEY,
} from "./dataforseo-serp-adapter.js";
import {
  P5_3_DATAFORSEO_KEYWORD_SOURCE_KEY,
} from "./dataforseo-keyword-adapter.js";
import {
  P5_4_DATAFORSEO_TRENDS_SOURCE_KEY,
} from "./dataforseo-google-trends-adapter.js";
import {
  P5_5_SUPPLIED_BACKLINK_SOURCE_KEY,
} from "./backlink-supplied-adapter.js";
import {
  buildExternalIntelligenceRefreshSchedule,
  externalIntelligenceRefreshCapability,
  projectExternalIntelligenceRefreshReview,
  type ExternalIntelligenceTelemetryInput,
} from "./external-intelligence-refresh.js";

const PLAN_AT = "2026-09-20T00:00:00.000Z";
const START_AT = "2026-09-20T01:00:00.000Z";
const DUE_AT = "2026-09-20T01:05:00.000Z";

type Channel = "serp" | "keyword" | "trend" | "backlink";

function channelConfig(channel: Channel) {
  if (channel === "serp") {
    return {
      key: P5_2_DATAFORSEO_SERP_SOURCE_KEY,
      signalType: "serp" as const,
      collectionMode: "provider_api" as const,
    };
  }
  if (channel === "keyword") {
    return {
      key: P5_3_DATAFORSEO_KEYWORD_SOURCE_KEY,
      signalType: "keyword" as const,
      collectionMode: "provider_api" as const,
    };
  }
  if (channel === "trend") {
    return {
      key: P5_4_DATAFORSEO_TRENDS_SOURCE_KEY,
      signalType: "trend" as const,
      collectionMode: "provider_api" as const,
    };
  }
  return {
    key: P5_5_SUPPLIED_BACKLINK_SOURCE_KEY,
    signalType: "backlink" as const,
    collectionMode: "manual_import" as const,
  };
}

function lineageFixture(
  channel: Channel = "serp",
  overrides: {
    sourceKey?: string;
    sourceClass?: "first_party" | "external";
    trustClass?: "reviewed_external" | "experimental_external";
    provenanceComplete?: boolean;
    manuallyReviewed?: boolean;
    signalTypes?: SignalType[];
  } = {},
  planAt = PLAN_AT,
) {
  const cfg = channelConfig(channel);
  const market = normalizeMarketProfile({
    countryCode: "US",
    language: "en-US",
    searchEngine: "google",
    currency: "USD",
    device: channel === "serp" ? "desktop" : "all",
  });
  const category = normalizeCategoryContext({
    key: "fragrance",
    name: "Fragrance",
  });
  const source = normalizeSignalSourceDescriptor({
    key: overrides.sourceKey ?? cfg.key,
    name: cfg.key,
    sourceClass: overrides.sourceClass ?? "external",
    signalTypes: overrides.signalTypes ?? [cfg.signalType],
    marketFingerprints: [market.fingerprint],
    categoryFingerprints: [category.fingerprint],
    trustClass: overrides.trustClass ?? "reviewed_external",
    quality: 0.9,
    provenanceComplete: overrides.provenanceComplete ?? true,
    freshness: {
      freshForMinutes: 30,
      staleAfterMinutes: 60,
      criticalAfterMinutes: 180,
      volatility: "high",
    },
    collectionMode: cfg.collectionMode,
    manuallyReviewed: overrides.manuallyReviewed ?? true,
  });
  const plan = buildSignalRefreshPlan({
    sources: [source],
    need: {
      market,
      category,
      signalTypes: [cfg.signalType],
      now: planAt,
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

function telemetry(
  fixture: ReturnType<typeof lineageFixture>,
  rateState: "available" | "elevated" | "constrained" | "exhausted" | "unavailable" = "available",
  referenceTime = "2026-09-20T01:04:00.000Z",
): ExternalIntelligenceTelemetryInput {
  const signalType = fixture.request.signalType;
  const events = [{
    eventId: "event-1",
    sourceFingerprint: fixture.source.fingerprint,
    signalType,
    observedAt: "2026-09-20T00:30:00.000Z",
    status: "success" as const,
    completeness: 1,
    cost: fixture.source.collectionMode === "provider_api"
      ? { amount: 0.001, currency: "USD", billingUnits: 1, billingUnit: "request" }
      : null,
  }];

  if (fixture.source.collectionMode === "manual_import") {
    return { referenceTime, events, rateLimitSnapshots: [] };
  }

  if (rateState === "unavailable") {
    return {
      referenceTime,
      events,
      rateLimitSnapshots: [{
        snapshotId: "rate-1",
        sourceFingerprint: fixture.source.fingerprint,
        signalType,
        capturedAt: "2026-09-20T01:03:00.000Z",
        scope: "synthetic",
        limit: null,
        remaining: null,
        windowSeconds: null,
        resetAt: null,
      }],
    };
  }

  const remaining =
    rateState === "available" ? 75
      : rateState === "elevated" ? 50
        : rateState === "constrained" ? 10
          : 0;
  return {
    referenceTime,
    events,
    rateLimitSnapshots: [{
      snapshotId: "rate-1",
      sourceFingerprint: fixture.source.fingerprint,
      signalType,
      capturedAt: "2026-09-20T01:03:00.000Z",
      scope: "synthetic",
      limit: 100,
      remaining,
      windowSeconds: 60,
      resetAt: "2026-09-20T01:04:00.000Z",
    }],
  };
}

function scheduleFixture(
  fixture: ReturnType<typeof lineageFixture>,
  overrides: { startAt?: string; paused?: boolean } = {},
) {
  return buildExternalIntelligenceRefreshSchedule({
    key: "external-" + fixture.request.signalType,
    ...fixture,
    startAt: overrides.startAt ?? START_AT,
    cadenceMinutes: 60,
    dueWindowMinutes: 15,
    paused: overrides.paused,
  });
}

test("P9.4 schedule identity is deterministic and binds exact source/plan/request/adapter lineage", () => {
  const fixture = lineageFixture("serp");
  const one = scheduleFixture(fixture);
  const two = scheduleFixture(fixture);
  assert.deepEqual(one, two);

  const changed = lineageFixture("keyword");
  assert.notEqual(one.scheduleFingerprint, scheduleFixture(changed).scheduleFingerprint);
});

test("P9.4 recognizes P5.2 DataForSEO SERP supplied-result foundation and ready telemetry", () => {
  const fixture = lineageFixture("serp");
  const schedule = scheduleFixture(fixture);
  const projection = projectExternalIntelligenceRefreshReview({
    schedule,
    ...fixture,
    telemetry: telemetry(fixture, "available"),
    now: DUE_AT,
  });

  assert.equal(projection.evaluation.status, "due");
  assert.equal(projection.candidate?.adapterKind, "dataforseo_serp");
  assert.equal(projection.candidate?.providerKey, "dataforseo");
  assert.equal(projection.candidate?.suppliedResultFoundationStatus, "available");
  assert.equal(projection.candidate?.liveRuntimeStatus, "unavailable");
  assert.equal(projection.candidate?.reviewDisposition, "supplied_review_ready");
  assert.deepEqual(projection.candidate?.reviewBlockers, []);
  assert.equal(projection.candidate?.telemetry.rateLimit.state, "available");
  assert.equal(projection.candidate?.telemetry.rateLimit.freshness, "fresh");
  assert.equal(projection.candidate?.telemetry.quality.eventCount, 1);
  assert.equal(projection.candidate?.telemetry.cost.totalAmount, 0.001);
  assert.ok(
    projection.candidate?.liveRuntimeBlockers.includes(
      "task70_compatible_external_runner_unavailable",
    ),
  );
});

test("P9.4 recognizes P5.3 keyword and P5.4 trend supplied-result foundations", () => {
  for (const [channel, expected] of [
    ["keyword", "dataforseo_keyword"],
    ["trend", "dataforseo_trend"],
  ] as const) {
    const fixture = lineageFixture(channel);
    const projection = projectExternalIntelligenceRefreshReview({
      schedule: scheduleFixture(fixture),
      ...fixture,
      telemetry: telemetry(fixture),
      now: DUE_AT,
    });
    assert.equal(projection.candidate?.adapterKind, expected);
    assert.equal(projection.candidate?.reviewDisposition, "supplied_review_ready");
    assert.equal(projection.candidate?.providerKey, "dataforseo");
  }
});

test("P9.4 preserves P5.5 manual-import semantics without fabricating live provider readiness", () => {
  const fixture = lineageFixture("backlink");
  const projection = projectExternalIntelligenceRefreshReview({
    schedule: scheduleFixture(fixture),
    ...fixture,
    telemetry: telemetry(fixture),
    now: DUE_AT,
  });

  assert.equal(projection.candidate?.adapterKind, "supplied_backlink_fixture");
  assert.equal(projection.candidate?.providerKey, null);
  assert.equal(projection.candidate?.reviewDisposition, "supplied_review_ready");
  assert.equal(projection.candidate?.telemetry.providerReviewStateAtEvaluation, "not_applicable");
  assert.equal(projection.candidate?.telemetry.rateLimit.state, "not_applicable");
  assert.equal(projection.candidate?.telemetry.rateLimit.freshness, "not_applicable");
  assert.ok(projection.candidate?.reviewDiagnostics.includes("manual_import_no_live_provider_rate_limit"));
  assert.ok(projection.candidate?.liveRuntimeBlockers.includes("manual_import_only"));
});

test("P9.4 uses rate-limit telemetry only as transparent bounded review gating", () => {
  const fixture = lineageFixture("serp");

  const elevated = projectExternalIntelligenceRefreshReview({
    schedule: scheduleFixture(fixture),
    ...fixture,
    telemetry: telemetry(fixture, "elevated"),
    now: DUE_AT,
  });
  assert.equal(elevated.candidate?.reviewDisposition, "supplied_review_caution");
  assert.ok(elevated.candidate?.reviewDiagnostics.includes("rate_limit_elevated"));

  for (const state of ["constrained", "exhausted", "unavailable"] as const) {
    const projection = projectExternalIntelligenceRefreshReview({
      schedule: scheduleFixture(fixture),
      ...fixture,
      telemetry: telemetry(fixture, state),
      now: DUE_AT,
    });
    assert.equal(projection.candidate?.reviewDisposition, "deferred_review");
    assert.ok((projection.candidate?.reviewBlockers.length ?? 0) > 0);
  }
});

test("P9.4 defers on stale rate-limit snapshot without changing Task #67 order", () => {
  const fixture = lineageFixture("serp");
  const supplied = telemetry(fixture, "available", "2026-09-20T01:04:00.000Z");
  supplied.rateLimitSnapshots![0] = {
    ...supplied.rateLimitSnapshots![0]!,
    capturedAt: "2026-09-19T22:00:00.000Z",
    resetAt: "2026-09-19T22:01:00.000Z",
  };
  const projection = projectExternalIntelligenceRefreshReview({
    schedule: scheduleFixture(fixture),
    ...fixture,
    telemetry: supplied,
    now: DUE_AT,
  });
  assert.equal(projection.candidate?.reviewDisposition, "deferred_review");
  assert.ok(projection.candidate?.reviewBlockers.includes("rate_limit_snapshot_critical"));
  assert.equal(projection.safety.sourceRefreshPlanReorderingEnabled, false);
  assert.equal(projection.safety.qualityTelemetryChangesRefreshOrder, false);
  assert.equal(projection.safety.costTelemetryChangesRefreshOrder, false);
});

test("P9.4 defers when the P5.1 provider review is stale at evaluation time", () => {
  const fixture = lineageFixture("serp", {}, "2026-12-20T00:00:00.000Z");
  const schedule = scheduleFixture(fixture, { startAt: "2026-12-20T01:00:00.000Z" });
  const supplied = telemetry(fixture, "available", "2026-12-20T01:04:00.000Z");
  supplied.events![0] = {
    ...supplied.events![0]!,
    observedAt: "2026-12-20T00:30:00.000Z",
  };
  supplied.rateLimitSnapshots![0] = {
    ...supplied.rateLimitSnapshots![0]!,
    capturedAt: "2026-12-20T01:03:00.000Z",
    resetAt: "2026-12-20T01:04:00.000Z",
  };

  const projection = projectExternalIntelligenceRefreshReview({
    schedule,
    ...fixture,
    telemetry: supplied,
    now: "2026-12-20T01:05:00.000Z",
  });
  assert.equal(projection.candidate?.telemetry.providerReviewStateAtEvaluation, "stale");
  assert.equal(projection.candidate?.reviewDisposition, "deferred_review");
  assert.ok(projection.candidate?.reviewBlockers.includes("provider_review_stale"));
});

test("P9.4 non-due P9.1 states emit no review candidate", () => {
  const fixture = lineageFixture("serp");
  const active = scheduleFixture(fixture);
  const supplied = telemetry(fixture);
  const beforeStartTelemetry: ExternalIntelligenceTelemetryInput = {
    referenceTime: "2026-09-20T00:58:00.000Z",
    events: supplied.events,
    rateLimitSnapshots: [],
  };

  assert.equal(projectExternalIntelligenceRefreshReview({
    schedule: active,
    ...fixture,
    telemetry: beforeStartTelemetry,
    now: "2026-09-20T00:59:00.000Z",
  }).candidate, null);

  assert.equal(projectExternalIntelligenceRefreshReview({
    schedule: active,
    ...fixture,
    telemetry: supplied,
    now: "2026-09-20T01:20:00.000Z",
  }).candidate, null);

  assert.equal(projectExternalIntelligenceRefreshReview({
    schedule: active,
    ...fixture,
    telemetry: supplied,
    now: DUE_AT,
    lastMaterializedSlotAt: START_AT,
  }).candidate, null);

  const paused = scheduleFixture(fixture, { paused: true });
  assert.equal(projectExternalIntelligenceRefreshReview({
    schedule: paused,
    ...fixture,
    telemetry: supplied,
    now: DUE_AT,
  }).candidate, null);
});

test("P9.4 fails closed on schedule, source, request, and telemetry lineage tampering", () => {
  const fixture = lineageFixture("serp");
  const schedule = scheduleFixture(fixture);

  assert.throws(() => projectExternalIntelligenceRefreshReview({
    schedule: { ...schedule, cadenceMinutes: 120 },
    ...fixture,
    telemetry: telemetry(fixture),
    now: DUE_AT,
  }), /external_refresh_schedule_lineage_mismatch/);

  const badSource = { ...fixture.source, name: "tampered" };
  assert.throws(() => buildExternalIntelligenceRefreshSchedule({
    key: "bad-source",
    ...fixture,
    source: badSource,
    startAt: START_AT,
    cadenceMinutes: 60,
    dueWindowMinutes: 15,
  }), /source_identity_mismatch/);

  const badRequest = { ...fixture.request, requestFingerprint: "a".repeat(64) };
  assert.throws(() => buildExternalIntelligenceRefreshSchedule({
    key: "bad-request",
    ...fixture,
    request: badRequest,
    startAt: START_AT,
    cadenceMinutes: 60,
    dueWindowMinutes: 15,
  }), /adapter_request_identity_mismatch/);

  const badTelemetry = telemetry(fixture);
  badTelemetry.events![0] = {
    ...badTelemetry.events![0]!,
    sourceFingerprint: "b".repeat(64),
  };
  assert.throws(() => projectExternalIntelligenceRefreshReview({
    schedule,
    ...fixture,
    telemetry: badTelemetry,
    now: DUE_AT,
  }), /event_stream_binding_not_found/);
});

test("P9.4 rejects unsupported or weak external source contracts", () => {
  const unsupported = lineageFixture("serp", { sourceKey: "synthetic-competitor-api" });
  assert.throws(() => scheduleFixture(unsupported), /unsupported_external_intelligence_adapter/);

  const experimental = lineageFixture("serp", { trustClass: "experimental_external" });
  assert.throws(() => scheduleFixture(experimental), /reviewed_external_source_contract_required/);

  const multiSignal = lineageFixture("serp", { signalTypes: ["serp", "keyword"] });
  assert.throws(() => scheduleFixture(multiSignal), /external_adapter_source_contract_mismatch/);
});

test("P9.4 capability remains strictly default-off", () => {
  assert.deepEqual(externalIntelligenceRefreshCapability(), {
    version: "p9-4-bounded-external-intelligence-refresh-v1",
    architectureOnly: true,
    deterministicProjectionOnly: true,
    externalReadReviewOnly: true,
    suppliedInputsOnly: true,
    telemetryReviewOnly: true,
    sourceRefreshPlanReorderingEnabled: false,
    qualityTelemetryChangesRefreshOrder: false,
    costTelemetryChangesRefreshOrder: false,
    rateLimitTelemetryIsExecutionAuthorization: false,
    suppliedAdapterFoundationIsLiveRunner: false,
    orderingImpliesPriority: false,
    wallClockAccess: false,
    timerActivated: false,
    schedulerActivated: false,
    durableEnqueueAuthorized: false,
    queueReservationAuthorized: false,
    workerEnabled: false,
    batchExecutorEnabled: false,
    retryLoopEnabled: false,
    task69PacketMaterializationAuthorized: false,
    task70ExecutionAuthorized: false,
    providerEnrollmentAuthorized: false,
    providerPurchaseAuthorized: false,
    credentialCreationAuthorized: false,
    credentialUseAuthorized: false,
    oauthUseAuthorized: false,
    providerNetworkReadAuthorized: false,
    liveEndpointExecutionAuthorized: false,
    pollingAuthorized: false,
    observationPersistenceAuthorized: false,
    evidencePersistenceAuthorized: false,
    productionDbReadAuthorized: false,
    productionDbWriteAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    task53ExecutionAuthorized: false,
    task54ExecutionAuthorized: false,
    automaticTransition: false,
    publicationAuthorized: false,
  });
});
