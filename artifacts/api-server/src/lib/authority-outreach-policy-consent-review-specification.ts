import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachContactPointEvidenceIntegrity,
  type AuthorityOutreachContactPointEvidenceContract,
  type AuthorityOutreachValidatedContactPoint,
} from "./authority-outreach-contact-point-evidence-validation.js";

export const UGP_AUTHORITY_OUTREACH_POLICY_CONSENT_REVIEW_SPEC_VERSION =
  "ugp-10-17-policy-consent-review-specification-v1" as const;

export type AuthorityOutreachPolicyConsentFutureDecision =
  | "approve_for_deliverability_verification_preparation"
  | "reject_contact_point_set"
  | "defer_policy_consent_review";

export type AuthorityOutreachPolicyConsentFutureReasonCode =
  | "policy_and_context_review_sufficient"
  | "channel_not_appropriate"
  | "prior_opt_out_or_suppression_concern"
  | "relationship_or_purpose_mismatch"
  | "jurisdiction_or_policy_concern"
  | "public_business_basis_insufficient"
  | "needs_more_policy_context"
  | "evidence_needs_refresh"
  | "jurisdiction_needs_review";

export type AuthorityOutreachPolicyConsentReviewRequest = Readonly<{
  contactPointEvidenceFingerprint: string;
  selectedRoleCandidateFingerprint: string;
  candidateFingerprint: string;
}>;

export type AuthorityOutreachContactPointEvidenceIntegrityInput =
  Parameters<typeof assertAuthorityOutreachContactPointEvidenceIntegrity>[1];

export type AuthorityOutreachPolicyConsentReviewContactPoint = Readonly<{
  contactPointId: string;
  contactPointFingerprint: string;
  observationFingerprint: string;
  contactPointType: AuthorityOutreachValidatedContactPoint["contactPointType"];
  contactPointValue: string;
  evidenceSourceClass:
    AuthorityOutreachValidatedContactPoint["evidenceSourceClass"];
  evidenceUrl: string;
  observedAt: string;
  publicBusinessContactAttested: true;
}>;

export type AuthorityOutreachPolicyConsentReviewSpecification = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_POLICY_CONSENT_REVIEW_SPEC_VERSION;
  policyConsentReviewSpecId: string;
  policyConsentReviewSpecFingerprint: string;
  contactPointEvidenceId: string;
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
  reviewContactPoints: readonly AuthorityOutreachPolicyConsentReviewContactPoint[];
  contactPointCount: number;
  reviewRequirements: Readonly<{
    publicBusinessPurposeReviewRequired: true;
    relationshipContextReviewRequired: true;
    channelAppropriatenessReviewRequired: true;
    priorOptOutOrSuppressionReviewRequired: true;
    jurisdictionPolicyReviewRequired: true;
    evidenceFreshnessReviewRequired: true;
    explicitHumanDecisionRequired: true;
    noImplicitConsentInference: true;
    noAutomaticLegalComplianceDetermination: true;
  }>;
  allowedFutureDecisions:
    readonly AuthorityOutreachPolicyConsentFutureDecision[];
  allowedFutureReasonCodes:
    readonly AuthorityOutreachPolicyConsentFutureReasonCode[];
  futureDecisionConfirmationPrefix: "REVIEW_OUTREACH_POLICY_CONSENT";
  resultingState: "policy_consent_review_ready";
  semantics: Readonly<{
    deterministic: true;
    exactContactPointEvidenceRequired: true;
    exactContactPointSetFrozen: true;
    humanPolicyConsentReviewRequired: true;
    policyConsentReviewPreparationOnly: true;
    policyConsentDecisionRecorded: false;
    policyConsentApprovalGranted: false;
    contactPointSelectionAuthorized: false;
    contactPointSelectionPerformed: false;
    consentInferred: false;
    legalComplianceDeterminationPerformed: false;
    legalComplianceGuaranteed: false;
    deliverabilityVerificationAuthorized: false;
    deliverabilityVerificationPerformed: false;
    verificationProviderCallAuthorized: false;
    mailboxProbeAuthorized: false;
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

const ALLOWED_FUTURE_DECISIONS=Object.freeze([
  "approve_for_deliverability_verification_preparation",
  "defer_policy_consent_review",
  "reject_contact_point_set",
] as const satisfies readonly AuthorityOutreachPolicyConsentFutureDecision[]);

const ALLOWED_FUTURE_REASON_CODES=Object.freeze([
  "channel_not_appropriate",
  "evidence_needs_refresh",
  "jurisdiction_needs_review",
  "jurisdiction_or_policy_concern",
  "needs_more_policy_context",
  "policy_and_context_review_sufficient",
  "prior_opt_out_or_suppression_concern",
  "public_business_basis_insufficient",
  "relationship_or_purpose_mismatch",
] as const satisfies readonly AuthorityOutreachPolicyConsentFutureReasonCode[]);

const REVIEW_REQUIREMENTS=Object.freeze({
  publicBusinessPurposeReviewRequired:true as const,
  relationshipContextReviewRequired:true as const,
  channelAppropriatenessReviewRequired:true as const,
  priorOptOutOrSuppressionReviewRequired:true as const,
  jurisdictionPolicyReviewRequired:true as const,
  evidenceFreshnessReviewRequired:true as const,
  explicitHumanDecisionRequired:true as const,
  noImplicitConsentInference:true as const,
  noAutomaticLegalComplianceDetermination:true as const,
});

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactContactPointEvidenceRequired:true as const,
  exactContactPointSetFrozen:true as const,
  humanPolicyConsentReviewRequired:true as const,
  policyConsentReviewPreparationOnly:true as const,
  policyConsentDecisionRecorded:false as const,
  policyConsentApprovalGranted:false as const,
  contactPointSelectionAuthorized:false as const,
  contactPointSelectionPerformed:false as const,
  consentInferred:false as const,
  legalComplianceDeterminationPerformed:false as const,
  legalComplianceGuaranteed:false as const,
  deliverabilityVerificationAuthorized:false as const,
  deliverabilityVerificationPerformed:false as const,
  verificationProviderCallAuthorized:false as const,
  mailboxProbeAuthorized:false as const,
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
      "ugp_outreach_policy_consent_review_spec_invalid_"+field,
    );
  }
  return value;
}

