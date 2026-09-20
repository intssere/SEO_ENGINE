import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  evaluateReadSchedule,
  normalizeReadScheduleDefinition,
  type ReadWorkIntent,
} from "./read-scheduler-queue.js";
import {
  SCHEDULED_CRAWL_POLICY_VERSION,
  scheduledCrawlPolicyCapability,
  type ScheduledCrawlPolicyCandidate,
} from "./scheduled-crawl-policy.js";
import {
  buildFailureControlAttemptRecord,
  failureRetryDeadLetterCapability,
  type FailureControlArtifactInput,
  type FailureControlPolicy,
} from "./failure-retry-dead-letter.js";
import {
  WORKER_CONTROL_OBSERVABILITY_VERSION,
  buildWorkerInFlightObservation,
  normalizeWorkerControlState,
  projectWorkerControlObservability,
  projectWorkerControlTransition,
  workerControlObservabilityCapability,
} from "./worker-control-observability.js";

const START = "2026-09-20T09:00:00.000Z";
const EXPIRES = "2026-09-20T09:15:00.000Z";
const POLICY: FailureControlPolicy = {
  maxAttempts: 3,
  baseBackoffMinutes: 2,
  backoffMultiplier: 2,
  maxBackoffMinutes: 10,
};

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

function intent(key = "worker-control"): ReadWorkIntent {
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
    now: "2026-09-20T09:01:00.000Z",
  });
  assert.equal(evaluation.status, "due");
  assert.ok(evaluation.intent);
  assert.equal(evaluation.intent!.expiresAt, EXPIRES);
  return evaluation.intent!;
}

function artifact(key = "worker-control"): FailureControlArtifactInput {
  return {
    kind: "p9_1_read_work_intent",
    intent: intent(key),
  };
}

function noWorkArtifact(): FailureControlArtifactInput {
  const readIntent = (() => {
    const schedule = normalizeReadScheduleDefinition({
      key: "no-work-crawl",
      workClass: "crawl_refresh",
      scopeFingerprint: "3".repeat(64),
      upstreamLineageFingerprint: "4".repeat(64),
      startAt: START,
      cadenceMinutes: 60,
      dueWindowMinutes: 15,
    });
    return evaluateReadSchedule({
      schedule,
      now: "2026-09-20T09:01:00.000Z",
    }).intent!;
  })();
  const identity = {
    lifecycle: "proposed_review" as const,
    selection: "no_work" as const,
    reason: "no_incremental_candidates" as const,
    siteId: "site-synthetic",
    canonicalOrigin: "https://example.com",
    scheduleId: readIntent.scheduleId,
    scheduleFingerprint: readIntent.scheduleFingerprint,
    intentId: readIntent.intentId,
    intentFingerprint: readIntent.intentFingerprint,
    slotAt: readIntent.slotAt,
    expiresAt: readIntent.expiresAt,
    slotIndex: 0,
    fullReconciliationEverySlots: 24,
    current: {
      crawlPlanFingerprint: "5".repeat(64),
      inventoryFingerprint: "6".repeat(64),
      executionPlanFingerprint: "7".repeat(64),
      checkpointFingerprint: "8".repeat(64),
      certificationFingerprint: "9".repeat(64),
      wholeSiteCertified: true,
    },
    incremental: {
      comparisonFingerprint: null,
      planFingerprint: null,
    },
    work: {
      selectedUrlCount: 0,
      deferredUrlCount: 0,
      batchCount: 0,
      requiresWholeSiteCertification: false,
    },
    safety: scheduledCrawlPolicyCapability(),
  };
  const candidateFingerprint = hash({
    version: SCHEDULED_CRAWL_POLICY_VERSION,
    purpose: "scheduled_crawl_policy_review",
    ...identity,
  });
  const candidate: ScheduledCrawlPolicyCandidate = {
    version: SCHEDULED_CRAWL_POLICY_VERSION,
    candidateId: "crp-" + candidateFingerprint.slice(0, 24),
    candidateFingerprint,
    ...identity,
  };
  return {
    kind: "p9_3_scheduled_crawl_candidate",
    intent: readIntent,
    candidate,
  };
}

function control(
  mode: "running" | "paused" | "draining" | "drained" | "killed",
  effectiveAt = "2026-09-20T09:05:00.000Z",
) {
  return normalizeWorkerControlState({
    mode,
    effectiveAt,
    reason: mode + "_operator_control",
  });
}

