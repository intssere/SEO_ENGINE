import {
  P8_8_W07_EVENT_VERSION,
  p88W07StableHash,
  projectP88W07DispatchIntent,
  type P88W07DispatchState,
  type P88W07PublicWriteOccurrence,
} from "./p8-8-policy-single-action-apply.js";
import type { P88W07DispatchRecord } from "./p8-8-policy-single-action-store.js";
import type {
  P88W08DispatchEventEvidence,
  P88W08Input,
  P88W08VerificationEvidence,
} from "./p8-8-autonomous-audit-projection.js";
import { buildP88W07TestFixture } from "./p8-8-w07-test-fixture.js";

type Path =
  | "forward_verified_live"
  | "rollback_verified_closed"
  | "manual_intervention_required"
  | "cancelled_before_dispatch";

function iso(base: string, seconds: number): string {
  return new Date(Date.parse(base) + seconds * 1_000).toISOString();
}

function dispatchEvent(input: {
  intent: ReturnType<typeof projectP88W07DispatchIntent>;
  fromRevision: number | null;
  fromState: P88W07DispatchState | null;
  toRevision: number;
  toState: P88W07DispatchState;
  reason: string;
  providerRequestFingerprint?: string | null;
  publicWriteOccurrence: P88W07PublicWriteOccurrence;
  rollbackOccurrence: P88W07PublicWriteOccurrence;
  effectiveAt: string;
}): P88W08DispatchEventEvidence {
  const payload = {
    version: P8_8_W07_EVENT_VERSION,
    purpose: "p8.8_w07_dispatch_event",
    dispatchId: input.intent.dispatchId,
    fromRevision: input.fromRevision,
    fromState: input.fromState,
    toRevision: input.toRevision,
    toState: input.toState,
    transitionReason: input.reason,
    providerRequestFingerprint: input.providerRequestFingerprint ?? null,
    publicWriteOccurrence: input.publicWriteOccurrence,
    rollbackOccurrence: input.rollbackOccurrence,
    effectiveAt: input.effectiveAt,
  };
  const eventFingerprint = p88W07StableHash(payload);
  return Object.freeze({
    eventId: "p88w07-event-" + eventFingerprint.slice(0, 24),
    eventVersion: P8_8_W07_EVENT_VERSION,
    eventFingerprint,
    dispatchId: input.intent.dispatchId,
    siteId: input.intent.siteId,
    fromRevision: input.fromRevision,
    fromState: input.fromState,
    toRevision: input.toRevision,
    toState: input.toState,
    transitionReason: input.reason,
    providerRequestFingerprint: input.providerRequestFingerprint ?? null,
    publicWriteOccurrence: input.publicWriteOccurrence,
    rollbackOccurrence: input.rollbackOccurrence,
    effectiveAt: input.effectiveAt,
  });
}

