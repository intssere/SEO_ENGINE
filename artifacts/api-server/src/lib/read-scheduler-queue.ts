import { createHash } from "node:crypto";

export const READ_SCHEDULER_QUEUE_VERSION = "p9-1-read-scheduler-queue-v1" as const;
export const MIN_READ_SCHEDULE_CADENCE_MINUTES = 60;
export const MAX_READ_SCHEDULE_CADENCE_MINUTES = 43_200;
export const MAX_READ_SCHEDULES_PER_PROJECTION = 100;

export type ReadWorkClass = "signal_refresh" | "crawl_refresh";
export type ReadScheduleStatus =
  | "not_started"
  | "paused"
  | "due"
  | "missed"
  | "already_materialized";

export type ReadSchedulerQueueSafety = ReturnType<typeof readSchedulerQueueCapability>;

export type ReadScheduleDefinition = {
  version: typeof READ_SCHEDULER_QUEUE_VERSION;
  scheduleId: string;
  scheduleFingerprint: string;
  key: string;
  workClass: ReadWorkClass;
  scopeFingerprint: string;
  upstreamLineageFingerprint: string;
  startAt: string;
  cadenceMinutes: number;
  dueWindowMinutes: number;
  paused: boolean;
  safety: ReadSchedulerQueueSafety;
};

export type ReadScheduleEvaluation = {
  scheduleId: string;
  scheduleFingerprint: string;
  key: string;
  workClass: ReadWorkClass;
  status: ReadScheduleStatus;
  checkedAt: string;
  slotAt: string | null;
  expiresAt: string | null;
  lastMaterializedSlotAt: string | null;
  intent: ReadWorkIntent | null;
};

export type ReadWorkIntent = {
  version: typeof READ_SCHEDULER_QUEUE_VERSION;
  intentId: string;
  intentFingerprint: string;
  scheduleId: string;
  scheduleFingerprint: string;
  key: string;
  workClass: ReadWorkClass;
  scopeFingerprint: string;
  upstreamLineageFingerprint: string;
  slotAt: string;
  expiresAt: string;
  lifecycle: "proposed";
  safety: ReadSchedulerQueueSafety;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const SCHEDULE_KEY = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SCHEDULE_ID = /^rsq-[0-9a-f]{24}$/;
const INTENT_ID = /^rqi-[0-9a-f]{24}$/;
const WORK_CLASSES = new Set<ReadWorkClass>(["signal_refresh", "crawl_refresh"]);

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key])).join(",") + "}";
}

function hash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function isoTimestamp(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 64) {
    throw new Error("invalid_" + name);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error("invalid_" + name);
  return new Date(milliseconds).toISOString();
}

function integer(value: unknown, min: number, max: number, name: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error("invalid_" + name);
  }
  return value as number;
}

function exactFingerprint(value: unknown, name: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error("invalid_" + name);
  return value;
}

function exactSafety(actual: unknown): void {
  const expected = readSchedulerQueueCapability() as unknown as Record<string, unknown>;
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
    throw new Error("invalid_read_scheduler_safety");
  }
  const record = actual as Record<string, unknown>;
  const actualKeys = Object.keys(record).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error("read_scheduler_safety_mismatch");
  }
  for (const key of expectedKeys) {
    if (record[key] !== expected[key]) throw new Error("read_scheduler_safety_mismatch");
  }
}

function scheduleIdentity(input: {
  key: string;
  workClass: ReadWorkClass;
  scopeFingerprint: string;
  upstreamLineageFingerprint: string;
  startAt: string;
  cadenceMinutes: number;
  dueWindowMinutes: number;
  paused: boolean;
  safety: ReadSchedulerQueueSafety;
}) {
  return input;
}

export function normalizeReadScheduleDefinition(input: {
  key: string;
  workClass: ReadWorkClass;
  scopeFingerprint: string;
  upstreamLineageFingerprint: string;
  startAt: string;
  cadenceMinutes: number;
  dueWindowMinutes: number;
  paused?: boolean;
}): ReadScheduleDefinition {
  if (typeof input.key !== "string" || !SCHEDULE_KEY.test(input.key)) {
    throw new Error("invalid_read_schedule_key");
  }
  if (!WORK_CLASSES.has(input.workClass)) throw new Error("invalid_read_work_class");
  const scopeFingerprint = exactFingerprint(input.scopeFingerprint, "scope_fingerprint");
  const upstreamLineageFingerprint = exactFingerprint(
    input.upstreamLineageFingerprint,
    "upstream_lineage_fingerprint",
  );
  const startAt = isoTimestamp(input.startAt, "schedule_start_at");
  const cadenceMinutes = integer(
    input.cadenceMinutes,
    MIN_READ_SCHEDULE_CADENCE_MINUTES,
    MAX_READ_SCHEDULE_CADENCE_MINUTES,
    "schedule_cadence_minutes",
  );
  const dueWindowMinutes = integer(
    input.dueWindowMinutes,
    1,
    cadenceMinutes,
    "schedule_due_window_minutes",
  );
  const paused = input.paused === true;
  const safety = readSchedulerQueueCapability();
  const identity = scheduleIdentity({
    key: input.key,
    workClass: input.workClass,
    scopeFingerprint,
    upstreamLineageFingerprint,
    startAt,
    cadenceMinutes,
    dueWindowMinutes,
    paused,
    safety,
  });
  const scheduleFingerprint = hash({
    version: READ_SCHEDULER_QUEUE_VERSION,
    purpose: "read_schedule",
    ...identity,
  });
  return {
    version: READ_SCHEDULER_QUEUE_VERSION,
    scheduleId: "rsq-" + scheduleFingerprint.slice(0, 24),
    scheduleFingerprint,
    ...identity,
  };
}

