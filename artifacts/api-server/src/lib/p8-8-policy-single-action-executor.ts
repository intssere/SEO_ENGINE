import {
  p88W02StateFingerprint,
} from "./p8-8-governed-proposal-materialization.js";
import {
  p88W07StableHash,
  projectP88W07DispatchIntent,
  type P88W07DispatchIntent,
  type P88W07LineageBundle,
} from "./p8-8-policy-single-action-apply.js";
import type {
  P88W07DispatchRecord,
} from "./p8-8-policy-single-action-store.js";
import type {
  P88W07MutationReceipt,
  P88W07StorefrontEvidence,
} from "./p8-8-policy-single-action-shopify.js";

export type P88W07ProviderReadEvidence = Readonly<{
  status: "observed" | "unavailable" | "identity_mismatch" | "invalid_response";
  resourceGid: string;
  rawValue: string | null;
  evidenceFingerprint: string;
}>;

export type P88W07ExecutionResult = Readonly<{
  version: "p8-8-w07-policy-single-action-apply-v1";
  executionProvenance: "policy_single_action_apply";
  disposition:
    | "cancelled_before_dispatch"
    | "forward_rejected_no_write"
    | "forward_verified_live"
    | "rollback_verified_closed"
    | "manual_intervention_required";
  dispatch: P88W07DispatchRecord;
  providerWriteAttempted: boolean;
  rollbackWriteAttempted: boolean;
  automaticForwardRetryPerformed: false;
  automaticRollbackRetryPerformed: false;
  task51ExecutionPerformed: false;
  task53ExecutionPerformed: false;
  task54ExecutionPerformed: false;
}>;

export interface P88W07ExecutionStore {
  reservePrewrite(intent: P88W07DispatchIntent): Promise<Readonly<{
    kind: "created" | "existing";
    record: P88W07DispatchRecord;
  }>>;
  readCurrentControl(siteId: string): Promise<Readonly<{
    revision: number;
    mode: string;
    fingerprint: string;
  }> | null>;
  startDispatch(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    observedBeforeValue: string | null;
    observedBeforeFingerprint: string;
    publicSiteWritesEnabled: boolean;
    policyMutationExecutionEnabled: boolean;
    credentialProfileId: string;
    credentialScopes: readonly string[];
  }): Promise<P88W07DispatchRecord>;
  cancelBeforeDispatch(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    reason?: string;
  }): Promise<P88W07DispatchRecord>;
  markForwardRejectedNoWrite(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    providerRequestId: string | null;
    providerRequestFingerprint: string | null;
    providerResponseFingerprint: string;
  }): Promise<P88W07DispatchRecord>;
  markForwardAccepted(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    providerRequestId: string | null;
    providerRequestFingerprint: string | null;
    providerResponseFingerprint: string;
  }): Promise<P88W07DispatchRecord>;
  markForwardVerifiedLive(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    verificationFingerprint: string;
  }): Promise<P88W07DispatchRecord>;
  markRollbackRequired(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    verificationFingerprint: string;
    reason?: string;
  }): Promise<P88W07DispatchRecord>;
  startRollback(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
  }): Promise<P88W07DispatchRecord>;
  markRollbackAccepted(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    providerRequestId: string | null;
    providerRequestFingerprint: string | null;
    providerResponseFingerprint: string;
  }): Promise<P88W07DispatchRecord>;
  markRollbackVerifiedClosed(input: {
    intent: P88W07DispatchIntent;
    expectedRowRevision: number;
    verificationFingerprint: string;
  }): Promise<P88W07DispatchRecord>;
  markManualIntervention(input: {
    intent: P88W07DispatchIntent;
    expectedState:
      | "dispatch_started"
      | "forward_verification_pending"
      | "rollback_required"
      | "rollback_started"
      | "rollback_verification_pending";
    expectedRowRevision: number;
    reason: string;
    publicWriteOccurrence: "possible" | "confirmed";
    rollbackOccurrence: "none" | "possible" | "confirmed";
    verificationFingerprint?: string | null;
  }): Promise<P88W07DispatchRecord>;
}