test("P9.6 transition precedence is kill > drain > pause > running and killed cannot ordinary-resume", () => {
  assert.equal(projectWorkerControlTransition({
    currentMode: "running",
    action: "pause",
    requestedAt: "2026-09-20T09:05:00.000Z",
    inFlightCount: 1,
    reason: "maintenance",
  }).toMode, "paused");

  assert.equal(projectWorkerControlTransition({
    currentMode: "paused",
    action: "drain",
    requestedAt: "2026-09-20T09:06:00.000Z",
    inFlightCount: 1,
    reason: "shutdown",
  }).toMode, "draining");

  assert.equal(projectWorkerControlTransition({
    currentMode: "draining",
    action: "kill",
    requestedAt: "2026-09-20T09:07:00.000Z",
    inFlightCount: 1,
    reason: "emergency",
  }).toMode, "killed");

  assert.throws(() => projectWorkerControlTransition({
    currentMode: "draining",
    action: "pause",
    requestedAt: "2026-09-20T09:07:00.000Z",
    inFlightCount: 1,
    reason: "downgrade",
  }), /drain_precedence_blocks_pause/);

  assert.throws(() => projectWorkerControlTransition({
    currentMode: "draining",
    action: "resume",
    requestedAt: "2026-09-20T09:07:00.000Z",
    inFlightCount: 1,
    reason: "resume_early",
  }), /drain_not_complete/);

  assert.equal(projectWorkerControlTransition({
    currentMode: "draining",
    action: "resume",
    requestedAt: "2026-09-20T09:08:00.000Z",
    inFlightCount: 0,
    reason: "drain_complete",
  }).toMode, "running");

  assert.throws(() => projectWorkerControlTransition({
    currentMode: "killed",
    action: "resume",
    requestedAt: "2026-09-20T09:08:00.000Z",
    inFlightCount: 0,
    reason: "unsafe_resume",
  }), /killed_requires_recovery_review/);
});

test("pause blocks new/retry review while allowing existing in-flight work to continue", () => {
  const a = artifact("pause-in-flight");
  const inFlight = buildWorkerInFlightObservation({
    artifact: a,
    attemptNumber: 1,
    claimedAt: "2026-09-20T09:02:00.000Z",
    executionStartedAt: "2026-09-20T09:02:30.000Z",
    lastHeartbeatAt: "2026-09-20T09:06:00.000Z",
    executionEvidence: "execution_started",
  });
  const projection = projectWorkerControlObservability({
    control: control("paused"),
    items: [
      {
        artifact: a,
        failurePolicy: POLICY,
        inFlight,
      },
      {
        artifact: artifact("pause-held"),
        failurePolicy: POLICY,
      },
    ],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:07:00.000Z",
  });

  assert.equal(projection.effectiveMode, "paused");
  assert.equal(projection.controls.admissionReviewAllowed, false);
  assert.equal(projection.controls.newClaimReviewAllowed, false);
  assert.equal(projection.controls.retryDispatchReviewAllowed, false);
  assert.equal(projection.controls.inFlightContinuationReviewAllowed, true);
  assert.equal(projection.counts.inFlight, 1);
  assert.equal(projection.counts.heldByControl, 1);
  assert.ok(projection.items.some((item) => item.disposition === "in_flight_continuing"));
  assert.ok(projection.items.some((item) => item.disposition === "held_by_control"));
});

test("drain becomes drained only when supplied in-flight count reaches zero", () => {
  const a = artifact("drain-in-flight");
  const inFlight = buildWorkerInFlightObservation({
    artifact: a,
    attemptNumber: 1,
    claimedAt: "2026-09-20T09:02:00.000Z",
    executionStartedAt: "2026-09-20T09:03:00.000Z",
    lastHeartbeatAt: "2026-09-20T09:06:00.000Z",
    executionEvidence: "execution_started",
  });
  const draining = projectWorkerControlObservability({
    control: control("draining"),
    items: [{ artifact: a, failurePolicy: POLICY, inFlight }],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:07:00.000Z",
  });
  assert.equal(draining.effectiveMode, "draining");
  assert.equal(draining.health, "quiescing");
  assert.equal(draining.controls.inFlightContinuationReviewAllowed, true);

  const drained = projectWorkerControlObservability({
    control: control("draining"),
    items: [{ artifact: artifact("drain-idle"), failurePolicy: POLICY }],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:07:00.000Z",
  });
  assert.equal(drained.effectiveMode, "drained");
  assert.equal(drained.health, "drained");
  assert.equal(drained.controls.admissionReviewAllowed, false);
});