function validateSchedule(schedule: ReadScheduleDefinition): ReadScheduleDefinition {
  if (schedule.version !== READ_SCHEDULER_QUEUE_VERSION) {
    throw new Error("unsupported_read_schedule_version");
  }
  if (!SCHEDULE_ID.test(schedule.scheduleId)) throw new Error("invalid_read_schedule_id");
  exactFingerprint(schedule.scheduleFingerprint, "schedule_fingerprint");
  exactSafety(schedule.safety);
  const rebuilt = normalizeReadScheduleDefinition({
    key: schedule.key,
    workClass: schedule.workClass,
    scopeFingerprint: schedule.scopeFingerprint,
    upstreamLineageFingerprint: schedule.upstreamLineageFingerprint,
    startAt: schedule.startAt,
    cadenceMinutes: schedule.cadenceMinutes,
    dueWindowMinutes: schedule.dueWindowMinutes,
    paused: schedule.paused,
  });
  if (
    rebuilt.scheduleId !== schedule.scheduleId
    || rebuilt.scheduleFingerprint !== schedule.scheduleFingerprint
  ) throw new Error("read_schedule_identity_mismatch");
  return rebuilt;
}

function slotTimestamp(startAt: string, cadenceMinutes: number, slotIndex: number): string {
  return new Date(
    Date.parse(startAt) + slotIndex * cadenceMinutes * 60_000,
  ).toISOString();
}

function validateLastMaterializedSlot(input: {
  schedule: ReadScheduleDefinition;
  lastMaterializedSlotAt: string | null | undefined;
  checkedAt: string;
}): string | null {
  if (input.lastMaterializedSlotAt === null || input.lastMaterializedSlotAt === undefined) {
    return null;
  }
  const value = isoTimestamp(input.lastMaterializedSlotAt, "last_materialized_slot_at");
  const start = Date.parse(input.schedule.startAt);
  const timestamp = Date.parse(value);
  const cadenceMs = input.schedule.cadenceMinutes * 60_000;
  if (timestamp < start || (timestamp - start) % cadenceMs !== 0) {
    throw new Error("last_materialized_slot_misaligned");
  }
  if (timestamp > Date.parse(input.checkedAt)) {
    throw new Error("last_materialized_slot_in_future");
  }
  return value;
}

function buildIntent(
  schedule: ReadScheduleDefinition,
  slotAt: string,
  expiresAt: string,
): ReadWorkIntent {
  const safety = readSchedulerQueueCapability();
  const identity = {
    scheduleId: schedule.scheduleId,
    scheduleFingerprint: schedule.scheduleFingerprint,
    key: schedule.key,
    workClass: schedule.workClass,
    scopeFingerprint: schedule.scopeFingerprint,
    upstreamLineageFingerprint: schedule.upstreamLineageFingerprint,
    slotAt,
    expiresAt,
    lifecycle: "proposed" as const,
    safety,
  };
  const intentFingerprint = hash({
    version: READ_SCHEDULER_QUEUE_VERSION,
    purpose: "read_work_intent",
    ...identity,
  });
  return {
    version: READ_SCHEDULER_QUEUE_VERSION,
    intentId: "rqi-" + intentFingerprint.slice(0, 24),
    intentFingerprint,
    ...identity,
  };
}

