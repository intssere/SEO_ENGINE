import {
  p88W02StateFingerprint,
} from "./p8-8-governed-proposal-materialization.js";
import type {
  P88W06LineageInput,
  P88W06PolicyPreflight,
} from "./p8-8-policy-preflight.js";
import {
  projectP88W07DispatchIntent,
  type P88W07RuntimeChecks,
} from "./p8-8-policy-single-action-apply.js";
import {
  P88W07DispatchStore,
  type P88W07DispatchRecord,
  type P88W07ReserveResult,
} from "./p8-8-policy-dispatch-store.js";
import {
  mutateP88W07ShopifyMetaDescription,
  type P88W07ShopifyMutationReceipt,
  type P88W07ShopifyWriteCredential,
} from "./p8-8-policy-single-action-shopify.js";
import {
  verifyP88W07IndependentState,
  type P88W07IndependentVerification,
  type P88W07ProviderReadObservation,
  type P88W07VerificationDependencies,
} from "./p8-8-policy-single-action-verify.js";

export const P8_8_W07_ORCHESTRATOR_VERSION =
  "p8-8-w07-policy-single-action-orchestrator-v1" as const;

export type P88W07OrchestratorResult = Readonly<{
  version: typeof P8_8_W07_ORCHESTRATOR_VERSION;
  dispatchId: string;
  finalState: P88W07DispatchRecord["state"] | "not_reserved";
  disposition:
    | "blocked_before_reservation"
    | "cancelled_before_dispatch"
    | "forward_rejected_no_write"
    | "forward_verified_live"
    | "rollback_verified_closed"
    | "manual_intervention_required"
    | "replay_requires_safety_recovery";
  reserveKind: P88W07ReserveResult["kind"];
  forwardMutationAttempted: boolean;
  rollbackMutationAttempted: boolean;
  forwardReceipt: P88W07ShopifyMutationReceipt | null;
  rollbackReceipt: P88W07ShopifyMutationReceipt | null;
  forwardVerification: P88W07IndependentVerification | null;
  rollbackVerification: P88W07IndependentVerification | null;
  automaticForwardRetryPerformed: false;
  automaticRollbackRetryPerformed: false;
  task51ExecutionPerformed: false;
  task53ExecutionPerformed: false;
  task54ExecutionPerformed: false;
}>;

function result(input: Omit<
  P88W07OrchestratorResult,
  "version" | "automaticForwardRetryPerformed"
  | "automaticRollbackRetryPerformed" | "task51ExecutionPerformed"
  | "task53ExecutionPerformed" | "task54ExecutionPerformed"
>): P88W07OrchestratorResult {
  return Object.freeze({
    version: P8_8_W07_ORCHESTRATOR_VERSION,
    ...input,
    automaticForwardRetryPerformed: false,
    automaticRollbackRetryPerformed: false,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
  });
}

async function manual(
  store: P88W07DispatchStore,
  current: P88W07DispatchRecord,
  reason: string,
  occurrence: "none" | "possible" | "confirmed",
  rollbackOccurrence: "none" | "possible" | "confirmed",
): Promise<P88W07DispatchRecord> {
  return store.markManualIntervention({
    dispatchId: current.dispatchId,
    expectedRevision: current.revision,
    reason,
    publicWriteOccurrence: occurrence,
    rollbackOccurrence,
  });
}

