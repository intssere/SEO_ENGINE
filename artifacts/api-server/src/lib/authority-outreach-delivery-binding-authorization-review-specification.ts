import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecIntegrity,
  type AuthorityOutreachDeliveryBindingAuthorizationMaterialClass,
  type AuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification,
} from "./authority-outreach-delivery-binding-authorization-preparation-specification.js";
import type {
  AuthorityOutreachDeliveryBindingRequirementClass,
} from "./authority-outreach-delivery-binding-preparation-specification.js";

export const UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_AUTHORIZATION_REVIEW_SPEC_VERSION =
  "ugp-10-28-delivery-binding-authorization-review-specification-v1" as const;

export type AuthorityOutreachDeliveryBindingAuthorizationFutureDecision =
  | "approve_for_separate_delivery_binding_operational_authorization"
  | "reject_delivery_binding_authorization_preparation"
  | "defer_delivery_binding_authorization_review";

export type AuthorityOutreachDeliveryBindingAuthorizationFutureReasonCode =
  | "authorization_preparation_sufficient_for_separate_operational_authorization"
  | "authorization_scope_unclear"
  | "rollback_or_verification_requirements_unclear"
  | "needs_more_authorization_context"
  | "authorization_preparation_rejected";

export type AuthorityOutreachDeliveryBindingAuthorizationReviewRequest =
  Readonly<{
    deliveryBindingAuthorizationPreparationSpecFingerprint:string;
    deliveryBindingEvidenceDecisionFingerprint:string;
    selectedContactPointFingerprint:string;
    selectedRoleCandidateFingerprint:string;
    candidateFingerprint:string;
  }>;

export type AuthorityOutreachDeliveryBindingAuthorizationPreparationIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecIntegrity
  >[1];

