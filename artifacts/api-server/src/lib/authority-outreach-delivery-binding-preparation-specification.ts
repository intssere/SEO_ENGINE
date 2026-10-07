import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachHumanDeliverabilityEvidenceDecisionIntegrity,
  type AuthorityOutreachHumanDeliverabilityEvidenceDecisionRecord,
} from "./authority-outreach-human-deliverability-evidence-decision.js";
import type {
  AuthorityOutreachPolicyConsentReviewContactPoint,
} from "./authority-outreach-policy-consent-review-specification.js";

export const UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_PREPARATION_SPEC_VERSION =
  "ugp-10-23-delivery-binding-preparation-specification-v1" as const;

export type AuthorityOutreachDeliveryBindingChannelClass =
  | "email_delivery_binding"
  | "web_contact_form_submission_binding";

export type AuthorityOutreachDeliveryBindingRequirementClass =
  | "sender_identity_required"
  | "sender_mailbox_binding_required"
  | "email_delivery_provider_binding_required"
  | "provider_capability_class_required"
  | "future_provider_credential_reference_required"
  | "submission_actor_identity_required"
  | "web_contact_form_target_binding_required"
  | "https_submission_capability_required"
  | "future_submission_mechanism_reference_required";

export type AuthorityOutreachDeliveryBindingPreparationRequest = Readonly<{
  deliverabilityEvidenceDecisionFingerprint: string;
  deliverabilityEvidenceReviewSpecFingerprint: string;
  deliverabilityEvidenceFingerprint: string;
  selectedContactPointFingerprint: string;
  selectedRoleCandidateFingerprint: string;
  candidateFingerprint: string;
}>;

export type AuthorityOutreachHumanDeliverabilityEvidenceDecisionIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachHumanDeliverabilityEvidenceDecisionIntegrity
  >[1];