async function performRollback(input: {
  store: P88W07DispatchStore;
  current: P88W07DispatchRecord;
  lineage: P88W06LineageInput;
  credential: P88W07ShopifyWriteCredential;
  providerFetch: typeof fetch;
  rollbackVerificationDependencies: P88W07VerificationDependencies;
}): Promise<{
  record: P88W07DispatchRecord;
  receipt: P88W07ShopifyMutationReceipt | null;
  verification: P88W07IndependentVerification | null;
}> {
  let current = input.current;
  if (current.state !== "rollback_required") {
    current = await input.store.requireRollback({
      dispatchId: current.dispatchId,
      expectedRevision: current.revision,
    });
  }
  current = await input.store.startRollback({
    dispatchId: current.dispatchId,
    expectedRevision: current.revision,
  });

  const receipt = await mutateP88W07ShopifyMetaDescription({
    phase: "rollback",
    credential: input.credential,
    expectedCredentialProfileId: current.credentialProfileId,
    expectedSiteId: current.siteId,
    resourceGid: current.resourceGid,
    exactValue: input.lineage.w02Materialization.before.value,
    fetchImpl: input.providerFetch,
  });

  if (receipt.status !== "accepted") {
    return {
      record: await manual(
        input.store,
        current,
        receipt.status === "ambiguous"
          ? "w07_rollback_outcome_uncertain"
          : "w07_rollback_rejected",
        "confirmed",
        receipt.status === "ambiguous" ? "possible" : "none",
      ),
      receipt,
      verification: null,
    };
  }

  current = await input.store.rollbackAccepted({
    dispatchId: current.dispatchId,
    expectedRevision: current.revision,
    providerRequestId: receipt.providerRequestId,
    providerRequestFingerprint: receipt.requestFingerprint,
    providerResponseFingerprint: receipt.responseFingerprint!,
  });

  const verification = await verifyP88W07IndependentState({
    purpose: "before",
    target: input.lineage.w02Materialization.target,
    expectedValue: input.lineage.w02Materialization.before.value,
    expectedFingerprint: input.lineage.w02Materialization.before.fingerprint,
    dependencies: input.rollbackVerificationDependencies,
  });

  if (verification.status !== "verified") {
    return {
      record: await manual(
        input.store,
        current,
        verification.status === "unavailable"
          ? "w07_rollback_verification_unavailable"
          : "w07_rollback_verification_failed",
        "confirmed",
        "confirmed",
      ),
      receipt,
      verification,
    };
  }

  return {
    record: await input.store.closeRollbackVerified({
      dispatchId: current.dispatchId,
      expectedRevision: current.revision,
    }),
    receipt,
    verification,
  };
}