export function evaluateReadSchedule(input: {
  schedule: ReadScheduleDefinition;
  now: string;
  lastMaterializedSlotAt?: string | null;
}): ReadScheduleEvaluation {
  const schedule = validateSchedule(input.schedule);
  const checkedAt = isoTimestamp(input.now, "scheduler_now");
  const lastMaterializedSlotAt = validateLastMaterializedSlot({
    schedule,
    lastMaterializedSlotAt: input.lastMaterializedSlotAt,
    checkedAt,
  });
  const checkedMs = Date.parse(checkedAt);
  const startMs = Date.parse(schedule.startAt);

  if (checkedMs < startMs) {
    return {
      scheduleId: schedule.scheduleId,
      scheduleFingerprint: schedule.scheduleFingerprint,
      key: schedule.key,
      workClass: schedule.workClass,
      status: "not_started",
      checkedAt,
      slotAt: null,
      expiresAt: null,
      lastMaterializedSlotAt,
      intent: null,
    };
  }

  const cadenceMs = schedule.cadenceMinutes * 60_000;
  const slotIndex = Math.floor((checkedMs - startMs) / cadenceMs);
  const slotAt = slotTimestamp(schedule.startAt, schedule.cadenceMinutes, slotIndex);
  const expiresAt = new Date(
    Date.parse(slotAt) + schedule.dueWindowMinutes * 60_000,
  ).toISOString();

  let status: ReadScheduleStatus;
  let intent: ReadWorkIntent | null = null;
  if (schedule.paused) {
    status = "paused";
  } else if (lastMaterializedSlotAt === slotAt) {
    status = "already_materialized";
  } else if (checkedMs >= Date.parse(expiresAt)) {
    status = "missed";
  } else {
    status = "due";
    intent = buildIntent(schedule, slotAt, expiresAt);
  }

  return {
    scheduleId: schedule.scheduleId,
    scheduleFingerprint: schedule.scheduleFingerprint,
    key: schedule.key,
    workClass: schedule.workClass,
    status,
    checkedAt,
    slotAt,
    expiresAt,
    lastMaterializedSlotAt,
    intent,
  };
}

export function buildReadQueueProjection(input: {
  schedules: readonly {
    schedule: ReadScheduleDefinition;
    lastMaterializedSlotAt?: string | null;
  }[];
  now: string;
}) {
  if (
    !Array.isArray(input.schedules)
    || input.schedules.length > MAX_READ_SCHEDULES_PER_PROJECTION
  ) throw new Error("invalid_read_schedule_projection_size");

  const checkedAt = isoTimestamp(input.now, "scheduler_now");
  const scheduleIds = new Set<string>();
  const keys = new Set<string>();
  const evaluations = input.schedules.map((entry) => {
    const schedule = validateSchedule(entry.schedule);
    if (scheduleIds.has(schedule.scheduleId)) throw new Error("duplicate_read_schedule_id");
    if (keys.has(schedule.key)) throw new Error("duplicate_read_schedule_key");
    scheduleIds.add(schedule.scheduleId);
    keys.add(schedule.key);
    return evaluateReadSchedule({
      schedule,
      now: checkedAt,
      lastMaterializedSlotAt: entry.lastMaterializedSlotAt,
    });
  }).sort((a, b) => a.scheduleId.localeCompare(b.scheduleId));

  const intents = evaluations
    .flatMap((evaluation) => evaluation.intent ? [evaluation.intent] : [])
    .sort((a, b) => a.scheduleId.localeCompare(b.scheduleId));

  const intentIds = new Set<string>();
  for (const intent of intents) {
    if (!INTENT_ID.test(intent.intentId)) throw new Error("invalid_read_work_intent_id");
    exactFingerprint(intent.intentFingerprint, "intent_fingerprint");
    if (intentIds.has(intent.intentId)) throw new Error("duplicate_read_work_intent_id");
    intentIds.add(intent.intentId);
  }

  const counts = {
    schedules: evaluations.length,
    due: evaluations.filter((value) => value.status === "due").length,
    notStarted: evaluations.filter((value) => value.status === "not_started").length,
    paused: evaluations.filter((value) => value.status === "paused").length,
    missed: evaluations.filter((value) => value.status === "missed").length,
    alreadyMaterialized: evaluations.filter(
      (value) => value.status === "already_materialized",
    ).length,
    intents: intents.length,
  };
  const semantics = readSchedulerQueueCapability();
  const projectionFingerprint = hash({
    version: READ_SCHEDULER_QUEUE_VERSION,
    checkedAt,
    evaluations,
    intents,
    counts,
    semantics,
  });

  return {
    version: READ_SCHEDULER_QUEUE_VERSION,
    checkedAt,
    projectionFingerprint,
    counts,
    evaluations,
    intents,
    semantics,
  };
}

export function readSchedulerQueueCapability() {
  return Object.freeze({
    version: READ_SCHEDULER_QUEUE_VERSION,
    architectureOnly: true as const,
    deterministicProjectionOnly: true as const,
    readWorkOnly: true as const,
    orderingImpliesPriority: false as const,
    wallClockAccess: false as const,
    timerActivated: false as const,
    schedulerActivated: false as const,
    durableEnqueueAuthorized: false as const,
    queueReservationAuthorized: false as const,
    workerEnabled: false as const,
    batchExecutorEnabled: false as const,
    retryLoopEnabled: false as const,
    task69PacketMaterializationAuthorized: false as const,
    task70ExecutionAuthorized: false as const,
    credentialUseAuthorized: false as const,
    networkReadAuthorized: false as const,
    crawlExecutionAuthorized: false as const,
    observationPersistenceAuthorized: false as const,
    evidencePersistenceAuthorized: false as const,
    productionDbWriteAuthorized: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    task53ExecutionAuthorized: false as const,
    task54ExecutionAuthorized: false as const,
    automaticTransition: false as const,
    publicationAuthorized: false as const,
  });
}
