import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachPolicyConsentReviewSpecIntegrity,
  type AuthorityOutreachPolicyConsentFutureDecision,
  type AuthorityOutreachPolicyConsentFutureReasonCode,
  type AuthorityOutreachPolicyConsentReviewContactPoint,
  type AuthorityOutreachPolicyConsentReviewSpecification,
} from "./authority-outreach-policy-consent-review-specification.js";

export const UGP_AUTHORITY_OUTREACH_HUMAN_POLICY_CONSENT_DECISION_VERSION =
  "ugp-10-18-human-policy-consent-decision-v1" as const;

export type AuthorityOutreachHumanPolicyConsentDecisionRequest = Readonly<{
  policyConsentReviewSpecFingerprint: string;
  selectedRoleCandidateFingerprint: string;
  candidateFingerprint: string;
  decision: AuthorityOutreachPolicyConsentFutureDecision;
  reasonCode: AuthorityOutreachPolicyConsentFutureReasonCode;
  selectedContactPointFingerprint: string | null;
  confirmation: string;
}>;

export type AuthorityOutreachPolicyConsentReviewSpecIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachPolicyConsentReviewSpecIntegrity
  >[1];

export type AuthorityOutreachHumanPolicyConsentDecisionRecord = Readonly<{
  version:
    typeof UGP_AUTHORITY_OUTREACH_HUMAN_POLICY_CONSENT_DECISION_VERSION;
  policyConsentDecisionId: string;
  policyConsentDecisionFingerprint: string;
  decisionRequestFingerprint: string;
  policyConsentReviewSpecId: string;
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
  decision: AuthorityOutreachPolicyConsentFutureDecision;
  reasonCode: AuthorityOutreachPolicyConsentFutureReasonCode;
  selectedContactPoint:
    | AuthorityOutreachPolicyConsentReviewContactPoint
    | null;
  selectedContactPointFingerprint: string | null;
  reviewerId: string;
  reviewedAt: string;
  resultingState:
    | "deliverability_verification_preparation_eligible"
    | "policy_consent_rejected"
    | "policy_consent_deferred";
  semantics: Readonly<{
    deterministic: true;
    humanDecision: true;
    exactPolicyConsentReviewSpecificationRequired: true;
    exactContactPointMembershipRequired: true;
    explicitConfirmationRequired: true;
    eligibilityOnly: true;
    policyConsentDecisionRecorded: true;
    policyConsentApprovalGranted: boolean;
    humanContactPointSelectionPerformed: boolean;
    automatedContactPointSelectionAuthorized: false;
    consentInferred: false;
    legalComplianceDeterminationPerformed: false;
    legalComplianceGuaranteed: false;
    deliverabilityVerificationPreparationEligibilityGranted: boolean;
    deliverabilityVerificationPreparationExecuted: false;
    deliverabilityVerificationAuthorized: false;
    deliverabilityVerificationPerformed: false;
    verificationProviderCallAuthorized: false;
    mailboxProbeAuthorized: false;
    mailboxProbePerformed: false;
    mailboxAccessAuthorized: false;
    providerBindingAuthorized: false;
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
      "ugp_outreach_human_policy_consent_decision_invalid_"+field,
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
      "ugp_outreach_human_policy_consent_decision_invalid_reviewer",
    );
  }
  return value;
}

function canonicalTimestamp(value:unknown):string{
  if(typeof value!=="string"){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_invalid_reviewed_at",
    );
  }
  const millis=Date.parse(value);
  if(!Number.isFinite(millis)){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_invalid_reviewed_at",
    );
  }
  const canonical=new Date(millis).toISOString();
  if(canonical!==value){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_invalid_reviewed_at",
    );
  }
  return canonical;
}

