import { createHash } from "node:crypto";
import {
  buildP88W06PolicyPreflight,
  p88W06PreflightCapability,
  type P88W06DurableSnapshot,
  type P88W06LineageInput,
  type P88W06PolicyPreflight,
  type P88W06ProviderObservation,
} from "./p8-8-policy-preflight.js";
import {
  p88W02StateFingerprint,
  type P88W02ProductTargetBinding,
} from "./p8-8-governed-proposal-materialization.js";

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
export type P88W07RollbackWriteOccurrence = "none" | "possible" | "confirmed";

export type P88W07W06Handoff = Readonly<{
  lineage: P88W06LineageInput;
  preSnapshot: P88W06DurableSnapshot;
  finalSnapshot: P88W06DurableSnapshot;
  providerObservation: P88W06ProviderObservation;
  preflight: P88W06PolicyPreflight;
}>;

export type P88W07ExecutionIntent = Readonly<{
  version: typeof P8_8_W07_EXECUTION_VERSION;
  executionProvenance: "policy_single_action_apply";
  executionId: string;
  executionFingerprint: string;
  dispatchId: string;
  dispatchFingerprint: string;
  siteId: string;
  policy: Readonly<{
    policyId: string;
    policyVersion: string;
    policyFingerprint: string;
    policyStage: "single_action_canary";
  }>;
  evaluation: Readonly<{
    evaluationId: string;
    evaluationFingerprint: string;
  }>;
  materialization: Readonly<{
    materializationId: string;
    materializationFingerprint: string;
  }>;
  proposal: Readonly<{
    proposalId: string;
    proposalFingerprint: string;
  }>;
  authorization: Readonly<{
    w03AuthorizationId: string;
    w03AuthorizationFingerprint: string;
    policyActionId: string;
    issuedAt: string;
    expiresAt: string;
  }>;
  reservation: Readonly<{
    reservationId: string;
    reservationFingerprint: string;
  }>;
  claim: Readonly<{
    claimId: string;
    claimFingerprint: string;
    controlRevision: number;
    controlFingerprint: string;
  }>;
  preflight: Readonly<{
    preflightId: string;
    preflightFingerprint: string;
    validatedAt: string;
    expiresAt: string;
  }>;
  credentialProfileId: string;
  target: Readonly<{
    provider: "shopify";
    domain: "diamondshelf.us";
    resourceKind: "product";
    resourceGid: string;
    targetUrl: string;
    actionType: "update_meta_description";
    field: "meta_description";
    requiredProviderScope: "write_products";
    targetBindingFingerprint: string;
  }>;
  state: Readonly<{
    beforeValue: string | null;
    afterValue: string | null;
    beforeFingerprint: string;
    afterFingerprint: string;
  }>;
  safety: ReturnType<typeof p88W07ExecutionCapability>;
}>;

export type P88W07DispatchEligibility = Readonly<{
  publicSiteWritesEnabled: boolean;
  policyMutationExecutionEnabled: boolean;
  quotaAvailable: boolean;
  sameTargetCooldownSatisfied: boolean;
  noHumanExecutionConflict: boolean;
  credentialProfileId: string;
  credentialScopes: readonly string[];
}>;

export type P88W07VerificationEvidence = Readonly<{
  status: "verified" | "failed" | "unavailable";
  providerRawValue: string | null;
  providerObservedFingerprint: string | null;
  providerVerified: boolean;
  storefrontVerified: boolean;
  failureCategories: readonly string[];
  verificationFingerprint: string;
}>;

export type P88W07VerificationAssessment = Readonly<{
  status: "verified" | "failed" | "unavailable";
  exactProviderStateMatched: boolean;
  independentProviderVerified: boolean;
  independentStorefrontVerified: boolean;
  reasons: readonly string[];
  assessmentFingerprint: string;
}>;

const HEX_64 = /^[0-9a-f]{64}$/;

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
  if (typeof value !== "string" || value.length < 1 || value.length > 64) {
    throw new Error(code);
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new Error(code);
  const canonical = new Date(time).toISOString();
  if (canonical !== value) throw new Error(code);
  return canonical;
}

export function p88W07ExecutionCapability() {
  return deepFreeze({
    version: P8_8_W07_EXECUTION_VERSION,
    executionProvenance: "policy_single_action_apply" as const,
    w01ThroughW06RevalidationRequired: true,
    twoPhaseDispatchFenceRequired: true,
    exactW02ForwardBytesRequired: true,
    exactW02RollbackBytesRequired: true,
    forwardAttemptMaximum: 1,
    rollbackAttemptMaximum: 1,
    providerReceiptSufficientForSuccess: false,
    exactProviderVerificationRequired: true,
    independentProviderVerificationRequired: true,
    independentStorefrontVerificationRequired: true,
    automaticForwardWriteRetryAllowed: false,
    automaticRollbackWriteRetryAllowed: false,
    task51AuthorityUsed: false,
    task53AuthorityUsed: false,
    task54AuthorityUsed: false,
    task54ConfirmationGenerated: false,
    humanApprovalCreated: false,
    humanActionCreated: false,
    humanDeploymentCreated: false,
    schedulerActivated: false,
    workerActivated: false,
    policyRuntimeActivated: false,
    productionDdlAuthorized: false,
    deploymentAuthorized: false,
    publicationAuthorized: false,
  });
}

