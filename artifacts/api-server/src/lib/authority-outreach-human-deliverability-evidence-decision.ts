import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachDeliverabilityEvidenceReviewSpecIntegrity,
  type AuthorityOutreachDeliverabilityEvidenceFutureDecision,
  type AuthorityOutreachDeliverabilityEvidenceFutureReasonCode,
  type AuthorityOutreachDeliverabilityEvidenceReviewSpecification,
} from "./authority-outreach-deliverability-evidence-review-specification.js";
import type {
  AuthorityOutreachDeliverabilityEvidenceDisposition,
} from "./authority-outreach-deliverability-evidence-validation.js";

export const UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERABILITY_EVIDENCE_DECISION_VERSION =
  "ugp-10-22-human-deliverability-evidence-decision-v1" as const;

export type AuthorityOutreachHumanDeliverabilityEvidenceDecisionRequest =
  Readonly<{
    deliverabilityEvidenceReviewSpecFingerprint: string;
    deliverabilityEvidenceFingerprint: string;
    selectedContactPointFingerprint: string;
    selectedRoleCandidateFingerprint: string;
    candidateFingerprint: string;
    decision: AuthorityOutreachDeliverabilityEvidenceFutureDecision;
    reasonCode: AuthorityOutreachDeliverabilityEvidenceFutureReasonCode;
    confirmation: string;
  }>;

export type AuthorityOutreachDeliverabilityEvidenceReviewSpecIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachDeliverabilityEvidenceReviewSpecIntegrity
  >[1];

export type AuthorityOutreachHumanDeliverabilityEvidenceDecisionRecord =
  Readonly<{
    version:
      typeof UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERABILITY_EVIDENCE_DECISION_VERSION;
    deliverabilityEvidenceDecisionId: string;
    deliverabilityEvidenceDecisionFingerprint: string;
    decisionRequestFingerprint: string;
    deliverabilityEvidenceReviewSpecId: string;
    deliverabilityEvidenceReviewSpecFingerprint: string;
    deliverabilityEvidenceId: string;
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
    evidenceDisposition: AuthorityOutreachDeliverabilityEvidenceDisposition;
    decision: AuthorityOutreachDeliverabilityEvidenceFutureDecision;
    reasonCode: AuthorityOutreachDeliverabilityEvidenceFutureReasonCode;
    reviewerId: string;
    reviewedAt: string;
    resultingState:
      | "provider_mailbox_binding_preparation_eligible"
      | "deliverability_evidence_rejected"
      | "deliverability_evidence_deferred";
    semantics: Readonly<{
      deterministic: true;
      humanDecision: true;
      exactDeliverabilityEvidenceReviewSpecificationRequired: true;
      exactDeliverabilityEvidenceRequired: true;
      exactSelectedContactPointRequired: true;
      exactEvidenceDispositionRequired: true;
      explicitConfirmationRequired: true;
      eligibilityOnly: true;
      deliverabilityEvidenceDecisionRecorded: true;
      deliverabilityEvidenceApprovalGranted: boolean;
      providerMailboxBindingPreparationEligibilityGranted: boolean;
      providerMailboxBindingPreparationExecuted: false;
      providerBindingAuthorized: false;
      providerBindingPerformed: false;
      mailboxBindingAuthorized: false;
      mailboxBindingPerformed: false;
      mailboxAccessAuthorized: false;
      mailboxProbeAuthorized: false;
      mailboxProbePerformed: false;
      providerCredentialIncluded: false;
      independentTechnicalVerificationPerformed: false;
      verificationProviderCallAuthorized: false;
      verificationProviderCallPerformed: false;
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
      "ugp_outreach_human_deliverability_evidence_decision_invalid_"+field,
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
      "ugp_outreach_human_deliverability_evidence_decision_invalid_reviewer",
    );
  }
  return value;
}