function exactProviderMatch(input: {
  intent: P88W07DispatchIntent;
  evidence: P88W07ProviderReadEvidence;
  purpose: "before" | "after";
}): boolean {
  if (
    input.evidence.status !== "observed"
    || input.evidence.resourceGid !== input.intent.target.resourceGid
  ) return false;
  const expectedValue = input.purpose === "before"
    ? input.intent.state.beforeValue
    : input.intent.state.afterValue;
  const expectedFingerprint = input.purpose === "before"
    ? input.intent.state.beforeFingerprint
    : input.intent.state.afterFingerprint;
  if (input.evidence.rawValue !== expectedValue) return false;
  return p88W02StateFingerprint({
    target: {
      siteId: input.intent.siteId,
      provider: input.intent.target.provider,
      domain: input.intent.target.domain,
      resourceKind: input.intent.target.resourceKind,
      resourceGid: input.intent.target.resourceGid,
      targetUrl: input.intent.target.targetUrl,
      actionType: input.intent.target.actionType,
      field: input.intent.target.field,
      requiredProviderScope: input.intent.target.requiredProviderScope,
      targetBindingFingerprint: input.intent.target.targetBindingFingerprint,
    },
    value: input.evidence.rawValue,
    purpose: input.purpose,
  }) === expectedFingerprint;
}

function verificationFingerprint(input: {
  intent: P88W07DispatchIntent;
  phase: "forward" | "rollback";
  provider: P88W07ProviderReadEvidence;
  storefront: P88W07StorefrontEvidence;
}): string {
  return p88W07StableHash({
    version: "p8-8-w07-policy-single-action-apply-v1",
    purpose: "p8.8_w07_verification",
    dispatchId: input.intent.dispatchId,
    phase: input.phase,
    providerEvidenceFingerprint: input.provider.evidenceFingerprint,
    storefrontEvidenceFingerprint: input.storefront.evidenceFingerprint,
    expectedFingerprint: input.phase === "forward"
      ? input.intent.state.afterFingerprint
      : input.intent.state.beforeFingerprint,
  });
}

function requestFingerprint(
  intent: P88W07DispatchIntent,
  phase: "forward" | "rollback",
): string {
  return p88W07StableHash({
    version: "p8-8-w07-policy-single-action-apply-v1",
    purpose: "p8.8_w07_provider_request",
    dispatchId: intent.dispatchId,
    phase,
    resourceGid: intent.target.resourceGid,
    field: intent.target.field,
    valueFingerprint: phase === "forward"
      ? intent.state.afterFingerprint
      : intent.state.beforeFingerprint,
  });
}

function result(
  disposition: P88W07ExecutionResult["disposition"],
  dispatch: P88W07DispatchRecord,
  providerWriteAttempted: boolean,
  rollbackWriteAttempted: boolean,
): P88W07ExecutionResult {
  return Object.freeze({
    version: "p8-8-w07-policy-single-action-apply-v1" as const,
    executionProvenance: "policy_single_action_apply" as const,
    disposition,
    dispatch,
    providerWriteAttempted,
    rollbackWriteAttempted,
    automaticForwardRetryPerformed: false as const,
    automaticRollbackRetryPerformed: false as const,
    task51ExecutionPerformed: false as const,
    task53ExecutionPerformed: false as const,
    task54ExecutionPerformed: false as const,
  });
}

async function manual(input: {
  store: P88W07ExecutionStore;
  intent: P88W07DispatchIntent;
  current: P88W07DispatchRecord;
  reason: string;
  publicWriteOccurrence: "possible" | "confirmed";
  rollbackOccurrence: "none" | "possible" | "confirmed";
  verificationFingerprint?: string | null;
  providerWriteAttempted: boolean;
  rollbackWriteAttempted: boolean;
}): Promise<P88W07ExecutionResult> {
  const closed = await input.store.markManualIntervention({
    intent: input.intent,
    expectedState: input.current.state as
      | "dispatch_started"
      | "forward_verification_pending"
      | "rollback_required"
      | "rollback_started"
      | "rollback_verification_pending",
    expectedRowRevision: input.current.rowRevision,
    reason: input.reason,
    publicWriteOccurrence: input.publicWriteOccurrence,
    rollbackOccurrence: input.rollbackOccurrence,
    verificationFingerprint: input.verificationFingerprint,
  });
  return result(
    "manual_intervention_required",
    closed,
    input.providerWriteAttempted,
    input.rollbackWriteAttempted,
  );
}