export type AuthorityOutreachDeliveryBindingPreparationSpecification =
  Readonly<{
    version:
      typeof UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_PREPARATION_SPEC_VERSION;
    deliveryBindingPreparationSpecId: string;
    deliveryBindingPreparationSpecFingerprint: string;
    deliverabilityEvidenceDecisionId: string;
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
    selectedContactPoint:
      AuthorityOutreachPolicyConsentReviewContactPoint;
    selectedContactPointFingerprint: string;
    evidenceDisposition: "deliverability_evidence_supporting";
    channelClass: AuthorityOutreachDeliveryBindingChannelClass;
    futureBindingRequirements:
      readonly AuthorityOutreachDeliveryBindingRequirementClass[];
    preparationPolicy: Readonly<{
      exactApprovedDeliverabilityDecisionRequired: true;
      exactSupportingEvidenceDispositionRequired: true;
      exactSelectedContactPointRequired: true;
      publicBusinessContactOnly: true;
      channelSpecificRequirementsRequired: true;
      liveProviderIdentifierAllowed: false;
      senderMailboxIdentifierAllowed: false;
      providerCredentialValueAllowed: false;
      providerCredentialReferenceValueAllowed: false;
      oauthTokenValueAllowed: false;
      providerSecretValueAllowed: false;
      bindingExecutionAllowed: false;
      mailboxAccessAllowed: false;
      webSubmissionExecutionAllowed: false;
      messageTransmissionAllowed: false;
    }>;
    resultingState: "delivery_binding_preparation_spec_ready";
    semantics: Readonly<{
      deterministic: true;
      exactHumanDeliverabilityEvidenceDecisionRequired: true;
      exactDeliverabilityEvidenceRequired: true;
      exactSelectedContactPointRequired: true;
      exactEvidenceDispositionRequired: true;
      deliveryBindingPreparationSpecificationOnly: true;
      deliveryBindingPreparationSpecificationBuilt: true;
      selectedContactPointFrozen: true;
      channelSpecificRequirementsFrozen: true;
      providerMailboxBindingPreparationExecuted: false;
      providerBindingAuthorized: false;
      providerBindingPerformed: false;
      mailboxBindingAuthorized: false;
      mailboxBindingPerformed: false;
      mailboxAccessAuthorized: false;
      mailboxProbeAuthorized: false;
      mailboxProbePerformed: false;
      providerCredentialIncluded: false;
      providerCredentialReferenceIncluded: false;
      providerCredentialActivationAuthorized: false;
      liveProviderIdentifierIncluded: false;
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

const PREPARATION_POLICY=Object.freeze({
  exactApprovedDeliverabilityDecisionRequired:true as const,
  exactSupportingEvidenceDispositionRequired:true as const,
  exactSelectedContactPointRequired:true as const,
  publicBusinessContactOnly:true as const,
  channelSpecificRequirementsRequired:true as const,
  liveProviderIdentifierAllowed:false as const,
  senderMailboxIdentifierAllowed:false as const,
  providerCredentialValueAllowed:false as const,
  providerCredentialReferenceValueAllowed:false as const,
  oauthTokenValueAllowed:false as const,
  providerSecretValueAllowed:false as const,
  bindingExecutionAllowed:false as const,
  mailboxAccessAllowed:false as const,
  webSubmissionExecutionAllowed:false as const,
  messageTransmissionAllowed:false as const,
});

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactHumanDeliverabilityEvidenceDecisionRequired:true as const,
  exactDeliverabilityEvidenceRequired:true as const,
  exactSelectedContactPointRequired:true as const,
  exactEvidenceDispositionRequired:true as const,
  deliveryBindingPreparationSpecificationOnly:true as const,
  deliveryBindingPreparationSpecificationBuilt:true as const,
  selectedContactPointFrozen:true as const,
  channelSpecificRequirementsFrozen:true as const,
  providerMailboxBindingPreparationExecuted:false as const,
  providerBindingAuthorized:false as const,
  providerBindingPerformed:false as const,
  mailboxBindingAuthorized:false as const,
  mailboxBindingPerformed:false as const,
  mailboxAccessAuthorized:false as const,
  mailboxProbeAuthorized:false as const,
  mailboxProbePerformed:false as const,
  providerCredentialIncluded:false as const,
  providerCredentialReferenceIncluded:false as const,
  providerCredentialActivationAuthorized:false as const,
  liveProviderIdentifierIncluded:false as const,
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
      "ugp_outreach_delivery_binding_preparation_invalid_"+field,
    );
  }
  return value;
}

function selectedContactPointFromDecisionInput(
  input:AuthorityOutreachHumanDeliverabilityEvidenceDecisionIntegrityInput,
):AuthorityOutreachPolicyConsentReviewContactPoint{
  const point=
    input.deliverabilityEvidenceReviewSpecificationInput
      .deliverabilityEvidenceInput
      .deliverabilityPreparation
      .selectedContactPoint;
  return Object.freeze({...point});
}

function channelRequirements(
  contactPoint:AuthorityOutreachPolicyConsentReviewContactPoint,
):Readonly<{
  channelClass:AuthorityOutreachDeliveryBindingChannelClass;
  requirements:readonly AuthorityOutreachDeliveryBindingRequirementClass[];
}>{
  if(contactPoint.contactPointType==="email_address"){
    return Object.freeze({
      channelClass:"email_delivery_binding" as const,
      requirements:Object.freeze([
        "sender_identity_required",
        "sender_mailbox_binding_required",
        "email_delivery_provider_binding_required",
        "provider_capability_class_required",
        "future_provider_credential_reference_required",
      ] as const),
    });
  }
  if(contactPoint.contactPointType==="web_contact_form"){
    return Object.freeze({
      channelClass:"web_contact_form_submission_binding" as const,
      requirements:Object.freeze([
        "submission_actor_identity_required",
        "web_contact_form_target_binding_required",
        "https_submission_capability_required",
        "future_submission_mechanism_reference_required",
      ] as const),
    });
  }
  throw new Error(
    "ugp_outreach_delivery_binding_preparation_contact_point_type_invalid",
  );
}