function verificationEvidence(input: {
  intent: ReturnType<typeof projectP88W07DispatchIntent>;
  phase: "forward" | "rollback";
  occurredAt: string;
  providerStatus?: "observed" | "unavailable" | "identity_mismatch" | "invalid_response";
  providerValue?: string | null;
  storefrontOutcome?: "verified" | "mismatch" | "unavailable";
}): P88W08VerificationEvidence {
  const expectedValue = input.phase === "forward"
    ? input.intent.state.afterValue
    : input.intent.state.beforeValue;
  const expectedFingerprint = input.phase === "forward"
    ? input.intent.state.afterFingerprint
    : input.intent.state.beforeFingerprint;
  const providerStatus = input.providerStatus ?? "observed";
  const providerValue = input.providerValue === undefined
    ? expectedValue
    : input.providerValue;
  const storefrontOutcome = input.storefrontOutcome ?? "verified";
  const providerEvidenceFingerprint = p88W07StableHash({
    purpose: "p8.8_w08_test_provider_evidence",
    phase: input.phase,
    providerStatus,
    providerValue,
  });
  const storefrontObservedValue = storefrontOutcome === "verified"
    ? expectedValue
    : storefrontOutcome === "mismatch"
      ? "different-storefront-value"
      : null;
  const storefrontEvidenceFingerprint = p88W07StableHash({
    purpose: "p8.8_w08_test_storefront_evidence",
    phase: input.phase,
    storefrontOutcome,
    storefrontObservedValue,
  });
  const verificationFingerprint = p88W07StableHash({
    version: "p8-8-w07-policy-single-action-apply-v1",
    purpose: "p8.8_w07_verification",
    dispatchId: input.intent.dispatchId,
    phase: input.phase,
    providerEvidenceFingerprint,
    storefrontEvidenceFingerprint,
    expectedFingerprint,
  });
  return Object.freeze({
    evidenceId: "p88w08-verification-" + verificationFingerprint.slice(0, 24),
    phase: input.phase,
    occurredAt: input.occurredAt,
    verificationFingerprint,
    expectedFingerprint,
    provider: Object.freeze({
      status: providerStatus,
      resourceGid: input.intent.target.resourceGid,
      rawValue: providerValue,
      evidenceFingerprint: providerEvidenceFingerprint,
    }),
    storefront: Object.freeze({
      outcome: storefrontOutcome,
      statusCode: storefrontOutcome === "unavailable" ? null : 200,
      expectedValue,
      observedValue: storefrontObservedValue,
      evidenceFingerprint: storefrontEvidenceFingerprint,
      errorCategory: storefrontOutcome === "verified"
        ? null
        : storefrontOutcome === "mismatch"
          ? "storefront_state_mismatch"
          : "storefront_unavailable",
    }),
  });
}

