import { createHash } from "node:crypto";
import {
  buildReadQueueProjection,
} from "./read-scheduler-queue.js";
import {
  projectWorkerControlObservability,
} from "./worker-control-observability.js";

export const P11_3_OBSERVABILITY_VERSION = "p11.3-observability-v1" as const;

export const P11_3_OBSERVABILITY_BOUNDS = Object.freeze({
  maxEvents: 1000,
  maxAttributesPerEvent: 16,
  maxAttributeStringLength: 256,
  maxDurationMs: 86_400_000,
  maxIdentifierLength: 128,
});

export type ObservabilityEventKind =
  | "http_request"
  | "job"
  | "provider"
  | "control"
  | "system";

export type ObservabilityOutcome =
  | "success"
  | "partial"
  | "failure"
  | "blocked"
  | "skipped";

export type ObservabilitySeverity =
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "critical";

export type ObservabilityScalar = string | number | boolean | null;

export type ObservabilityEventInput = {
  eventId: string;
  component: string;
  operation: string;
  kind: ObservabilityEventKind;
  outcome: ObservabilityOutcome;
  severity: ObservabilitySeverity;
  observedAt: string;
  durationMs: number | null;
  correlationId: string;
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  attributes?: Record<string, ObservabilityScalar>;
};

export type NormalizedObservabilityEvent = {
  version: typeof P11_3_OBSERVABILITY_VERSION;
  eventId: string;
  eventFingerprint: string;
  component: string;
  operation: string;
  kind: ObservabilityEventKind;
  outcome: ObservabilityOutcome;
  severity: ObservabilitySeverity;
  observedAt: string;
  durationMs: number | null;
  correlationId: string;
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  attributes: Record<string, ObservabilityScalar>;
};

export type ObservabilityStructuredLog = {
  logId: string;
  logFingerprint: string;
  eventFingerprint: string;
  timestamp: string;
  severity: ObservabilitySeverity;
  component: string;
  operation: string;
  kind: ObservabilityEventKind;
  outcome: ObservabilityOutcome;
  correlationId: string;
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  durationMs: number | null;
  attributes: Record<string, ObservabilityScalar>;
};

export type ObservabilityMetricRollup = {
  metricKey: string;
  metricFingerprint: string;
  component: string;
  operation: string;
  kind: ObservabilityEventKind;
  eventCount: number;
  successCount: number;
  partialCount: number;
  failureCount: number;
  blockedCount: number;
  skippedCount: number;
  failureRate: number | null;
  durationCount: number;
  minDurationMs: number | null;
  maxDurationMs: number | null;
  meanDurationMs: number | null;
  p50DurationMs: number | null;
  p95DurationMs: number | null;
};

export type ObservabilityTraceSummary = {
  traceId: string;
  traceFingerprint: string;
  eventCount: number;
  rootSpanIds: string[];
  correlationIds: string[];
  failureCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
  spanIds: string[];
};

export type ObservabilityCorrelationSummary = {
  correlationId: string;
  correlationFingerprint: string;
  eventCount: number;
  traceIds: string[];
  failureCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
};

export type P113SchedulerEvidence = {
  input: Parameters<typeof buildReadQueueProjection>[0];
  projection: ReturnType<typeof buildReadQueueProjection>;
};

export type P113WorkerEvidence = {
  input: Parameters<typeof projectWorkerControlObservability>[0];
  projection: ReturnType<typeof projectWorkerControlObservability>;
};

export type ObservabilityJobHealth = {
  scheduler: {
    version: string;
    checkedAt: string;
    projectionFingerprint: string;
    counts: ReturnType<typeof buildReadQueueProjection>["counts"];
  };
  worker: {
    version: string;
    checkedAt: string;
    projectionFingerprint: string;
    effectiveMode: ReturnType<typeof projectWorkerControlObservability>["effectiveMode"];
    health: ReturnType<typeof projectWorkerControlObservability>["health"];
    counts: ReturnType<typeof projectWorkerControlObservability>["counts"];
  };
};

export type ObservabilityAlertPolicy = {
  minimumMetricEvents: number;
  metricFailureRateWarning: number;
  metricFailureRateCritical: number;
  missedScheduleWarningCount: number;
  missedScheduleCriticalCount: number;
  staleHeartbeatWarningCount: number;
  staleHeartbeatCriticalCount: number;
  deadLetterWarningCount: number;
  deadLetterCriticalCount: number;
  unreconciledKillCriticalCount: number;
};

