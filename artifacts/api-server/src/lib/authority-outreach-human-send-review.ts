import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachSemanticQualityGateIntegrity,
  type AuthorityOutreachSemanticAssessment,
  type AuthorityOutreachSemanticQualityGate,
} from "./authority-outreach-semantic-quality-gate.js";
import type {
  AuthorityOutreachDraftCandidate,
  AuthorityOutreachDraftCandidateValidation,
} from "./authority-outreach-draft-candidate-validation.js";
import type {
  AuthorityOutreachDraftGenerationRequest,
} from "./authority-outreach-draft-generation-request.js";

export const UGP_AUTHORITY_OUTREACH_HUMAN_SEND_REVIEW_VERSION =
  "ugp-10-9-human-send-review-decision-v1" as const;

export type AuthorityOutreachHumanSendReviewDecision =
  | "approved_for_delivery_preparation"
  | "rejected"
  | "deferred";

export type AuthorityOutreachHumanSendReviewReason =
  | "approved_as_validated"
  | "brand_or_reputation_concern"
  | "context_not_appropriate"
  | "relationship_conflict"
  | "duplicate_outreach_risk"
  | "policy_or_claim_concern"
  | "needs_more_context"
  | "timing_not_right";

export type AuthorityOutreachHumanSendReviewRequest = Readonly<{
  qualityGateFingerprint: string;
  requestFingerprint: string;
  candidateFingerprint: string;
  decision: AuthorityOutreachHumanSendReviewDecision;
  reasonCode: AuthorityOutreachHumanSendReviewReason;
  confirmation: string;
}>;

export type AuthorityOutreachHumanSendReviewRecord = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_HUMAN_SEND_REVIEW_VERSION;
  reviewId: string;
  reviewFingerprint: string;
  decisionRequestFingerprint: string;
  qualityGateFingerprint: string;
  requestId: string;
  requestFingerprint: string;
  candidateFingerprint: string;
  mechanicalValidationFingerprint: string;
  prospectFingerprint: string;
  opportunityFingerprint: string;
  approvalReviewFingerprint: string;
  targetUrl: string;
  decision: AuthorityOutreachHumanSendReviewDecision;
  reasonCode: AuthorityOutreachHumanSendReviewReason;
  reviewerId: string;
  reviewedAt: string;
  resultingState:
    | "delivery_preparation_eligible"
    | "send_review_rejected"
    | "send_review_deferred";
  semantics: Readonly<{
    deterministic: true;
    humanDecision: true;
    exactValidatedCandidateRequired: true;
    qualityGatePassRequired: true;
    explicitConfirmationRequired: true;
    eligibilityOnly: true;
    deliveryPreparationExecuted: false;
    candidateMutationAuthorized: false;
    recipientSelectionAuthorized: false;
    contactDiscoveryAuthorized: false;
    contactDiscoveryPerformed: false;
    emailVerificationAuthorized: false;
    mailboxAccessAuthorized: false;
    sendAuthorizationGranted: false;
    outreachSendingAuthorized: false;
    outreachSendingPerformed: false;
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
  exactValidatedCandidateRequired:true as const,
  qualityGatePassRequired:true as const,
  explicitConfirmationRequired:true as const,
  eligibilityOnly:true as const,
  deliveryPreparationExecuted:false as const,
  candidateMutationAuthorized:false as const,
  recipientSelectionAuthorized:false as const,
  contactDiscoveryAuthorized:false as const,
  contactDiscoveryPerformed:false as const,
  emailVerificationAuthorized:false as const,
  mailboxAccessAuthorized:false as const,
  sendAuthorizationGranted:false as const,
  outreachSendingAuthorized:false as const,
  outreachSendingPerformed:false as const,
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
    throw new Error("ugp_outreach_send_review_invalid_"+field);
  }
  return value;
}

function reviewerId(value:unknown):string{
  if(
    typeof value!=="string"
    ||value.trim()!==value
    ||!REVIEWER.test(value)
  ){
    throw new Error("ugp_outreach_send_review_invalid_reviewer");
  }
  return value;
}

