import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReadQueueProjection,
  evaluateReadSchedule,
  normalizeReadScheduleDefinition,
  type ReadWorkIntent,
} from "./read-scheduler-queue.js";
import {
  buildFailureControlAttemptRecord,
  type FailureControlArtifactInput,
  type FailureControlPolicy,
} from "./failure-retry-dead-letter.js";
import {
  buildWorkerInFlightObservation,
  normalizeWorkerControlState,
  projectWorkerControlObservability,
} from "./worker-control-observability.js";
import {
  P11_3_OBSERVABILITY_VERSION,
  buildObservabilityReport,
  normalizeObservabilityAlertPolicy,
  observabilityCapability,
  type ObservabilityAlertPolicy,
  type ObservabilityEventInput,
} from "./observability-foundation.js";

const START = "2026-09-21T09:00:00.000Z";
const REFERENCE = "2026-09-21T09:20:00.000Z";
const FAILURE_POLICY: FailureControlPolicy = {
  maxAttempts: 3,
  baseBackoffMinutes: 2,
  backoffMultiplier: 2,
  maxBackoffMinutes: 10,
};

const ALERT_POLICY: ObservabilityAlertPolicy = {
  minimumMetricEvents: 2,
  metricFailureRateWarning: 0.2,
  metricFailureRateCritical: 0.75,
  missedScheduleWarningCount: 1,
  missedScheduleCriticalCount: 2,
  staleHeartbeatWarningCount: 1,
  staleHeartbeatCriticalCount: 2,
  deadLetterWarningCount: 1,
  deadLetterCriticalCount: 2,
  unreconciledKillCriticalCount: 1,
};

function readIntent(key: string): ReadWorkIntent {
  const schedule = normalizeReadScheduleDefinition({
    key,
    workClass: "signal_refresh",
    scopeFingerprint: "1".repeat(64),
    upstreamLineageFingerprint: "2".repeat(64),
    startAt: START,
    cadenceMinutes: 60,
    dueWindowMinutes: 15,
  });
  const evaluation = evaluateReadSchedule({
    schedule,
    now: "2026-09-21T09:01:00.000Z",
  });
  assert.equal(evaluation.status, "due");
  assert.ok(evaluation.intent);
  return evaluation.intent!;
}

function artifact(key: string): FailureControlArtifactInput {
  return {
    kind: "p9_1_read_work_intent",
    intent: readIntent(key),
  };
}

function schedulerEvidence() {
  const schedule = normalizeReadScheduleDefinition({
    key: "p11-3-scheduler",
    workClass: "signal_refresh",
    scopeFingerprint: "3".repeat(64),
    upstreamLineageFingerprint: "4".repeat(64),
    startAt: START,
    cadenceMinutes: 60,
    dueWindowMinutes: 15,
  });
  const input = {
    schedules: [{ schedule }],
    now: REFERENCE,
  };
  return {
    input,
    projection: buildReadQueueProjection(input),
  };
}

function workerEvidence() {
  const inFlightArtifact = artifact("p11-3-in-flight");
  const deadArtifact = artifact("p11-3-dead");
  const failed = buildFailureControlAttemptRecord({
    artifact: deadArtifact,
    attemptNumber: 1,
    attemptedAt: "2026-09-21T09:02:00.000Z",
    outcome: "failed",
    failureCode: "normalization_failed",
  });
  const inFlight = buildWorkerInFlightObservation({
    artifact: inFlightArtifact,
    attemptNumber: 1,
    claimedAt: "2026-09-21T09:02:00.000Z",
    executionStartedAt: "2026-09-21T09:02:30.000Z",
    lastHeartbeatAt: "2026-09-21T09:03:00.000Z",
    executionEvidence: "execution_started",
  });
  const input = {
    control: normalizeWorkerControlState({
      mode: "running" as const,
      effectiveAt: START,
      reason: "p11_3_observability",
    }),
    items: [
      {
        artifact: inFlightArtifact,
        failurePolicy: FAILURE_POLICY,
        inFlight,
      },
      {
        artifact: deadArtifact,
        attempts: [failed],
        failurePolicy: FAILURE_POLICY,
      },
    ],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-21T09:10:00.000Z",
  };
  return {
    input,
    projection: projectWorkerControlObservability(input),
  };
}