export type ObservabilityAlertType =
  | "metric_failure_rate"
  | "missed_schedule"
  | "stale_heartbeat"
  | "dead_letter_review"
  | "unreconciled_kill"
  | "worker_blocked_recovery";

export type ObservabilityAlertCandidate = {
  alertId: string;
  alertFingerprint: string;
  lifecycle: "candidate_only";
  type: ObservabilityAlertType;
  severity: "warning" | "critical";
  sourceKey: string;
  observedValue: number | string;
  threshold: number | null;
  observedAt: string;
  deliveryAuthorized: false;
  incidentCreationAuthorized: false;
};

export type ObservabilityReport = {
  version: typeof P11_3_OBSERVABILITY_VERSION;
  reportId: string;
  reportFingerprint: string;
  referenceTime: string;
  events: NormalizedObservabilityEvent[];
  logs: ObservabilityStructuredLog[];
  metrics: ObservabilityMetricRollup[];
  traces: ObservabilityTraceSummary[];
  correlations: ObservabilityCorrelationSummary[];
  jobHealth: ObservabilityJobHealth;
  alertPolicy: ObservabilityAlertPolicy;
  alerts: ObservabilityAlertCandidate[];
  counts: {
    events: number;
    logs: number;
    metrics: number;
    traces: number;
    correlations: number;
    alerts: number;
  };
  safety: ReturnType<typeof observabilityCapability>;
};

const EVENT_KINDS = new Set<ObservabilityEventKind>([
  "http_request",
  "job",
  "provider",
  "control",
  "system",
]);
const OUTCOMES = new Set<ObservabilityOutcome>([
  "success",
  "partial",
  "failure",
  "blocked",
  "skipped",
]);
const SEVERITIES = new Set<ObservabilitySeverity>([
  "debug",
  "info",
  "warn",
  "error",
  "critical",
]);
const SAFE_IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;
const ATTRIBUTE_KEY = /^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/;
const TRACE_ID = /^[0-9a-f]{32}$/;
const SPAN_ID = /^[0-9a-f]{16}$/;
const SECRET_ATTRIBUTE = /(^|[._-])(authorization|cookie|set-cookie|password|passwd|secret|token|access-token|access_token|accesstoken|refresh-token|refresh_token|refreshtoken|api-key|api_key|apikey|client-secret|client_secret|clientsecret)($|[._-])/i;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key])).join(",") + "}";
}

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function normalizedIdentifier(value: unknown, field: string): string {
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > P11_3_OBSERVABILITY_BOUNDS.maxIdentifierLength
    || !SAFE_IDENTIFIER.test(value)
  ) throw new Error("invalid_" + field);
  return value;
}

function normalizedTimestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 64) {
    throw new Error("invalid_" + field);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error("invalid_" + field);
  return new Date(milliseconds).toISOString();
}

function integer(value: unknown, min: number, max: number, field: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error("invalid_" + field);
  }
  return value as number;
}

function ratio(value: number, total: number): number | null {
  return total === 0 ? null : Number((value / total).toFixed(6));
}

function round3(value: number): number {
  return Number(value.toFixed(3));
}

function normalizeDuration(value: unknown): number | null {
  if (value === null) return null;
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || value < 0
    || value > P11_3_OBSERVABILITY_BOUNDS.maxDurationMs
  ) throw new Error("invalid_duration_ms");
  return round3(value);
}

function normalizeAttributeValue(value: unknown, field: string): ObservabilityScalar {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("invalid_attribute_" + field);
    return value;
  }
  if (typeof value === "string") {
    if (value.length > P11_3_OBSERVABILITY_BOUNDS.maxAttributeStringLength) {
      throw new Error("invalid_attribute_" + field);
    }
    return value;
  }
  throw new Error("invalid_attribute_" + field);
}