function canonicalTimestamp(value:unknown):string{
  if(typeof value!=="string"){
    throw new Error("ugp_outreach_send_review_invalid_reviewed_at");
  }
  const millis=Date.parse(value);
  if(!Number.isFinite(millis)){
    throw new Error("ugp_outreach_send_review_invalid_reviewed_at");
  }
  const canonical=new Date(millis).toISOString();
  if(canonical!==value){
    throw new Error("ugp_outreach_send_review_invalid_reviewed_at");
  }
  return canonical;
}

function assertDecisionReason(
  decision:AuthorityOutreachHumanSendReviewDecision,
  reasonCode:AuthorityOutreachHumanSendReviewReason,
):void{
  if(decision==="approved_for_delivery_preparation"){
    if(reasonCode!=="approved_as_validated"){
      throw new Error(
        "ugp_outreach_send_review_approval_reason_invalid",
      );
    }
    return;
  }
  if(reasonCode==="approved_as_validated"){
    throw new Error(
      "ugp_outreach_send_review_nonapproval_reason_invalid",
    );
  }
  if(
    decision==="deferred"
    &&!["needs_more_context","timing_not_right"].includes(reasonCode)
  ){
    throw new Error(
      "ugp_outreach_send_review_defer_reason_invalid",
    );
  }
  if(
    decision==="rejected"
    &&![
      "brand_or_reputation_concern",
      "context_not_appropriate",
      "relationship_conflict",
      "duplicate_outreach_risk",
      "policy_or_claim_concern",
    ].includes(reasonCode)
  ){
    throw new Error(
      "ugp_outreach_send_review_reject_reason_invalid",
    );
  }
}

function expectedConfirmation(
  request:AuthorityOutreachHumanSendReviewRequest,
):string{
  return [
    "REVIEW_OUTREACH_SEND",
    request.decision,
    request.candidateFingerprint,
    request.qualityGateFingerprint,
  ].join(":");
}

export function authorityOutreachHumanSendReviewRequestFingerprint(
  request:AuthorityOutreachHumanSendReviewRequest,
  reviewer:string,
):string{
  fingerprint(request.qualityGateFingerprint,"quality_gate_fingerprint");
  fingerprint(request.requestFingerprint,"request_fingerprint");
  fingerprint(request.candidateFingerprint,"candidate_fingerprint");
  assertDecisionReason(request.decision,request.reasonCode);
  const normalizedReviewer=reviewerId(reviewer);
  if(request.confirmation!==expectedConfirmation(request)){
    throw new Error(
      "ugp_outreach_send_review_explicit_confirmation_required",
    );
  }
  return hash({
    purpose:"ugp_authority_outreach_human_send_review_request",
    version:UGP_AUTHORITY_OUTREACH_HUMAN_SEND_REVIEW_VERSION,
    qualityGateFingerprint:request.qualityGateFingerprint,
    requestFingerprint:request.requestFingerprint,
    candidateFingerprint:request.candidateFingerprint,
    decision:request.decision,
    reasonCode:request.reasonCode,
    reviewerId:normalizedReviewer,
  });
}

