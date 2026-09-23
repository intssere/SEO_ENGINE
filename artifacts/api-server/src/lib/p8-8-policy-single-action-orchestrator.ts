import {
  projectP88W07ExecutionIntent,
  type P88W07DispatchState,
  type P88W07ExecutionInput,
  type P88W07ExecutionIntent,
} from "./p8-8-policy-single-action-apply.js";
import {
  P88W07DispatchStore,
  type P88W07DispatchRecord,
} from "./p8-8-policy-dispatch-store.js";
import {
  prepareP88W07ShopifyMutation,
  sendP88W07ShopifyMutation,
  type P88W07MutationResult,
  type P88W07ShopifyWriteCredential,
} from "./p8-8-policy-shopify-mutation.js";
import {
  p88W07ProviderMatchesExpected,
  runP88W07IndependentVerification,
  type P88W07ProviderEvidence,
  type P88W07StorefrontEvidence,
  type P88W07VerificationResult,
} from "./p8-8-policy-single-action-safety.js";
import type { P88W05ControlMode } from "./p8-8-mutation-control.js";

export const P8_8_W07_ORCHESTRATOR_VERSION =
  "p8-8-w07-single-action-orchestrator-v1" as const;

export type P88W07ExecutionDisposition =
  | "cancelled_before_dispatch"
  | "forward_rejected_no_write"
  | "forward_verified_live"
  | "rollback_verified_closed"
  | "manual_intervention_required"
  | "state_uncertain";

export type P88W07ExecutionOutcome = Readonly<{
  version: typeof P8_8_W07_ORCHESTRATOR_VERSION;
  disposition: P88W07ExecutionDisposition;
  dispatch: P88W07DispatchRecord | null;
  forwardMutation: P88W07MutationResult | null;
  forwardVerification: P88W07VerificationResult | null;
  rollbackMutation: P88W07MutationResult | null;
  rollbackVerification: P88W07VerificationResult | null;
  providerForwardWriteAttempts: 0 | 1;
  providerRollbackWriteAttempts: 0 | 1;
  automaticForwardRetryPerformed: false;
  automaticRollbackRetryPerformed: false;
  task51ExecutionPerformed: false;
  task53ExecutionPerformed: false;
  task54ExecutionPerformed: false;
}>;

export type P88W07OrchestratorDependencies = Readonly<{
  store: P88W07DispatchStore;
  writeCredential: P88W07ShopifyWriteCredential;
  mutationFetch: typeof fetch;
  publicSiteWritesEnabled: boolean;
  policyMutationExecutionEnabled: boolean;
  readProvider: (input: {
    intent: P88W07ExecutionIntent;
    expectedState: "before" | "after";
  }) => Promise<P88W07ProviderEvidence>;
  verifyStorefront: (input: {
    intent: P88W07ExecutionIntent;
    expectedState: "before" | "after";
  }) => Promise<P88W07StorefrontEvidence>;
  readControlMode: (siteId: string) => Promise<P88W05ControlMode | null>;
}>;

function outcome(input: {
  disposition: P88W07ExecutionDisposition;
  dispatch: P88W07DispatchRecord | null;
  forwardMutation?: P88W07MutationResult | null;
  forwardVerification?: P88W07VerificationResult | null;
  rollbackMutation?: P88W07MutationResult | null;
  rollbackVerification?: P88W07VerificationResult | null;
}): P88W07ExecutionOutcome {
  return Object.freeze({
    version: P8_8_W07_ORCHESTRATOR_VERSION,
    disposition: input.disposition,
    dispatch: input.dispatch,
    forwardMutation: input.forwardMutation ?? null,
    forwardVerification: input.forwardVerification ?? null,
    rollbackMutation: input.rollbackMutation ?? null,
    rollbackVerification: input.rollbackVerification ?? null,
    providerForwardWriteAttempts:
      input.dispatch?.forwardAttemptCount ?? 0,
    providerRollbackWriteAttempts:
      input.dispatch?.rollbackAttemptCount ?? 0,
    automaticForwardRetryPerformed: false as const,
    automaticRollbackRetryPerformed: false as const,
    task51ExecutionPerformed: false as const,
    task53ExecutionPerformed: false as const,
    task54ExecutionPerformed: false as const,
  });
}

