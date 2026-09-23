import {
  assessP88W07Verification,
  p88W07StableHash,
  type P88W07DispatchEligibility,
  type P88W07ExecutionIntent,
  type P88W07VerificationAssessment,
  type P88W07VerificationEvidence,
  type P88W07W06Handoff,
} from "./p8-8-policy-single-action-apply.js";
import {
  type P88W07DispatchReceipt,
  type P88W07DispatchStore,
} from "./p8-8-policy-dispatch-store.js";
import {
  type P88W07ShopifyMutationResult,
} from "./p8-8-policy-shopify-mutation.js";
import type { P88W06ProviderObservation } from "./p8-8-policy-preflight.js";

export const P8_8_W07_ORCHESTRATOR_VERSION =
  "p8-8-w07-policy-apply-orchestrator-v1" as const;

export type P88W07MutationInvoker = (input: {
  intent: P88W07ExecutionIntent;
  purpose: "forward" | "rollback";
}) => Promise<P88W07ShopifyMutationResult>;

export type P88W07IndependentVerifier = (input: {
  intent: P88W07ExecutionIntent;
  purpose: "forward" | "rollback";
}) => Promise<P88W07VerificationEvidence>;

export type P88W07ExecutionResult = Readonly<{
  version: typeof P8_8_W07_ORCHESTRATOR_VERSION;
  disposition:
    | "reserved_prewrite"
    | "already_started_or_terminal"
    | "forward_rejected_no_write"
    | "forward_verified_live"
    | "rollback_required"
    | "rollback_verified_closed"
    | "manual_intervention_required";
  receipt: P88W07DispatchReceipt;
  mutationResult: P88W07ShopifyMutationResult | null;
  verificationAssessment: P88W07VerificationAssessment | null;
  executionFingerprint: string;
  providerMutationCalls: 0 | 1;
  rollbackMutationCalls: 0 | 1;
  automaticWriteRetryPerformed: false;
  task51ExecutionPerformed: false;
  task53ExecutionPerformed: false;
  task54ExecutionPerformed: false;
}>;

function result(input: Omit<
  P88W07ExecutionResult,
  "version" | "executionFingerprint"
>): P88W07ExecutionResult {
  const base = {
    version: P8_8_W07_ORCHESTRATOR_VERSION,
    ...input,
  };
  return Object.freeze({
    ...base,
    executionFingerprint: p88W07StableHash({
      purpose: "p8.8_w07_orchestrator_result",
      disposition: base.disposition,
      dispatchId: base.receipt.dispatchId,
      dispatchFingerprint: base.receipt.dispatchFingerprint,
      dispatchState: base.receipt.state,
      dispatchRevision: base.receipt.revision,
      mutationFingerprint:
        base.mutationResult?.responseFingerprint
        ?? base.mutationResult?.operationFingerprint
        ?? null,
      verificationFingerprint:
        base.verificationAssessment?.assessmentFingerprint ?? null,
      providerMutationCalls: base.providerMutationCalls,
      rollbackMutationCalls: base.rollbackMutationCalls,
    }),
  });
}

function exactAssessment(input: {
  handoff: P88W07W06Handoff;
  intent: P88W07ExecutionIntent;
  purpose: "forward" | "rollback";
  evidence: P88W07VerificationEvidence;
}): P88W07VerificationAssessment {
  const expectedValue = input.purpose === "forward"
    ? input.intent.state.afterValue
    : input.intent.state.beforeValue;
  const expectedFingerprint = input.purpose === "forward"
    ? input.intent.state.afterFingerprint
    : input.intent.state.beforeFingerprint;
  return assessP88W07Verification({
    target: input.handoff.lineage.w02Materialization.target,
    purpose: input.purpose === "forward" ? "after" : "before",
    expectedValue,
    expectedFingerprint,
    evidence: input.evidence,
  });
}