export function buildAuthorityOutreachDeliveryBindingPreparationSpecification(
  input:Readonly<{
    deliverabilityEvidenceDecision:
      AuthorityOutreachHumanDeliverabilityEvidenceDecisionRecord;
    deliverabilityEvidenceDecisionInput:
      AuthorityOutreachHumanDeliverabilityEvidenceDecisionIntegrityInput;
    preparationRequest:AuthorityOutreachDeliveryBindingPreparationRequest;
  }>,
):AuthorityOutreachDeliveryBindingPreparationSpecification{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_delivery_binding_preparation_invalid_input",
    );
  }

  assertAuthorityOutreachHumanDeliverabilityEvidenceDecisionIntegrity(
    input.deliverabilityEvidenceDecision,
    input.deliverabilityEvidenceDecisionInput,
  );

  const decision=input.deliverabilityEvidenceDecision;
  if(
    decision.decision!=="approve_for_provider_mailbox_binding_preparation"
    ||decision.resultingState!=="provider_mailbox_binding_preparation_eligible"
    ||decision.evidenceDisposition!=="deliverability_evidence_supporting"
    ||decision.semantics.eligibilityOnly!==true
    ||decision.semantics.deliverabilityEvidenceApprovalGranted!==true
    ||decision.semantics
      .providerMailboxBindingPreparationEligibilityGranted!==true
    ||decision.semantics.providerMailboxBindingPreparationExecuted!==false
    ||decision.semantics.providerBindingAuthorized!==false
    ||decision.semantics.mailboxBindingAuthorized!==false
    ||decision.semantics.providerCredentialIncluded!==false
    ||decision.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_preparation_eligible_decision_required",
    );
  }

  const request=input.preparationRequest;
  const decisionFingerprint=fingerprint(
    request.deliverabilityEvidenceDecisionFingerprint,
    "deliverability_evidence_decision_fingerprint",
  );
  const reviewSpecFingerprint=fingerprint(
    request.deliverabilityEvidenceReviewSpecFingerprint,
    "deliverability_evidence_review_spec_fingerprint",
  );
  const evidenceFingerprint=fingerprint(
    request.deliverabilityEvidenceFingerprint,
    "deliverability_evidence_fingerprint",
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
    decisionFingerprint!==decision.deliverabilityEvidenceDecisionFingerprint
    ||reviewSpecFingerprint!==decision.deliverabilityEvidenceReviewSpecFingerprint
    ||evidenceFingerprint!==decision.deliverabilityEvidenceFingerprint
    ||selectedContactPointFingerprint!==decision.selectedContactPointFingerprint
    ||selectedRoleCandidateFingerprint
      !==decision.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==decision.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_preparation_stale_lineage",
    );
  }

  const selectedContactPoint=selectedContactPointFromDecisionInput(
    input.deliverabilityEvidenceDecisionInput,
  );
  if(
    selectedContactPoint.contactPointFingerprint
      !==decision.selectedContactPointFingerprint
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_preparation_contact_point_lineage_mismatch",
    );
  }

  const channel=channelRequirements(selectedContactPoint);

  const base={
    version:
      UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_PREPARATION_SPEC_VERSION,
    deliverabilityEvidenceDecisionId:decision.deliverabilityEvidenceDecisionId,
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
    deliveryPreparationFingerprint:
      decision.deliveryPreparationFingerprint,
    sendReviewFingerprint:decision.sendReviewFingerprint,
    qualityGateFingerprint:decision.qualityGateFingerprint,
    requestId:decision.requestId,
    requestFingerprint:decision.requestFingerprint,
    candidateFingerprint:decision.candidateFingerprint,
    mechanicalValidationFingerprint:
      decision.mechanicalValidationFingerprint,
    prospectFingerprint:decision.prospectFingerprint,
    opportunityFingerprint:decision.opportunityFingerprint,
    approvalReviewFingerprint:decision.approvalReviewFingerprint,
    sourceDomain:decision.sourceDomain,
    sourceUrl:decision.sourceUrl,
    targetDomain:decision.targetDomain,
    targetUrl:decision.targetUrl,
    selectedRoleCandidateFingerprint:
      decision.selectedRoleCandidateFingerprint,
    selectedContactPoint,
    selectedContactPointFingerprint:
      decision.selectedContactPointFingerprint,
    evidenceDisposition:"deliverability_evidence_supporting" as const,
    channelClass:channel.channelClass,
    futureBindingRequirements:channel.requirements,
    preparationPolicy:PREPARATION_POLICY,
    resultingState:"delivery_binding_preparation_spec_ready" as const,
    semantics:SEMANTICS,
  };

  const deliveryBindingPreparationSpecFingerprint=hash({
    purpose:"ugp_authority_outreach_delivery_binding_preparation_specification",
    ...base,
  });

  return Object.freeze({
    ...base,
    deliveryBindingPreparationSpecId:
      "uaodbps-"+deliveryBindingPreparationSpecFingerprint.slice(0,24),
    deliveryBindingPreparationSpecFingerprint,
  });
}

