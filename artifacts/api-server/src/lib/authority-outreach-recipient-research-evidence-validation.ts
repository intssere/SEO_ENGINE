import { createHash } from "node:crypto";
import type {
  AuthorityOutreachRecipientRoleCriterion,
} from "./authority-outreach-delivery-preparation.js";
import {
  assertAuthorityOutreachRecipientResearchSpecificationIntegrity,
  type AuthorityOutreachRecipientResearchEvidenceSourceClass,
  type AuthorityOutreachRecipientResearchSpecification,
} from "./authority-outreach-recipient-research-specification.js";

export const UGP_AUTHORITY_OUTREACH_RECIPIENT_RESEARCH_EVIDENCE_VERSION =
  "ugp-10-12-recipient-research-evidence-validation-v1" as const;

export type AuthorityOutreachRecipientResearchOutcome =
  | "candidate_set"
  | "no_public_role_candidate";

export type AuthorityOutreachRecipientResearchObservation = Readonly<{
  displayName: string;
  organizationName: string;
  roleTitle: string;
  matchedRoleCriteria: readonly AuthorityOutreachRecipientRoleCriterion[];
  evidenceSourceClass: AuthorityOutreachRecipientResearchEvidenceSourceClass;
  evidenceUrl: string;
  observedAt: string;
  evidenceFingerprint: string;
  publicBusinessIdentityAttested: true;
}>;

export type AuthorityOutreachRecipientResearchEvidenceRequest = Readonly<{
  researchSpecFingerprint: string;
  candidateFingerprint: string;
  researchOutcome: AuthorityOutreachRecipientResearchOutcome;
  observations: readonly AuthorityOutreachRecipientResearchObservation[];
}>;

export type AuthorityOutreachRecipientResearchSpecificationIntegrityInput =
  Parameters<
    typeof assertAuthorityOutreachRecipientResearchSpecificationIntegrity
  >[1];

export type AuthorityOutreachValidatedRoleCandidate = Readonly<{
  roleCandidateId: string;
  roleCandidateFingerprint: string;
  displayName: string;
  organizationName: string;
  roleTitle: string;
  matchedRoleCriteria: readonly AuthorityOutreachRecipientRoleCriterion[];
  evidenceSourceClass: AuthorityOutreachRecipientResearchEvidenceSourceClass;
  evidenceUrl: string;
  observedAt: string;
  evidenceFingerprint: string;
  publicBusinessIdentityAttested: true;
}>;

export type AuthorityOutreachRecipientResearchEvidenceContract = Readonly<{
  version: typeof UGP_AUTHORITY_OUTREACH_RECIPIENT_RESEARCH_EVIDENCE_VERSION;
  researchEvidenceId: string;
  researchEvidenceFingerprint: string;
  researchSpecId: string;
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
  researchOutcome: AuthorityOutreachRecipientResearchOutcome;
  roleCandidates: readonly AuthorityOutreachValidatedRoleCandidate[];
  candidateCount: number;
  resultingState: "recipient_research_evidence_validated";
  semantics: Readonly<{
    deterministic: true;
    exactRecipientResearchSpecificationRequired: true;
    suppliedResearchEvidenceValidationOnly: true;
    externalRecipientResearchAuthorized: false;
    externalRecipientResearchPerformed: false;
    publicBusinessRoleCandidateRecordsOnly: true;
    privateOrBrokeredPersonalDataAllowed: false;
    recipientSelectionAuthorized: false;
    recipientSelectionPerformed: false;
    contactDiscoveryAuthorized: false;
    contactDiscoveryPerformed: false;
    contactAddressIncluded: false;
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
const CANONICAL_UTC=
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CONTACT_LEAK=
  /@|https?:\/\/|mailto:|tel:|\b(?:\+?\d[\d\s().-]{6,}\d)\b/i;

const SEMANTICS=Object.freeze({
  deterministic:true as const,
  exactRecipientResearchSpecificationRequired:true as const,
  suppliedResearchEvidenceValidationOnly:true as const,
  externalRecipientResearchAuthorized:false as const,
  externalRecipientResearchPerformed:false as const,
  publicBusinessRoleCandidateRecordsOnly:true as const,
  privateOrBrokeredPersonalDataAllowed:false as const,
  recipientSelectionAuthorized:false as const,
  recipientSelectionPerformed:false as const,
  contactDiscoveryAuthorized:false as const,
  contactDiscoveryPerformed:false as const,
  contactAddressIncluded:false as const,
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
      "ugp_outreach_recipient_research_evidence_invalid_"+field,
    );
  }
  return value;
}

function boundedText(
  value:unknown,
  field:string,
  maxLength:number,
):string{
  if(typeof value!=="string"){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_invalid_"+field,
    );
  }
  const normalized=value.trim().replace(/\s+/g," ");
  if(
    normalized.length===0
    ||normalized.length>maxLength
    ||/[\u0000-\u001f\u007f]/.test(normalized)
    ||CONTACT_LEAK.test(normalized)
  ){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_invalid_"+field,
    );
  }
  return normalized;
}