function freezeContactPoint(
  contactPoint:AuthorityOutreachValidatedContactPoint,
):AuthorityOutreachPolicyConsentReviewContactPoint{
  return Object.freeze({
    contactPointId:contactPoint.contactPointId,
    contactPointFingerprint:contactPoint.contactPointFingerprint,
    observationFingerprint:contactPoint.observationFingerprint,
    contactPointType:contactPoint.contactPointType,
    contactPointValue:contactPoint.contactPointValue,
    evidenceSourceClass:contactPoint.evidenceSourceClass,
    evidenceUrl:contactPoint.evidenceUrl,
    observedAt:contactPoint.observedAt,
    publicBusinessContactAttested:true as const,
  });
}

export function buildAuthorityOutreachPolicyConsentReviewSpecification(
  input:Readonly<{
    contactPointEvidence:AuthorityOutreachContactPointEvidenceContract;
    contactPointEvidenceInput:
      AuthorityOutreachContactPointEvidenceIntegrityInput;
    reviewRequest:AuthorityOutreachPolicyConsentReviewRequest;
  }>,
):AuthorityOutreachPolicyConsentReviewSpecification{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_policy_consent_review_spec_invalid_input",
    );
  }

  assertAuthorityOutreachContactPointEvidenceIntegrity(
    input.contactPointEvidence,
    input.contactPointEvidenceInput,
  );

  const evidence=input.contactPointEvidence;
  if(
    evidence.resultingState!=="contact_point_evidence_validated"
    ||evidence.outcome!=="contact_point_set"
    ||evidence.contactPointCount<1
    ||evidence.validatedContactPoints.length!==evidence.contactPointCount
    ||evidence.semantics.deliverabilityVerificationAuthorized!==false
    ||evidence.semantics.policyAndConsentReviewAuthorized!==false
    ||evidence.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_policy_consent_review_spec_contact_point_set_required",
    );
  }

  const request=input.reviewRequest;
  const contactPointEvidenceFingerprint=fingerprint(
    request.contactPointEvidenceFingerprint,
    "contact_point_evidence_fingerprint",
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
    contactPointEvidenceFingerprint!==evidence.contactPointEvidenceFingerprint
    ||selectedRoleCandidateFingerprint
      !==evidence.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==evidence.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_policy_consent_review_spec_stale_lineage",
    );
  }

  const reviewContactPoints=Object.freeze(
    evidence.validatedContactPoints.map(freezeContactPoint),
  );

  const base={
    version:UGP_AUTHORITY_OUTREACH_POLICY_CONSENT_REVIEW_SPEC_VERSION,
    contactPointEvidenceId:evidence.contactPointEvidenceId,
    contactPointEvidenceFingerprint:evidence.contactPointEvidenceFingerprint,
    contactVerificationSpecFingerprint:
      evidence.contactVerificationSpecFingerprint,
    selectionDecisionFingerprint:evidence.selectionDecisionFingerprint,
    selectionReviewSpecFingerprint:evidence.selectionReviewSpecFingerprint,
    researchEvidenceFingerprint:evidence.researchEvidenceFingerprint,
    researchSpecFingerprint:evidence.researchSpecFingerprint,
    deliveryPreparationFingerprint:evidence.deliveryPreparationFingerprint,
    sendReviewFingerprint:evidence.sendReviewFingerprint,
    qualityGateFingerprint:evidence.qualityGateFingerprint,
    requestId:evidence.requestId,
    requestFingerprint:evidence.requestFingerprint,
    candidateFingerprint:evidence.candidateFingerprint,
    mechanicalValidationFingerprint:evidence.mechanicalValidationFingerprint,
    prospectFingerprint:evidence.prospectFingerprint,
    opportunityFingerprint:evidence.opportunityFingerprint,
    approvalReviewFingerprint:evidence.approvalReviewFingerprint,
    sourceDomain:evidence.sourceDomain,
    sourceUrl:evidence.sourceUrl,
    targetDomain:evidence.targetDomain,
    targetUrl:evidence.targetUrl,
    selectedRoleCandidateFingerprint:evidence.selectedRoleCandidateFingerprint,
    reviewContactPoints,
    contactPointCount:reviewContactPoints.length,
    reviewRequirements:REVIEW_REQUIREMENTS,
    allowedFutureDecisions:ALLOWED_FUTURE_DECISIONS,
    allowedFutureReasonCodes:ALLOWED_FUTURE_REASON_CODES,
    futureDecisionConfirmationPrefix:
      "REVIEW_OUTREACH_POLICY_CONSENT" as const,
    resultingState:"policy_consent_review_ready" as const,
    semantics:SEMANTICS,
  };
  const policyConsentReviewSpecFingerprint=hash({
    purpose:"ugp_authority_outreach_policy_consent_review_specification",
    ...base,
  });

  return Object.freeze({
    ...base,
    policyConsentReviewSpecId:
      "uaopcrs-"+policyConsentReviewSpecFingerprint.slice(0,24),
    policyConsentReviewSpecFingerprint,
  });
}

