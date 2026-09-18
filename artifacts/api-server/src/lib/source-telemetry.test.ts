import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  P5_8_SOURCE_TELEMETRY_VERSION,
  buildSourceTelemetryReport,
  sourceTelemetryCapability,
  type SourceRateLimitSnapshotInput,
  type SourceTelemetryEventInput,
  type SourceTelemetryStreamBindingInput,
} from "./source-telemetry.js";
import { normalizeSignalSourceDescriptor } from "./signal-source-registry.js";

function source(
  key: string,
  signalTypes: Array<"serp" | "keyword" | "trend" | "backlink" | "competitor">,
  quality = 0.9,
) {
  return normalizeSignalSourceDescriptor({
    key,
    name: key,
    sourceClass: "external",
    signalTypes,
    allowAnyMarket: true,
    allowAnyCategory: true,
    trustClass: "reviewed_external",
    quality,
    provenanceComplete: true,
    freshness: {
      freshForMinutes: 60,
      staleAfterMinutes: 120,
      criticalAfterMinutes: 240,
      volatility: "high",
    },
    collectionMode: "manual_import",
    manuallyReviewed: true,
  });
}

const REFERENCE = "2026-09-19T00:00:00.000Z";

test("P5.8 builds complete supplied quality/cost/rate telemetry without a proprietary score", () => {
  const dfs = source("synthetic-dataforseo-serp", ["serp"], 0.9);
  const binding: SourceTelemetryStreamBindingInput = {
    sourceFingerprint: dfs.fingerprint,
    signalType: "serp",
    providerKey: "dataforseo",
  };
  const events: SourceTelemetryEventInput[] = [
    {
      eventId: "dfs-1",
      sourceFingerprint: dfs.fingerprint,
      signalType: "serp",
      observedAt: "2026-09-18T20:00:00.000Z",
      status: "success",
      completeness: 1,
      cost: { amount: 0.001, currency: "USD", billingUnits: 1, billingUnit: "request" },
    },
    {
      eventId: "dfs-2",
      sourceFingerprint: dfs.fingerprint,
      signalType: "serp",
      observedAt: "2026-09-18T20:10:00.000Z",
      status: "partial",
      completeness: 0.5,
      cost: { amount: 0.001, currency: "USD", billingUnits: 1, billingUnit: "request" },
    },
    {
      eventId: "dfs-3",
      sourceFingerprint: dfs.fingerprint,
      signalType: "serp",
      observedAt: "2026-09-18T20:20:00.000Z",
      status: "empty",
      completeness: 1,
      cost: { amount: 0, currency: "USD", billingUnits: 1, billingUnit: "request" },
    },
    {
      eventId: "dfs-4",
      sourceFingerprint: dfs.fingerprint,
      signalType: "serp",
      observedAt: "2026-09-18T20:30:00.000Z",
      status: "error",
      completeness: 0,
      cost: { amount: 0.001, currency: "USD", billingUnits: 1, billingUnit: "request" },
    },
  ];
  const rateLimitSnapshots: SourceRateLimitSnapshotInput[] = [
    {
      snapshotId: "dfs-rate-1",
      sourceFingerprint: dfs.fingerprint,
      signalType: "serp",
      capturedAt: "2026-09-18T20:31:00.000Z",
      scope: "synthetic account",
      limit: 100,
      remaining: 10,
      windowSeconds: 60,
      resetAt: "2026-09-18T20:32:00.000Z",
    },
  ];

  const report = buildSourceTelemetryReport({
    sources: [dfs],
    bindings: [binding],
    events,
    rateLimitSnapshots,
    referenceTime: REFERENCE,
  });

  assert.equal(report.version, P5_8_SOURCE_TELEMETRY_VERSION);
  assert.equal(report.streamCount, 1);
  const stream = report.streams[0]!;
  assert.equal(stream.provider?.providerKey, "dataforseo");
  assert.equal(stream.provider?.reviewState, "fresh");
  assert.equal(stream.quality.eventCount, 4);
  assert.equal(stream.quality.successCount, 1);
  assert.equal(stream.quality.partialCount, 1);
  assert.equal(stream.quality.emptyCount, 1);
  assert.equal(stream.quality.errorCount, 1);
  assert.equal(stream.quality.successRate, 0.25);
  assert.equal(stream.quality.usableRate, 0.5);
  assert.equal(stream.quality.errorRate, 0.25);
  assert.equal(stream.quality.meanCompleteness, 0.625);
  assert.equal(stream.quality.meanConfidence, 0.55125);
  assert.equal(stream.quality.positiveEvidenceRate, 0.5);
  assert.equal(stream.quality.configuredSourceQuality, 0.9);
  assert.equal(stream.cost.recordedEventCount, 4);
  assert.equal(stream.cost.coverageRatio, 1);
  assert.equal(stream.cost.totalAmount, 0.003);
  assert.equal(stream.cost.currency, "USD");
  assert.equal(stream.cost.totalBillingUnits, 4);
  assert.equal(stream.cost.billingUnit, "request");
  assert.equal(stream.cost.costPerUsableObservation, 0.0015);
  assert.equal(stream.rateLimit.utilization, 0.9);
  assert.equal(stream.rateLimit.state, "constrained");
  assert.deepEqual(stream.diagnostics, []);
  assert.equal("score" in stream.quality, false);
});

