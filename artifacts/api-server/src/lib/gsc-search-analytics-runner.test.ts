import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCategoryContext, normalizeMarketProfile } from "./market-category-intelligence.js";
import { buildSignalRefreshPlan, normalizeSignalSourceDescriptor } from "./signal-source-registry.js";
import { buildSourceAdapterRequest } from "./signal-observation-normalization.js";
import { buildSignalCollectionJobPacket } from "./signal-collection-job-planning.js";
import {
  SIGNAL_COLLECTION_EXECUTION_GATE,
  executeAuthorizedSignalCollectionJob,
  type SignalCollectionExecutionIdentity,
  type SignalCollectionExecutionStore,
} from "./signal-collection-execution.js";
import {
  GSC_SEARCH_ANALYTICS_READONLY_SCOPE,
  GSC_SEARCH_ANALYTICS_SOURCE_KEY,
  GscSearchAnalyticsTransportError,
  buildGscSearchAnalyticsTransportRequest,
  createGscSearchAnalyticsRunner,
  gscSearchAnalyticsRunnerReadiness,
  normalizeGscSearchAnalyticsBinding,
  type GscSearchAnalyticsBinding,
  type GscSearchAnalyticsTransport,
  type GscSearchAnalyticsTransportRequest,
} from "./gsc-search-analytics-runner.js";

const PLAN_AT = "2026-09-14T11:55:00.000Z";
const PREPARED_AT = "2026-09-14T12:00:00.000Z";
const EXECUTION_AT = "2026-09-14T12:10:00.000Z";
const ACTIVE_ENV = { [SIGNAL_COLLECTION_EXECUTION_GATE]: "true" };

