import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCategoryContext, normalizeMarketProfile } from "./market-category-intelligence.js";
import { buildSignalRefreshPlan, normalizeSignalSourceDescriptor } from "./signal-source-registry.js";
import { buildSourceAdapterRequest } from "./signal-observation-normalization.js";
import { buildSignalCollectionJobPacket } from "./signal-collection-job-planning.js";
import {
  deterministicSignalCollectionExecutionRowId,
  executeAuthorizedSignalCollectionJob,
  signalCollectionExecutionCapability,
  type SignalCollectionExecutionIdentity,
  type SignalCollectionExecutionReceipt,
  type SignalCollectionExecutionStore,
} from "./signal-collection-execution.js";

const PREPARED_AT = "2026-09-14T12:00:00.000Z";
const PLAN_AT = "2026-09-14T11:55:00.000Z";
const EXECUTION_AT = "2026-09-14T12:10:00.000Z";
const SITE_ID = "11111111-1111-4111-8111-111111111111";
const ENABLED_ENV = { SIGNAL_COLLECTION_SINGLE_JOB_EXECUTION_ENABLED: "true" };

function fixture(ttlMinutes = 30) {
  const market = normalizeMarketProfile({ countryCode: "US", language: "en-US", currency: "USD", device: "all" });
  const category = normalizeCategoryContext({ key: "arabian-fragrance", name: "Arabian Fragrance" });
  const source = normalizeSignalSourceDescriptor({
    key: "reviewed-keyword-source",
    name: "Reviewed Keyword Source",
    sourceClass: "external",
    signalTypes: ["keyword"],
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
  const planItem = plan.selected[0]!;
  const request = buildSourceAdapterRequest({
    source,
    planItem,
    market,
    category,
    planId: plan.planId,
    planFingerprint: plan.planFingerprint,
  });
  const packet = buildSignalCollectionJobPacket({ source, plan, request, preparedAt: PREPARED_AT, ttlMinutes });
  return { market, category, source, plan, request, packet };
}

function adapterResult(values = fixture()) {
  return {
    requestFingerprint: values.request.requestFingerprint,
    sourceId: values.source.sourceId,
    sourceFingerprint: values.source.fingerprint,
    sourceClass: values.source.sourceClass,
    marketFingerprint: values.request.marketFingerprint,
    categoryFingerprint: values.request.categoryFingerprint,
    signalType: values.request.signalType,
    observedAt: "2026-09-14T12:05:00.000Z",
    status: "success",
    metrics: [
      { key: "search_volume", value: 1200, unit: "count" },
      { key: "trend_velocity", value: 0.18, unit: "ratio" },
    ],
    diagnostics: [],
    errorCode: null,
    completeness: 1,
  };
}

class MemoryStore implements SignalCollectionExecutionStore {
  rows = new Map<string, { identity: SignalCollectionExecutionIdentity; status: string; receipt?: SignalCollectionExecutionReceipt }>();
  reserveCalls = 0;
  claimCalls = 0;
  completeCalls = 0;
  failCalls = 0;
  forceCollision = false;
  forceClaimFalse = false;
  forceCompleteFalse = false;
  forceFailFalse = false;

  async reserve(identity: SignalCollectionExecutionIdentity) {
    this.reserveCalls += 1;
    if (this.forceCollision) return { state: "identity_collision", status: "pending" } as const;
    const existing = this.rows.get(identity.rowId);
    if (existing) {
      const same = JSON.stringify(existing.identity) === JSON.stringify(identity);
      return same
        ? { state: "already_exists", status: existing.status } as const
        : { state: "identity_collision", status: existing.status } as const;
    }
    this.rows.set(identity.rowId, { identity, status: "pending" });
    return { state: "reserved" } as const;
  }

  async claim(rowId: string) {
    this.claimCalls += 1;
    if (this.forceClaimFalse) return false;
    const row = this.rows.get(rowId);
    if (!row || row.status !== "pending") return false;
    row.status = "active";
    return true;
  }

  async complete(rowId: string, receipt: SignalCollectionExecutionReceipt) {
    this.completeCalls += 1;
    if (this.forceCompleteFalse) return false;
    const row = this.rows.get(rowId);
    if (!row || row.status !== "active") return false;
    row.status = "completed";
    row.receipt = receipt;
    return true;
  }

  async fail(rowId: string, receipt: SignalCollectionExecutionReceipt) {
    this.failCalls += 1;
    if (this.forceFailFalse) return false;
    const row = this.rows.get(rowId);
    if (!row || row.status !== "active") return false;
    row.status = "failed";
    row.receipt = receipt;
    return true;
  }
}

function readyOverrides(store: MemoryStore, values = fixture(), runner?: () => Promise<any>) {
  let runnerCalls = 0;
  return {
    overrides: {
      runnerCapability: () => ({
        version: "test-runner-v1",
        configured: true,
        credentialReady: true,
        networkReady: true,
        sourceFingerprint: values.source.fingerprint,
        collectionMode: values.source.collectionMode,
        signalTypes: [values.request.signalType],
      }),
      loadSiteContext: async () => ({ siteId: SITE_ID, domain: "diamondshelf.us" }),
      createStore: () => store,
      run: async () => {
        runnerCalls += 1;
        if (runner) return runner();
        return {
          adapterResult: adapterResult(values),
          invocationCount: 1 as const,
          responseBytes: 2048,
          providerRequestIdHash: "a".repeat(64),
        };
      },
      now: () => EXECUTION_AT,
    },
    runnerCalls: () => runnerCalls,
  };
}

function executionInput(values = fixture(), authorization = values.packet.authorization) {
  return {
    packet: values.packet,
    source: values.source,
    plan: values.plan,
    request: values.request,
    authorization,
    actorId: "admin-subject:admin@example.com",
    env: ENABLED_ENV,
    now: EXECUTION_AT,
  };
}

test("capability is default-off and production runner/network/persistence/write gates remain closed", () => {
  const off = signalCollectionExecutionCapability({});
  assert.equal(off.executionGateEnabled, false);
  assert.equal(off.runtimeRunnerConfigured, false);
  assert.equal(off.credentialReady, false);
  assert.equal(off.networkCollectionReady, false);
  assert.equal(off.networkCollectionAuthorized, false);
  assert.equal(off.rawPayloadRetentionAuthorized, false);
  assert.equal(off.observationPersistenceAuthorized, false);
  assert.equal(off.evidencePersistenceAuthorized, false);
  assert.equal(off.targetConfigurationMutationAuthorized, false);
  assert.equal(off.schedulerEnabled, false);
  assert.equal(off.batchEnabled, false);
  assert.equal(off.autonomousWorkerEnabled, false);
  assert.equal(off.retryLoopEnabled, false);
  assert.equal(off.providerWrites, false);
  assert.equal(off.publicSiteWrites, false);
  assert.equal(off.automaticTransition, false);
  assert.equal(off.executionAuthorized, false);
  assert.equal(off.schemaMutationRequired, false);

  const gateOn = signalCollectionExecutionCapability(ENABLED_ENV);
  assert.equal(gateOn.executionGateEnabled, true);
  assert.equal(gateOn.runtimeRunnerConfigured, false);
  assert.equal(gateOn.networkCollectionReady, false);
  assert.equal(gateOn.executionAuthorized, false);
});

test("gate false short-circuits before runner capability, site lookup, store, or runner", async () => {
  const values = fixture();
  let touched = 0;
  const result = await executeAuthorizedSignalCollectionJob(
    { ...executionInput(values), env: {} },
    {
      runnerCapability: () => { touched += 1; throw new Error("unexpected"); },
      loadSiteContext: async () => { touched += 1; throw new Error("unexpected"); },
      createStore: () => { touched += 1; throw new Error("unexpected"); },
      run: async () => { touched += 1; throw new Error("unexpected"); },
      now: () => { touched += 1; return EXECUTION_AT; },
    },
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "signal_collection_execution_disabled");
  assert.equal(touched, 0);
});

test("execution row UUID identity is deterministic and changes with Task69 identity", () => {
  const a = fixture();
  const b = fixture();
  assert.equal(deterministicSignalCollectionExecutionRowId(a.packet), deterministicSignalCollectionExecutionRowId(b.packet));
  assert.match(deterministicSignalCollectionExecutionRowId(a.packet), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

  const changed = fixture(31);
  assert.notEqual(deterministicSignalCollectionExecutionRowId(a.packet), deterministicSignalCollectionExecutionRowId(changed.packet));
});

test("authorization mismatch is rejected before runner capability/site/store", async () => {
  const values = fixture();
  let touched = 0;
  const result = await executeAuthorizedSignalCollectionJob(
    executionInput(values, `${values.packet.authorization}-tampered`),
    {
      runnerCapability: () => { touched += 1; throw new Error("unexpected"); },
      loadSiteContext: async () => { touched += 1; return null; },
      createStore: () => { touched += 1; return null; },
    },
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "signal_collection_authorization_mismatch");
  assert.equal(touched, 0);
});

test("expired packet is rejected before runner capability/reservation", async () => {
  const values = fixture(5);
  let touched = 0;
  const result = await executeAuthorizedSignalCollectionJob(
    { ...executionInput(values), now: "2026-09-14T12:05:00.000Z" },
    {
      runnerCapability: () => { touched += 1; throw new Error("unexpected"); },
      createStore: () => { touched += 1; return null; },
    },
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "signal_collection_job_expired");
  assert.equal(touched, 0);
});

test("tampered Task69 lineage fails preflight before runner capability/reservation", async () => {
  const values = fixture();
  const tampered = { ...values.packet, requestFingerprint: "f".repeat(64) };
  let touched = 0;
  const result = await executeAuthorizedSignalCollectionJob(
    { ...executionInput(values), packet: tampered, authorization: tampered.authorization },
    {
      runnerCapability: () => { touched += 1; throw new Error("unexpected"); },
      createStore: () => { touched += 1; return null; },
    },
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "signal_collection_preflight_failed");
  assert.equal(touched, 0);
});

test("unconfigured runner rejects before site lookup, reservation, and runner invocation", async () => {
  const values = fixture();
  let siteCalls = 0;
  let storeCalls = 0;
  let runnerCalls = 0;
  const result = await executeAuthorizedSignalCollectionJob(executionInput(values), {
    runnerCapability: () => ({
      version: "not-configured",
      configured: false,
      credentialReady: false,
      networkReady: false,
      sourceFingerprint: null,
      collectionMode: null,
      signalTypes: [],
    }),
    loadSiteContext: async () => { siteCalls += 1; return { siteId: SITE_ID, domain: "diamondshelf.us" }; },
    createStore: () => { storeCalls += 1; return new MemoryStore(); },
    run: async () => { runnerCalls += 1; throw new Error("unexpected"); },
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "signal_collection_runner_unavailable");
  assert.equal(siteCalls, 0);
  assert.equal(storeCalls, 0);
  assert.equal(runnerCalls, 0);
});

test("single injected runner happy path reserves, claims, normalizes, completes once, and persists nothing", async () => {
  const values = fixture();
  const store = new MemoryStore();
  const ready = readyOverrides(store, values);
  const result = await executeAuthorizedSignalCollectionJob(executionInput(values), ready.overrides);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.consumed, true);
  assert.equal(ready.runnerCalls(), 1);
  assert.equal(store.reserveCalls, 1);
  assert.equal(store.claimCalls, 1);
  assert.equal(store.completeCalls, 1);
  assert.equal(store.failCalls, 0);
  assert.equal(store.rows.get(result.rowId)?.status, "completed");
  assert.equal(result.observation.status, "success");
  assert.equal(result.observation.metrics.length, 2);
  assert.deepEqual(result.persistence, { observationAttempted: false, evidenceAttempted: false });
  assert.equal(result.receipt.runnerInvocationCount, 1);
  assert.equal(result.receipt.rawPayloadRetained, false);
  assert.equal(result.receipt.observationPersisted, false);
  assert.equal(result.receipt.evidencePersisted, false);
  assert.equal(result.receipt.targetConfigurationMutated, false);
  assert.equal(result.receipt.providerWrites, false);
  assert.equal(result.receipt.publicSiteWrites, false);
  assert.equal(result.receipt.automaticTransition, false);
});

test("exact replay is terminally rejected as already consumed without second runner invocation", async () => {
  const values = fixture();
  const store = new MemoryStore();
  const ready = readyOverrides(store, values);
  const first = await executeAuthorizedSignalCollectionJob(executionInput(values), ready.overrides);
  assert.equal(first.ok, true);
  const second = await executeAuthorizedSignalCollectionJob(executionInput(values), ready.overrides);
  assert.equal(second.ok, false);
  if (!second.ok) {
    assert.equal(second.reason, "signal_collection_authorization_already_consumed");
    assert.equal(second.consumed, true);
  }
  assert.equal(ready.runnerCalls(), 1);
  assert.equal(store.reserveCalls, 2);
  assert.equal(store.claimCalls, 1);
});

test("identity collision fails closed before claim or runner", async () => {
  const values = fixture();
  const store = new MemoryStore();
  store.forceCollision = true;
  const ready = readyOverrides(store, values);
  const result = await executeAuthorizedSignalCollectionJob(executionInput(values), ready.overrides);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "signal_collection_execution_identity_collision");
  assert.equal(store.claimCalls, 0);
  assert.equal(ready.runnerCalls(), 0);
});

test("claim race fails closed after authorization consumption and before runner", async () => {
  const values = fixture();
  const store = new MemoryStore();
  store.forceClaimFalse = true;
  const ready = readyOverrides(store, values);
  const result = await executeAuthorizedSignalCollectionJob(executionInput(values), ready.overrides);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "signal_collection_claim_failed");
    assert.equal(result.consumed, true);
  }
  assert.equal(ready.runnerCalls(), 0);
});