function normalizeAttributes(
  input: Record<string, ObservabilityScalar> | undefined,
): Record<string, ObservabilityScalar> {
  const entries = Object.entries(input ?? {});
  if (entries.length > P11_3_OBSERVABILITY_BOUNDS.maxAttributesPerEvent) {
    throw new Error("too_many_observability_attributes");
  }
  const normalized: Record<string, ObservabilityScalar> = {};
  for (const [key, value] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    if (!ATTRIBUTE_KEY.test(key)) throw new Error("invalid_attribute_key");
    if (SECRET_ATTRIBUTE.test(key)) throw new Error("secret_attribute_forbidden");
    normalized[key] = normalizeAttributeValue(value, key);
  }
  return normalized;
}

function normalizeTraceId(value: unknown): string {
  if (typeof value !== "string" || !TRACE_ID.test(value)) throw new Error("invalid_trace_id");
  return value;
}

function normalizeSpanId(value: unknown, field: string): string {
  if (typeof value !== "string" || !SPAN_ID.test(value)) throw new Error("invalid_" + field);
  return value;
}

function normalizeEvent(
  input: ObservabilityEventInput,
  referenceTime: string,
): NormalizedObservabilityEvent {
  const eventId = normalizedIdentifier(input.eventId, "event_id");
  const component = normalizedIdentifier(input.component, "component");
  const operation = normalizedIdentifier(input.operation, "operation");
  if (!EVENT_KINDS.has(input.kind)) throw new Error("invalid_event_kind");
  if (!OUTCOMES.has(input.outcome)) throw new Error("invalid_event_outcome");
  if (!SEVERITIES.has(input.severity)) throw new Error("invalid_event_severity");
  const observedAt = normalizedTimestamp(input.observedAt, "observed_at");
  if (Date.parse(observedAt) > Date.parse(referenceTime)) {
    throw new Error("event_observed_at_in_future");
  }
  const correlationId = normalizedIdentifier(input.correlationId, "correlation_id");
  const traceId = normalizeTraceId(input.traceId);
  const spanId = normalizeSpanId(input.spanId, "span_id");
  const parentSpanId = input.parentSpanId === null
    ? null
    : normalizeSpanId(input.parentSpanId, "parent_span_id");
  if (parentSpanId === spanId) throw new Error("span_cannot_parent_itself");
  const durationMs = normalizeDuration(input.durationMs);
  const attributes = normalizeAttributes(input.attributes);
  const identity = {
    eventId,
    component,
    operation,
    kind: input.kind,
    outcome: input.outcome,
    severity: input.severity,
    observedAt,
    durationMs,
    correlationId,
    traceId,
    spanId,
    parentSpanId,
    attributes,
  };
  const eventFingerprint = hash({
    version: P11_3_OBSERVABILITY_VERSION,
    purpose: "observability_event",
    ...identity,
  });
  return {
    version: P11_3_OBSERVABILITY_VERSION,
    eventFingerprint,
    ...identity,
  };
}

function normalizeEvents(
  input: ObservabilityEventInput[],
  referenceTime: string,
): NormalizedObservabilityEvent[] {
  if (!Array.isArray(input) || input.length > P11_3_OBSERVABILITY_BOUNDS.maxEvents) {
    throw new Error("invalid_observability_event_count");
  }
  const byEventId = new Map<string, NormalizedObservabilityEvent>();
  for (const raw of input) {
    const event = normalizeEvent(raw, referenceTime);
    const existing = byEventId.get(event.eventId);
    if (!existing) {
      byEventId.set(event.eventId, event);
      continue;
    }
    if (existing.eventFingerprint !== event.eventFingerprint) {
      throw new Error("conflicting_event_replay");
    }
  }
  const events = [...byEventId.values()].sort((a, b) =>
    a.observedAt.localeCompare(b.observedAt)
    || a.eventFingerprint.localeCompare(b.eventFingerprint)
  );
  validateTraceLineage(events);
  return events;
}

function validateTraceLineage(events: NormalizedObservabilityEvent[]): void {
  const traces = new Map<string, Map<string, NormalizedObservabilityEvent>>();
  for (const event of events) {
    const spans = traces.get(event.traceId) ?? new Map<string, NormalizedObservabilityEvent>();
    if (spans.has(event.spanId)) throw new Error("duplicate_trace_span");
    spans.set(event.spanId, event);
    traces.set(event.traceId, spans);
  }

  for (const spans of traces.values()) {
    for (const event of spans.values()) {
      if (event.parentSpanId !== null && !spans.has(event.parentSpanId)) {
        throw new Error("trace_parent_missing");
      }
      const visited = new Set<string>();
      let current: NormalizedObservabilityEvent | undefined = event;
      while (current?.parentSpanId) {
        if (visited.has(current.spanId)) throw new Error("trace_lineage_cycle");
        visited.add(current.spanId);
        current = spans.get(current.parentSpanId);
      }
    }
  }
}

