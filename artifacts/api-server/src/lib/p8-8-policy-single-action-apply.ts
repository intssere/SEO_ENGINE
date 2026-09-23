import { createHash } from "node:crypto";
import {
  assertP88W06ExactArtifactLineage,
  assertP88W06PolicyPreflightIntegrity,
  type P88W06LineageInput,
  type P88W06PolicyPreflight,
} from "./p8-8-policy-preflight.js";

export const P8_8_W07_EXECUTION_VERSION =
  "p8-8-w07-policy-single-action-apply-v1" as const;
export const P8_8_W07_DISPATCH_VERSION =
  "p8-8-w07-policy-dispatch-v1" as const;
export const P8_8_W07_EVENT_VERSION =
  "p8-8-w07-policy-dispatch-event-v1" as const;

export const P8_8_W07_DISPATCH_STATES = [
  "reserved_prewrite",
  "dispatch_started",
  "forward_rejected_no_write",
  "forward_verification_pending",
  "forward_verified_live",
  "rollback_required",
  "rollback_started",
  "rollback_verification_pending",
  "rollback_verified_closed",
  "cancelled_before_dispatch",
  "manual_intervention_required",
] as const;

export type P88W07DispatchState =
  typeof P8_8_W07_DISPATCH_STATES[number];

export type P88W07PublicWriteOccurrence =
  | "none"
  | "possible"
  | "confirmed";

export type P88W07RollbackOccurrence =
  | "none"
  | "possible"
  | "confirmed";

export type P88W07ExecutionInput = Readonly<{
  lineage: P88W06LineageInput;
  w06Preflight: P88W06PolicyPreflight;
}>;

export type P88W07ExecutionIntent = Readonly<{
  version: typeof P8_8_W07_EXECUTION_VERSION;
  executionProvenance: "policy_single_action_apply";
  policyExecutionId: string;
  executionFingerprint: string;
  dispatchId: string;
  dispatchFingerprint: string;
  siteId: string;
  policyId: string;
  policyVersion: string;
  policyFingerprint: string;
  evaluationId: string;
  evaluationFingerprint: string;
  materializationId: string;
  materializationFingerprint: string;
  proposalId: string;
  proposalFingerprint: string;
  w03AuthorizationId: string;
  w03AuthorizationFingerprint: string;
  policyActionId: string;
  reservationId: string;
  reservationFingerprint: string;
  claimId: string;
  claimFingerprint: string;
  w06PreflightId: string;
  w06PreflightFingerprint: string;
  credentialProfileId: string;
  claimedControlRevision: number;
  claimedControlFingerprint: string;
  target: Readonly<{
    provider: "shopify";
    domain: "diamondshelf.us";
    resourceKind: "product";
    resourceGid: string;
    targetUrl: string;
    actionType: "update_meta_description";
    field: "meta_description";
    requiredProviderScope: "write_products";
  }>;
  state: Readonly<{
    beforeValue: string | null;
    afterValue: string | null;
    beforeFingerprint: string;
    afterFingerprint: string;
  }>;
  initialDispatchState: "reserved_prewrite";
  forwardAttemptCount: 0;
  rollbackAttemptCount: 0;
  publicWriteOccurrence: "none";
  rollbackOccurrence: "none";
  safety: ReturnType<typeof p88W07Capability>;
}>;

export type P88W07TransitionInput = Readonly<{
  fromState: P88W07DispatchState;
  toState: P88W07DispatchState;
  forwardAttemptCount: 0 | 1;
  rollbackAttemptCount: 0 | 1;
  publicWriteOccurrence: P88W07PublicWriteOccurrence;
  rollbackOccurrence: P88W07RollbackOccurrence;
}>;

export type P88W07TransitionProjection = Readonly<{
  fromState: P88W07DispatchState;
  toState: P88W07DispatchState;
  forwardAttemptCount: 0 | 1;
  rollbackAttemptCount: 0 | 1;
  publicWriteOccurrence: P88W07PublicWriteOccurrence;
  rollbackOccurrence: P88W07RollbackOccurrence;
}>;

const ALLOWED_TRANSITIONS: Readonly<
  Record<P88W07DispatchState, readonly P88W07DispatchState[]>
