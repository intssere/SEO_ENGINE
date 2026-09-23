import { createHash } from "node:crypto";
import {
  pairP88W03W04DurableReservation,
  type P88W04DurableReservationReceipt,
  type P88W04W03DurablePairing,
} from "./p8-8-reservation-store.js";
import type {
  P88W03PolicyAuthorizationArtifact,
} from "./p8-8-policy-authorization.js";
import type {
  WorkerControlAction,
  WorkerControlMode,
} from "./worker-control-observability.js";

export const P8_8_W05_CONTROL_VERSION = "p8-8-w05-control-v1" as const;
export const P8_8_W05_CONTROL_EVENT_VERSION =
  "p8-8-w05-control-event-v1" as const;
export const P8_8_W05_CLAIM_VERSION = "p8-8-w05-control-claim-v1" as const;
export const P8_8_W05_CONTROL_DECISION_VERSION =
  "p8-8-w05-control-decision-v1" as const;

export type P88W05ControlMode = WorkerControlMode;
export type P88W05ControlAction = WorkerControlAction;
export type P88W05ControlEventAction = P88W05ControlAction | "initialize";
export type P88W05ExecutionPhase =
  | "pre_dispatch_proven"
  | "side_effect_possible"
  | "safety_closure_in_progress"
  | "terminal_verified"
  | "manual_intervention_required";

export type P88W05ControlState = Readonly<{
  version: typeof P8_8_W05_CONTROL_VERSION;
  siteId: string;
  revision: number;
  previousControlFingerprint: string | null;
  mode: P88W05ControlMode;
  effectiveAt: string;
  controlFingerprint: string;
  durable: true;
  providerDispatchAuthorized: false;
  publicSiteWrites: false;
}>;

export type P88W05ControlEvent = Readonly<{
  version: typeof P8_8_W05_CONTROL_EVENT_VERSION;
  eventId: string;
  eventFingerprint: string;
  siteId: string;
  fromRevision: number | null;
  fromControlFingerprint: string | null;
  fromMode: P88W05ControlMode | null;
  action: P88W05ControlEventAction;
  toRevision: number;
  toControlFingerprint: string;
  toMode: P88W05ControlMode;
  effectiveAt: string;
  providerDispatchAuthorized: false;
  publicSiteWrites: false;
}>;

export type P88W05ControlProjection = Readonly<{
  state: P88W05ControlState;
  event: P88W05ControlEvent;
}>;

export type P88W05ClaimIntent = Readonly<{
  version: typeof P8_8_W05_CLAIM_VERSION;
  claimId: string;
  claimFingerprint: string;
  reservationId: string;
  reservationFingerprint: string;
  w03AuthorizationId: string;
  w03AuthorizationFingerprint: string;
  policyActionId: string;
  siteId: string;
  controlRevision: number;
  controlFingerprint: string;
  target: Readonly<{
    resourceGid: string;
    targetUrl: string;
    field: "meta_description";
  }>;
  state: Readonly<{
    beforeFingerprint: string;
    afterFingerprint: string;
  }>;
  providerDispatchAuthorized: false;
  providerWriteAllowed: false;
  publicSiteWrites: false;
  task51Authorized: false;
  task54ExecutionAuthorized: false;
  automaticTransition: false;
}>;

export type P88W05ControlDecision = Readonly<{
  version: typeof P8_8_W05_CONTROL_DECISION_VERSION;
  siteId: string;
  controlRevision: number;
  controlFingerprint: string;
  mode: P88W05ControlMode;
  executionPhase: P88W05ExecutionPhase;
  claimEligible: boolean;
  newForwardMutationBlocked: boolean;
  safetyClosureRequired: boolean;
  providerDispatchAuthorized: false;
  providerWriteAllowed: false;
  publicSiteWrites: false;
  task51Authorized: false;
  task54ExecutionAuthorized: false;
  automaticTransition: false;
  decisionFingerprint: string;
}>;

const CONTROL_MODES = new Set<P88W05ControlMode>([
  "running",
  "paused",
  "draining",
  "drained",
  "killed",
]);
const CONTROL_ACTIONS = new Set<P88W05ControlAction>([
  "pause",
  "drain",
  "kill",
  "resume",
]);
const EXECUTION_PHASES = new Set<P88W05ExecutionPhase>([
  "pre_dispatch_proven",
  "side_effect_possible",
  "safety_closure_in_progress",
  "terminal_verified",
  "manual_intervention_required",
]);
const HEX_64 = /^[0-9a-f]{64}$/;
const SITE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function canonicalIso(value: string, code: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    throw new Error(code);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error(code);
  return new Date(milliseconds).toISOString();
}