function structuredLogs(events: NormalizedObservabilityEvent[]): ObservabilityStructuredLog[] {
  return events.map((event) => {
    const identity = {
      eventFingerprint: event.eventFingerprint,
      timestamp: event.observedAt,
      severity: event.severity,
      component: event.component,
      operation: event.operation,
      kind: event.kind,
      outcome: event.outcome,
      correlationId: event.correlationId,
      traceId: event.traceId,
      spanId: event.spanId,
      parentSpanId: event.parentSpanId,
      durationMs: event.durationMs,
      attributes: event.attributes,
    };
    const logFingerprint = hash({
      version: P11_3_OBSERVABILITY_VERSION,
      purpose: "structured_log",
      ...identity,
    });
    return {
      logId: "obl-" + logFingerprint.slice(0, 24),
      logFingerprint,
      ...identity,
    };
  });
}

function percentile(sorted: number[], fraction: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.max(0, Math.ceil(fraction * sorted.length) - 1);
  return sorted[index] ?? null;
}

function metricRollups(events: NormalizedObservabilityEvent[]): ObservabilityMetricRollup[] {
  const groups = new Map<string, NormalizedObservabilityEvent[]>();
  for (const event of events) {
    const key = [event.component, event.operation, event.kind].join(":");
    const values = groups.get(key) ?? [];
    values.push(event);
    groups.set(key, values);
  }

  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([metricKey, values]) => {
    const durations = values
      .flatMap((event) => event.durationMs === null ? [] : [event.durationMs])
      .sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, value) => sum + value, 0);
    const identity = {
      metricKey,
      component: values[0]!.component,
      operation: values[0]!.operation,
      kind: values[0]!.kind,
      eventCount: values.length,
      successCount: values.filter((event) => event.outcome === "success").length,
      partialCount: values.filter((event) => event.outcome === "partial").length,
      failureCount: values.filter((event) => event.outcome === "failure").length,
      blockedCount: values.filter((event) => event.outcome === "blocked").length,
      skippedCount: values.filter((event) => event.outcome === "skipped").length,
      failureRate: ratio(
        values.filter((event) => event.outcome === "failure").length,
        values.length,
      ),
      durationCount: durations.length,
      minDurationMs: durations[0] ?? null,
      maxDurationMs: durations.at(-1) ?? null,
      meanDurationMs: durations.length === 0 ? null : round3(totalDuration / durations.length),
      p50DurationMs: percentile(durations, 0.5),
      p95DurationMs: percentile(durations, 0.95),
    };
    const metricFingerprint = hash({
      version: P11_3_OBSERVABILITY_VERSION,
      purpose: "metric_rollup",
      ...identity,
    });
    return { metricFingerprint, ...identity };
  });
}

function traceSummaries(events: NormalizedObservabilityEvent[]): ObservabilityTraceSummary[] {
  const groups = new Map<string, NormalizedObservabilityEvent[]>();
  for (const event of events) {
    const group = groups.get(event.traceId) ?? [];
    group.push(event);
    groups.set(event.traceId, group);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([traceId, values]) => {
    const ordered = [...values].sort((a, b) =>
      a.observedAt.localeCompare(b.observedAt)
      || a.spanId.localeCompare(b.spanId)
    );
    const identity = {
      traceId,
      eventCount: ordered.length,
      rootSpanIds: ordered.filter((event) => event.parentSpanId === null).map((event) => event.spanId).sort(),
      correlationIds: [...new Set(ordered.map((event) => event.correlationId))].sort(),
      failureCount: ordered.filter((event) => event.outcome === "failure").length,
      firstObservedAt: ordered[0]!.observedAt,
      lastObservedAt: ordered.at(-1)!.observedAt,
      spanIds: ordered.map((event) => event.spanId).sort(),
    };
    const traceFingerprint = hash({
      version: P11_3_OBSERVABILITY_VERSION,
      purpose: "trace_summary",
      ...identity,
    });
    return { traceFingerprint, ...identity };
  });
}