> = Object.freeze({
  reserved_prewrite: Object.freeze([
    "dispatch_started",
    "cancelled_before_dispatch",
    "manual_intervention_required",
  ]),
  dispatch_started: Object.freeze([
    "forward_rejected_no_write",
    "forward_verification_pending",
    "manual_intervention_required",
  ]),
  forward_rejected_no_write: Object.freeze([]),
  forward_verification_pending: Object.freeze([
    "forward_verified_live",
    "rollback_required",
    "manual_intervention_required",
  ]),
  forward_verified_live: Object.freeze([]),
  rollback_required: Object.freeze([
    "rollback_started",
    "manual_intervention_required",
  ]),
  rollback_started: Object.freeze([
    "rollback_verification_pending",
    "manual_intervention_required",
  ]),
  rollback_verification_pending: Object.freeze([
    "rollback_verified_closed",
    "manual_intervention_required",
  ]),
  rollback_verified_closed: Object.freeze([]),
  cancelled_before_dispatch: Object.freeze([]),
  manual_intervention_required: Object.freeze([]),
});

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

export function p88W07StableHash(value: unknown): string {
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

function equal(left: unknown, right: unknown, name: string): void {
  if (left !== right) throw new Error("p88_w07_lineage_mismatch:" + name);
}

export function p88W07Capability() {
  return deepFreeze({
    version: P8_8_W07_EXECUTION_VERSION,
    policyOnlyProvenance: true,
    task51AuthorityImported: false,
    task53AuthorityImported: false,
    task54AuthorityImported: false,
    task54ConfirmationGenerated: false,
    exactW02BytesRequired: true,
    durableDispatchFenceRequiredBeforeProviderWrite: true,
    maximumForwardAttempts: 1,
    maximumRollbackAttempts: 1,
    automaticForwardRetryAllowed: false,
    automaticRollbackRetryAllowed: false,
    w04ClaimHeldUntilTerminalClosure: true,
    independentProviderStorefrontVerificationRequired: true,
    liveExecutionDefaultOff: true,
    schedulerActivated: false,
    workerActivated: false,
    autonomousLiveExecutionAuthorized: false,
    productionDatabaseMutationAuthorized: false,
    productionProviderReadAuthorized: false,
    providerWriteAuthorizedByIntent: false,
    rollbackWriteAuthorizedByIntent: false,
    deploymentPerformed: false,
    publicationPerformed: false,
  });
}

export function assertP88W07ExecutionInputIntegrity(
  input: P88W07ExecutionInput,
): void {
  assertP88W06ExactArtifactLineage(input.lineage);
  assertP88W06PolicyPreflightIntegrity(input.w06Preflight);

  const { lineage, w06Preflight: w06 } = input;
  const w01 = lineage.w01Evaluation;
  const w02 = lineage.w02Materialization;
  const w03 = lineage.w03Authorization;
  const w04 = lineage.w04Receipt;
  const w05 = lineage.w05ClaimReceipt;

  if (
    w06.disposition !== "ready_for_w07"
    || w06.claimReleaseEligibility !== "retain_for_w07"
    || w06.blockers.length !== 0
    || w06.noDispatchProof.executionPhase !== "pre_dispatch_proven"
  ) {
    throw new Error("p88_w07_w06_not_ready");
  }
  if (
    w06.safety.providerDispatchAuthorized !== false
    || w06.safety.providerWriteAllowed !== false
    || w06.safety.publicSiteWritePerformed !== false
    || w06.safety.rollbackWritePerformed !== false
    || w06.safety.databaseWritePerformed !== false
    || w06.safety.schemaMutationPerformed !== false
    || w06.noDispatchProof.providerDispatchAttempted !== false
    || w06.noDispatchProof.providerMutationCalled !== false
    || w06.noDispatchProof.providerWritePerformed !== false
    || w06.noDispatchProof.publicSiteWritePerformed !== false
    || w06.noDispatchProof.rollbackWritePerformed !== false
  ) {
    throw new Error("p88_w07_w06_side_effect_marker_invalid");
  }
  if (w01.policy.policyStage !== "single_action_canary") {
    throw new Error("p88_w07_policy_stage_not_single_action_canary");
  }
  if (
    w06.currentControl.mode !== "running"
    || w06.currentControl.revision !== w05.controlRevision
    || w06.currentControl.fingerprint !== w05.controlFingerprint
  ) {
    throw new Error("p88_w07_w06_control_epoch_invalid");
  }

  const checks: Array<[unknown, unknown, string]> = [
    [w06.lineage.policyId, w01.policy.policyId, "policy_id"],
    [w06.lineage.policyVersion, w01.policy.policyVersion, "policy_version"],
    [w06.lineage.policyFingerprint, w01.policy.policyFingerprint, "policy_fingerprint"],
    [w06.lineage.evaluationId, w01.evaluationId, "evaluation_id"],
    [w06.lineage.evaluationFingerprint, w01.evaluationFingerprint, "evaluation_fingerprint"],
    [w06.lineage.materializationId, w02.materializationId, "materialization_id"],
    [w06.lineage.materializationFingerprint, w02.materializationFingerprint, "materialization_fingerprint"],
    [w06.lineage.proposalId, w02.proposalId, "proposal_id"],
    [w06.lineage.proposalFingerprint, w02.proposalFingerprint, "proposal_fingerprint"],
    [w06.lineage.w03AuthorizationId, w03.policyAuthorizationId, "w03_authorization_id"],
    [w06.lineage.w03AuthorizationFingerprint, w03.policyAuthorizationFingerprint, "w03_authorization_fingerprint"],
    [w06.lineage.policyActionId, w03.policyActionId, "policy_action_id"],
    [w06.lineage.reservationId, w04.reservationId, "reservation_id"],
    [w06.lineage.reservationFingerprint, w04.reservationFingerprint, "reservation_fingerprint"],
    [w06.lineage.claimId, w05.claimId, "claim_id"],
    [w06.lineage.claimFingerprint, w05.claimFingerprint, "claim_fingerprint"],
    [w06.target.siteId, w05.siteId, "site_id"],
    [w06.target.resourceGid, w02.target.resourceGid, "resource_gid"],
    [w06.target.targetUrl, w02.target.targetUrl, "target_url"],
    [w06.target.field, w02.target.field, "field"],
    [w06.state.beforeValue, w02.before.value, "before_value"],
    [w06.state.afterValue, w02.after.value, "after_value"],
    [w06.state.beforeFingerprint, w02.before.fingerprint, "before_fingerprint"],
    [w06.state.afterFingerprint, w02.after.fingerprint, "after_fingerprint"],
    [w06.claimedControl.revision, w05.controlRevision, "claimed_control_revision"],
    [w06.claimedControl.fingerprint, w05.controlFingerprint, "claimed_control_fingerprint"],
  ];
  for (const [left, right, name] of checks) equal(left, right, name);
}

export function projectP88W07ExecutionIntent(
  input: P88W07ExecutionInput,
): P88W07ExecutionIntent {
  assertP88W07ExecutionInputIntegrity(input);
  const { lineage, w06Preflight: w06 } = input;
  const w01 = lineage.w01Evaluation;
  const w02 = lineage.w02Materialization;
  const w03 = lineage.w03Authorization;
  const w04 = lineage.w04Receipt;
  const w05 = lineage.w05ClaimReceipt;

  const identity = {
    version: P8_8_W07_EXECUTION_VERSION,
    executionProvenance: "policy_single_action_apply" as const,
    siteId: w05.siteId,
    policyId: w01.policy.policyId,
    policyVersion: w01.policy.policyVersion,
    policyFingerprint: w01.policy.policyFingerprint,
    evaluationId: w01.evaluationId,
    evaluationFingerprint: w01.evaluationFingerprint,
    materializationId: w02.materializationId,
    materializationFingerprint: w02.materializationFingerprint,
    proposalId: w02.proposalId,
    proposalFingerprint: w02.proposalFingerprint,
    w03AuthorizationId: w03.policyAuthorizationId,
    w03AuthorizationFingerprint: w03.policyAuthorizationFingerprint,
    policyActionId: w03.policyActionId,
    reservationId: w04.reservationId,
    reservationFingerprint: w04.reservationFingerprint,
    claimId: w05.claimId,
    claimFingerprint: w05.claimFingerprint,
    w06PreflightId: w06.preflightId,
    w06PreflightFingerprint: w06.preflightFingerprint,
    credentialProfileId: lineage.w01EvaluationInput.grant.credentialProfileId,
    claimedControlRevision: w05.controlRevision,
    claimedControlFingerprint: w05.controlFingerprint,
    target: {
      provider: "shopify" as const,
      domain: "diamondshelf.us" as const,
      resourceKind: "product" as const,
      resourceGid: w02.target.resourceGid,
      targetUrl: w02.target.targetUrl,
      actionType: "update_meta_description" as const,
      field: "meta_description" as const,
      requiredProviderScope: "write_products" as const,
    },
    state: {
      beforeValue: w02.before.value,
      afterValue: w02.after.value,
      beforeFingerprint: w02.before.fingerprint,
      afterFingerprint: w02.after.fingerprint,
    },
  };

  const executionFingerprint = p88W07StableHash({
    purpose: "p8.8_w07_policy_execution",
    ...identity,
  });
  const policyExecutionId =
    "p88w07-exec-" + executionFingerprint.slice(0, 24);
  const dispatchFingerprint = p88W07StableHash({
    purpose: "p8.8_w07_policy_dispatch",
    policyExecutionId,
    executionFingerprint,
    claimId: w05.claimId,
    claimFingerprint: w05.claimFingerprint,
    reservationId: w04.reservationId,
    reservationFingerprint: w04.reservationFingerprint,
    policyActionId: w03.policyActionId,
    w06PreflightId: w06.preflightId,
    w06PreflightFingerprint: w06.preflightFingerprint,
    target: identity.target,
    state: {
      beforeFingerprint: w02.before.fingerprint,
      afterFingerprint: w02.after.fingerprint,
    },
  });
  const dispatchId =
    "p88w07-dispatch-" + dispatchFingerprint.slice(0, 24);

  return deepFreeze({
    ...identity,
    policyExecutionId,
    executionFingerprint,
    dispatchId,
    dispatchFingerprint,
    initialDispatchState: "reserved_prewrite" as const,
    forwardAttemptCount: 0 as const,
    rollbackAttemptCount: 0 as const,
    publicWriteOccurrence: "none" as const,
    rollbackOccurrence: "none" as const,
    safety: p88W07Capability(),
  });
}

export function projectP88W07Transition(
  input: P88W07TransitionInput,
): P88W07TransitionProjection {
  const allowed = ALLOWED_TRANSITIONS[input.fromState];
  if (!allowed.includes(input.toState)) {
    throw new Error("p88_w07_transition_not_allowed");
  }

  let forwardAttemptCount = input.forwardAttemptCount;
  let rollbackAttemptCount = input.rollbackAttemptCount;
  let publicWriteOccurrence = input.publicWriteOccurrence;
  let rollbackOccurrence = input.rollbackOccurrence;

  if (input.toState === "dispatch_started") {
    if (input.forwardAttemptCount !== 0 || input.rollbackAttemptCount !== 0) {
      throw new Error("p88_w07_forward_attempt_already_spent");
    }
    forwardAttemptCount = 1;
    publicWriteOccurrence = "possible";
  } else if (
    input.fromState !== "reserved_prewrite"
    && input.forwardAttemptCount !== 1
  ) {
    throw new Error("p88_w07_forward_attempt_count_invalid");
  }

  if (input.toState === "forward_rejected_no_write") {
    publicWriteOccurrence = "none";
  }
  if (
    input.toState === "forward_verification_pending"
    || input.toState === "forward_verified_live"
    || input.toState === "rollback_required"
  ) {
    publicWriteOccurrence = "confirmed";
  }

  if (input.toState === "rollback_started") {
    if (input.rollbackAttemptCount !== 0 || input.forwardAttemptCount !== 1) {
      throw new Error("p88_w07_rollback_attempt_already_spent");
    }
    rollbackAttemptCount = 1;
    rollbackOccurrence = "possible";
  } else if (
    (
      input.fromState === "rollback_started"
      || input.fromState === "rollback_verification_pending"
    )
    && input.rollbackAttemptCount !== 1
  ) {
    throw new Error("p88_w07_rollback_attempt_count_invalid");
  }

  if (
    input.toState === "rollback_verification_pending"
    || input.toState === "rollback_verified_closed"
  ) {
    rollbackOccurrence = "confirmed";
  }

  if (
    input.toState === "cancelled_before_dispatch"
    && (
      input.forwardAttemptCount !== 0
      || input.publicWriteOccurrence !== "none"
    )
  ) {
    throw new Error("p88_w07_no_dispatch_closure_not_proven");
  }

  return deepFreeze({
    fromState: input.fromState,
    toState: input.toState,
    forwardAttemptCount,
    rollbackAttemptCount,
    publicWriteOccurrence,
    rollbackOccurrence,
  });
}

export function p88W07IsTerminalState(
  state: P88W07DispatchState,
): boolean {
  return (
    state === "forward_rejected_no_write"
    || state === "forward_verified_live"
    || state === "rollback_verified_closed"
    || state === "cancelled_before_dispatch"
    || state === "manual_intervention_required"
  );
}

export function p88W07W04TerminalStatus(
  state: P88W07DispatchState,
): "released" | "consumed" | "manual_intervention" | null {
  if (state === "cancelled_before_dispatch") return "released";
  if (
    state === "forward_rejected_no_write"
    || state === "forward_verified_live"
    || state === "rollback_verified_closed"
  ) return "consumed";
  if (state === "manual_intervention_required") {
    return "manual_intervention";
  }
  return null;
}
