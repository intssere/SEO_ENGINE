import { createHash } from "node:crypto";
import {
  assertAuthorityOutreachHumanRecipientSelectionIntegrity,
  type AuthorityOutreachHumanRecipientSelectionRecord,
} from "./authority-outreach-human-recipient-selection.js";
import type {
  AuthorityOutreachRecipientSelectionReviewCandidate,
} from "./authority-outreach-recipient-selection-review-specification.js";

export const UGP_AUTHORITY_OUTREACH_CONTACT_VERIFICATION_SPEC_VERSION =
  "ugp-10-15-contact-verification-specification-v1" as const;

export type AuthorityOutreachContactPointType =
  | "email_address"
  | "web_contact_form";

export type AuthorityOutreachContactVerificationEvidenceSourceClass =
  | "source_domain_contact_page"
  | "source_domain_staff_or_author_page"
  | "official_organization_profile";

export type AuthorityOutreachContactVerificationSpecificationRequest =
  Readonly<{
    selectionDecisionFingerprint: string;
    selectedRoleCandidateFingerprint: string;
    candidateFingerprint: string;
  }>;

export type AuthorityOutreachHumanRecipientSelectionIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachHumanRecipientSelectionIntegrity
  >[1];

export type AuthorityOutreachContactVerificationSpecification = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_CONTACT_VERIFICATION_SPEC_VERSION;
  contactVerificationSpecId: string;
  contactVerificationSpecFingerprint: string;
  selectionDecisionId: string;
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
  selectedRoleCandidate: AuthorityOutreachRecipientSelectionReviewCandidate;
  selectedRoleCandidateFingerprint: string;
  permittedContactPointTypes: readonly AuthorityOutreachContactPointType[];
  allowedEvidenceSourceClasses:
    readonly AuthorityOutreachContactVerificationEvidenceSourceClass[];
  verificationPolicy: Readonly<{
    maxContactPointsToValidate: 3;
    publicBusinessContactOnly: true;
    exactSelectedRoleCandidateRequired: true;
    publicSourceReferenceRequired: true;
    sourceDomainRelationshipRequired: true;
    observationTimestampRequired: true;
    contactPointFingerprintRequired: true;
    privateOrBrokeredPersonalDataAllowed: false;
    contactPointCollectionAllowed: false;
    verificationExecutionAllowed: false;
    providerVerificationAllowed: false;
    mailboxProbeAllowed: false;
  }>;
  resultingState: "contact_verification_spec_ready";
  semantics: Readonly<{
    deterministic: true;
    exactHumanSelectionDecisionRequired: true;
    exactSelectedRoleCandidateRequired: true;
    contactVerificationSpecificationOnly: true;
    actualContactPointIncluded: false;
    contactDiscoveryAuthorized: false;
    contactDiscoveryPerformed: false;
    contactAddressIncluded: false;
    contactAddressCollectionAuthorized: false;
    contactAddressVerificationAuthorized: false;
    contactAddressVerificationPerformed: false;
    emailVerificationAuthorized: false;
    verificationProviderCallAuthorized: false;
    mailboxProbeAuthorized: false;
    mailboxAccessAuthorized: false;
    providerBindingAuthorized: false;
    policyAndConsentReviewAuthorized: false;
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

const ALLOWED_EVIDENCE_SOURCE_CLASSES=Object.freeze([
  "official_organization_profile",
  "source_domain_contact_page",
  "source_domain_staff_or_author_page",
] as const satisfies readonly AuthorityOutreachContactVerificationEvidenceSourceClass[]);

const VERIFICATION_POLICY=Object.freeze({
  maxContactPointsToValidate:3 as const,
  publicBusinessContactOnly:true as const,
  exactSelectedRoleCandidateRequired:true as const,
  publicSourceReferenceRequired:true as const,
  sourceDomainRelationshipRequired:true as const,
  observationTimestampRequired:true as const,
  contactPointFingerprintRequired:true as const,
  privateOrBrokeredPersonalDataAllowed:false as const,
  contactPointCollectionAllowed:false as const,
  verificationExecutionAllowed:false as const,
  providerVerificationAllowed:false as const,
  mailboxProbeAllowed:false as const,
});

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactHumanSelectionDecisionRequired:true as const,
  exactSelectedRoleCandidateRequired:true as const,
  contactVerificationSpecificationOnly:true as const,
  actualContactPointIncluded:false as const,
  contactDiscoveryAuthorized:false as const,
  contactDiscoveryPerformed:false as const,
  contactAddressIncluded:false as const,
  contactAddressCollectionAuthorized:false as const,
  contactAddressVerificationAuthorized:false as const,
  contactAddressVerificationPerformed:false as const,
  emailVerificationAuthorized:false as const,
  verificationProviderCallAuthorized:false as const,
  mailboxProbeAuthorized:false as const,
  mailboxAccessAuthorized:false as const,
  providerBindingAuthorized:false as const,
  policyAndConsentReviewAuthorized:false as const,
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
      "ugp_outreach_contact_verification_spec_invalid_"+field,
    );
  }
  return value;
}