function exactSiteId(value: string): string {
  if (!SITE_ID.test(value)) throw new Error("p88_w05_site_id_invalid");
  return value.toLowerCase();
}

function exactRevision(value: number, code: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(code);
  return value;
}

function exactFingerprint(value: string, code: string): string {
  if (!HEX_64.test(value)) throw new Error(code);
  return value;
}

function stateBase(input: {
  siteId: string;
  revision: number;
  previousControlFingerprint: string | null;
  mode: P88W05ControlMode;
  effectiveAt: string;
}) {
  if (!CONTROL_MODES.has(input.mode)) {
    throw new Error("p88_w05_control_mode_invalid");
  }
  const previousControlFingerprint =
    input.previousControlFingerprint === null
      ? null
      : exactFingerprint(
        input.previousControlFingerprint,
        "p88_w05_previous_control_fingerprint_invalid",
      );
  return {
    version: P8_8_W05_CONTROL_VERSION,
    siteId: exactSiteId(input.siteId),
    revision: exactRevision(input.revision, "p88_w05_control_revision_invalid"),
    previousControlFingerprint,
    mode: input.mode,
    effectiveAt: canonicalIso(input.effectiveAt, "p88_w05_effective_at_invalid"),
    durable: true as const,
    providerDispatchAuthorized: false as const,
    publicSiteWrites: false as const,
  };
}

function buildState(input: {
  siteId: string;
  revision: number;
  previousControlFingerprint: string | null;
  mode: P88W05ControlMode;
  effectiveAt: string;
}): P88W05ControlState {
  const base = stateBase(input);
  const controlFingerprint = stableHash({
    purpose: "p8.8_w05_durable_control_state",
    ...base,
  });
  return deepFreeze({
    ...base,
    controlFingerprint,
  });
}

export function initializeP88W05ControlState(input: {
  siteId: string;
  mode: P88W05ControlMode;
  effectiveAt: string;
}): P88W05ControlProjection {
  const state = buildState({
    siteId: input.siteId,
    revision: 1,
    previousControlFingerprint: null,
    mode: input.mode,
    effectiveAt: input.effectiveAt,
  });
  const eventBase = {
    version: P8_8_W05_CONTROL_EVENT_VERSION,
    siteId: state.siteId,
    fromRevision: null,
    fromControlFingerprint: null,
    fromMode: null,
    action: "initialize" as const,
    toRevision: state.revision,
    toControlFingerprint: state.controlFingerprint,
    toMode: state.mode,
    effectiveAt: state.effectiveAt,
    providerDispatchAuthorized: false as const,
    publicSiteWrites: false as const,
  };
  const eventFingerprint = stableHash({
    purpose: "p8.8_w05_control_event",
    ...eventBase,
  });
  return deepFreeze({
    state,
    event: {
      ...eventBase,
      eventId: "p88w05-event-" + eventFingerprint.slice(0, 24),
      eventFingerprint,
    },
  });
}

export function assertP88W05ControlStateIntegrity(
  state: P88W05ControlState,
): void {
  const rebuilt = buildState({
    siteId: state.siteId,
    revision: state.revision,
    previousControlFingerprint: state.previousControlFingerprint,
    mode: state.mode,
    effectiveAt: state.effectiveAt,
  });
  if (stableJson(rebuilt) !== stableJson(state)) {
    throw new Error("p88_w05_control_state_integrity_mismatch");
  }
}

