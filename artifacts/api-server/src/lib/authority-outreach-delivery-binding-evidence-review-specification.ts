import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachDeliveryBindingEvidenceIntegrity,
  type AuthorityOutreachDeliveryBindingEvidenceContract,
  type AuthorityOutreachDeliveryBindingEvidenceDisposition,
  type AuthorityOutreachValidatedDeliveryBindingEvidenceObservation,
} from "./authority-outreach-delivery-binding-evidence-validation.js";
import type {
  AuthorityOutreachDeliveryBindingRequirementClass,
} from "./authority-outreach-delivery-binding-preparation-specification.js";

export const UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_EVIDENCE_REVIEW_SPEC_VERSION =
  "ugp-10-25-delivery-binding-evidence-review-specification-v1" as const;

export type AuthorityOutreachDeliveryBindingEvidenceFutureDecision =
  | "approve_for_delivery_binding_authorization_preparation"
  | "reject_delivery_binding_evidence"
  | "defer_delivery_binding_evidence_review";

export type AuthorityOutreachDeliveryBindingEvidenceFutureReasonCode =
  | "evidence_sufficient_for_binding_authorization_preparation"
  | "contradictory_binding_evidence"
  | "inconclusive_binding_evidence"
  | "evidence_needs_refresh"
  | "binding_context_unclear"
  | "needs_more_binding_context";

export type AuthorityOutreachDeliveryBindingEvidenceReviewRequest = Readonly<{
  deliveryBindingEvidenceFingerprint: string;
  deliveryBindingPreparationSpecFingerprint: string;
  selectedContactPointFingerprint: string;
  selectedRoleCandidateFingerprint: string;
  candidateFingerprint: string;
}>;

export type AuthorityOutreachDeliveryBindingEvidenceIntegrityInput =
  Parameters<typeof assertAuthorityOutreachDeliveryBindingEvidenceIntegrity>[1];

export type AuthorityOutreachDeliveryBindingEvidenceReviewObservation =
  Readonly<{
    observationId: string;
    observationFingerprint: string;
    requirementClass: AuthorityOutreachDeliveryBindingRequirementClass;
    observationOutcome:
      AuthorityOutreachValidatedDeliveryBindingEvidenceObservation["observationOutcome"];
    observedAt: string;
    technicalEvidenceFingerprint: string;
    publicBusinessBindingEvidenceAttested: true;
  }>;

