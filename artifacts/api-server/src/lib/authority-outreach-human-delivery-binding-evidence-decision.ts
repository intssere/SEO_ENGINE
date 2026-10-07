import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachDeliveryBindingEvidenceReviewSpecIntegrity,
  type AuthorityOutreachDeliveryBindingEvidenceFutureDecision,
  type AuthorityOutreachDeliveryBindingEvidenceFutureReasonCode,
  type AuthorityOutreachDeliveryBindingEvidenceReviewSpecification,
} from "./authority-outreach-delivery-binding-evidence-review-specification.js";
import type {
  AuthorityOutreachDeliveryBindingEvidenceDisposition,
} from "./authority-outreach-delivery-binding-evidence-validation.js";
import type {
  AuthorityOutreachDeliveryBindingRequirementClass,
} from "./authority-outreach-delivery-binding-preparation-specification.js";

export const UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERY_BINDING_EVIDENCE_DECISION_VERSION =
  "ugp-10-26-human-delivery-binding-evidence-decision-v1" as const;

export type AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRequest =
  Readonly<{
    deliveryBindingEvidenceReviewSpecFingerprint: string;
    deliveryBindingEvidenceFingerprint: string;
    deliveryBindingPreparationSpecFingerprint: string;
    selectedContactPointFingerprint: string;
    selectedRoleCandidateFingerprint: string;
    candidateFingerprint: string;
    decision: AuthorityOutreachDeliveryBindingEvidenceFutureDecision;
    reasonCode: AuthorityOutreachDeliveryBindingEvidenceFutureReasonCode;
    confirmation: string;
  }>;

export type AuthorityOutreachDeliveryBindingEvidenceReviewSpecIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachDeliveryBindingEvidenceReviewSpecIntegrity
  >[1];

export type AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRecord =
  Readonly<{
    version:
      typeof UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERY_BINDING_EVIDENCE_DECISION_VERSION;
    deliveryBindingEvidenceDecisionId: string;
    deliveryBindingEvidenceDecisionFingerprint: string;
    decisionRequestFingerprint: string;
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
    channelClass:
      AuthorityOutreachDeliveryBindingEvidenceReviewSpecification["channelClass"];
    frozenBindingRequirements:
      readonly AuthorityOutreachDeliveryBindingRequirementClass[];
    evidenceDisposition: AuthorityOutreachDeliveryBindingEvidenceDisposition;
    decision: AuthorityOutreachDeliveryBindingEvidenceFutureDecision;
    reasonCode: AuthorityOutreachDeliveryBindingEvidenceFutureReasonCode;
    reviewerId: string;
    reviewedAt: string;
    resultingState:
      | "delivery_binding_authorization_preparation_eligible"
      | "delivery_binding_evidence_rejected"
      | "delivery_binding_evidence_deferred";
    semantics: Readonly<{
      deterministic: true;
      humanDecision: true;
      exactDeliveryBindingEvidenceReviewSpecificationRequired: true;
      exactDeliveryBindingEvidenceRequired: true;
      exactDeliveryBindingPreparationSpecificationRequired: true;
      exactSelectedContactPointRequired: true;
      exactEvidenceDispositionRequired: true;
      exactChannelClassRequired: true;
      exactBindingRequirementSetRequired: true;
      explicitConfirmationRequired: true;
      eligibilityOnly: true;
      deliveryBindingEvidenceDecisionRecorded: true;
      deliveryBindingEvidenceApprovalGranted: boolean;
      deliveryBindingAuthorizationPreparationEligibilityGranted: boolean;
      deliveryBindingAuthorizationPreparationExecuted: false;
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
const REVIEWER=/^[A-Za-z0-9_.:@-]{1,120}$/;

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
      "ugp_outreach_human_delivery_binding_evidence_decision_invalid_"+field,
    );
  }
  return value;
}

function reviewerId(value:unknown):string{
  if(
    typeof value!=="string"
    ||value.trim()!==value
    ||!REVIEWER.test(value)
  ){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_decision_invalid_reviewer",
    );
  }
  return value;
}

function canonicalTimestamp(value:unknown):string{
  if(typeof value!=="string"){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_decision_invalid_reviewed_at",
    );
  }
  const millis=Date.parse(value);
  if(!Number.isFinite(millis)){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_decision_invalid_reviewed_at",
    );
  }
  const canonical=new Date(millis).toISOString();
  if(canonical!==value){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_decision_invalid_reviewed_at",
    );
  }
  return canonical;
}