export type AuthorityOutreachDeliveryBindingAuthorizationReviewSpecification =
  Readonly<{
    version:
      typeof UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_AUTHORIZATION_REVIEW_SPEC_VERSION;
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
      AuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification["channelClass"];
    frozenBindingRequirements:
      readonly AuthorityOutreachDeliveryBindingRequirementClass[];
    frozenAuthorizationMaterialClasses:
      readonly AuthorityOutreachDeliveryBindingAuthorizationMaterialClass[];
    authorizationMaterialCount:number;
    evidenceDisposition:"delivery_binding_evidence_supporting";
    approvedEvidenceDecision:
      "approve_for_delivery_binding_authorization_preparation";
    reviewRequirements:Readonly<{
      exactAuthorizationPreparationSpecificationRequired:true;
      exactApprovedEvidenceDecisionRequired:true;
      exactChannelClassRequired:true;
      exactBindingRequirementSetRequired:true;
      exactAuthorizationMaterialClassSetRequired:true;
      boundedBindingScopeReviewRequired:true;
      rollbackUnbindRequirementReviewRequired:true;
      postBindingVerificationRequirementReviewRequired:true;
      channelSpecificAuthorizationReviewRequired:true;
      explicitHumanDecisionRequired:true;
      noAuthorizationGrantInference:true;
      noCredentialActivationInference:true;
      noBindingExecutionInference:true;
      noSendAuthorizationInference:true;
    }>;
    allowedFutureDecisions:
      readonly AuthorityOutreachDeliveryBindingAuthorizationFutureDecision[];
    allowedFutureReasonCodes:
      readonly AuthorityOutreachDeliveryBindingAuthorizationFutureReasonCode[];
    futureDecisionConfirmationPrefix:
      "REVIEW_OUTREACH_DELIVERY_BINDING_AUTHORIZATION";
    resultingState:"delivery_binding_authorization_review_ready";
    semantics:Readonly<{
      deterministic:true;
      exactDeliveryBindingAuthorizationPreparationSpecificationRequired:true;
      exactHumanDeliveryBindingEvidenceDecisionRequired:true;
      exactChannelClassFrozen:true;
      exactBindingRequirementSetFrozen:true;
      exactAuthorizationMaterialClassSetFrozen:true;
      humanDeliveryBindingAuthorizationReviewRequired:true;
      deliveryBindingAuthorizationReviewPreparationOnly:true;
      deliveryBindingAuthorizationDecisionRecorded:false;
      deliveryBindingAuthorizationApproved:false;
      separateOperationalAuthorizationEligibilityGranted:false;
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

const REVIEW_REQUIREMENTS=Object.freeze({
  exactAuthorizationPreparationSpecificationRequired:true as const,
  exactApprovedEvidenceDecisionRequired:true as const,
  exactChannelClassRequired:true as const,
  exactBindingRequirementSetRequired:true as const,
  exactAuthorizationMaterialClassSetRequired:true as const,
  boundedBindingScopeReviewRequired:true as const,
  rollbackUnbindRequirementReviewRequired:true as const,
  postBindingVerificationRequirementReviewRequired:true as const,
  channelSpecificAuthorizationReviewRequired:true as const,
  explicitHumanDecisionRequired:true as const,
  noAuthorizationGrantInference:true as const,
  noCredentialActivationInference:true as const,
  noBindingExecutionInference:true as const,
  noSendAuthorizationInference:true as const,
});

const ALLOWED_FUTURE_DECISIONS=Object.freeze([
  "approve_for_separate_delivery_binding_operational_authorization",
  "defer_delivery_binding_authorization_review",
  "reject_delivery_binding_authorization_preparation",
] as const);

const ALLOWED_FUTURE_REASON_CODES=Object.freeze([
  "authorization_preparation_sufficient_for_separate_operational_authorization",
  "authorization_scope_unclear",
  "rollback_or_verification_requirements_unclear",
  "needs_more_authorization_context",
  "authorization_preparation_rejected",
] as const);

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactDeliveryBindingAuthorizationPreparationSpecificationRequired:true as const,
  exactHumanDeliveryBindingEvidenceDecisionRequired:true as const,
  exactChannelClassFrozen:true as const,
  exactBindingRequirementSetFrozen:true as const,
  exactAuthorizationMaterialClassSetFrozen:true as const,
  humanDeliveryBindingAuthorizationReviewRequired:true as const,
  deliveryBindingAuthorizationReviewPreparationOnly:true as const,
  deliveryBindingAuthorizationDecisionRecorded:false as const,
  deliveryBindingAuthorizationApproved:false as const,
  separateOperationalAuthorizationEligibilityGranted:false as const,
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
      "ugp_outreach_delivery_binding_authorization_review_invalid_"+field,
    );
  }
  return value;
}