function correlationSummaries(
  events: NormalizedObservabilityEvent[],
): ObservabilityCorrelationSummary[] {
  const groups = new Map<string, NormalizedObservabilityEvent[]>();
  for (const event of events) {
    const group = groups.get(event.correlationId) ?? [];
    group.push(event);
    groups.set(event.correlationId, group);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([correlationId, values]) => {
    const ordered = [...values].sort((a, b) =>
      a.observedAt.localeCompare(b.observedAt)
      || a.eventFingerprint.localeCompare(b.eventFingerprint)
    );
    const identity = {
      correlationId,
      eventCount: ordered.length,
      traceIds: [...new Set(ordered.map((event) => event.traceId))].sort(),
      failureCount: ordered.filter((event) => event.outcome === "failure").length,
      firstObservedAt: ordered[0]!.observedAt,
      lastObservedAt: ordered.at(-1)!.observedAt,
    };
    const correlationFingerprint = hash({
      version: P11_3_OBSERVABILITY_VERSION,
      purpose: "correlation_summary",
      ...identity,
    });
    return { correlationFingerprint, ...identity };
  });
}

function exactProjection<T>(
  input: unknown,
  supplied: T,
  rebuild: (value: any) => T,
  label: string,
): T {
  const rebuilt = rebuild(input);
  if (stableJson(rebuilt) !== stableJson(supplied)) {
    throw new Error(label + "_projection_mismatch");
  }
  return rebuilt;
}

function projectJobHealth(input: {
  scheduler: P113SchedulerEvidence;
  worker: P113WorkerEvidence;
  referenceTime: string;
}): ObservabilityJobHealth {
  const scheduler = exactProjection(
    input.scheduler.input,
    input.scheduler.projection,
    buildReadQueueProjection,
    "scheduler",
  );
  const worker = exactProjection(
    input.worker.input,
    input.worker.projection,
    projectWorkerControlObservability,
    "worker",
  );
  if (Date.parse(scheduler.checkedAt) > Date.parse(input.referenceTime)) {
    throw new Error("scheduler_observation_in_future");
  }
  if (Date.parse(worker.checkedAt) > Date.parse(input.referenceTime)) {
    throw new Error("worker_observation_in_future");
  }
  return {
    scheduler: {
      version: scheduler.version,
      checkedAt: scheduler.checkedAt,
      projectionFingerprint: scheduler.projectionFingerprint,
      counts: scheduler.counts,
    },
    worker: {
      version: worker.version,
      checkedAt: worker.checkedAt,
      projectionFingerprint: worker.projectionFingerprint,
      effectiveMode: worker.effectiveMode,
      health: worker.health,
      counts: worker.counts,
    },
  };
}

function rateThreshold(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1) {
    throw new Error("invalid_" + field);
  }
  return Number(value.toFixed(6));
}

function countThreshold(value: unknown, field: string): number {
  return integer(value, 1, 1_000_000, field);
}

export function normalizeObservabilityAlertPolicy(
  input: ObservabilityAlertPolicy,
): ObservabilityAlertPolicy {
  const policy = {
    minimumMetricEvents: integer(input.minimumMetricEvents, 1, P11_3_OBSERVABILITY_BOUNDS.maxEvents, "minimum_metric_events"),
    metricFailureRateWarning: rateThreshold(input.metricFailureRateWarning, "metric_failure_rate_warning"),
    metricFailureRateCritical: rateThreshold(input.metricFailureRateCritical, "metric_failure_rate_critical"),
    missedScheduleWarningCount: countThreshold(input.missedScheduleWarningCount, "missed_schedule_warning_count"),
    missedScheduleCriticalCount: countThreshold(input.missedScheduleCriticalCount, "missed_schedule_critical_count"),
    staleHeartbeatWarningCount: countThreshold(input.staleHeartbeatWarningCount, "stale_heartbeat_warning_count"),
    staleHeartbeatCriticalCount: countThreshold(input.staleHeartbeatCriticalCount, "stale_heartbeat_critical_count"),
    deadLetterWarningCount: countThreshold(input.deadLetterWarningCount, "dead_letter_warning_count"),
    deadLetterCriticalCount: countThreshold(input.deadLetterCriticalCount, "dead_letter_critical_count"),
    unreconciledKillCriticalCount: countThreshold(input.unreconciledKillCriticalCount, "unreconciled_kill_critical_count"),
  };
  if (policy.metricFailureRateCritical < policy.metricFailureRateWarning) {
    throw new Error("metric_failure_threshold_order_invalid");
  }
  if (policy.missedScheduleCriticalCount < policy.missedScheduleWarningCount) {
    throw new Error("missed_schedule_threshold_order_invalid");
  }
  if (policy.staleHeartbeatCriticalCount < policy.staleHeartbeatWarningCount) {
    throw new Error("stale_heartbeat_threshold_order_invalid");
  }
  if (policy.deadLetterCriticalCount < policy.deadLetterWarningCount) {
    throw new Error("dead_letter_threshold_order_invalid");
  }
  return policy;
}