function canonicalTimestamp(value:unknown):string{
  if(typeof value!=="string"){
    throw new Error(
      "ugp_outreach_human_deliverability_evidence_decision_invalid_reviewed_at",
    );
  }
  const millis=Date.parse(value);
  if(!Number.isFinite(millis)){
    throw new Error(
      "ugp_outreach_human_deliverability_evidence_decision_invalid_reviewed_at",
    );
  }
  const canonical=new Date(millis).toISOString();
  if(canonical!==value){
    throw new Error(
      "ugp_outreach_human_deliverability_evidence_decision_invalid_reviewed_at",
    );
  }
  return canonical;
}

function assertDecisionReason(
  specification:AuthorityOutreachDeliverabilityEvidenceReviewSpecification,
  decision:AuthorityOutreachDeliverabilityEvidenceFutureDecision,
  reasonCode:AuthorityOutreachDeliverabilityEvidenceFutureReasonCode,
):void{
  if(decision==="approve_for_provider_mailbox_binding_preparation"){
    if(
      specification.evidenceDisposition!=="deliverability_evidence_supporting"
      ||reasonCode!=="evidence_sufficient_for_binding_preparation"
    ){
      throw new Error(
        "ugp_outreach_human_deliverability_evidence_decision_approval_reason_invalid",
      );
    }
    return;
  }

  if(decision==="reject_deliverability_evidence"){
    if(
      specification.evidenceDisposition==="deliverability_evidence_contradictory"
      &&reasonCode!=="contradictory_technical_evidence"
    ){
      throw new Error(
        "ugp_outreach_human_deliverability_evidence_decision_reject_reason_invalid",
      );
    }
    if(
      specification.evidenceDisposition==="deliverability_evidence_inconclusive"
      &&reasonCode!=="inconclusive_technical_evidence"
    ){
      throw new Error(
        "ugp_outreach_human_deliverability_evidence_decision_reject_reason_invalid",
      );
    }
    if(
      specification.evidenceDisposition==="deliverability_evidence_supporting"
      &&reasonCode!=="technical_method_context_unclear"
    ){
      throw new Error(
        "ugp_outreach_human_deliverability_evidence_decision_reject_reason_invalid",
      );
    }
    return;
  }

  if(
    decision==="defer_deliverability_evidence_review"
    &&![
      "evidence_needs_refresh",
      "needs_more_technical_context",
      "technical_method_context_unclear",
    ].includes(reasonCode)
  ){
    throw new Error(
      "ugp_outreach_human_deliverability_evidence_decision_defer_reason_invalid",
    );
  }
}

function expectedConfirmation(
  request:AuthorityOutreachHumanDeliverabilityEvidenceDecisionRequest,
):string{
  return [
    "REVIEW_OUTREACH_DELIVERABILITY_EVIDENCE",
    request.decision,
    request.deliverabilityEvidenceReviewSpecFingerprint,
    request.deliverabilityEvidenceFingerprint,
    request.selectedContactPointFingerprint,
    request.selectedRoleCandidateFingerprint,
    request.candidateFingerprint,
  ].join(":");
}