async function verifyRollback(input: {
  store: P88W07ExecutionStore;
  intent: P88W07DispatchIntent;
  current: P88W07DispatchRecord;
  readProvider: (purpose: "before" | "after") => Promise<P88W07ProviderReadEvidence>;
  verifyStorefront: (expectedValue: string | null) => Promise<P88W07StorefrontEvidence>;
  providerWriteAttempted: boolean;
  rollbackWriteAttempted: boolean;
}): Promise<P88W07ExecutionResult> {
  const provider = await input.readProvider("before");
  const storefront = await input.verifyStorefront(input.intent.state.beforeValue);
  const fingerprint = verificationFingerprint({
    intent: input.intent,
    phase: "rollback",
    provider,
    storefront,
  });
  if (
    exactProviderMatch({ intent: input.intent, evidence: provider, purpose: "before" })
    && storefront.outcome === "verified"
    && storefront.expectedValue === input.intent.state.beforeValue
  ) {
    const closed = await input.store.markRollbackVerifiedClosed({
      intent: input.intent,
      expectedRowRevision: input.current.rowRevision,
      verificationFingerprint: fingerprint,
    });
    return result(
      "rollback_verified_closed",
      closed,
      input.providerWriteAttempted,
      input.rollbackWriteAttempted,
    );
  }
  return manual({
    store: input.store,
    intent: input.intent,
    current: input.current,
    reason: "w07_rollback_verification_uncertain",
    publicWriteOccurrence: "confirmed",
    rollbackOccurrence: "confirmed",
    verificationFingerprint: fingerprint,
    providerWriteAttempted: input.providerWriteAttempted,
    rollbackWriteAttempted: input.rollbackWriteAttempted,
  });
}

async function performRollback(input: {
  store: P88W07ExecutionStore;
  intent: P88W07DispatchIntent;
  current: P88W07DispatchRecord;
  mutateProvider: (
    phase: "forward" | "rollback",
    value: string | null,
  ) => Promise<P88W07MutationReceipt>;
  readProvider: (purpose: "before" | "after") => Promise<P88W07ProviderReadEvidence>;
  verifyStorefront: (expectedValue: string | null) => Promise<P88W07StorefrontEvidence>;
  providerWriteAttempted: boolean;
}): Promise<P88W07ExecutionResult> {
  let started = input.current;
  if (started.state === "rollback_required") {
    started = await input.store.startRollback({
      intent: input.intent,
      expectedRowRevision: started.rowRevision,
    });
  } else if (started.state !== "rollback_started") {
    throw new Error("p88_w07_rollback_recovery_state_invalid");
  }

  const rollbackRequestFingerprint = requestFingerprint(input.intent, "rollback");
  const receipt = await input.mutateProvider("rollback", input.intent.state.beforeValue);
  if (receipt.outcome !== "accepted") {
    return manual({
      store: input.store,
      intent: input.intent,
      current: started,
      reason: receipt.outcome === "rejected"
        ? "w07_rollback_rejected_manual_intervention"
        : "w07_rollback_outcome_uncertain",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: receipt.outcome === "rejected" ? "none" : "possible",
      providerWriteAttempted: input.providerWriteAttempted,
      rollbackWriteAttempted: true,
    });
  }

  const pending = await input.store.markRollbackAccepted({
    intent: input.intent,
    expectedRowRevision: started.rowRevision,
    providerRequestId: receipt.providerRequestId,
    providerRequestFingerprint: rollbackRequestFingerprint,
    providerResponseFingerprint: receipt.responseFingerprint,
  });
  return verifyRollback({
    store: input.store,
    intent: input.intent,
    current: pending,
    readProvider: input.readProvider,
    verifyStorefront: input.verifyStorefront,
    providerWriteAttempted: input.providerWriteAttempted,
    rollbackWriteAttempted: true,
  });
}