test("kill distinguishes confirmed not-started from started or uncertain in-flight work", () => {
  const safeArtifact = artifact("kill-not-started");
  const startedArtifact = artifact("kill-started");
  const uncertainArtifact = artifact("kill-uncertain");

  const projection = projectWorkerControlObservability({
    control: control("killed"),
    items: [
      {
        artifact: safeArtifact,
        failurePolicy: POLICY,
        inFlight: buildWorkerInFlightObservation({
          artifact: safeArtifact,
          attemptNumber: 1,
          claimedAt: "2026-09-20T09:02:00.000Z",
          lastHeartbeatAt: "2026-09-20T09:04:00.000Z",
          executionEvidence: "confirmed_not_started",
        }),
      },
      {
        artifact: startedArtifact,
        failurePolicy: POLICY,
        inFlight: buildWorkerInFlightObservation({
          artifact: startedArtifact,
          attemptNumber: 1,
          claimedAt: "2026-09-20T09:02:00.000Z",
          executionStartedAt: "2026-09-20T09:03:00.000Z",
          lastHeartbeatAt: "2026-09-20T09:04:00.000Z",
          executionEvidence: "execution_started",
        }),
      },
      {
        artifact: uncertainArtifact,
        failurePolicy: POLICY,
        inFlight: buildWorkerInFlightObservation({
          artifact: uncertainArtifact,
          attemptNumber: 1,
          claimedAt: "2026-09-20T09:02:00.000Z",
          lastHeartbeatAt: "2026-09-20T09:04:00.000Z",
          executionEvidence: "outcome_uncertain",
        }),
      },
    ],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:07:00.000Z",
  });

  assert.equal(projection.health, "blocked_recovery");
  assert.equal(projection.controls.cancellationRequested, true);
  assert.equal(projection.controls.inFlightContinuationReviewAllowed, false);
  assert.equal(projection.counts.killReconciliations, 3);
  assert.equal(projection.counts.unreconciledKilled, 2);

  const dispositions = projection.items.map((item) =>
    item.killReconciliation?.disposition
  );
  assert.ok(dispositions.includes("confirmed_not_started_reviewable_after_recovery"));
  assert.equal(
    dispositions.filter((value) => value === "manual_intervention_required").length,
    2,
  );
  assert.ok(projection.items.every(
    (item) => item.killReconciliation?.retryDispatchAuthorized === false,
  ));
});

test("confirmed not-started kill after original expiry cannot reopen retry", () => {
  const a = artifact("kill-expired");
  const inFlight = buildWorkerInFlightObservation({
    artifact: a,
    attemptNumber: 1,
    claimedAt: "2026-09-20T09:02:00.000Z",
    lastHeartbeatAt: "2026-09-20T09:10:00.000Z",
    executionEvidence: "confirmed_not_started",
  });
  const projection = projectWorkerControlObservability({
    control: control("killed"),
    items: [{ artifact: a, failurePolicy: POLICY, inFlight }],
    heartbeatPolicy: { staleAfterMinutes: 30 },
    now: "2026-09-20T09:16:00.000Z",
  });
  assert.equal(
    projection.items[0]!.killReconciliation?.disposition,
    "confirmed_not_started_dead_letter_review",
  );
});

test("retryable work is held under pause and resumes from unchanged P9.5 history", () => {
  const a = artifact("retry-resume");
  const failed = buildFailureControlAttemptRecord({
    artifact: a,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T09:02:00.000Z",
    outcome: "failed",
    failureCode: "transport_timeout",
  });

  const paused = projectWorkerControlObservability({
    control: control("paused"),
    items: [{ artifact: a, attempts: [failed], failurePolicy: POLICY }],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:05:00.000Z",
  });
  assert.equal(paused.items[0]!.disposition, "retry_held_by_control");
  assert.equal(paused.items[0]!.retryEligibility, "eligible_for_review");

  const running = projectWorkerControlObservability({
    control: control("running", "2026-09-20T09:06:00.000Z"),
    items: [{ artifact: a, attempts: [failed], failurePolicy: POLICY }],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:06:00.000Z",
  });
  assert.equal(running.items[0]!.disposition, "retry_review_open");
  assert.equal(running.items[0]!.attemptCount, 1);
  assert.equal(running.items[0]!.artifact.idempotencyKey, paused.items[0]!.artifact.idempotencyKey);
  assert.equal(running.controls.attemptResetAllowed, false);
  assert.equal(running.controls.idempotencyResetAllowed, false);
});

