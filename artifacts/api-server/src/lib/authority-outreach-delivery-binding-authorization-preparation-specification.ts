import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachHumanDeliveryBindingEvidenceDecisionIntegrity,
  type AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRecord,
} from "./authority-outreach-human-delivery-binding-evidence-decision.js";
import type {
  AuthorityOutreachDeliveryBindingChannelClass,
  AuthorityOutreachDeliveryBindingRequirementClass,
} from "./authority-outreach-delivery-binding-preparation-specification.js";

export const UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_AUTHORIZATION_PREPARATION_SPEC_VERSION =
  "ugp-10-27-delivery-binding-authorization-preparation-specification-v1" as const;

export type AuthorityOutreachDeliveryBindingAuthorizationMaterialClass =
  | "exact_human_binding_evidence_decision_required"
  | "bounded_binding_scope_authorization_required"
  | "rollback_unbind_plan_required"
  | "post_binding_verification_plan_required"
  | "sender_identity_binding_authorization_required"
  | "sender_mailbox_binding_authorization_required"
  | "email_delivery_provider_binding_authorization_required"
  | "provider_credential_activation_authorization_required"
  | "submission_actor_binding_authorization_required"
  | "web_contact_form_target_binding_authorization_required"
  | "submission_mechanism_binding_authorization_required"
  | "web_submission_capability_activation_authorization_required";

export type AuthorityOutreachDeliveryBindingAuthorizationPreparationRequest =
  Readonly<{
    deliveryBindingEvidenceDecisionFingerprint:string;
    deliveryBindingEvidenceReviewSpecFingerprint:string;
    deliveryBindingEvidenceFingerprint:string;
    deliveryBindingPreparationSpecFingerprint:string;
    selectedContactPointFingerprint:string;
    selectedRoleCandidateFingerprint:string;
    candidateFingerprint:string;
  }>;

export type AuthorityOutreachHumanDeliveryBindingEvidenceDecisionIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachHumanDeliveryBindingEvidenceDecisionIntegrity
  >[1];

export type AuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification =
  Readonly<{
    version:
      typeof UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_AUTHORIZATION_PREPARATION_SPEC_VERSION;
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
    channelClass:AuthorityOutreachDeliveryBindingChannelClass;
    frozenBindingRequirements:
      readonly AuthorityOutreachDeliveryBindingRequirementClass[];
    evidenceDisposition:"delivery_binding_evidence_supporting";
    approvedDecision:
      "approve_for_delivery_binding_authorization_preparation";
    approvedReasonCode:
      "evidence_sufficient_for_binding_authorization_preparation";
    evidenceDecisionReviewerId:string;
    evidenceDecisionReviewedAt:string;
    futureAuthorizationMaterialClasses:
      readonly AuthorityOutreachDeliveryBindingAuthorizationMaterialClass[];
    preparationPolicy:Readonly<{
      exactApprovedHumanDecisionRequired:true;
      exactSupportingEvidenceDispositionRequired:true;
      exactChannelClassRequired:true;
      exactBindingRequirementSetRequired:true;
      channelSpecificAuthorizationMaterialRequired:true;
      liveProviderIdentifierAllowed:false;
      senderMailboxIdentifierAllowed:false;
      providerCredentialValueAllowed:false;
      providerCredentialReferenceValueAllowed:false;
      oauthTokenValueAllowed:false;
      providerSecretValueAllowed:false;
      submissionMechanismReferenceValueAllowed:false;
      authorizationGrantAllowed:false;
      credentialActivationAllowed:false;
      bindingExecutionAllowed:false;
      mailboxAccessAllowed:false;
      mailboxProbeAllowed:false;
      webSubmissionExecutionAllowed:false;
      messageTransmissionAllowed:false;
      sendJobConstructionAllowed:false;
    }>;
    resultingState:
      "delivery_binding_authorization_preparation_spec_ready";
    semantics:Readonly<{
      deterministic:true;
      exactHumanDeliveryBindingEvidenceDecisionRequired:true;
      exactDeliveryBindingEvidenceReviewSpecificationRequired:true;
      exactDeliveryBindingEvidenceRequired:true;
      exactDeliveryBindingPreparationSpecificationRequired:true;
      exactSelectedContactPointRequired:true;
      exactChannelClassRequired:true;
      exactBindingRequirementSetRequired:true;
      deliveryBindingAuthorizationPreparationSpecificationOnly:true;
      deliveryBindingAuthorizationPreparationSpecificationBuilt:true;
      futureAuthorizationMaterialClassesFrozen:true;
      deliveryBindingAuthorizationPreparationEligibilityConsumed:true;
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

const PREPARATION_POLICY=Object.freeze({
  exactApprovedHumanDecisionRequired:true as const,
  exactSupportingEvidenceDispositionRequired:true as const,
  exactChannelClassRequired:true as const,
  exactBindingRequirementSetRequired:true as const,
  channelSpecificAuthorizationMaterialRequired:true as const,
  liveProviderIdentifierAllowed:false as const,
  senderMailboxIdentifierAllowed:false as const,
  providerCredentialValueAllowed:false as const,
  providerCredentialReferenceValueAllowed:false as const,
  oauthTokenValueAllowed:false as const,
  providerSecretValueAllowed:false as const,
  submissionMechanismReferenceValueAllowed:false as const,
  authorizationGrantAllowed:false as const,
  credentialActivationAllowed:false as const,
  bindingExecutionAllowed:false as const,
  mailboxAccessAllowed:false as const,
  mailboxProbeAllowed:false as const,
  webSubmissionExecutionAllowed:false as const,
  messageTransmissionAllowed:false as const,
  sendJobConstructionAllowed:false as const,
});

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactHumanDeliveryBindingEvidenceDecisionRequired:true as const,
  exactDeliveryBindingEvidenceReviewSpecificationRequired:true as const,
  exactDeliveryBindingEvidenceRequired:true as const,
  exactDeliveryBindingPreparationSpecificationRequired:true as const,
  exactSelectedContactPointRequired:true as const,
  exactChannelClassRequired:true as const,
  exactBindingRequirementSetRequired:true as const,
  deliveryBindingAuthorizationPreparationSpecificationOnly:true as const,
  deliveryBindingAuthorizationPreparationSpecificationBuilt:true as const,
  futureAuthorizationMaterialClassesFrozen:true as const,
  deliveryBindingAuthorizationPreparationEligibilityConsumed:true as const,
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
      "ugp_outreach_delivery_binding_authorization_preparation_invalid_"+field,
    );
  }
  return value;
}