test("injected runner failure becomes one terminal failed receipt with zero persistence", async () => {
  const values = fixture();
  const store = new MemoryStore();
  const ready = readyOverrides(store, values, async () => { throw new Error("provider_timeout"); });
  const result = await executeAuthorizedSignalCollectionJob(executionInput(values), ready.overrides);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "signal_collection_runner_failed");
  assert.equal(result.consumed, true);
  assert.equal(ready.runnerCalls(), 1);
  assert.equal(store.failCalls, 1);
  assert.equal(store.rows.get(result.rowId!)?.status, "failed");
  assert.equal(result.receipt?.failureCategory, "provider_timeout");
  assert.equal(result.receipt?.rawPayloadRetained, false);
  assert.equal(result.receipt?.observationPersisted, false);
  assert.equal(result.receipt?.evidencePersisted, false);
});

test("Task68 normalization failure becomes terminal failed and retains no raw adapter payload", async () => {
  const values = fixture();
  const store = new MemoryStore();
  const ready = readyOverrides(store, values, async () => ({
    adapterResult: { ...adapterResult(values), rawBody: "forbidden" },
    invocationCount: 1 as const,
    responseBytes: 99,
    providerRequestIdHash: null,
  }));
  const result = await executeAuthorizedSignalCollectionJob(executionInput(values), ready.overrides);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "signal_collection_normalization_failed");
  assert.equal(result.consumed, true);
  assert.equal(ready.runnerCalls(), 1);
  assert.equal(store.failCalls, 1);
  assert.equal(store.rows.get(result.rowId!)?.status, "failed");
  assert.equal(result.receipt?.rawPayloadRetained, false);
  assert.equal(result.receipt?.observation, null);
});

