import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_READ_SCHEDULES_PER_PROJECTION,
  READ_SCHEDULER_QUEUE_VERSION,
  buildReadQueueProjection,
  evaluateReadSchedule,
  normalizeReadScheduleDefinition,
  readSchedulerQueueCapability,
  type ReadScheduleDefinition,
} from "./read-scheduler-queue.js";

const fp = (char: string) => char.repeat(64);

function schedule(overrides: Partial<Parameters<typeof normalizeReadScheduleDefinition>[0]> = {}) {
  return normalizeReadScheduleDefinition({
    key: "gsc-daily",
    workClass: "signal_refresh",
    scopeFingerprint: fp("a"),
    upstreamLineageFingerprint: fp("b"),
    startAt: "2026-09-20T00:00:00.000Z",
    cadenceMinutes: 60,
    dueWindowMinutes: 15,
    paused: false,
    ...overrides,
  });
}

test("P9.1 schedule identity is deterministic and material changes alter identity", () => {
  const one = schedule({ startAt: "2026-09-20T00:00:00Z" });
  const two = schedule({ startAt: "2026-09-20T00:00:00.000Z" });
  assert.deepEqual(one, two);
  assert.equal(one.version, READ_SCHEDULER_QUEUE_VERSION);
  assert.notEqual(one.scheduleFingerprint, schedule({ cadenceMinutes: 120 }).scheduleFingerprint);
  assert.notEqual(one.scheduleFingerprint, schedule({ dueWindowMinutes: 10 }).scheduleFingerprint);
  assert.notEqual(one.scheduleFingerprint, schedule({ paused: true }).scheduleFingerprint);
  assert.notEqual(
    one.scheduleFingerprint,
    schedule({ upstreamLineageFingerprint: fp("c") }).scheduleFingerprint,
  );
});

test("P9.1 validates keys, classes, fingerprints and bounded non-overlapping cadence windows", () => {
  assert.throws(() => schedule({ key: "Bad key" }), /invalid_read_schedule_key/);
  assert.throws(
    () => schedule({ workClass: "mutation" as "signal_refresh" }),
    /invalid_read_work_class/,
  );
  assert.throws(() => schedule({ scopeFingerprint: "nope" }), /invalid_scope_fingerprint/);
  assert.throws(() => schedule({ cadenceMinutes: 59 }), /invalid_schedule_cadence_minutes/);
  assert.throws(
    () => schedule({ cadenceMinutes: 60, dueWindowMinutes: 61 }),
    /invalid_schedule_due_window_minutes/,
  );
});

test("P9.1 evaluates not-started, due, paused, already-materialized and missed states", () => {
  const active = schedule();
  assert.equal(
    evaluateReadSchedule({ schedule: active, now: "2026-09-19T23:59:59Z" }).status,
    "not_started",
  );
  const due = evaluateReadSchedule({ schedule: active, now: "2026-09-20T00:00:00Z" });
  assert.equal(due.status, "due");
  assert.equal(due.slotAt, "2026-09-20T00:00:00.000Z");
  assert.equal(due.expiresAt, "2026-09-20T00:15:00.000Z");
  assert.ok(due.intent);
  assert.equal(
    evaluateReadSchedule({
      schedule: schedule({ paused: true }),
      now: "2026-09-20T00:05:00Z",
    }).status,
    "paused",
  );
  assert.equal(
    evaluateReadSchedule({
      schedule: active,
      now: "2026-09-20T00:05:00Z",
      lastMaterializedSlotAt: "2026-09-20T00:00:00Z",
    }).status,
    "already_materialized",
  );
  assert.equal(
    evaluateReadSchedule({ schedule: active, now: "2026-09-20T00:15:00Z" }).status,
    "missed",
  );
});

test("P9.1 uses fixed anchor slots and never catches up a missed prior slot", () => {
  const active = schedule();
  const later = evaluateReadSchedule({
    schedule: active,
    now: "2026-09-20T01:05:00Z",
    lastMaterializedSlotAt: "2026-09-20T00:00:00Z",
  });
  assert.equal(later.status, "due");
  assert.equal(later.slotAt, "2026-09-20T01:00:00.000Z");
  assert.equal(later.intent?.slotAt, "2026-09-20T01:00:00.000Z");

  const missed = evaluateReadSchedule({
    schedule: active,
    now: "2026-09-20T00:20:00Z",
  });
  assert.equal(missed.status, "missed");
  assert.equal(missed.intent, null);
});