export type AuthorityOutreachDeliveryBindingEvidenceReviewSpecification =
  Readonly<{
    version:
      typeof UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_EVIDENCE_REVIEW_SPEC_VERSION;
    deliveryBindingEvidenceReviewSpecId: string;
    deliveryBindingEvidenceReviewSpecFingerprint: string;
    deliveryBindingEvidenceId: string;
    deliveryBindingEvidenceFingerprint: string;
    deliveryBindingPreparationSpecId: string;
    deliveryBindingPreparationSpecFingerprint: string;
    deliverabilityEvidenceDecisionFingerprint: string;
    deliverabilityEvidenceReviewSpecFingerprint: string;
    deliverabilityEvidenceFingerprint: string;
    deliverabilityPreparationFingerprint: string;
    policyConsentDecisionFingerprint: string;
    policyConsentReviewSpecFingerprint: string;
    contactPointEvidenceFingerprint: string;
    contactVerificationSpecFingerprint: string;
    selectionDecisionFingerprint: string;
    selectionReviewSpecFingerprint: string;
    researchEvidenceFingerprint: string;
    researchSpecFingerprint: string;
    deliveryPreparationFingerprint: string;
    sendReviewFingerprint: string;
    qualityGateFingerprint: string;
    requestId: string;
    requestFingerprint: string;
    candidateFingerprint: string;
    mechanicalValidationFingerprint: string;
    prospectFingerprint: string;
    opportunityFingerprint: string;
    approvalReviewFingerprint: string;
    sourceDomain: string;
    sourceUrl: string | null;
    targetDomain: string;
    targetUrl: string;
    selectedRoleCandidateFingerprint: string;
    selectedContactPointFingerprint: string;
    channelClass: AuthorityOutreachDeliveryBindingEvidenceContract["channelClass"];
    frozenBindingRequirements:
      readonly AuthorityOutreachDeliveryBindingRequirementClass[];
    evidenceDisposition: AuthorityOutreachDeliveryBindingEvidenceDisposition;
    reviewObservations:
      readonly AuthorityOutreachDeliveryBindingEvidenceReviewObservation[];
    evidenceCount: number;
    reviewRequirements: Readonly<{
      exactDeliveryBindingEvidenceRequired: true;
      exactBindingRequirementSetRequired: true;
      exactEvidenceDispositionRequired: true;
      channelConsistencyReviewRequired: true;
      requirementOutcomeConsistencyReviewRequired: true;
      evidenceFreshnessReviewRequired: true;
      explicitHumanDecisionRequired: true;
      supportingEvidenceRequiredForApprovalOption: true;
      noProviderOrMailboxBindingInference: true;
      noWebSubmissionExecutionInference: true;
      noCredentialActivationInference: true;
      noSendAuthorizationInference: true;
    }>;
    allowedFutureDecisions:
      readonly AuthorityOutreachDeliveryBindingEvidenceFutureDecision[];
    allowedFutureReasonCodes:
      readonly AuthorityOutreachDeliveryBindingEvidenceFutureReasonCode[];
    futureDecisionConfirmationPrefix:
      "REVIEW_OUTREACH_DELIVERY_BINDING_EVIDENCE";
    resultingState: "delivery_binding_evidence_review_ready";
    semantics: Readonly<{
      deterministic: true;
      exactDeliveryBindingEvidenceRequired: true;
      exactBindingRequirementSetFrozen: true;
      exactEvidenceDispositionFrozen: true;
      exactChannelClassFrozen: true;
      humanDeliveryBindingEvidenceReviewRequired: true;
      deliveryBindingEvidenceReviewPreparationOnly: true;
      deliveryBindingEvidenceDecisionRecorded: false;
      deliveryBindingEvidenceApprovalGranted: false;
      deliveryBindingAuthorizationPreparationEligibilityGranted: false;
      deliveryBindingExecutionAuthorized: false;
      deliveryBindingExecutionPerformed: false;
      independentBindingVerificationPerformed: false;
      technicalEvidencePayloadIncluded: false;
      liveProviderIdentifierIncluded: false;
      senderMailboxIdentifierIncluded: false;
      providerCredentialIncluded: false;
      providerCredentialReferenceIncluded: false;
      providerCredentialActivationAuthorized: false;
      submissionMechanismReferenceIncluded: false;
      providerBindingAuthorized: false;
      providerBindingPerformed: false;
      mailboxBindingAuthorized: false;
      mailboxBindingPerformed: false;
      mailboxAccessAuthorized: false;
      mailboxProbeAuthorized: false;
      mailboxProbePerformed: false;
      webSubmissionExecutionAuthorized: false;
      webSubmissionExecutionPerformed: false;
      messageTransmissionAuthorized: false;
      messageTransmissionPerformed: false;
      sendJobConstructionAuthorized: false;
      sendAuthorizationGranted: false;
      outreachSendingAuthorized: false;
      outreachSendingPerformed: false;
      followUpSchedulingAuthorized: false;
      performsModelCall: false;
      performsProviderCall: false;
      performsNetworkOperation: false;
      performsPersistence: false;
      schedulerEnabled: false;
      workerEnabled: false;
      providerWrites: false;
      publicSiteWrites: false;
      linkSchemeAutomationAuthorized: false;
    }>;
  }>;

const HEX64=/^[0-9a-f]{64}$/;