export function assertP88W07ExactW06Handoff(
  input: P88W07W06Handoff,
): P88W06PolicyPreflight {
  const rebuilt = buildP88W06PolicyPreflight({
    lineage: input.lineage,
    preSnapshot: input.preSnapshot,
    finalSnapshot: input.finalSnapshot,
    providerObservation: input.providerObservation,
  });
  if (stableJson(rebuilt) !== stableJson(input.preflight)) {
    throw new Error("p88_w07_w06_preflight_integrity_mismatch");
  }

  const preflight = input.preflight;
  const noDispatch = preflight.noDispatchProof;
  const safety = preflight.safety;
  const expectedSafety = p88W06PreflightCapability();

  if (
    preflight.preflightProvenance !== "policy_preflight"
    || preflight.disposition !== "ready_for_w07"
    || preflight.claimReleaseEligibility !== "retain_for_w07"
    || preflight.blockers.length !== 0
  ) {
    throw new Error("p88_w07_w06_not_ready");
  }

  if (
    noDispatch.preflightId !== preflight.preflightId
    || noDispatch.preflightFingerprint !== preflight.preflightFingerprint
    || noDispatch.executionPhase !== "pre_dispatch_proven"
    || noDispatch.disposition !== "ready_for_w07"
    || noDispatch.providerDispatchAttempted !== false
    || noDispatch.providerMutationCalled !== false
    || noDispatch.providerWritePerformed !== false
    || noDispatch.publicSiteWritePerformed !== false
    || noDispatch.task51ExecutionPerformed !== false
    || noDispatch.task53ExecutionPerformed !== false
    || noDispatch.task54ExecutionPerformed !== false
    || noDispatch.rollbackWritePerformed !== false
    || noDispatch.automaticTransition !== false
  ) {
    throw new Error("p88_w07_w06_no_dispatch_proof_invalid");
  }

  if (
    safety.providerMutationPerformed !== false
    || safety.providerDispatchAuthorized !== false
    || safety.providerWriteAllowed !== false
    || safety.publicSiteWritePerformed !== false
    || safety.rollbackWritePerformed !== false
    || safety.databaseWritePerformed !== false
    || safety.task51ExecutionPerformed !== false
    || safety.task53ExecutionPerformed !== false
    || safety.task54ExecutionPerformed !== false
    || stableJson(safety) !== stableJson(expectedSafety)
  ) {
    throw new Error("p88_w07_w06_safety_contract_invalid");
  }

  const lineage = input.lineage;
  if (
    preflight.lineage.w03AuthorizationId
      !== lineage.w03Authorization.policyAuthorizationId
    || preflight.lineage.w03AuthorizationFingerprint
      !== lineage.w03Authorization.policyAuthorizationFingerprint
    || preflight.lineage.policyActionId
      !== lineage.w03Authorization.policyActionId
    || preflight.lineage.reservationId !== lineage.w04Receipt.reservationId
    || preflight.lineage.reservationFingerprint
      !== lineage.w04Receipt.reservationFingerprint
    || preflight.lineage.claimId !== lineage.w05ClaimReceipt.claimId
    || preflight.lineage.claimFingerprint
      !== lineage.w05ClaimReceipt.claimFingerprint
  ) {
    throw new Error("p88_w07_w06_lineage_mismatch");
  }

  canonicalIso(preflight.validatedAt, "p88_w07_w06_validated_at_invalid");
  canonicalIso(
    preflight.preflightExpiresAt,
    "p88_w07_w06_preflight_expires_at_invalid",
  );
  return preflight;
}