test("dead-lettered and succeeded items remain terminal across resume", () => {
  const dead = artifact("dead-terminal");
  const fatal = buildFailureControlAttemptRecord({
    artifact: dead,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T09:02:00.000Z",
    outcome: "failed",
    failureCode: "normalization_failed",
  });
  const successArtifact = artifact("success-terminal");
  const success = buildFailureControlAttemptRecord({
    artifact: successArtifact,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T09:02:00.000Z",
    outcome: "succeeded",
  });

  const projection = projectWorkerControlObservability({
    control: control("running", "2026-09-20T09:06:00.000Z"),
    items: [
      { artifact: dead, attempts: [fatal], failurePolicy: POLICY },
      { artifact: successArtifact, attempts: [success], failurePolicy: POLICY },
    ],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:06:00.000Z",
  });
  assert.ok(projection.items.some((item) => item.disposition === "dead_letter_terminal"));
  assert.ok(projection.items.some((item) => item.disposition === "succeeded_terminal"));
  assert.equal(projection.controls.deadLetterReactivationAllowed, false);
  assert.equal(projection.controls.catchUpBackfillAllowed, false);
});

test("in-flight retry must be the exact next P9.5 attempt and claimed after backoff", () => {
  const a = artifact("retry-in-flight");
  const failed = buildFailureControlAttemptRecord({
    artifact: a,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T09:02:00.000Z",
    outcome: "failed",
    failureCode: "transport_timeout",
  });

  const valid = buildWorkerInFlightObservation({
    artifact: a,
    attemptNumber: 2,
    claimedAt: "2026-09-20T09:04:00.000Z",
    executionStartedAt: "2026-09-20T09:04:30.000Z",
    lastHeartbeatAt: "2026-09-20T09:05:00.000Z",
    executionEvidence: "execution_started",
  });
  const projection = projectWorkerControlObservability({
    control: control("running", "2026-09-20T09:00:00.000Z"),
    items: [{ artifact: a, attempts: [failed], failurePolicy: POLICY, inFlight: valid }],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:06:00.000Z",
  });
  assert.equal(projection.items[0]!.disposition, "in_flight_running");

  const tooEarly = buildWorkerInFlightObservation({
    artifact: a,
    attemptNumber: 2,
    claimedAt: "2026-09-20T09:03:00.000Z",
    executionStartedAt: "2026-09-20T09:03:30.000Z",
    lastHeartbeatAt: "2026-09-20T09:04:00.000Z",
    executionEvidence: "execution_started",
  });
  assert.throws(() => projectWorkerControlObservability({
    control: control("running", "2026-09-20T09:00:00.000Z"),
    items: [{ artifact: a, attempts: [failed], failurePolicy: POLICY, inFlight: tooEarly }],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:06:00.000Z",
  }), /worker_claim_not_eligible_under_p9_5/);

  const wrongAttempt = buildWorkerInFlightObservation({
    artifact: a,
    attemptNumber: 3,
    claimedAt: "2026-09-20T09:04:00.000Z",
    executionStartedAt: "2026-09-20T09:04:30.000Z",
    lastHeartbeatAt: "2026-09-20T09:05:00.000Z",
    executionEvidence: "execution_started",
  });
  assert.throws(() => projectWorkerControlObservability({
    control: control("running", "2026-09-20T09:00:00.000Z"),
    items: [{ artifact: a, attempts: [failed], failurePolicy: POLICY, inFlight: wrongAttempt }],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:06:00.000Z",
  }), /worker_in_flight_attempt_number_mismatch/);
});

test("pause/drain controls cannot have claims created after control became effective", () => {
  const a = artifact("claim-after-pause");
  const inFlight = buildWorkerInFlightObservation({
    artifact: a,
    attemptNumber: 1,
    claimedAt: "2026-09-20T09:06:00.000Z",
    executionStartedAt: "2026-09-20T09:06:30.000Z",
    lastHeartbeatAt: "2026-09-20T09:07:00.000Z",
    executionEvidence: "execution_started",
  });
  assert.throws(() => projectWorkerControlObservability({
    control: control("paused", "2026-09-20T09:05:00.000Z"),
    items: [{ artifact: a, failurePolicy: POLICY, inFlight }],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:08:00.000Z",
  }), /worker_claim_after_control_effective/);
});