function assertDecisionReason(
  decision:AuthorityOutreachPolicyConsentFutureDecision,
  reasonCode:AuthorityOutreachPolicyConsentFutureReasonCode,
):void{
  if(decision==="approve_for_deliverability_verification_preparation"){
    if(reasonCode!=="policy_and_context_review_sufficient"){
      throw new Error(
        "ugp_outreach_human_policy_consent_decision_approval_reason_invalid",
      );
    }
    return;
  }

  if(reasonCode==="policy_and_context_review_sufficient"){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_nonapproval_reason_invalid",
    );
  }

  if(
    decision==="defer_policy_consent_review"
    &&![
      "needs_more_policy_context",
      "evidence_needs_refresh",
      "jurisdiction_needs_review",
    ].includes(reasonCode)
  ){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_defer_reason_invalid",
    );
  }

  if(
    decision==="reject_contact_point_set"
    &&![
      "channel_not_appropriate",
      "prior_opt_out_or_suppression_concern",
      "relationship_or_purpose_mismatch",
      "jurisdiction_or_policy_concern",
      "public_business_basis_insufficient",
    ].includes(reasonCode)
  ){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_reject_reason_invalid",
    );
  }
}

function freezeContactPoint(
  contactPoint:AuthorityOutreachPolicyConsentReviewContactPoint,
):AuthorityOutreachPolicyConsentReviewContactPoint{
  return Object.freeze({...contactPoint});
}

function selectedContactPoint(
  specification:AuthorityOutreachPolicyConsentReviewSpecification,
  request:AuthorityOutreachHumanPolicyConsentDecisionRequest,
):AuthorityOutreachPolicyConsentReviewContactPoint|null{
  if(
    request.decision
      ==="approve_for_deliverability_verification_preparation"
  ){
    const selectedFingerprint=fingerprint(
      request.selectedContactPointFingerprint,
      "selected_contact_point_fingerprint",
    );
    const contactPoint=specification.reviewContactPoints.find(
      item=>item.contactPointFingerprint===selectedFingerprint,
    );
    if(!contactPoint){
      throw new Error(
        "ugp_outreach_human_policy_consent_decision_contact_point_not_in_review_set",
      );
    }
    return freezeContactPoint(contactPoint);
  }

  if(request.selectedContactPointFingerprint!==null){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_nonapproval_contact_point_forbidden",
    );
  }
  return null;
}

function expectedConfirmation(
  request:AuthorityOutreachHumanPolicyConsentDecisionRequest,
):string{
  return [
    "REVIEW_OUTREACH_POLICY_CONSENT",
    request.decision,
    request.selectedContactPointFingerprint??"NONE",
    request.policyConsentReviewSpecFingerprint,
    request.selectedRoleCandidateFingerprint,
    request.candidateFingerprint,
  ].join(":");
}

export function authorityOutreachHumanPolicyConsentDecisionRequestFingerprint(
  request:AuthorityOutreachHumanPolicyConsentDecisionRequest,
  reviewer:string,
):string{
  fingerprint(
    request.policyConsentReviewSpecFingerprint,
    "policy_consent_review_spec_fingerprint",
  );
  fingerprint(
    request.selectedRoleCandidateFingerprint,
    "selected_role_candidate_fingerprint",
  );
  fingerprint(request.candidateFingerprint,"candidate_fingerprint");

  if(
    request.decision
      !=="approve_for_deliverability_verification_preparation"
    &&request.decision!=="reject_contact_point_set"
    &&request.decision!=="defer_policy_consent_review"
  ){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_invalid_decision",
    );
  }
  assertDecisionReason(request.decision,request.reasonCode);

  const normalizedReviewer=reviewerId(reviewer);
  if(request.confirmation!==expectedConfirmation(request)){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_explicit_confirmation_required",
    );
  }

  return hash({
    purpose:"ugp_authority_outreach_human_policy_consent_decision_request",
    version:UGP_AUTHORITY_OUTREACH_HUMAN_POLICY_CONSENT_DECISION_VERSION,
    policyConsentReviewSpecFingerprint:
      request.policyConsentReviewSpecFingerprint,
    selectedRoleCandidateFingerprint:
      request.selectedRoleCandidateFingerprint,
    candidateFingerprint:request.candidateFingerprint,
    decision:request.decision,
    reasonCode:request.reasonCode,
    selectedContactPointFingerprint:
      request.selectedContactPointFingerprint,
    reviewerId:normalizedReviewer,
  });
}