function contactPointTypes(
  input:AuthorityOutreachHumanRecipientSelectionIntegrityInput,
):readonly AuthorityOutreachContactPointType[]{
  const channels=
    input.selectionReviewSpecificationInput
      .researchEvidenceInput
      .researchSpecification
      .allowedDeliveryChannelTypes;
  const values=new Set<AuthorityOutreachContactPointType>();
  for(const channel of channels){
    if(channel==="email") values.add("email_address");
    if(channel==="web_contact_form") values.add("web_contact_form");
  }
  if(values.size===0){
    throw new Error(
      "ugp_outreach_contact_verification_spec_contact_point_type_required",
    );
  }
  return Object.freeze(
    [...values].sort() as AuthorityOutreachContactPointType[],
  );
}

function freezeSelectedCandidate(
  candidate:AuthorityOutreachRecipientSelectionReviewCandidate,
):AuthorityOutreachRecipientSelectionReviewCandidate{
  return Object.freeze({
    ...candidate,
    matchedRoleCriteria:Object.freeze([...candidate.matchedRoleCriteria]),
  });
}

export function buildAuthorityOutreachContactVerificationSpecification(
  input:Readonly<{
    selectionDecision:AuthorityOutreachHumanRecipientSelectionRecord;
    selectionDecisionInput:
      AuthorityOutreachHumanRecipientSelectionIntegrityInput;
    verificationRequest:
      AuthorityOutreachContactVerificationSpecificationRequest;
  }>,
):AuthorityOutreachContactVerificationSpecification{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_contact_verification_spec_invalid_input",
    );
  }

  assertAuthorityOutreachHumanRecipientSelectionIntegrity(
    input.selectionDecision,
    input.selectionDecisionInput,
  );

  const decision=input.selectionDecision;
  if(
    decision.decision!=="select_for_contact_verification"
    ||decision.resultingState!=="contact_verification_eligible"
    ||decision.selectedRoleCandidate===null
    ||decision.selectedRoleCandidateFingerprint===null
    ||decision.semantics.eligibilityOnly!==true
    ||decision.semantics.contactAddressCollectionAuthorized!==false
    ||decision.semantics.contactAddressVerificationAuthorized!==false
    ||decision.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_contact_verification_spec_eligible_selection_required",
    );
  }

  const request=input.verificationRequest;
  const selectionDecisionFingerprint=fingerprint(
    request.selectionDecisionFingerprint,
    "selection_decision_fingerprint",
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
    selectionDecisionFingerprint!==decision.selectionDecisionFingerprint
    ||selectedRoleCandidateFingerprint
      !==decision.selectedRoleCandidateFingerprint
    ||candidateFingerprint!==decision.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_contact_verification_spec_stale_lineage",
    );
  }

  const permittedContactPointTypes=contactPointTypes(
    input.selectionDecisionInput,
  );
  const selectedRoleCandidate=freezeSelectedCandidate(
    decision.selectedRoleCandidate,
  );

  const base={
    version:UGP_AUTHORITY_OUTREACH_CONTACT_VERIFICATION_SPEC_VERSION,
    selectionDecisionId:decision.selectionDecisionId,
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
    mechanicalValidationFingerprint:
      decision.mechanicalValidationFingerprint,
    prospectFingerprint:decision.prospectFingerprint,
    opportunityFingerprint:decision.opportunityFingerprint,
    approvalReviewFingerprint:decision.approvalReviewFingerprint,
    sourceDomain:decision.sourceDomain,
    sourceUrl:decision.sourceUrl,
    targetDomain:decision.targetDomain,
    targetUrl:decision.targetUrl,
    selectedRoleCandidate,
    selectedRoleCandidateFingerprint:
      decision.selectedRoleCandidateFingerprint,
    permittedContactPointTypes,
    allowedEvidenceSourceClasses:ALLOWED_EVIDENCE_SOURCE_CLASSES,
    verificationPolicy:VERIFICATION_POLICY,
    resultingState:"contact_verification_spec_ready" as const,
    semantics:SEMANTICS,
  };
  const contactVerificationSpecFingerprint=hash({
    purpose:"ugp_authority_outreach_contact_verification_specification",
    ...base,
  });

  return Object.freeze({
    ...base,
    contactVerificationSpecId:
      "uaocvs-"+contactVerificationSpecFingerprint.slice(0,24),
    contactVerificationSpecFingerprint,
  });
}