test("P9.1 rejects misaligned or future materialization state", () => {
  const active = schedule();
  assert.throws(
    () => evaluateReadSchedule({
      schedule: active,
      now: "2026-09-20T01:05:00Z",
      lastMaterializedSlotAt: "2026-09-20T00:30:00Z",
    }),
    /last_materialized_slot_misaligned/,
  );
  assert.throws(
    () => evaluateReadSchedule({
      schedule: active,
      now: "2026-09-20T00:05:00Z",
      lastMaterializedSlotAt: "2026-09-20T01:00:00Z",
    }),
    /last_materialized_slot_in_future/,
  );
});

test("P9.1 detects tampered schedule identity and safety", () => {
  const active = schedule();
  assert.throws(
    () => evaluateReadSchedule({
      schedule: { ...active, cadenceMinutes: 120 },
      now: "2026-09-20T00:01:00Z",
    }),
    /read_schedule_identity_mismatch/,
  );
  assert.throws(
    () => evaluateReadSchedule({
      schedule: {
        ...active,
        safety: { ...active.safety, schedulerActivated: true },
      } as unknown as ReadScheduleDefinition,
      now: "2026-09-20T00:01:00Z",
    }),
    /read_scheduler_safety_mismatch/,
  );
});

test("P9.1 queue projection is deterministic independent of schedule input order", () => {
  const first = schedule();
  const second = schedule({
    key: "crawl-daily",
    workClass: "crawl_refresh",
    scopeFingerprint: fp("c"),
    upstreamLineageFingerprint: fp("d"),
  });
  const one = buildReadQueueProjection({
    schedules: [{ schedule: second }, { schedule: first }],
    now: "2026-09-20T00:05:00Z",
  });
  const two = buildReadQueueProjection({
    schedules: [{ schedule: first }, { schedule: second }],
    now: "2026-09-20T00:05:00Z",
  });
  assert.deepEqual(one, two);
  assert.equal(one.counts.due, 2);
  assert.equal(one.counts.intents, 2);
  assert.equal(one.semantics.orderingImpliesPriority, false);
  assert.deepEqual(
    one.intents.map((value) => value.scheduleId),
    [...one.intents.map((value) => value.scheduleId)].sort(),
  );
});

test("P9.1 queue projection fails closed on duplicate keys and duplicate exact schedules", () => {
  const first = schedule();
  const sameKeyDifferentId = schedule({ scopeFingerprint: fp("c") });
  assert.throws(
    () => buildReadQueueProjection({
      schedules: [{ schedule: first }, { schedule: sameKeyDifferentId }],
      now: "2026-09-20T00:05:00Z",
    }),
    /duplicate_read_schedule_key/,
  );
  assert.throws(
    () => buildReadQueueProjection({
      schedules: [{ schedule: first }, { schedule: first }],
      now: "2026-09-20T00:05:00Z",
    }),
    /duplicate_read_schedule_id/,
  );
});

test("P9.1 projection is bounded", () => {
  const active = schedule();
  assert.throws(
    () => buildReadQueueProjection({
      schedules: Array.from({ length: MAX_READ_SCHEDULES_PER_PROJECTION + 1 }, () => ({
        schedule: active,
      })),
      now: "2026-09-20T00:05:00Z",
    }),
    /invalid_read_schedule_projection_size/,
  );
});

test("P9.1 capability keeps every runtime, queue, network, persistence and write gate closed", () => {
  const capability = readSchedulerQueueCapability();
  assert.equal(capability.architectureOnly, true);
  assert.equal(capability.deterministicProjectionOnly, true);
  assert.equal(capability.readWorkOnly, true);
  assert.equal(capability.orderingImpliesPriority, false);
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
    "networkReadAuthorized",
    "crawlExecutionAuthorized",
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
    assert.equal(capability[key], false, key + " must remain false");
  }
});
