import { createHash } from "node:crypto";
import {
  assertP88W06ExactArtifactLineage,
  buildP88W06PolicyPreflight,
  type P88W06DurableSnapshot,
  type P88W06LineageInput,
  type P88W06PolicyPreflight,
  type P88W06ProviderObservation,
} from "./p8-8-policy-preflight.js";

export const P8_8_W07_VERSION =
  "p8-8-w07-policy-single-action-apply-v1" as const;
export const P8_8_W07_EVENT_VERSION =
  "p8-8-w07-policy-dispatch-event-v1" as const;
export const P8_8_W07_EXECUTION_PROVENANCE =
  "policy_single_action_apply" as const;

export type P88W07DispatchState =
  | "reserved_prewrite"
  | "dispatch_started"
  | "forward_rejected_no_write"
  | "forward_verification_pending"
  | "forward_verified_live"
  | "rollback_required"
  | "rollback_started"
  | "rollback_verification_pending"
  | "rollback_verified_closed"
  | "cancelled_before_dispatch"
  | "manual_intervention_required";

export type P88W07PublicWriteOccurrence =
  | "none"
  | "possible"
  | "confirmed";

export type P88W07LineageBundle = Readonly<{
  w06Lineage: P88W06LineageInput;
  w06PreSnapshot: P88W06DurableSnapshot;
  w06FinalSnapshot: P88W06DurableSnapshot;
  w06ProviderObservation: P88W06ProviderObservation;
  w06Preflight: P88W06PolicyPreflight;
}>;

export type P88W07DispatchIntent = Readonly<{
  version: typeof P8_8_W07_VERSION;
  executionProvenance: typeof P8_8_W07_EXECUTION_PROVENANCE;
  executionId: string;
  dispatchId: string;
  dispatchFingerprint: string;
  siteId: string;
  policy: Readonly<{
    policyId: string;
    policyVersion: string;
    policyFingerprint: string;
    credentialProfileId: string;
    mutationQuotaMaxActions: 1;
    mutationQuotaWindowHours: 24;
    sameTargetCooldownHours: number;
  }>;
  lineage: Readonly<{
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
  }>;
  control: Readonly<{
    revision: number;
    fingerprint: string;
  }>;
  target: Readonly<{
    provider: "shopify";
    domain: "diamondshelf.us";
    resourceKind: "product";
    resourceGid: string;
    targetUrl: string;
    actionType: "update_meta_description";
    field: "meta_description";
    requiredProviderScope: "write_products";
    sourceSystem: string;
    sourceIdentity: string;
    sourceFingerprint: string;
    targetBindingFingerprint: string;
  }>;
  state: Readonly<{
    beforeValue: string | null;
    afterValue: string | null;
    beforeFingerprint: string;
    afterFingerprint: string;
  }>;
  w03ExpiresAt: string;
  w06PreflightExpiresAt: string;
}>;

const TERMINAL_STATES = new Set<P88W07DispatchState>([
  "forward_rejected_no_write",
  "forward_verified_live",
  "rollback_verified_closed",
  "cancelled_before_dispatch",
  "manual_intervention_required",
]);

