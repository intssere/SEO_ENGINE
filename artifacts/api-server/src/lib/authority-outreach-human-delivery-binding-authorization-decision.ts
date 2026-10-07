import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachDeliveryBindingAuthorizationReviewSpecIntegrity,
  type AuthorityOutreachDeliveryBindingAuthorizationFutureDecision,
  type AuthorityOutreachDeliveryBindingAuthorizationFutureReasonCode,
  type AuthorityOutreachDeliveryBindingAuthorizationReviewSpecification,
} from "./authority-outreach-delivery-binding-authorization-review-specification.js";
import type {
  AuthorityOutreachDeliveryBindingAuthorizationMaterialClass,
} from "./authority-outreach-delivery-binding-authorization-preparation-specification.js";
import type {
  AuthorityOutreachDeliveryBindingRequirementClass,
} from "./authority-outreach-delivery-binding-preparation-specification.js";

export const UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERY_BINDING_AUTHORIZATION_DECISION_VERSION =
  "ugp-10-29-human-delivery-binding-authorization-decision-v1" as const;

export type AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRequest =
  Readonly<{
    deliveryBindingAuthorizationReviewSpecFingerprint:string;
    deliveryBindingAuthorizationPreparationSpecFingerprint:string;
    deliveryBindingEvidenceDecisionFingerprint:string;
    selectedContactPointFingerprint:string;
    selectedRoleCandidateFingerprint:string;
    candidateFingerprint:string;
    decision:AuthorityOutreachDeliveryBindingAuthorizationFutureDecision;
    reasonCode:AuthorityOutreachDeliveryBindingAuthorizationFutureReasonCode;
    confirmation:string;
  }>;

export type AuthorityOutreachDeliveryBindingAuthorizationReviewSpecIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachDeliveryBindingAuthorizationReviewSpecIntegrity
  >[1];