test("zero supplied cost remains distinct from null cost and partial coverage is explicit", () => {
  const src = source("synthetic-serpapi", ["serp"], 0.8);
  const report = buildSourceTelemetryReport({
    sources: [src],
    bindings: [{ sourceFingerprint: src.fingerprint, signalType: "serp", providerKey: "serpapi" }],
    events: [
      {
        eventId: "zero-cost",
        sourceFingerprint: src.fingerprint,
        signalType: "serp",
        observedAt: "2026-09-18T12:00:00.000Z",
        status: "success",
        completeness: 1,
        cost: { amount: 0, currency: "USD", billingUnits: null, billingUnit: null },
      },
      {
        eventId: "unknown-cost",
        sourceFingerprint: src.fingerprint,
        signalType: "serp",
        observedAt: "2026-09-18T12:01:00.000Z",
        status: "success",
        completeness: 1,
        cost: null,
      },
    ],
    referenceTime: REFERENCE,
  });

  const stream = report.streams[0]!;
  assert.equal(stream.cost.recordedEventCount, 1);
  assert.equal(stream.cost.coverageRatio, 0.5);
  assert.equal(stream.cost.totalAmount, 0);
  assert.equal(stream.cost.currency, "USD");
  assert.equal(stream.cost.costPerUsableObservation, null);
  assert.ok(stream.diagnostics.includes("cost_partial_coverage"));
  assert.ok(stream.diagnostics.includes("rate_limit_unavailable"));
});

test("rate-limit states are transparent and deterministic", () => {
  const src = source("synthetic-rate-source", ["serp", "keyword", "trend", "backlink", "competitor"]);
  const signalTypes = ["serp", "keyword", "trend", "backlink", "competitor"] as const;
  const bindings = signalTypes.map((signalType) => ({
    sourceFingerprint: src.fingerprint,
    signalType,
    providerKey: null,
  }));
  const capacities = [
    ["serp", 100, 75, "available"],
    ["keyword", 100, 50, "elevated"],
    ["trend", 100, 10, "constrained"],
    ["backlink", 100, 0, "exhausted"],
  ] as const;
  const rateLimitSnapshots: SourceRateLimitSnapshotInput[] = capacities.map(
    ([signalType, limit, remaining], index) => ({
      snapshotId: `rate-${index}`,
      sourceFingerprint: src.fingerprint,
      signalType,
      capturedAt: "2026-09-18T10:00:00.000Z",
      scope: "synthetic scope",
      limit,
      remaining,
      windowSeconds: 60,
      resetAt: "2026-09-18T10:01:00.000Z",
    }),
  );
  rateLimitSnapshots.push({
    snapshotId: "rate-unavailable",
    sourceFingerprint: src.fingerprint,
    signalType: "competitor",
    capturedAt: "2026-09-18T10:00:00.000Z",
    scope: "synthetic scope",
    limit: null,
    remaining: null,
    windowSeconds: null,
    resetAt: null,
  });

  const report = buildSourceTelemetryReport({
    sources: [src],
    bindings,
    rateLimitSnapshots,
    referenceTime: REFERENCE,
  });

  const bySignal = new Map(report.streams.map((stream) => [stream.signalType, stream.rateLimit.state]));
  assert.equal(bySignal.get("serp"), "available");
  assert.equal(bySignal.get("keyword"), "elevated");
  assert.equal(bySignal.get("trend"), "constrained");
  assert.equal(bySignal.get("backlink"), "exhausted");
  assert.equal(bySignal.get("competitor"), "unavailable");
});