export function prepareAuthorityOutreachHumanPolicyConsentDecision(
  input:Readonly<{
    policyConsentReviewSpecification:
      AuthorityOutreachPolicyConsentReviewSpecification;
    policyConsentReviewSpecificationInput:
      AuthorityOutreachPolicyConsentReviewSpecIntegrityInput;
    decisionRequest:AuthorityOutreachHumanPolicyConsentDecisionRequest;
    reviewerId:string;
    reviewedAt:string;
  }>,
):AuthorityOutreachHumanPolicyConsentDecisionRecord{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_invalid_input",
    );
  }

  assertAuthorityOutreachPolicyConsentReviewSpecIntegrity(
    input.policyConsentReviewSpecification,
    input.policyConsentReviewSpecificationInput,
  );

  const specification=input.policyConsentReviewSpecification;
  if(
    specification.resultingState!=="policy_consent_review_ready"
    ||specification.contactPointCount<1
    ||specification.reviewContactPoints.length!==specification.contactPointCount
    ||specification.semantics.humanPolicyConsentReviewRequired!==true
    ||specification.semantics.policyConsentDecisionRecorded!==false
    ||specification.semantics.policyConsentApprovalGranted!==false
    ||specification.semantics.deliverabilityVerificationAuthorized!==false
    ||specification.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_review_spec_required",
    );
  }

  const request=input.decisionRequest;
  const policyConsentReviewSpecFingerprint=fingerprint(
    request.policyConsentReviewSpecFingerprint,
    "policy_consent_review_spec_fingerprint",
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
    policyConsentReviewSpecFingerprint
      !==specification.policyConsentReviewSpecFingerprint
    ||selectedRoleCandidateFingerprint
      !==specification.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==specification.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_stale_lineage",
    );
  }

  if(!specification.allowedFutureDecisions.includes(request.decision)){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_not_allowed",
    );
  }
  if(!specification.allowedFutureReasonCodes.includes(request.reasonCode)){
    throw new Error(
      "ugp_outreach_human_policy_consent_reason_not_allowed",
    );
  }

  const normalizedReviewer=reviewerId(input.reviewerId);
  const reviewedAt=canonicalTimestamp(input.reviewedAt);
  const approvedContactPoint=selectedContactPoint(specification,request);
  const decisionRequestFingerprint=
    authorityOutreachHumanPolicyConsentDecisionRequestFingerprint(
      request,
      normalizedReviewer,
    );

  const approved=
    request.decision
      ==="approve_for_deliverability_verification_preparation";

  const resultingState=
    approved
      ?"deliverability_verification_preparation_eligible" as const
      :request.decision==="reject_contact_point_set"
        ?"policy_consent_rejected" as const
        :"policy_consent_deferred" as const;

  const semantics=Object.freeze({
    deterministic:true as const,
    humanDecision:true as const,
    exactPolicyConsentReviewSpecificationRequired:true as const,
    exactContactPointMembershipRequired:true as const,
    explicitConfirmationRequired:true as const,
    eligibilityOnly:true as const,
    policyConsentDecisionRecorded:true as const,
    policyConsentApprovalGranted:approved,
    humanContactPointSelectionPerformed:approved,
    automatedContactPointSelectionAuthorized:false as const,
    consentInferred:false as const,
    legalComplianceDeterminationPerformed:false as const,
    legalComplianceGuaranteed:false as const,
    deliverabilityVerificationPreparationEligibilityGranted:approved,
    deliverabilityVerificationPreparationExecuted:false as const,
    deliverabilityVerificationAuthorized:false as const,
    deliverabilityVerificationPerformed:false as const,
    verificationProviderCallAuthorized:false as const,
    mailboxProbeAuthorized:false as const,
    mailboxProbePerformed:false as const,
    mailboxAccessAuthorized:false as const,
    providerBindingAuthorized:false as const,
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
    version:UGP_AUTHORITY_OUTREACH_HUMAN_POLICY_CONSENT_DECISION_VERSION,
    decisionRequestFingerprint,
    policyConsentReviewSpecId:specification.policyConsentReviewSpecId,
    policyConsentReviewSpecFingerprint:
      specification.policyConsentReviewSpecFingerprint,
    contactPointEvidenceFingerprint:
      specification.contactPointEvidenceFingerprint,
    contactVerificationSpecFingerprint:
      specification.contactVerificationSpecFingerprint,
    selectionDecisionFingerprint:specification.selectionDecisionFingerprint,
    selectionReviewSpecFingerprint:specification.selectionReviewSpecFingerprint,
    researchEvidenceFingerprint:specification.researchEvidenceFingerprint,
    researchSpecFingerprint:specification.researchSpecFingerprint,
    deliveryPreparationFingerprint:specification.deliveryPreparationFingerprint,
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
    decision:request.decision,
    reasonCode:request.reasonCode,
    selectedContactPoint:approvedContactPoint,
    selectedContactPointFingerprint:
      approvedContactPoint?.contactPointFingerprint??null,
    reviewerId:normalizedReviewer,
    reviewedAt,
    resultingState,
    semantics,
  };

  const policyConsentDecisionFingerprint=hash({
    purpose:"ugp_authority_outreach_human_policy_consent_decision",
    ...base,
  });

  return Object.freeze({
    ...base,
    policyConsentDecisionId:
      "uaopcd-"+policyConsentDecisionFingerprint.slice(0,24),
    policyConsentDecisionFingerprint,
  });
}