export async function runP88W07ForwardExecution(input: {
  store: P88W07DispatchStore;
  handoff: P88W07W06Handoff;
  intent: P88W07ExecutionIntent;
  eligibility: P88W07DispatchEligibility;
  finalBeforeObservation: P88W06ProviderObservation;
  mutate: P88W07MutationInvoker;
  verify: P88W07IndependentVerifier;
}): Promise<P88W07ExecutionResult> {
  const reserved = await input.store.reservePrewrite({
    handoff: input.handoff,
    intent: input.intent,
  });

  const started = await input.store.startDispatch({
    handoff: input.handoff,
    intent: input.intent,
    eligibility: input.eligibility,
    finalBeforeObservation: input.finalBeforeObservation,
  });

  if (started.kind === "already_started_or_terminal") {
    return result({
      disposition: "already_started_or_terminal",
      receipt: started.receipt,
      mutationResult: null,
      verificationAssessment: null,
      providerMutationCalls: 0,
      rollbackMutationCalls: 0,
      automaticWriteRetryPerformed: false,
      task51ExecutionPerformed: false,
      task53ExecutionPerformed: false,
      task54ExecutionPerformed: false,
    });
  }

  let mutation: P88W07ShopifyMutationResult;
  try {
    mutation = await input.mutate({
      intent: input.intent,
      purpose: "forward",
    });
  } catch {
    const receipt = await input.store.transition({
      intent: input.intent,
      expectedStates: ["dispatch_started"],
      toState: "manual_intervention_required",
      reason: "forward_mutation_invoker_threw_after_dispatch_started",
      publicWriteOccurrence: "possible",
      rollbackWriteOccurrence: "none",
    });
    return result({
      disposition: "manual_intervention_required",
      receipt,
      mutationResult: null,
      verificationAssessment: null,
      providerMutationCalls: 1,
      rollbackMutationCalls: 0,
      automaticWriteRetryPerformed: false,
      task51ExecutionPerformed: false,
      task53ExecutionPerformed: false,
      task54ExecutionPerformed: false,
    });
  }

  if (mutation.kind === "uncertain") {
    const receipt = await input.store.transition({
      intent: input.intent,
      expectedStates: ["dispatch_started"],
      toState: "manual_intervention_required",
      reason: "forward_mutation_outcome_uncertain",
      publicWriteOccurrence: "possible",
      rollbackWriteOccurrence: "none",
      providerRequestId: mutation.requestId,
      providerOperationFingerprint: mutation.operationFingerprint,
      providerResponseFingerprint: mutation.responseFingerprint,
      eventEvidenceFingerprint:
        mutation.responseFingerprint ?? mutation.operationFingerprint,
    });
    return result({
      disposition: "manual_intervention_required",
      receipt,
      mutationResult: mutation,
      verificationAssessment: null,
      providerMutationCalls: 1,
      rollbackMutationCalls: 0,
      automaticWriteRetryPerformed: false,
      task51ExecutionPerformed: false,
      task53ExecutionPerformed: false,
      task54ExecutionPerformed: false,
    });
  }

  if (mutation.kind === "rejected") {
    const evidence = await input.verify({
      intent: input.intent,
      purpose: "rollback",
    });
    const assessment = exactAssessment({
      handoff: input.handoff,
      intent: input.intent,
      purpose: "rollback",
      evidence,
    });
    if (assessment.status === "verified") {
      const receipt = await input.store.transition({
        intent: input.intent,
        expectedStates: ["dispatch_started"],
        toState: "forward_rejected_no_write",
        reason: "forward_rejected_exact_before_state_verified",
        publicWriteOccurrence: "none",
        rollbackWriteOccurrence: "none",
        providerRequestId: mutation.requestId,
        providerOperationFingerprint: mutation.operationFingerprint,
        providerResponseFingerprint: mutation.responseFingerprint,
        eventEvidenceFingerprint: assessment.assessmentFingerprint,
      });
      return result({
        disposition: "forward_rejected_no_write",
        receipt,
        mutationResult: mutation,
        verificationAssessment: assessment,
        providerMutationCalls: 1,
        rollbackMutationCalls: 0,
        automaticWriteRetryPerformed: false,
        task51ExecutionPerformed: false,
        task53ExecutionPerformed: false,
        task54ExecutionPerformed: false,
      });
    }

    const receipt = await input.store.transition({
      intent: input.intent,
      expectedStates: ["dispatch_started"],
      toState: "manual_intervention_required",
      reason: assessment.status === "unavailable"
        ? "forward_rejection_before_state_verification_unavailable"
        : "forward_rejection_before_state_not_exact",
      publicWriteOccurrence: "possible",
      rollbackWriteOccurrence: "none",
      providerRequestId: mutation.requestId,
      providerOperationFingerprint: mutation.operationFingerprint,
      providerResponseFingerprint: mutation.responseFingerprint,
      eventEvidenceFingerprint: assessment.assessmentFingerprint,
    });
    return result({
      disposition: "manual_intervention_required",
      receipt,
      mutationResult: mutation,
      verificationAssessment: assessment,
      providerMutationCalls: 1,
      rollbackMutationCalls: 0,
      automaticWriteRetryPerformed: false,
      task51ExecutionPerformed: false,
      task53ExecutionPerformed: false,
      task54ExecutionPerformed: false,
    });
  }

  const pending = await input.store.transition({
    intent: input.intent,
    expectedStates: ["dispatch_started"],
    toState: "forward_verification_pending",
    reason: "forward_mutation_accepted_verification_required",
    publicWriteOccurrence: "confirmed",
    rollbackWriteOccurrence: "none",
    providerRequestId: mutation.requestId,
    providerOperationFingerprint: mutation.operationFingerprint,
    providerResponseFingerprint: mutation.responseFingerprint,
    eventEvidenceFingerprint: mutation.responseFingerprint,
  });

  let evidence: P88W07VerificationEvidence;
  try {
    evidence = await input.verify({
      intent: input.intent,
      purpose: "forward",
    });
  } catch {
    const receipt = await input.store.transition({
      intent: input.intent,
      expectedStates: ["forward_verification_pending"],
      toState: "manual_intervention_required",
      reason: "forward_verification_invoker_threw",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "none",
      providerRequestId: mutation.requestId,
      providerOperationFingerprint: mutation.operationFingerprint,
      providerResponseFingerprint: mutation.responseFingerprint,
    });
    return result({
      disposition: "manual_intervention_required",
      receipt,
      mutationResult: mutation,
      verificationAssessment: null,
      providerMutationCalls: 1,
      rollbackMutationCalls: 0,
      automaticWriteRetryPerformed: false,
      task51ExecutionPerformed: false,
      task53ExecutionPerformed: false,
      task54ExecutionPerformed: false,
    });
  }

  const assessment = exactAssessment({
    handoff: input.handoff,
    intent: input.intent,
    purpose: "forward",
    evidence,
  });

  if (assessment.status === "verified") {
    const receipt = await input.store.transition({
      intent: input.intent,
      expectedStates: ["forward_verification_pending"],
      toState: "forward_verified_live",
      reason: "forward_exact_provider_and_storefront_verified",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "none",
      providerRequestId: mutation.requestId,
      providerOperationFingerprint: mutation.operationFingerprint,
      providerResponseFingerprint: mutation.responseFingerprint,
      eventEvidenceFingerprint: assessment.assessmentFingerprint,
    });
    return result({
      disposition: "forward_verified_live",
      receipt,
      mutationResult: mutation,
      verificationAssessment: assessment,
      providerMutationCalls: 1,
      rollbackMutationCalls: 0,
      automaticWriteRetryPerformed: false,
      task51ExecutionPerformed: false,
      task53ExecutionPerformed: false,
      task54ExecutionPerformed: false,
    });
  }

  if (assessment.status === "failed") {
    const receipt = await input.store.transition({
      intent: input.intent,
      expectedStates: ["forward_verification_pending"],
      toState: "rollback_required",
      reason: "forward_verification_failed_after_confirmed_write",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "none",
      providerRequestId: mutation.requestId,
      providerOperationFingerprint: mutation.operationFingerprint,
      providerResponseFingerprint: mutation.responseFingerprint,
      eventEvidenceFingerprint: assessment.assessmentFingerprint,
    });
    return result({
      disposition: "rollback_required",
      receipt,
      mutationResult: mutation,
      verificationAssessment: assessment,
      providerMutationCalls: 1,
      rollbackMutationCalls: 0,
      automaticWriteRetryPerformed: false,
      task51ExecutionPerformed: false,
      task53ExecutionPerformed: false,
      task54ExecutionPerformed: false,
    });
  }

  const receipt = await input.store.transition({
    intent: input.intent,
    expectedStates: ["forward_verification_pending"],
    toState: "manual_intervention_required",
    reason: "forward_verification_unavailable_after_confirmed_write",
    publicWriteOccurrence: "confirmed",
    rollbackWriteOccurrence: "none",
    providerRequestId: mutation.requestId,
    providerOperationFingerprint: mutation.operationFingerprint,
    providerResponseFingerprint: mutation.responseFingerprint,
    eventEvidenceFingerprint: assessment.assessmentFingerprint,
  });
  return result({
    disposition: "manual_intervention_required",
    receipt,
    mutationResult: mutation,
    verificationAssessment: assessment,
    providerMutationCalls: 1,
    rollbackMutationCalls: 0,
    automaticWriteRetryPerformed: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
  });
}