function authorizationMaterialClasses(
  channelClass:AuthorityOutreachDeliveryBindingChannelClass,
):readonly AuthorityOutreachDeliveryBindingAuthorizationMaterialClass[]{
  const common=[
    "exact_human_binding_evidence_decision_required",
    "bounded_binding_scope_authorization_required",
    "rollback_unbind_plan_required",
    "post_binding_verification_plan_required",
  ] as const;

  if(channelClass==="email_delivery_binding"){
    return Object.freeze([
      ...common,
      "sender_identity_binding_authorization_required",
      "sender_mailbox_binding_authorization_required",
      "email_delivery_provider_binding_authorization_required",
      "provider_credential_activation_authorization_required",
    ] as const);
  }

  if(channelClass==="web_contact_form_submission_binding"){
    return Object.freeze([
      ...common,
      "submission_actor_binding_authorization_required",
      "web_contact_form_target_binding_authorization_required",
      "submission_mechanism_binding_authorization_required",
      "web_submission_capability_activation_authorization_required",
    ] as const);
  }

  throw new Error(
    "ugp_outreach_delivery_binding_authorization_preparation_channel_invalid",
  );
}

export function buildAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification(
  input:Readonly<{
    deliveryBindingEvidenceDecision:
      AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRecord;
    deliveryBindingEvidenceDecisionInput:
      AuthorityOutreachHumanDeliveryBindingEvidenceDecisionIntegrityInput;
    preparationRequest:
      AuthorityOutreachDeliveryBindingAuthorizationPreparationRequest;
  }>,
):AuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_preparation_invalid_input",
    );
  }

  assertAuthorityOutreachHumanDeliveryBindingEvidenceDecisionIntegrity(
    input.deliveryBindingEvidenceDecision,
    input.deliveryBindingEvidenceDecisionInput,
  );

  const decision=input.deliveryBindingEvidenceDecision;
  if(
    decision.resultingState
      !=="delivery_binding_authorization_preparation_eligible"
    ||decision.decision
      !=="approve_for_delivery_binding_authorization_preparation"
    ||decision.reasonCode
      !=="evidence_sufficient_for_binding_authorization_preparation"
    ||decision.evidenceDisposition
      !=="delivery_binding_evidence_supporting"
    ||decision.semantics.eligibilityOnly!==true
    ||decision.semantics.deliveryBindingEvidenceDecisionRecorded!==true
    ||decision.semantics.deliveryBindingEvidenceApprovalGranted!==true
    ||decision.semantics
      .deliveryBindingAuthorizationPreparationEligibilityGranted!==true
    ||decision.semantics.deliveryBindingAuthorizationPreparationExecuted!==false
    ||decision.semantics.deliveryBindingExecutionAuthorized!==false
    ||decision.semantics.deliveryBindingExecutionPerformed!==false
    ||decision.semantics.providerBindingAuthorized!==false
    ||decision.semantics.mailboxBindingAuthorized!==false
    ||decision.semantics.webSubmissionExecutionAuthorized!==false
    ||decision.semantics.providerCredentialActivationAuthorized!==false
    ||decision.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_preparation_approved_decision_required",
    );
  }

  const request=input.preparationRequest;
  const decisionFingerprint=fingerprint(
    request.deliveryBindingEvidenceDecisionFingerprint,
    "delivery_binding_evidence_decision_fingerprint",
  );
  const reviewSpecFingerprint=fingerprint(
    request.deliveryBindingEvidenceReviewSpecFingerprint,
    "delivery_binding_evidence_review_spec_fingerprint",
  );
  const evidenceFingerprint=fingerprint(
    request.deliveryBindingEvidenceFingerprint,
    "delivery_binding_evidence_fingerprint",
  );
  const preparationSpecFingerprint=fingerprint(
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
    decisionFingerprint!==decision.deliveryBindingEvidenceDecisionFingerprint
    ||reviewSpecFingerprint
      !==decision.deliveryBindingEvidenceReviewSpecFingerprint
    ||evidenceFingerprint!==decision.deliveryBindingEvidenceFingerprint
    ||preparationSpecFingerprint
      !==decision.deliveryBindingPreparationSpecFingerprint
    ||selectedContactPointFingerprint
      !==decision.selectedContactPointFingerprint
    ||selectedRoleCandidateFingerprint
      !==decision.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==decision.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_preparation_stale_lineage",
    );
  }

  const futureAuthorizationMaterialClasses=authorizationMaterialClasses(
    decision.channelClass,
  );

  const base={
    version:
      UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_AUTHORIZATION_PREPARATION_SPEC_VERSION,
    deliveryBindingEvidenceDecisionId:decision.deliveryBindingEvidenceDecisionId,
    deliveryBindingEvidenceDecisionFingerprint:
      decision.deliveryBindingEvidenceDecisionFingerprint,
    deliveryBindingEvidenceReviewSpecFingerprint:
      decision.deliveryBindingEvidenceReviewSpecFingerprint,
    deliveryBindingEvidenceFingerprint:
      decision.deliveryBindingEvidenceFingerprint,
    deliveryBindingPreparationSpecFingerprint:
      decision.deliveryBindingPreparationSpecFingerprint,
    deliverabilityEvidenceDecisionFingerprint:
      decision.deliverabilityEvidenceDecisionFingerprint,
    deliverabilityEvidenceReviewSpecFingerprint:
      decision.deliverabilityEvidenceReviewSpecFingerprint,
    deliverabilityEvidenceFingerprint:
      decision.deliverabilityEvidenceFingerprint,
    deliverabilityPreparationFingerprint:
      decision.deliverabilityPreparationFingerprint,
    policyConsentDecisionFingerprint:
      decision.policyConsentDecisionFingerprint,
    policyConsentReviewSpecFingerprint:
      decision.policyConsentReviewSpecFingerprint,
    contactPointEvidenceFingerprint:
      decision.contactPointEvidenceFingerprint,
    contactVerificationSpecFingerprint:
      decision.contactVerificationSpecFingerprint,
    selectionDecisionFingerprint:decision.selectionDecisionFingerprint,
    selectionReviewSpecFingerprint:decision.selectionReviewSpecFingerprint,
    researchEvidenceFingerprint:decision.researchEvidenceFingerprint,
    researchSpecFingerprint:decision.researchSpecFingerprint,
    deliveryPreparationFingerprint:decision.deliveryPreparationFingerprint,
    sendReviewFingerprint:decision.sendReviewFingerprint,
    qualityGateFingerprint:decision.qualityGateFingerprint,
    requestId:decision.requestId,
    requestFingerprint:decision.requestFingerprint,
    candidateFingerprint:decision.candidateFingerprint,
    mechanicalValidationFingerprint:decision.mechanicalValidationFingerprint,
    prospectFingerprint:decision.prospectFingerprint,
    opportunityFingerprint:decision.opportunityFingerprint,
    approvalReviewFingerprint:decision.approvalReviewFingerprint,
    sourceDomain:decision.sourceDomain,
    sourceUrl:decision.sourceUrl,
    targetDomain:decision.targetDomain,
    targetUrl:decision.targetUrl,
    selectedRoleCandidateFingerprint:
      decision.selectedRoleCandidateFingerprint,
    selectedContactPointFingerprint:
      decision.selectedContactPointFingerprint,
    channelClass:decision.channelClass,
    frozenBindingRequirements:Object.freeze([
      ...decision.frozenBindingRequirements,
    ]),
    evidenceDisposition:
      "delivery_binding_evidence_supporting" as const,
    approvedDecision:
      "approve_for_delivery_binding_authorization_preparation" as const,
    approvedReasonCode:
      "evidence_sufficient_for_binding_authorization_preparation" as const,
    evidenceDecisionReviewerId:decision.reviewerId,
    evidenceDecisionReviewedAt:decision.reviewedAt,
    futureAuthorizationMaterialClasses,
    preparationPolicy:PREPARATION_POLICY,
    resultingState:
      "delivery_binding_authorization_preparation_spec_ready" as const,
    semantics:SEMANTICS,
  };

  const deliveryBindingAuthorizationPreparationSpecFingerprint=hash({
    purpose:
      "ugp_authority_outreach_delivery_binding_authorization_preparation_specification",
    ...base,
  });

  return Object.freeze({
    ...base,
    deliveryBindingAuthorizationPreparationSpecId:
      "uaodbaps-"+deliveryBindingAuthorizationPreparationSpecFingerprint.slice(
        0,
        24,
      ),
    deliveryBindingAuthorizationPreparationSpecFingerprint,
  });
}