function events(): ObservabilityEventInput[] {
  const trace = "a".repeat(32);
  const secondTrace = "b".repeat(32);
  return [
    {
      eventId: "evt-http-root",
      component: "api",
      operation: "request",
      kind: "http_request",
      outcome: "success",
      severity: "info",
      observedAt: "2026-09-21T09:11:00.000Z",
      durationMs: 10,
      correlationId: "corr-1",
      traceId: trace,
      spanId: "1".repeat(16),
      parentSpanId: null,
      attributes: { route: "/api/test", statusCode: 200 },
    },
    {
      eventId: "evt-http-child",
      component: "api",
      operation: "request",
      kind: "http_request",
      outcome: "failure",
      severity: "error",
      observedAt: "2026-09-21T09:12:00.000Z",
      durationMs: 20,
      correlationId: "corr-1",
      traceId: trace,
      spanId: "2".repeat(16),
      parentSpanId: "1".repeat(16),
      attributes: { route: "/api/test", statusCode: 500 },
    },
    {
      eventId: "evt-http-child-2",
      component: "api",
      operation: "request",
      kind: "http_request",
      outcome: "success",
      severity: "info",
      observedAt: "2026-09-21T09:13:00.000Z",
      durationMs: 30,
      correlationId: "corr-1",
      traceId: trace,
      spanId: "3".repeat(16),
      parentSpanId: "2".repeat(16),
      attributes: { route: "/api/test", statusCode: 204 },
    },
    {
      eventId: "evt-job",
      component: "scheduler",
      operation: "review",
      kind: "job",
      outcome: "blocked",
      severity: "warn",
      observedAt: "2026-09-21T09:14:00.000Z",
      durationMs: null,
      correlationId: "corr-1",
      traceId: secondTrace,
      spanId: "4".repeat(16),
      parentSpanId: null,
      attributes: { mode: "review_only" },
    },
  ];
}

function build(inputEvents = events()) {
  return buildObservabilityReport({
    referenceTime: REFERENCE,
    events: inputEvents,
    scheduler: schedulerEvidence(),
    worker: workerEvidence(),
    alertPolicy: ALERT_POLICY,
  });
}

test("P11.3 builds deterministic structured logs, metrics, trace/correlation and job health independent of input order", () => {
  const first = build();
  const replay = build([...events()].reverse());

  assert.equal(first.version, P11_3_OBSERVABILITY_VERSION);
  assert.equal(first.reportFingerprint, replay.reportFingerprint);
  assert.deepEqual(first, replay);
  assert.equal(first.counts.events, 4);
  assert.equal(first.counts.logs, 4);
  assert.equal(first.counts.metrics, 2);
  assert.equal(first.counts.traces, 2);
  assert.equal(first.counts.correlations, 1);

  const apiMetric = first.metrics.find((metric) => metric.metricKey === "api:request:http_request");
  assert.ok(apiMetric);
  assert.equal(apiMetric!.eventCount, 3);
  assert.equal(apiMetric!.failureCount, 1);
  assert.equal(apiMetric!.failureRate, 0.333333);
  assert.equal(apiMetric!.meanDurationMs, 20);
  assert.equal(apiMetric!.p50DurationMs, 20);
  assert.equal(apiMetric!.p95DurationMs, 30);

  assert.equal(first.jobHealth.scheduler.counts.missed, 1);
  assert.equal(first.jobHealth.worker.health, "degraded");
  assert.equal(first.jobHealth.worker.counts.staleHeartbeats, 1);
  assert.equal(first.jobHealth.worker.counts.deadLetterReview, 1);

  assert.ok(first.alerts.some((alert) => alert.type === "metric_failure_rate" && alert.severity === "warning"));
  assert.ok(first.alerts.some((alert) => alert.type === "missed_schedule" && alert.severity === "warning"));
  assert.ok(first.alerts.some((alert) => alert.type === "stale_heartbeat" && alert.severity === "warning"));
  assert.ok(first.alerts.some((alert) => alert.type === "dead_letter_review" && alert.severity === "warning"));
  assert.ok(first.alerts.every((alert) =>
    alert.deliveryAuthorized === false
    && alert.incidentCreationAuthorized === false
  ));
});

test("exact event replay dedupes while conflicting replay fails closed", () => {
  const base = events();
  const exactReplay = build([...base, { ...base[0]!, attributes: { ...base[0]!.attributes } }]);
  assert.equal(exactReplay.counts.events, 4);

  const conflict = [...base, { ...base[0]!, outcome: "failure" as const }];
  assert.throws(() => build(conflict), /conflicting_event_replay/);
});

test("secret-bearing or unbounded structured-log attributes fail closed", () => {
  const base = events();
  const secret = base.map((event) => ({ ...event, attributes: { ...event.attributes } }));
  secret[0]!.attributes = { access_token: "do-not-log" };
  assert.throws(() => build(secret), /secret_attribute_forbidden/);

  const invalid = base.map((event) => ({ ...event, attributes: { ...event.attributes } }));
  invalid[0]!.attributes = { payload: "x".repeat(300) };
  assert.throws(() => build(invalid), /invalid_attribute_payload/);
});

test("trace parent integrity, duplicate spans and lineage cycles fail closed", () => {
  const missing = events();
  missing[1] = { ...missing[1]!, parentSpanId: "f".repeat(16) };
  assert.throws(() => build(missing), /trace_parent_missing/);

  const duplicate = events();
  duplicate[2] = {
    ...duplicate[2]!,
    spanId: duplicate[1]!.spanId,
    parentSpanId: duplicate[0]!.spanId,
  };
  assert.throws(() => build(duplicate), /duplicate_trace_span/);

  const cycle = events();
  cycle[0] = { ...cycle[0]!, parentSpanId: cycle[1]!.spanId };
  cycle[1] = { ...cycle[1]!, parentSpanId: cycle[0]!.spanId };
  assert.throws(() => build(cycle), /trace_lineage_cycle/);
});