export function projectP88W05ControlTransition(input: {
  current: P88W05ControlState;
  action: P88W05ControlAction;
  effectiveAt: string;
  unresolvedBlockingCount: number;
}): P88W05ControlProjection {
  assertP88W05ControlStateIntegrity(input.current);
  if (!CONTROL_ACTIONS.has(input.action)) {
    throw new Error("p88_w05_control_action_invalid");
  }
  if (
    !Number.isSafeInteger(input.unresolvedBlockingCount)
    || input.unresolvedBlockingCount < 0
  ) {
    throw new Error("p88_w05_unresolved_blocking_count_invalid");
  }

  let toMode: P88W05ControlMode;
  if (input.action === "kill") {
    toMode = "killed";
  } else if (input.current.mode === "killed") {
    throw new Error("p88_w05_killed_requires_recovery_review");
  } else if (input.action === "pause") {
    if (
      input.current.mode === "draining"
      || input.current.mode === "drained"
    ) {
      throw new Error("p88_w05_drain_precedence_blocks_pause");
    }
    toMode = "paused";
  } else if (input.action === "drain") {
    toMode =
      input.unresolvedBlockingCount === 0 ? "drained" : "draining";
  } else {
    if (input.unresolvedBlockingCount > 0) {
      throw new Error("p88_w05_resume_blocked_by_unresolved_mutation");
    }
    if (
      input.current.mode !== "paused"
      && input.current.mode !== "drained"
      && input.current.mode !== "draining"
    ) {
      throw new Error("p88_w05_resume_source_invalid");
    }
    toMode = "running";
  }

  const effectiveAt = canonicalIso(
    input.effectiveAt,
    "p88_w05_effective_at_invalid",
  );
  if (Date.parse(effectiveAt) < Date.parse(input.current.effectiveAt)) {
    throw new Error("p88_w05_control_time_regression");
  }
  const state = buildState({
    siteId: input.current.siteId,
    revision: input.current.revision + 1,
    previousControlFingerprint: input.current.controlFingerprint,
    mode: toMode,
    effectiveAt,
  });
  const eventBase = {
    version: P8_8_W05_CONTROL_EVENT_VERSION,
    siteId: state.siteId,
    fromRevision: input.current.revision,
    fromControlFingerprint: input.current.controlFingerprint,
    fromMode: input.current.mode,
    action: input.action,
    toRevision: state.revision,
    toControlFingerprint: state.controlFingerprint,
    toMode: state.mode,
    effectiveAt: state.effectiveAt,
    providerDispatchAuthorized: false as const,
    publicSiteWrites: false as const,
  };
  const eventFingerprint = stableHash({
    purpose: "p8.8_w05_control_event",
    ...eventBase,
  });
  return deepFreeze({
    state,
    event: {
      ...eventBase,
      eventId: "p88w05-event-" + eventFingerprint.slice(0, 24),
      eventFingerprint,
    },
  });
}

export function assertP88W05ControlEventIntegrity(
  event: P88W05ControlEvent,
): void {
  if (event.action === "initialize") {
    const rebuilt = initializeP88W05ControlState({
      siteId: event.siteId,
      mode: event.toMode,
      effectiveAt: event.effectiveAt,
    }).event;
    if (stableJson(rebuilt) !== stableJson(event)) {
      throw new Error("p88_w05_control_event_integrity_mismatch");
    }
    return;
  }
  if (event.fromRevision === null || event.fromControlFingerprint === null) {
    throw new Error("p88_w05_control_event_missing_parent");
  }
  exactFingerprint(
    event.fromControlFingerprint,
    "p88_w05_control_event_parent_invalid",
  );
  exactFingerprint(
    event.toControlFingerprint,
    "p88_w05_control_event_target_invalid",
  );
  exactFingerprint(
    event.eventFingerprint,
    "p88_w05_control_event_fingerprint_invalid",
  );
  const eventBase = {
    version: P8_8_W05_CONTROL_EVENT_VERSION,
    siteId: exactSiteId(event.siteId),
    fromRevision: exactRevision(
      event.fromRevision,
      "p88_w05_control_event_from_revision_invalid",
    ),
    fromControlFingerprint: event.fromControlFingerprint,
    fromMode: event.fromMode,
    action: event.action,
    toRevision: exactRevision(
      event.toRevision,
      "p88_w05_control_event_to_revision_invalid",
    ),
    toControlFingerprint: event.toControlFingerprint,
    toMode: event.toMode,
    effectiveAt: canonicalIso(
      event.effectiveAt,
      "p88_w05_control_event_time_invalid",
    ),
    providerDispatchAuthorized: false as const,
    publicSiteWrites: false as const,
  };
  const expected = stableHash({
    purpose: "p8.8_w05_control_event",
    ...eventBase,
  });
  if (
    expected !== event.eventFingerprint
    || event.eventId !== "p88w05-event-" + expected.slice(0, 24)
  ) {
    throw new Error("p88_w05_control_event_integrity_mismatch");
  }
}

