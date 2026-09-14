import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCategoryContext, normalizeMarketProfile } from "./market-category-intelligence.js";
import { buildSignalRefreshPlan, normalizeSignalSourceDescriptor } from "./signal-source-registry.js";
import { buildSourceAdapterRequest } from "./signal-observation-normalization.js";
import { buildSignalCollectionJobPacket } from "./signal-collection-job-planning.js";
import {
  SIGNAL_COLLECTION_EXECUTION_GATE,
  defaultSignalCollectionRunnerCapability,
  deterministicSignalCollectionExecutionJobId,
  executeAuthorizedSignalCollectionJob,
  signalCollectionExecutionCapability,
  type SignalCollectionExecutionIdentity,
  type SignalCollectionExecutionStore,
  type SignalCollectionSourceRunner,
} from "./signal-collection-execution.js";

const PREPARED_AT = "2026-09-14T12:00:00.000Z";
const PLAN_AT = "2026-09-14T11:55:00.000Z";
const EXECUTION_AT = "2026-09-14T12:10:00.000Z";
const OBSERVED_AT = "2026-09-14T12:09:00.000Z";
const ACTIVE_ENV = { [SIGNAL_COLLECTION_EXECUTION_GATE]: "true" };

function fixture() {
  const market = normalizeMarketProfile({ countryCode: "US", language: "en-US", currency: "USD", device: "all" });
  const category = normalizeCategoryContext({ key: "arabian-fragrance", name: "Arabian Fragrance" });
  const source = normalizeSignalSourceDescriptor({
    key: "reviewed-market-signals",
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
  const plan = buildSignalRefreshPlan({
    sources: [source],
    need: { market, category, signalTypes: ["keyword"], now: PLAN_AT },
    budget: { maxSources: 1, maxSignalTypesPerSource: 1, maxTotalRefreshItems: 1 },
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
  const packet = buildSignalCollectionJobPacket({
    source,
    plan,
    request,
    preparedAt: PREPARED_AT,
  });
  return { market, category, source, plan, request, packet };
}

function validAdapterResult(values: ReturnType<typeof fixture>) {
  return {
    requestFingerprint: values.request.requestFingerprint,
    sourceId: values.source.sourceId,
    sourceFingerprint: values.source.fingerprint,
    sourceClass: values.source.sourceClass,
    marketFingerprint: values.market.fingerprint,
    categoryFingerprint: values.category.fingerprint,
    signalType: values.request.signalType,
    observedAt: OBSERVED_AT,
    status: "success",
    metrics: [{ key: "search_volume", value: 1200, unit: "count" }],
  };
}

function readyRunner(values: ReturnType<typeof fixture>, calls: { capability: number; run: number }): SignalCollectionSourceRunner {
  return {
    capability() {
      calls.capability += 1;
      return {
        configured: true,
        credentialReady: true,
        networkReady: true,
        sourceReadOnly: true,
        providerWrites: false,
        publicSiteWrites: false,
      };
    },
    async run() {
      calls.run += 1;
      return validAdapterResult(values);
    },
  };
}

function memoryStore(options: {
  reserveMode?: "normal" | "identity_collision" | "throw";
  claimResult?: boolean;
  completeResult?: boolean;
  failResult?: boolean;
} = {}) {
  let identity: SignalCollectionExecutionIdentity | null = null;
  let status: "pending" | "active" | "completed" | "failed" | null = null;
  const calls = { reserve: 0, claim: 0, complete: 0, fail: 0, close: 0 };
  const store: SignalCollectionExecutionStore = {
    async reserve(next) {
      calls.reserve += 1;
      if (options.reserveMode === "throw") throw new Error("store_uncertain");
      if (options.reserveMode === "identity_collision") return { state: "identity_collision", status: "completed" };
      if (!identity) {
        identity = { ...next };
        status = "pending";
        return { state: "reserved" };
      }
      const same = JSON.stringify(identity) === JSON.stringify(next);
      return same
        ? { state: "already_exists", status: status ?? "unknown" }
        : { state: "identity_collision", status };
    },
    async claim() {
      calls.claim += 1;
      if (options.claimResult === false || status !== "pending") return false;
      status = "active";
      return true;
    },
    async complete() {
      calls.complete += 1;
      if (options.completeResult === false || status !== "active") return false;
      status = "completed";
      return true;
    },
    async fail() {
      calls.fail += 1;
      if (options.failResult === false || status !== "active") return false;
      status = "failed";
      return true;
    },
    async close() {
      calls.close += 1;
    },
  };
  return { store, calls, getStatus: () => status };
}

function baseOverrides(values: ReturnType<typeof fixture>, store: SignalCollectionExecutionStore, runner?: SignalCollectionSourceRunner) {
  const calls = { capability: 0, run: 0 };
  return {
    calls,
    overrides: {
      loadSiteContext: async () => ({ siteId: "11111111-1111-4111-8111-111111111111", domain: "diamondshelf.us" }),
      createStore: () => store,
      runner: runner ?? readyRunner(values, calls),
      now: () => EXECUTION_AT,
    },
  };
}

function execute(values: ReturnType<typeof fixture>, overrides: Parameters<typeof executeAuthorizedSignalCollectionJob>[1], extras: { authorization?: string; now?: string; env?: Record<string, string | undefined> } = {}) {
  return executeAuthorizedSignalCollectionJob({
    packet: values.packet,
    source: values.source,
    plan: values.plan,
    request: values.request,
    authorization: extras.authorization ?? values.packet.authorization,
    actorId: "admin@example.com",
    env: extras.env ?? ACTIVE_ENV,
    now: extras.now ?? EXECUTION_AT,
  }, overrides);
}

test("capability stays default-off with production runner/network/persistence/write authorization closed", () => {
  const cap = signalCollectionExecutionCapability({});
  assert.equal(cap.executionGateEnabled, false);
  assert.equal(cap.productionRunnerConfigured, false);
  assert.equal(cap.credentialReady, false);
  assert.equal(cap.networkReady, false);
  assert.equal(cap.networkCollectionAuthorized, false);
  assert.equal(cap.observationPersistenceAuthorized, false);
  assert.equal(cap.evidencePersistenceAuthorized, false);
  assert.equal(cap.rawPayloadRetentionAuthorized, false);
  assert.equal(cap.schedulerEnabled, false);
  assert.equal(cap.batchExecutorEnabled, false);
  assert.equal(cap.autonomousWorkerEnabled, false);
  assert.equal(cap.retryLoopEnabled, false);
  assert.equal(cap.providerWrites, false);
  assert.equal(cap.publicSiteWrites, false);
  assert.equal(cap.executionAuthorized, false);
  assert.equal(cap.automaticTransition, false);
  assert.equal(cap.schemaMutationRequired, false);
  assert.deepEqual(defaultSignalCollectionRunnerCapability(), {
    configured: false,
    credentialReady: false,
    networkReady: false,
    sourceReadOnly: true,
    providerWrites: false,
    publicSiteWrites: false,
  });
});

test("gate false short-circuits before runner capability, site lookup, store creation, or runner invocation", async () => {
  const values = fixture();
  const touched = { capability: 0, run: 0, site: 0, store: 0 };
  const result = await executeAuthorizedSignalCollectionJob({
    packet: values.packet,
    source: values.source,
    plan: values.plan,
    request: values.request,
    authorization: values.packet.authorization,
    actorId: "admin@example.com",
    env: {},
    now: EXECUTION_AT,
  }, {
    loadSiteContext: async () => { touched.site += 1; return null; },
    createStore: () => { touched.store += 1; return null; },
    runner: {
      capability() { touched.capability += 1; return defaultSignalCollectionRunnerCapability(); },
      async run() { touched.run += 1; return {}; },
    },
    now: () => EXECUTION_AT,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "signal_collection_execution_disabled");
  assert.deepEqual(touched, { capability: 0, run: 0, site: 0, store: 0 });
});

test("deterministic execution UUID is stable and changes with Task 69 identity", () => {
  const values = fixture();
  const a = deterministicSignalCollectionExecutionJobId(values.packet.jobId, values.packet.jobFingerprint, values.packet.replayFingerprint);
  const b = deterministicSignalCollectionExecutionJobId(values.packet.jobId, values.packet.jobFingerprint, values.packet.replayFingerprint);
  const changed = deterministicSignalCollectionExecutionJobId(values.packet.jobId, "a".repeat(64), values.packet.replayFingerprint);
  assert.equal(a, b);
  assert.notEqual(a, changed);
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("authorization mismatch is rejected before runner or durable reservation", async () => {
  const values = fixture();
  const memory = memoryStore();
  const prepared = baseOverrides(values, memory.store);
  const result = await execute(values, prepared.overrides, { authorization: `${values.packet.authorization}:tampered` });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "signal_collection_authorization_mismatch");
  assert.equal(prepared.calls.capability, 0);
  assert.equal(memory.calls.reserve, 0);
});

test("expired or tampered Task 69 packet is rejected before runner or reservation", async () => {
  const values = fixture();
  const memory = memoryStore();
  const prepared = baseOverrides(values, memory.store);
  const expired = await execute(values, prepared.overrides, { now: values.packet.expiresAt });
  assert.equal(expired.ok, false);
  if (!expired.ok) assert.equal(expired.reason, "signal_collection_job_preflight_rejected");
  assert.equal(memory.calls.reserve, 0);

  const tamperedValues = { ...values, packet: { ...values.packet, marketFingerprint: "a".repeat(64) } };
  const tampered = await execute(tamperedValues, prepared.overrides);
  assert.equal(tampered.ok, false);
  if (!tampered.ok) assert.equal(tampered.reason, "signal_collection_job_preflight_rejected");
  assert.equal(memory.calls.reserve, 0);
});

test("unconfigured runner rejects before site lookup or durable reservation", async () => {
  const values = fixture();
  const memory = memoryStore();
  let siteCalls = 0;
  const result = await execute(values, {
    loadSiteContext: async () => { siteCalls += 1; return null; },
    createStore: () => memory.store,
    runner: {
      capability: () => defaultSignalCollectionRunnerCapability(),
      async run() { throw new Error("must_not_run"); },
    },
    now: () => EXECUTION_AT,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "signal_collection_runner_unavailable");
  assert.equal(siteCalls, 0);
  assert.equal(memory.calls.reserve, 0);
});

test("happy path reserves, claims, invokes exactly once, normalizes through Task 68, and completes", async () => {
  const values = fixture();
  const memory = memoryStore();
  const prepared = baseOverrides(values, memory.store);
  const result = await execute(values, prepared.overrides);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.mode, "single_job");
  assert.equal(result.consumed, true);
  assert.equal(prepared.calls.run, 1);
  assert.equal(memory.calls.reserve, 1);
  assert.equal(memory.calls.claim, 1);
  assert.equal(memory.calls.complete, 1);
  assert.equal(memory.calls.fail, 0);
  assert.equal(memory.getStatus(), "completed");
  assert.equal(result.observation.status, "success");
  assert.equal(result.observation.metrics[0]?.key, "search_volume");
  assert.equal(result.receipt.observation?.observationFingerprint, result.observation.observationFingerprint);
  assert.equal(result.receipt.rawPayloadRetained, false);
  assert.equal(result.receipt.observationPersisted, false);
  assert.equal(result.receipt.evidencePersisted, false);
  assert.deepEqual(result.persistence, { observationAttempted: false, evidenceAttempted: false });
});

test("exact replay is rejected as already consumed and does not invoke runner twice", async () => {
  const values = fixture();
  const memory = memoryStore();
  const prepared = baseOverrides(values, memory.store);
  const first = await execute(values, prepared.overrides);
  assert.equal(first.ok, true);
  const second = await execute(values, prepared.overrides);
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.reason, "signal_collection_authorization_already_consumed");
  assert.equal(prepared.calls.run, 1);
  assert.equal(memory.calls.reserve, 2);
});

test("deterministic identity collision fails closed before runner invocation", async () => {
  const values = fixture();
  const memory = memoryStore({ reserveMode: "identity_collision" });
  const prepared = baseOverrides(values, memory.store);
  const result = await execute(values, prepared.overrides);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "signal_collection_execution_identity_collision");
    assert.equal(result.consumed, true);
  }
  assert.equal(prepared.calls.run, 0);
});

test("claim race fails closed before runner invocation", async () => {
  const values = fixture();
  const memory = memoryStore({ claimResult: false });
  const prepared = baseOverrides(values, memory.store);
  const result = await execute(values, prepared.overrides);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "signal_collection_claim_failed");
  assert.equal(prepared.calls.run, 0);
  assert.equal(memory.calls.claim, 1);
});

test("runner failure becomes terminal failed receipt without raw payload or persistence", async () => {
  const values = fixture();
  const memory = memoryStore();
  const calls = { capability: 0, run: 0 };
  const runner: SignalCollectionSourceRunner = {
    capability() {
      calls.capability += 1;
      return { configured: true, credentialReady: true, networkReady: true, sourceReadOnly: true, providerWrites: false, publicSiteWrites: false };
    },
    async run() {
      calls.run += 1;
      throw new Error("provider_detail_must_not_be_retained");
    },
  };
  const prepared = baseOverrides(values, memory.store, runner);
  const result = await execute(values, prepared.overrides);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "signal_collection_runner_failed");
    assert.equal(result.receipt?.outcome, "failed");
    assert.equal(result.receipt?.failureCategory, "runner_failed");
    assert.equal(result.receipt?.rawPayloadRetained, false);
    assert.equal(result.receipt?.observationPersisted, false);
  }
  assert.equal(memory.getStatus(), "failed");
  assert.equal(calls.run, 1);
});

