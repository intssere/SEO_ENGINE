import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachRecipientSelectionReviewSpecIntegrity,
  type AuthorityOutreachRecipientSelectionFutureDecision,
  type AuthorityOutreachRecipientSelectionFutureReasonCode,
  type AuthorityOutreachRecipientSelectionReviewCandidate,
  type AuthorityOutreachRecipientSelectionReviewSpecification,
} from "./authority-outreach-recipient-selection-review-specification.js";

export const UGP_AUTHORITY_OUTREACH_HUMAN_RECIPIENT_SELECTION_VERSION =
  "ugp-10-14-human-recipient-selection-decision-v1" as const;

export type AuthorityOutreachHumanRecipientSelectionRequest = Readonly<{
  selectionReviewSpecFingerprint: string;
  candidateFingerprint: string;
  decision: AuthorityOutreachRecipientSelectionFutureDecision;
  reasonCode: AuthorityOutreachRecipientSelectionFutureReasonCode;
  selectedRoleCandidateFingerprint: string | null;
  confirmation: string;
}>;

export type AuthorityOutreachRecipientSelectionReviewSpecIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachRecipientSelectionReviewSpecIntegrity
  >[1];

export type AuthorityOutreachHumanRecipientSelectionRecord = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_HUMAN_RECIPIENT_SELECTION_VERSION;
  selectionDecisionId: string;
  selectionDecisionFingerprint: string;
  decisionRequestFingerprint: string;
  selectionReviewSpecId: string;
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
  decision: AuthorityOutreachRecipientSelectionFutureDecision;
  reasonCode: AuthorityOutreachRecipientSelectionFutureReasonCode;
  selectedRoleCandidate:
    | AuthorityOutreachRecipientSelectionReviewCandidate
    | null;
  selectedRoleCandidateFingerprint: string | null;
  reviewerId: string;
  reviewedAt: string;
  resultingState:
    | "contact_verification_eligible"
    | "recipient_selection_rejected"
    | "recipient_selection_deferred";
  semantics: Readonly<{
    deterministic: true;
    humanDecision: true;
    exactSelectionReviewSpecificationRequired: true;
    exactCandidateMembershipRequired: true;
    explicitConfirmationRequired: true;
    eligibilityOnly: true;
    automatedRecipientSelectionAuthorized: false;
    candidateMutationAuthorized: false;
    contactDiscoveryAuthorized: false;
    contactDiscoveryPerformed: false;
    contactAddressIncluded: false;
    contactAddressCollectionAuthorized: false;
    contactAddressVerificationAuthorized: false;
    contactAddressVerificationPerformed: false;
    emailVerificationAuthorized: false;
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

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  humanDecision:true as const,
  exactSelectionReviewSpecificationRequired:true as const,
  exactCandidateMembershipRequired:true as const,
  explicitConfirmationRequired:true as const,
  eligibilityOnly:true as const,
  automatedRecipientSelectionAuthorized:false as const,
  candidateMutationAuthorized:false as const,
  contactDiscoveryAuthorized:false as const,
  contactDiscoveryPerformed:false as const,
  contactAddressIncluded:false as const,
  contactAddressCollectionAuthorized:false as const,
  contactAddressVerificationAuthorized:false as const,
  contactAddressVerificationPerformed:false as const,
  emailVerificationAuthorized:false as const,
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
      "ugp_outreach_human_recipient_selection_invalid_"+field,
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
      "ugp_outreach_human_recipient_selection_invalid_reviewer",
    );
  }
  return value;
}

function canonicalTimestamp(value:unknown):string{
  if(typeof value!=="string"){
    throw new Error(
      "ugp_outreach_human_recipient_selection_invalid_reviewed_at",
    );
  }
  const millis=Date.parse(value);
  if(!Number.isFinite(millis)){
    throw new Error(
      "ugp_outreach_human_recipient_selection_invalid_reviewed_at",
    );
  }
  const canonical=new Date(millis).toISOString();
  if(canonical!==value){
    throw new Error(
      "ugp_outreach_human_recipient_selection_invalid_reviewed_at",
    );
  }
  return canonical;
}

