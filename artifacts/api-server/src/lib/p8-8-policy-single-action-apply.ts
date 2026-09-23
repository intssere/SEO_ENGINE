import { createHash } from "node:crypto";
import {
  P8_8_W06_PREFLIGHT_VERSION,
  assertP88W06ExactArtifactLineage,
  type P88W06LineageInput,
  type P88W06PolicyPreflight,
} from "./p8-8-policy-preflight.js";

export const P8_8_W07_EXECUTION_VERSION =
  "p8-8-w07-policy-single-action-apply-v1" as const;
export const P8_8_W07_DISPATCH_VERSION =
  "p8-8-w07-policy-dispatch-v1" as const;
export const P8_8_W07_DISPATCH_EVENT_VERSION =
  "p8-8-w07-policy-dispatch-event-v1" as const;

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

export type P88W07PublicWriteOccurrence = "none" | "possible" | "confirmed";
export type P88W07RollbackOccurrence = "none" | "possible" | "confirmed";

export type P88W07RuntimeChecks = Readonly<{
  publicSiteWritesEnabled: boolean;
  policyMutationExecutionEnabled: boolean;
  mutationQuotaAvailable: boolean;
  sameTargetCooldownSatisfied: boolean;
  humanExecutionClear: boolean;
  unresolvedManualIntervention: boolean;
}>;

export type P88W07WriteCredentialBinding = Readonly<{
  credentialProfileId: string;
  siteId: string;
  shopDomain: string;
  scopes: readonly string[];
  writeOnlyForThisOperation: true;
}>;

export type P88W07DispatchIntent = Readonly<{
  version: typeof P8_8_W07_DISPATCH_VERSION;
  executionVersion: typeof P8_8_W07_EXECUTION_VERSION;
  executionProvenance: "policy_single_action_apply";
  policyExecutionId: string;
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
  provider: "shopify";
  domain: "diamondshelf.us";
  resourceKind: "product";
  resourceGid: string;
  targetUrl: string;
  actionType: "update_meta_description";
  field: "meta_description";
  requiredProviderScope: "write_products";
  beforeFingerprint: string;
  afterFingerprint: string;
  credentialProfileId: string;
  claimedControlRevision: number;
  claimedControlFingerprint: string;
  w03ExpiresAt: string;
  w06PreflightExpiresAt: string;
  initialState: "reserved_prewrite";
  forwardAttemptCount: 0;
  rollbackAttemptCount: 0;
  publicWriteOccurrence: "none";
  rollbackOccurrence: "none";
  safety: ReturnType<typeof p88W07Capability>;
}>;

export type P88W07DispatchProjection = Readonly<{
  dispatchId: string;
  state: P88W07DispatchState;
  revision: number;
  forwardAttemptCount: 0 | 1;
  rollbackAttemptCount: 0 | 1;
  publicWriteOccurrence: P88W07PublicWriteOccurrence;
  rollbackOccurrence: P88W07RollbackOccurrence;
  terminal: boolean;
}>;

export type P88W07Transition = Readonly<{
  fromState: P88W07DispatchState;
  toState: P88W07DispatchState;
  nextRevision: number;
  forwardAttemptCount: 0 | 1;
  rollbackAttemptCount: 0 | 1;
  publicWriteOccurrence: P88W07PublicWriteOccurrence;
  rollbackOccurrence: P88W07RollbackOccurrence;
  terminal: boolean;
}>;

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
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error(code);
  const canonical = new Date(time).toISOString();
  if (canonical !== value) throw new Error(code);
  return canonical;
}

function requireEqual(left: unknown, right: unknown, code: string): void {
  if (left !== right) throw new Error("p88_w07_" + code);
}

function terminalState(state: P88W07DispatchState): boolean {
  return (
    state === "forward_rejected_no_write"
    || state === "forward_verified_live"
    || state === "rollback_verified_closed"
    || state === "cancelled_before_dispatch"
    || state === "manual_intervention_required"
  );
}

export function p88W07Capability() {
  return deepFreeze({
    version: P8_8_W07_EXECUTION_VERSION,
    executionProvenance: "policy_single_action_apply" as const,
    exactW01W06LineageRequired: true,
    twoPhaseDispatchFenceRequired: true,
    exactW02ForwardBytesRequired: true,
    exactW02RollbackBytesRequired: true,
    forwardAttemptMaximum: 1 as const,
    rollbackAttemptMaximum: 1 as const,
    acceptedMutationReceiptIsNotSuccess: true,
    independentProviderAndStorefrontVerificationRequired: true,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    task54ConfirmationGenerated: false,
    humanApprovalCreated: false,
    humanActionCreated: false,
    humanDeploymentCreated: false,
    automaticForwardRetryAllowed: false,
    automaticRollbackRetryAllowed: false,
    routeBound: false,
    schedulerBound: false,
    workerBound: false,
    autonomousActivationPerformed: false,
    deploymentPerformed: false,
    publicationPerformed: false,
  });
}