const TRANSITIONS: Readonly<Record<P88W07DispatchState, readonly P88W07DispatchState[]>> =
  Object.freeze({
    reserved_prewrite: Object.freeze<P88W07DispatchState[]>([
      "dispatch_started",
      "cancelled_before_dispatch",
    ]),
    dispatch_started: Object.freeze<P88W07DispatchState[]>([
      "forward_rejected_no_write",
      "forward_verification_pending",
      "manual_intervention_required",
    ]),
    forward_rejected_no_write: Object.freeze<P88W07DispatchState[]>([]),
    forward_verification_pending: Object.freeze<P88W07DispatchState[]>([
      "forward_verified_live",
      "rollback_required",
      "manual_intervention_required",
    ]),
    forward_verified_live: Object.freeze<P88W07DispatchState[]>([]),
    rollback_required: Object.freeze<P88W07DispatchState[]>([
      "rollback_started",
      "manual_intervention_required",
    ]),
    rollback_started: Object.freeze<P88W07DispatchState[]>([
      "rollback_verification_pending",
      "manual_intervention_required",
    ]),
    rollback_verification_pending: Object.freeze<P88W07DispatchState[]>([
      "rollback_verified_closed",
      "manual_intervention_required",
    ]),
    rollback_verified_closed: Object.freeze<P88W07DispatchState[]>([]),
    cancelled_before_dispatch: Object.freeze<P88W07DispatchState[]>([]),
    manual_intervention_required: Object.freeze<P88W07DispatchState[]>([]),
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

function canonicalIso(value: string, code: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    throw new Error(code);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error(code);
  const canonical = new Date(time).toISOString();
  if (canonical !== value) throw new Error(code);
  return canonical;
}

export function assertP88W07ExactW06Lineage(
  bundle: P88W07LineageBundle,
): void {
  assertP88W06ExactArtifactLineage(bundle.w06Lineage);
  const rebuilt = buildP88W06PolicyPreflight({
    lineage: bundle.w06Lineage,
    preSnapshot: bundle.w06PreSnapshot,
    finalSnapshot: bundle.w06FinalSnapshot,
    providerObservation: bundle.w06ProviderObservation,
  });
  if (stableJson(rebuilt) !== stableJson(bundle.w06Preflight)) {
    throw new Error("p88_w07_w06_preflight_integrity_mismatch");
  }
  const preflight = bundle.w06Preflight;
  if (
    preflight.disposition !== "ready_for_w07"
    || preflight.preflightProvenance !== "policy_preflight"
    || preflight.claimReleaseEligibility !== "retain_for_w07"
    || preflight.noDispatchProof.executionPhase !== "pre_dispatch_proven"
    || preflight.noDispatchProof.providerDispatchAttempted !== false
    || preflight.noDispatchProof.providerMutationCalled !== false
    || preflight.noDispatchProof.providerWritePerformed !== false
    || preflight.noDispatchProof.publicSiteWritePerformed !== false
    || preflight.noDispatchProof.rollbackWritePerformed !== false
    || preflight.noDispatchProof.task51ExecutionPerformed !== false
    || preflight.noDispatchProof.task53ExecutionPerformed !== false
    || preflight.noDispatchProof.task54ExecutionPerformed !== false
    || preflight.noDispatchProof.automaticTransition !== false
  ) {
    throw new Error("p88_w07_w06_not_ready");
  }
}

export function projectP88W07DispatchIntent(input: {
  bundle: P88W07LineageBundle;
  databaseNow: string;
}): P88W07DispatchIntent {
  assertP88W07ExactW06Lineage(input.bundle);
  const databaseNow = canonicalIso(
    input.databaseNow,
    "p88_w07_database_clock_invalid",
  );
  const preflight = input.bundle.w06Preflight;
  const lineage = input.bundle.w06Lineage;
  if (Date.parse(preflight.preflightExpiresAt) <= Date.parse(databaseNow)) {
    throw new Error("p88_w07_w06_preflight_expired");
  }
  if (
    Date.parse(lineage.w03Authorization.expiresAt) <= Date.parse(databaseNow)
    || Date.parse(lineage.w03Authorization.issuedAt) > Date.parse(databaseNow)
  ) {
    throw new Error("p88_w07_w03_authorization_not_fresh");
  }
  if (
    preflight.currentControl.mode !== "running"
    || preflight.currentControl.revision !== preflight.claimedControl.revision
    || preflight.currentControl.fingerprint !== preflight.claimedControl.fingerprint
  ) {
    throw new Error("p88_w07_control_epoch_not_forward_eligible");
  }

  const grant = lineage.w01EvaluationInput.grant;
  if (
    grant.policyStage !== "single_action_canary"
    || grant.requiredProviderScope !== "write_products"
  ) {
    throw new Error("p88_w07_policy_scope_not_forward_eligible");
  }

  const fingerprintPayload = {
    version: P8_8_W07_VERSION,
    executionProvenance: P8_8_W07_EXECUTION_PROVENANCE,
    policyId: preflight.lineage.policyId,
    policyVersion: preflight.lineage.policyVersion,
    policyFingerprint: preflight.lineage.policyFingerprint,
    evaluationId: preflight.lineage.evaluationId,
    evaluationFingerprint: preflight.lineage.evaluationFingerprint,
    materializationId: preflight.lineage.materializationId,
    materializationFingerprint: preflight.lineage.materializationFingerprint,
    proposalId: preflight.lineage.proposalId,
    proposalFingerprint: preflight.lineage.proposalFingerprint,
    w03AuthorizationId: preflight.lineage.w03AuthorizationId,
    w03AuthorizationFingerprint: preflight.lineage.w03AuthorizationFingerprint,
    policyActionId: preflight.lineage.policyActionId,
    reservationId: preflight.lineage.reservationId,
    reservationFingerprint: preflight.lineage.reservationFingerprint,
    claimId: preflight.lineage.claimId,
    claimFingerprint: preflight.lineage.claimFingerprint,
    w06PreflightId: preflight.preflightId,
    w06PreflightFingerprint: preflight.preflightFingerprint,
    credentialProfileId: grant.credentialProfileId,
    controlRevision: preflight.claimedControl.revision,
    controlFingerprint: preflight.claimedControl.fingerprint,
    target: preflight.target,
    beforeFingerprint: preflight.state.beforeFingerprint,
    afterFingerprint: preflight.state.afterFingerprint,
  };
  const dispatchFingerprint = p88W07StableHash({
    purpose: "p8.8_w07_dispatch",
    ...fingerprintPayload,
  });
  const executionFingerprint = p88W07StableHash({
    purpose: "p8.8_w07_execution",
    ...fingerprintPayload,
  });

  return deepFreeze({
    version: P8_8_W07_VERSION,
    executionProvenance: P8_8_W07_EXECUTION_PROVENANCE,
    executionId: "p88w07-exec-" + executionFingerprint.slice(0, 24),
    dispatchId: "p88w07-dispatch-" + dispatchFingerprint.slice(0, 24),
    dispatchFingerprint,
    siteId: preflight.target.siteId,
    policy: {
      policyId: preflight.lineage.policyId,
      policyVersion: preflight.lineage.policyVersion,
      policyFingerprint: preflight.lineage.policyFingerprint,
      credentialProfileId: grant.credentialProfileId,
      mutationQuotaMaxActions: grant.mutationQuota.maxActions,
      mutationQuotaWindowHours: grant.mutationQuota.windowHours,
      sameTargetCooldownHours: grant.sameTargetCooldownHours,
    },
    lineage: {
      evaluationId: preflight.lineage.evaluationId,
      evaluationFingerprint: preflight.lineage.evaluationFingerprint,
      materializationId: preflight.lineage.materializationId,
      materializationFingerprint: preflight.lineage.materializationFingerprint,
      proposalId: preflight.lineage.proposalId,
      proposalFingerprint: preflight.lineage.proposalFingerprint,
      w03AuthorizationId: preflight.lineage.w03AuthorizationId,
      w03AuthorizationFingerprint: preflight.lineage.w03AuthorizationFingerprint,
      policyActionId: preflight.lineage.policyActionId,
      reservationId: preflight.lineage.reservationId,
      reservationFingerprint: preflight.lineage.reservationFingerprint,
      claimId: preflight.lineage.claimId,
      claimFingerprint: preflight.lineage.claimFingerprint,
      w06PreflightId: preflight.preflightId,
      w06PreflightFingerprint: preflight.preflightFingerprint,
    },
    control: {
      revision: preflight.claimedControl.revision,
      fingerprint: preflight.claimedControl.fingerprint,
    },
    target: {
      provider: "shopify",
      domain: "diamondshelf.us",
      resourceKind: "product",
      resourceGid: preflight.target.resourceGid,
      targetUrl: preflight.target.targetUrl,
      actionType: "update_meta_description",
      field: "meta_description",
      requiredProviderScope: "write_products",
      sourceSystem: lineage.w02Materialization.target.sourceSystem,
      sourceIdentity: lineage.w02Materialization.target.sourceIdentity,
      sourceFingerprint: lineage.w02Materialization.target.sourceFingerprint,
      targetBindingFingerprint: preflight.target.targetBindingFingerprint,
    },
    state: {
      beforeValue: preflight.state.beforeValue,
      afterValue: preflight.state.afterValue,
      beforeFingerprint: preflight.state.beforeFingerprint,
      afterFingerprint: preflight.state.afterFingerprint,
    },
    w03ExpiresAt: lineage.w03Authorization.expiresAt,
    w06PreflightExpiresAt: preflight.preflightExpiresAt,
  });
}

export function assertP88W07Transition(
  from: P88W07DispatchState,
  to: P88W07DispatchState,
): void {
  if (!TRANSITIONS[from]?.includes(to)) {
    throw new Error("p88_w07_transition_not_allowed:" + from + ":" + to);
  }
}

export function p88W07StateCapability(state: P88W07DispatchState) {
  const forwardAttemptSpent = state !== "reserved_prewrite"
    && state !== "cancelled_before_dispatch";
  const rollbackAttemptSpent = state === "rollback_started"
    || state === "rollback_verification_pending"
    || state === "rollback_verified_closed";
  const publicWriteOccurrence: P88W07PublicWriteOccurrence =
    state === "reserved_prewrite" || state === "cancelled_before_dispatch"
      ? "none"
      : state === "forward_rejected_no_write"
        ? "none"
        : state === "dispatch_started"
          ? "possible"
          : "confirmed";
  return deepFreeze({
    state,
    terminal: TERMINAL_STATES.has(state),
    forwardAttemptSpent,
    rollbackAttemptSpent,
    publicWriteOccurrence,
    providerForwardRetryAllowed: false,
    providerRollbackRetryAllowed: false,
    verificationReadRetryMayBeBounded: true,
    task51AuthorityUsed: false,
    task53AuthorityUsed: false,
    task54AuthorityUsed: false,
    automaticTransition: false,
  });
}

export function p88W07NoHumanAuthorityCapability() {
  return deepFreeze({
    version: P8_8_W07_VERSION,
    executionProvenance: P8_8_W07_EXECUTION_PROVENANCE,
    humanApprovalCreated: false,
    humanActionCreated: false,
    humanDeploymentCreated: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    task54ConfirmationGenerated: false,
    schedulerActivated: false,
    workerActivated: false,
    autonomousLiveExecutionAuthorized: false,
    deploymentPerformed: false,
    publicationPerformed: false,
  });
}