function terminalDisposition(
  state: P88W07DispatchState,
): P88W07ExecutionDisposition | null {
  if (state === "cancelled_before_dispatch") return state;
  if (state === "forward_rejected_no_write") return state;
  if (state === "forward_verified_live") return state;
  if (state === "rollback_verified_closed") return state;
  if (state === "manual_intervention_required") return state;
  return null;
}

async function manual(
  executionInput: P88W07ExecutionInput,
  store: P88W07DispatchStore,
  record: P88W07DispatchRecord,
  reason: string,
  evidence: {
    providerRequestId?: string | null;
    providerRequestFingerprint?: string | null;
    providerResponseFingerprint?: string | null;
    rollbackRequestId?: string | null;
    rollbackRequestFingerprint?: string | null;
    rollbackResponseFingerprint?: string | null;
  } = {},
): Promise<P88W07ExecutionOutcome> {
  const advanced = await store.advance({
    executionInput,
    dispatchId: record.dispatchId,
    expectedRevision: record.rowRevision,
    expectedState: record.state,
    toState: "manual_intervention_required",
    transitionReason: reason,
    ...evidence,
  });
  return outcome({
    disposition: "manual_intervention_required",
    dispatch: advanced.record,
  });
}

async function verify(
  intent: P88W07ExecutionIntent,
  expectedState: "before" | "after",
  dependencies: P88W07OrchestratorDependencies,
): Promise<P88W07VerificationResult> {
  return runP88W07IndependentVerification({
    intent,
    expectedState,
    readProvider: dependencies.readProvider,
    verifyStorefront: dependencies.verifyStorefront,
  });
}