const REVIEW_REQUIREMENTS=Object.freeze({
  exactDeliveryBindingEvidenceRequired:true as const,
  exactBindingRequirementSetRequired:true as const,
  exactEvidenceDispositionRequired:true as const,
  channelConsistencyReviewRequired:true as const,
  requirementOutcomeConsistencyReviewRequired:true as const,
  evidenceFreshnessReviewRequired:true as const,
  explicitHumanDecisionRequired:true as const,
  supportingEvidenceRequiredForApprovalOption:true as const,
  noProviderOrMailboxBindingInference:true as const,
  noWebSubmissionExecutionInference:true as const,
  noCredentialActivationInference:true as const,
  noSendAuthorizationInference:true as const,
});

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactDeliveryBindingEvidenceRequired:true as const,
  exactBindingRequirementSetFrozen:true as const,
  exactEvidenceDispositionFrozen:true as const,
  exactChannelClassFrozen:true as const,
  humanDeliveryBindingEvidenceReviewRequired:true as const,
  deliveryBindingEvidenceReviewPreparationOnly:true as const,
  deliveryBindingEvidenceDecisionRecorded:false as const,
  deliveryBindingEvidenceApprovalGranted:false as const,
  deliveryBindingAuthorizationPreparationEligibilityGranted:false as const,
  deliveryBindingExecutionAuthorized:false as const,
  deliveryBindingExecutionPerformed:false as const,
  independentBindingVerificationPerformed:false as const,
  technicalEvidencePayloadIncluded:false as const,
  liveProviderIdentifierIncluded:false as const,
  senderMailboxIdentifierIncluded:false as const,
  providerCredentialIncluded:false as const,
  providerCredentialReferenceIncluded:false as const,
  providerCredentialActivationAuthorized:false as const,
  submissionMechanismReferenceIncluded:false as const,
  providerBindingAuthorized:false as const,
  providerBindingPerformed:false as const,
  mailboxBindingAuthorized:false as const,
  mailboxBindingPerformed:false as const,
  mailboxAccessAuthorized:false as const,
  mailboxProbeAuthorized:false as const,
  mailboxProbePerformed:false as const,
  webSubmissionExecutionAuthorized:false as const,
  webSubmissionExecutionPerformed:false as const,
  messageTransmissionAuthorized:false as const,
  messageTransmissionPerformed:false as const,
  sendJobConstructionAuthorized:false as const,
  sendAuthorizationGranted:false as const,
  outreachSendingAuthorized:false as const,
  outreachSendingPerformed:false as const,
  followUpSchedulingAuthorized:false as const,
  performsModelCall:false as const,
  performsProviderCall:false as const,
  performsNetworkOperation:false as const,
  performsPersistence:false as const,
  schedulerEnabled:false as const,
  workerEnabled:false as const,
  providerWrites:false as const,
  publicSiteWrites:false as const,
  linkSchemeAutomationAuthorized:false as const,
});