export function projectP88W05ClaimIntent(input: {
  w03Authorization: P88W03PolicyAuthorizationArtifact;
  w04Receipt: P88W04DurableReservationReceipt;
  control: P88W05ControlState;
}): P88W05ClaimIntent {
  assertP88W05ControlStateIntegrity(input.control);
  if (input.control.mode !== "running") {
    throw new Error("p88_w05_control_not_running");
  }
  const pairing: P88W04W03DurablePairing =
    pairP88W03W04DurableReservation(
      input.w03Authorization,
      input.w04Receipt,
    );
  if (pairing.policyAwareControlEligible !== true) {
    throw new Error("p88_w05_w03_w04_pair_not_control_eligible");
  }
  if (input.control.siteId !== input.w04Receipt.siteId) {
    throw new Error("p88_w05_control_site_mismatch");
  }
  const base = {
    version: P8_8_W05_CLAIM_VERSION,
    reservationId: pairing.reservationId,
    reservationFingerprint: pairing.reservationFingerprint,
    w03AuthorizationId: pairing.w03AuthorizationId,
    w03AuthorizationFingerprint: pairing.w03AuthorizationFingerprint,
    policyActionId: pairing.policyActionId,
    siteId: input.control.siteId,
    controlRevision: input.control.revision,
    controlFingerprint: input.control.controlFingerprint,
    target: {
      resourceGid: input.w03Authorization.target.resourceGid,
      targetUrl: input.w03Authorization.target.targetUrl,
      field: "meta_description" as const,
    },
    state: {
      beforeFingerprint: input.w03Authorization.state.beforeFingerprint,
      afterFingerprint: input.w03Authorization.state.afterFingerprint,
    },
    providerDispatchAuthorized: false as const,
    providerWriteAllowed: false as const,
    publicSiteWrites: false as const,
    task51Authorized: false as const,
    task54ExecutionAuthorized: false as const,
    automaticTransition: false as const,
  };
  const claimFingerprint = stableHash({
    purpose: "p8.8_w05_control_claim",
    ...base,
  });
  return deepFreeze({
    ...base,
    claimId: "p88w05-claim-" + claimFingerprint.slice(0, 24),
    claimFingerprint,
  });
}

export function projectP88W05ControlDecision(input: {
  control: P88W05ControlState;
  executionPhase: P88W05ExecutionPhase;
}): P88W05ControlDecision {
  assertP88W05ControlStateIntegrity(input.control);
  if (!EXECUTION_PHASES.has(input.executionPhase)) {
    throw new Error("p88_w05_execution_phase_invalid");
  }
  const claimEligible =
    input.control.mode === "running"
    && input.executionPhase === "pre_dispatch_proven";
  const safetyClosureRequired =
    input.executionPhase === "side_effect_possible"
    || input.executionPhase === "safety_closure_in_progress"
    || input.executionPhase === "manual_intervention_required";
  const base = {
    version: P8_8_W05_CONTROL_DECISION_VERSION,
    siteId: input.control.siteId,
    controlRevision: input.control.revision,
    controlFingerprint: input.control.controlFingerprint,
    mode: input.control.mode,
    executionPhase: input.executionPhase,
    claimEligible,
    newForwardMutationBlocked: !claimEligible,
    safetyClosureRequired,
    providerDispatchAuthorized: false as const,
    providerWriteAllowed: false as const,
    publicSiteWrites: false as const,
    task51Authorized: false as const,
    task54ExecutionAuthorized: false as const,
    automaticTransition: false as const,
  };
  return deepFreeze({
    ...base,
    decisionFingerprint: stableHash({
      purpose: "p8.8_w05_control_decision",
      ...base,
    }),
  });
}

export function p88W05MutationControlCapability() {
  return deepFreeze({
    version: P8_8_W05_CONTROL_VERSION,
    policyMutationControlOnly: true,
    p96PrecedencePreserved: "kill > drain > pause > running" as const,
    exactW03W04PairRequired: true,
    providerNetworkReadPerformed: false,
    providerWritePerformed: false,
    providerDispatchAuthorized: false,
    publicSiteWritePerformed: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    approvalsRowCreated: false,
    humanActionRowCreated: false,
    schedulerActivated: false,
    workerActivated: false,
    automaticTransition: false,
    productionDdlAuthorized: false,
  });
}