function assertNoDispatchProof(preflight: P88W06PolicyPreflight): void {
  const proof = preflight.noDispatchProof;
  if (
    proof.preflightId !== preflight.preflightId
    || proof.preflightFingerprint !== preflight.preflightFingerprint
    || proof.w03AuthorizationId !== preflight.lineage.w03AuthorizationId
    || proof.w03AuthorizationFingerprint
      !== preflight.lineage.w03AuthorizationFingerprint
    || proof.policyActionId !== preflight.lineage.policyActionId
    || proof.reservationId !== preflight.lineage.reservationId
    || proof.reservationFingerprint !== preflight.lineage.reservationFingerprint
    || proof.claimId !== preflight.lineage.claimId
    || proof.claimFingerprint !== preflight.lineage.claimFingerprint
    || proof.executionPhase !== "pre_dispatch_proven"
    || proof.providerDispatchAttempted !== false
    || proof.providerMutationCalled !== false
    || proof.providerWritePerformed !== false
    || proof.publicSiteWritePerformed !== false
    || proof.task51ExecutionPerformed !== false
    || proof.task53ExecutionPerformed !== false
    || proof.task54ExecutionPerformed !== false
    || proof.rollbackWritePerformed !== false
    || proof.automaticTransition !== false
  ) {
    throw new Error("p88_w07_w06_no_dispatch_proof_invalid");
  }
  const { proofFingerprint, ...proofBase } = proof;
  const expected = stableHash({
    purpose: "p8.8_w06_no_dispatch_proof",
    ...proofBase,
  });
  if (proofFingerprint !== expected) {
    throw new Error("p88_w07_w06_no_dispatch_proof_fingerprint_invalid");
  }
}