test("Task 68 normalization rejection becomes terminal failed receipt and rejects raw/unknown payload fields", async () => {
  const values = fixture();
  const memory = memoryStore();
  const calls = { capability: 0, run: 0 };
  const runner: SignalCollectionSourceRunner = {
    capability() {
      calls.capability += 1;
      return { configured: true, credentialReady: true, networkReady: true, sourceReadOnly: true, providerWrites: false, publicSiteWrites: false };
    },
    async run() {
      calls.run += 1;
      return { ...validAdapterResult(values), rawBody: "must-never-be-retained" };
    },
  };
  const prepared = baseOverrides(values, memory.store, runner);
  const result = await execute(values, prepared.overrides);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "signal_collection_normalization_failed");
    assert.equal(result.receipt?.failureCategory, "normalization_failed");
    assert.equal(result.receipt?.observation, null);
    assert.equal(result.receipt?.rawPayloadRetained, false);
  }
  assert.equal(memory.getStatus(), "failed");
});

test("terminal completion write failure returns manual-intervention state", async () => {
  const values = fixture();
  const memory = memoryStore({ completeResult: false });
  const prepared = baseOverrides(values, memory.store);
  const result = await execute(values, prepared.overrides);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "signal_collection_manual_intervention_required");
    assert.equal(result.consumed, true);
    assert.equal(result.receipt?.outcome, "completed");
  }
  assert.equal(prepared.calls.run, 1);
});

test("uncertain reservation failure returns manual-intervention and never invokes runner", async () => {
  const values = fixture();
  const memory = memoryStore({ reserveMode: "throw" });
  const prepared = baseOverrides(values, memory.store);
  const result = await execute(values, prepared.overrides);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "signal_collection_manual_intervention_required");
    assert.equal(result.consumed, true);
  }
  assert.equal(prepared.calls.run, 0);
});