export function buildAuthorityOutreachDeliveryBindingAuthorizationReviewSpecification(
  input:Readonly<{
    deliveryBindingAuthorizationPreparationSpecification:
      AuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification;
    deliveryBindingAuthorizationPreparationSpecificationInput:
      AuthorityOutreachDeliveryBindingAuthorizationPreparationIntegrityInput;
    reviewRequest:AuthorityOutreachDeliveryBindingAuthorizationReviewRequest;
  }>,
):AuthorityOutreachDeliveryBindingAuthorizationReviewSpecification{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_review_invalid_input",
    );
  }

  assertAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecIntegrity(
    input.deliveryBindingAuthorizationPreparationSpecification,
    input.deliveryBindingAuthorizationPreparationSpecificationInput,
  );

  const preparation=
    input.deliveryBindingAuthorizationPreparationSpecification;
  if(
    preparation.resultingState
      !=="delivery_binding_authorization_preparation_spec_ready"
    ||preparation.futureAuthorizationMaterialClasses.length<1
    ||preparation.semantics
      .deliveryBindingAuthorizationPreparationSpecificationOnly!==true
    ||preparation.semantics
      .deliveryBindingAuthorizationPreparationSpecificationBuilt!==true
    ||preparation.semantics.futureAuthorizationMaterialClassesFrozen!==true
    ||preparation.semantics.deliveryBindingAuthorizationGranted!==false
    ||preparation.semantics.deliveryBindingAuthorizationRecorded!==false
    ||preparation.semantics.deliveryBindingExecutionAuthorized!==false
    ||preparation.semantics.deliveryBindingExecutionPerformed!==false
    ||preparation.semantics.providerCredentialActivationAuthorized!==false
    ||preparation.semantics.providerBindingAuthorized!==false
    ||preparation.semantics.mailboxBindingAuthorized!==false
    ||preparation.semantics.webSubmissionExecutionAuthorized!==false
    ||preparation.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_review_preparation_spec_required",
    );
  }

  const request=input.reviewRequest;
  const authorizationPreparationFingerprint=fingerprint(
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
    authorizationPreparationFingerprint
      !==preparation.deliveryBindingAuthorizationPreparationSpecFingerprint
    ||evidenceDecisionFingerprint
      !==preparation.deliveryBindingEvidenceDecisionFingerprint
    ||selectedContactPointFingerprint
      !==preparation.selectedContactPointFingerprint
    ||selectedRoleCandidateFingerprint
      !==preparation.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==preparation.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_review_stale_lineage",
    );
  }

  const frozenBindingRequirements=Object.freeze([
    ...preparation.frozenBindingRequirements,
  ]);
  const frozenAuthorizationMaterialClasses=Object.freeze([
    ...preparation.futureAuthorizationMaterialClasses,
  ]);

  const base={
    version:
      UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_AUTHORIZATION_REVIEW_SPEC_VERSION,
    deliveryBindingAuthorizationPreparationSpecId:
      preparation.deliveryBindingAuthorizationPreparationSpecId,
    deliveryBindingAuthorizationPreparationSpecFingerprint:
      preparation.deliveryBindingAuthorizationPreparationSpecFingerprint,
    deliveryBindingEvidenceDecisionId:
      preparation.deliveryBindingEvidenceDecisionId,
    deliveryBindingEvidenceDecisionFingerprint:
      preparation.deliveryBindingEvidenceDecisionFingerprint,
    deliveryBindingEvidenceReviewSpecFingerprint:
      preparation.deliveryBindingEvidenceReviewSpecFingerprint,
    deliveryBindingEvidenceFingerprint:
      preparation.deliveryBindingEvidenceFingerprint,
    deliveryBindingPreparationSpecFingerprint:
      preparation.deliveryBindingPreparationSpecFingerprint,
    deliverabilityEvidenceDecisionFingerprint:
      preparation.deliverabilityEvidenceDecisionFingerprint,
    deliverabilityEvidenceReviewSpecFingerprint:
      preparation.deliverabilityEvidenceReviewSpecFingerprint,
    deliverabilityEvidenceFingerprint:
      preparation.deliverabilityEvidenceFingerprint,
    deliverabilityPreparationFingerprint:
      preparation.deliverabilityPreparationFingerprint,
    policyConsentDecisionFingerprint:
      preparation.policyConsentDecisionFingerprint,
    policyConsentReviewSpecFingerprint:
      preparation.policyConsentReviewSpecFingerprint,
    contactPointEvidenceFingerprint:
      preparation.contactPointEvidenceFingerprint,
    contactVerificationSpecFingerprint:
      preparation.contactVerificationSpecFingerprint,
    selectionDecisionFingerprint:preparation.selectionDecisionFingerprint,
    selectionReviewSpecFingerprint:
      preparation.selectionReviewSpecFingerprint,
    researchEvidenceFingerprint:preparation.researchEvidenceFingerprint,
    researchSpecFingerprint:preparation.researchSpecFingerprint,
    deliveryPreparationFingerprint:
      preparation.deliveryPreparationFingerprint,
    sendReviewFingerprint:preparation.sendReviewFingerprint,
    qualityGateFingerprint:preparation.qualityGateFingerprint,
    requestId:preparation.requestId,
    requestFingerprint:preparation.requestFingerprint,
    candidateFingerprint:preparation.candidateFingerprint,
    mechanicalValidationFingerprint:
      preparation.mechanicalValidationFingerprint,
    prospectFingerprint:preparation.prospectFingerprint,
    opportunityFingerprint:preparation.opportunityFingerprint,
    approvalReviewFingerprint:preparation.approvalReviewFingerprint,
    sourceDomain:preparation.sourceDomain,
    sourceUrl:preparation.sourceUrl,
    targetDomain:preparation.targetDomain,
    targetUrl:preparation.targetUrl,
    selectedRoleCandidateFingerprint:
      preparation.selectedRoleCandidateFingerprint,
    selectedContactPointFingerprint:
      preparation.selectedContactPointFingerprint,
    channelClass:preparation.channelClass,
    frozenBindingRequirements,
    frozenAuthorizationMaterialClasses,
    authorizationMaterialCount:frozenAuthorizationMaterialClasses.length,
    evidenceDisposition:"delivery_binding_evidence_supporting" as const,
    approvedEvidenceDecision:
      "approve_for_delivery_binding_authorization_preparation" as const,
    reviewRequirements:REVIEW_REQUIREMENTS,
    allowedFutureDecisions:ALLOWED_FUTURE_DECISIONS,
    allowedFutureReasonCodes:ALLOWED_FUTURE_REASON_CODES,
    futureDecisionConfirmationPrefix:
      "REVIEW_OUTREACH_DELIVERY_BINDING_AUTHORIZATION" as const,
    resultingState:"delivery_binding_authorization_review_ready" as const,
    semantics:SEMANTICS,
  };

  const deliveryBindingAuthorizationReviewSpecFingerprint=hash({
    purpose:
      "ugp_authority_outreach_delivery_binding_authorization_review_specification",
    ...base,
  });

  return Object.freeze({
    ...base,
    deliveryBindingAuthorizationReviewSpecId:
      "uaodbars-"+deliveryBindingAuthorizationReviewSpecFingerprint.slice(
        0,
        24,
      ),
    deliveryBindingAuthorizationReviewSpecFingerprint,
  });
}