function canonicalObservedAt(value:unknown):string{
  if(
    typeof value!=="string"
    ||!CANONICAL_UTC.test(value)
    ||!Number.isFinite(Date.parse(value))
    ||new Date(value).toISOString()!==value
  ){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_invalid_observed_at",
    );
  }
  return value;
}

function canonicalEvidenceUrl(value:unknown,sourceDomain:string):string{
  if(typeof value!=="string"||value.length>2048){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_invalid_evidence_url",
    );
  }
  let parsed:URL;
  try{
    parsed=new URL(value);
  }catch{
    throw new Error(
      "ugp_outreach_recipient_research_evidence_invalid_evidence_url",
    );
  }
  if(
    parsed.protocol!=="https:"
    ||parsed.username!==""
    ||parsed.password!==""
    ||parsed.hash!==""
  ){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_invalid_evidence_url",
    );
  }
  const host=parsed.hostname.toLowerCase().replace(/\.$/,"");
  const domain=sourceDomain.toLowerCase().replace(/\.$/,"");
  if(host!==domain&&!host.endsWith("."+domain)){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_source_domain_mismatch",
    );
  }
  return parsed.href;
}

function normalizeMatchedRoleCriteria(
  values:unknown,
  specification:AuthorityOutreachRecipientResearchSpecification,
):readonly AuthorityOutreachRecipientRoleCriterion[]{
  if(!Array.isArray(values)||values.length===0){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_role_criterion_required",
    );
  }
  const allowed=new Set(specification.requiredRecipientRoleCriteria);
  const seen=new Set<AuthorityOutreachRecipientRoleCriterion>();
  for(const value of values){
    if(
      typeof value!=="string"
      ||!allowed.has(value as AuthorityOutreachRecipientRoleCriterion)
    ){
      throw new Error(
        "ugp_outreach_recipient_research_evidence_role_criterion_invalid",
      );
    }
    const role=value as AuthorityOutreachRecipientRoleCriterion;
    if(seen.has(role)){
      throw new Error(
        "ugp_outreach_recipient_research_evidence_role_criterion_duplicate",
      );
    }
    seen.add(role);
  }
  return Object.freeze(
    [...seen].sort() as AuthorityOutreachRecipientRoleCriterion[],
  );
}

function normalizeObservation(
  observation:AuthorityOutreachRecipientResearchObservation,
  specification:AuthorityOutreachRecipientResearchSpecification,
):AuthorityOutreachValidatedRoleCandidate{
  if(!observation||typeof observation!=="object"||Array.isArray(observation)){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_invalid_observation",
    );
  }
  if(observation.publicBusinessIdentityAttested!==true){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_public_identity_attestation_required",
    );
  }
  if(
    !specification.allowedEvidenceSourceClasses.includes(
      observation.evidenceSourceClass,
    )
  ){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_source_class_not_allowed",
    );
  }

  const displayName=boundedText(
    observation.displayName,
    "display_name",
    120,
  );
  const organizationName=boundedText(
    observation.organizationName,
    "organization_name",
    160,
  );
  const roleTitle=boundedText(
    observation.roleTitle,
    "role_title",
    160,
  );
  const matchedRoleCriteria=normalizeMatchedRoleCriteria(
    observation.matchedRoleCriteria,
    specification,
  );
  const evidenceUrl=canonicalEvidenceUrl(
    observation.evidenceUrl,
    specification.sourceDomain,
  );
  const observedAt=canonicalObservedAt(observation.observedAt);
  const evidenceFingerprint=fingerprint(
    observation.evidenceFingerprint,
    "evidence_fingerprint",
  );

  const normalized={
    displayName,
    organizationName,
    roleTitle,
    matchedRoleCriteria,
    evidenceSourceClass:observation.evidenceSourceClass,
    evidenceUrl,
    observedAt,
    evidenceFingerprint,
    publicBusinessIdentityAttested:true as const,
  };
  const roleCandidateFingerprint=hash({
    purpose:"ugp_authority_outreach_public_business_role_candidate",
    researchSpecFingerprint:specification.researchSpecFingerprint,
    ...normalized,
  });

  return Object.freeze({
    roleCandidateId:"uaorc-"+roleCandidateFingerprint.slice(0,24),
    roleCandidateFingerprint,
    ...normalized,
  });
}

