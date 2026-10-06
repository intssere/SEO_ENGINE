import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachRecipientResearchEvidenceIntegrity,
  type AuthorityOutreachRecipientResearchEvidenceContract,
  type AuthorityOutreachValidatedRoleCandidate,
} from "./authority-outreach-recipient-research-evidence-validation.js";

export const UGP_AUTHORITY_OUTREACH_RECIPIENT_SELECTION_REVIEW_SPEC_VERSION =
  "ugp-10-13-recipient-selection-review-specification-v1" as const;

export type AuthorityOutreachRecipientSelectionFutureDecision =
  | "select_for_contact_verification"
  | "reject_candidate_set"
  | "defer_selection";

export type AuthorityOutreachRecipientSelectionFutureReasonCode =
  | "role_and_source_evidence_sufficient"
  | "role_fit_not_sufficient"
  | "identity_or_organization_ambiguous"
  | "evidence_needs_refresh"
  | "relationship_or_reputation_concern"
  | "needs_more_context";

export type AuthorityOutreachRecipientSelectionReviewRequest = Readonly<{
  researchEvidenceFingerprint: string;
  candidateFingerprint: string;
}>;

export type AuthorityOutreachRecipientResearchEvidenceIntegrityInput =
  Parameters<typeof assertAuthorityOutreachRecipientResearchEvidenceIntegrity>[1];

export type AuthorityOutreachRecipientSelectionReviewCandidate = Readonly<{
  roleCandidateId: string;
  roleCandidateFingerprint: string;
  displayName: string;
  organizationName: string;
  roleTitle: string;
  matchedRoleCriteria:
    AuthorityOutreachValidatedRoleCandidate["matchedRoleCriteria"];
  evidenceSourceClass:
    AuthorityOutreachValidatedRoleCandidate["evidenceSourceClass"];
  evidenceUrl: string;
  observedAt: string;
  evidenceFingerprint: string;
  publicBusinessIdentityAttested: true;
}>;

export type AuthorityOutreachRecipientSelectionReviewSpecification =
  Readonly<{
    version:
      typeof UGP_AUTHORITY_OUTREACH_RECIPIENT_SELECTION_REVIEW_SPEC_VERSION;
    selectionReviewSpecId: string;
    selectionReviewSpecFingerprint: string;
    researchEvidenceId: string;
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
    reviewCandidates: readonly AuthorityOutreachRecipientSelectionReviewCandidate[];
    candidateCount: number;
    allowedFutureDecisions:
      readonly AuthorityOutreachRecipientSelectionFutureDecision[];
    allowedFutureReasonCodes:
      readonly AuthorityOutreachRecipientSelectionFutureReasonCode[];
    futureSelectionConfirmationPrefix:
      "REVIEW_OUTREACH_RECIPIENT_SELECTION";
    resultingState: "recipient_selection_review_ready";
    semantics: Readonly<{
      deterministic: true;
      exactResearchEvidenceRequired: true;
      candidateSetRequired: true;
      exactCandidateSetFrozen: true;
      humanRecipientSelectionRequired: true;
      humanSelectionReviewPreparationOnly: true;
      recipientSelectionAuthorized: false;
      recipientSelectionPerformed: false;
      selectedRecipientIncluded: false;
      contactDiscoveryAuthorized: false;
      contactDiscoveryPerformed: false;
      contactAddressIncluded: false;
      contactAddressVerificationAuthorized: false;
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

const ALLOWED_FUTURE_DECISIONS=Object.freeze([
  "defer_selection",
  "reject_candidate_set",
  "select_for_contact_verification",
] as const satisfies readonly AuthorityOutreachRecipientSelectionFutureDecision[]);

const ALLOWED_FUTURE_REASON_CODES=Object.freeze([
  "evidence_needs_refresh",
  "identity_or_organization_ambiguous",
  "needs_more_context",
  "relationship_or_reputation_concern",
  "role_and_source_evidence_sufficient",
  "role_fit_not_sufficient",
] as const satisfies readonly AuthorityOutreachRecipientSelectionFutureReasonCode[]);

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactResearchEvidenceRequired:true as const,
  candidateSetRequired:true as const,
  exactCandidateSetFrozen:true as const,
  humanRecipientSelectionRequired:true as const,
  humanSelectionReviewPreparationOnly:true as const,
  recipientSelectionAuthorized:false as const,
  recipientSelectionPerformed:false as const,
  selectedRecipientIncluded:false as const,
  contactDiscoveryAuthorized:false as const,
  contactDiscoveryPerformed:false as const,
  contactAddressIncluded:false as const,
  contactAddressVerificationAuthorized:false as const,
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
      "ugp_outreach_recipient_selection_review_spec_invalid_"+field,
    );
  }
  return value;
}

function freezeCandidate(
  candidate:AuthorityOutreachValidatedRoleCandidate,
):AuthorityOutreachRecipientSelectionReviewCandidate{
  return Object.freeze({
    roleCandidateId:candidate.roleCandidateId,
    roleCandidateFingerprint:candidate.roleCandidateFingerprint,
    displayName:candidate.displayName,
    organizationName:candidate.organizationName,
    roleTitle:candidate.roleTitle,
    matchedRoleCriteria:Object.freeze([...candidate.matchedRoleCriteria]),
    evidenceSourceClass:candidate.evidenceSourceClass,
    evidenceUrl:candidate.evidenceUrl,
    observedAt:candidate.observedAt,
    evidenceFingerprint:candidate.evidenceFingerprint,
    publicBusinessIdentityAttested:true as const,
  });
}

