import { createHash } from "node:crypto";
import {
  failureRetryDeadLetterCapability,
  normalizeFailureControlArtifact,
  projectFailureRetryDeadLetterControl,
  type FailureControlArtifactInput,
  type FailureControlAttemptRecord,
  type FailureControlPolicy,
} from "./failure-retry-dead-letter.js";

export const WORKER_CONTROL_OBSERVABILITY_VERSION =
  "p9-6-worker-observability-controls-v1" as const;

export const WORKER_CONTROL_MAX_ITEMS = 100;
export const WORKER_CONTROL_MAX_HEARTBEAT_STALE_MINUTES = 1_440;

export type WorkerControlMode =
  | "running"
  | "paused"
  | "draining"
  | "drained"
  | "killed";

export type WorkerControlAction =
  | "pause"
  | "drain"
  | "kill"
  | "resume";

export type WorkerControlHealth =
  | "healthy"
  | "degraded"
  | "paused"
  | "quiescing"
  | "drained"
  | "killed"
  | "blocked_recovery";

export type WorkerControlState = {
  version: typeof WORKER_CONTROL_OBSERVABILITY_VERSION;
  controlId: string;
  controlFingerprint: string;
  mode: WorkerControlMode;
  effectiveAt: string;
  reason: string;
  safety: ReturnType<typeof workerControlObservabilityCapability>;
};

export type WorkerControlTransition = {
  version: typeof WORKER_CONTROL_OBSERVABILITY_VERSION;
  transitionId: string;
  transitionFingerprint: string;
  lifecycle: "proposed_review";
  fromMode: WorkerControlMode;
  action: WorkerControlAction;
  toMode: WorkerControlMode;
  requestedAt: string;
  inFlightCount: number;
  reason: string;
  safety: ReturnType<typeof workerControlObservabilityCapability>;
};

export type WorkerHeartbeatPolicy = {
  staleAfterMinutes: number;
};

export type WorkerExecutionEvidence =
  | "confirmed_not_started"
  | "execution_started"
  | "outcome_uncertain";

export type WorkerInFlightObservation = {
  version: typeof WORKER_CONTROL_OBSERVABILITY_VERSION;
  inFlightId: string;
  inFlightFingerprint: string;
  artifactReferenceFingerprint: string;
  idempotencyKey: string;
  attemptNumber: number;
  claimedAt: string;
  executionStartedAt: string | null;
  lastHeartbeatAt: string;
  executionEvidence: WorkerExecutionEvidence;
  safety: ReturnType<typeof workerControlObservabilityCapability>;
};

export type WorkerKillReconciliationDisposition =
  | "confirmed_not_started_reviewable_after_recovery"
  | "confirmed_not_started_dead_letter_review"
  | "manual_intervention_required";

export type WorkerKillReconciliation = {
  version: typeof WORKER_CONTROL_OBSERVABILITY_VERSION;
  reconciliationId: string;
  reconciliationFingerprint: string;
  lifecycle: "proposed_review";
  artifactReferenceFingerprint: string;
  idempotencyKey: string;
  inFlightId: string;
  inFlightFingerprint: string;
  attemptNumber: number;
  disposition: WorkerKillReconciliationDisposition;
  reason:
    | "killed_before_execution"
    | "killed_before_execution_window_expired"
    | "killed_in_flight_outcome_uncertain";
  requiresManualIntervention: boolean;
  retryDispatchAuthorized: false;
  checkedAt: string;
  safety: ReturnType<typeof workerControlObservabilityCapability>;
};

export type WorkerControlItemDisposition =
  | "control_review_open"
  | "retry_waiting"
  | "retry_review_open"
  | "held_by_control"
  | "retry_held_by_control"
  | "in_flight_running"
  | "in_flight_continuing"
  | "in_flight_kill_reconciliation"
  | "succeeded_terminal"
  | "dead_letter_terminal"
  | "no_work_terminal";