function alertCandidate(input: {
  type: ObservabilityAlertType;
  severity: "warning" | "critical";
  sourceKey: string;
  observedValue: number | string;
  threshold: number | null;
  observedAt: string;
}): ObservabilityAlertCandidate {
  const identity = {
    lifecycle: "candidate_only" as const,
    ...input,
    deliveryAuthorized: false as const,
    incidentCreationAuthorized: false as const,
  };
  const alertFingerprint = hash({
    version: P11_3_OBSERVABILITY_VERSION,
    purpose: "alert_candidate",
    ...identity,
  });
  return {
    alertId: "oba-" + alertFingerprint.slice(0, 24),
    alertFingerprint,
    ...identity,
  };
}

function thresholdSeverity(
  value: number,
  warning: number,
  critical: number,
): "warning" | "critical" | null {
  if (value >= critical) return "critical";
  if (value >= warning) return "warning";
  return null;
}

function alertCandidates(input: {
  referenceTime: string;
  metrics: ObservabilityMetricRollup[];
  jobHealth: ObservabilityJobHealth;
  policy: ObservabilityAlertPolicy;
}): ObservabilityAlertCandidate[] {
  const alerts: ObservabilityAlertCandidate[] = [];

  for (const metric of input.metrics) {
    if (
      metric.eventCount < input.policy.minimumMetricEvents
      || metric.failureRate === null
    ) continue;
    const severity = thresholdSeverity(
      metric.failureRate,
      input.policy.metricFailureRateWarning,
      input.policy.metricFailureRateCritical,
    );
    if (severity) {
      alerts.push(alertCandidate({
        type: "metric_failure_rate",
        severity,
        sourceKey: metric.metricKey,
        observedValue: metric.failureRate,
        threshold: severity === "critical"
          ? input.policy.metricFailureRateCritical
          : input.policy.metricFailureRateWarning,
        observedAt: input.referenceTime,
      }));
    }
  }

  const countAlerts: Array<{
    type: ObservabilityAlertType;
    sourceKey: string;
    value: number;
    warning: number | null;
    critical: number;
  }> = [
    {
      type: "missed_schedule",
      sourceKey: "scheduler.missed",
      value: input.jobHealth.scheduler.counts.missed,
      warning: input.policy.missedScheduleWarningCount,
      critical: input.policy.missedScheduleCriticalCount,
    },
    {
      type: "stale_heartbeat",
      sourceKey: "worker.staleHeartbeats",
      value: input.jobHealth.worker.counts.staleHeartbeats,
      warning: input.policy.staleHeartbeatWarningCount,
      critical: input.policy.staleHeartbeatCriticalCount,
    },
    {
      type: "dead_letter_review",
      sourceKey: "worker.deadLetterReview",
      value: input.jobHealth.worker.counts.deadLetterReview,
      warning: input.policy.deadLetterWarningCount,
      critical: input.policy.deadLetterCriticalCount,
    },
    {
      type: "unreconciled_kill",
      sourceKey: "worker.unreconciledKilled",
      value: input.jobHealth.worker.counts.unreconciledKilled,
      warning: null,
      critical: input.policy.unreconciledKillCriticalCount,
    },
  ];

  for (const candidate of countAlerts) {
    let severity: "warning" | "critical" | null = null;
    let threshold: number | null = null;
    if (candidate.value >= candidate.critical) {
      severity = "critical";
      threshold = candidate.critical;
    } else if (candidate.warning !== null && candidate.value >= candidate.warning) {
      severity = "warning";
      threshold = candidate.warning;
    }
    if (severity) {
      alerts.push(alertCandidate({
        type: candidate.type,
        severity,
        sourceKey: candidate.sourceKey,
        observedValue: candidate.value,
        threshold,
        observedAt: input.referenceTime,
      }));
    }
  }

  if (input.jobHealth.worker.health === "blocked_recovery") {
    alerts.push(alertCandidate({
      type: "worker_blocked_recovery",
      severity: "critical",
      sourceKey: "worker.health",
      observedValue: "blocked_recovery",
      threshold: null,
      observedAt: input.referenceTime,
    }));
  }

  return alerts.sort((a, b) =>
    a.severity.localeCompare(b.severity)
    || a.type.localeCompare(b.type)
    || a.sourceKey.localeCompare(b.sourceKey)
    || a.alertFingerprint.localeCompare(b.alertFingerprint)
  );
}