function fixture() {
  const market = normalizeMarketProfile({ countryCode: "US", language: "en-US", currency: "USD", device: "all" });
  const category = normalizeCategoryContext({ key: "fragrance", name: "Fragrance" });
  const source = normalizeSignalSourceDescriptor({
    key: GSC_SEARCH_ANALYTICS_SOURCE_KEY,
    name: "Google Search Console Search Analytics",
    sourceClass: "first_party",
    signalTypes: ["keyword"],
    marketFingerprints: [market.fingerprint],
    categoryFingerprints: [category.fingerprint],
    trustClass: "first_party_authoritative",
    quality: 0.98,
    provenanceComplete: true,
    freshness: { freshForMinutes: 60, staleAfterMinutes: 180, criticalAfterMinutes: 720, volatility: "high" },
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
  const packet = buildSignalCollectionJobPacket({ source, plan, request, preparedAt: PREPARED_AT });
  return { market, category, source, plan, request, packet };
}

function binding(values: ReturnType<typeof fixture>, overrides: Partial<GscSearchAnalyticsBinding> = {}): GscSearchAnalyticsBinding {
  return {
    sourceFingerprint: values.source.fingerprint,
    requestFingerprint: values.request.requestFingerprint,
    property: "sc-domain:diamondshelf.us",
    startDate: "2026-09-07",
    endDate: "2026-09-13",
    dimensions: [],
    filters: [],
    rowLimit: 1000,
    maxPages: 1,
    timeoutMs: 5000,
    ...overrides,
  };
}

function fakeTransport(handler: (request: GscSearchAnalyticsTransportRequest) => unknown | Promise<unknown>) {
  const calls: GscSearchAnalyticsTransportRequest[] = [];
  const transport: GscSearchAnalyticsTransport = {
    async query(request) {
      calls.push(request);
      return handler(request);
    },
  };
  return { transport, calls };
}

function readyRunner(
  values: ReturnType<typeof fixture>,
  transport: GscSearchAnalyticsTransport,
  overrides: Partial<GscSearchAnalyticsBinding> = {},
) {
  return createGscSearchAnalyticsRunner({
    binding: binding(values, overrides),
    transport,
    credentialReady: true,
    networkReady: true,
    liveExecutionAuthorized: true,
  });
}

function memoryStore() {
  let identity: SignalCollectionExecutionIdentity | null = null;
  let status: "pending" | "active" | "completed" | "failed" | null = null;
  const calls = { reserve: 0, claim: 0, complete: 0, fail: 0, close: 0 };
  const store: SignalCollectionExecutionStore = {
    async reserve(next) {
      calls.reserve += 1;
      if (!identity) {
        identity = { ...next };
        status = "pending";
        return { state: "reserved" };
      }
      return JSON.stringify(identity) === JSON.stringify(next)
        ? { state: "already_exists", status: status ?? "unknown" }
        : { state: "identity_collision", status };
    },
    async claim() {
      calls.claim += 1;
      if (status !== "pending") return false;
      status = "active";
      return true;
    },
    async complete() {
      calls.complete += 1;
      if (status !== "active") return false;
      status = "completed";
      return true;
    },
    async fail() {
      calls.fail += 1;
      if (status !== "active") return false;
      status = "failed";
      return true;
    },
    async close() {
      calls.close += 1;
    },
  };
  return { store, calls, getStatus: () => status };
}

test("default readiness is fail-closed and requires only the documented read-only scope", () => {
  const readiness = gscSearchAnalyticsRunnerReadiness();
  assert.equal(readiness.runnerSupported, true);
  assert.equal(readiness.configured, false);
  assert.equal(readiness.credentialReady, false);
  assert.equal(readiness.networkReady, false);
  assert.equal(readiness.liveExecutionAuthorized, false);
  assert.equal(readiness.readOnlyScope, GSC_SEARCH_ANALYTICS_READONLY_SCOPE);
  assert.equal(readiness.sourceReadOnly, true);
  assert.equal(readiness.providerWrites, false);
  assert.equal(readiness.publicSiteWrites, false);
  assert.equal(readiness.observationPersistenceAuthorized, false);
  assert.equal(readiness.evidencePersistenceAuthorized, false);
  assert.equal(readiness.schedulerEnabled, false);
  assert.equal(readiness.batchExecutorEnabled, false);
  assert.equal(readiness.autonomousWorkerEnabled, false);
  assert.equal(readiness.retryLoopEnabled, false);
});

test("Task 70 capability remains unavailable unless configuration, readiness, and explicit live authorization are all supplied", () => {
  const values = fixture();
  const fake = fakeTransport(() => ({ rows: [] }));
  const runner = createGscSearchAnalyticsRunner({
    binding: binding(values),
    transport: fake.transport,
    credentialReady: true,
    networkReady: true,
    liveExecutionAuthorized: false,
  });
  assert.deepEqual(runner.capability({ source: values.source, request: values.request }), {
    configured: false,
    credentialReady: false,
    networkReady: false,
    sourceReadOnly: true,
    providerWrites: false,
    publicSiteWrites: false,
  });
  assert.equal(fake.calls.length, 0);
});

test("request construction is deterministic across dimension and filter input order", () => {
  const values = fixture();
  const a = buildGscSearchAnalyticsTransportRequest(binding(values, {
    dimensions: ["page", "query"],
    filters: [
      { dimension: "query", operator: "contains", expression: "perfume" },
      { dimension: "page", operator: "contains", expression: "/collections/" },
    ],
    rowLimit: 250,
  }));
  const b = buildGscSearchAnalyticsTransportRequest(binding(values, {
    dimensions: ["query", "page"],
    filters: [
      { dimension: "page", operator: "contains", expression: "/collections/" },
      { dimension: "query", operator: "contains", expression: "perfume" },
    ],
    rowLimit: 250,
  }));
  assert.deepEqual(a, b);
  assert.equal(a.property, "sc-domain:diamondshelf.us");
  assert.deepEqual(a.dimensions, ["query", "page"]);
  assert.equal(a.startRow, 0);
  assert.match(a.pageFingerprint, /^[0-9a-f]{64}$/);
});

test("property, date, row, page, timeout, dimension and filter bounds fail closed", () => {
  const values = fixture();
  assert.throws(() => normalizeGscSearchAnalyticsBinding(binding(values, { property: "https://diamondshelf.us/" })), /unsupported_gsc_property_type/);
  assert.throws(() => normalizeGscSearchAnalyticsBinding(binding(values, { startDate: "2026-08-01", endDate: "2026-09-13" })), /gsc_date_range_exceeds_bound/);
  assert.throws(() => normalizeGscSearchAnalyticsBinding(binding(values, { rowLimit: 5001 })), /invalid_gsc_row_limit/);
  assert.throws(() => normalizeGscSearchAnalyticsBinding(binding(values, { dimensions: ["query"], maxPages: 3 })), /invalid_gsc_max_pages/);
  assert.throws(() => normalizeGscSearchAnalyticsBinding(binding(values, { timeoutMs: 10001 })), /invalid_gsc_timeout_ms/);
  assert.throws(() => normalizeGscSearchAnalyticsBinding(binding(values, { dimensions: ["country" as "query"] })), /unsupported_gsc_dimension/);
  assert.throws(() => normalizeGscSearchAnalyticsBinding(binding(values, {
    filters: [{ dimension: "query", operator: "regex" as "contains", expression: "perfume" }],
  })), /unsupported_gsc_filter_operator/);
  assert.throws(() => normalizeGscSearchAnalyticsBinding(binding(values, { dimensions: [], maxPages: 2 })), /gsc_aggregate_query_forbids_pagination/);
});

test("aggregate modeled evidence normalizes to bounded success metrics without retaining row text", async () => {
  const values = fixture();
  const fake = fakeTransport(() => ({
    rows: [{ clicks: 25, impressions: 200, ctr: 0.125, position: 4.5 }],
  }));
  const runner = readyRunner(values, fake.transport);
  const result = await runner.run({ packet: values.packet, source: values.source, request: values.request, observedAt: EXECUTION_AT }) as Record<string, unknown>;
  assert.equal(result.status, "success");
  assert.equal(result.completeness, 1);
  assert.deepEqual(result.metrics, [
    { key: "clicks", value: 25, unit: "count" },
    { key: "impressions", value: 200, unit: "count" },
    { key: "ctr", value: 0.125, unit: "ratio" },
    { key: "position", value: 4.5, unit: "position" },
  ]);
  assert.equal(JSON.stringify(result).includes("keys"), false);
  assert.equal(fake.calls.length, 1);
});

test("zero-row response maps to explicit empty semantics", async () => {
  const values = fixture();
  const fake = fakeTransport(() => ({ rows: [] }));
  const result = await readyRunner(values, fake.transport).run({
    packet: values.packet,
    source: values.source,
    request: values.request,
    observedAt: EXECUTION_AT,
  }) as Record<string, unknown>;
  assert.equal(result.status, "empty");
  assert.deepEqual(result.metrics, []);
  assert.equal(result.completeness, 1);
});

test("dimensional Search Analytics rows are deliberately partial and dimension strings are discarded", async () => {
  const values = fixture();
  const fake = fakeTransport(() => ({
    rows: [
      { keys: ["perfume"], clicks: 10, impressions: 100, ctr: 0.1, position: 5 },
      { keys: ["fragrance"], clicks: 5, impressions: 50, ctr: 0.1, position: 7 },
    ],
  }));
  const result = await readyRunner(values, fake.transport, { dimensions: ["query"], rowLimit: 100 }).run({
    packet: values.packet,
    source: values.source,
    request: values.request,
    observedAt: EXECUTION_AT,
  }) as Record<string, unknown>;
  assert.equal(result.status, "partial");
  assert.equal(result.completeness, 0.9);
  assert.deepEqual(result.diagnostics, ["gsc_top_rows_non_exhaustive"]);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("perfume"), false);
  assert.equal(serialized.includes("fragrance"), false);
});

test("page cap is bounded and represented as partial evidence rather than an autonomous retry loop", async () => {
  const values = fixture();
  const fake = fakeTransport(() => ({
    rows: [{ keys: ["perfume"], clicks: 1, impressions: 10, ctr: 0.1, position: 3 }],
  }));
  const result = await readyRunner(values, fake.transport, { dimensions: ["query"], rowLimit: 1, maxPages: 1 }).run({
    packet: values.packet,
    source: values.source,
    request: values.request,
    observedAt: EXECUTION_AT,
  }) as Record<string, unknown>;
  assert.equal(result.status, "partial");
  assert.equal(result.completeness, 0.75);
  assert.deepEqual(result.diagnostics, ["gsc_page_cap_reached", "gsc_top_rows_non_exhaustive"]);
  assert.equal(fake.calls.length, 1);
});

test("quota and rate failures map to sanitized Task 68 error results", async () => {
  const values = fixture();
  const quota = fakeTransport(() => { throw new GscSearchAnalyticsTransportError("quota_exceeded"); });
  const quotaResult = await readyRunner(values, quota.transport).run({
    packet: values.packet,
    source: values.source,
    request: values.request,
    observedAt: EXECUTION_AT,
  }) as Record<string, unknown>;
  assert.equal(quotaResult.status, "error");
  assert.equal(quotaResult.errorCode, "gsc_quota_exceeded");
  assert.equal(quotaResult.completeness, 0);

  const rate = fakeTransport(() => { throw new GscSearchAnalyticsTransportError("rate_limited"); });
  const rateResult = await readyRunner(values, rate.transport).run({
    packet: values.packet,
    source: values.source,
    request: values.request,
    observedAt: EXECUTION_AT,
  }) as Record<string, unknown>;
  assert.equal(rateResult.errorCode, "gsc_rate_limited");
});

test("unknown modeled response fields are rejected and never cross the Task 68 boundary", async () => {
  const values = fixture();
  const fake = fakeTransport(() => ({ rows: [], rawPayload: { token: "must-not-pass" } }));
  const result = await readyRunner(values, fake.transport).run({
    packet: values.packet,
    source: values.source,
    request: values.request,
    observedAt: EXECUTION_AT,
  }) as Record<string, unknown>;
  assert.equal(result.status, "error");
  assert.equal(result.errorCode, "gsc_invalid_modeled_response");
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("must-not-pass"), false);
  assert.equal(serialized.includes("rawPayload"), false);
});