async function verifyForward(input: {
  store: P88W07ExecutionStore;
  intent: P88W07DispatchIntent;
  current: P88W07DispatchRecord;
  readProvider: (purpose: "before" | "after") => Promise<P88W07ProviderReadEvidence>;
  verifyStorefront: (expectedValue: string | null) => Promise<P88W07StorefrontEvidence>;
  mutateProvider: (
    phase: "forward" | "rollback",
    value: string | null,
  ) => Promise<P88W07MutationReceipt>;
  providerWriteAttempted: boolean;
}): Promise<P88W07ExecutionResult> {
  const provider = await input.readProvider("after");
  const storefront = await input.verifyStorefront(input.intent.state.afterValue);
  const fingerprint = verificationFingerprint({
    intent: input.intent,
    phase: "forward",
    provider,
    storefront,
  });

  if (
    provider.status === "unavailable"
    || provider.status === "invalid_response"
    || storefront.outcome === "unavailable"
  ) {
    return manual({
      store: input.store,
      intent: input.intent,
      current: input.current,
      reason: "w07_forward_verification_unavailable",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "none",
      verificationFingerprint: fingerprint,
      providerWriteAttempted: input.providerWriteAttempted,
      rollbackWriteAttempted: false,
    });
  }

  const exactAfter = exactProviderMatch({
    intent: input.intent,
    evidence: provider,
    purpose: "after",
  });
  const currentControl = await input.store.readCurrentControl(input.intent.siteId);
  if (
    exactAfter
    && storefront.outcome === "verified"
    && storefront.expectedValue === input.intent.state.afterValue
    && currentControl?.mode !== "killed"
  ) {
    const closed = await input.store.markForwardVerifiedLive({
      intent: input.intent,
      expectedRowRevision: input.current.rowRevision,
      verificationFingerprint: fingerprint,
    });
    return result(
      "forward_verified_live",
      closed,
      input.providerWriteAttempted,
      false,
    );
  }

  const rollbackRequired = await input.store.markRollbackRequired({
    intent: input.intent,
    expectedRowRevision: input.current.rowRevision,
    verificationFingerprint: fingerprint,
    reason: currentControl?.mode === "killed" && exactAfter
      ? "w07_kill_requires_safety_rollback"
      : "w07_forward_verification_failed",
  });
  return performRollback({
    store: input.store,
    intent: input.intent,
    current: rollbackRequired,
    mutateProvider: input.mutateProvider,
    readProvider: input.readProvider,
    verifyStorefront: input.verifyStorefront,
    providerWriteAttempted: input.providerWriteAttempted,
  });
}