export function buildAuthorityOutreachRecipientSelectionReviewSpecification(
  input:Readonly<{
    researchEvidence:AuthorityOutreachRecipientResearchEvidenceContract;
    researchEvidenceInput:
      AuthorityOutreachRecipientResearchEvidenceIntegrityInput;
    reviewRequest:AuthorityOutreachRecipientSelectionReviewRequest;
  }>,
):AuthorityOutreachRecipientSelectionReviewSpecification{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_recipient_selection_review_spec_invalid_input",
    );
  }

  assertAuthorityOutreachRecipientResearchEvidenceIntegrity(
    input.researchEvidence,
    input.researchEvidenceInput,
  );

  if(
    input.researchEvidence.resultingState
      !=="recipient_research_evidence_validated"
    ||input.researchEvidence.researchOutcome!=="candidate_set"
    ||input.researchEvidence.candidateCount<1
    ||input.researchEvidence.roleCandidates.length
      !==input.researchEvidence.candidateCount
    ||input.researchEvidence.semantics.recipientSelectionAuthorized!==false
    ||input.researchEvidence.semantics.contactDiscoveryAuthorized!==false
    ||input.researchEvidence.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_recipient_selection_review_spec_candidate_set_required",
    );
  }

  const researchEvidenceFingerprint=fingerprint(
    input.reviewRequest.researchEvidenceFingerprint,
    "research_evidence_fingerprint",
  );
  const candidateFingerprint=fingerprint(
    input.reviewRequest.candidateFingerprint,
    "candidate_fingerprint",
  );
  if(
    researchEvidenceFingerprint
      !==input.researchEvidence.researchEvidenceFingerprint
    ||candidateFingerprint!==input.researchEvidence.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_recipient_selection_review_spec_stale_lineage",
    );
  }

  const reviewCandidates=Object.freeze(
    input.researchEvidence.roleCandidates.map(freezeCandidate),
  );

  const base={
    version:UGP_AUTHORITY_OUTREACH_RECIPIENT_SELECTION_REVIEW_SPEC_VERSION,
    researchEvidenceId:input.researchEvidence.researchEvidenceId,
    researchEvidenceFingerprint:
      input.researchEvidence.researchEvidenceFingerprint,
    researchSpecFingerprint:input.researchEvidence.researchSpecFingerprint,
    deliveryPreparationFingerprint:
      input.researchEvidence.deliveryPreparationFingerprint,
    sendReviewFingerprint:input.researchEvidence.sendReviewFingerprint,
    qualityGateFingerprint:input.researchEvidence.qualityGateFingerprint,
    requestId:input.researchEvidence.requestId,
    requestFingerprint:input.researchEvidence.requestFingerprint,
    candidateFingerprint:input.researchEvidence.candidateFingerprint,
    mechanicalValidationFingerprint:
      input.researchEvidence.mechanicalValidationFingerprint,
    prospectFingerprint:input.researchEvidence.prospectFingerprint,
    opportunityFingerprint:input.researchEvidence.opportunityFingerprint,
    approvalReviewFingerprint:
      input.researchEvidence.approvalReviewFingerprint,
    sourceDomain:input.researchEvidence.sourceDomain,
    sourceUrl:input.researchEvidence.sourceUrl,
    targetDomain:input.researchEvidence.targetDomain,
    targetUrl:input.researchEvidence.targetUrl,
    reviewCandidates,
    candidateCount:reviewCandidates.length,
    allowedFutureDecisions:ALLOWED_FUTURE_DECISIONS,
    allowedFutureReasonCodes:ALLOWED_FUTURE_REASON_CODES,
    futureSelectionConfirmationPrefix:
      "REVIEW_OUTREACH_RECIPIENT_SELECTION" as const,
    resultingState:"recipient_selection_review_ready" as const,
    semantics:SEMANTICS,
  };
  const selectionReviewSpecFingerprint=hash({
    purpose:"ugp_authority_outreach_recipient_selection_review_specification",
    ...base,
  });

  return Object.freeze({
    ...base,
    selectionReviewSpecId:
      "uaorss-"+selectionReviewSpecFingerprint.slice(0,24),
    selectionReviewSpecFingerprint,
  });
}

export function assertAuthorityOutreachRecipientSelectionReviewSpecIntegrity(
  result:AuthorityOutreachRecipientSelectionReviewSpecification,
  input:Readonly<{
    researchEvidence:AuthorityOutreachRecipientResearchEvidenceContract;
    researchEvidenceInput:
      AuthorityOutreachRecipientResearchEvidenceIntegrityInput;
    reviewRequest:AuthorityOutreachRecipientSelectionReviewRequest;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_RECIPIENT_SELECTION_REVIEW_SPEC_VERSION
  ){
    throw new Error(
      "ugp_outreach_recipient_selection_review_spec_version_invalid",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactResearchEvidenceRequired!==true
    ||s.candidateSetRequired!==true
    ||s.exactCandidateSetFrozen!==true
    ||s.humanRecipientSelectionRequired!==true
    ||s.humanSelectionReviewPreparationOnly!==true
    ||s.recipientSelectionAuthorized!==false
    ||s.recipientSelectionPerformed!==false
    ||s.selectedRecipientIncluded!==false
    ||s.contactDiscoveryAuthorized!==false
    ||s.contactDiscoveryPerformed!==false
    ||s.contactAddressIncluded!==false
    ||s.contactAddressVerificationAuthorized!==false
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
      "ugp_outreach_recipient_selection_review_spec_unsafe_semantics",
    );
  }

  const expected=
    buildAuthorityOutreachRecipientSelectionReviewSpecification(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_recipient_selection_review_spec_integrity_mismatch",
    );
  }
}
