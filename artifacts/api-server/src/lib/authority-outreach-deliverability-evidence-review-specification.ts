import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachDeliverabilityEvidenceIntegrity,
  type AuthorityOutreachDeliverabilityEvidenceContract,
  type AuthorityOutreachDeliverabilityEvidenceDisposition,
  type AuthorityOutreachValidatedDeliverabilityEvidenceObservation,
} from "./authority-outreach-deliverability-evidence-validation.js";

export const UGP_AUTHORITY_OUTREACH_DELIVERABILITY_EVIDENCE_REVIEW_SPEC_VERSION =
  "ugp-10-21-deliverability-evidence-review-specification-v1" as const;

export type AuthorityOutreachDeliverabilityEvidenceFutureDecision =
  | "approve_for_provider_mailbox_binding_preparation"
  | "reject_deliverability_evidence"
  | "defer_deliverability_evidence_review";

export type AuthorityOutreachDeliverabilityEvidenceFutureReasonCode =
  | "evidence_sufficient_for_binding_preparation"
  | "contradictory_technical_evidence"
  | "inconclusive_technical_evidence"
  | "evidence_needs_refresh"
  | "technical_method_context_unclear"
  | "needs_more_technical_context";

export type AuthorityOutreachDeliverabilityEvidenceReviewRequest = Readonly<{
  deliverabilityEvidenceFingerprint: string;
  selectedContactPointFingerprint: string;
  selectedRoleCandidateFingerprint: string;
  candidateFingerprint: string;
}>;

export type AuthorityOutreachDeliverabilityEvidenceIntegrityInput =
  Parameters<typeof assertAuthorityOutreachDeliverabilityEvidenceIntegrity>[1];

export type AuthorityOutreachDeliverabilityEvidenceReviewObservation =
  Readonly<{
    observationId: string;
    observationFingerprint: string;
    methodClass:
      AuthorityOutreachValidatedDeliverabilityEvidenceObservation["methodClass"];
    observationOutcome:
      AuthorityOutreachValidatedDeliverabilityEvidenceObservation["observationOutcome"];
    observedAt: string;
    technicalEvidenceFingerprint: string;
    publicBusinessTechnicalEvidenceAttested: true;
  }>;

export type AuthorityOutreachDeliverabilityEvidenceReviewSpecification =
  Readonly<{
    version:
      typeof UGP_AUTHORITY_OUTREACH_DELIVERABILITY_EVIDENCE_REVIEW_SPEC_VERSION;
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
    reviewObservations:
      readonly AuthorityOutreachDeliverabilityEvidenceReviewObservation[];
    evidenceCount: number;
    reviewRequirements: Readonly<{
      exactTechnicalEvidenceSetRequired: true;
      evidenceDispositionReviewRequired: true;
      methodOutcomeConsistencyReviewRequired: true;
      evidenceFreshnessReviewRequired: true;
      explicitHumanDecisionRequired: true;
      supportingEvidenceRequiredForApprovalOption: true;
      noIndependentVerificationInference: true;
      noProviderOrMailboxBindingInference: true;
      noSendAuthorizationInference: true;
    }>;
    allowedFutureDecisions:
      readonly AuthorityOutreachDeliverabilityEvidenceFutureDecision[];
    allowedFutureReasonCodes:
      readonly AuthorityOutreachDeliverabilityEvidenceFutureReasonCode[];
    futureDecisionConfirmationPrefix:
      "REVIEW_OUTREACH_DELIVERABILITY_EVIDENCE";
    resultingState: "deliverability_evidence_review_ready";
    semantics: Readonly<{
      deterministic: true;
      exactDeliverabilityEvidenceRequired: true;
      exactTechnicalEvidenceSetFrozen: true;
      exactEvidenceDispositionFrozen: true;
      humanDeliverabilityEvidenceReviewRequired: true;
      deliverabilityEvidenceReviewPreparationOnly: true;
      deliverabilityEvidenceDecisionRecorded: false;
      deliverabilityEvidenceApprovalGranted: false;
      providerMailboxBindingPreparationEligibilityGranted: false;
      providerMailboxBindingPreparationExecuted: false;
      independentTechnicalVerificationPerformed: false;
      deliverabilityVerificationAuthorized: false;
      deliverabilityVerificationPerformed: false;
      verificationProviderCallAuthorized: false;
      verificationProviderCallPerformed: false;
      mailboxProbeAuthorized: false;
      mailboxProbePerformed: false;
      mailboxAccessAuthorized: false;
      providerBindingAuthorized: false;
      providerBindingPerformed: false;
      providerCredentialIncluded: false;
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
  exactTechnicalEvidenceSetRequired:true as const,
  evidenceDispositionReviewRequired:true as const,
  methodOutcomeConsistencyReviewRequired:true as const,
  evidenceFreshnessReviewRequired:true as const,
  explicitHumanDecisionRequired:true as const,
  supportingEvidenceRequiredForApprovalOption:true as const,
  noIndependentVerificationInference:true as const,
  noProviderOrMailboxBindingInference:true as const,
  noSendAuthorizationInference:true as const,
});

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactDeliverabilityEvidenceRequired:true as const,
  exactTechnicalEvidenceSetFrozen:true as const,
  exactEvidenceDispositionFrozen:true as const,
  humanDeliverabilityEvidenceReviewRequired:true as const,
  deliverabilityEvidenceReviewPreparationOnly:true as const,
  deliverabilityEvidenceDecisionRecorded:false as const,
  deliverabilityEvidenceApprovalGranted:false as const,
  providerMailboxBindingPreparationEligibilityGranted:false as const,
  providerMailboxBindingPreparationExecuted:false as const,
  independentTechnicalVerificationPerformed:false as const,
  deliverabilityVerificationAuthorized:false as const,
  deliverabilityVerificationPerformed:false as const,
  verificationProviderCallAuthorized:false as const,
  verificationProviderCallPerformed:false as const,
  mailboxProbeAuthorized:false as const,
  mailboxProbePerformed:false as const,
  mailboxAccessAuthorized:false as const,
  providerBindingAuthorized:false as const,
  providerBindingPerformed:false as const,
  providerCredentialIncluded:false as const,
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
      "ugp_outreach_deliverability_evidence_review_spec_invalid_"+field,
    );
  }
  return value;
}

