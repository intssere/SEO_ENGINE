import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCategoryContext, normalizeMarketProfile } from "./market-category-intelligence.js";
import { buildSignalRefreshPlan, normalizeSignalSourceDescriptor } from "./signal-source-registry.js";
import { buildSourceAdapterRequest } from "./signal-observation-normalization.js";
import {
  DEFAULT_SIGNAL_COLLECTION_JOB_TTL_MINUTES,
  SIGNAL_COLLECTION_JOB_AUTHORIZATION_PREFIX,
  buildSignalCollectionJobPacket,
  preflightSignalCollectionJobPacket,
  signalCollectionJobPlanningCapability,
} from "./signal-collection-job-planning.js";

const PREPARED_AT = "2026-09-14T12:00:00.000Z";
const PLAN_AT = "2026-09-14T11:55:00.000Z";

function fixture(overrides: { sourceKey?: string; signalType?: "keyword" | "trend" } = {}) {
  const market = normalizeMarketProfile({ countryCode: "US", language: "en-US", currency: "USD", device: "all" });
  const category = normalizeCategoryContext({ key: "arabian-fragrance", name: "Arabian Fragrance" });
  const source = normalizeSignalSourceDescriptor({
    key: overrides.sourceKey ?? "reviewed-market-signals",
    name: "Reviewed Market Signals",
    sourceClass: "external",
    signalTypes: ["keyword", "trend"],
    marketFingerprints: [market.fingerprint],
    categoryFingerprints: [category.fingerprint],
    trustClass: "reviewed_external",
    quality: 0.9,
    provenanceComplete: true,
    freshness: { freshForMinutes: 60, staleAfterMinutes: 120, criticalAfterMinutes: 360, volatility: "high" },
    collectionMode: "provider_api",
    manuallyReviewed: true,
  });
  const signalType = overrides.signalType ?? "keyword";
  const plan = buildSignalRefreshPlan({
    sources: [source],
    need: { market, category, signalTypes: [signalType], now: PLAN_AT },
    budget: { maxSources: 1, maxSignalTypesPerSource: 1, maxTotalRefreshItems: 1 },
  });
  assert.equal(plan.selected.length, 1);
  const planItem = plan.selected[0]!;
  const request = buildSourceAdapterRequest({
    source,
    planItem,
    market,
    category,
    planId: plan.planId,
    planFingerprint: plan.planFingerprint,
  });
  return { market, category, source, plan, planItem, request };
}

function packet(ttlMinutes = DEFAULT_SIGNAL_COLLECTION_JOB_TTL_MINUTES) {
  const values = fixture();
  return {
    ...values,
    packet: buildSignalCollectionJobPacket({
      source: values.source,
      plan: values.plan,
      request: values.request,
      preparedAt: PREPARED_AT,
      ttlMinutes,
    }),
  };
}

test("capability is planning/authorization-contract only and all live/persistence/write gates stay closed", () => {
  const cap = signalCollectionJobPlanningCapability();
  assert.equal(cap.planningAndAuthorizationContractOnly, true);
  assert.equal(cap.credentialUseAuthorized, false);
  assert.equal(cap.credentialMutationAuthorized, false);
  assert.equal(cap.transportExecutionAuthorized, false);
  assert.equal(cap.networkCollectionAuthorized, false);
  assert.equal(cap.providerEnrollmentAuthorized, false);
  assert.equal(cap.observationPersistenceAuthorized, false);
  assert.equal(cap.evidencePersistenceAuthorized, false);
  assert.equal(cap.durableJobReservationAuthorized, false);
  assert.equal(cap.targetConfigurationMutationAuthorized, false);
  assert.equal(cap.schedulerEnabled, false);
  assert.equal(cap.batchExecutorEnabled, false);
  assert.equal(cap.autonomousWorkerEnabled, false);
  assert.equal(cap.retryLoopEnabled, false);
  assert.equal(cap.task64ExecutionAuthorized, false);
  assert.equal(cap.providerWrites, false);
  assert.equal(cap.publicSiteWrites, false);
  assert.equal(cap.authorizationConsumed, false);
  assert.equal(cap.executionRouteInvoked, false);
  assert.equal(cap.automaticTransition, false);
  assert.equal(cap.schemaMutationRequired, false);
});

test("same exact lineage and time window produce deterministic job and replay identity", () => {
  const a = packet().packet;
  const b = packet().packet;
  assert.equal(a.jobFingerprint, b.jobFingerprint);
  assert.equal(a.jobId, b.jobId);
  assert.equal(a.replayFingerprint, b.replayFingerprint);
  assert.equal(a.replayId, b.replayId);
  assert.match(a.jobId, /^scj-[0-9a-f]{24}$/);
  assert.match(a.replayId, /^scr-[0-9a-f]{24}$/);
});