test("latest rate snapshot wins by capturedAt without reordering Task 67", () => {
  const src = source("synthetic-latest-rate", ["serp"]);
  const report = buildSourceTelemetryReport({
    sources: [src],
    bindings: [{ sourceFingerprint: src.fingerprint, signalType: "serp", providerKey: null }],
    rateLimitSnapshots: [
      {
        snapshotId: "older",
        sourceFingerprint: src.fingerprint,
        signalType: "serp",
        capturedAt: "2026-09-18T10:00:00.000Z",
        scope: "synthetic",
        limit: 100,
        remaining: 5,
        windowSeconds: 60,
        resetAt: "2026-09-18T10:01:00.000Z",
      },
      {
        snapshotId: "newer",
        sourceFingerprint: src.fingerprint,
        signalType: "serp",
        capturedAt: "2026-09-18T11:00:00.000Z",
        scope: "synthetic",
        limit: 100,
        remaining: 90,
        windowSeconds: 60,
        resetAt: "2026-09-18T11:01:00.000Z",
      },
    ],
    referenceTime: REFERENCE,
  });
  assert.equal(report.streams[0]!.rateLimit.remaining, 90);
  assert.equal(report.streams[0]!.rateLimit.state, "available");
  assert.equal(report.safety.refreshPlanReorderingEnabled, false);
  assert.equal(report.safety.rateLimitEnforcementEnabled, false);
});

test("provider review freshness is descriptive and becomes stale at a future reference time", () => {
  const src = source("synthetic-stale-review", ["serp"]);
  const report = buildSourceTelemetryReport({
    sources: [src],
    bindings: [{ sourceFingerprint: src.fingerprint, signalType: "serp", providerKey: "dataforseo" }],
    referenceTime: "2026-12-20T00:00:00.000Z",
  });
  assert.equal(report.providerReviewState, "stale");
  assert.equal(report.streams[0]!.provider?.reviewState, "stale");
  assert.ok(report.streams[0]!.diagnostics.includes("provider_review_stale"));
});

test("unbound source and no-event stream remain explicit rather than fabricated", () => {
  const src = source("synthetic-manual-import", ["trend"], 0.7);
  const report = buildSourceTelemetryReport({
    sources: [src],
    bindings: [{ sourceFingerprint: src.fingerprint, signalType: "trend", providerKey: null }],
    referenceTime: REFERENCE,
  });
  const stream = report.streams[0]!;
  assert.equal(stream.provider, null);
  assert.equal(stream.quality.eventCount, 0);
  assert.equal(stream.quality.successRate, null);
  assert.equal(stream.quality.meanCompleteness, null);
  assert.equal(stream.cost.totalAmount, null);
  assert.equal(stream.rateLimit.state, "unavailable");
  assert.deepEqual(stream.diagnostics, ["cost_unavailable", "no_events", "rate_limit_unavailable"]);
});

test("report fingerprint is invariant to irrelevant input ordering", () => {
  const a = source("synthetic-a", ["serp"], 0.8);
  const b = source("synthetic-b", ["trend"], 0.75);
  const bindings: SourceTelemetryStreamBindingInput[] = [
    { sourceFingerprint: a.fingerprint, signalType: "serp", providerKey: "dataforseo" },
    { sourceFingerprint: b.fingerprint, signalType: "trend", providerKey: null },
  ];
  const events: SourceTelemetryEventInput[] = [
    {
      eventId: "a-event",
      sourceFingerprint: a.fingerprint,
      signalType: "serp",
      observedAt: "2026-09-18T10:00:00.000Z",
      status: "success",
      completeness: 1,
      cost: { amount: 0.001, currency: "USD", billingUnits: null, billingUnit: null },
    },
    {
      eventId: "b-event",
      sourceFingerprint: b.fingerprint,
      signalType: "trend",
      observedAt: "2026-09-18T11:00:00.000Z",
      status: "empty",
      completeness: 1,
      cost: null,
    },
  ];

  const first = buildSourceTelemetryReport({
    sources: [a, b],
    bindings,
    events,
    referenceTime: REFERENCE,
  });
  const second = buildSourceTelemetryReport({
    sources: [b, a],
    bindings: [...bindings].reverse(),
    events: [...events].reverse(),
    referenceTime: REFERENCE,
  });

  assert.equal(first.reportFingerprint, second.reportFingerprint);
  assert.equal(first.reportId, second.reportId);
  assert.deepEqual(
    first.streams.map((stream) => stream.streamFingerprint),
    second.streams.map((stream) => stream.streamFingerprint),
  );
});