export async function runP88W07SingleActionApply(input: {
  lineage: P88W06LineageInput;
  preflight: P88W06PolicyPreflight;
  databaseNow: string;
  runtime: P88W07RuntimeChecks;
  store: P88W07DispatchStore;
  credential: P88W07ShopifyWriteCredential;
  providerFetch: typeof fetch;
  readFinalBefore: () => Promise<P88W07ProviderReadObservation>;
  forwardVerificationDependencies: P88W07VerificationDependencies;
  rollbackVerificationDependencies: P88W07VerificationDependencies;
}): Promise<P88W07OrchestratorResult> {
  const {
    accessToken: _accessToken,
    ...credentialBinding
  } = input.credential;
  const intent = projectP88W07DispatchIntent({
    lineage: input.lineage,
    preflight: input.preflight,
    databaseNow: input.databaseNow,
    runtime: input.runtime,
    credential: credentialBinding,
  });
  const reserve = await input.store.reservePrewrite(intent);
  if (!("record" in reserve)) {
    return result({
      dispatchId: intent.dispatchId,
      finalState: "not_reserved",
      disposition: "blocked_before_reservation",
      reserveKind: reserve.kind,
      forwardMutationAttempted: false,
      rollbackMutationAttempted: false,
      forwardReceipt: null,
      rollbackReceipt: null,
      forwardVerification: null,
      rollbackVerification: null,
    });
  }

  let current = reserve.record;
  if (current.state !== "reserved_prewrite") {
    return result({
      dispatchId: current.dispatchId,
      finalState: current.state,
      disposition:
        current.state === "cancelled_before_dispatch"
          ? "cancelled_before_dispatch"
          : current.state === "forward_rejected_no_write"
            ? "forward_rejected_no_write"
            : current.state === "forward_verified_live"
              ? "forward_verified_live"
              : current.state === "rollback_verified_closed"
                ? "rollback_verified_closed"
                : current.state === "manual_intervention_required"
                  ? "manual_intervention_required"
                  : "replay_requires_safety_recovery",
      reserveKind: reserve.kind,
      forwardMutationAttempted: false,
      rollbackMutationAttempted: false,
      forwardReceipt: null,
      rollbackReceipt: null,
      forwardVerification: null,
      rollbackVerification: null,
    });
  }

  let before: P88W07ProviderReadObservation;
  try {
    before = await input.readFinalBefore();
  } catch {
    before = {
      status: "unavailable",
      resourceGid: current.resourceGid,
      field: "meta_description",
      rawValue: null,
      requestId: null,
      errorCategory: "provider_before_read_threw",
    };
  }
  const exactBefore =
    before.status === "observed"
    && before.resourceGid === current.resourceGid
    && before.field === "meta_description"
    && before.rawValue === input.lineage.w02Materialization.before.value
    && p88W02StateFingerprint({
      target: input.lineage.w02Materialization.target,
      value: before.rawValue,
      purpose: "before",
    }) === current.beforeFingerprint;

  if (!exactBefore) {
    current = await input.store.cancelBeforeDispatch({
      dispatchId: current.dispatchId,
      expectedRevision: current.revision,
      reason: "w07_final_before_state_not_exact",
    });
    return result({
      dispatchId: current.dispatchId,
      finalState: current.state,
      disposition: "cancelled_before_dispatch",
      reserveKind: reserve.kind,
      forwardMutationAttempted: false,
      rollbackMutationAttempted: false,
      forwardReceipt: null,
      rollbackReceipt: null,
      forwardVerification: null,
      rollbackVerification: null,
    });
  }

  try {
    current = await input.store.startDispatch({
      dispatchId: current.dispatchId,
      expectedRevision: current.revision,
      finalBeforeFingerprint: current.beforeFingerprint,
      publicSiteWritesEnabled: input.runtime.publicSiteWritesEnabled,
      policyMutationExecutionEnabled: input.runtime.policyMutationExecutionEnabled,
      credentialProfileId: input.credential.credentialProfileId,
      writeProductsScopePresent: input.credential.scopes.includes("write_products"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "p88_w07_dispatch_start_failed";
    if (
      message.includes("control_epoch_not_forward_eligible")
      || message.includes("authorization_expired")
      || message.includes("preflight_expired")
      || message.includes("execution_gate_closed")
      || message.includes("write_credential_binding_invalid")
    ) {
      current = await input.store.cancelBeforeDispatch({
        dispatchId: current.dispatchId,
        expectedRevision: current.revision,
        reason: "w07_dispatch_start_blocked_no_dispatch",
      });
      return result({
        dispatchId: current.dispatchId,
        finalState: current.state,
        disposition: "cancelled_before_dispatch",
        reserveKind: reserve.kind,
        forwardMutationAttempted: false,
        rollbackMutationAttempted: false,
        forwardReceipt: null,
        rollbackReceipt: null,
        forwardVerification: null,
        rollbackVerification: null,
      });
    }
    throw error;
  }

  const forwardReceipt = await mutateP88W07ShopifyMetaDescription({
    phase: "forward",
    credential: input.credential,
    expectedCredentialProfileId: current.credentialProfileId,
    expectedSiteId: current.siteId,
    resourceGid: current.resourceGid,
    exactValue: input.lineage.w02Materialization.after.value,
    fetchImpl: input.providerFetch,
  });

  if (forwardReceipt.status === "ambiguous") {
    current = await manual(
      input.store,
      current,
      "w07_forward_outcome_uncertain",
      "possible",
      "none",
    );
    return result({
      dispatchId: current.dispatchId,
      finalState: current.state,
      disposition: "manual_intervention_required",
      reserveKind: reserve.kind,
      forwardMutationAttempted: true,
      rollbackMutationAttempted: false,
      forwardReceipt,
      rollbackReceipt: null,
      forwardVerification: null,
      rollbackVerification: null,
    });
  }

  if (forwardReceipt.status === "rejected") {
    const verification = await verifyP88W07IndependentState({
      purpose: "before",
      target: input.lineage.w02Materialization.target,
      expectedValue: input.lineage.w02Materialization.before.value,
      expectedFingerprint: input.lineage.w02Materialization.before.fingerprint,
      dependencies: input.forwardVerificationDependencies,
    });
    if (verification.status !== "verified") {
      current = await manual(
        input.store,
        current,
        "w07_forward_rejection_state_uncertain",
        "possible",
        "none",
      );
      return result({
        dispatchId: current.dispatchId,
        finalState: current.state,
        disposition: "manual_intervention_required",
        reserveKind: reserve.kind,
        forwardMutationAttempted: true,
        rollbackMutationAttempted: false,
        forwardReceipt,
        rollbackReceipt: null,
        forwardVerification: verification,
        rollbackVerification: null,
      });
    }
    current = await input.store.forwardRejectedNoWrite({
      dispatchId: current.dispatchId,
      expectedRevision: current.revision,
      providerRequestId: forwardReceipt.providerRequestId,
      providerRequestFingerprint: forwardReceipt.requestFingerprint,
      providerResponseFingerprint: forwardReceipt.responseFingerprint!,
      exactBeforeStateProven: true,
    });
    return result({
      dispatchId: current.dispatchId,
      finalState: current.state,
      disposition: "forward_rejected_no_write",
      reserveKind: reserve.kind,
      forwardMutationAttempted: true,
      rollbackMutationAttempted: false,
      forwardReceipt,
      rollbackReceipt: null,
      forwardVerification: verification,
      rollbackVerification: null,
    });
  }

  current = await input.store.forwardAccepted({
    dispatchId: current.dispatchId,
    expectedRevision: current.revision,
    providerRequestId: forwardReceipt.providerRequestId,
    providerRequestFingerprint: forwardReceipt.requestFingerprint,
    providerResponseFingerprint: forwardReceipt.responseFingerprint!,
  });

  const forwardVerification = await verifyP88W07IndependentState({
    purpose: "after",
    target: input.lineage.w02Materialization.target,
    expectedValue: input.lineage.w02Materialization.after.value,
    expectedFingerprint: input.lineage.w02Materialization.after.fingerprint,
    dependencies: input.forwardVerificationDependencies,
  });

  if (forwardVerification.status === "unavailable") {
    current = await manual(
      input.store,
      current,
      "w07_forward_verification_unavailable",
      "confirmed",
      "none",
    );
    return result({
      dispatchId: current.dispatchId,
      finalState: current.state,
      disposition: "manual_intervention_required",
      reserveKind: reserve.kind,
      forwardMutationAttempted: true,
      rollbackMutationAttempted: false,
      forwardReceipt,
      rollbackReceipt: null,
      forwardVerification,
      rollbackVerification: null,
    });
  }

  const controlMode = await input.store.readControlMode(current.siteId);
  if (forwardVerification.status === "verified" && controlMode !== "killed") {
    current = await input.store.closeForwardVerifiedLive({
      dispatchId: current.dispatchId,
      expectedRevision: current.revision,
    });
    return result({
      dispatchId: current.dispatchId,
      finalState: current.state,
      disposition: "forward_verified_live",
      reserveKind: reserve.kind,
      forwardMutationAttempted: true,
      rollbackMutationAttempted: false,
      forwardReceipt,
      rollbackReceipt: null,
      forwardVerification,
      rollbackVerification: null,
    });
  }

  const rollback = await performRollback({
    store: input.store,
    current,
    lineage: input.lineage,
    credential: input.credential,
    providerFetch: input.providerFetch,
    rollbackVerificationDependencies: input.rollbackVerificationDependencies,
  });
  current = rollback.record;
  return result({
    dispatchId: current.dispatchId,
    finalState: current.state,
    disposition:
      current.state === "rollback_verified_closed"
        ? "rollback_verified_closed"
        : "manual_intervention_required",
    reserveKind: reserve.kind,
    forwardMutationAttempted: true,
    rollbackMutationAttempted: true,
    forwardReceipt,
    rollbackReceipt: rollback.receipt,
    forwardVerification,
    rollbackVerification: rollback.verification,
  });
}

export function p88W07OrchestratorCapability() {
  return Object.freeze({
    version: P8_8_W07_ORCHESTRATOR_VERSION,
    reserveBeforeNetworkWrite: true,
    dispatchStartBeforeProviderMutation: true,
    finalProviderBeforeReadRequired: true,
    exactW02ForwardValue: true,
    exactW02RollbackValue: true,
    forwardWriteRetryAllowed: false,
    rollbackWriteRetryAllowed: false,
    independentVerificationRequired: true,
    killRoutesNonterminalObservedAfterTowardRollback: true,
    task51ExecutionPerformed: false,
    task53ExecutionPerformed: false,
    task54ExecutionPerformed: false,
    schedulerBound: false,
    workerBound: false,
  });
}