export function authorityOutreachHumanDeliverabilityEvidenceDecisionRequestFingerprint(
  request:AuthorityOutreachHumanDeliverabilityEvidenceDecisionRequest,
  reviewer:string,
):string{
  fingerprint(
    request.deliverabilityEvidenceReviewSpecFingerprint,
    "deliverability_evidence_review_spec_fingerprint",
  );
  fingerprint(
    request.deliverabilityEvidenceFingerprint,
    "deliverability_evidence_fingerprint",
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
      "ugp_outreach_human_deliverability_evidence_decision_explicit_confirmation_required",
    );
  }

  return hash({
    purpose:"ugp_authority_outreach_human_deliverability_evidence_decision_request",
    version:UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERABILITY_EVIDENCE_DECISION_VERSION,
    deliverabilityEvidenceReviewSpecFingerprint:
      request.deliverabilityEvidenceReviewSpecFingerprint,
    deliverabilityEvidenceFingerprint:
      request.deliverabilityEvidenceFingerprint,
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

export function prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision(
  input:Readonly<{
    deliverabilityEvidenceReviewSpecification:
      AuthorityOutreachDeliverabilityEvidenceReviewSpecification;
    deliverabilityEvidenceReviewSpecificationInput:
      AuthorityOutreachDeliverabilityEvidenceReviewSpecIntegrityInput;
    decisionRequest:
      AuthorityOutreachHumanDeliverabilityEvidenceDecisionRequest;
    reviewerId:string;
    reviewedAt:string;
  }>,
):AuthorityOutreachHumanDeliverabilityEvidenceDecisionRecord{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_human_deliverability_evidence_decision_invalid_input",
    );
  }

  assertAuthorityOutreachDeliverabilityEvidenceReviewSpecIntegrity(
    input.deliverabilityEvidenceReviewSpecification,
    input.deliverabilityEvidenceReviewSpecificationInput,
  );

  const specification=input.deliverabilityEvidenceReviewSpecification;
  if(
    specification.resultingState!=="deliverability_evidence_review_ready"
    ||specification.semantics.humanDeliverabilityEvidenceReviewRequired!==true
    ||specification.semantics.deliverabilityEvidenceDecisionRecorded!==false
    ||specification.semantics.deliverabilityEvidenceApprovalGranted!==false
    ||specification.semantics.providerBindingAuthorized!==false
    ||specification.semantics.mailboxAccessAuthorized!==false
    ||specification.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_human_deliverability_evidence_decision_review_spec_required",
    );
  }

  const request=input.decisionRequest;
  const reviewSpecFingerprint=fingerprint(
    request.deliverabilityEvidenceReviewSpecFingerprint,
    "deliverability_evidence_review_spec_fingerprint",
  );
  const deliverabilityEvidenceFingerprint=fingerprint(
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
    reviewSpecFingerprint
      !==specification.deliverabilityEvidenceReviewSpecFingerprint
    ||deliverabilityEvidenceFingerprint
      !==specification.deliverabilityEvidenceFingerprint
    ||selectedContactPointFingerprint
      !==specification.selectedContactPointFingerprint
    ||selectedRoleCandidateFingerprint
      !==specification.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==specification.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_human_deliverability_evidence_decision_stale_lineage",
    );
  }

  if(!specification.allowedFutureDecisions.includes(request.decision)){
    throw new Error(
      "ugp_outreach_human_deliverability_evidence_decision_not_allowed",
    );
  }
  if(!specification.allowedFutureReasonCodes.includes(request.reasonCode)){
    throw new Error(
      "ugp_outreach_human_deliverability_evidence_reason_not_allowed",
    );
  }

  assertDecisionReason(specification,request.decision,request.reasonCode);

  const normalizedReviewer=reviewerId(input.reviewerId);
  const reviewedAt=canonicalTimestamp(input.reviewedAt);
  const decisionRequestFingerprint=
    authorityOutreachHumanDeliverabilityEvidenceDecisionRequestFingerprint(
      request,
      normalizedReviewer,
    );

  const approved=
    request.decision==="approve_for_provider_mailbox_binding_preparation";
  const resultingState=
    approved
      ?"provider_mailbox_binding_preparation_eligible" as const
      :request.decision==="reject_deliverability_evidence"
        ?"deliverability_evidence_rejected" as const
        :"deliverability_evidence_deferred" as const;

  const semantics=Object.freeze({
    deterministic:true as const,
    humanDecision:true as const,
    exactDeliverabilityEvidenceReviewSpecificationRequired:true as const,
    exactDeliverabilityEvidenceRequired:true as const,
    exactSelectedContactPointRequired:true as const,
    exactEvidenceDispositionRequired:true as const,
    explicitConfirmationRequired:true as const,
    eligibilityOnly:true as const,
    deliverabilityEvidenceDecisionRecorded:true as const,
    deliverabilityEvidenceApprovalGranted:approved,
    providerMailboxBindingPreparationEligibilityGranted:approved,
    providerMailboxBindingPreparationExecuted:false as const,
    providerBindingAuthorized:false as const,
    providerBindingPerformed:false as const,
    mailboxBindingAuthorized:false as const,
    mailboxBindingPerformed:false as const,
    mailboxAccessAuthorized:false as const,
    mailboxProbeAuthorized:false as const,
    mailboxProbePerformed:false as const,
    providerCredentialIncluded:false as const,
    independentTechnicalVerificationPerformed:false as const,
    verificationProviderCallAuthorized:false as const,
    verificationProviderCallPerformed:false as const,
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
      UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERABILITY_EVIDENCE_DECISION_VERSION,
    decisionRequestFingerprint,
    deliverabilityEvidenceReviewSpecId:
      specification.deliverabilityEvidenceReviewSpecId,
    deliverabilityEvidenceReviewSpecFingerprint:
      specification.deliverabilityEvidenceReviewSpecFingerprint,
    deliverabilityEvidenceId:specification.deliverabilityEvidenceId,
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
    evidenceDisposition:specification.evidenceDisposition,
    decision:request.decision,
    reasonCode:request.reasonCode,
    reviewerId:normalizedReviewer,
    reviewedAt,
    resultingState,
    semantics,
  };

  const deliverabilityEvidenceDecisionFingerprint=hash({
    purpose:"ugp_authority_outreach_human_deliverability_evidence_decision",
    ...base,
  });

  return Object.freeze({
    ...base,
    deliverabilityEvidenceDecisionId:
      "uaodved-"+deliverabilityEvidenceDecisionFingerprint.slice(0,24),
    deliverabilityEvidenceDecisionFingerprint,
  });
}