export function projectP88W07ExecutionIntent(
  input: P88W07W06Handoff,
): P88W07ExecutionIntent {
  const preflight = assertP88W07ExactW06Handoff(input);
  const lineage = input.lineage;
  const grant = lineage.w01EvaluationInput.grant;

  if (lineage.w01Evaluation.policy.policyStage !== "single_action_canary") {
    throw new Error("p88_w07_policy_stage_not_single_action_canary");
  }
  if (!grant.credentialProfileId || grant.requiredProviderScope !== "write_products") {
    throw new Error("p88_w07_credential_policy_binding_invalid");
  }

  const executionBase = {
    version: P8_8_W07_EXECUTION_VERSION,
    executionProvenance: "policy_single_action_apply" as const,
    siteId: preflight.target.siteId,
    policy: {
      policyId: preflight.lineage.policyId,
      policyVersion: preflight.lineage.policyVersion,
      policyFingerprint: preflight.lineage.policyFingerprint,
      policyStage: "single_action_canary" as const,
    },
    evaluation: {
      evaluationId: preflight.lineage.evaluationId,
      evaluationFingerprint: preflight.lineage.evaluationFingerprint,
    },
    materialization: {
      materializationId: preflight.lineage.materializationId,
      materializationFingerprint: preflight.lineage.materializationFingerprint,
    },
    proposal: {
      proposalId: preflight.lineage.proposalId,
      proposalFingerprint: preflight.lineage.proposalFingerprint,
    },
    authorization: {
      w03AuthorizationId: preflight.lineage.w03AuthorizationId,
      w03AuthorizationFingerprint:
        preflight.lineage.w03AuthorizationFingerprint,
      policyActionId: preflight.lineage.policyActionId,
      issuedAt: lineage.w03Authorization.issuedAt,
      expiresAt: lineage.w03Authorization.expiresAt,
    },
    reservation: {
      reservationId: preflight.lineage.reservationId,
      reservationFingerprint: preflight.lineage.reservationFingerprint,
    },
    claim: {
      claimId: preflight.lineage.claimId,
      claimFingerprint: preflight.lineage.claimFingerprint,
      controlRevision: preflight.claimedControl.revision,
      controlFingerprint: preflight.claimedControl.fingerprint,
    },
    preflight: {
      preflightId: preflight.preflightId,
      preflightFingerprint: preflight.preflightFingerprint,
      validatedAt: preflight.validatedAt,
      expiresAt: preflight.preflightExpiresAt,
    },
    credentialProfileId: grant.credentialProfileId,
    target: {
      provider: "shopify" as const,
      domain: "diamondshelf.us" as const,
      resourceKind: "product" as const,
      resourceGid: preflight.target.resourceGid,
      targetUrl: preflight.target.targetUrl,
      actionType: "update_meta_description" as const,
      field: "meta_description" as const,
      requiredProviderScope: "write_products" as const,
      targetBindingFingerprint: preflight.target.targetBindingFingerprint,
    },
    state: {
      beforeValue: preflight.state.beforeValue,
      afterValue: preflight.state.afterValue,
      beforeFingerprint: preflight.state.beforeFingerprint,
      afterFingerprint: preflight.state.afterFingerprint,
    },
    safety: p88W07ExecutionCapability(),
  };

  const executionFingerprint = p88W07StableHash({
    purpose: "p8.8_w07_policy_execution",
    ...executionBase,
  });
  const executionId = "p88w07-exec-" + executionFingerprint.slice(0, 24);
  const dispatchFingerprint = p88W07StableHash({
    purpose: "p8.8_w07_policy_dispatch",
    executionId,
    executionFingerprint,
    reservationId: executionBase.reservation.reservationId,
    claimId: executionBase.claim.claimId,
    policyActionId: executionBase.authorization.policyActionId,
    w06PreflightId: executionBase.preflight.preflightId,
    w06PreflightFingerprint: executionBase.preflight.preflightFingerprint,
    resourceGid: executionBase.target.resourceGid,
    field: executionBase.target.field,
    beforeFingerprint: executionBase.state.beforeFingerprint,
    afterFingerprint: executionBase.state.afterFingerprint,
  });
  const dispatchId = "p88w07-dispatch-" + dispatchFingerprint.slice(0, 24);

  return deepFreeze({
    ...executionBase,
    executionId,
    executionFingerprint,
    dispatchId,
    dispatchFingerprint,
  });
}

export function assertP88W07ExecutionIntentIntegrity(
  input: P88W07W06Handoff,
  supplied: P88W07ExecutionIntent,
): P88W07ExecutionIntent {
  const rebuilt = projectP88W07ExecutionIntent(input);
  if (stableJson(rebuilt) !== stableJson(supplied)) {
    throw new Error("p88_w07_execution_intent_integrity_mismatch");
  }
  return rebuilt;
}

export function p88W07DispatchEligibilityIssues(
  intent: P88W07ExecutionIntent,
  eligibility: P88W07DispatchEligibility,
): readonly string[] {
  const issues: string[] = [];
  if (!eligibility.publicSiteWritesEnabled) {
    issues.push("public_site_writes_gate_closed");
  }
  if (!eligibility.policyMutationExecutionEnabled) {
    issues.push("policy_mutation_execution_gate_closed");
  }
  if (!eligibility.quotaAvailable) issues.push("mutation_quota_exhausted");
  if (!eligibility.sameTargetCooldownSatisfied) {
    issues.push("same_target_cooldown_not_satisfied");
  }
  if (!eligibility.noHumanExecutionConflict) {
    issues.push("human_execution_conflict");
  }
  if (eligibility.credentialProfileId !== intent.credentialProfileId) {
    issues.push("credential_profile_mismatch");
  }
  if (!eligibility.credentialScopes.includes("write_products")) {
    issues.push("write_products_scope_missing");
  }
  return [...new Set(issues)].sort((a, b) => a.localeCompare(b));
}