export function buildP88W08TestFixture(options: {
  baseTime?: string;
  path?: Path;
} = {}) {
  const baseTime = options.baseTime ?? "2026-09-23T12:00:00.000Z";
  const path = options.path ?? "forward_verified_live";
  const w07 = buildP88W07TestFixture({ baseTime });
  const intent = projectP88W07DispatchIntent({
    bundle: w07.bundle,
    databaseNow: w07.snapshot.databaseNow,
  });

  const reservedAt = iso(baseTime, 2);
  const forwardRequestFingerprint = p88W07StableHash({
    purpose: "p8.8_w08_test_forward_request",
    dispatchId: intent.dispatchId,
  });
  const rollbackRequestFingerprint = p88W07StableHash({
    purpose: "p8.8_w08_test_rollback_request",
    dispatchId: intent.dispatchId,
  });
  const forwardResponseFingerprint = p88W07StableHash({
    purpose: "p8.8_w08_test_forward_response",
    dispatchId: intent.dispatchId,
  });
  const rollbackResponseFingerprint = p88W07StableHash({
    purpose: "p8.8_w08_test_rollback_response",
    dispatchId: intent.dispatchId,
  });

  const events: P88W08DispatchEventEvidence[] = [
    dispatchEvent({
      intent,
      fromRevision: null,
      fromState: null,
      toRevision: 1,
      toState: "reserved_prewrite",
      reason: "w07_reserved_prewrite",
      publicWriteOccurrence: "none",
      rollbackOccurrence: "none",
      effectiveAt: reservedAt,
    }),
  ];
  const verification: P88W08VerificationEvidence[] = [];
  let state: P88W07DispatchState = "reserved_prewrite";
  let rowRevision = 1;
  let forwardAttemptCount: 0 | 1 = 0;
  let rollbackAttemptCount: 0 | 1 = 0;
  let publicWriteOccurrence: P88W07PublicWriteOccurrence = "none";
  let rollbackOccurrence: P88W07PublicWriteOccurrence = "none";
  let providerRequestId: string | null = null;
  let providerRequestFingerprint: string | null = null;
  let providerResponseFingerprint: string | null = null;
  let verificationFingerprint: string | null = null;
  let dispatchStartedAt: string | null = null;
  let rollbackStartedAt: string | null = null;
  let terminalAt: string | null = null;
  let terminalReason: string | null = null;

  if (path === "cancelled_before_dispatch") {
    terminalAt = iso(baseTime, 3);
    terminalReason = "w07_cancelled_before_dispatch";
    events.push(dispatchEvent({
      intent,
      fromRevision: 1,
      fromState: "reserved_prewrite",
      toRevision: 2,
      toState: "cancelled_before_dispatch",
      reason: terminalReason,
      publicWriteOccurrence: "none",
      rollbackOccurrence: "none",
      effectiveAt: terminalAt,
    }));
    state = "cancelled_before_dispatch";
    rowRevision = 2;
  } else {
    dispatchStartedAt = iso(baseTime, 3);
    events.push(dispatchEvent({
      intent,
      fromRevision: 1,
      fromState: "reserved_prewrite",
      toRevision: 2,
      toState: "dispatch_started",
      reason: "w07_forward_attempt_spent",
      publicWriteOccurrence: "possible",
      rollbackOccurrence: "none",
      effectiveAt: dispatchStartedAt,
    }));
    forwardAttemptCount = 1;
    state = "dispatch_started";
    rowRevision = 2;
    publicWriteOccurrence = "possible";

    if (path === "manual_intervention_required") {
      const unavailable = verificationEvidence({
        intent,
        phase: "forward",
        occurredAt: iso(baseTime, 4),
        providerStatus: "unavailable",
        providerValue: null,
        storefrontOutcome: "unavailable",
      });
      verification.push(unavailable);
      terminalAt = iso(baseTime, 5);
      terminalReason = "w07_forward_state_unavailable";
      verificationFingerprint = unavailable.verificationFingerprint;
      events.push(dispatchEvent({
        intent,
        fromRevision: 2,
        fromState: "dispatch_started",
        toRevision: 3,
        toState: "manual_intervention_required",
        reason: terminalReason,
        publicWriteOccurrence: "possible",
        rollbackOccurrence: "none",
        effectiveAt: terminalAt,
      }));
      state = "manual_intervention_required";
      rowRevision = 3;
    } else {
      providerRequestId = "w08-forward-request";
      providerRequestFingerprint = forwardRequestFingerprint;
      providerResponseFingerprint = forwardResponseFingerprint;
      publicWriteOccurrence = "confirmed";
      events.push(dispatchEvent({
        intent,
        fromRevision: 2,
        fromState: "dispatch_started",
        toRevision: 3,
        toState: "forward_verification_pending",
        reason: "w07_forward_accepted_pending_verification",
        providerRequestFingerprint: forwardRequestFingerprint,
        publicWriteOccurrence: "confirmed",
        rollbackOccurrence: "none",
        effectiveAt: iso(baseTime, 4),
      }));
      state = "forward_verification_pending";
      rowRevision = 3;

      if (path === "forward_verified_live") {
        const verified = verificationEvidence({
          intent,
          phase: "forward",
          occurredAt: iso(baseTime, 5),
        });
        verification.push(verified);
        verificationFingerprint = verified.verificationFingerprint;
        terminalAt = iso(baseTime, 5);
        terminalReason = "w07_forward_verified_live";
        events.push(dispatchEvent({
          intent,
          fromRevision: 3,
          fromState: "forward_verification_pending",
          toRevision: 4,
          toState: "forward_verified_live",
          reason: terminalReason,
          publicWriteOccurrence: "confirmed",
          rollbackOccurrence: "none",
          effectiveAt: terminalAt,
        }));
        state = "forward_verified_live";
        rowRevision = 4;
      } else {
        const failedForward = verificationEvidence({
          intent,
          phase: "forward",
          occurredAt: iso(baseTime, 5),
          providerValue: "different-provider-value",
          storefrontOutcome: "mismatch",
        });
        verification.push(failedForward);
        verificationFingerprint = failedForward.verificationFingerprint;
        events.push(dispatchEvent({
          intent,
          fromRevision: 3,
          fromState: "forward_verification_pending",
          toRevision: 4,
          toState: "rollback_required",
          reason: "w07_forward_verification_failed",
          publicWriteOccurrence: "confirmed",
          rollbackOccurrence: "none",
          effectiveAt: iso(baseTime, 5),
        }));
        rollbackStartedAt = iso(baseTime, 6);
        events.push(dispatchEvent({
          intent,
          fromRevision: 4,
          fromState: "rollback_required",
          toRevision: 5,
          toState: "rollback_started",
          reason: "w07_rollback_attempt_spent",
          publicWriteOccurrence: "confirmed",
          rollbackOccurrence: "possible",
          effectiveAt: rollbackStartedAt,
        }));
        rollbackAttemptCount = 1;
        rollbackOccurrence = "confirmed";
        providerRequestId = "w08-rollback-request";
        providerRequestFingerprint = rollbackRequestFingerprint;
        providerResponseFingerprint = rollbackResponseFingerprint;
        events.push(dispatchEvent({
          intent,
          fromRevision: 5,
          fromState: "rollback_started",
          toRevision: 6,
          toState: "rollback_verification_pending",
          reason: "w07_rollback_accepted_pending_verification",
          providerRequestFingerprint: rollbackRequestFingerprint,
          publicWriteOccurrence: "confirmed",
          rollbackOccurrence: "confirmed",
          effectiveAt: iso(baseTime, 7),
        }));
        const verifiedRollback = verificationEvidence({
          intent,
          phase: "rollback",
          occurredAt: iso(baseTime, 8),
        });
        verification.push(verifiedRollback);
        verificationFingerprint = verifiedRollback.verificationFingerprint;
        terminalAt = iso(baseTime, 8);
        terminalReason = "w07_rollback_verified_closed";
        events.push(dispatchEvent({
          intent,
          fromRevision: 6,
          fromState: "rollback_verification_pending",
          toRevision: 7,
          toState: "rollback_verified_closed",
          reason: terminalReason,
          publicWriteOccurrence: "confirmed",
          rollbackOccurrence: "confirmed",
          effectiveAt: terminalAt,
        }));
        state = "rollback_verified_closed";
        rowRevision = 7;
      }
    }
  }

  const dispatch: P88W07DispatchRecord = Object.freeze({
    dispatchId: intent.dispatchId,
    dispatchFingerprint: intent.dispatchFingerprint,
    executionId: intent.executionId,
    siteId: intent.siteId,
    state,
    rowRevision,
    forwardAttemptCount,
    rollbackAttemptCount,
    publicWriteOccurrence,
    rollbackOccurrence,
    providerRequestId,
    providerRequestFingerprint,
    providerResponseFingerprint,
    verificationFingerprint,
    reservedAt,
    dispatchStartedAt,
    rollbackStartedAt,
    terminalAt,
    terminalReason,
  });

  const initialReservation = w07.snapshot.reservation!;
  const reservationStatus =
    state === "cancelled_before_dispatch"
      ? "released"
      : state === "manual_intervention_required"
        ? "manual_intervention"
        : state === "forward_verified_live" || state === "rollback_verified_closed"
          ? "consumed"
          : "claimed";
  const reservationFinal = Object.freeze({
    ...initialReservation,
    status: reservationStatus,
    terminalAt: reservationStatus === "consumed" || reservationStatus === "released"
      ? terminalAt
      : null,
    terminalReason: reservationStatus === "claimed" ? null : terminalReason,
    updatedAt: terminalAt ?? initialReservation.updatedAt,
  });

  const referenceTime = iso(baseTime, 20);
  const input: P88W08Input = Object.freeze({
    referenceTime,
    w07DatabaseNow: w07.snapshot.databaseNow,
    w07Bundle: w07.bundle,
    w07Intent: intent,
    reservationFinal,
    controlEvents: [],
    dispatch,
    dispatchEvents: events,
    verificationEvidence: verification,
  });

  return Object.freeze({
    w07,
    intent,
    input,
    dispatch,
    events: Object.freeze(events),
    verification: Object.freeze(verification),
    reservationFinal,
    referenceTime,
  });
}