export function assertAuthorityOutreachDeliveryBindingPreparationSpecificationIntegrity(
  result:AuthorityOutreachDeliveryBindingPreparationSpecification,
  input:Readonly<{
    deliverabilityEvidenceDecision:
      AuthorityOutreachHumanDeliverabilityEvidenceDecisionRecord;
    deliverabilityEvidenceDecisionInput:
      AuthorityOutreachHumanDeliverabilityEvidenceDecisionIntegrityInput;
    preparationRequest:AuthorityOutreachDeliveryBindingPreparationRequest;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_DELIVERY_BINDING_PREPARATION_SPEC_VERSION
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_preparation_version_invalid",
    );
  }

  const p=result.preparationPolicy;
  if(
    p.exactApprovedDeliverabilityDecisionRequired!==true
    ||p.exactSupportingEvidenceDispositionRequired!==true
    ||p.exactSelectedContactPointRequired!==true
    ||p.publicBusinessContactOnly!==true
    ||p.channelSpecificRequirementsRequired!==true
    ||p.liveProviderIdentifierAllowed!==false
    ||p.senderMailboxIdentifierAllowed!==false
    ||p.providerCredentialValueAllowed!==false
    ||p.providerCredentialReferenceValueAllowed!==false
    ||p.oauthTokenValueAllowed!==false
    ||p.providerSecretValueAllowed!==false
    ||p.bindingExecutionAllowed!==false
    ||p.mailboxAccessAllowed!==false
    ||p.webSubmissionExecutionAllowed!==false
    ||p.messageTransmissionAllowed!==false
  ){
    throw new Error(
      "ugp_outreach_delivery_binding_preparation_unsafe_policy",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactHumanDeliverabilityEvidenceDecisionRequired!==true
    ||s.exactDeliverabilityEvidenceRequired!==true
    ||s.exactSelectedContactPointRequired!==true
    ||s.exactEvidenceDispositionRequired!==true
    ||s.deliveryBindingPreparationSpecificationOnly!==true
    ||s.deliveryBindingPreparationSpecificationBuilt!==true
    ||s.selectedContactPointFrozen!==true
    ||s.channelSpecificRequirementsFrozen!==true
    ||s.providerMailboxBindingPreparationExecuted!==false
    ||s.providerBindingAuthorized!==false
    ||s.providerBindingPerformed!==false
    ||s.mailboxBindingAuthorized!==false
    ||s.mailboxBindingPerformed!==false
    ||s.mailboxAccessAuthorized!==false
    ||s.mailboxProbeAuthorized!==false
    ||s.mailboxProbePerformed!==false
    ||s.providerCredentialIncluded!==false
    ||s.providerCredentialReferenceIncluded!==false
    ||s.providerCredentialActivationAuthorized!==false
    ||s.liveProviderIdentifierIncluded!==false
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
      "ugp_outreach_delivery_binding_preparation_unsafe_semantics",
    );
  }

  const expected=
    buildAuthorityOutreachDeliveryBindingPreparationSpecification(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_delivery_binding_preparation_integrity_mismatch",
    );
  }
}