const ALLOWED_TRANSITIONS: Readonly<Record<P88W07DispatchState, readonly P88W07DispatchState[]>> =
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

export function assertP88W07TransitionAllowed(
  from: P88W07DispatchState,
  to: P88W07DispatchState,
): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error("p88_w07_transition_not_allowed:" + from + "->" + to);
  }
}

export function p88W07IsTerminalState(state: P88W07DispatchState): boolean {
  return [
    "forward_rejected_no_write",
    "forward_verified_live",
    "rollback_verified_closed",
    "cancelled_before_dispatch",
    "manual_intervention_required",
  ].includes(state);
}

export function p88W07ReservationTerminalStatus(
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

export function buildP88W07VerificationEvidence(input: Omit<
  P88W07VerificationEvidence,
  "verificationFingerprint"
>): P88W07VerificationEvidence {
  const failureCategories = [...new Set(input.failureCategories)]
    .sort((a, b) => a.localeCompare(b));
  if (
    input.providerObservedFingerprint !== null
    && !HEX_64.test(input.providerObservedFingerprint)
  ) {
    throw new Error("p88_w07_verification_provider_fingerprint_invalid");
  }
  const base = {
    status: input.status,
    providerRawValue: input.providerRawValue,
    providerObservedFingerprint: input.providerObservedFingerprint,
    providerVerified: input.providerVerified,
    storefrontVerified: input.storefrontVerified,
    failureCategories,
  };
  return deepFreeze({
    ...base,
    verificationFingerprint: p88W07StableHash({
      purpose: "p8.8_w07_independent_verification",
      ...base,
    }),
  });
}

export function assessP88W07Verification(input: {
  target: P88W02ProductTargetBinding;
  purpose: "before" | "after";
  expectedValue: string | null;
  expectedFingerprint: string;
  evidence: P88W07VerificationEvidence;
}): P88W07VerificationAssessment {
  const canonicalEvidence = buildP88W07VerificationEvidence({
    status: input.evidence.status,
    providerRawValue: input.evidence.providerRawValue,
    providerObservedFingerprint: input.evidence.providerObservedFingerprint,
    providerVerified: input.evidence.providerVerified,
    storefrontVerified: input.evidence.storefrontVerified,
    failureCategories: input.evidence.failureCategories,
  });
  if (stableJson(canonicalEvidence) !== stableJson(input.evidence)) {
    throw new Error("p88_w07_verification_evidence_integrity_mismatch");
  }

  const reconstructed = p88W02StateFingerprint({
    target: input.target,
    value: input.evidence.providerRawValue,
    purpose: input.purpose,
  });
  const exactProviderStateMatched =
    input.evidence.providerRawValue === input.expectedValue
    && reconstructed === input.expectedFingerprint
    && input.evidence.providerObservedFingerprint === reconstructed;

  const reasons: string[] = [];
  if (input.evidence.status === "unavailable") {
    reasons.push("verification_unavailable");
  }
  if (!exactProviderStateMatched) reasons.push("provider_exact_state_mismatch");
  if (!input.evidence.providerVerified) {
    reasons.push("independent_provider_verification_failed");
  }
  if (!input.evidence.storefrontVerified) {
    reasons.push("independent_storefront_verification_failed");
  }
  for (const category of input.evidence.failureCategories) reasons.push(category);

  let status: "verified" | "failed" | "unavailable";
  if (input.evidence.status === "unavailable") status = "unavailable";
  else if (
    input.evidence.status === "verified"
    && exactProviderStateMatched
    && input.evidence.providerVerified
    && input.evidence.storefrontVerified
    && input.evidence.failureCategories.length === 0
  ) status = "verified";
  else status = "failed";

  const normalizedReasons = [...new Set(reasons)]
    .sort((a, b) => a.localeCompare(b));
  const base = {
    status,
    exactProviderStateMatched,
    independentProviderVerified: input.evidence.providerVerified,
    independentStorefrontVerified: input.evidence.storefrontVerified,
    reasons: normalizedReasons,
  };
  return deepFreeze({
    ...base,
    assessmentFingerprint: p88W07StableHash({
      purpose: "p8.8_w07_verification_assessment",
      target: input.target,
      expectedPurpose: input.purpose,
      expectedFingerprint: input.expectedFingerprint,
      evidenceFingerprint: input.evidence.verificationFingerprint,
      ...base,
    }),
  });
}
