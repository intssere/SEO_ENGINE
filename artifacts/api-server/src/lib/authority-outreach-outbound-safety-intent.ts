import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachHumanDeliveryBindingAuthorizationDecisionIntegrity,
  type AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRecord,
} from "./authority-outreach-human-delivery-binding-authorization-decision.js";

export const UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_INTENT_VERSION =
  "ugp-10-31-outbound-safety-intent-v1" as const;
export const UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_RESERVATION_VERSION =
  "ugp-10-31-outbound-safety-reservation-v1" as const;
export const UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_EVENT_VERSION =
  "ugp-10-31-outbound-safety-event-v1" as const;
export const UGP_AUTHORITY_OUTREACH_OUTBOUND_SUPPRESSION_VERSION =
  "ugp-10-31-outbound-suppression-v1" as const;

export const UGP_10_31_CONTACT_RATE_LIMIT = Object.freeze({
  maximumReservations: 1,
  windowSeconds: 7 * 24 * 60 * 60,
});
export const UGP_10_31_DOMAIN_RATE_LIMIT = Object.freeze({
  maximumReservations: 5,
  windowSeconds: 24 * 60 * 60,
});
export const UGP_10_31_RESERVATION_TTL_SECONDS = 15 * 60;

export type AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachHumanDeliveryBindingAuthorizationDecisionIntegrity
  >[1];

export type AuthorityOutreachOutboundSafetyIntent = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_INTENT_VERSION;
  reservationId: string;
  reservationFingerprint: string;
  logicalSendKey: string;
  deliveryBindingAuthorizationDecisionId: string;
  deliveryBindingAuthorizationDecisionFingerprint: string;
  deliveryBindingAuthorizationReviewSpecFingerprint: string;
  prospectFingerprint: string;
  opportunityFingerprint: string;
  candidateFingerprint: string;
  selectedRoleCandidateFingerprint: string;
  selectedContactPointFingerprint: string;
  sendReviewFingerprint: string;
  qualityGateFingerprint: string;
  ownedSiteDomain: string;
  recipientDomain: string;
  ratePolicy: Readonly<{
    contactMaximumReservations: 1;
    contactWindowSeconds: 604800;
    domainMaximumReservations: 5;
    domainWindowSeconds: 86400;
    reservationTtlSeconds: 900;
  }>;
  semantics: Readonly<{
    deterministic: true;
    exactUgp1029DecisionRequired: true;
    exactQualifiedProspectLineageRequired: true;
    exactSelectedContactPointRequired: true;
    exactReviewedMessageRequired: true;
    providerFree: true;
    durableSuppressionRequired: true;
    permanentLogicalSendIdempotencyRequired: true;
    activeContactReservationExclusionRequired: true;
    uncertainAttemptFenceRequired: true;
    contactRateLimitRequired: true;
    domainRateLimitRequired: true;
    immutableSafetyAuditRequired: true;
    singleSendReservationEligible: true;
    durableReservationCreated: false;
    providerBindingAuthorized: false;
    mailboxBindingAuthorized: false;
    providerCredentialActivationAuthorized: false;
    webSubmissionExecutionAuthorized: false;
    messageTransmissionAuthorized: false;
    sendJobConstructionAuthorized: false;
    sendAuthorizationGranted: false;
    outreachSendingAuthorized: false;
    outreachSendingPerformed: false;
    performsProviderCall: false;
    performsNetworkOperation: false;
    performsPersistence: false;
    schedulerEnabled: false;
    workerEnabled: false;
  }>;
}>;

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => JSON.stringify(key) + ":" + stableJson(object[key]))
    .join(",") + "}";
}