function assertDecisionReason(
  decision:AuthorityOutreachRecipientSelectionFutureDecision,
  reasonCode:AuthorityOutreachRecipientSelectionFutureReasonCode,
):void{
  if(decision==="select_for_contact_verification"){
    if(reasonCode!=="role_and_source_evidence_sufficient"){
      throw new Error(
        "ugp_outreach_human_recipient_selection_approval_reason_invalid",
      );
    }
    return;
  }

  if(reasonCode==="role_and_source_evidence_sufficient"){
    throw new Error(
      "ugp_outreach_human_recipient_selection_nonapproval_reason_invalid",
    );
  }

  if(
    decision==="defer_selection"
    &&![
      "evidence_needs_refresh",
      "identity_or_organization_ambiguous",
      "needs_more_context",
    ].includes(reasonCode)
  ){
    throw new Error(
      "ugp_outreach_human_recipient_selection_defer_reason_invalid",
    );
  }

  if(
    decision==="reject_candidate_set"
    &&![
      "role_fit_not_sufficient",
      "identity_or_organization_ambiguous",
      "relationship_or_reputation_concern",
    ].includes(reasonCode)
  ){
    throw new Error(
      "ugp_outreach_human_recipient_selection_reject_reason_invalid",
    );
  }
}

function selectedCandidate(
  specification:AuthorityOutreachRecipientSelectionReviewSpecification,
  request:AuthorityOutreachHumanRecipientSelectionRequest,
):AuthorityOutreachRecipientSelectionReviewCandidate|null{
  if(request.decision==="select_for_contact_verification"){
    const selectedFingerprint=fingerprint(
      request.selectedRoleCandidateFingerprint,
      "selected_role_candidate_fingerprint",
    );
    const candidate=specification.reviewCandidates.find(
      item=>item.roleCandidateFingerprint===selectedFingerprint,
    );
    if(!candidate){
      throw new Error(
        "ugp_outreach_human_recipient_selection_candidate_not_in_review_set",
      );
    }
    return Object.freeze({
      ...candidate,
      matchedRoleCriteria:Object.freeze([...candidate.matchedRoleCriteria]),
    });
  }

  if(request.selectedRoleCandidateFingerprint!==null){
    throw new Error(
      "ugp_outreach_human_recipient_selection_nonselection_candidate_forbidden",
    );
  }
  return null;
}

function expectedConfirmation(
  request:AuthorityOutreachHumanRecipientSelectionRequest,
):string{
  return [
    "REVIEW_OUTREACH_RECIPIENT_SELECTION",
    request.decision,
    request.selectedRoleCandidateFingerprint??"NONE",
    request.selectionReviewSpecFingerprint,
    request.candidateFingerprint,
  ].join(":");
}

export function authorityOutreachHumanRecipientSelectionRequestFingerprint(
  request:AuthorityOutreachHumanRecipientSelectionRequest,
  reviewer:string,
):string{
  fingerprint(
    request.selectionReviewSpecFingerprint,
    "selection_review_spec_fingerprint",
  );
  fingerprint(request.candidateFingerprint,"candidate_fingerprint");
  if(
    request.decision!=="select_for_contact_verification"
    &&request.decision!=="reject_candidate_set"
    &&request.decision!=="defer_selection"
  ){
    throw new Error(
      "ugp_outreach_human_recipient_selection_decision_invalid",
    );
  }
  assertDecisionReason(request.decision,request.reasonCode);
  const normalizedReviewer=reviewerId(reviewer);
  if(request.confirmation!==expectedConfirmation(request)){
    throw new Error(
      "ugp_outreach_human_recipient_selection_explicit_confirmation_required",
    );
  }
  return hash({
    purpose:"ugp_authority_outreach_human_recipient_selection_request",
    version:UGP_AUTHORITY_OUTREACH_HUMAN_RECIPIENT_SELECTION_VERSION,
    selectionReviewSpecFingerprint:request.selectionReviewSpecFingerprint,
    candidateFingerprint:request.candidateFingerprint,
    decision:request.decision,
    reasonCode:request.reasonCode,
    selectedRoleCandidateFingerprint:
      request.selectedRoleCandidateFingerprint,
    reviewerId:normalizedReviewer,
  });
}