export function prepareAuthorityOutreachHumanSendReviewDecision(
  input:Readonly<{
    request:AuthorityOutreachDraftGenerationRequest;
    candidate:AuthorityOutreachDraftCandidate;
    mechanicalValidation:AuthorityOutreachDraftCandidateValidation;
    assessments:readonly AuthorityOutreachSemanticAssessment[];
    qualityGate:AuthorityOutreachSemanticQualityGate;
    reviewRequest:AuthorityOutreachHumanSendReviewRequest;
    reviewerId:string;
    reviewedAt:string;
  }>,
):AuthorityOutreachHumanSendReviewRecord{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error("ugp_outreach_send_review_invalid_input");
  }

  assertAuthorityOutreachSemanticQualityGateIntegrity(
    input.qualityGate,
    {
      request:input.request,
      candidate:input.candidate,
      mechanicalValidation:input.mechanicalValidation,
      assessments:input.assessments,
    },
  );
  if(
    input.qualityGate.status!=="pass"
    ||input.qualityGate.eligibleForHumanSendReview!==true
  ){
    throw new Error(
      "ugp_outreach_send_review_quality_gate_pass_required",
    );
  }

  const reviewRequest=input.reviewRequest;
  const qualityGateFingerprint=fingerprint(
    reviewRequest.qualityGateFingerprint,
    "quality_gate_fingerprint",
  );
  const requestFingerprint=fingerprint(
    reviewRequest.requestFingerprint,
    "request_fingerprint",
  );
  const candidateFingerprint=fingerprint(
    reviewRequest.candidateFingerprint,
    "candidate_fingerprint",
  );
  if(
    qualityGateFingerprint!==input.qualityGate.gateFingerprint
    ||requestFingerprint!==input.qualityGate.requestFingerprint
    ||candidateFingerprint!==input.qualityGate.candidateFingerprint
  ){
    throw new Error("ugp_outreach_send_review_stale_lineage");
  }

  const normalizedReviewer=reviewerId(input.reviewerId);
  const reviewedAt=canonicalTimestamp(input.reviewedAt);
  const decisionRequestFingerprint=
    authorityOutreachHumanSendReviewRequestFingerprint(
      reviewRequest,
      normalizedReviewer,
    );

  const resultingState=
    reviewRequest.decision==="approved_for_delivery_preparation"
      ?"delivery_preparation_eligible" as const
      :reviewRequest.decision==="rejected"
        ?"send_review_rejected" as const
        :"send_review_deferred" as const;

  const base={
    version:UGP_AUTHORITY_OUTREACH_HUMAN_SEND_REVIEW_VERSION,
    decisionRequestFingerprint,
    qualityGateFingerprint:input.qualityGate.gateFingerprint,
    requestId:input.qualityGate.requestId,
    requestFingerprint:input.qualityGate.requestFingerprint,
    candidateFingerprint:input.qualityGate.candidateFingerprint,
    mechanicalValidationFingerprint:
      input.qualityGate.mechanicalValidationFingerprint,
    prospectFingerprint:input.qualityGate.prospectFingerprint,
    opportunityFingerprint:input.qualityGate.opportunityFingerprint,
    approvalReviewFingerprint:input.qualityGate.approvalReviewFingerprint,
    targetUrl:input.qualityGate.targetUrl,
    decision:reviewRequest.decision,
    reasonCode:reviewRequest.reasonCode,
    reviewerId:normalizedReviewer,
    reviewedAt,
    resultingState,
    semantics:SEMANTICS,
  };
  const reviewFingerprint=hash({
    purpose:"ugp_authority_outreach_human_send_review",
    ...base,
  });
  return Object.freeze({
    ...base,
    reviewId:"uaosr-"+reviewFingerprint.slice(0,24),
    reviewFingerprint,
  });
}

export function assertAuthorityOutreachHumanSendReviewIntegrity(
  result:AuthorityOutreachHumanSendReviewRecord,
  input:Readonly<{
    request:AuthorityOutreachDraftGenerationRequest;
    candidate:AuthorityOutreachDraftCandidate;
    mechanicalValidation:AuthorityOutreachDraftCandidateValidation;
    assessments:readonly AuthorityOutreachSemanticAssessment[];
    qualityGate:AuthorityOutreachSemanticQualityGate;
    reviewRequest:AuthorityOutreachHumanSendReviewRequest;
    reviewerId:string;
    reviewedAt:string;
  }>,
):void{
  if(
    !result
    ||result.version!==UGP_AUTHORITY_OUTREACH_HUMAN_SEND_REVIEW_VERSION
  ){
    throw new Error("ugp_outreach_send_review_version_invalid");
  }
  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.humanDecision!==true
    ||s.exactValidatedCandidateRequired!==true
    ||s.qualityGatePassRequired!==true
    ||s.explicitConfirmationRequired!==true
    ||s.eligibilityOnly!==true
    ||s.deliveryPreparationExecuted!==false
    ||s.candidateMutationAuthorized!==false
    ||s.recipientSelectionAuthorized!==false
    ||s.contactDiscoveryAuthorized!==false
    ||s.contactDiscoveryPerformed!==false
    ||s.emailVerificationAuthorized!==false
    ||s.mailboxAccessAuthorized!==false
    ||s.sendAuthorizationGranted!==false
    ||s.outreachSendingAuthorized!==false
    ||s.outreachSendingPerformed!==false
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
    throw new Error("ugp_outreach_send_review_unsafe_semantics");
  }
  const expected=prepareAuthorityOutreachHumanSendReviewDecision(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error("ugp_outreach_send_review_integrity_mismatch");
  }
}