export function assertAuthorityOutreachDeliveryBindingAuthorizationReviewSpecIntegrity(
  result:AuthorityOutreachDeliveryBindingAuthorizationReviewSpecification,
  input:Readonly<{
    deliveryBindingAuthorizationPreparationSpecification:
      AuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification;
    deliveryBindingAuthorizationPreparationSpecificationInput:
      AuthorityOutreachDeliveryBindingAuthorizationPreparationIntegrityInput;
    reviewRequest:AuthorityOutreachDeliveryBindingAuthorizationReviewRequest;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_AUTHORIZATION_REVIEW_SPEC_VERSION
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_review_version_invalid",
    );
  }

  const r=result.reviewRequirements;
  if(
    r.exactAuthorizationPreparationSpecificationRequired!==true
    ||r.exactApprovedEvidenceDecisionRequired!==true
    ||r.exactChannelClassRequired!==true
    ||r.exactBindingRequirementSetRequired!==true
    ||r.exactAuthorizationMaterialClassSetRequired!==true
    ||r.boundedBindingScopeReviewRequired!==true
    ||r.rollbackUnbindRequirementReviewRequired!==true
    ||r.postBindingVerificationRequirementReviewRequired!==true
    ||r.channelSpecificAuthorizationReviewRequired!==true
    ||r.explicitHumanDecisionRequired!==true
    ||r.noAuthorizationGrantInference!==true
    ||r.noCredentialActivationInference!==true
    ||r.noBindingExecutionInference!==true
    ||r.noSendAuthorizationInference!==true
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_review_unsafe_requirements",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactDeliveryBindingAuthorizationPreparationSpecificationRequired!==true
    ||s.exactHumanDeliveryBindingEvidenceDecisionRequired!==true
    ||s.exactChannelClassFrozen!==true
    ||s.exactBindingRequirementSetFrozen!==true
    ||s.exactAuthorizationMaterialClassSetFrozen!==true
    ||s.humanDeliveryBindingAuthorizationReviewRequired!==true
    ||s.deliveryBindingAuthorizationReviewPreparationOnly!==true
    ||s.deliveryBindingAuthorizationDecisionRecorded!==false
    ||s.deliveryBindingAuthorizationApproved!==false
    ||s.separateOperationalAuthorizationEligibilityGranted!==false
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
      "ugp_outreach_delivery_binding_authorization_review_unsafe_semantics",
    );
  }

  const expected=
    buildAuthorityOutreachDeliveryBindingAuthorizationReviewSpecification(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_review_integrity_mismatch",
    );
  }
}