export function assertP88W07W06Handoff(input: {
  lineage: P88W06LineageInput;
  preflight: P88W06PolicyPreflight;
  databaseNow: string;
  runtime: P88W07RuntimeChecks;
  credential: P88W07WriteCredentialBinding;
}): void {
  assertP88W06ExactArtifactLineage(input.lineage);
  const { preflight, lineage } = input;
  if (
    preflight.version !== P8_8_W06_PREFLIGHT_VERSION
    || preflight.preflightProvenance !== "policy_preflight"
    || preflight.disposition !== "ready_for_w07"
    || preflight.claimReleaseEligibility !== "retain_for_w07"
    || preflight.blockers.length !== 0
    || preflight.safety.providerDispatchAuthorized !== false
    || preflight.safety.providerWriteAllowed !== false
    || preflight.safety.publicSiteWritePerformed !== false
    || preflight.safety.databaseWritePerformed !== false
    || preflight.safety.schemaMutationPerformed !== false
  ) {
    throw new Error("p88_w07_w06_not_ready");
  }
  if (
    preflight.preflightId
      !== "p88w06-preflight-" + preflight.preflightFingerprint.slice(0, 24)
  ) {
    throw new Error("p88_w07_w06_preflight_identity_invalid");
  }
  assertNoDispatchProof(preflight);

  const w01 = lineage.w01Evaluation;
  const grant = lineage.w01EvaluationInput.grant;
  const w02 = lineage.w02Materialization;
  const w03 = lineage.w03Authorization;
  const w04 = lineage.w04Receipt;
  const w05 = lineage.w05ClaimReceipt;

  const comparisons: Array<[unknown, unknown, string]> = [
    [preflight.lineage.policyId, w01.policy.policyId, "policy_id_mismatch"],
    [preflight.lineage.policyVersion, w01.policy.policyVersion, "policy_version_mismatch"],
    [preflight.lineage.policyFingerprint, w01.policy.policyFingerprint, "policy_fingerprint_mismatch"],
    [preflight.lineage.evaluationId, w01.evaluationId, "evaluation_id_mismatch"],
    [preflight.lineage.evaluationFingerprint, w01.evaluationFingerprint, "evaluation_fingerprint_mismatch"],
    [preflight.lineage.materializationId, w02.materializationId, "materialization_id_mismatch"],
    [preflight.lineage.materializationFingerprint, w02.materializationFingerprint, "materialization_fingerprint_mismatch"],
    [preflight.lineage.proposalId, w02.proposalId, "proposal_id_mismatch"],
    [preflight.lineage.proposalFingerprint, w02.proposalFingerprint, "proposal_fingerprint_mismatch"],
    [preflight.lineage.w03AuthorizationId, w03.policyAuthorizationId, "authorization_id_mismatch"],
    [preflight.lineage.w03AuthorizationFingerprint, w03.policyAuthorizationFingerprint, "authorization_fingerprint_mismatch"],
    [preflight.lineage.policyActionId, w03.policyActionId, "policy_action_id_mismatch"],
    [preflight.lineage.reservationId, w04.reservationId, "reservation_id_mismatch"],
    [preflight.lineage.reservationFingerprint, w04.reservationFingerprint, "reservation_fingerprint_mismatch"],
    [preflight.lineage.claimId, w05.claimId, "claim_id_mismatch"],
    [preflight.lineage.claimFingerprint, w05.claimFingerprint, "claim_fingerprint_mismatch"],
    [preflight.target.siteId, grant.siteId, "site_id_mismatch"],
    [preflight.target.resourceGid, w02.target.resourceGid, "resource_gid_mismatch"],
    [preflight.target.targetUrl, w02.target.targetUrl, "target_url_mismatch"],
    [preflight.state.beforeFingerprint, w02.before.fingerprint, "before_fingerprint_mismatch"],
    [preflight.state.afterFingerprint, w02.after.fingerprint, "after_fingerprint_mismatch"],
    [preflight.state.beforeValue, w02.before.value, "before_value_mismatch"],
    [preflight.state.afterValue, w02.after.value, "after_value_mismatch"],
    [preflight.claimedControl.revision, w05.controlRevision, "claimed_control_revision_mismatch"],
    [preflight.claimedControl.fingerprint, w05.controlFingerprint, "claimed_control_fingerprint_mismatch"],
    [preflight.currentControl.mode, "running", "current_control_not_running"],
    [preflight.currentControl.revision, w05.controlRevision, "current_control_revision_mismatch"],
    [preflight.currentControl.fingerprint, w05.controlFingerprint, "current_control_fingerprint_mismatch"],
  ];
  for (const [left, right, code] of comparisons) requireEqual(left, right, code);

  const now = Date.parse(canonicalIso(input.databaseNow, "p88_w07_database_clock_invalid"));
  if (Date.parse(w03.issuedAt) > now || Date.parse(w03.expiresAt) <= now) {
    throw new Error("p88_w07_w03_not_fresh");
  }
  if (Date.parse(canonicalIso(
    preflight.preflightExpiresAt,
    "p88_w07_w06_expiry_invalid",
  )) <= now) {
    throw new Error("p88_w07_w06_preflight_expired");
  }

  if (
    !input.runtime.publicSiteWritesEnabled
    || !input.runtime.policyMutationExecutionEnabled
  ) {
    throw new Error("p88_w07_execution_gate_closed");
  }
  if (!input.runtime.mutationQuotaAvailable) {
    throw new Error("p88_w07_mutation_quota_exhausted");
  }
  if (!input.runtime.sameTargetCooldownSatisfied) {
    throw new Error("p88_w07_same_target_cooldown_blocked");
  }
  if (!input.runtime.humanExecutionClear) {
    throw new Error("p88_w07_human_execution_conflict");
  }
  if (input.runtime.unresolvedManualIntervention) {
    throw new Error("p88_w07_manual_intervention_blocked");
  }

  if (
    input.credential.writeOnlyForThisOperation !== true
    || input.credential.credentialProfileId !== grant.credentialProfileId
    || input.credential.siteId !== grant.siteId
    || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(input.credential.shopDomain)
    || !input.credential.scopes.includes("write_products")
  ) {
    throw new Error("p88_w07_write_credential_binding_invalid");
  }
}