test("P9.1 scheduler and P9.6 worker supplied projections must exactly rebuild", () => {
  const scheduler = schedulerEvidence();
  const worker = workerEvidence();

  const badScheduler = structuredClone(scheduler.projection);
  badScheduler.counts.missed += 1;
  assert.throws(() => buildObservabilityReport({
    referenceTime: REFERENCE,
    events: events(),
    scheduler: { input: scheduler.input, projection: badScheduler },
    worker,
    alertPolicy: ALERT_POLICY,
  }), /scheduler_projection_mismatch/);

  const badWorker = structuredClone(worker.projection);
  badWorker.health = "healthy";
  assert.throws(() => buildObservabilityReport({
    referenceTime: REFERENCE,
    events: events(),
    scheduler,
    worker: { input: worker.input, projection: badWorker },
    alertPolicy: ALERT_POLICY,
  }), /worker_projection_mismatch/);
});

test("alert threshold ordering is explicit and deterministic", () => {
  assert.deepEqual(normalizeObservabilityAlertPolicy(ALERT_POLICY), ALERT_POLICY);
  assert.throws(() => normalizeObservabilityAlertPolicy({
    ...ALERT_POLICY,
    metricFailureRateWarning: 0.8,
    metricFailureRateCritical: 0.5,
  }), /metric_failure_threshold_order_invalid/);
  assert.throws(() => normalizeObservabilityAlertPolicy({
    ...ALERT_POLICY,
    missedScheduleWarningCount: 3,
    missedScheduleCriticalCount: 2,
  }), /missed_schedule_threshold_order_invalid/);
});

test("alert candidates do not appear below supplied thresholds", () => {
  const quietPolicy: ObservabilityAlertPolicy = {
    ...ALERT_POLICY,
    minimumMetricEvents: 10,
    missedScheduleWarningCount: 5,
    missedScheduleCriticalCount: 10,
    staleHeartbeatWarningCount: 5,
    staleHeartbeatCriticalCount: 10,
    deadLetterWarningCount: 5,
    deadLetterCriticalCount: 10,
    unreconciledKillCriticalCount: 5,
  };
  const report = buildObservabilityReport({
    referenceTime: REFERENCE,
    events: events(),
    scheduler: schedulerEvidence(),
    worker: workerEvidence(),
    alertPolicy: quietPolicy,
  });
  assert.equal(report.alerts.length, 0);
});

test("future supplied evidence is rejected rather than coerced into current health", () => {
  const future = events();
  future[0] = { ...future[0]!, observedAt: "2026-09-21T09:21:00.000Z" };
  assert.throws(() => build(future), /event_observed_at_in_future/);

  const scheduler = schedulerEvidence();
  const futureSchedulerInput = {
    ...scheduler.input,
    now: "2026-09-21T09:21:00.000Z",
  };
  assert.throws(() => buildObservabilityReport({
    referenceTime: REFERENCE,
    events: events(),
    scheduler: {
      input: futureSchedulerInput,
      projection: buildReadQueueProjection(futureSchedulerInput),
    },
    worker: workerEvidence(),
    alertPolicy: ALERT_POLICY,
  }), /scheduler_observation_in_future/);
});

test("P11.3 capability is observability-only with all live sinks and execution authority closed", () => {
  assert.deepEqual(observabilityCapability(), {
    version: P11_3_OBSERVABILITY_VERSION,
    deterministicProjectionOnly: true,
    offlineOnly: true,
    suppliedEvidenceOnly: true,
    structuredLogsDescriptiveOnly: true,
    metricsDescriptiveOnly: true,
    traceCorrelationDescriptiveOnly: true,
    jobHealthDescriptiveOnly: true,
    alertCandidatesOnly: true,
    wallClockAccess: false,
    telemetryExporterConfigured: false,
    telemetrySinkConfigured: false,
    productionTelemetryIngestionAuthorized: false,
    alertDeliveryAuthorized: false,
    incidentCreationAuthorized: false,
    pagerDutyAuthorized: false,
    slackAlertAuthorized: false,
    emailAlertAuthorized: false,
    webhookAlertAuthorized: false,
    schedulerActivated: false,
    workerActivated: false,
    retryDispatchAuthorized: false,
    productionDbReadAuthorized: false,
    productionDbWriteAuthorized: false,
    credentialUseAuthorized: false,
    providerNetworkReadAuthorized: false,
    providerWrites: false,
    publicSiteWrites: false,
    task51ExecutionAuthorized: false,
    task53ExecutionAuthorized: false,
    task54ExecutionAuthorized: false,
    p9_8ImplementationAuthorized: false,
    deploymentAuthorized: false,
    publicationAuthorized: false,
  });
});