function freezeObservation(
  observation:AuthorityOutreachValidatedDeliverabilityEvidenceObservation,
):AuthorityOutreachDeliverabilityEvidenceReviewObservation{
  return Object.freeze({
    observationId:observation.observationId,
    observationFingerprint:observation.observationFingerprint,
    methodClass:observation.methodClass,
    observationOutcome:observation.observationOutcome,
    observedAt:observation.observedAt,
    technicalEvidenceFingerprint:observation.technicalEvidenceFingerprint,
    publicBusinessTechnicalEvidenceAttested:true as const,
  });
}

function futureDecisions(
  disposition:AuthorityOutreachDeliverabilityEvidenceDisposition,
):readonly AuthorityOutreachDeliverabilityEvidenceFutureDecision[]{
  if(disposition==="deliverability_evidence_supporting"){
    return Object.freeze([
      "approve_for_provider_mailbox_binding_preparation",
      "defer_deliverability_evidence_review",
      "reject_deliverability_evidence",
    ] as const);
  }
  return Object.freeze([
    "defer_deliverability_evidence_review",
    "reject_deliverability_evidence",
  ] as const);
}

function futureReasonCodes(
  disposition:AuthorityOutreachDeliverabilityEvidenceDisposition,
):readonly AuthorityOutreachDeliverabilityEvidenceFutureReasonCode[]{
  const common=[
    "evidence_needs_refresh",
    "needs_more_technical_context",
    "technical_method_context_unclear",
  ] as const;
  if(disposition==="deliverability_evidence_supporting"){
    return Object.freeze([
      "evidence_sufficient_for_binding_preparation",
      ...common,
    ] as const);
  }
  if(disposition==="deliverability_evidence_contradictory"){
    return Object.freeze([
      "contradictory_technical_evidence",
      ...common,
    ] as const);
  }
  return Object.freeze([
    "inconclusive_technical_evidence",
    ...common,
  ] as const);
}