test("non-GSC or mismatched lineage cannot become Task 70 runner-ready", () => {
  const values = fixture();
  const otherSource = normalizeSignalSourceDescriptor({
    key: "other-first-party-source",
    name: "Other First Party Source",
    sourceClass: "first_party",
    signalTypes: ["keyword"],
    marketFingerprints: [values.market.fingerprint],
    categoryFingerprints: [values.category.fingerprint],
    trustClass: "first_party_authoritative",
    quality: 0.9,
    provenanceComplete: true,
    freshness: { freshForMinutes: 60, staleAfterMinutes: 180, criticalAfterMinutes: 720, volatility: "high" },
    collectionMode: "provider_api",
    manuallyReviewed: true,
  });
  const fake = fakeTransport(() => ({ rows: [] }));
  const runner = readyRunner(values, fake.transport);
  const capability = runner.capability({ source: otherSource, request: values.request });
  assert.equal(capability.configured, false);
  assert.equal(capability.credentialReady, false);
  assert.equal(capability.networkReady, false);
  assert.equal(fake.calls.length, 0);
});

test("Task 70 remains the replay-lock authority and Task 71 performs zero observation/evidence persistence", async () => {
  const values = fixture();
  const fake = fakeTransport(() => ({
    rows: [{ clicks: 12, impressions: 120, ctr: 0.1, position: 6 }],
  }));
  const runner = readyRunner(values, fake.transport);
  const memory = memoryStore();
  const overrides = {
    loadSiteContext: async () => ({ siteId: "11111111-1111-4111-8111-111111111111", domain: "diamondshelf.us" }),
    createStore: () => memory.store,
    runner,
    now: () => EXECUTION_AT,
  };
  const input = {
    packet: values.packet,
    source: values.source,
    plan: values.plan,
    request: values.request,
    authorization: values.packet.authorization,
    actorId: "admin@example.com",
    env: ACTIVE_ENV,
    now: EXECUTION_AT,
  };
  const first = await executeAuthorizedSignalCollectionJob(input, overrides);
  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.observation.status, "success");
    assert.deepEqual(first.persistence, { observationAttempted: false, evidenceAttempted: false });
    assert.equal(first.receipt.observationPersisted, false);
    assert.equal(first.receipt.evidencePersisted, false);
    assert.equal(first.receipt.providerWrites, false);
    assert.equal(first.receipt.publicSiteWrites, false);
  }
  assert.equal(fake.calls.length, 1);
  assert.equal(memory.getStatus(), "completed");

  const replay = await executeAuthorizedSignalCollectionJob(input, overrides);
  assert.equal(replay.ok, false);
  if (!replay.ok) {
    assert.equal(replay.reason, "signal_collection_authorization_already_consumed");
    assert.equal(replay.consumed, true);
  }
  assert.equal(fake.calls.length, 1);
  assert.equal(memory.calls.reserve, 2);
});