export function buildObservabilityReport(input: {
  referenceTime: string;
  events: ObservabilityEventInput[];
  scheduler: P113SchedulerEvidence;
  worker: P113WorkerEvidence;
  alertPolicy: ObservabilityAlertPolicy;
}): ObservabilityReport {
  const referenceTime = normalizedTimestamp(input.referenceTime, "reference_time");
  const events = normalizeEvents(input.events, referenceTime);
  const logs = structuredLogs(events);
  const metrics = metricRollups(events);
  const traces = traceSummaries(events);
  const correlations = correlationSummaries(events);
  const jobHealth = projectJobHealth({
    scheduler: input.scheduler,
    worker: input.worker,
    referenceTime,
  });
  const alertPolicy = normalizeObservabilityAlertPolicy(input.alertPolicy);
  const alerts = alertCandidates({
    referenceTime,
    metrics,
    jobHealth,
    policy: alertPolicy,
  });
  const counts = {
    events: events.length,
    logs: logs.length,
    metrics: metrics.length,
    traces: traces.length,
    correlations: correlations.length,
    alerts: alerts.length,
  };
  const safety = observabilityCapability();
  const identity = {
    referenceTime,
    events,
    logs,
    metrics,
    traces,
    correlations,
    jobHealth,
    alertPolicy,
    alerts,
    counts,
    safety,
  };
  const reportFingerprint = hash({
    version: P11_3_OBSERVABILITY_VERSION,
    purpose: "observability_report",
    ...identity,
  });
  return {
    version: P11_3_OBSERVABILITY_VERSION,
    reportId: "obr-" + reportFingerprint.slice(0, 24),
    reportFingerprint,
    ...identity,
  };
}

export function observabilityCapability() {
  return Object.freeze({
    version: P11_3_OBSERVABILITY_VERSION,
    deterministicProjectionOnly: true as const,
    offlineOnly: true as const,
    suppliedEvidenceOnly: true as const,
    structuredLogsDescriptiveOnly: true as const,
    metricsDescriptiveOnly: true as const,
    traceCorrelationDescriptiveOnly: true as const,
    jobHealthDescriptiveOnly: true as const,
    alertCandidatesOnly: true as const,
    wallClockAccess: false as const,
    telemetryExporterConfigured: false as const,
    telemetrySinkConfigured: false as const,
    productionTelemetryIngestionAuthorized: false as const,
    alertDeliveryAuthorized: false as const,
    incidentCreationAuthorized: false as const,
    pagerDutyAuthorized: false as const,
    slackAlertAuthorized: false as const,
    emailAlertAuthorized: false as const,
    webhookAlertAuthorized: false as const,
    schedulerActivated: false as const,
    workerActivated: false as const,
    retryDispatchAuthorized: false as const,
    productionDbReadAuthorized: false as const,
    productionDbWriteAuthorized: false as const,
    credentialUseAuthorized: false as const,
    providerNetworkReadAuthorized: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    task51ExecutionAuthorized: false as const,
    task53ExecutionAuthorized: false as const,
    task54ExecutionAuthorized: false as const,
    p9_8ImplementationAuthorized: false as const,
    deploymentAuthorized: false as const,
    publicationAuthorized: false as const,
  });
}