export function buildAuthorityOutreachDeliverabilityEvidenceReviewSpecification(
  input:Readonly<{
    deliverabilityEvidence:AuthorityOutreachDeliverabilityEvidenceContract;
    deliverabilityEvidenceInput:
      AuthorityOutreachDeliverabilityEvidenceIntegrityInput;
    reviewRequest:AuthorityOutreachDeliverabilityEvidenceReviewRequest;
  }>,
):AuthorityOutreachDeliverabilityEvidenceReviewSpecification{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_deliverability_evidence_review_spec_invalid_input",
    );
  }

  assertAuthorityOutreachDeliverabilityEvidenceIntegrity(
    input.deliverabilityEvidence,
    input.deliverabilityEvidenceInput,
  );

  const evidence=input.deliverabilityEvidence;
  if(
    evidence.resultingState
      !=="deliverability_verification_evidence_validated"
    ||evidence.evidenceCount<1
    ||evidence.validatedObservations.length!==evidence.evidenceCount
    ||evidence.semantics.suppliedTechnicalEvidenceValidationOnly!==true
    ||evidence.semantics.independentTechnicalVerificationPerformed!==false
    ||evidence.semantics.providerBindingAuthorized!==false
    ||evidence.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_deliverability_evidence_review_spec_validated_evidence_required",
    );
  }

  const request=input.reviewRequest;
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
    deliverabilityEvidenceFingerprint
      !==evidence.deliverabilityEvidenceFingerprint
    ||selectedContactPointFingerprint
      !==evidence.selectedContactPointFingerprint
    ||selectedRoleCandidateFingerprint
      !==evidence.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==evidence.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_deliverability_evidence_review_spec_stale_lineage",
    );
  }

  const reviewObservations=Object.freeze(
    evidence.validatedObservations.map(freezeObservation),
  );
  const allowedFutureDecisions=futureDecisions(
    evidence.evidenceDisposition,
  );
  const allowedFutureReasonCodes=futureReasonCodes(
    evidence.evidenceDisposition,
  );

  const base={
    version:UGP_AUTHORITY_OUTREACH_DELIVERABILITY_EVIDENCE_REVIEW_SPEC_VERSION,
    deliverabilityEvidenceId:evidence.deliverabilityEvidenceId,
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
    evidenceDisposition:evidence.evidenceDisposition,
    reviewObservations,
    evidenceCount:reviewObservations.length,
    reviewRequirements:REVIEW_REQUIREMENTS,
    allowedFutureDecisions,
    allowedFutureReasonCodes,
    futureDecisionConfirmationPrefix:
      "REVIEW_OUTREACH_DELIVERABILITY_EVIDENCE" as const,
    resultingState:"deliverability_evidence_review_ready" as const,
    semantics:SEMANTICS,
  };

  const deliverabilityEvidenceReviewSpecFingerprint=hash({
    purpose:"ugp_authority_outreach_deliverability_evidence_review_specification",
    ...base,
  });

  return Object.freeze({
    ...base,
    deliverabilityEvidenceReviewSpecId:
      "uaodvers-"+deliverabilityEvidenceReviewSpecFingerprint.slice(0,24),
    deliverabilityEvidenceReviewSpecFingerprint,
  });
}

export function assertAuthorityOutreachDeliverabilityEvidenceReviewSpecIntegrity(
  result:AuthorityOutreachDeliverabilityEvidenceReviewSpecification,
  input:Readonly<{
    deliverabilityEvidence:AuthorityOutreachDeliverabilityEvidenceContract;
    deliverabilityEvidenceInput:
      AuthorityOutreachDeliverabilityEvidenceIntegrityInput;
    reviewRequest:AuthorityOutreachDeliverabilityEvidenceReviewRequest;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_DELIVERABILITY_EVIDENCE_REVIEW_SPEC_VERSION
  ){
    throw new Error(
      "ugp_outreach_deliverability_evidence_review_spec_version_invalid",
    );
  }

  const r=result.reviewRequirements;
  if(
    r.exactTechnicalEvidenceSetRequired!==true
    ||r.evidenceDispositionReviewRequired!==true
    ||r.methodOutcomeConsistencyReviewRequired!==true
    ||r.evidenceFreshnessReviewRequired!==true
    ||r.explicitHumanDecisionRequired!==true
    ||r.supportingEvidenceRequiredForApprovalOption!==true
    ||r.noIndependentVerificationInference!==true
    ||r.noProviderOrMailboxBindingInference!==true
    ||r.noSendAuthorizationInference!==true
  ){
    throw new Error(
      "ugp_outreach_deliverability_evidence_review_spec_unsafe_requirements",
    );
  }

  const approvalOption=result.allowedFutureDecisions.includes(
    "approve_for_provider_mailbox_binding_preparation",
  );
  if(
    approvalOption
      !==(result.evidenceDisposition
        ==="deliverability_evidence_supporting")
  ){
    throw new Error(
      "ugp_outreach_deliverability_evidence_review_spec_unsafe_decisions",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactDeliverabilityEvidenceRequired!==true
    ||s.exactTechnicalEvidenceSetFrozen!==true
    ||s.exactEvidenceDispositionFrozen!==true
    ||s.humanDeliverabilityEvidenceReviewRequired!==true
    ||s.deliverabilityEvidenceReviewPreparationOnly!==true
    ||s.deliverabilityEvidenceDecisionRecorded!==false
    ||s.deliverabilityEvidenceApprovalGranted!==false
    ||s.providerMailboxBindingPreparationEligibilityGranted!==false
    ||s.providerMailboxBindingPreparationExecuted!==false
    ||s.independentTechnicalVerificationPerformed!==false
    ||s.deliverabilityVerificationAuthorized!==false
    ||s.deliverabilityVerificationPerformed!==false
    ||s.verificationProviderCallAuthorized!==false
    ||s.verificationProviderCallPerformed!==false
    ||s.mailboxProbeAuthorized!==false
    ||s.mailboxProbePerformed!==false
    ||s.mailboxAccessAuthorized!==false
    ||s.providerBindingAuthorized!==false
    ||s.providerBindingPerformed!==false
    ||s.providerCredentialIncluded!==false
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
      "ugp_outreach_deliverability_evidence_review_spec_unsafe_semantics",
    );
  }

  const expected=
    buildAuthorityOutreachDeliverabilityEvidenceReviewSpecification(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_deliverability_evidence_review_spec_integrity_mismatch",
    );
  }
}