export function assertAuthorityOutreachHumanPolicyConsentDecisionIntegrity(
  result:AuthorityOutreachHumanPolicyConsentDecisionRecord,
  input:Readonly<{
    policyConsentReviewSpecification:
      AuthorityOutreachPolicyConsentReviewSpecification;
    policyConsentReviewSpecificationInput:
      AuthorityOutreachPolicyConsentReviewSpecIntegrityInput;
    decisionRequest:AuthorityOutreachHumanPolicyConsentDecisionRequest;
    reviewerId:string;
    reviewedAt:string;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_HUMAN_POLICY_CONSENT_DECISION_VERSION
  ){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_version_invalid",
    );
  }

  const approved=
    result.decision
      ==="approve_for_deliverability_verification_preparation";
  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.humanDecision!==true
    ||s.exactPolicyConsentReviewSpecificationRequired!==true
    ||s.exactContactPointMembershipRequired!==true
    ||s.explicitConfirmationRequired!==true
    ||s.eligibilityOnly!==true
    ||s.policyConsentDecisionRecorded!==true
    ||s.policyConsentApprovalGranted!==approved
    ||s.humanContactPointSelectionPerformed!==approved
    ||s.automatedContactPointSelectionAuthorized!==false
    ||s.consentInferred!==false
    ||s.legalComplianceDeterminationPerformed!==false
    ||s.legalComplianceGuaranteed!==false
    ||s.deliverabilityVerificationPreparationEligibilityGranted!==approved
    ||s.deliverabilityVerificationPreparationExecuted!==false
    ||s.deliverabilityVerificationAuthorized!==false
    ||s.deliverabilityVerificationPerformed!==false
    ||s.verificationProviderCallAuthorized!==false
    ||s.mailboxProbeAuthorized!==false
    ||s.mailboxProbePerformed!==false
    ||s.mailboxAccessAuthorized!==false
    ||s.providerBindingAuthorized!==false
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
      "ugp_outreach_human_policy_consent_decision_unsafe_semantics",
    );
  }

  const expected=prepareAuthorityOutreachHumanPolicyConsentDecision(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_human_policy_consent_decision_integrity_mismatch",
    );
  }
}