export async function runP88W07RollbackClosure(input: {
  store: P88W07DispatchStore;
  handoff: P88W07W06Handoff;
  intent: P88W07ExecutionIntent;
  mutate: P88W07MutationInvoker;
  verify: P88W07IndependentVerifier;
}): Promise<P88W07ExecutionResult> {
  const before = await input.store.readDispatch(input.intent);
  if (!before) throw new Error("p88_w07_rollback_dispatch_missing");

  if (before.state !== "rollback_required") {
    if (
      before.state === "rollback_started"
      || before.state === "rollback_verification_pending"
      || before.state === "rollback_verified_closed"
      || before.state === "manual_intervention_required"
    ) {
      return result({
        disposition: before.state === "rollback_verified_closed"
          ? "rollback_verified_closed"
          : before.state === "manual_intervention_required"
            ? "manual_intervention_required"
            : "already_started_or_terminal",
        receipt: before,
        mutationResult: null,
        verificationAssessment: null,
        providerMutationCalls: 0,
        rollbackMutationCalls: 0,
        automaticWriteRetryPerformed: false,
        task51ExecutionPerformed: false,
        task53ExecutionPerformed: false,
        task54ExecutionPerformed: false,
      });
    }
    throw new Error("p88_w07_rollback_not_required");
  }

  const started = await input.store.transition({
    intent: input.intent,
    expectedStates: ["rollback_required"],
    toState: "rollback_started",
    reason: "rollback_attempt_point_of_no_return",
    publicWriteOccurrence: "confirmed",
    rollbackWriteOccurrence: "possible",
  });

  let mutation: P88W07ShopifyMutationResult;
  try {
    mutation = await input.mutate({
      intent: input.intent,
      purpose: "rollback",
    });
  } catch {
    const receipt = await input.store.transition({
      intent: input.intent,
      expectedStates: ["rollback_started"],
      toState: "manual_intervention_required",
      reason: "rollback_mutation_invoker_threw",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "possible",
    });
    return result({
      disposition: "manual_intervention_required",
      receipt,
      mutationResult: null,
      verificationAssessment: null,
      providerMutationCalls: 0,
      rollbackMutationCalls: 1,
      automaticWriteRetryPerformed: false,
      task51ExecutionPerformed: false,
      task53ExecutionPerformed: false,
      task54ExecutionPerformed: false,
    });
  }

  if (mutation.kind !== "accepted") {
    const receipt = await input.store.transition({
      intent: input.intent,
      expectedStates: ["rollback_started"],
      toState: "manual_intervention_required",
      reason: mutation.kind === "uncertain"
        ? "rollback_mutation_outcome_uncertain"
        : "rollback_mutation_rejected",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: mutation.kind === "uncertain" ? "possible" : "none",
      providerRequestId: mutation.requestId,
      providerOperationFingerprint: mutation.operationFingerprint,
      providerResponseFingerprint: mutation.responseFingerprint,
      eventEvidenceFingerprint:
        mutation.responseFingerprint ?? mutation.operationFingerprint,
    });
    return result({
      disposition: "manual_intervention_required",
      receipt,
      mutationResult: mutation,
      verificationAssessment: null,
      providerMutationCalls: 0,
      rollbackMutationCalls: 1,
      automaticWriteRetryPerformed: false,
      task51ExecutionPerformed: false,
      task53ExecutionPerformed: false,
      task54ExecutionPerformed: false,
    });
  }

  await input.store.transition({
    intent: input.intent,
    expectedStates: ["rollback_started"],
    toState: "rollback_verification_pending",
    reason: "rollback_mutation_accepted_verification_required",
    publicWriteOccurrence: "confirmed",
    rollbackWriteOccurrence: "confirmed",
    providerRequestId: mutation.requestId,
    providerOperationFingerprint: mutation.operationFingerprint,
    providerResponseFingerprint: mutation.responseFingerprint,
    eventEvidenceFingerprint: mutation.responseFingerprint,
  });

  let evidence: P88W07VerificationEvidence;
  try {
    evidence = await input.verify({
      intent: input.intent,
      purpose: "rollback",
    });
  } catch {
    const receipt = await input.store.transition({
      intent: input.intent,
      expectedStates: ["rollback_verification_pending"],
      toState: "manual_intervention_required",
      reason: "rollback_verification_invoker_threw",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "confirmed",
    });
    return result({
      disposition: "manual_intervention_required",
      receipt,
      mutationResult: mutation,
      verificationAssessment: null,
      providerMutationCalls: 0,
      rollbackMutationCalls: 1,
      automaticWriteRetryPerformed: false,
      task51ExecutionPerformed: false,
      task53ExecutionPerformed: false,
      task54ExecutionPerformed: false,
    });
  }

  const assessment = exactAssessment({
    handoff: input.handoff,
    intent: input.intent,
    purpose: "rollback",
    evidence,
  });

  if (assessment.status === "verified") {
    const receipt = await input.store.transition({
      intent: input.intent,
      expectedStates: ["rollback_verification_pending"],
      toState: "rollback_verified_closed",
      reason: "rollback_exact_provider_and_storefront_verified",
      publicWriteOccurrence: "confirmed",
      rollbackWriteOccurrence: "confirmed",
      providerRequestId: mutation.requestId,
      providerOperationFingerprint: mutation.operationFingerprint,
      providerResponseFingerprint: mutation.responseFingerprint,
      eventEvidenceFingerprint: assessment.assessmentFingerprint,
    });
    return result({
      disposition: "rollback_verified_closed",
      receipt,
      mutationResult: mutation,
      verificationAssessment: assessment,
      providerMutationCalls: 0,
      rollbackMutationCalls: 1,
      automaticWriteRetryPerformed: false,
      task51ExecutionPerformed: false,
      task53ExecutionPerformed: false,
      task54ExecutionPerformed: false,
    });
  }

  const receipt = await input.store.transition({
    intent: input.intent,
    expectedStates: ["rollback_verification_pending"],
    toState: "manual_intervention_required",
    reason: assessment.status === "unavailable"
      ? "rollback_verification_unavailable"
      : "rollback_verification_failed",
    publicWriteOccurrence: "confirmed",
    rollbackWriteOccurrence: "confirmed",
    providerRequestId: mutation.requestId,
    providerOperationFingerprint: mutation.operationFingerprint,
    providerResponseFingerprint: mutation.responseFingerprint,
    eventEvidenceFingerprint: assessment.assessmentFingerprint,
  });
  return result({
    disposition: "manual_intervention_required",
    receipt,
    mutationResult: mutation,
    verificationAssessment: assessment,
    providerMutationCalls: 0,
    rollbackMutationCalls: 1,
    automaticWriteRetryPerformed: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
  });
}

export function p88W07OrchestratorCapability() {
  return Object.freeze({
    version: P8_8_W07_ORCHESTRATOR_VERSION,
    mutationInvokerInjected: true,
    independentVerifierInjected: true,
    providerReceiptSufficientForSuccess: false,
    exactProviderStateRequired: true,
    independentProviderAndStorefrontRequired: true,
    forwardMutationCallsMaximumPerInvocation: 1,
    rollbackMutationCallsMaximumPerInvocation: 1,
    automaticWriteRetryAllowed: false,
    humanTaskPathUsed: false,
    routeBindingProvided: false,
    schedulerBindingProvided: false,
    workerBindingProvided: false,
    liveActivationProvided: false,
  });
}