test("invalid bounded runner receipt becomes terminal failed", async () => {
  const values = fixture();
  const store = new MemoryStore();
  const ready = readyOverrides(store, values, async () => ({
    adapterResult: adapterResult(values),
    invocationCount: 1 as const,
    responseBytes: 100_000_001,
    providerRequestIdHash: null,
  }));
  const result = await executeAuthorizedSignalCollectionJob(executionInput(values), ready.overrides);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "signal_collection_runner_output_invalid");
  assert.equal(store.failCalls, 1);
  assert.equal(ready.runnerCalls(), 1);
});

test("terminal completion write failure returns manual intervention without rerunning", async () => {
  const values = fixture();
  const store = new MemoryStore();
  store.forceCompleteFalse = true;
  const ready = readyOverrides(store, values);
  const result = await executeAuthorizedSignalCollectionJob(executionInput(values), ready.overrides);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "signal_collection_manual_intervention_required");
  assert.equal(result.consumed, true);
  assert.equal(ready.runnerCalls(), 1);
  assert.equal(store.completeCalls, 1);
  assert.equal(result.receipt?.outcome, "completed");
  assert.equal(result.receipt?.observationPersisted, false);
  assert.equal(result.receipt?.evidencePersisted, false);
});

test("terminal failure write failure returns manual intervention and never retries runner", async () => {
  const values = fixture();
  const store = new MemoryStore();
  store.forceFailFalse = true;
  const ready = readyOverrides(store, values, async () => { throw new Error("provider_timeout"); });
  const result = await executeAuthorizedSignalCollectionJob(executionInput(values), ready.overrides);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "signal_collection_manual_intervention_required");
  assert.equal(result.consumed, true);
  assert.equal(ready.runnerCalls(), 1);
  assert.equal(store.failCalls, 1);
  assert.equal(result.receipt?.outcome, "failed");
});