export type AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRecord =
  Readonly<{
    version:
      typeof UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERY_BINDING_AUTHORIZATION_DECISION_VERSION;
    deliveryBindingAuthorizationDecisionId:string;
    deliveryBindingAuthorizationDecisionFingerprint:string;
    decisionRequestFingerprint:string;
    deliveryBindingAuthorizationReviewSpecId:string;
    deliveryBindingAuthorizationReviewSpecFingerprint:string;
    deliveryBindingAuthorizationPreparationSpecId:string;
    deliveryBindingAuthorizationPreparationSpecFingerprint:string;
    deliveryBindingEvidenceDecisionId:string;
    deliveryBindingEvidenceDecisionFingerprint:string;
    deliveryBindingEvidenceReviewSpecFingerprint:string;
    deliveryBindingEvidenceFingerprint:string;
    deliveryBindingPreparationSpecFingerprint:string;
    deliverabilityEvidenceDecisionFingerprint:string;
    deliverabilityEvidenceReviewSpecFingerprint:string;
    deliverabilityEvidenceFingerprint:string;
    deliverabilityPreparationFingerprint:string;
    policyConsentDecisionFingerprint:string;
    policyConsentReviewSpecFingerprint:string;
    contactPointEvidenceFingerprint:string;
    contactVerificationSpecFingerprint:string;
    selectionDecisionFingerprint:string;
    selectionReviewSpecFingerprint:string;
    researchEvidenceFingerprint:string;
    researchSpecFingerprint:string;
    deliveryPreparationFingerprint:string;
    sendReviewFingerprint:string;
    qualityGateFingerprint:string;
    requestId:string;
    requestFingerprint:string;
    candidateFingerprint:string;
    mechanicalValidationFingerprint:string;
    prospectFingerprint:string;
    opportunityFingerprint:string;
    approvalReviewFingerprint:string;
    sourceDomain:string;
    sourceUrl:string|null;
    targetDomain:string;
    targetUrl:string;
    selectedRoleCandidateFingerprint:string;
    selectedContactPointFingerprint:string;
    channelClass:
      AuthorityOutreachDeliveryBindingAuthorizationReviewSpecification["channelClass"];
    frozenBindingRequirements:
      readonly AuthorityOutreachDeliveryBindingRequirementClass[];
    frozenAuthorizationMaterialClasses:
      readonly AuthorityOutreachDeliveryBindingAuthorizationMaterialClass[];
    evidenceDisposition:"delivery_binding_evidence_supporting";
    decision:AuthorityOutreachDeliveryBindingAuthorizationFutureDecision;
    reasonCode:AuthorityOutreachDeliveryBindingAuthorizationFutureReasonCode;
    reviewerId:string;
    reviewedAt:string;
    resultingState:
      | "delivery_binding_operational_authorization_eligible"
      | "delivery_binding_authorization_preparation_rejected"
      | "delivery_binding_authorization_review_deferred";
    semantics:Readonly<{
      deterministic:true;
      humanDecision:true;
      exactDeliveryBindingAuthorizationReviewSpecificationRequired:true;
      exactDeliveryBindingAuthorizationPreparationSpecificationRequired:true;
      exactHumanDeliveryBindingEvidenceDecisionRequired:true;
      exactChannelClassRequired:true;
      exactBindingRequirementSetRequired:true;
      exactAuthorizationMaterialClassSetRequired:true;
      explicitConfirmationRequired:true;
      eligibilityOnly:true;
      deliveryBindingAuthorizationDecisionRecorded:true;
      deliveryBindingAuthorizationApproved:boolean;
      separateOperationalAuthorizationEligibilityGranted:boolean;
      separateOperationalAuthorizationExecuted:false;
      deliveryBindingAuthorizationGranted:false;
      deliveryBindingAuthorizationRecorded:false;
      deliveryBindingAuthorizationPreparationExecuted:false;
      deliveryBindingExecutionAuthorized:false;
      deliveryBindingExecutionPerformed:false;
      liveProviderIdentifierIncluded:false;
      senderMailboxIdentifierIncluded:false;
      providerCredentialIncluded:false;
      providerCredentialReferenceIncluded:false;
      providerCredentialActivationAuthorized:false;
      submissionMechanismReferenceIncluded:false;
      providerBindingAuthorized:false;
      providerBindingPerformed:false;
      mailboxBindingAuthorized:false;
      mailboxBindingPerformed:false;
      mailboxAccessAuthorized:false;
      mailboxProbeAuthorized:false;
      mailboxProbePerformed:false;
      webSubmissionExecutionAuthorized:false;
      webSubmissionExecutionPerformed:false;
      messageTransmissionAuthorized:false;
      messageTransmissionPerformed:false;
      sendJobConstructionAuthorized:false;
      sendAuthorizationGranted:false;
      outreachSendingAuthorized:false;
      outreachSendingPerformed:false;
      followUpSchedulingAuthorized:false;
      performsModelCall:false;
      performsProviderCall:false;
      performsNetworkOperation:false;
      performsPersistence:false;
      schedulerEnabled:false;
      workerEnabled:false;
      providerWrites:false;
      publicSiteWrites:false;
      linkSchemeAutomationAuthorized:false;
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
      "ugp_outreach_human_delivery_binding_authorization_decision_invalid_"+field,
    );
  }
  return value;
}

function reviewerId(value:unknown):string{
  if(typeof value!=="string"||value.trim()!==value||!REVIEWER.test(value)){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_invalid_reviewer",
    );
  }
  return value;
}

function canonicalTimestamp(value:unknown):string{
  if(typeof value!=="string"){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_invalid_reviewed_at",
    );
  }
  const millis=Date.parse(value);
  if(!Number.isFinite(millis)){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_invalid_reviewed_at",
    );
  }
  const canonical=new Date(millis).toISOString();
  if(canonical!==value){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_invalid_reviewed_at",
    );
  }
  return canonical;
}