export function assertAuthorityOutreachPolicyConsentReviewSpecIntegrity(
  result:AuthorityOutreachPolicyConsentReviewSpecification,
  input:Readonly<{
    contactPointEvidence:AuthorityOutreachContactPointEvidenceContract;
    contactPointEvidenceInput:
      AuthorityOutreachContactPointEvidenceIntegrityInput;
    reviewRequest:AuthorityOutreachPolicyConsentReviewRequest;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_POLICY_CONSENT_REVIEW_SPEC_VERSION
  ){
    throw new Error(
      "ugp_outreach_policy_consent_review_spec_version_invalid",
    );
  }

  const r=result.reviewRequirements;
  if(
    r.publicBusinessPurposeReviewRequired!==true
    ||r.relationshipContextReviewRequired!==true
    ||r.channelAppropriatenessReviewRequired!==true
    ||r.priorOptOutOrSuppressionReviewRequired!==true
    ||r.jurisdictionPolicyReviewRequired!==true
    ||r.evidenceFreshnessReviewRequired!==true
    ||r.explicitHumanDecisionRequired!==true
    ||r.noImplicitConsentInference!==true
    ||r.noAutomaticLegalComplianceDetermination!==true
  ){
    throw new Error(
      "ugp_outreach_policy_consent_review_spec_unsafe_requirements",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactContactPointEvidenceRequired!==true
    ||s.exactContactPointSetFrozen!==true
    ||s.humanPolicyConsentReviewRequired!==true
    ||s.policyConsentReviewPreparationOnly!==true
    ||s.policyConsentDecisionRecorded!==false
    ||s.policyConsentApprovalGranted!==false
    ||s.contactPointSelectionAuthorized!==false
    ||s.contactPointSelectionPerformed!==false
    ||s.consentInferred!==false
    ||s.legalComplianceDeterminationPerformed!==false
    ||s.legalComplianceGuaranteed!==false
    ||s.deliverabilityVerificationAuthorized!==false
    ||s.deliverabilityVerificationPerformed!==false
    ||s.verificationProviderCallAuthorized!==false
    ||s.mailboxProbeAuthorized!==false
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
      "ugp_outreach_policy_consent_review_spec_unsafe_semantics",
    );
  }

  const expected=
    buildAuthorityOutreachPolicyConsentReviewSpecification(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_policy_consent_review_spec_integrity_mismatch",
    );
  }
}