test("material source, signal/request, or time-window changes alter job and replay identity", () => {
  const base = packet().packet;
  const changedSourceFixture = fixture({ sourceKey: "different-reviewed-source" });
  const changedSource = buildSignalCollectionJobPacket({
    source: changedSourceFixture.source,
    plan: changedSourceFixture.plan,
    request: changedSourceFixture.request,
    preparedAt: PREPARED_AT,
  });
  const changedSignalFixture = fixture({ signalType: "trend" });
  const changedSignal = buildSignalCollectionJobPacket({
    source: changedSignalFixture.source,
    plan: changedSignalFixture.plan,
    request: changedSignalFixture.request,
    preparedAt: PREPARED_AT,
  });
  const values = fixture();
  const changedTime = buildSignalCollectionJobPacket({
    source: values.source,
    plan: values.plan,
    request: values.request,
    preparedAt: "2026-09-14T12:01:00.000Z",
  });
  for (const changed of [changedSource, changedSignal, changedTime]) {
    assert.notEqual(base.jobFingerprint, changed.jobFingerprint);
    assert.notEqual(base.replayFingerprint, changed.replayFingerprint);
  }
});

test("packet is scalar one-source/one-market/one-category/one-signal scope with exact Task 67/68 lineage", () => {
  const values = packet();
  const { packet: job, source, plan, request } = values;
  assert.equal(job.sourceId, source.sourceId);
  assert.equal(job.sourceFingerprint, source.fingerprint);
  assert.equal(job.sourceClass, source.sourceClass);
  assert.equal(job.collectionMode, source.collectionMode);
  assert.equal(job.marketFingerprint, plan.marketFingerprint);
  assert.equal(job.categoryFingerprint, plan.categoryFingerprint);
  assert.equal(job.signalType, request.signalType);
  assert.equal(job.planId, plan.planId);
  assert.equal(job.planFingerprint, plan.planFingerprint);
  assert.equal(job.requestId, request.requestId);
  assert.equal(job.requestFingerprint, request.requestFingerprint);
  assert.equal(Array.isArray(job.sourceId), false);
  assert.equal(Array.isArray(job.signalType), false);
});

test("future authorization text is exact and fingerprint-bound", () => {
  const job = packet().packet;
  assert.equal(job.authorization, `${SIGNAL_COLLECTION_JOB_AUTHORIZATION_PREFIX}:${job.jobId}:${job.jobFingerprint}`);
});

test("valid preflight becomes authorization-ready while every execution/persistence marker remains false", () => {
  const values = packet();
  const preflight = preflightSignalCollectionJobPacket({
    packet: values.packet,
    source: values.source,
    plan: values.plan,
    request: values.request,
    now: "2026-09-14T12:10:00.000Z",
  });
  assert.equal(preflight.status, "authorization_ready");
  assert.equal(preflight.expired, false);
  assert.equal(preflight.authorizationEligible, true);
  assert.equal(preflight.authorization, values.packet.authorization);
  assert.equal(preflight.safety.networkCollectionAuthorized, false);
  assert.equal(preflight.safety.transportExecutionAuthorized, false);
  assert.equal(preflight.safety.observationPersistenceAuthorized, false);
  assert.equal(preflight.safety.durableJobReservationAuthorized, false);
  assert.equal(preflight.safety.authorizationConsumed, false);
  assert.equal(preflight.safety.executionRouteInvoked, false);
});

test("expired packet is blocked without consuming authorization", () => {
  const values = packet(10);
  const preflight = preflightSignalCollectionJobPacket({
    packet: values.packet,
    source: values.source,
    plan: values.plan,
    request: values.request,
    now: values.packet.expiresAt,
  });
  assert.equal(preflight.status, "expired");
  assert.equal(preflight.expired, true);
  assert.equal(preflight.authorizationEligible, false);
  assert.equal(preflight.safety.authorizationConsumed, false);
});

test("source identity tamper fails closed", () => {
  const values = packet();
  const source = { ...values.source, quality: 0.5 };
  assert.throws(() => preflightSignalCollectionJobPacket({ packet: values.packet, source, plan: values.plan, request: values.request, now: "2026-09-14T12:10:00.000Z" }), /source_identity_mismatch/);
});

test("refresh-plan lineage tamper fails closed", () => {
  const values = packet();
  const plan = { ...values.plan, marketFingerprint: "a".repeat(64) };
  assert.throws(() => preflightSignalCollectionJobPacket({ packet: values.packet, source: values.source, plan, request: values.request, now: "2026-09-14T12:10:00.000Z" }), /refresh_plan_identity_mismatch/);
});