function assertDecisionReason(
  decision:AuthorityOutreachDeliveryBindingAuthorizationFutureDecision,
  reasonCode:AuthorityOutreachDeliveryBindingAuthorizationFutureReasonCode,
):void{
  if(
    decision==="approve_for_separate_delivery_binding_operational_authorization"
    &&reasonCode
      !=="authorization_preparation_sufficient_for_separate_operational_authorization"
  ){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_approval_reason_invalid",
    );
  }

  if(
    decision==="reject_delivery_binding_authorization_preparation"
    &&reasonCode!=="authorization_preparation_rejected"
  ){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_reject_reason_invalid",
    );
  }

  if(
    decision==="defer_delivery_binding_authorization_review"
    &&![
      "authorization_scope_unclear",
      "rollback_or_verification_requirements_unclear",
      "needs_more_authorization_context",
    ].includes(reasonCode)
  ){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_defer_reason_invalid",
    );
  }
}

function expectedConfirmation(
  request:AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRequest,
):string{
  return [
    "REVIEW_OUTREACH_DELIVERY_BINDING_AUTHORIZATION",
    request.decision,
    request.deliveryBindingAuthorizationReviewSpecFingerprint,
    request.deliveryBindingAuthorizationPreparationSpecFingerprint,
    request.deliveryBindingEvidenceDecisionFingerprint,
    request.selectedContactPointFingerprint,
    request.selectedRoleCandidateFingerprint,
    request.candidateFingerprint,
  ].join(":");
}