function stableJson(value:unknown):string{
  if(value===undefined) return "null";
  if(value===null||typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return "["+value.map(stableJson).join(",")+"]";
  const object=value as Record<string,unknown>;
  return "{"+Object.keys(object).sort().map(
    key=>JSON.stringify(key)+":"+stableJson(object[key]),
  ).join(",")+"}";
}

function hash(value:unknown):string{
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function fingerprint(value:unknown,field:string):string{
  if(typeof value!=="string"||!HEX64.test(value)){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_review_spec_invalid_"+field,
    );
  }
  return value;
}

function freezeObservation(
  observation:AuthorityOutreachValidatedDeliveryBindingEvidenceObservation,
):AuthorityOutreachDeliveryBindingEvidenceReviewObservation{
  return Object.freeze({
    observationId:observation.observationId,
    observationFingerprint:observation.observationFingerprint,
    requirementClass:observation.requirementClass,
    observationOutcome:observation.observationOutcome,
    observedAt:observation.observedAt,
    technicalEvidenceFingerprint:observation.technicalEvidenceFingerprint,
    publicBusinessBindingEvidenceAttested:true as const,
  });
}

function futureDecisions(
  disposition:AuthorityOutreachDeliveryBindingEvidenceDisposition,
):readonly AuthorityOutreachDeliveryBindingEvidenceFutureDecision[]{
  if(disposition==="delivery_binding_evidence_supporting"){
    return Object.freeze([
      "approve_for_delivery_binding_authorization_preparation",
      "defer_delivery_binding_evidence_review",
      "reject_delivery_binding_evidence",
    ] as const);
  }
  return Object.freeze([
    "defer_delivery_binding_evidence_review",
    "reject_delivery_binding_evidence",
  ] as const);
}

function futureReasonCodes(
  disposition:AuthorityOutreachDeliveryBindingEvidenceDisposition,
):readonly AuthorityOutreachDeliveryBindingEvidenceFutureReasonCode[]{
  const common=[
    "evidence_needs_refresh",
    "needs_more_binding_context",
    "binding_context_unclear",
  ] as const;
  if(disposition==="delivery_binding_evidence_supporting"){
    return Object.freeze([
      "evidence_sufficient_for_binding_authorization_preparation",
      ...common,
    ] as const);
  }
  if(disposition==="delivery_binding_evidence_contradictory"){
    return Object.freeze([
      "contradictory_binding_evidence",
      ...common,
    ] as const);
  }
  return Object.freeze([
    "inconclusive_binding_evidence",
    ...common,
  ] as const);
}

export function buildAuthorityOutreachDeliveryBindingEvidenceReviewSpecification(
  input:Readonly<{
    deliveryBindingEvidence:AuthorityOutreachDeliveryBindingEvidenceContract;
    deliveryBindingEvidenceInput:
      AuthorityOutreachDeliveryBindingEvidenceIntegrityInput;
    reviewRequest:AuthorityOutreachDeliveryBindingEvidenceReviewRequest;
  }>,
):AuthorityOutreachDeliveryBindingEvidenceReviewSpecification{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_review_spec_invalid_input",
    );
  }

  assertAuthorityOutreachDeliveryBindingEvidenceIntegrity(
    input.deliveryBindingEvidence,
    input.deliveryBindingEvidenceInput,
  );

  const evidence=input.deliveryBindingEvidence;
  if(
    evidence.resultingState!=="delivery_binding_evidence_validated"
    ||evidence.evidenceCount<1
    ||evidence.validatedObservations.length!==evidence.evidenceCount
    ||evidence.semantics.suppliedBindingEvidenceValidationOnly!==true
    ||evidence.semantics.independentBindingVerificationPerformed!==false
    ||evidence.semantics.providerBindingAuthorized!==false
    ||evidence.semantics.providerBindingPerformed!==false
    ||evidence.semantics.mailboxBindingAuthorized!==false
    ||evidence.semantics.mailboxBindingPerformed!==false
    ||evidence.semantics.webSubmissionExecutionAuthorized!==false
    ||evidence.semantics.webSubmissionExecutionPerformed!==false
    ||evidence.semantics.providerCredentialActivationAuthorized!==false
    ||evidence.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_review_spec_validated_evidence_required",
    );
  }

  const request=input.reviewRequest;
  const evidenceFingerprint=fingerprint(
    request.deliveryBindingEvidenceFingerprint,
    "delivery_binding_evidence_fingerprint",
  );
  const preparationFingerprint=fingerprint(
    request.deliveryBindingPreparationSpecFingerprint,
    "delivery_binding_preparation_spec_fingerprint",
  );
  const selectedContactPointFingerprint=fingerprint(
    request.selectedContactPointFingerprint,
    "selected_contact_point_fingerprint",
  );
  const selectedRoleCandidateFingerprint=fingerprint(
    request.selectedRoleCandidateFingerprint,
    "selected_role_candidate_fingerprint",
  );
  const candidateFingerprint=fingerprint(
    request.candidateFingerprint,
    "candidate_fingerprint",
  );

  if(
    evidenceFingerprint!==evidence.deliveryBindingEvidenceFingerprint
    ||preparationFingerprint
      !==evidence.deliveryBindingPreparationSpecFingerprint
    ||selectedContactPointFingerprint
      !==evidence.selectedContactPointFingerprint
    ||selectedRoleCandidateFingerprint
      !==evidence.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==evidence.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_review_spec_stale_lineage",
    );
  }

  const reviewObservations=Object.freeze(
    evidence.validatedObservations.map(freezeObservation),
  );
  const frozenBindingRequirements=Object.freeze([
    ...evidence.frozenBindingRequirements,
  ]);
  const allowedFutureDecisions=futureDecisions(evidence.evidenceDisposition);
  const allowedFutureReasonCodes=futureReasonCodes(
    evidence.evidenceDisposition,
  );

  const base={
    version:
      UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_EVIDENCE_REVIEW_SPEC_VERSION,
    deliveryBindingEvidenceId:evidence.deliveryBindingEvidenceId,
    deliveryBindingEvidenceFingerprint:
      evidence.deliveryBindingEvidenceFingerprint,
    deliveryBindingPreparationSpecId:
      evidence.deliveryBindingPreparationSpecId,
    deliveryBindingPreparationSpecFingerprint:
      evidence.deliveryBindingPreparationSpecFingerprint,
    deliverabilityEvidenceDecisionFingerprint:
      evidence.deliverabilityEvidenceDecisionFingerprint,
    deliverabilityEvidenceReviewSpecFingerprint:
      evidence.deliverabilityEvidenceReviewSpecFingerprint,
    deliverabilityEvidenceFingerprint:
      evidence.deliverabilityEvidenceFingerprint,
    deliverabilityPreparationFingerprint:
      evidence.deliverabilityPreparationFingerprint,
    policyConsentDecisionFingerprint:
      evidence.policyConsentDecisionFingerprint,
    policyConsentReviewSpecFingerprint:
      evidence.policyConsentReviewSpecFingerprint,
    contactPointEvidenceFingerprint:
      evidence.contactPointEvidenceFingerprint,
    contactVerificationSpecFingerprint:
      evidence.contactVerificationSpecFingerprint,
    selectionDecisionFingerprint:evidence.selectionDecisionFingerprint,
    selectionReviewSpecFingerprint:evidence.selectionReviewSpecFingerprint,
    researchEvidenceFingerprint:evidence.researchEvidenceFingerprint,
    researchSpecFingerprint:evidence.researchSpecFingerprint,
    deliveryPreparationFingerprint:
      evidence.deliveryPreparationFingerprint,
    sendReviewFingerprint:evidence.sendReviewFingerprint,
    qualityGateFingerprint:evidence.qualityGateFingerprint,
    requestId:evidence.requestId,
    requestFingerprint:evidence.requestFingerprint,
    candidateFingerprint:evidence.candidateFingerprint,
    mechanicalValidationFingerprint:
      evidence.mechanicalValidationFingerprint,
    prospectFingerprint:evidence.prospectFingerprint,
    opportunityFingerprint:evidence.opportunityFingerprint,
    approvalReviewFingerprint:evidence.approvalReviewFingerprint,
    sourceDomain:evidence.sourceDomain,
    sourceUrl:evidence.sourceUrl,
    targetDomain:evidence.targetDomain,
    targetUrl:evidence.targetUrl,
    selectedRoleCandidateFingerprint:
      evidence.selectedRoleCandidateFingerprint,
    selectedContactPointFingerprint:
      evidence.selectedContactPointFingerprint,
    channelClass:evidence.channelClass,
    frozenBindingRequirements,
    evidenceDisposition:evidence.evidenceDisposition,
    reviewObservations,
    evidenceCount:reviewObservations.length,
    reviewRequirements:REVIEW_REQUIREMENTS,
    allowedFutureDecisions,
    allowedFutureReasonCodes,
    futureDecisionConfirmationPrefix:
      "REVIEW_OUTREACH_DELIVERY_BINDING_EVIDENCE" as const,
    resultingState:"delivery_binding_evidence_review_ready" as const,
    semantics:SEMANTICS,
  };

  const deliveryBindingEvidenceReviewSpecFingerprint=hash({
    purpose:
      "ugp_authority_outreach_delivery_binding_evidence_review_specification",
    ...base,
  });

  return Object.freeze({
    ...base,
    deliveryBindingEvidenceReviewSpecId:
      "uaodbers-"+deliveryBindingEvidenceReviewSpecFingerprint.slice(0,24),
    deliveryBindingEvidenceReviewSpecFingerprint,
  });
}