function normalizeCandidates(
  observations:unknown,
  specification:AuthorityOutreachRecipientResearchSpecification,
):readonly AuthorityOutreachValidatedRoleCandidate[]{
  if(!Array.isArray(observations)){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_observations_required",
    );
  }
  if(observations.length>specification.candidateResearchPolicy.maxRoleCandidates){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_candidate_limit_exceeded",
    );
  }
  const candidates=observations.map(item=>normalizeObservation(
    item as AuthorityOutreachRecipientResearchObservation,
    specification,
  ));
  const identityKeys=new Set<string>();
  const evidenceUrls=new Set<string>();
  for(const candidate of candidates){
    const identityKey=[
      candidate.displayName.toLowerCase(),
      candidate.organizationName.toLowerCase(),
      candidate.roleTitle.toLowerCase(),
    ].join("|");
    if(identityKeys.has(identityKey)){
      throw new Error(
        "ugp_outreach_recipient_research_evidence_duplicate_candidate",
      );
    }
    if(evidenceUrls.has(candidate.evidenceUrl)){
      throw new Error(
        "ugp_outreach_recipient_research_evidence_duplicate_evidence_url",
      );
    }
    identityKeys.add(identityKey);
    evidenceUrls.add(candidate.evidenceUrl);
  }
  return Object.freeze(
    candidates.sort(
      (a,b)=>a.roleCandidateFingerprint.localeCompare(b.roleCandidateFingerprint),
    ),
  );
}