async function recoverExisting(input: {
  store: P88W07ExecutionStore;
  intent: P88W07DispatchIntent;
  current: P88W07DispatchRecord;
  readProvider: (purpose: "before" | "after") => Promise<P88W07ProviderReadEvidence>;
  verifyStorefront: (expectedValue: string | null) => Promise<P88W07StorefrontEvidence>;
  mutateProvider: (
    phase: "forward" | "rollback",
    value: string | null,
  ) => Promise<P88W07MutationReceipt>;
}): Promise<P88W07ExecutionResult | null> {
  if (input.current.state === "dispatch_started") {
    const observed = await input.readProvider("after");
    if (exactProviderMatch({
      intent: input.intent,
      evidence: observed,
      purpose: "after",
    })) {
      const pending = await input.store.markForwardAccepted({
        intent: input.intent,
        expectedRowRevision: input.current.rowRevision,
        providerRequestId: null,
        providerRequestFingerprint: requestFingerprint(input.intent, "forward"),
        providerResponseFingerprint: p88W07StableHash({
          purpose: "p8.8_w07_recovery_observed_after",
          evidenceFingerprint: observed.evidenceFingerprint,
        }),
      });
      return verifyForward({
        store: input.store,
        intent: input.intent,
        current: pending,
        readProvider: input.readProvider,
        verifyStorefront: input.verifyStorefront,
        mutateProvider: input.mutateProvider,
        providerWriteAttempted: false,
      });
    }
    return manual({
      store: input.store,
      intent: input.intent,
      current: input.current,
      reason: "w07_dispatch_started_recovery_uncertain",
      publicWriteOccurrence: "possible",
      rollbackOccurrence: "none",
      providerWriteAttempted: false,
      rollbackWriteAttempted: false,
    });
  }

  if (input.current.state === "forward_verification_pending") {
    return verifyForward({
      store: input.store,
      intent: input.intent,
      current: input.current,
      readProvider: input.readProvider,
      verifyStorefront: input.verifyStorefront,
      mutateProvider: input.mutateProvider,
      providerWriteAttempted: false,
    });
  }

  if (input.current.state === "rollback_required") {
    return performRollback({
      store: input.store,
      intent: input.intent,
      current: input.current,
      mutateProvider: input.mutateProvider,
      readProvider: input.readProvider,
      verifyStorefront: input.verifyStorefront,
      providerWriteAttempted: false,
    });
  }

  if (input.current.state === "rollback_started") {
    const observed = await input.readProvider("before");
    if (exactProviderMatch({
      intent: input.intent,
      evidence: observed,
      purpose: "before",
    })) {
      const pending = await input.store.markRollbackAccepted({
        intent: input.intent,
        expectedRowRevision: input.current.rowRevision,
        providerRequestId: null,
        providerRequestFingerprint: requestFingerprint(input.intent, "rollback"),
        providerResponseFingerprint: p88W07StableHash({
          purpose: "p8.8_w07_recovery_observed_before",
          evidenceFingerprint: observed.evidenceFingerprint,
        }),
      });
      return verifyRollback({
        store: input.store,
        intent: input.intent,
        current: pending,
        readProvider: input.readProvider,
        verifyStorefront: input.verifyStorefront,
        providerWriteAttempted: false,
        rollbackWriteAttempted: false,
      });
    }
    return manual({
      store: input.store,
      intent: input.intent,
      current: input.current,
      reason: "w07_rollback_started_recovery_uncertain",
      publicWriteOccurrence: "confirmed",
      rollbackOccurrence: "possible",
      providerWriteAttempted: false,
      rollbackWriteAttempted: false,
    });
  }

  if (input.current.state === "rollback_verification_pending") {
    return verifyRollback({
      store: input.store,
      intent: input.intent,
      current: input.current,
      readProvider: input.readProvider,
      verifyStorefront: input.verifyStorefront,
      providerWriteAttempted: false,
      rollbackWriteAttempted: false,
    });
  }

  if (
    input.current.state === "cancelled_before_dispatch"
    || input.current.state === "forward_rejected_no_write"
    || input.current.state === "forward_verified_live"
    || input.current.state === "rollback_verified_closed"
    || input.current.state === "manual_intervention_required"
  ) {
    return result(
      input.current.state,
      input.current,
      false,
      false,
    );
  }
  return null;
}