export function assertAuthorityOutreachDeliveryBindingEvidenceReviewSpecIntegrity(
  result:AuthorityOutreachDeliveryBindingEvidenceReviewSpecification,
  input:Readonly<{
    deliveryBindingEvidence:AuthorityOutreachDeliveryBindingEvidenceContract;
    deliveryBindingEvidenceInput:
      AuthorityOutreachDeliveryBindingEvidenceIntegrityInput;
    reviewRequest:AuthorityOutreachDeliveryBindingEvidenceReviewRequest;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_EVIDENCE_REVIEW_SPEC_VERSION
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_review_spec_version_invalid",
    );
  }

  const r=result.reviewRequirements;
  if(
    r.exactDeliveryBindingEvidenceRequired!==true
    ||r.exactBindingRequirementSetRequired!==true
    ||r.exactEvidenceDispositionRequired!==true
    ||r.channelConsistencyReviewRequired!==true
    ||r.requirementOutcomeConsistencyReviewRequired!==true
    ||r.evidenceFreshnessReviewRequired!==true
    ||r.explicitHumanDecisionRequired!==true
    ||r.supportingEvidenceRequiredForApprovalOption!==true
    ||r.noProviderOrMailboxBindingInference!==true
    ||r.noWebSubmissionExecutionInference!==true
    ||r.noCredentialActivationInference!==true
    ||r.noSendAuthorizationInference!==true
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_review_spec_unsafe_requirements",
    );
  }

  const approvalOption=result.allowedFutureDecisions.includes(
    "approve_for_delivery_binding_authorization_preparation",
  );
  if(
    approvalOption
      !==(result.evidenceDisposition
        ==="delivery_binding_evidence_supporting")
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_review_spec_unsafe_decisions",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactDeliveryBindingEvidenceRequired!==true
    ||s.exactBindingRequirementSetFrozen!==true
    ||s.exactEvidenceDispositionFrozen!==true
    ||s.exactChannelClassFrozen!==true
    ||s.humanDeliveryBindingEvidenceReviewRequired!==true
    ||s.deliveryBindingEvidenceReviewPreparationOnly!==true
    ||s.deliveryBindingEvidenceDecisionRecorded!==false
    ||s.deliveryBindingEvidenceApprovalGranted!==false
    ||s.deliveryBindingAuthorizationPreparationEligibilityGranted!==false
    ||s.deliveryBindingExecutionAuthorized!==false
    ||s.deliveryBindingExecutionPerformed!==false
    ||s.independentBindingVerificationPerformed!==false
    ||s.technicalEvidencePayloadIncluded!==false
    ||s.liveProviderIdentifierIncluded!==false
    ||s.senderMailboxIdentifierIncluded!==false
    ||s.providerCredentialIncluded!==false
    ||s.providerCredentialReferenceIncluded!==false
    ||s.providerCredentialActivationAuthorized!==false
    ||s.submissionMechanismReferenceIncluded!==false
    ||s.providerBindingAuthorized!==false
    ||s.providerBindingPerformed!==false
    ||s.mailboxBindingAuthorized!==false
    ||s.mailboxBindingPerformed!==false
    ||s.mailboxAccessAuthorized!==false
    ||s.mailboxProbeAuthorized!==false
    ||s.mailboxProbePerformed!==false
    ||s.webSubmissionExecutionAuthorized!==false
    ||s.webSubmissionExecutionPerformed!==false
    ||s.messageTransmissionAuthorized!==false
    ||s.messageTransmissionPerformed!==false
    ||s.sendJobConstructionAuthorized!==false
    ||s.sendAuthorizationGranted!==false
    ||s.outreachSendingAuthorized!==false
    ||s.outreachSendingPerformed!==false
    ||s.followUpSchedulingAuthorized!==false
    ||s.performsModelCall!==false
    ||s.performsProviderCall!==false
    ||s.performsNetworkOperation!==false
    ||s.performsPersistence!==false
    ||s.schedulerEnabled!==false
    ||s.workerEnabled!==false
    ||s.providerWrites!==false
    ||s.publicSiteWrites!==false
    ||s.linkSchemeAutomationAuthorized!==false
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_review_spec_unsafe_semantics",
    );
  }

  const expected=
    buildAuthorityOutreachDeliveryBindingEvidenceReviewSpecification(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_delivery_binding_evidence_review_spec_integrity_mismatch",
    );
  }
}