test("contradictions fail closed: source identity, status completeness, currencies, bindings, and rate capacity", () => {
  const src = source("synthetic-fail-closed", ["serp"]);
  const badSource = { ...src, name: "tampered" };
  assert.throws(() => buildSourceTelemetryReport({
    sources: [badSource],
    bindings: [{ sourceFingerprint: src.fingerprint, signalType: "serp", providerKey: null }],
    referenceTime: REFERENCE,
  }), /source_descriptor_identity_mismatch/);

  assert.throws(() => buildSourceTelemetryReport({
    sources: [src],
    bindings: [{ sourceFingerprint: src.fingerprint, signalType: "serp", providerKey: null }],
    events: [{
      eventId: "bad-partial",
      sourceFingerprint: src.fingerprint,
      signalType: "serp",
      observedAt: "2026-09-18T10:00:00.000Z",
      status: "partial",
      completeness: 1,
      cost: null,
    }],
    referenceTime: REFERENCE,
  }), /invalid_completeness/);

  assert.throws(() => buildSourceTelemetryReport({
    sources: [src],
    bindings: [{ sourceFingerprint: src.fingerprint, signalType: "serp", providerKey: null }],
    events: [
      {
        eventId: "usd",
        sourceFingerprint: src.fingerprint,
        signalType: "serp",
        observedAt: "2026-09-18T10:00:00.000Z",
        status: "success",
        completeness: 1,
        cost: { amount: 1, currency: "USD", billingUnits: null, billingUnit: null },
      },
      {
        eventId: "eur",
        sourceFingerprint: src.fingerprint,
        signalType: "serp",
        observedAt: "2026-09-18T11:00:00.000Z",
        status: "success",
        completeness: 1,
        cost: { amount: 1, currency: "EUR", billingUnits: null, billingUnit: null },
      },
    ],
    referenceTime: REFERENCE,
  }), /mixed_cost_currency/);

  assert.throws(() => buildSourceTelemetryReport({
    sources: [src],
    bindings: [
      { sourceFingerprint: src.fingerprint, signalType: "serp", providerKey: null },
      { sourceFingerprint: src.fingerprint, signalType: "serp", providerKey: "dataforseo" },
    ],
    referenceTime: REFERENCE,
  }), /duplicate_telemetry_stream_binding/);

  assert.throws(() => buildSourceTelemetryReport({
    sources: [src],
    bindings: [{ sourceFingerprint: src.fingerprint, signalType: "serp", providerKey: null }],
    rateLimitSnapshots: [{
      snapshotId: "incomplete",
      sourceFingerprint: src.fingerprint,
      signalType: "serp",
      capturedAt: "2026-09-18T10:00:00.000Z",
      scope: "synthetic",
      limit: 100,
      remaining: null,
      windowSeconds: 60,
      resetAt: null,
    }],
    referenceTime: REFERENCE,
  }), /incomplete_rate_limit_capacity/);
});

test("P5.8 capability keeps every runtime/persistence/publication gate closed", () => {
  const capability = sourceTelemetryCapability();
  assert.equal(capability.deterministicReportingOnly, true);
  assert.equal(capability.suppliedTelemetryOnly, true);
  assert.equal(capability.liveProviderReadsAuthorized, false);
  assert.equal(capability.providerCredentialUseAuthorized, false);
  assert.equal(capability.sourceRegistryAdmissionAuthorized, false);
  assert.equal(capability.refreshPlanReorderingEnabled, false);
  assert.equal(capability.rateLimitEnforcementEnabled, false);
  assert.equal(capability.task64ExecutionAuthorized, false);
  assert.equal(capability.task70ExecutionAuthorized, false);
  assert.equal(capability.observationPersistenceAuthorized, false);
  assert.equal(capability.evidencePersistenceAuthorized, false);
  assert.equal(capability.databaseReadsAuthorized, false);
  assert.equal(capability.databaseWritesAuthorized, false);
  assert.equal(capability.schemaMutationAuthorized, false);
  assert.equal(capability.schedulerEnabled, false);
  assert.equal(capability.autonomousWorkerEnabled, false);
  assert.equal(capability.retryLoopEnabled, false);
  assert.equal(capability.providerWrites, false);
  assert.equal(capability.publicSiteWrites, false);
  assert.equal(capability.publicationAuthorized, false);
});

test("P5.8 source contains no network, environment, database, execution, persistence or scheduler primitive", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourceText = readFileSync(join(here, "source-telemetry.ts"), "utf8");
  assert.doesNotMatch(sourceText, /\bfetch\s*\(/);
  assert.doesNotMatch(sourceText, /XMLHttpRequest|WebSocket|EventSource/);
  assert.doesNotMatch(sourceText, /process\.env|DATABASE_URL|postgres|drizzle/);
  assert.doesNotMatch(sourceText, /executeCompetitorPilot|executeAuthorizedSignalCollectionJob/);
  assert.doesNotMatch(sourceText, /setInterval|setTimeout|worker_threads|child_process/);
  assert.doesNotMatch(sourceText, /INSERT\s+INTO|UPDATE\s+\w+|DELETE\s+FROM/i);
});