export function buildAuthorityOutreachRecipientResearchEvidenceContract(
  input:Readonly<{
    researchSpecification:AuthorityOutreachRecipientResearchSpecification;
    researchSpecificationInput:
      AuthorityOutreachRecipientResearchSpecificationIntegrityInput;
    evidenceRequest:AuthorityOutreachRecipientResearchEvidenceRequest;
  }>,
):AuthorityOutreachRecipientResearchEvidenceContract{
  if(!input||typeof input!=="object"||Array.isArray(input)){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_invalid_input",
    );
  }

  assertAuthorityOutreachRecipientResearchSpecificationIntegrity(
    input.researchSpecification,
    input.researchSpecificationInput,
  );

  if(
    input.researchSpecification.resultingState
      !=="recipient_research_spec_ready"
    ||input.researchSpecification.semantics.recipientResearchSpecificationOnly
      !==true
    ||input.researchSpecification.semantics.recipientResearchAuthorized!==false
    ||input.researchSpecification.semantics.contactDiscoveryAuthorized!==false
    ||input.researchSpecification.semantics.sendAuthorizationGranted!==false
  ){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_specification_required",
    );
  }

  const researchSpecFingerprint=fingerprint(
    input.evidenceRequest.researchSpecFingerprint,
    "research_spec_fingerprint",
  );
  const candidateFingerprint=fingerprint(
    input.evidenceRequest.candidateFingerprint,
    "candidate_fingerprint",
  );
  if(
    researchSpecFingerprint
      !==input.researchSpecification.researchSpecFingerprint
    ||candidateFingerprint!==input.researchSpecification.candidateFingerprint
  ){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_stale_lineage",
    );
  }

  const roleCandidates=normalizeCandidates(
    input.evidenceRequest.observations,
    input.researchSpecification,
  );
  if(
    input.evidenceRequest.researchOutcome==="candidate_set"
    &&roleCandidates.length===0
  ){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_candidate_set_required",
    );
  }
  if(
    input.evidenceRequest.researchOutcome==="no_public_role_candidate"
    &&roleCandidates.length!==0
  ){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_empty_result_required",
    );
  }
  if(
    input.evidenceRequest.researchOutcome!=="candidate_set"
    &&input.evidenceRequest.researchOutcome!=="no_public_role_candidate"
  ){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_invalid_research_outcome",
    );
  }

  const base={
    version:UGP_AUTHORITY_OUTREACH_RECIPIENT_RESEARCH_EVIDENCE_VERSION,
    researchSpecId:input.researchSpecification.researchSpecId,
    researchSpecFingerprint:
      input.researchSpecification.researchSpecFingerprint,
    deliveryPreparationFingerprint:
      input.researchSpecification.deliveryPreparationFingerprint,
    sendReviewFingerprint:input.researchSpecification.sendReviewFingerprint,
    qualityGateFingerprint:input.researchSpecification.qualityGateFingerprint,
    requestId:input.researchSpecification.requestId,
    requestFingerprint:input.researchSpecification.requestFingerprint,
    candidateFingerprint:input.researchSpecification.candidateFingerprint,
    mechanicalValidationFingerprint:
      input.researchSpecification.mechanicalValidationFingerprint,
    prospectFingerprint:input.researchSpecification.prospectFingerprint,
    opportunityFingerprint:input.researchSpecification.opportunityFingerprint,
    approvalReviewFingerprint:
      input.researchSpecification.approvalReviewFingerprint,
    sourceDomain:input.researchSpecification.sourceDomain,
    sourceUrl:input.researchSpecification.sourceUrl,
    targetDomain:input.researchSpecification.targetDomain,
    targetUrl:input.researchSpecification.targetUrl,
    researchOutcome:input.evidenceRequest.researchOutcome,
    roleCandidates,
    candidateCount:roleCandidates.length,
    resultingState:"recipient_research_evidence_validated" as const,
    semantics:SEMANTICS,
  };
  const researchEvidenceFingerprint=hash({
    purpose:"ugp_authority_outreach_recipient_research_evidence_contract",
    ...base,
  });

  return Object.freeze({
    ...base,
    researchEvidenceId:"uaore-"+researchEvidenceFingerprint.slice(0,24),
    researchEvidenceFingerprint,
  });
}

export function assertAuthorityOutreachRecipientResearchEvidenceIntegrity(
  result:AuthorityOutreachRecipientResearchEvidenceContract,
  input:Readonly<{
    researchSpecification:AuthorityOutreachRecipientResearchSpecification;
    researchSpecificationInput:
      AuthorityOutreachRecipientResearchSpecificationIntegrityInput;
    evidenceRequest:AuthorityOutreachRecipientResearchEvidenceRequest;
  }>,
):void{
  if(
    !result
    ||result.version
      !==UGP_AUTHORITY_OUTREACH_RECIPIENT_RESEARCH_EVIDENCE_VERSION
  ){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_version_invalid",
    );
  }

  const s=result.semantics;
  if(
    s.deterministic!==true
    ||s.exactRecipientResearchSpecificationRequired!==true
    ||s.suppliedResearchEvidenceValidationOnly!==true
    ||s.externalRecipientResearchAuthorized!==false
    ||s.externalRecipientResearchPerformed!==false
    ||s.publicBusinessRoleCandidateRecordsOnly!==true
    ||s.privateOrBrokeredPersonalDataAllowed!==false
    ||s.recipientSelectionAuthorized!==false
    ||s.recipientSelectionPerformed!==false
    ||s.contactDiscoveryAuthorized!==false
    ||s.contactDiscoveryPerformed!==false
    ||s.contactAddressIncluded!==false
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
      "ugp_outreach_recipient_research_evidence_unsafe_semantics",
    );
  }

  const expected=buildAuthorityOutreachRecipientResearchEvidenceContract(input);
  if(stableJson(expected)!==stableJson(result)){
    throw new Error(
      "ugp_outreach_recipient_research_evidence_integrity_mismatch",
    );
  }
}