function assertDecisionReason(
  specification:AuthorityOutreachDeliveryBindingEvidenceReviewSpecification,
  decision:AuthorityOutreachDeliveryBindingEvidenceFutureDecision,
  reasonCode:AuthorityOutreachDeliveryBindingEvidenceFutureReasonCode,
):void{
  if(decision==="approve_for_delivery_binding_authorization_preparation"){
    if(
      specification.evidenceDisposition!=="delivery_binding_evidence_supporting"
      ||reasonCode!=="evidence_sufficient_for_binding_authorization_preparation"
    ){
      throw new Error(
        "ugp_outreach_human_delivery_binding_evidence_decision_approval_reason_invalid",
      );
    }
    return;
  }

  if(decision==="reject_delivery_binding_evidence"){
    if(
      specification.evidenceDisposition==="delivery_binding_evidence_contradictory"
      &&reasonCode!=="contradictory_binding_evidence"
    ){
      throw new Error(
        "ugp_outreach_human_delivery_binding_evidence_decision_reject_reason_invalid",
      );
    }
    if(
      specification.evidenceDisposition==="delivery_binding_evidence_inconclusive"
      &&reasonCode!=="inconclusive_binding_evidence"
    ){
      throw new Error(
        "ugp_outreach_human_delivery_binding_evidence_decision_reject_reason_invalid",
      );
    }
    if(
      specification.evidenceDisposition==="delivery_binding_evidence_supporting"
      &&reasonCode!=="binding_context_unclear"
    ){
      throw new Error(
        "ugp_outreach_human_delivery_binding_evidence_decision_reject_reason_invalid",
      );
    }
    return;
  }

  if(
    decision==="defer_delivery_binding_evidence_review"
    &&![
      "evidence_needs_refresh",
      "needs_more_binding_context",
      "binding_context_unclear",
    ].includes(reasonCode)
  ){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_decision_defer_reason_invalid",
    );
  }
}

function expectedConfirmation(
  request:AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRequest,
):string{
  return [
    "REVIEW_OUTREACH_DELIVERY_BINDING_EVIDENCE",
    request.decision,
    request.deliveryBindingEvidenceReviewSpecFingerprint,
    request.deliveryBindingEvidenceFingerprint,
    request.deliveryBindingPreparationSpecFingerprint,
    request.selectedContactPointFingerprint,
    request.selectedRoleCandidateFingerprint,
    request.candidateFingerprint,
  ].join(":");
}

export function authorityOutreachHumanDeliveryBindingEvidenceDecisionRequestFingerprint(
  request:AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRequest,
  reviewer:string,
):string{
  fingerprint(
    request.deliveryBindingEvidenceReviewSpecFingerprint,
    "delivery_binding_evidence_review_spec_fingerprint",
  );
  fingerprint(
    request.deliveryBindingEvidenceFingerprint,
    "delivery_binding_evidence_fingerprint",
  );
  fingerprint(
    request.deliveryBindingPreparationSpecFingerprint,
    "delivery_binding_preparation_spec_fingerprint",
  );
  fingerprint(
    request.selectedContactPointFingerprint,
    "selected_contact_point_fingerprint",
  );
  fingerprint(
    request.selectedRoleCandidateFingerprint,
    "selected_role_candidate_fingerprint",
  );
  fingerprint(request.candidateFingerprint,"candidate_fingerprint");

  const normalizedReviewer=reviewerId(reviewer);
  if(request.confirmation!==expectedConfirmation(request)){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_decision_explicit_confirmation_required",
    );
  }

  return hash({
    purpose:
      "ugp_authority_outreach_human_delivery_binding_evidence_decision_request",
    version:
      UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERY_BINDING_EVIDENCE_DECISION_VERSION,
    deliveryBindingEvidenceReviewSpecFingerprint:
      request.deliveryBindingEvidenceReviewSpecFingerprint,
    deliveryBindingEvidenceFingerprint:
      request.deliveryBindingEvidenceFingerprint,
    deliveryBindingPreparationSpecFingerprint:
      request.deliveryBindingPreparationSpecFingerprint,
    selectedContactPointFingerprint:
      request.selectedContactPointFingerprint,
    selectedRoleCandidateFingerprint:
      request.selectedRoleCandidateFingerprint,
    candidateFingerprint:request.candidateFingerprint,
    decision:request.decision,
    reasonCode:request.reasonCode,
    reviewerId:normalizedReviewer,
  });
}