export function authorityOutreachHumanDeliveryBindingAuthorizationDecisionRequestFingerprint(
  request:AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRequest,
  reviewer:string,
):string{
  fingerprint(
    request.deliveryBindingAuthorizationReviewSpecFingerprint,
    "delivery_binding_authorization_review_spec_fingerprint",
  );
  fingerprint(
    request.deliveryBindingAuthorizationPreparationSpecFingerprint,
    "delivery_binding_authorization_preparation_spec_fingerprint",
  );
  fingerprint(
    request.deliveryBindingEvidenceDecisionFingerprint,
    "delivery_binding_evidence_decision_fingerprint",
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
      "ugp_outreach_human_delivery_binding_authorization_decision_explicit_confirmation_required",
    );
  }

  return hash({
    purpose:
      "ugp_authority_outreach_human_delivery_binding_authorization_decision_request",
    version:
      UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERY_BINDING_AUTHORIZATION_DECISION_VERSION,
    deliveryBindingAuthorizationReviewSpecFingerprint:
      request.deliveryBindingAuthorizationReviewSpecFingerprint,
    deliveryBindingAuthorizationPreparationSpecFingerprint:
      request.deliveryBindingAuthorizationPreparationSpecFingerprint,
    deliveryBindingEvidenceDecisionFingerprint:
      request.deliveryBindingEvidenceDecisionFingerprint,
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

export function prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision(
  input:Readonly<{
    deliveryBindingAuthorizationReviewSpecification:
      AuthorityOutreachDeliveryBindingAuthorizationReviewSpecification;
    deliveryBindingAuthorizationReviewSpecificationInput:
      AuthorityOutreachDeliveryBindingAuthorizationReviewSpecIntegrityInput;
    decisionRequest:
      AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRequest;
    reviewerId:string;
    reviewedAt:string;
  }>,
):AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRecord{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_invalid_input",
    );
  }

  assertAuthorityOutreachDeliveryBindingAuthorizationReviewSpecIntegrity(
    input.deliveryBindingAuthorizationReviewSpecification,
    input.deliveryBindingAuthorizationReviewSpecificationInput,
  );

  const specification=input.deliveryBindingAuthorizationReviewSpecification;
  if(
    specification.resultingState!=="delivery_binding_authorization_review_ready"
    ||specification.semantics
      .humanDeliveryBindingAuthorizationReviewRequired!==true
    ||specification.semantics.deliveryBindingAuthorizationDecisionRecorded!==false
    ||specification.semantics.deliveryBindingAuthorizationApproved!==false
    ||specification.semantics
      .separateOperationalAuthorizationEligibilityGranted!==false
    ||specification.semantics.deliveryBindingAuthorizationGranted!==false
    ||specification.semantics.deliveryBindingAuthorizationRecorded!==false
    ||specification.semantics.deliveryBindingExecutionAuthorized!==false
    ||specification.semantics.providerCredentialActivationAuthorized!==false
    ||specification.semantics.providerBindingAuthorized!==false
    ||specification.semantics.mailboxBindingAuthorized!==false
    ||specification.semantics.webSubmissionExecutionAuthorized!==false
    ||specification.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_review_spec_required",
    );
  }

  const request=input.decisionRequest;
  const reviewSpecFingerprint=fingerprint(
    request.deliveryBindingAuthorizationReviewSpecFingerprint,
    "delivery_binding_authorization_review_spec_fingerprint",
  );
  const preparationSpecFingerprint=fingerprint(
    request.deliveryBindingAuthorizationPreparationSpecFingerprint,
    "delivery_binding_authorization_preparation_spec_fingerprint",
  );
  const evidenceDecisionFingerprint=fingerprint(
    request.deliveryBindingEvidenceDecisionFingerprint,
    "delivery_binding_evidence_decision_fingerprint",
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
      !==specification.deliveryBindingAuthorizationReviewSpecFingerprint
    ||preparationSpecFingerprint
      !==specification.deliveryBindingAuthorizationPreparationSpecFingerprint
    ||evidenceDecisionFingerprint
      !==specification.deliveryBindingEvidenceDecisionFingerprint
    ||selectedContactPointFingerprint
      !==specification.selectedContactPointFingerprint
    ||selectedRoleCandidateFingerprint
      !==specification.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==specification.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_stale_lineage",
    );
  }

  if(!specification.allowedFutureDecisions.includes(request.decision)){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_not_allowed",
    );
  }
  if(!specification.allowedFutureReasonCodes.includes(request.reasonCode)){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_reason_not_allowed",
    );
  }

  assertDecisionReason(request.decision,request.reasonCode);

  const normalizedReviewer=reviewerId(input.reviewerId);
  const reviewedAt=canonicalTimestamp(input.reviewedAt);
  const decisionRequestFingerprint=
    authorityOutreachHumanDeliveryBindingAuthorizationDecisionRequestFingerprint(
      request,
      normalizedReviewer,
    );

  const approved=
    request.decision
      ==="approve_for_separate_delivery_binding_operational_authorization";
  const resultingState=
    approved
      ?"delivery_binding_operational_authorization_eligible" as const
      :request.decision
        ==="reject_delivery_binding_authorization_preparation"
        ?"delivery_binding_authorization_preparation_rejected" as const
        :"delivery_binding_authorization_review_deferred" as const;

  const semantics=Object.freeze({
    deterministic:true as const,
    humanDecision:true as const,
    exactDeliveryBindingAuthorizationReviewSpecificationRequired:true as const,
    exactDeliveryBindingAuthorizationPreparationSpecificationRequired:true as const,
    exactHumanDeliveryBindingEvidenceDecisionRequired:true as const,
    exactChannelClassRequired:true as const,
    exactBindingRequirementSetRequired:true as const,
    exactAuthorizationMaterialClassSetRequired:true as const,
    explicitConfirmationRequired:true as const,
    eligibilityOnly:true as const,
    deliveryBindingAuthorizationDecisionRecorded:true as const,
    deliveryBindingAuthorizationApproved:approved,
    separateOperationalAuthorizationEligibilityGranted:approved,
    separateOperationalAuthorizationExecuted:false as const,
    deliveryBindingAuthorizationGranted:false as const,
    deliveryBindingAuthorizationRecorded:false as const,
    deliveryBindingAuthorizationPreparationExecuted:false as const,
    deliveryBindingExecutionAuthorized:false as const,
    deliveryBindingExecutionPerformed:false as const,
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
      UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERY_BINDING_AUTHORIZATION_DECISION_VERSION,
    decisionRequestFingerprint,
    deliveryBindingAuthorizationReviewSpecId:
      specification.deliveryBindingAuthorizationReviewSpecId,
    deliveryBindingAuthorizationReviewSpecFingerprint:
      specification.deliveryBindingAuthorizationReviewSpecFingerprint,
    deliveryBindingAuthorizationPreparationSpecId:
      specification.deliveryBindingAuthorizationPreparationSpecId,
    deliveryBindingAuthorizationPreparationSpecFingerprint:
      specification.deliveryBindingAuthorizationPreparationSpecFingerprint,
    deliveryBindingEvidenceDecisionId:
      specification.deliveryBindingEvidenceDecisionId,
    deliveryBindingEvidenceDecisionFingerprint:
      specification.deliveryBindingEvidenceDecisionFingerprint,
    deliveryBindingEvidenceReviewSpecFingerprint:
      specification.deliveryBindingEvidenceReviewSpecFingerprint,
    deliveryBindingEvidenceFingerprint:
      specification.deliveryBindingEvidenceFingerprint,
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
    frozenAuthorizationMaterialClasses:Object.freeze([
      ...specification.frozenAuthorizationMaterialClasses,
    ]),
    evidenceDisposition:"delivery_binding_evidence_supporting" as const,
    decision:request.decision,
    reasonCode:request.reasonCode,
    reviewerId:normalizedReviewer,
    reviewedAt,
    resultingState,
    semantics,
  };

  const deliveryBindingAuthorizationDecisionFingerprint=hash({
    purpose:
      "ugp_authority_outreach_human_delivery_binding_authorization_decision",
    ...base,
  });

  return Object.freeze({
    ...base,
    deliveryBindingAuthorizationDecisionId:
      "uaodbad-"+deliveryBindingAuthorizationDecisionFingerprint.slice(0,24),
    deliveryBindingAuthorizationDecisionFingerprint,
  });
}