export function assertAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecIntegrity(
  result:
    AuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification,
  input:Readonly<{
    deliveryBindingEvidenceDecision:
      AuthorityOutreachHumanDeliveryBindingEvidenceDecisionRecord;
    deliveryBindingEvidenceDecisionInput:
      AuthorityOutreachHumanDeliveryBindingEvidenceDecisionIntegrityInput;
    preparationRequest:
      AuthorityOutreachDeliveryBindingAuthorizationPreparationRequest;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_AUTHORIZATION_PREPARATION_SPEC_VERSION
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_preparation_version_invalid",
    );
  }

  const p=result.preparationPolicy;
  if(
    p.exactApprovedHumanDecisionRequired!==true
    ||p.exactSupportingEvidenceDispositionRequired!==true
    ||p.exactChannelClassRequired!==true
    ||p.exactBindingRequirementSetRequired!==true
    ||p.channelSpecificAuthorizationMaterialRequired!==true
    ||p.liveProviderIdentifierAllowed!==false
    ||p.senderMailboxIdentifierAllowed!==false
    ||p.providerCredentialValueAllowed!==false
    ||p.providerCredentialReferenceValueAllowed!==false
    ||p.oauthTokenValueAllowed!==false
    ||p.providerSecretValueAllowed!==false
    ||p.submissionMechanismReferenceValueAllowed!==false
    ||p.authorizationGrantAllowed!==false
    ||p.credentialActivationAllowed!==false
    ||p.bindingExecutionAllowed!==false
    ||p.mailboxAccessAllowed!==false
    ||p.mailboxProbeAllowed!==false
    ||p.webSubmissionExecutionAllowed!==false
    ||p.messageTransmissionAllowed!==false
    ||p.sendJobConstructionAllowed!==false
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_preparation_unsafe_policy",
    );
  }

  const expectedClasses=authorizationMaterialClasses(result.channelClass);
  if(stableJson(expectedClasses)!==stableJson(result.futureAuthorizationMaterialClasses)){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_preparation_material_classes_invalid",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactHumanDeliveryBindingEvidenceDecisionRequired!==true
    ||s.exactDeliveryBindingEvidenceReviewSpecificationRequired!==true
    ||s.exactDeliveryBindingEvidenceRequired!==true
    ||s.exactDeliveryBindingPreparationSpecificationRequired!==true
    ||s.exactSelectedContactPointRequired!==true
    ||s.exactChannelClassRequired!==true
    ||s.exactBindingRequirementSetRequired!==true
    ||s.deliveryBindingAuthorizationPreparationSpecificationOnly!==true
    ||s.deliveryBindingAuthorizationPreparationSpecificationBuilt!==true
    ||s.futureAuthorizationMaterialClassesFrozen!==true
    ||s.deliveryBindingAuthorizationPreparationEligibilityConsumed!==true
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
      "ugp_outreach_delivery_binding_authorization_preparation_unsafe_semantics",
    );
  }

  const expected=
    buildAuthorityOutreachDeliveryBindingAuthorizationPreparationSpecification(
      input,
    );
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_delivery_binding_authorization_preparation_integrity_mismatch",
    );
  }
}