export function prepareAuthorityOutreachHumanDeliveryBindingEvidenceDecision(
  input:Readonly<{
    deliveryBindingEvidenceReviewSpecification:
      AuthorityOutreachDeliveryBindingEvidenceReviewSpecification;
    deliveryBindingEvidenceReviewSpecificationInput:
      AuthorityOutreachDeliveryBindingEvidenceReviewSpecIntegrityInput;
    decisionRequest:
      AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRequest;
    reviewerId:string;
    reviewedAt:string;
  }>,
):AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRecord{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_decision_invalid_input",
    );
  }

  assertAuthorityOutreachDeliveryBindingEvidenceReviewSpecIntegrity(
    input.deliveryBindingEvidenceReviewSpecification,
    input.deliveryBindingEvidenceReviewSpecificationInput,
  );

  const specification=input.deliveryBindingEvidenceReviewSpecification;
  if(
    specification.resultingState!=="delivery_binding_evidence_review_ready"
    ||specification.semantics.humanDeliveryBindingEvidenceReviewRequired!==true
    ||specification.semantics.deliveryBindingEvidenceDecisionRecorded!==false
    ||specification.semantics.deliveryBindingEvidenceApprovalGranted!==false
    ||specification.semantics
      .deliveryBindingAuthorizationPreparationEligibilityGranted!==false
    ||specification.semantics.deliveryBindingExecutionAuthorized!==false
    ||specification.semantics.providerBindingAuthorized!==false
    ||specification.semantics.mailboxBindingAuthorized!==false
    ||specification.semantics.webSubmissionExecutionAuthorized!==false
    ||specification.semantics.providerCredentialActivationAuthorized!==false
    ||specification.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_decision_review_spec_required",
    );
  }

  const request=input.decisionRequest;
  const reviewSpecFingerprint=fingerprint(
    request.deliveryBindingEvidenceReviewSpecFingerprint,
    "delivery_binding_evidence_review_spec_fingerprint",
  );
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
    reviewSpecFingerprint
      !==specification.deliveryBindingEvidenceReviewSpecFingerprint
    ||evidenceFingerprint!==specification.deliveryBindingEvidenceFingerprint
    ||preparationFingerprint
      !==specification.deliveryBindingPreparationSpecFingerprint
    ||selectedContactPointFingerprint
      !==specification.selectedContactPointFingerprint
    ||selectedRoleCandidateFingerprint
      !==specification.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==specification.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_decision_stale_lineage",
    );
  }

  if(!specification.allowedFutureDecisions.includes(request.decision)){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_decision_not_allowed",
    );
  }
  if(!specification.allowedFutureReasonCodes.includes(request.reasonCode)){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_reason_not_allowed",
    );
  }

  assertDecisionReason(specification,request.decision,request.reasonCode);

  const normalizedReviewer=reviewerId(input.reviewerId);
  const reviewedAt=canonicalTimestamp(input.reviewedAt);
  const decisionRequestFingerprint=
    authorityOutreachHumanDeliveryBindingEvidenceDecisionRequestFingerprint(
      request,
      normalizedReviewer,
    );

  const approved=
    request.decision==="approve_for_delivery_binding_authorization_preparation";
  const resultingState=
    approved
      ?"delivery_binding_authorization_preparation_eligible" as const
      :request.decision==="reject_delivery_binding_evidence"
        ?"delivery_binding_evidence_rejected" as const
        :"delivery_binding_evidence_deferred" as const;

  const semantics=Object.freeze({
    deterministic:true as const,
    humanDecision:true as const,
    exactDeliveryBindingEvidenceReviewSpecificationRequired:true as const,
    exactDeliveryBindingEvidenceRequired:true as const,
    exactDeliveryBindingPreparationSpecificationRequired:true as const,
    exactSelectedContactPointRequired:true as const,
    exactEvidenceDispositionRequired:true as const,
    exactChannelClassRequired:true as const,
    exactBindingRequirementSetRequired:true as const,
    explicitConfirmationRequired:true as const,
    eligibilityOnly:true as const,
    deliveryBindingEvidenceDecisionRecorded:true as const,
    deliveryBindingEvidenceApprovalGranted:approved,
    deliveryBindingAuthorizationPreparationEligibilityGranted:approved,
    deliveryBindingAuthorizationPreparationExecuted:false as const,
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

  const base={
    version:
      UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERY_BINDING_EVIDENCE_DECISION_VERSION,
    decisionRequestFingerprint,
    deliveryBindingEvidenceReviewSpecId:
      specification.deliveryBindingEvidenceReviewSpecId,
    deliveryBindingEvidenceReviewSpecFingerprint:
      specification.deliveryBindingEvidenceReviewSpecFingerprint,
    deliveryBindingEvidenceId:specification.deliveryBindingEvidenceId,
    deliveryBindingEvidenceFingerprint:
      specification.deliveryBindingEvidenceFingerprint,
    deliveryBindingPreparationSpecId:
      specification.deliveryBindingPreparationSpecId,
    deliveryBindingPreparationSpecFingerprint:
      specification.deliveryBindingPreparationSpecFingerprint,
    deliverabilityEvidenceDecisionFingerprint:
      specification.deliverabilityEvidenceDecisionFingerprint,
    deliverabilityEvidenceReviewSpecFingerprint:
      specification.deliverabilityEvidenceReviewSpecFingerprint,
    deliverabilityEvidenceFingerprint:
      specification.deliverabilityEvidenceFingerprint,
    deliverabilityPreparationFingerprint:
      specification.deliverabilityPreparationFingerprint,
    policyConsentDecisionFingerprint:
      specification.policyConsentDecisionFingerprint,
    policyConsentReviewSpecFingerprint:
      specification.policyConsentReviewSpecFingerprint,
    contactPointEvidenceFingerprint:
      specification.contactPointEvidenceFingerprint,
    contactVerificationSpecFingerprint:
      specification.contactVerificationSpecFingerprint,
    selectionDecisionFingerprint:specification.selectionDecisionFingerprint,
    selectionReviewSpecFingerprint:
      specification.selectionReviewSpecFingerprint,
    researchEvidenceFingerprint:specification.researchEvidenceFingerprint,
    researchSpecFingerprint:specification.researchSpecFingerprint,
    deliveryPreparationFingerprint:
      specification.deliveryPreparationFingerprint,
    sendReviewFingerprint:specification.sendReviewFingerprint,
    qualityGateFingerprint:specification.qualityGateFingerprint,
    requestId:specification.requestId,
    requestFingerprint:specification.requestFingerprint,
    candidateFingerprint:specification.candidateFingerprint,
    mechanicalValidationFingerprint:
      specification.mechanicalValidationFingerprint,
    prospectFingerprint:specification.prospectFingerprint,
    opportunityFingerprint:specification.opportunityFingerprint,
    approvalReviewFingerprint:specification.approvalReviewFingerprint,
    sourceDomain:specification.sourceDomain,
    sourceUrl:specification.sourceUrl,
    targetDomain:specification.targetDomain,
    targetUrl:specification.targetUrl,
    selectedRoleCandidateFingerprint:
      specification.selectedRoleCandidateFingerprint,
    selectedContactPointFingerprint:
      specification.selectedContactPointFingerprint,
    channelClass:specification.channelClass,
    frozenBindingRequirements:Object.freeze([
      ...specification.frozenBindingRequirements,
    ]),
    evidenceDisposition:specification.evidenceDisposition,
    decision:request.decision,
    reasonCode:request.reasonCode,
    reviewerId:normalizedReviewer,
    reviewedAt,
    resultingState,
    semantics,
  };

  const deliveryBindingEvidenceDecisionFingerprint=hash({
    purpose:
      "ugp_authority_outreach_human_delivery_binding_evidence_decision",
    ...base,
  });

  return Object.freeze({
    ...base,
    deliveryBindingEvidenceDecisionId:
      "uaodbed-"+deliveryBindingEvidenceDecisionFingerprint.slice(0,24),
    deliveryBindingEvidenceDecisionFingerprint,
  });
}

export function assertAuthorityOutreachHumanDeliveryBindingEvidenceDecisionIntegrity(
  result:AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRecord,
  input:Readonly<{
    deliveryBindingEvidenceReviewSpecification:
      AuthorityOutreachDeliveryBindingEvidenceReviewSpecification;
    deliveryBindingEvidenceReviewSpecificationInput:
      AuthorityOutreachDeliveryBindingEvidenceReviewSpecIntegrityInput;
    decisionRequest:
      AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRequest;
    reviewerId:string;
    reviewedAt:string;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERY_BINDING_EVIDENCE_DECISION_VERSION
  ){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_decision_version_invalid",
    );
  }

  const approved=
    result.decision==="approve_for_delivery_binding_authorization_preparation";
  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.humanDecision!==true
    ||s.exactDeliveryBindingEvidenceReviewSpecificationRequired!==true
    ||s.exactDeliveryBindingEvidenceRequired!==true
    ||s.exactDeliveryBindingPreparationSpecificationRequired!==true
    ||s.exactSelectedContactPointRequired!==true
    ||s.exactEvidenceDispositionRequired!==true
    ||s.exactChannelClassRequired!==true
    ||s.exactBindingRequirementSetRequired!==true
    ||s.explicitConfirmationRequired!==true
    ||s.eligibilityOnly!==true
    ||s.deliveryBindingEvidenceDecisionRecorded!==true
    ||s.deliveryBindingEvidenceApprovalGranted!==approved
    ||s.deliveryBindingAuthorizationPreparationEligibilityGranted!==approved
    ||s.deliveryBindingAuthorizationPreparationExecuted!==false
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
      "ugp_outreach_human_delivery_binding_evidence_decision_unsafe_semantics",
    );
  }

  const expected=
    prepareAuthorityOutreachHumanDeliveryBindingEvidenceDecision(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_human_delivery_binding_evidence_decision_integrity_mismatch",
    );
  }
}