export function prepareAuthorityOutreachHumanRecipientSelectionDecision(
  input:Readonly<{
    selectionReviewSpecification:
      AuthorityOutreachRecipientSelectionReviewSpecification;
    selectionReviewSpecificationInput:
      AuthorityOutreachRecipientSelectionReviewSpecIntegrityInput;
    selectionRequest:AuthorityOutreachHumanRecipientSelectionRequest;
    reviewerId:string;
    reviewedAt:string;
  }>,
):AuthorityOutreachHumanRecipientSelectionRecord{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_human_recipient_selection_invalid_input",
    );
  }

  assertAuthorityOutreachRecipientSelectionReviewSpecIntegrity(
    input.selectionReviewSpecification,
    input.selectionReviewSpecificationInput,
  );

  const specification=input.selectionReviewSpecification;
  if(
    specification.resultingState!=="recipient_selection_review_ready"
    ||specification.candidateCount<1
    ||specification.reviewCandidates.length!==specification.candidateCount
    ||specification.semantics.humanRecipientSelectionRequired!==true
    ||specification.semantics.recipientSelectionAuthorized!==false
    ||specification.semantics.contactAddressVerificationAuthorized!==false
    ||specification.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_human_recipient_selection_review_spec_required",
    );
  }

  const request=input.selectionRequest;
  const selectionReviewSpecFingerprint=fingerprint(
    request.selectionReviewSpecFingerprint,
    "selection_review_spec_fingerprint",
  );
  const candidateFingerprint=fingerprint(
    request.candidateFingerprint,
    "candidate_fingerprint",
  );
  if(
    selectionReviewSpecFingerprint
      !==specification.selectionReviewSpecFingerprint
    ||candidateFingerprint!==specification.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_human_recipient_selection_stale_lineage",
    );
  }

  if(!specification.allowedFutureDecisions.includes(request.decision)){
    throw new Error(
      "ugp_outreach_human_recipient_selection_decision_not_allowed",
    );
  }
  if(!specification.allowedFutureReasonCodes.includes(request.reasonCode)){
    throw new Error(
      "ugp_outreach_human_recipient_selection_reason_not_allowed",
    );
  }

  const normalizedReviewer=reviewerId(input.reviewerId);
  const reviewedAt=canonicalTimestamp(input.reviewedAt);
  const selectedRoleCandidate=selectedCandidate(specification,request);
  const decisionRequestFingerprint=
    authorityOutreachHumanRecipientSelectionRequestFingerprint(
      request,
      normalizedReviewer,
    );

  const resultingState=
    request.decision==="select_for_contact_verification"
      ?"contact_verification_eligible" as const
      :request.decision==="reject_candidate_set"
        ?"recipient_selection_rejected" as const
        :"recipient_selection_deferred" as const;

  const base={
    version:UGP_AUTHORITY_OUTREACH_HUMAN_RECIPIENT_SELECTION_VERSION,
    decisionRequestFingerprint,
    selectionReviewSpecId:specification.selectionReviewSpecId,
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
    decision:request.decision,
    reasonCode:request.reasonCode,
    selectedRoleCandidate,
    selectedRoleCandidateFingerprint:
      selectedRoleCandidate?.roleCandidateFingerprint??null,
    reviewerId:normalizedReviewer,
    reviewedAt,
    resultingState,
    semantics:SEMANTICS,
  };
  const selectionDecisionFingerprint=hash({
    purpose:"ugp_authority_outreach_human_recipient_selection_decision",
    ...base,
  });

  return Object.freeze({
    ...base,
    selectionDecisionId:
      "uaorsd-"+selectionDecisionFingerprint.slice(0,24),
    selectionDecisionFingerprint,
  });
}

export function assertAuthorityOutreachHumanRecipientSelectionIntegrity(
  result:AuthorityOutreachHumanRecipientSelectionRecord,
  input:Readonly<{
    selectionReviewSpecification:
      AuthorityOutreachRecipientSelectionReviewSpecification;
    selectionReviewSpecificationInput:
      AuthorityOutreachRecipientSelectionReviewSpecIntegrityInput;
    selectionRequest:AuthorityOutreachHumanRecipientSelectionRequest;
    reviewerId:string;
    reviewedAt:string;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_HUMAN_RECIPIENT_SELECTION_VERSION
  ){
    throw new Error(
      "ugp_outreach_human_recipient_selection_version_invalid",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.humanDecision!==true
    ||s.exactSelectionReviewSpecificationRequired!==true
    ||s.exactCandidateMembershipRequired!==true
    ||s.explicitConfirmationRequired!==true
    ||s.eligibilityOnly!==true
    ||s.automatedRecipientSelectionAuthorized!==false
    ||s.candidateMutationAuthorized!==false
    ||s.contactDiscoveryAuthorized!==false
    ||s.contactDiscoveryPerformed!==false
    ||s.contactAddressIncluded!==false
    ||s.contactAddressCollectionAuthorized!==false
    ||s.contactAddressVerificationAuthorized!==false
    ||s.contactAddressVerificationPerformed!==false
    ||s.emailVerificationAuthorized!==false
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
      "ugp_outreach_human_recipient_selection_unsafe_semantics",
    );
  }

  const expected=prepareAuthorityOutreachHumanRecipientSelectionDecision(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_human_recipient_selection_integrity_mismatch",
    );
  }
}