export function assertAuthorityOutreachHumanDeliveryBindingAuthorizationDecisionIntegrity(
  result:AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRecord,
  input:Readonly<{
    deliveryBindingAuthorizationReviewSpecification:
      AuthorityOutreachDeliveryBindingAuthorizationReviewSpecification;
    deliveryBindingAuthorizationReviewSpecificationInput:
      AuthorityOutreachDeliveryBindingAuthorizationReviewSpecIntegrityInput;
    decisionRequest:
      AuthorityOutreachHumanDeliveryBindingAuthorizationDecisionRequest;
    reviewerId:string;
    reviewedAt:string;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERY_BINDING_AUTHORIZATION_DECISION_VERSION
  ){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_version_invalid",
    );
  }

  const approved=
    result.decision
      ==="approve_for_separate_delivery_binding_operational_authorization";
  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.humanDecision!==true
    ||s.exactDeliveryBindingAuthorizationReviewSpecificationRequired!==true
    ||s.exactDeliveryBindingAuthorizationPreparationSpecificationRequired!==true
    ||s.exactHumanDeliveryBindingEvidenceDecisionRequired!==true
    ||s.exactChannelClassRequired!==true
    ||s.exactBindingRequirementSetRequired!==true
    ||s.exactAuthorizationMaterialClassSetRequired!==true
    ||s.explicitConfirmationRequired!==true
    ||s.eligibilityOnly!==true
    ||s.deliveryBindingAuthorizationDecisionRecorded!==true
    ||s.deliveryBindingAuthorizationApproved!==approved
    ||s.separateOperationalAuthorizationEligibilityGranted!==approved
    ||s.separateOperationalAuthorizationExecuted!==false
    ||s.deliveryBindingAuthorizationGranted!==false
    ||s.deliveryBindingAuthorizationRecorded!==false
    ||s.deliveryBindingAuthorizationPreparationExecuted!==false
    ||s.deliveryBindingExecutionAuthorized!==false
    ||s.deliveryBindingExecutionPerformed!==false
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
      "ugp_outreach_human_delivery_binding_authorization_decision_unsafe_semantics",
    );
  }

  const expected=
    prepareAuthorityOutreachHumanDeliveryBindingAuthorizationDecision(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_human_delivery_binding_authorization_decision_integrity_mismatch",
    );
  }
}