function hash(value: unknown): string {
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

export function buildAuthorityOutreachOutboundSafetyIntent(
  input: Readonly<{
    deliveryBindingAuthorizationDecision:
      AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRecord;
    deliveryBindingAuthorizationDecisionInput:
      AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionIntegrityInput;
  }>,
): AuthorityOutreachOutboundSafetyIntent {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ugp_outreach_outbound_safety_invalid_input");
  }

  assertAuthorityOutreachHumanDeliveryBindingAuthorizationDecisionIntegrity(
    input.deliveryBindingAuthorizationDecision,
    input.deliveryBindingAuthorizationDecisionInput,
  );
  const decision = input.deliveryBindingAuthorizationDecision;

  if (
    decision.resultingState !== "delivery_binding_operational_authorization_eligible"
    || decision.decision !== "approve_for_separate_delivery_binding_operational_authorization"
    || decision.semantics.humanDecision !== true
    || decision.semantics.eligibilityOnly !== true
    || decision.semantics.deliveryBindingAuthorizationDecisionRecorded !== true
    || decision.semantics.deliveryBindingAuthorizationApproved !== true
    || decision.semantics.separateOperationalAuthorizationEligibilityGranted !== true
    || decision.semantics.separateOperationalAuthorizationExecuted !== false
    || decision.semantics.deliveryBindingAuthorizationGranted !== false
    || decision.semantics.deliveryBindingExecutionAuthorized !== false
    || decision.semantics.providerBindingAuthorized !== false
    || decision.semantics.mailboxBindingAuthorized !== false
    || decision.semantics.providerCredentialActivationAuthorized !== false
    || decision.semantics.webSubmissionExecutionAuthorized !== false
    || decision.semantics.sendAuthorizationGranted !== false
    || decision.semantics.outreachSendingAuthorized !== false
  ) {
    throw new Error("ugp_outreach_outbound_safety_approved_ugp_10_29_decision_required");
  }

  const logicalSendKey = hash({
    purpose: "ugp_authority_outreach_logical_single_send",
    prospectFingerprint: decision.prospectFingerprint,
    selectedContactPointFingerprint: decision.selectedContactPointFingerprint,
    sendReviewFingerprint: decision.sendReviewFingerprint,
    candidateFingerprint: decision.candidateFingerprint,
    recipientDomain: decision.sourceDomain,
  });

  const ratePolicy = deepFreeze({
    contactMaximumReservations: 1 as const,
    contactWindowSeconds: 604800 as const,
    domainMaximumReservations: 5 as const,
    domainWindowSeconds: 86400 as const,
    reservationTtlSeconds: 900 as const,
  });

  const semantics = deepFreeze({
    deterministic: true as const,
    exactUgp1029DecisionRequired: true as const,
    exactQualifiedProspectLineageRequired: true as const,
    exactSelectedContactPointRequired: true as const,
    exactReviewedMessageRequired: true as const,
    providerFree: true as const,
    durableSuppressionRequired: true as const,
    permanentLogicalSendIdempotencyRequired: true as const,
    activeContactReservationExclusionRequired: true as const,
    uncertainAttemptFenceRequired: true as const,
    contactRateLimitRequired: true as const,
    domainRateLimitRequired: true as const,
    immutableSafetyAuditRequired: true as const,
    singleSendReservationEligible: true as const,
    durableReservationCreated: false as const,
    providerBindingAuthorized: false as const,
    mailboxBindingAuthorized: false as const,
    providerCredentialActivationAuthorized: false as const,
    webSubmissionExecutionAuthorized: false as const,
    messageTransmissionAuthorized: false as const,
    sendJobConstructionAuthorized: false as const,
    sendAuthorizationGranted: false as const,
    outreachSendingAuthorized: false as const,
    outreachSendingPerformed: false as const,
    performsProviderCall: false as const,
    performsNetworkOperation: false as const,
    performsPersistence: false as const,
    schedulerEnabled: false as const,
    workerEnabled: false as const,
  });

  const base = {
    version: UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_INTENT_VERSION,
    logicalSendKey,
    deliveryBindingAuthorizationDecisionId:
      decision.deliveryBindingAuthorizationDecisionId,
    deliveryBindingAuthorizationDecisionFingerprint:
      decision.deliveryBindingAuthorizationDecisionFingerprint,
    deliveryBindingAuthorizationReviewSpecFingerprint:
      decision.deliveryBindingAuthorizationReviewSpecFingerprint,
    prospectFingerprint: decision.prospectFingerprint,
    opportunityFingerprint: decision.opportunityFingerprint,
    candidateFingerprint: decision.candidateFingerprint,
    selectedRoleCandidateFingerprint: decision.selectedRoleCandidateFingerprint,
    selectedContactPointFingerprint: decision.selectedContactPointFingerprint,
    sendReviewFingerprint: decision.sendReviewFingerprint,
    qualityGateFingerprint: decision.qualityGateFingerprint,
    ownedSiteDomain: decision.targetDomain,
    recipientDomain: decision.sourceDomain,
    ratePolicy,
    semantics,
  };

  const reservationFingerprint = hash({
    purpose: "ugp_authority_outreach_outbound_safety_reservation",
    ...base,
  });

  return deepFreeze({
    ...base,
    reservationId: "uaosr-" + reservationFingerprint.slice(0, 24),
    reservationFingerprint,
  });
}

export function assertAuthorityOutreachOutboundSafetyIntentIntegrity(
  intent: AuthorityOutreachOutboundSafetyIntent,
  input: Parameters<typeof buildAuthorityOutreachOutboundSafetyIntent>[0],
): void {
  if (
    !intent
    || intent.version !== UGP_AUTHORITY_OUTREACH_OUTBOUND_SAFETY_INTENT_VERSION
  ) {
    throw new Error("ugp_outreach_outbound_safety_intent_version_invalid");
  }
  const expected = buildAuthorityOutreachOutboundSafetyIntent(input);
  if (stableJson(expected) !== stableJson(intent)) {
    throw new Error("ugp_outreach_outbound_safety_intent_integrity_mismatch");
  }
}