export function projectP88W07DispatchIntent(input: {
  lineage: P88W06LineageInput;
  preflight: P88W06PolicyPreflight;
  databaseNow: string;
  runtime: P88W07RuntimeChecks;
  credential: P88W07WriteCredentialBinding;
}): P88W07DispatchIntent {
  assertP88W07W06Handoff(input);
  const { lineage, preflight } = input;
  const grant = lineage.w01EvaluationInput.grant;
  const base = {
    version: P8_8_W07_DISPATCH_VERSION,
    executionVersion: P8_8_W07_EXECUTION_VERSION,
    executionProvenance: "policy_single_action_apply" as const,
    siteId: preflight.target.siteId,
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
    provider: "shopify" as const,
    domain: "diamondshelf.us" as const,
    resourceKind: "product" as const,
    resourceGid: preflight.target.resourceGid,
    targetUrl: preflight.target.targetUrl,
    actionType: "update_meta_description" as const,
    field: "meta_description" as const,
    requiredProviderScope: "write_products" as const,
    beforeFingerprint: preflight.state.beforeFingerprint,
    afterFingerprint: preflight.state.afterFingerprint,
    credentialProfileId: grant.credentialProfileId,
    claimedControlRevision: preflight.claimedControl.revision,
    claimedControlFingerprint: preflight.claimedControl.fingerprint,
    w03ExpiresAt: lineage.w03Authorization.expiresAt,
    w06PreflightExpiresAt: preflight.preflightExpiresAt,
    initialState: "reserved_prewrite" as const,
    forwardAttemptCount: 0 as const,
    rollbackAttemptCount: 0 as const,
    publicWriteOccurrence: "none" as const,
    rollbackOccurrence: "none" as const,
  };
  const identityFingerprint = stableHash({
    purpose: "p8.8_w07_policy_execution",
    ...base,
  });
  const policyExecutionId = "p88w07-exec-" + identityFingerprint.slice(0, 24);
  const dispatchFingerprint = stableHash({
    purpose: "p8.8_w07_policy_dispatch",
    policyExecutionId,
    ...base,
  });
  const dispatchId = "p88w07-dispatch-" + dispatchFingerprint.slice(0, 24);
  return deepFreeze({
    ...base,
    policyExecutionId,
    dispatchId,
    dispatchFingerprint,
    safety: p88W07Capability(),
  });
}

const allowedTransitions: Readonly<Record<P88W07DispatchState, readonly P88W07DispatchState[]>> =
  Object.freeze({
    reserved_prewrite: Object.freeze([
      "dispatch_started",
      "cancelled_before_dispatch",
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

export function projectP88W07Transition(input: {
  current: P88W07DispatchProjection;
  nextState: P88W07DispatchState;
  publicWriteOccurrence?: P88W07PublicWriteOccurrence;
  rollbackOccurrence?: P88W07RollbackOccurrence;
}): P88W07Transition {
  if (input.current.terminal || terminalState(input.current.state)) {
    throw new Error("p88_w07_terminal_state_transition_forbidden");
  }
  if (!allowedTransitions[input.current.state].includes(input.nextState)) {
    throw new Error("p88_w07_transition_not_allowed");
  }
  let forwardAttemptCount = input.current.forwardAttemptCount;
  let rollbackAttemptCount = input.current.rollbackAttemptCount;
  if (
    input.current.state === "reserved_prewrite"
    && input.nextState === "dispatch_started"
  ) {
    if (forwardAttemptCount !== 0) {
      throw new Error("p88_w07_forward_attempt_already_spent");
    }
    forwardAttemptCount = 1;
  }
  if (
    input.current.state === "rollback_required"
    && input.nextState === "rollback_started"
  ) {
    if (forwardAttemptCount !== 1 || rollbackAttemptCount !== 0) {
      throw new Error("p88_w07_rollback_attempt_not_available");
    }
    rollbackAttemptCount = 1;
  }
  if (forwardAttemptCount > 1 || rollbackAttemptCount > 1) {
    throw new Error("p88_w07_attempt_limit_exceeded");
  }
  if (rollbackAttemptCount > forwardAttemptCount) {
    throw new Error("p88_w07_rollback_without_forward_attempt");
  }
  const publicWriteOccurrence =
    input.publicWriteOccurrence ?? input.current.publicWriteOccurrence;
  const rollbackOccurrence =
    input.rollbackOccurrence ?? input.current.rollbackOccurrence;
  if (
    input.nextState === "cancelled_before_dispatch"
    && (
      forwardAttemptCount !== 0
      || publicWriteOccurrence !== "none"
      || rollbackOccurrence !== "none"
    )
  ) {
    throw new Error("p88_w07_cancelled_no_dispatch_proof_invalid");
  }
  if (
    input.nextState === "forward_verified_live"
    && publicWriteOccurrence !== "confirmed"
  ) {
    throw new Error("p88_w07_live_terminal_requires_confirmed_write");
  }
  if (
    input.nextState === "rollback_verified_closed"
    && rollbackOccurrence !== "confirmed"
  ) {
    throw new Error("p88_w07_rollback_terminal_requires_confirmed_rollback");
  }
  return deepFreeze({
    fromState: input.current.state,
    toState: input.nextState,
    nextRevision: input.current.revision + 1,
    forwardAttemptCount,
    rollbackAttemptCount,
    publicWriteOccurrence,
    rollbackOccurrence,
    terminal: terminalState(input.nextState),
  });
}