export function assertAuthorityOutreachContactVerificationSpecIntegrity(
  result:AuthorityOutreachContactVerificationSpecification,
  input:Readonly<{
    selectionDecision:AuthorityOutreachHumanRecipientSelectionRecord;
    selectionDecisionInput:
      AuthorityOutreachHumanRecipientSelectionIntegrityInput;
    verificationRequest:
      AuthorityOutreachContactVerificationSpecificationRequest;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_CONTACT_VERIFICATION_SPEC_VERSION
  ){
    throw new Error(
      "ugp_outreach_contact_verification_spec_version_invalid",
    );
  }

  const p=result.verificationPolicy;
  if(
    p.maxContactPointsToValidate!==3
    ||p.publicBusinessContactOnly!==true
    ||p.exactSelectedRoleCandidateRequired!==true
    ||p.publicSourceReferenceRequired!==true
    ||p.sourceDomainRelationshipRequired!==true
    ||p.observationTimestampRequired!==true
    ||p.contactPointFingerprintRequired!==true
    ||p.privateOrBrokeredPersonalDataAllowed!==false
    ||p.contactPointCollectionAllowed!==false
    ||p.verificationExecutionAllowed!==false
    ||p.providerVerificationAllowed!==false
    ||p.mailboxProbeAllowed!==false
  ){
    throw new Error(
      "ugp_outreach_contact_verification_spec_unsafe_policy",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactHumanSelectionDecisionRequired!==true
    ||s.exactSelectedRoleCandidateRequired!==true
    ||s.contactVerificationSpecificationOnly!==true
    ||s.actualContactPointIncluded!==false
    ||s.contactDiscoveryAuthorized!==false
    ||s.contactDiscoveryPerformed!==false
    ||s.contactAddressIncluded!==false
    ||s.contactAddressCollectionAuthorized!==false
    ||s.contactAddressVerificationAuthorized!==false
    ||s.contactAddressVerificationPerformed!==false
    ||s.emailVerificationAuthorized!==false
    ||s.verificationProviderCallAuthorized!==false
    ||s.mailboxProbeAuthorized!==false
    ||s.mailboxAccessAuthorized!==false
    ||s.providerBindingAuthorized!==false
    ||s.policyAndConsentReviewAuthorized!==false
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
      "ugp_outreach_contact_verification_spec_unsafe_semantics",
    );
  }

  const expected=buildAuthorityOutreachContactVerificationSpecification(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_contact_verification_spec_integrity_mismatch",
    );
  }
}