async function rollback(
  executionInput: P88W07ExecutionInput,
  intent: P88W07ExecutionIntent,
  record: P88W07DispatchRecord,
  dependencies: P88W07OrchestratorDependencies,
  forwardMutation: P88W07MutationResult | null,
  forwardVerification: P88W07VerificationResult | null,
): Promise<P88W07ExecutionOutcome> {
  let current = record;
  if (current.state === "forward_verification_pending") {
    const required = await dependencies.store.advance({
      executionInput,
      dispatchId: current.dispatchId,
      expectedRevision: current.rowRevision,
      expectedState: current.state,
      toState: "rollback_required",
      transitionReason: "forward_state_requires_safety_rollback",
    });
    current = required.record;
  }

  if (current.state === "rollback_required") {
    const prepared = prepareP88W07ShopifyMutation({
      intent,
      direction: "rollback",
    });
    const started = await dependencies.store.advance({
      executionInput,
      dispatchId: current.dispatchId,
      expectedRevision: current.rowRevision,
      expectedState: current.state,
      toState: "rollback_started",
      transitionReason: "rollback_point_of_no_return",
      rollbackRequestFingerprint: prepared.requestFingerprint,
    });
    current = started.record;

    const mutation = await sendP88W07ShopifyMutation({
      prepared,
      credential: dependencies.writeCredential,
      fetchImpl: dependencies.mutationFetch,
    });

    if (mutation.outcome !== "accepted") {
      const closed = await manual(
        executionInput,
        dependencies.store,
        current,
        mutation.outcome === "rejected"
          ? "rollback_mutation_rejected"
          : "rollback_mutation_outcome_uncertain",
        {
          rollbackRequestId: mutation.requestId,
          rollbackRequestFingerprint: mutation.requestFingerprint,
          rollbackResponseFingerprint: mutation.responseFingerprint,
        },
      );
      return Object.freeze({
        ...closed,
        forwardMutation,
        forwardVerification,
        rollbackMutation: mutation,
      });
    }

    const pending = await dependencies.store.advance({
      executionInput,
      dispatchId: current.dispatchId,
      expectedRevision: current.rowRevision,
      expectedState: current.state,
      toState: "rollback_verification_pending",
      transitionReason: "rollback_mutation_accepted_verification_pending",
      rollbackRequestId: mutation.requestId,
      rollbackRequestFingerprint: mutation.requestFingerprint,
      rollbackResponseFingerprint: mutation.responseFingerprint,
    });
    current = pending.record;

    const verification = await verify(intent, "before", dependencies);
    if (verification.status === "verified") {
      const closed = await dependencies.store.advance({
        executionInput,
        dispatchId: current.dispatchId,
        expectedRevision: current.rowRevision,
        expectedState: current.state,
        toState: "rollback_verified_closed",
        transitionReason: "rollback_restore_verified_by_provider_and_storefront",
      });
      return outcome({
        disposition: "rollback_verified_closed",
        dispatch: closed.record,
        forwardMutation,
        forwardVerification,
        rollbackMutation: mutation,
        rollbackVerification: verification,
      });
    }

    const closed = await manual(
      executionInput,
      dependencies.store,
      current,
      verification.status === "unavailable"
        ? "rollback_verification_unavailable_after_bounded_evidence"
        : "rollback_verification_failed",
    );
    return Object.freeze({
      ...closed,
      forwardMutation,
      forwardVerification,
      rollbackMutation: mutation,
      rollbackVerification: verification,
    });
  }

  if (current.state === "rollback_started") {
    const provider = await dependencies.readProvider({
      intent,
      expectedState: "before",
    });
    if (!p88W07ProviderMatchesExpected({
      intent,
      expectedState: "before",
      provider,
    })) {
      return manual(
        executionInput,
        dependencies.store,
        current,
        "rollback_outcome_uncertain_after_restart",
      );
    }
    const reconciled = await dependencies.store.advance({
      executionInput,
      dispatchId: current.dispatchId,
      expectedRevision: current.rowRevision,
      expectedState: current.state,
      toState: "rollback_verification_pending",
      transitionReason: "rollback_exact_before_state_observed_after_restart",
    });
    current = reconciled.record;
  }

  if (current.state === "rollback_verification_pending") {
    const verification = await verify(intent, "before", dependencies);
    if (verification.status === "verified") {
      const closed = await dependencies.store.advance({
        executionInput,
        dispatchId: current.dispatchId,
        expectedRevision: current.rowRevision,
        expectedState: current.state,
        toState: "rollback_verified_closed",
        transitionReason: "rollback_restore_verified_by_provider_and_storefront",
      });
      return outcome({
        disposition: "rollback_verified_closed",
        dispatch: closed.record,
        forwardMutation,
        forwardVerification,
        rollbackVerification: verification,
      });
    }
    const closed = await manual(
      executionInput,
      dependencies.store,
      current,
      verification.status === "unavailable"
        ? "rollback_verification_unavailable_after_bounded_evidence"
        : "rollback_verification_failed",
    );
    return Object.freeze({
      ...closed,
      forwardMutation,
      forwardVerification,
      rollbackVerification: verification,
    });
  }

  return outcome({
    disposition: "state_uncertain",
    dispatch: current,
    forwardMutation,
    forwardVerification,
  });
}

async function finishForwardVerification(
  executionInput: P88W07ExecutionInput,
  intent: P88W07ExecutionIntent,
  record: P88W07DispatchRecord,
  dependencies: P88W07OrchestratorDependencies,
  forwardMutation: P88W07MutationResult | null,
): Promise<P88W07ExecutionOutcome> {
  const verification = await verify(intent, "after", dependencies);
  const controlMode = await dependencies.readControlMode(intent.siteId);
  if (!controlMode) {
    const closed = await manual(
      executionInput,
      dependencies.store,
      record,
      "control_state_unavailable_during_safety_closure",
    );
    return Object.freeze({
      ...closed,
      forwardMutation,
      forwardVerification: verification,
    });
  }

  if (
    verification.exactProviderVerified
    && (
      controlMode === "killed"
      || verification.status === "failed"
    )
  ) {
    return rollback(
      executionInput,
      intent,
      record,
      dependencies,
      forwardMutation,
      verification,
    );
  }

  if (verification.status === "verified") {
    const closed = await dependencies.store.advance({
      executionInput,
      dispatchId: record.dispatchId,
      expectedRevision: record.rowRevision,
      expectedState: record.state,
      toState: "forward_verified_live",
      transitionReason: "forward_state_verified_by_provider_and_storefront",
    });
    return outcome({
      disposition: "forward_verified_live",
      dispatch: closed.record,
      forwardMutation,
      forwardVerification: verification,
    });
  }

  const closed = await manual(
    executionInput,
    dependencies.store,
    record,
    verification.status === "unavailable"
      ? "forward_verification_unavailable_after_possible_write"
      : "forward_provider_state_not_safe_for_rollback",
  );
  return Object.freeze({
    ...closed,
    forwardMutation,
    forwardVerification: verification,
  });
}