export async function executeP88W07SingleAction(input: {
  bundle: P88W07LineageBundle;
  store: P88W07ExecutionStore;
  publicSiteWritesEnabled: boolean;
  policyMutationExecutionEnabled: boolean;
  credentialProfileId: string;
  credentialScopes: readonly string[];
  readProvider: (purpose: "before" | "after") => Promise<P88W07ProviderReadEvidence>;
  mutateProvider: (
    phase: "forward" | "rollback",
    value: string | null,
  ) => Promise<P88W07MutationReceipt>;
  verifyStorefront: (expectedValue: string | null) => Promise<P88W07StorefrontEvidence>;
}): Promise<P88W07ExecutionResult> {
  const intent = projectP88W07DispatchIntent({
    bundle: input.bundle,
    databaseNow: input.bundle.w06FinalSnapshot.databaseNow,
  });
  const reserved = await input.store.reservePrewrite(intent);
  let current = reserved.record;

  if (current.state !== "reserved_prewrite") {
    const recovered = await recoverExisting({
      store: input.store,
      intent,
      current,
      readProvider: input.readProvider,
      verifyStorefront: input.verifyStorefront,
      mutateProvider: input.mutateProvider,
    });
    if (recovered) return recovered;
  }

  if (
    !input.publicSiteWritesEnabled
    || !input.policyMutationExecutionEnabled
    || input.credentialProfileId !== intent.policy.credentialProfileId
    || !input.credentialScopes.includes("write_products")
  ) {
    const cancelled = await input.store.cancelBeforeDispatch({
      intent,
      expectedRowRevision: current.rowRevision,
      reason: "w07_forward_gate_not_satisfied",
    });
    return result("cancelled_before_dispatch", cancelled, false, false);
  }

  const before = await input.readProvider("before");
  if (!exactProviderMatch({ intent, evidence: before, purpose: "before" })) {
    const cancelled = await input.store.cancelBeforeDispatch({
      intent,
      expectedRowRevision: current.rowRevision,
      reason: "w07_final_before_state_not_exact",
    });
    return result("cancelled_before_dispatch", cancelled, false, false);
  }

  try {
    current = await input.store.startDispatch({
      intent,
      expectedRowRevision: current.rowRevision,
      observedBeforeValue: before.rawValue,
      observedBeforeFingerprint: intent.state.beforeFingerprint,
      publicSiteWritesEnabled: input.publicSiteWritesEnabled,
      policyMutationExecutionEnabled: input.policyMutationExecutionEnabled,
      credentialProfileId: input.credentialProfileId,
      credentialScopes: input.credentialScopes,
    });
  } catch (error) {
    const cancelled = await input.store.cancelBeforeDispatch({
      intent,
      expectedRowRevision: current.rowRevision,
      reason: error instanceof Error
        ? "w07_start_blocked:" + error.message
        : "w07_start_blocked",
    });
    return result("cancelled_before_dispatch", cancelled, false, false);
  }

  const forwardRequestFingerprint = requestFingerprint(intent, "forward");
  const receipt = await input.mutateProvider("forward", intent.state.afterValue);

  if (receipt.outcome === "rejected") {
    const observed = await input.readProvider("before");
    if (exactProviderMatch({ intent, evidence: observed, purpose: "before" })) {
      const closed = await input.store.markForwardRejectedNoWrite({
        intent,
        expectedRowRevision: current.rowRevision,
        providerRequestId: receipt.providerRequestId,
        providerRequestFingerprint: forwardRequestFingerprint,
        providerResponseFingerprint: receipt.responseFingerprint,
      });
      return result("forward_rejected_no_write", closed, true, false);
    }
    return manual({
      store: input.store,
      intent,
      current,
      reason: "w07_rejected_response_state_uncertain",
      publicWriteOccurrence: "possible",
      rollbackOccurrence: "none",
      providerWriteAttempted: true,
      rollbackWriteAttempted: false,
    });
  }

  if (receipt.outcome === "uncertain") {
    const observed = await input.readProvider("after");
    if (!exactProviderMatch({ intent, evidence: observed, purpose: "after" })) {
      return manual({
        store: input.store,
        intent,
        current,
        reason: "w07_forward_outcome_uncertain",
        publicWriteOccurrence: "possible",
        rollbackOccurrence: "none",
        providerWriteAttempted: true,
        rollbackWriteAttempted: false,
      });
    }
  }

  const pending = await input.store.markForwardAccepted({
    intent,
    expectedRowRevision: current.rowRevision,
    providerRequestId: receipt.providerRequestId,
    providerRequestFingerprint: forwardRequestFingerprint,
    providerResponseFingerprint: receipt.responseFingerprint,
  });

  return verifyForward({
    store: input.store,
    intent,
    current: pending,
    readProvider: input.readProvider,
    verifyStorefront: input.verifyStorefront,
    mutateProvider: input.mutateProvider,
    providerWriteAttempted: true,
  });
}