export function assertAuthorityOutreachHumanDeliverabilityEvidenceDecisionIntegrity(
  result:AuthorityOutreachHumanDeliverabilityEvidenceDecisionRecord,
  input:Readonly<{
    deliverabilityEvidenceReviewSpecification:
      AuthorityOutreachDeliverabilityEvidenceReviewSpecification;
    deliverabilityEvidenceReviewSpecificationInput:
      AuthorityOutreachDeliverabilityEvidenceReviewSpecIntegrityInput;
    decisionRequest:
      AuthorityOutreachHumanDeliverabilityEvidenceDecisionRequest;
    reviewerId:string;
    reviewedAt:string;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_HUMAN_DELIVERABILITY_EVIDENCE_DECISION_VERSION
  ){
    throw new Error(
      "ugp_outreach_human_deliverability_evidence_decision_version_invalid",
    );
  }

  const approved=
    result.decision==="approve_for_provider_mailbox_binding_preparation";
  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.humanDecision!==true
    ||s.exactDeliverabilityEvidenceReviewSpecificationRequired!==true
    ||s.exactDeliverabilityEvidenceRequired!==true
    ||s.exactSelectedContactPointRequired!==true
    ||s.exactEvidenceDispositionRequired!==true
    ||s.explicitConfirmationRequired!==true
    ||s.eligibilityOnly!==true
    ||s.deliverabilityEvidenceDecisionRecorded!==true
    ||s.deliverabilityEvidenceApprovalGranted!==approved
    ||s.providerMailboxBindingPreparationEligibilityGranted!==approved
    ||s.providerMailboxBindingPreparationExecuted!==false
    ||s.providerBindingAuthorized!==false
    ||s.providerBindingPerformed!==false
    ||s.mailboxBindingAuthorized!==false
    ||s.mailboxBindingPerformed!==false
    ||s.mailboxAccessAuthorized!==false
    ||s.mailboxProbeAuthorized!==false
    ||s.mailboxProbePerformed!==false
    ||s.providerCredentialIncluded!==false
    ||s.independentTechnicalVerificationPerformed!==false
    ||s.verificationProviderCallAuthorized!==false
    ||s.verificationProviderCallPerformed!==false
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
      "ugp_outreach_human_deliverability_evidence_decision_unsafe_semantics",
    );
  }

  const expected=
    prepareAuthorityOutreachHumanDeliverabilityEvidenceDecision(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_human_deliverability_evidence_decision_integrity_mismatch",
    );
  }
}