export async function runP88W07SingleActionApply(input: {
  executionInput: P88W07ExecutionInput;
  dependencies: P88W07OrchestratorDependencies;
}): Promise<P88W07ExecutionOutcome> {
  const intent = projectP88W07ExecutionIntent(input.executionInput);
  const { dependencies } = input;
  const reserved = await dependencies.store.reservePrewrite(
    input.executionInput,
  );

  if (reserved.kind === "blocked") {
    try {
      const cancelled = await dependencies.store.cancelBeforeDispatch({
        executionInput: input.executionInput,
        transitionReason: "pre_dispatch_blocked_" + reserved.reason,
      });
      return outcome({
        disposition: "cancelled_before_dispatch",
        dispatch: cancelled.record,
      });
    } catch {
      return outcome({
        disposition: "state_uncertain",
        dispatch: null,
      });
    }
  }

  let record = reserved.record;
  const terminal = terminalDisposition(record.state);
  if (terminal) return outcome({ disposition: terminal, dispatch: record });

  if (record.state === "dispatch_started") {
    const provider = await dependencies.readProvider({
      intent,
      expectedState: "after",
    });
    if (!p88W07ProviderMatchesExpected({
      intent,
      expectedState: "after",
      provider,
    })) {
      return manual(
        input.executionInput,
        dependencies.store,
        record,
        "forward_outcome_uncertain_after_restart",
      );
    }
    const reconciled = await dependencies.store.advance({
      executionInput: input.executionInput,
      dispatchId: record.dispatchId,
      expectedRevision: record.rowRevision,
      expectedState: record.state,
      toState: "forward_verification_pending",
      transitionReason: "exact_after_state_observed_after_restart",
    });
    record = reconciled.record;
  }

  if (record.state === "forward_verification_pending") {
    return finishForwardVerification(
      input.executionInput,
      intent,
      record,
      dependencies,
      null,
    );
  }

  if (
    record.state === "rollback_required"
    || record.state === "rollback_started"
    || record.state === "rollback_verification_pending"
  ) {
    return rollback(
      input.executionInput,
      intent,
      record,
      dependencies,
      null,
      null,
    );
  }

  if (record.state !== "reserved_prewrite") {
    return outcome({ disposition: "state_uncertain", dispatch: record });
  }

  const before = await dependencies.readProvider({
    intent,
    expectedState: "before",
  });
  if (!p88W07ProviderMatchesExpected({
    intent,
    expectedState: "before",
    provider: before,
  })) {
    const cancelled = await dependencies.store.cancelBeforeDispatch({
      executionInput: input.executionInput,
      transitionReason: "provider_before_state_mismatch",
    });
    return outcome({
      disposition: "cancelled_before_dispatch",
      dispatch: cancelled.record,
    });
  }

  const prepared = prepareP88W07ShopifyMutation({
    intent,
    direction: "forward",
  });
  const started = await dependencies.store.startDispatch({
    executionInput: input.executionInput,
    dispatchId: record.dispatchId,
    expectedRevision: record.rowRevision,
    publicSiteWritesEnabled: dependencies.publicSiteWritesEnabled,
    policyMutationExecutionEnabled:
      dependencies.policyMutationExecutionEnabled,
    credentialProfileId: dependencies.writeCredential.credentialProfileId,
    credentialScopes: dependencies.writeCredential.scopes,
    providerBeforeValue: before.rawValue,
    providerBeforeFingerprint: before.w02Fingerprint!,
    providerRequestFingerprint: prepared.requestFingerprint,
  });
  if (started.kind === "blocked") {
    try {
      const cancelled = await dependencies.store.cancelBeforeDispatch({
        executionInput: input.executionInput,
        transitionReason: "dispatch_start_blocked_" + started.reason,
      });
      return outcome({
        disposition: "cancelled_before_dispatch",
        dispatch: cancelled.record,
      });
    } catch {
      return outcome({
        disposition: "state_uncertain",
        dispatch: record,
      });
    }
  }
  record = started.record;

  if (started.kind === "existing_started") {
    return manual(
      input.executionInput,
      dependencies.store,
      record,
      "forward_dispatch_replay_without_authoritative_result",
    );
  }

  const forwardMutation = await sendP88W07ShopifyMutation({
    prepared,
    credential: dependencies.writeCredential,
    fetchImpl: dependencies.mutationFetch,
  });

  if (forwardMutation.outcome === "uncertain") {
    const closed = await manual(
      input.executionInput,
      dependencies.store,
      record,
      "forward_mutation_outcome_uncertain",
      {
        providerRequestId: forwardMutation.requestId,
        providerRequestFingerprint: forwardMutation.requestFingerprint,
        providerResponseFingerprint: forwardMutation.responseFingerprint,
      },
    );
    return Object.freeze({
      ...closed,
      forwardMutation,
    });
  }

  if (forwardMutation.outcome === "rejected") {
    const observed = await dependencies.readProvider({
      intent,
      expectedState: "before",
    });
    if (p88W07ProviderMatchesExpected({
      intent,
      expectedState: "before",
      provider: observed,
    })) {
      const closed = await dependencies.store.advance({
        executionInput: input.executionInput,
        dispatchId: record.dispatchId,
        expectedRevision: record.rowRevision,
        expectedState: record.state,
        toState: "forward_rejected_no_write",
        transitionReason: "authoritative_rejection_exact_before_state_retained",
        providerRequestId: forwardMutation.requestId,
        providerRequestFingerprint: forwardMutation.requestFingerprint,
        providerResponseFingerprint: forwardMutation.responseFingerprint,
      });
      return outcome({
        disposition: "forward_rejected_no_write",
        dispatch: closed.record,
        forwardMutation,
      });
    }
    const closed = await manual(
      input.executionInput,
      dependencies.store,
      record,
      "rejected_response_without_exact_before_state",
      {
        providerRequestId: forwardMutation.requestId,
        providerRequestFingerprint: forwardMutation.requestFingerprint,
        providerResponseFingerprint: forwardMutation.responseFingerprint,
      },
    );
    return Object.freeze({
      ...closed,
      forwardMutation,
    });
  }

  const pending = await dependencies.store.advance({
    executionInput: input.executionInput,
    dispatchId: record.dispatchId,
    expectedRevision: record.rowRevision,
    expectedState: record.state,
    toState: "forward_verification_pending",
    transitionReason: "forward_mutation_accepted_verification_pending",
    providerRequestId: forwardMutation.requestId,
    providerRequestFingerprint: forwardMutation.requestFingerprint,
    providerResponseFingerprint: forwardMutation.responseFingerprint,
  });
  record = pending.record;

  return finishForwardVerification(
    input.executionInput,
    intent,
    record,
    dependencies,
    forwardMutation,
  );
}

export function p88W07OrchestratorCapability() {
  return Object.freeze({
    version: P8_8_W07_ORCHESTRATOR_VERSION,
    durableDispatchBeforeWrite: true,
    forwardWriteMaximum: 1,
    rollbackWriteMaximum: 1,
    replayForwardWriteAllowed: false,
    replayRollbackWriteAllowed: false,
    verificationReadsMayResume: true,
    independentProviderStorefrontVerificationRequired: true,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    schedulerBinding: false,
    workerBinding: false,
    runtimeActivationIncluded: false,
    productionProviderAccessIncluded: false,
  });
}