export type WorkerControlWorkItem = {
  artifact: FailureControlArtifactInput;
  attempts?: FailureControlAttemptRecord[];
  failurePolicy: FailureControlPolicy;
  inFlight?: WorkerInFlightObservation | null;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const CONTROL_REASON = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const CONTROL_MODES = new Set<WorkerControlMode>([
  "running",
  "paused",
  "draining",
  "drained",
  "killed",
]);
const CONTROL_ACTIONS = new Set<WorkerControlAction>([
  "pause",
  "drain",
  "kill",
  "resume",
]);
const EXECUTION_EVIDENCE = new Set<WorkerExecutionEvidence>([
  "confirmed_not_started",
  "execution_started",
  "outcome_uncertain",
]);

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key])).join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function timestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 64) {
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

function exactFingerprint(value: unknown, field: string): string {
  if (typeof value !== "string" || !HEX_64.test(value)) throw new Error("invalid_" + field);
  return value;
}

function exactSafety(actual: unknown, expected: unknown, field: string): void {
  if (stableJson(actual) !== stableJson(expected)) throw new Error(field + "_mismatch");
}

function normalizedReason(value: unknown, field: string): string {
  if (typeof value !== "string" || !CONTROL_REASON.test(value)) {
    throw new Error("invalid_" + field);
  }
  return value;
}

export function normalizeWorkerControlState(input: {
  mode: WorkerControlMode;
  effectiveAt: string;
  reason: string;
}): WorkerControlState {
  if (!CONTROL_MODES.has(input.mode)) throw new Error("invalid_worker_control_mode");
  const effectiveAt = timestamp(input.effectiveAt, "worker_control_effective_at");
  const reason = normalizedReason(input.reason, "worker_control_reason");
  const safety = workerControlObservabilityCapability();
  const identity = {
    mode: input.mode,
    effectiveAt,
    reason,
    safety,
  };
  const controlFingerprint = stableHash({
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    purpose: "worker_control_state",
    ...identity,
  });
  return {
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    controlId: "wcs-" + controlFingerprint.slice(0, 24),
    controlFingerprint,
    ...identity,
  };
}

function validateWorkerControlState(state: WorkerControlState): WorkerControlState {
  if (state.version !== WORKER_CONTROL_OBSERVABILITY_VERSION) {
    throw new Error("unsupported_worker_control_state_version");
  }
  if (typeof state.controlId !== "string" || !/^wcs-[0-9a-f]{24}$/.test(state.controlId)) {
    throw new Error("invalid_worker_control_id");
  }
  exactFingerprint(state.controlFingerprint, "worker_control_fingerprint");
  exactSafety(state.safety, workerControlObservabilityCapability(), "worker_control_safety");
  const rebuilt = normalizeWorkerControlState({
    mode: state.mode,
    effectiveAt: state.effectiveAt,
    reason: state.reason,
  });
  if (stableJson(rebuilt) !== stableJson(state)) {
    throw new Error("worker_control_state_identity_mismatch");
  }
  return rebuilt;
}

export function projectWorkerControlTransition(input: {
  currentMode: WorkerControlMode;
  action: WorkerControlAction;
  requestedAt: string;
  inFlightCount: number;
  reason: string;
}): WorkerControlTransition {
  if (!CONTROL_MODES.has(input.currentMode)) throw new Error("invalid_worker_control_mode");
  if (!CONTROL_ACTIONS.has(input.action)) throw new Error("invalid_worker_control_action");
  const requestedAt = timestamp(input.requestedAt, "worker_control_requested_at");
  const inFlightCount = integer(
    input.inFlightCount,
    0,
    WORKER_CONTROL_MAX_ITEMS,
    "in_flight_count",
  );
  const reason = normalizedReason(input.reason, "worker_control_transition_reason");

  let toMode: WorkerControlMode;
  if (input.action === "kill") {
    toMode = "killed";
  } else if (input.currentMode === "killed") {
    throw new Error("killed_requires_recovery_review");
  } else if (input.action === "pause") {
    if (input.currentMode === "draining" || input.currentMode === "drained") {
      throw new Error("drain_precedence_blocks_pause");
    }
    toMode = "paused";
  } else if (input.action === "drain") {
    toMode = inFlightCount === 0 ? "drained" : "draining";
  } else {
    if (input.currentMode === "draining" && inFlightCount > 0) {
      throw new Error("drain_not_complete");
    }
    toMode = "running";
  }

  const safety = workerControlObservabilityCapability();
  const identity = {
    lifecycle: "proposed_review" as const,
    fromMode: input.currentMode,
    action: input.action,
    toMode,
    requestedAt,
    inFlightCount,
    reason,
    safety,
  };
  const transitionFingerprint = stableHash({
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    purpose: "worker_control_transition",
    ...identity,
  });
  return {
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    transitionId: "wct-" + transitionFingerprint.slice(0, 24),
    transitionFingerprint,
    ...identity,
  };
}

export function normalizeWorkerHeartbeatPolicy(
  policy: WorkerHeartbeatPolicy,
): WorkerHeartbeatPolicy {
  return {
    staleAfterMinutes: integer(
      policy.staleAfterMinutes,
      1,
      WORKER_CONTROL_MAX_HEARTBEAT_STALE_MINUTES,
      "heartbeat_stale_after_minutes",
    ),
  };
}

function inFlightIdentity(
  observation: Omit<
    WorkerInFlightObservation,
    "version" | "inFlightId" | "inFlightFingerprint"
  >,
) {
  return observation;
}

function validateInFlightSemantics(input: {
  artifact: ReturnType<typeof normalizeFailureControlArtifact>;
  attemptNumber: number;
  claimedAt: string;
  executionStartedAt: string | null;
  lastHeartbeatAt: string;
  executionEvidence: WorkerExecutionEvidence;
}) {
  const attemptNumber = integer(
    input.attemptNumber,
    1,
    32,
    "worker_in_flight_attempt_number",
  );
  const claimedAt = timestamp(input.claimedAt, "worker_claimed_at");
  const executionStartedAt = input.executionStartedAt === null
    ? null
    : timestamp(input.executionStartedAt, "worker_execution_started_at");
  const lastHeartbeatAt = timestamp(input.lastHeartbeatAt, "worker_last_heartbeat_at");
  if (!EXECUTION_EVIDENCE.has(input.executionEvidence)) {
    throw new Error("invalid_worker_execution_evidence");
  }
  if (Date.parse(claimedAt) < Date.parse(input.artifact.slotAt)) {
    throw new Error("worker_claim_before_original_slot");
  }
  if (Date.parse(claimedAt) >= Date.parse(input.artifact.expiresAt)) {
    throw new Error("worker_claim_outside_original_window");
  }
  if (executionStartedAt && Date.parse(executionStartedAt) < Date.parse(claimedAt)) {
    throw new Error("worker_execution_before_claim");
  }
  if (Date.parse(lastHeartbeatAt) < Date.parse(executionStartedAt ?? claimedAt)) {
    throw new Error("worker_heartbeat_before_execution_state");
  }
  if (
    input.executionEvidence === "confirmed_not_started"
    && executionStartedAt !== null
  ) throw new Error("confirmed_not_started_has_execution_timestamp");
  if (
    input.executionEvidence === "execution_started"
    && executionStartedAt === null
  ) throw new Error("execution_started_missing_timestamp");
  return {
    attemptNumber,
    claimedAt,
    executionStartedAt,
    lastHeartbeatAt,
    executionEvidence: input.executionEvidence,
  };
}

export function buildWorkerInFlightObservation(input: {
  artifact: FailureControlArtifactInput;
  attemptNumber: number;
  claimedAt: string;
  executionStartedAt?: string | null;
  lastHeartbeatAt: string;
  executionEvidence: WorkerExecutionEvidence;
}): WorkerInFlightObservation {
  const artifact = normalizeFailureControlArtifact(input.artifact);
  const semantics = validateInFlightSemantics({
    artifact,
    attemptNumber: input.attemptNumber,
    claimedAt: input.claimedAt,
    executionStartedAt: input.executionStartedAt ?? null,
    lastHeartbeatAt: input.lastHeartbeatAt,
    executionEvidence: input.executionEvidence,
  });
  const safety = workerControlObservabilityCapability();
  const identity = inFlightIdentity({
    artifactReferenceFingerprint: artifact.artifactReferenceFingerprint,
    idempotencyKey: artifact.idempotencyKey,
    ...semantics,
    safety,
  });
  const inFlightFingerprint = stableHash({
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    purpose: "worker_in_flight_observation",
    ...identity,
  });
  return {
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    inFlightId: "wif-" + inFlightFingerprint.slice(0, 24),
    inFlightFingerprint,
    ...identity,
  };
}

function validateInFlightObservation(input: {
  observation: WorkerInFlightObservation;
  artifact: ReturnType<typeof normalizeFailureControlArtifact>;
  now: string;
}): WorkerInFlightObservation {
  const observation = input.observation;
  if (observation.version !== WORKER_CONTROL_OBSERVABILITY_VERSION) {
    throw new Error("unsupported_worker_in_flight_version");
  }
  if (
    typeof observation.inFlightId !== "string"
    || !/^wif-[0-9a-f]{24}$/.test(observation.inFlightId)
  ) throw new Error("invalid_worker_in_flight_id");
  exactFingerprint(observation.inFlightFingerprint, "worker_in_flight_fingerprint");
  if (
    observation.artifactReferenceFingerprint !== input.artifact.artifactReferenceFingerprint
    || observation.idempotencyKey !== input.artifact.idempotencyKey
  ) throw new Error("worker_in_flight_artifact_mismatch");
  exactSafety(
    observation.safety,
    workerControlObservabilityCapability(),
    "worker_in_flight_safety",
  );

  const semantics = validateInFlightSemantics({
    artifact: input.artifact,
    attemptNumber: observation.attemptNumber,
    claimedAt: observation.claimedAt,
    executionStartedAt: observation.executionStartedAt,
    lastHeartbeatAt: observation.lastHeartbeatAt,
    executionEvidence: observation.executionEvidence,
  });
  if (Date.parse(semantics.claimedAt) > Date.parse(input.now)) {
    throw new Error("worker_claim_in_future");
  }
  if (
    semantics.executionStartedAt
    && Date.parse(semantics.executionStartedAt) > Date.parse(input.now)
  ) throw new Error("worker_execution_start_in_future");
  if (Date.parse(semantics.lastHeartbeatAt) > Date.parse(input.now)) {
    throw new Error("worker_heartbeat_in_future");
  }

  const identity = inFlightIdentity({
    artifactReferenceFingerprint: observation.artifactReferenceFingerprint,
    idempotencyKey: observation.idempotencyKey,
    ...semantics,
    safety: observation.safety,
  });
  const expectedFingerprint = stableHash({
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    purpose: "worker_in_flight_observation",
    ...identity,
  });
  if (
    observation.inFlightFingerprint !== expectedFingerprint
    || observation.inFlightId !== "wif-" + expectedFingerprint.slice(0, 24)
  ) throw new Error("worker_in_flight_identity_mismatch");
  return observation;
}

function isNoWorkArtifact(artifact: FailureControlArtifactInput): boolean {
  return artifact.kind === "p9_3_scheduled_crawl_candidate"
    && artifact.candidate.selection === "no_work";
}

function expectedInFlightAttempt(input: {
  item: WorkerControlWorkItem;
  claimedAt: string;
}) {
  const projection = projectFailureRetryDeadLetterControl({
    artifact: input.item.artifact,
    attempts: input.item.attempts ?? [],
    policy: input.item.failurePolicy,
    now: input.claimedAt,
  });
  if (projection.state === "unattempted") {
    return { attemptNumber: 1, projection };
  }
  if (
    projection.state === "retry_review"
    && projection.retryIntent
    && projection.retryIntent.eligibility === "eligible_for_review"
  ) {
    return {
      attemptNumber: projection.retryIntent.nextAttemptNumber,
      projection,
    };
  }
  throw new Error("worker_claim_not_eligible_under_p9_5");
}

function buildKillReconciliation(input: {
  artifact: ReturnType<typeof normalizeFailureControlArtifact>;
  inFlight: WorkerInFlightObservation;
  checkedAt: string;
}): WorkerKillReconciliation {
  let disposition: WorkerKillReconciliationDisposition;
  let reason:
    | "killed_before_execution"
    | "killed_before_execution_window_expired"
    | "killed_in_flight_outcome_uncertain";
  let requiresManualIntervention: boolean;

  if (input.inFlight.executionEvidence === "confirmed_not_started") {
    if (Date.parse(input.checkedAt) < Date.parse(input.artifact.expiresAt)) {
      disposition = "confirmed_not_started_reviewable_after_recovery";
      reason = "killed_before_execution";
    } else {
      disposition = "confirmed_not_started_dead_letter_review";
      reason = "killed_before_execution_window_expired";
    }
    requiresManualIntervention = false;
  } else {
    disposition = "manual_intervention_required";
    reason = "killed_in_flight_outcome_uncertain";
    requiresManualIntervention = true;
  }

  const safety = workerControlObservabilityCapability();
  const identity = {
    lifecycle: "proposed_review" as const,
    artifactReferenceFingerprint: input.artifact.artifactReferenceFingerprint,
    idempotencyKey: input.artifact.idempotencyKey,
    inFlightId: input.inFlight.inFlightId,
    inFlightFingerprint: input.inFlight.inFlightFingerprint,
    attemptNumber: input.inFlight.attemptNumber,
    disposition,
    reason,
    requiresManualIntervention,
    retryDispatchAuthorized: false as const,
    checkedAt: input.checkedAt,
    safety,
  };
  const reconciliationFingerprint = stableHash({
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    purpose: "worker_kill_reconciliation",
    ...identity,
  });
  return {
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    reconciliationId: "wkr-" + reconciliationFingerprint.slice(0, 24),
    reconciliationFingerprint,
    ...identity,
  };
}

function heartbeatFreshness(input: {
  observation: WorkerInFlightObservation;
  checkedAt: string;
  policy: WorkerHeartbeatPolicy;
}) {
  const ageMinutes = Math.floor(
    (Date.parse(input.checkedAt) - Date.parse(input.observation.lastHeartbeatAt)) / 60_000,
  );
  if (ageMinutes < 0) throw new Error("worker_heartbeat_in_future");
  return {
    state: ageMinutes >= input.policy.staleAfterMinutes
      ? "stale" as const
      : "fresh" as const,
    ageMinutes,
    staleAfterMinutes: input.policy.staleAfterMinutes,
  };
}

function itemDisposition(input: {
  mode: WorkerControlMode;
  noWork: boolean;
  inFlight: WorkerInFlightObservation | null;
  failureProjection: ReturnType<typeof projectFailureRetryDeadLetterControl> | null;
}): WorkerControlItemDisposition {
  if (input.noWork) return "no_work_terminal";
  if (input.inFlight) {
    if (input.mode === "running") return "in_flight_running";
    if (input.mode === "paused" || input.mode === "draining") {
      return "in_flight_continuing";
    }
    if (input.mode === "killed") return "in_flight_kill_reconciliation";
    throw new Error("drained_mode_cannot_have_in_flight_work");
  }
  const projection = input.failureProjection;
  if (!projection) throw new Error("failure_projection_missing");
  if (projection.state === "succeeded") return "succeeded_terminal";
  if (projection.state === "dead_letter_review") return "dead_letter_terminal";

  if (input.mode !== "running") {
    return projection.state === "retry_review"
      ? "retry_held_by_control"
      : "held_by_control";
  }
  if (projection.state === "unattempted") return "control_review_open";
  if (projection.state === "retry_review") {
    return projection.retryIntent?.eligibility === "eligible_for_review"
      ? "retry_review_open"
      : "retry_waiting";
  }
  throw new Error("unsupported_failure_projection_state");
}

export function projectWorkerControlObservability(input: {
  control: WorkerControlState;
  items: WorkerControlWorkItem[];
  heartbeatPolicy: WorkerHeartbeatPolicy;
  now: string;
}) {
  const control = validateWorkerControlState(input.control);
  const checkedAt = timestamp(input.now, "worker_observability_now");
  if (Date.parse(control.effectiveAt) > Date.parse(checkedAt)) {
    throw new Error("worker_control_effective_time_in_future");
  }
  if (!Array.isArray(input.items) || input.items.length > WORKER_CONTROL_MAX_ITEMS) {
    throw new Error("invalid_worker_control_item_count");
  }
  const heartbeatPolicy = normalizeWorkerHeartbeatPolicy(input.heartbeatPolicy);
  const safety = workerControlObservabilityCapability();

  const artifactKeys = new Set<string>();
  const inFlightIds = new Set<string>();

  const items = input.items.map((item) => {
    const artifact = normalizeFailureControlArtifact(item.artifact);
    if (artifactKeys.has(artifact.artifactReferenceFingerprint)) {
      throw new Error("duplicate_worker_control_artifact");
    }
    artifactKeys.add(artifact.artifactReferenceFingerprint);

    const noWork = isNoWorkArtifact(item.artifact);
    if (noWork && ((item.attempts?.length ?? 0) > 0 || item.inFlight)) {
      throw new Error("no_work_execution_history_forbidden");
    }

    const inFlight = item.inFlight
      ? validateInFlightObservation({
          observation: item.inFlight,
          artifact,
          now: checkedAt,
        })
      : null;

    let failureProjection:
      | ReturnType<typeof projectFailureRetryDeadLetterControl>
      | null = null;
    let heartbeat:
      | ReturnType<typeof heartbeatFreshness>
      | null = null;
    let killReconciliation: WorkerKillReconciliation | null = null;

    if (inFlight) {
      if (inFlightIds.has(inFlight.inFlightId)) throw new Error("duplicate_worker_in_flight_id");
      inFlightIds.add(inFlight.inFlightId);
      const expected = expectedInFlightAttempt({
        item,
        claimedAt: inFlight.claimedAt,
      });
      if (inFlight.attemptNumber !== expected.attemptNumber) {
        throw new Error("worker_in_flight_attempt_number_mismatch");
      }
      if (
        control.mode !== "running"
        && Date.parse(inFlight.claimedAt) >= Date.parse(control.effectiveAt)
      ) throw new Error("worker_claim_after_control_effective");
      heartbeat = heartbeatFreshness({
        observation: inFlight,
        checkedAt,
        policy: heartbeatPolicy,
      });
      if (control.mode === "killed") {
        killReconciliation = buildKillReconciliation({
          artifact,
          inFlight,
          checkedAt,
        });
      }
    } else {
      failureProjection = projectFailureRetryDeadLetterControl({
        artifact: item.artifact,
        attempts: item.attempts ?? [],
        policy: item.failurePolicy,
        now: checkedAt,
      });
    }

    return {
      artifact,
      p9_5Version: failureRetryDeadLetterCapability().version,
      p9_5State: inFlight ? "in_flight" as const : failureProjection!.state,
      attemptCount: item.attempts?.length ?? 0,
      disposition: itemDisposition({
        mode: control.mode,
        noWork,
        inFlight,
        failureProjection,
      }),
      retryEligibility: failureProjection?.retryIntent?.eligibility ?? null,
      inFlight,
      heartbeat,
      killReconciliation,
    };
  }).sort((a, b) =>
    a.artifact.artifactReferenceFingerprint.localeCompare(
      b.artifact.artifactReferenceFingerprint,
    )
  );

  const inFlightCount = items.filter((item) => item.inFlight !== null).length;
  if (control.mode === "drained" && inFlightCount !== 0) {
    throw new Error("drained_mode_cannot_have_in_flight_work");
  }
  const effectiveMode: WorkerControlMode =
    control.mode === "draining" && inFlightCount === 0
      ? "drained"
      : control.mode;

  const staleHeartbeatCount = items.filter(
    (item) => item.heartbeat?.state === "stale",
  ).length;
  const unreconciledKilledCount = items.filter(
    (item) => item.killReconciliation?.requiresManualIntervention === true,
  ).length;

  const counts = {
    items: items.length,
    controlReviewOpen: items.filter((item) => item.disposition === "control_review_open").length,
    retryWaiting: items.filter((item) => item.disposition === "retry_waiting").length,
    retryReviewOpen: items.filter((item) => item.disposition === "retry_review_open").length,
    heldByControl: items.filter((item) =>
      item.disposition === "held_by_control"
      || item.disposition === "retry_held_by_control"
    ).length,
    inFlight: inFlightCount,
    staleHeartbeats: staleHeartbeatCount,
    succeeded: items.filter((item) => item.disposition === "succeeded_terminal").length,
    deadLetterReview: items.filter((item) => item.disposition === "dead_letter_terminal").length,
    noWork: items.filter((item) => item.disposition === "no_work_terminal").length,
    killReconciliations: items.filter((item) => item.killReconciliation !== null).length,
    unreconciledKilled: unreconciledKilledCount,
  };

  const controls = {
    admissionReviewAllowed: effectiveMode === "running",
    newClaimReviewAllowed: effectiveMode === "running",
    retryDispatchReviewAllowed: effectiveMode === "running",
    inFlightContinuationReviewAllowed:
      effectiveMode === "running"
      || effectiveMode === "paused"
      || effectiveMode === "draining",
    cancellationRequested: effectiveMode === "killed",
    requiresKillRecoveryReview: effectiveMode === "killed",
    deadLetterReactivationAllowed: false as const,
    catchUpBackfillAllowed: false as const,
    attemptResetAllowed: false as const,
    idempotencyResetAllowed: false as const,
    workWindowExtensionAllowed: false as const,
  };

  let health: WorkerControlHealth;
  if (effectiveMode === "killed") {
    health = unreconciledKilledCount > 0 ? "blocked_recovery" : "killed";
  } else if (effectiveMode === "drained") {
    health = "drained";
  } else if (effectiveMode === "draining") {
    health = "quiescing";
  } else if (effectiveMode === "paused") {
    health = "paused";
  } else {
    health = staleHeartbeatCount > 0 ? "degraded" : "healthy";
  }

  const projectionFingerprint = stableHash({
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    checkedAt,
    control,
    effectiveMode,
    heartbeatPolicy,
    items,
    counts,
    controls,
    health,
    safety,
  });

  return {
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    projectionFingerprint,
    checkedAt,
    control,
    effectiveMode,
    heartbeatPolicy,
    health,
    counts,
    controls,
    items,
    safety,
  };
}

export function workerControlObservabilityCapability() {
  return Object.freeze({
    version: WORKER_CONTROL_OBSERVABILITY_VERSION,
    architectureOnly: true as const,
    deterministicProjectionOnly: true as const,
    suppliedWorkerStateOnly: true as const,
    observabilityOnly: true as const,
    pauseReviewOnly: true as const,
    drainReviewOnly: true as const,
    killReviewOnly: true as const,
    resumeReviewOnly: true as const,
    killOverridesDrain: true as const,
    drainOverridesPause: true as const,
    pauseAllowsInFlightContinuation: true as const,
    drainAllowsInFlightContinuation: true as const,
    killRequiresInFlightReconciliation: true as const,
    killedRequiresRecoveryReviewBeforeResume: true as const,
    deadLetterReactivationAllowed: false as const,
    catchUpBackfillAllowed: false as const,
    attemptResetAllowed: false as const,
    idempotencyResetAllowed: false as const,
    workWindowExtensionAllowed: false as const,
    wallClockAccess: false as const,
    timerActivated: false as const,
    schedulerActivated: false as const,
    liveWorkerEnabled: false as const,
    liveRetryLoopEnabled: false as const,
    durableControlStateAuthorized: false as const,
    durableEnqueueAuthorized: false as const,
    queueReservationAuthorized: false as const,
    durableDeadLetterStoreAuthorized: false as const,
    batchExecutorEnabled: false as const,
    task69PacketMaterializationAuthorized: false as const,
    task70ExecutionAuthorized: false as const,
    credentialUseAuthorized: false as const,
    oauthUseAuthorized: false as const,
    providerNetworkReadAuthorized: false as const,
    crawlNetworkReadAuthorized: false as const,
    crawlExecutionAuthorized: false as const,
    observationPersistenceAuthorized: false as const,
    evidencePersistenceAuthorized: false as const,
    productionDbReadAuthorized: false as const,
    productionDbWriteAuthorized: false as const,
    providerWrites: false as const,
    publicSiteWrites: false as const,
    task53ExecutionAuthorized: false as const,
    task54ExecutionAuthorized: false as const,
    automaticTransition: false as const,
    publicationAuthorized: false as const,
  });
}