test("adapter-request lineage tamper fails closed", () => {
  const values = packet();
  const request = { ...values.request, categoryFingerprint: "b".repeat(64) };
  assert.throws(() => preflightSignalCollectionJobPacket({ packet: values.packet, source: values.source, plan: values.plan, request, now: "2026-09-14T12:10:00.000Z" }), /adapter_request_identity_mismatch/);
});

test("request without exact Task 67 plan lineage cannot become a Task 69 job", () => {
  const values = fixture();
  const request = buildSourceAdapterRequest({
    source: values.source,
    planItem: values.planItem,
    market: values.market,
    category: values.category,
  });
  assert.throws(() => buildSignalCollectionJobPacket({ source: values.source, plan: values.plan, request, preparedAt: PREPARED_AT }), /refresh_plan_lineage_required/);
});

test("packet lineage tamper fails closed for market/category/signal/plan/request fields", () => {
  const values = packet();
  const cases = [
    { ...values.packet, marketFingerprint: "c".repeat(64) },
    { ...values.packet, categoryFingerprint: "d".repeat(64) },
    { ...values.packet, signalType: "trend" as const },
    { ...values.packet, planId: "srp-111111111111111111111111" },
    { ...values.packet, requestId: "sar-222222222222222222222222" },
  ];
  for (const tampered of cases) {
    assert.throws(() => preflightSignalCollectionJobPacket({ packet: tampered, source: values.source, plan: values.plan, request: values.request, now: "2026-09-14T12:10:00.000Z" }));
  }
});

test("job and replay identity tamper fails closed", () => {
  const values = packet();
  const badJob = { ...values.packet, jobFingerprint: "a".repeat(64) };
  assert.throws(() => preflightSignalCollectionJobPacket({ packet: badJob, source: values.source, plan: values.plan, request: values.request, now: "2026-09-14T12:10:00.000Z" }), /collection_job_identity_mismatch/);
  const badReplay = { ...values.packet, replayFingerprint: "b".repeat(64) };
  assert.throws(() => preflightSignalCollectionJobPacket({ packet: badReplay, source: values.source, plan: values.plan, request: values.request, now: "2026-09-14T12:10:00.000Z" }), /replay_identity_mismatch/);
});

test("authorization-string tamper fails closed", () => {
  const values = packet();
  const tampered = { ...values.packet, authorization: `${values.packet.authorization}:tampered` };
  assert.throws(() => preflightSignalCollectionJobPacket({ packet: tampered, source: values.source, plan: values.plan, request: values.request, now: "2026-09-14T12:10:00.000Z" }), /collection_job_authorization_mismatch/);
});

test("safety-marker tamper fails closed before authorization readiness", () => {
  const values = packet();
  const tampered = structuredClone(values.packet);
  (tampered.safety as { networkCollectionAuthorized: boolean }).networkCollectionAuthorized = true;
  assert.throws(() => preflightSignalCollectionJobPacket({ packet: tampered, source: values.source, plan: values.plan, request: values.request, now: "2026-09-14T12:10:00.000Z" }), /collection_job_safety_mismatch/);
});

test("invalid TTL, preparation time, and preflight-before-created fail closed", () => {
  const values = fixture();
  assert.throws(() => buildSignalCollectionJobPacket({ source: values.source, plan: values.plan, request: values.request, preparedAt: PREPARED_AT, ttlMinutes: 0 }), /invalid_ttl_minutes/);
  assert.throws(() => buildSignalCollectionJobPacket({ source: values.source, plan: values.plan, request: values.request, preparedAt: PREPARED_AT, ttlMinutes: 61 }), /invalid_ttl_minutes/);
  assert.throws(() => buildSignalCollectionJobPacket({ source: values.source, plan: values.plan, request: values.request, preparedAt: "not-a-time" }), /invalid_prepared_at/);
  const job = buildSignalCollectionJobPacket({ source: values.source, plan: values.plan, request: values.request, preparedAt: PREPARED_AT });
  assert.throws(() => preflightSignalCollectionJobPacket({ packet: job, source: values.source, plan: values.plan, request: values.request, now: "2026-09-14T11:59:59.000Z" }), /preflight_before_job_created/);
});

test("packet contains no credential, transport, persistence, reservation, or execution authority", () => {
  const job = packet().packet;
  const serialized = JSON.stringify(job);
  assert.equal(serialized.includes("access_token"), false);
  assert.equal(serialized.includes("api_key"), false);
  assert.equal(serialized.includes("authorizationHeader"), false);
  assert.equal(job.safety.credentialUseAuthorized, false);
  assert.equal(job.safety.transportExecutionAuthorized, false);
  assert.equal(job.safety.networkCollectionAuthorized, false);
  assert.equal(job.safety.observationPersistenceAuthorized, false);
  assert.equal(job.safety.durableJobReservationAuthorized, false);
  assert.equal(job.safety.executionRouteInvoked, false);
});