test("heartbeat staleness is deterministic and degrades running health only from supplied time", () => {
  const a = artifact("stale-heartbeat");
  const inFlight = buildWorkerInFlightObservation({
    artifact: a,
    attemptNumber: 1,
    claimedAt: "2026-09-20T09:01:00.000Z",
    executionStartedAt: "2026-09-20T09:01:30.000Z",
    lastHeartbeatAt: "2026-09-20T09:02:00.000Z",
    executionEvidence: "execution_started",
  });
  const projection = projectWorkerControlObservability({
    control: control("running", "2026-09-20T09:00:00.000Z"),
    items: [{ artifact: a, failurePolicy: POLICY, inFlight }],
    heartbeatPolicy: { staleAfterMinutes: 3 },
    now: "2026-09-20T09:06:00.000Z",
  });
  assert.equal(projection.items[0]!.heartbeat?.state, "stale");
  assert.equal(projection.health, "degraded");
  assert.equal(projection.counts.staleHeartbeats, 1);
});

test("P9.3 no-work remains terminal and cannot gain execution history", () => {
  const a = noWorkArtifact();
  const projection = projectWorkerControlObservability({
    control: control("running", "2026-09-20T09:00:00.000Z"),
    items: [{ artifact: a, failurePolicy: POLICY }],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:05:00.000Z",
  });
  assert.equal(projection.items[0]!.disposition, "no_work_terminal");
  assert.equal(projection.counts.noWork, 1);

  const attempt = buildFailureControlAttemptRecord({
    artifact: a,
    attemptNumber: 1,
    attemptedAt: "2026-09-20T09:02:00.000Z",
    outcome: "failed",
    failureCode: "transport_timeout",
  });
  assert.throws(() => projectWorkerControlObservability({
    control: control("running", "2026-09-20T09:00:00.000Z"),
    items: [{ artifact: a, attempts: [attempt], failurePolicy: POLICY }],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:05:00.000Z",
  }), /no_work_execution_history_forbidden/);
});

test("tampered control/in-flight state and future timestamps fail closed", () => {
  const a = artifact("tamper");
  const state = control("paused");
  assert.throws(() => projectWorkerControlObservability({
    control: { ...state, reason: "tampered" },
    items: [{ artifact: a, failurePolicy: POLICY }],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:07:00.000Z",
  }), /worker_control_state_identity_mismatch/);

  const inFlight = buildWorkerInFlightObservation({
    artifact: a,
    attemptNumber: 1,
    claimedAt: "2026-09-20T09:02:00.000Z",
    executionStartedAt: "2026-09-20T09:02:30.000Z",
    lastHeartbeatAt: "2026-09-20T09:06:00.000Z",
    executionEvidence: "execution_started",
  });
  assert.throws(() => projectWorkerControlObservability({
    control: control("running", "2026-09-20T09:00:00.000Z"),
    items: [{ artifact: a, failurePolicy: POLICY, inFlight: { ...inFlight, attemptNumber: 2 } }],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:07:00.000Z",
  }), /worker_in_flight_identity_mismatch/);

  assert.throws(() => projectWorkerControlObservability({
    control: control("running", "2026-09-20T09:10:00.000Z"),
    items: [],
    heartbeatPolicy: { staleAfterMinutes: 5 },
    now: "2026-09-20T09:07:00.000Z",
  }), /worker_control_effective_time_in_future/);
});

test("capability remains strictly architecture-only/default-off", () => {
  assert.equal(failureRetryDeadLetterCapability().liveRetryLoopEnabled, false);
  assert.deepEqual(workerControlObservabilityCapability(), {
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    architectureOnly: true,
    deterministicProjectionOnly: true,
    suppliedWorkerStateOnly: true,
    observabilityOnly: true,
    pauseReviewOnly: true,
    drainReviewOnly: true,
    killReviewOnly: true,
    resumeReviewOnly: true,
    killOverridesDrain: true,
    drainOverridesPause: true,
    pauseAllowsInFlightContinuation: true,
    drainAllowsInFlightContinuation: true,
    killRequiresInFlightReconciliation: true,
    killedRequiresRecoveryReviewBeforeResume: true,
    deadLetterReactivationAllowed: false,
    catchUpBackfillAllowed: false,
    attemptResetAllowed: false,
    idempotencyResetAllowed: false,
    workWindowExtensionAllowed: false,
    wallClockAccess: false,
    timerActivated: false,
    schedulerActivated: false,
    liveWorkerEnabled: false,
    liveRetryLoopEnabled: false,
    durableControlStateAuthorized: false,
    durableEnqueueAuthorized: false,
    queueReservationAuthorized: false,
    durableDeadLetterStoreAuthorized: false,
    batchExecutorEnabled: false,
    task69PacketMaterializationAuthorized: false,
    task70ExecutionAuthorized: false,
    credentialUseAuthorized: false,
    oauthUseAuthorized: false,
    providerNetworkReadAuthorized: false,
    crawlNetworkReadAuthorized: false,
    crawlExecutionAuthorized: false,
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
